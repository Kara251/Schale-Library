/**
 * bilibili-subscription 服务
 * 处理 RSS 抓取和视频导入
 */

import { factories } from '@strapi/strapi';
import { XMLParser } from 'fast-xml-parser';

// 自动发布的关键词列表
const AUTO_PUBLISH_KEYWORDS = [
    '碧蓝档案',
    '蔚蓝档案',
    'Blue Archive',
    'BA',
    'ブルーアーカイブ',
    'ブルアカ',
    '블루 아카이브',
];

interface RSSItem {
    title: string;
    link: string;
    pubDate: string;
    description?: string;
    author?: string;
    coverUrl?: string;
}

interface SyncResult {
    created: number;
    skipped: number;
    errors: string[];
}

type SyncLogAction = 'bilibili-sync-one' | 'bilibili-sync-all' | 'bilibili-sync-cron';
type SyncLogStatus = 'success' | 'partial' | 'failed' | 'retry' | 'pending';

interface SyncLogInput {
    action: SyncLogAction;
    message: string;
    status?: SyncLogStatus;
    stage?: 'queued' | 'running' | 'retry' | 'success' | 'failed';
    targetId?: number;
    targetName?: string;
    total?: number;
    created?: number;
    skipped?: number;
    errors?: string[];
    rssInstance?: string;
    errorCategory?: string;
    details?: Record<string, unknown>;
    startedAt: Date;
    finishedAt: Date;
}

type WorkNature = 'official' | 'fanmade';

interface BilibiliSubscription {
    id: number;
    uid: string;
    upName: string;
    isActive: boolean;
    defaultNature?: WorkNature;
    autoPublishKeywords?: string;
    syncCount?: number;
}

interface CreatedWorkEntity {
    id: number;
    [key: string]: unknown;
}

interface RssFetchResult {
    items: RSSItem[];
    instance: string;
}

interface RetrySyncResult {
    total: number;
    created: number;
    skipped: number;
    errors: string[];
}

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }

    return String(error);
}

function categorizeSyncError(error: unknown): string {
    const message = getErrorMessage(error).toLowerCase();
    if (message.includes('abort') || message.includes('timeout')) return 'timeout';
    if (message.includes('rss 请求失败')) return 'http';
    if (message.includes('parse') || message.includes('xml')) return 'parse';
    if (message.includes('fetch') || message.includes('network') || message.includes('econn')) return 'network';
    return 'unknown';
}

function decodeHtmlEntities(value: string): string {
    return value
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ');
}

// RSS 缓存（5分钟有效期）
const rssCache = new Map<string, { data: RSSItem[]; expires: number }>();
const RSS_CACHE_TTL = 5 * 60 * 1000; // 5分钟
const RSS_FETCH_TIMEOUT_MS = 15000;
const RSS_SYNC_CONCURRENCY = Math.max(1, Math.min(10, Number(process.env.RSS_SYNC_CONCURRENCY || '3')));
const RSS_RETRY_DELAY_MS = Math.max(60 * 1000, Number(process.env.RSS_RETRY_DELAY_MS || '300000'));
const RSS_RETRY_BATCH_SIZE = 50;
const rssParser = new XMLParser({
    ignoreAttributes: false,
    cdataPropName: '__cdata',
    textNodeName: '#text',
});

function toArray<T>(value: T | T[] | undefined | null): T[] {
    if (!value) {
        return [];
    }

    return Array.isArray(value) ? value : [value];
}

function normalizeXmlText(value: unknown): string {
    if (value === null || value === undefined) {
        return '';
    }

    if (typeof value === 'object') {
        const record = value as Record<string, unknown>;
        return String(record.__cdata || record['#text'] || '').trim();
    }

    return String(value).trim();
}

export default factories.createCoreService('api::bilibili-subscription.bilibili-subscription', ({ strapi }) => ({
    async recordSyncLog(input: SyncLogInput): Promise<void> {
        const errors = Array.isArray(input.errors) ? input.errors : [];
        const status = input.status || (errors.length > 0 ? (input.created || input.skipped ? 'partial' : 'failed') : 'success');
        const stage = input.stage || (status === 'retry' ? 'retry' : status === 'failed' ? 'failed' : 'success');
        const durationMs = Math.max(0, input.finishedAt.getTime() - input.startedAt.getTime());

        try {
            await strapi.entityService.create('api::sync-log.sync-log' as any, {
                data: {
                    action: input.action,
                    status,
                    stage,
                    message: input.message,
                    targetId: input.targetId,
                    targetName: input.targetName,
                    total: input.total ?? 0,
                    created: input.created ?? 0,
                    skipped: input.skipped ?? 0,
                    errorCount: errors.length,
                    errors,
                    rssInstance: input.rssInstance,
                    errorCategory: input.errorCategory || (errors.length > 0 ? 'sync' : undefined),
                    details: input.details,
                    startedAt: input.startedAt.toISOString(),
                    finishedAt: input.finishedAt.toISOString(),
                    durationMs,
                },
            });
        } catch (error) {
            strapi.log.warn(`同步日志写入失败: ${getErrorMessage(error)}`);
        }
    },

    async scheduleSubscriptionRetry(
        subscription: BilibiliSubscription,
        reason: string,
        action: SyncLogAction = 'bilibili-sync-all'
    ): Promise<void> {
        const now = new Date();
        const nextRetryAt = new Date(now.getTime() + RSS_RETRY_DELAY_MS);
        const retryDetails = {
            retry: true,
            retryState: 'queued',
            subscriptionId: subscription.id,
            upName: subscription.upName,
            reason,
            nextRetryAt: nextRetryAt.toISOString(),
        };
        const existing = await strapi.entityService.findMany('api::sync-log.sync-log' as any, {
            filters: {
                status: 'retry',
                stage: 'retry',
                targetId: subscription.id,
            },
            sort: 'createdAt:desc',
            limit: 1,
        }) as any[];

        if (existing[0]) {
            await strapi.entityService.update('api::sync-log.sync-log' as any, existing[0].id, {
                data: {
                    message: `订阅 "${subscription.upName}" 同步失败，已刷新重试时间`,
                    errors: [reason],
                    errorCount: 1,
                    details: retryDetails,
                    finishedAt: now.toISOString(),
                },
            });
            return;
        }

        await this.recordSyncLog({
            action,
            status: 'retry',
            stage: 'retry',
            message: `订阅 "${subscription.upName}" 同步失败，已安排重试`,
            targetId: subscription.id,
            targetName: subscription.upName,
            total: 1,
            errors: [reason],
            errorCategory: 'retry-scheduled',
            details: retryDetails,
            startedAt: now,
            finishedAt: now,
        });
    },

    async processDueRetries(action: SyncLogAction = 'bilibili-sync-all'): Promise<RetrySyncResult> {
        const now = new Date();
        const retryLogs = await strapi.entityService.findMany('api::sync-log.sync-log' as any, {
            filters: {
                status: 'retry',
                stage: 'retry',
            },
            sort: 'createdAt:asc',
            limit: RSS_RETRY_BATCH_SIZE,
        }) as any[];
        const result: RetrySyncResult = {
            total: 0,
            created: 0,
            skipped: 0,
            errors: [],
        };

        for (const retryLog of retryLogs) {
            const details = retryLog.details && typeof retryLog.details === 'object' ? retryLog.details : {};
            const nextRetryAt = typeof details.nextRetryAt === 'string' ? new Date(details.nextRetryAt) : now;
            if (!details.retry || nextRetryAt.getTime() > now.getTime()) {
                continue;
            }

            result.total++;
            try {
                const subscriptionId = Number(details.subscriptionId || retryLog.targetId);
                if (!Number.isFinite(subscriptionId)) {
                    throw new Error('重试记录缺少订阅 ID');
                }

                const subscription = await strapi.entityService.findOne(
                    'api::bilibili-subscription.bilibili-subscription',
                    subscriptionId
                ) as BilibiliSubscription | null;
                if (!subscription) {
                    throw new Error(`订阅不存在: ${subscriptionId}`);
                }

                const retryResult = await this.syncSubscription(subscription);
                result.created += retryResult.created;
                result.skipped += retryResult.skipped;
                result.errors.push(...retryResult.errors);

                const failed = retryResult.errors.length > 0 && retryResult.created === 0;
                await strapi.entityService.update('api::sync-log.sync-log' as any, retryLog.id, {
                    data: {
                        status: failed ? 'failed' : 'success',
                        stage: failed ? 'failed' : 'success',
                        message: failed
                            ? `订阅 "${subscription.upName}" 重试失败`
                            : `订阅 "${subscription.upName}" 重试完成，新增 ${retryResult.created} 个视频`,
                        created: retryResult.created,
                        skipped: retryResult.skipped,
                        errorCount: retryResult.errors.length,
                        errors: retryResult.errors,
                        errorCategory: failed ? categorizeSyncError(retryResult.errors[0]) : undefined,
                        finishedAt: new Date().toISOString(),
                        details: {
                            ...details,
                            retryState: failed ? 'failed' : 'success',
                            retryFinishedAt: new Date().toISOString(),
                        },
                    },
                });

                if (failed) {
                    await this.scheduleSubscriptionRetry(subscription, retryResult.errors[0], action);
                }
            } catch (error) {
                const errorMessage = getErrorMessage(error);
                result.errors.push(errorMessage);
                await strapi.entityService.update('api::sync-log.sync-log' as any, retryLog.id, {
                    data: {
                        status: 'failed',
                        stage: 'failed',
                        message: `订阅重试失败: ${errorMessage}`,
                        errorCount: 1,
                        errors: [errorMessage],
                        errorCategory: categorizeSyncError(errorMessage),
                        finishedAt: new Date().toISOString(),
                        details: {
                            ...details,
                            retryState: 'failed',
                            retryFinishedAt: new Date().toISOString(),
                        },
                    },
                });
            }
        }

        return result;
    },

    /**
     * RSSHub 实例列表（按优先级排序）
     * 可通过环境变量 RSSHUB_URL 自定义
     */
    getRssHubInstances(): string[] {
        const customUrl = process.env.RSSHUB_URL?.replace(/\/+$/, '');
        const instances = [
            'http://localhost:1200',  // RSSHub 默认本地端口
            'http://localhost:3200',  // 兼容旧本地端口
            'https://rsshub.app',
            'https://rsshub.rssforever.com',
            'https://hub.slarker.me',
        ];

        if (customUrl) {
            return [customUrl, ...instances];
        }
        return instances;
    },

    /**
     * 从 RSSHub 获取 UP主 视频列表（带备用实例和缓存）
     */
    async fetchVideos(uid: string): Promise<RSSItem[]> {
        const result = await this.fetchVideosWithInstance(uid);
        return result.items;
    },

    async fetchVideosWithInstance(uid: string): Promise<RssFetchResult> {
        // 检查缓存
        const cached = rssCache.get(uid);
        if (cached && Date.now() < cached.expires) {
            strapi.log.info(`使用缓存数据 (UID: ${uid})`);
            return { items: cached.data, instance: 'cache' };
        }

        const instances = this.getRssHubInstances();
        let lastError: Error | null = null;

        for (const instance of instances) {
            const rssUrl = `${instance}/bilibili/user/video/${uid}`;
            strapi.log.info(`尝试 RSSHub 实例: ${instance}`);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), RSS_FETCH_TIMEOUT_MS);

            try {
                const response = await fetch(rssUrl, {
                    signal: controller.signal,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    },
                });

                if (!response.ok) {
                    throw new Error(`RSS 请求失败: ${response.status}`);
                }

                const xmlText = await response.text();
                const items = this.parseRSS(xmlText);

                if (items.length > 0) {
                    // 保存到缓存
                    rssCache.set(uid, {
                        data: items,
                        expires: Date.now() + RSS_CACHE_TTL,
                    });
                    strapi.log.info(`成功从 ${instance} 获取 ${items.length} 个视频`);
                    return { items, instance };
                }
            } catch (error) {
                lastError = error as Error;
                strapi.log.warn(`RSSHub 实例 ${instance} 失败: ${getErrorMessage(error)}`);
                continue;
            } finally {
                clearTimeout(timeoutId);
            }
        }

        strapi.log.error(`所有 RSSHub 实例都失败 (UID: ${uid})`);
        throw lastError || new Error('所有 RSSHub 实例都不可用');
    },

    /**
     * 解析 RSS XML
     */
    parseRSS(xmlText: string): RSSItem[] {
        const parsed = rssParser.parse(xmlText) as Record<string, any>;
        const rawItems = toArray(parsed?.rss?.channel?.item || parsed?.feed?.entry);

        return rawItems
            .map((item) => {
                const rawDescription = normalizeXmlText(item.description || item.summary || item.content);
                const linkValue = Array.isArray(item.link) ? item.link[0] : item.link;
                const link = typeof linkValue === 'object'
                    ? normalizeXmlText(linkValue?.['@_href'])
                    : normalizeXmlText(linkValue);

                return {
                    title: normalizeXmlText(item.title),
                    link,
                    pubDate: normalizeXmlText(item.pubDate || item.published || item.updated),
                    description: this.stripHtml(rawDescription),
                    author: normalizeXmlText(item.author?.name || item.author || item['dc:creator']),
                    coverUrl: this.extractCoverFromDescription(rawDescription),
                };
            })
            .filter((item) => item.title && item.link);
    },

    /**
     * 提取 XML 标签内容
     */
    extractTag(content: string, tagName: string): string {
        const regex = new RegExp(`<${tagName}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tagName}>|<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
        const match = content.match(regex);
        if (match) {
            return (match[1] || match[2] || '').trim();
        }
        return '';
    },

    /**
     * 从描述中提取封面图 URL
     */
    extractCoverFromDescription(description: string): string {
        // 先解码 HTML 实体
        const decoded = decodeHtmlEntities(description);

        // 匹配 img 标签的 src 属性
        const imgMatch = decoded.match(/<img[^>]+src=["']([^"']+)["']/i);
        if (imgMatch) {
            return imgMatch[1];
        }

        // 备选：直接从原始内容匹配 URL 格式的图片链接
        const urlMatch = description.match(/https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|gif|webp)/i);
        return urlMatch ? urlMatch[0] : '';
    },

    /**
     * 移除 HTML 标签，只保留纯文本
     */
    stripHtml(html: string): string {
        // 先解码 HTML 实体
        let text = decodeHtmlEntities(html);

        // 移除所有 HTML 标签（包括 img, iframe 等）
        text = text.replace(/<[^>]*>/g, ' ');

        // 清理多余空白
        text = text.replace(/\s+/g, ' ').trim();
        return text;
    },

    /**
     * 检查视频是否已存在
     */
    async checkVideoExists(sourceUrl: string): Promise<boolean> {
        const existing = await strapi.entityService.findMany('api::work.work', {
            filters: {
                sourceUrl: sourceUrl,
            },
            limit: 1,
        });

        return existing && existing.length > 0;
    },

    /**
     * 检查标题是否匹配自动发布关键词
     */
    shouldAutoPublish(title: string, customKeywords?: string): boolean {
        // 合并默认关键词和自定义关键词
        let keywords = [...AUTO_PUBLISH_KEYWORDS];

        if (customKeywords) {
            const custom = customKeywords.split('\n')
                .map(k => k.trim())
                .filter(k => k.length > 0);
            keywords = [...keywords, ...custom];
        }

        const lowerTitle = title.toLowerCase();
        return keywords.some(keyword =>
            lowerTitle.includes(keyword.toLowerCase())
        );
    },

    /**
     * 从 B站视频链接提取 BV 号
     */
    extractBVID(url: string): string {
        const match = url.match(/BV[a-zA-Z0-9]+/);
        return match ? match[0] : '';
    },

    /**
     * 创建 Work 条目
     */
    async createWork(
        item: RSSItem,
        subscription: BilibiliSubscription,
        autoPublish: boolean
    ): Promise<CreatedWorkEntity> {
        const bvid = this.extractBVID(item.link);

        // 先创建 Work 条目
        const workData = {
            title: item.title,
            author: subscription.upName,
            description: item.description || '',
            coverImageUrl: item.coverUrl || '',
            originalPublishDate: item.pubDate ? new Date(item.pubDate).toISOString() : null,
            nature: subscription.defaultNature || 'fanmade',
            workType: 'video' as const,
            link: item.link,
            sourceUrl: item.link,
            sourcePlatform: 'bilibili' as const,
            sourceId: bvid,
            isAutoImported: true,
            importedAt: new Date().toISOString(),
            isActive: true,
            isFeatured: false,
            featuredPriority: 0,
            publishedAt: autoPublish ? new Date().toISOString() : null,
        };

        const created = await strapi.entityService.create('api::work.work', {
            data: workData,
        });

        strapi.log.info(`创建视频: ${item.title} (${autoPublish ? '已发布' : '待审核'})`);

        return created as CreatedWorkEntity;
    },

    /**
     * 同步单个订阅
     */
    async syncSubscription(subscription: BilibiliSubscription): Promise<SyncResult> {
        const result: SyncResult = {
            created: 0,
            skipped: 0,
            errors: [],
        };

        if (!subscription.isActive) {
            strapi.log.info(`跳过未激活的订阅: ${subscription.upName}`);
            return result;
        }

        try {
            const fetchResult = await this.fetchVideosWithInstance(subscription.uid);
            let items = fetchResult.items;
            // 只同步最近 5 个视频
            items = items.slice(0, 5);
            strapi.log.info(`获取到 ${items.length} 个视频 (${subscription.upName}, ${fetchResult.instance})`);

            for (const item of items) {
                try {
                    // 检查是否已存在
                    const exists = await this.checkVideoExists(item.link);
                    if (exists) {
                        result.skipped++;
                        continue;
                    }

                    // 检查是否应该自动发布
                    const autoPublish = this.shouldAutoPublish(
                        item.title,
                        subscription.autoPublishKeywords
                    );

                    // 创建 Work 条目
                    await this.createWork(item, subscription, autoPublish);
                    result.created++;
                } catch (error) {
                    const errorMsg = `处理视频失败 "${item.title}": ${getErrorMessage(error)}`;
                    strapi.log.error(errorMsg);
                    result.errors.push(errorMsg);
                }
            }

            // 更新同步时间和计数
            await strapi.entityService.update(
                'api::bilibili-subscription.bilibili-subscription',
                subscription.id,
                {
                    data: {
                        lastSyncAt: new Date().toISOString(),
                        syncCount: (subscription.syncCount || 0) + result.created,
                    },
                }
            );

        } catch (error) {
            const errorMsg = `同步订阅失败 "${subscription.upName}": ${getErrorMessage(error)}`;
            strapi.log.error(errorMsg);
            result.errors.push(errorMsg);
        }

        return result;
    },

    /**
     * 同步所有活跃订阅（并发处理）
     */
    async syncAllSubscriptions(): Promise<{ total: number; created: number; skipped: number; errors: string[] }> {
        const retryResult = await this.processDueRetries('bilibili-sync-all');
        const subscriptions = await strapi.entityService.findMany(
            'api::bilibili-subscription.bilibili-subscription',
            {
                filters: {
                    isActive: true,
                },
            }
        ) as BilibiliSubscription[];

        const totalResult = {
            total: subscriptions.length + retryResult.total,
            created: retryResult.created,
            skipped: retryResult.skipped,
            errors: [...retryResult.errors] as string[],
        };

        const failedSubscriptions: BilibiliSubscription[] = [];

        // 限制并发，避免订阅数量增长后同时打满 RSSHub 实例。
        const results: Array<PromiseSettledResult<SyncResult>> = [];
        let nextIndex = 0;
        const workerCount = Math.min(RSS_SYNC_CONCURRENCY, subscriptions.length);

        await Promise.all(Array.from({ length: workerCount }, async () => {
            while (nextIndex < subscriptions.length) {
                const currentIndex = nextIndex++;
                try {
                    const value = await this.syncSubscription(subscriptions[currentIndex]);
                    results[currentIndex] = { status: 'fulfilled', value };
                } catch (reason) {
                    results[currentIndex] = { status: 'rejected', reason };
                }
            }
        }));

        // 处理结果
        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                totalResult.created += result.value.created;
                totalResult.skipped += result.value.skipped;
                totalResult.errors.push(...result.value.errors);

                // 跟踪失败的订阅
                if (result.value.errors.length > 0 && result.value.created === 0) {
                    failedSubscriptions.push(subscriptions[index]);
                }
            } else {
                const sub = subscriptions[index];
                const errorMsg = `同步订阅失败 "${sub.upName}": ${result.reason}`;
                strapi.log.error(errorMsg);
                totalResult.errors.push(errorMsg);
                failedSubscriptions.push(sub);
            }
        });

        strapi.log.info(`批量同步完成: ${totalResult.total} 个订阅, ${totalResult.created} 个新视频`);

        // 如果有失败的订阅，记录到数据库，由下一轮 cron 或手动同步拾取。
        if (failedSubscriptions.length > 0) {
            strapi.log.info(`${failedSubscriptions.length} 个订阅失败，已记录为数据库重试队列`);
            for (const subscription of failedSubscriptions) {
                await this.scheduleSubscriptionRetry(subscription, totalResult.errors[0] || '同步失败', 'bilibili-sync-all');
            }
        }

        return totalResult;
    },
}));
