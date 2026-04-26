/**
 * Cron 定时任务配置
 * 定期同步 B站 RSS
 */

export default {
    // 每天凌晨 3 点执行 B站 RSS 同步
    '0 3 * * *': async ({ strapi }) => {
        strapi.log.info('[Cron] 开始执行 B站 RSS 同步任务');
        const startedAt = new Date();
        const service = strapi.service('api::bilibili-subscription.bilibili-subscription');

        try {
            const result = await service.syncAllSubscriptions();
            const message = `[Cron] B站 RSS 同步完成: ${result.total} 个订阅, ${result.created} 个新视频`;

            await service.recordSyncLog({
                action: 'bilibili-sync-cron',
                message,
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
                message: '[Cron] B站 RSS 同步失败: ' + (error as Error).message,
                errors: [(error as Error).message],
                startedAt,
                finishedAt: new Date(),
            });
        }
    },
};
