/**
 * bilibili-subscription 控制器
 */

import { factories } from '@strapi/strapi';
import type { Core } from '@strapi/strapi';
import { acquireJobLock, releaseJobLock, BILIBILI_SYNC_LOCK } from '../../../utils/job-lock';

const AUDIT_LOG_UID = 'api::admin-audit-log.admin-audit-log' as any;
const MANUAL_SYNC_LOCK_TTL_MS = Math.max(60 * 1000, Number(process.env.RSS_SYNC_LOCK_TTL_MS || '1800000'));

function getClientIp(ctx: any) {
    // 取 x-forwarded-for 的最后一跳：它由最近的可信代理写入，前面的值可被客户端伪造
    const forwardedFor = ctx.request.headers['x-forwarded-for'];
    if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
        const hops = forwardedFor.split(',').map((part: string) => part.trim()).filter(Boolean);
        if (hops.length > 0) {
            return hops[hops.length - 1];
        }
    }

    return ctx.request.ip || ctx.ip || undefined;
}

function getActor(ctx: any) {
    const user = ctx.state?.user;
    if (!user || typeof user !== 'object') {
        return {};
    }

    return {
        actorId: typeof user.id === 'number' ? user.id : undefined,
        actorEmail: typeof user.email === 'string' ? user.email : undefined,
        actorUsername: typeof user.username === 'string' ? user.username : undefined,
        actorRole: typeof user.role?.type === 'string' ? user.role.type : typeof user.role?.name === 'string' ? user.role.name : undefined,
    };
}

function getNumericId(id: unknown) {
    const numericId = Number(id);
    return Number.isFinite(numericId) ? numericId : undefined;
}

async function recordAdminAudit(strapi: Core.Strapi, ctx: any, input: {
    action: 'sync-one' | 'sync-all';
    status: 'success' | 'partial' | 'failed';
    targetId?: number;
    targetName?: string;
    message?: string;
    details?: Record<string, unknown>;
}) {
    try {
        await strapi.entityService.create(AUDIT_LOG_UID, {
            data: {
                ...input,
                ...getActor(ctx),
                targetCollection: 'bilibili-subscriptions',
                ip: getClientIp(ctx),
                userAgent: typeof ctx.request.headers['user-agent'] === 'string' ? ctx.request.headers['user-agent'] : undefined,
            } as any,
        });
    } catch (error) {
        strapi.log.warn(`后台审计日志写入失败: ${(error as Error).message}`);
    }
}

export default factories.createCoreController('api::bilibili-subscription.bilibili-subscription', ({ strapi }) => ({
    // 同步单个订阅
    async syncOne(ctx) {
        const { id } = ctx.params;
        const startedAt = new Date();
        const service = strapi.service('api::bilibili-subscription.bilibili-subscription');

        // 与 cron、批量同步共用同一把任务锁，避免重复导入
        const lock = await acquireJobLock(strapi, BILIBILI_SYNC_LOCK, MANUAL_SYNC_LOCK_TTL_MS);
        if (!lock) {
            return ctx.conflict('已有同步任务正在执行，请稍后再试');
        }

        try {
            const subscription = await strapi.entityService.findOne(
                'api::bilibili-subscription.bilibili-subscription',
                id
            );

            if (!subscription) {
                return ctx.notFound('订阅不存在');
            }

            const result = await service.syncSubscription(subscription);
            const message = `同步完成，新增 ${result.created} 个视频`;
            if (result.errors.length > 0 && result.created === 0) {
                await service.scheduleSubscriptionRetry(subscription, result.errors[0], 'bilibili-sync-one');
            }
            await service.recordSyncLog({
                action: 'bilibili-sync-one',
                message,
                stage: result.errors.length > 0 ? 'failed' : 'success',
                targetId: subscription.id,
                targetName: subscription.upName,
                total: result.created + result.skipped + result.errors.length,
                created: result.created,
                skipped: result.skipped,
                errors: result.errors,
                startedAt,
                finishedAt: new Date(),
            });
            await recordAdminAudit(strapi, ctx, {
                action: 'sync-one',
                status: result.errors.length > 0 ? (result.created > 0 ? 'partial' : 'failed') : 'success',
                targetId: getNumericId(subscription.id),
                targetName: subscription.upName,
                message,
                details: result,
            });

            return {
                success: true,
                message,
                ...result,
            };
        } catch (error) {
            strapi.log.error('同步失败:', error);
            await service.recordSyncLog({
                action: 'bilibili-sync-one',
                status: 'failed',
                stage: 'failed',
                message: '同步失败: ' + (error as Error).message,
                targetId: Number.isFinite(Number(id)) ? Number(id) : undefined,
                errorCategory: 'manual-sync',
                errors: [(error as Error).message],
                startedAt,
                finishedAt: new Date(),
            });
            await recordAdminAudit(strapi, ctx, {
                action: 'sync-one',
                status: 'failed',
                targetId: getNumericId(id),
                message: (error as Error).message,
            });
            return ctx.badRequest('同步失败: ' + (error as Error).message);
        } finally {
            await releaseJobLock(strapi, lock);
        }
    },

    // 同步所有活跃订阅
    async syncAll(ctx) {
        const startedAt = new Date();
        const service = strapi.service('api::bilibili-subscription.bilibili-subscription');

        // 与 cron、单订阅同步共用同一把任务锁，避免并发批量导入
        const lock = await acquireJobLock(strapi, BILIBILI_SYNC_LOCK, MANUAL_SYNC_LOCK_TTL_MS);
        if (!lock) {
            return ctx.conflict('已有同步任务正在执行，请稍后再试');
        }

        try {
            const result = await service.syncAllSubscriptions();
            const message = `同步完成，共处理 ${result.total} 个订阅，新增 ${result.created} 个视频`;
            await service.recordSyncLog({
                action: 'bilibili-sync-all',
                message,
                stage: result.errors.length > 0 ? 'failed' : 'success',
                total: result.total,
                created: result.created,
                skipped: result.skipped,
                errors: result.errors,
                startedAt,
                finishedAt: new Date(),
            });
            await recordAdminAudit(strapi, ctx, {
                action: 'sync-all',
                status: result.errors.length > 0 ? (result.created > 0 ? 'partial' : 'failed') : 'success',
                message,
                details: result,
            });

            return {
                success: true,
                message,
                ...result,
            };
        } catch (error) {
            strapi.log.error('批量同步失败:', error);
            await service.recordSyncLog({
                action: 'bilibili-sync-all',
                status: 'failed',
                stage: 'failed',
                message: '同步失败: ' + (error as Error).message,
                errorCategory: 'manual-sync',
                errors: [(error as Error).message],
                startedAt,
                finishedAt: new Date(),
            });
            await recordAdminAudit(strapi, ctx, {
                action: 'sync-all',
                status: 'failed',
                message: (error as Error).message,
            });
            return ctx.badRequest('同步失败: ' + (error as Error).message);
        } finally {
            await releaseJobLock(strapi, lock);
        }
    },
}));
