/**
 * Cron 定时任务配置
 * 定期同步 B站 RSS
 */

const JOB_LOCK_UID = 'api::job-lock.job-lock' as any;
const ADMIN_AUDIT_LOG_UID = 'api::admin-audit-log.admin-audit-log' as any;
const RATE_LIMIT_UID = 'api::rate-limit-record.rate-limit-record' as any;
const SYNC_LOG_UID = 'api::sync-log.sync-log' as any;

function getRetentionDays(name: string, fallback: number) {
    const value = Number(process.env[name] || fallback);
    return Number.isFinite(value) && value > 0 ? value : fallback;
}

function daysAgo(days: number) {
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

async function acquireJobLock(strapi: any, name: string, ttlMs: number) {
    const now = new Date();
    const lockedUntil = new Date(now.getTime() + ttlMs).toISOString();
    const owner = `${process.env.HOST || 'strapi'}:${process.pid}:${Date.now()}`;
    const existing = await strapi.db.query(JOB_LOCK_UID).findOne({ where: { name } });

    if (existing && new Date(existing.lockedUntil).getTime() > now.getTime()) {
        return null;
    }

    if (existing) {
        await strapi.entityService.update(JOB_LOCK_UID, existing.id, {
            data: { owner, lockedUntil, details: { refreshedAt: now.toISOString() } },
        });
        return { id: existing.id, owner };
    }

    const created = await strapi.entityService.create(JOB_LOCK_UID, {
        data: { name, owner, lockedUntil, details: { createdAt: now.toISOString() } },
    });

    return { id: created.id, owner };
}

async function releaseJobLock(strapi: any, lock: { id: number; owner: string } | null) {
    if (!lock) {
        return;
    }

    try {
        await strapi.entityService.update(JOB_LOCK_UID, lock.id, {
            data: {
                owner: null,
                lockedUntil: new Date(0).toISOString(),
                details: { releasedAt: new Date().toISOString() },
            },
        });
    } catch (error) {
        strapi.log.warn(`[Cron] 释放任务锁失败: ${(error as Error).message}`);
    }
}

async function cleanupOldRecords(strapi: any) {
    const auditBefore = daysAgo(getRetentionDays('ADMIN_AUDIT_RETENTION_DAYS', 180));
    const syncBefore = daysAgo(getRetentionDays('SYNC_LOG_RETENTION_DAYS', 90));
    const rateBefore = daysAgo(getRetentionDays('RATE_LIMIT_RETENTION_DAYS', 7));
    const now = new Date().toISOString();

    const [auditLogs, syncLogs, rateLimits] = await Promise.all([
        strapi.db.query(ADMIN_AUDIT_LOG_UID).deleteMany({ where: { createdAt: { $lt: auditBefore } } }),
        strapi.db.query(SYNC_LOG_UID).deleteMany({ where: { createdAt: { $lt: syncBefore } } }),
        strapi.db.query(RATE_LIMIT_UID).deleteMany({
            where: {
                $or: [
                    { resetAt: { $lt: rateBefore } },
                    { resetAt: { $lt: now } },
                ],
            },
        }),
    ]);

    strapi.log.info(`[Cron] 清理过期记录完成: audit=${auditLogs.count || 0}, sync=${syncLogs.count || 0}, rateLimit=${rateLimits.count || 0}`);
}

export default {
    // 每天凌晨 3 点执行 B站 RSS 同步
    '0 3 * * *': async ({ strapi }) => {
        const lock = await acquireJobLock(
            strapi,
            'bilibili-rss-cron',
            Math.max(60 * 1000, Number(process.env.RSS_SYNC_LOCK_TTL_MS || '1800000'))
        );

        if (!lock) {
            strapi.log.info('[Cron] B站 RSS 同步已有实例执行，跳过本次任务');
            return;
        }

        strapi.log.info('[Cron] 开始执行 B站 RSS 同步任务');
        const startedAt = new Date();
        const service = strapi.service('api::bilibili-subscription.bilibili-subscription');

        try {
            const result = await service.syncAllSubscriptions();
            const message = `[Cron] B站 RSS 同步完成: ${result.total} 个订阅, ${result.created} 个新视频`;

            await service.recordSyncLog({
                action: 'bilibili-sync-cron',
                message,
                stage: 'success',
                total: result.total,
                created: result.created,
                skipped: result.skipped,
                errors: result.errors,
                startedAt,
                finishedAt: new Date(),
            });

            strapi.log.info(message);
        } catch (error) {
            strapi.log.error('[Cron] B站 RSS 同步失败:', error);
            await service.recordSyncLog({
                action: 'bilibili-sync-cron',
                status: 'failed',
                stage: 'failed',
                message: '[Cron] B站 RSS 同步失败: ' + (error as Error).message,
                errorCategory: 'cron',
                errors: [(error as Error).message],
                startedAt,
                finishedAt: new Date(),
            });
        } finally {
            await releaseJobLock(strapi, lock);
        }
    },

    // 每天凌晨 4 点清理过期审计、同步和限流记录
    '0 4 * * *': async ({ strapi }) => {
        const lock = await acquireJobLock(strapi, 'retention-cleanup', 30 * 60 * 1000);
        if (!lock) {
            strapi.log.info('[Cron] 记录清理已有实例执行，跳过本次任务');
            return;
        }

        try {
            await cleanupOldRecords(strapi);
        } catch (error) {
            strapi.log.error('[Cron] 清理过期记录失败:', error);
        } finally {
            await releaseJobLock(strapi, lock);
        }
    },
};
