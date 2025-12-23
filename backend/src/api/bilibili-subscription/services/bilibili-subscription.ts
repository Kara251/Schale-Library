/**
 * bilibili-subscription 服务
 * 处理 RSS 抓取和视频导入
 */

import { factories } from '@strapi/strapi';

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

// RSS 缓存（5分钟有效期）
const rssCache = new Map<string, { data: RSSItem[]; expires: number }>();
const RSS_CACHE_TTL = 5 * 60 * 1000; // 5分钟

export default factories.createCoreService('api::bilibili-subscription.bilibili-subscription', ({ strapi }) => ({
    /**
     * RSSHub 实例列表（按优先级排序）
     * 可通过环境变量 RSSHUB_URL 自定义
     */
    getRssHubInstances(): string[] {
        const customUrl = process.env.RSSHUB_URL;
        const instances = [
            'http://localhost:3200',  // 本地 RSSHub 优先
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
        // 检查缓存
        const cached = rssCache.get(uid);
        if (cached && Date.now() < cached.expires) {
            strapi.log.info(`使用缓存数据 (UID: ${uid})`);
            return cached.data;
        }

        const instances = this.getRssHubInstances();
        let lastError: Error | null = null;

        for (const instance of instances) {
            const rssUrl = `${instance}/bilibili/user/video/${uid}`;
            strapi.log.info(`尝试 RSSHub 实例: ${instance}`);

            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 15000); // 15秒超时

                const response = await fetch(rssUrl, {
                    signal: controller.signal,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    },
                });

                clearTimeout(timeoutId);

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
                    return items;
                }
            } catch (error) {
                lastError = error as Error;
                strapi.log.warn(`RSSHub 实例 ${instance} 失败: ${(error as Error).message}`);
                continue;
            }
        }

        strapi.log.error(`所有 RSSHub 实例都失败 (UID: ${uid})`);
        throw lastError || new Error('所有 RSSHub 实例都不可用');
    },

    /**
     * 解析 RSS XML
     */
    parseRSS(xmlText: string): RSSItem[] {
        const items: RSSItem[] = [];

        const itemRegex = /<item>([\s\S]*?)<\/item>/g;
        let match;

        while ((match = itemRegex.exec(xmlText)) !== null) {
            const itemContent = match[1];

            const title = this.extractTag(itemContent, 'title');
            const link = this.extractTag(itemContent, 'link');
            const pubDate = this.extractTag(itemContent, 'pubDate');
            const rawDescription = this.extractTag(itemContent, 'description');
            const author = this.extractTag(itemContent, 'author');

            // 从描述中提取封面图
            const coverUrl = this.extractCoverFromDescription(rawDescription);
            // 清理描述中的 HTML
            const description = this.stripHtml(rawDescription);

            if (title && link) {
                items.push({
                    title,
                    link,
                    pubDate,
                    description,
                    author,
                    coverUrl,
                });
            }
        }

        return items;
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
        let decoded = description
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, '&')
            .replace(/&#39;/g, "'");

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
        let text = html
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&nbsp;/g, ' ');

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
        subscription: any,
        autoPublish: boolean
    ): Promise<any> {
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
            publishedAt: autoPublish ? new Date().toISOString() : null,
        };

        const created = await strapi.entityService.create('api::work.work', {
            data: workData,
        });

        strapi.log.info(`创建视频: ${item.title} (${autoPublish ? '已发布' : '待审核'})`);

        return created;
    },

    /**
     * 同步单个订阅
     */
    async syncSubscription(subscription: any): Promise<SyncResult> {
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
            let items = await this.fetchVideos(subscription.uid);
            // 只同步最近 5 个视频
            items = items.slice(0, 5);
            strapi.log.info(`获取到 ${items.length} 个视频 (${subscription.upName})`);

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
                    const errorMsg = `处理视频失败 "${item.title}": ${(error as Error).message}`;
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
            const errorMsg = `同步订阅失败 "${subscription.upName}": ${(error as Error).message}`;
            strapi.log.error(errorMsg);
            result.errors.push(errorMsg);
        }

        return result;
    },

    /**
     * 同步所有活跃订阅（并发处理）
     */
    async syncAllSubscriptions(): Promise<{ total: number; created: number; skipped: number; errors: string[] }> {
        const subscriptions = await strapi.entityService.findMany(
            'api::bilibili-subscription.bilibili-subscription',
            {
                filters: {
                    isActive: true,
                },
            }
        );

        const totalResult = {
            total: subscriptions.length,
            created: 0,
            skipped: 0,
            errors: [] as string[],
        };

        const failedSubscriptions: any[] = [];

        // 并发同步所有订阅
        const results = await Promise.allSettled(
            subscriptions.map(sub => this.syncSubscription(sub))
        );

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
                const sub = subscriptions[index] as any;
                const errorMsg = `同步订阅失败 "${sub.upName}": ${result.reason}`;
                strapi.log.error(errorMsg);
                totalResult.errors.push(errorMsg);
                failedSubscriptions.push(sub);
            }
        });

        strapi.log.info(`批量同步完成: ${totalResult.total} 个订阅, ${totalResult.created} 个新视频`);

        // 如果有失败的订阅，5分钟后自动重试
        if (failedSubscriptions.length > 0) {
            strapi.log.info(`${failedSubscriptions.length} 个订阅失败，将在5分钟后重试`);

            setTimeout(async () => {
                strapi.log.info(`开始重试 ${failedSubscriptions.length} 个失败的订阅`);

                for (const subscription of failedSubscriptions) {
                    try {
                        const result = await this.syncSubscription(subscription);
                        if (result.created > 0) {
                            strapi.log.info(`重试成功: ${subscription.upName}, 新增 ${result.created} 个视频`);
                        } else if (result.errors.length > 0) {
                            strapi.log.warn(`重试仍失败: ${subscription.upName}`);
                        }
                    } catch (error) {
                        strapi.log.error(`重试出错: ${subscription.upName}`, error);
                    }
                }
            }, 5 * 60 * 1000); // 5分钟
        }

        return totalResult;
    },
}));
