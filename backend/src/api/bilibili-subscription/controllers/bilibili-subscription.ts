/**
 * bilibili-subscription 控制器
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::bilibili-subscription.bilibili-subscription', ({ strapi }) => ({
    // 同步单个订阅
    async syncOne(ctx) {
        const { id } = ctx.params;

        try {
            const subscription = await strapi.entityService.findOne(
                'api::bilibili-subscription.bilibili-subscription',
                id
            );

            if (!subscription) {
                return ctx.notFound('订阅不存在');
            }

            const result = await strapi.service('api::bilibili-subscription.bilibili-subscription').syncSubscription(subscription);

            return {
                success: true,
                message: `同步完成，新增 ${result.created} 个视频`,
                ...result,
            };
        } catch (error) {
            strapi.log.error('同步失败:', error);
            return ctx.badRequest('同步失败: ' + (error as Error).message);
        }
    },

    // 同步所有活跃订阅
    async syncAll(ctx) {
        try {
            const result = await strapi.service('api::bilibili-subscription.bilibili-subscription').syncAllSubscriptions();

            return {
                success: true,
                message: `同步完成，共处理 ${result.total} 个订阅，新增 ${result.created} 个视频`,
                ...result,
            };
        } catch (error) {
            strapi.log.error('批量同步失败:', error);
            return ctx.badRequest('同步失败: ' + (error as Error).message);
        }
    },
}));
