/**
 * bilibili-subscription 控制器
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::bilibili-subscription.bilibili-subscription', ({ strapi }) => ({
    // 同步单个订阅
    async syncOne(ctx) {
        const { id } = ctx.params;
        const startedAt = new Date();
        const service = strapi.service('api::bilibili-subscription.bilibili-subscription');

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
            await service.recordSyncLog({
                action: 'bilibili-sync-one',
                message,
                targetId: subscription.id,
                targetName: subscription.upName,
                total: result.created + result.skipped + result.errors.length,
                created: result.created,
                skipped: result.skipped,
                errors: result.errors,
                startedAt,
                finishedAt: new Date(),
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
                message: '同步失败: ' + (error as Error).message,
                targetId: Number.isFinite(Number(id)) ? Number(id) : undefined,
                errors: [(error as Error).message],
                startedAt,
                finishedAt: new Date(),
            });
            return ctx.badRequest('同步失败: ' + (error as Error).message);
        }
    },

    // 同步所有活跃订阅
    async syncAll(ctx) {
        const startedAt = new Date();
        const service = strapi.service('api::bilibili-subscription.bilibili-subscription');

        try {
            const result = await service.syncAllSubscriptions();
            const message = `同步完成，共处理 ${result.total} 个订阅，新增 ${result.created} 个视频`;
            await service.recordSyncLog({
                action: 'bilibili-sync-all',
                message,
                total: result.total,
                created: result.created,
                skipped: result.skipped,
                errors: result.errors,
                startedAt,
                finishedAt: new Date(),
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
                message: '同步失败: ' + (error as Error).message,
                errors: [(error as Error).message],
                startedAt,
                finishedAt: new Date(),
            });
            return ctx.badRequest('同步失败: ' + (error as Error).message);
        }
    },
}));
