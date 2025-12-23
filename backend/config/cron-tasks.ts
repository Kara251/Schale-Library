/**
 * Cron 定时任务配置
 * 定期同步 B站 RSS
 */

export default {
    // 每天凌晨 3 点执行 B站 RSS 同步
    '0 3 * * *': async ({ strapi }) => {
        strapi.log.info('[Cron] 开始执行 B站 RSS 同步任务');

        try {
            const result = await strapi
                .service('api::bilibili-subscription.bilibili-subscription')
                .syncAllSubscriptions();

            strapi.log.info(
                `[Cron] B站 RSS 同步完成: ${result.total} 个订阅, ${result.created} 个新视频`
            );
        } catch (error) {
            strapi.log.error('[Cron] B站 RSS 同步失败:', error);
        }
    },
};
