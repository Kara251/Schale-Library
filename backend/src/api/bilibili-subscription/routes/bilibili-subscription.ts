/**
 * bilibili-subscription router
 * 受保护的 CRUD 路由（仅管理员可用）
 * 同步功能仅通过 Cron 任务执行
 */

export default {
    routes: [
        // CRUD 路由 - 需要管理员认证
        {
            method: 'GET',
            path: '/bilibili-subscriptions',
            handler: 'bilibili-subscription.find',
            config: {
                policies: ['admin::isAuthenticatedAdmin'],
            },
        },
        {
            method: 'GET',
            path: '/bilibili-subscriptions/:id',
            handler: 'bilibili-subscription.findOne',
            config: {
                policies: ['admin::isAuthenticatedAdmin'],
            },
        },
        {
            method: 'POST',
            path: '/bilibili-subscriptions',
            handler: 'bilibili-subscription.create',
            config: {
                policies: ['admin::isAuthenticatedAdmin'],
            },
        },
        {
            method: 'PUT',
            path: '/bilibili-subscriptions/:id',
            handler: 'bilibili-subscription.update',
            config: {
                policies: ['admin::isAuthenticatedAdmin'],
            },
        },
        {
            method: 'DELETE',
            path: '/bilibili-subscriptions/:id',
            handler: 'bilibili-subscription.delete',
            config: {
                policies: ['admin::isAuthenticatedAdmin'],
            },
        },
    ],
};
