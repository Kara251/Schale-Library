/**
 * bilibili-subscription 自定义路由
 */

export default {
    routes: [
        {
            method: 'POST',
            path: '/bilibili-subscriptions/:id/sync',
            handler: 'bilibili-subscription.syncOne',
            config: {
                policies: [],
            },
        },
        {
            method: 'GET',
            path: '/bilibili-subscriptions/sync-all',
            handler: 'bilibili-subscription.syncAll',
            config: {
                policies: [],
            },
        },
    ],
};
