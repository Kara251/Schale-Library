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
                policies: ['global::is-panel-maintainer'],
            },
        },
        {
            method: 'POST',
            path: '/bilibili-subscriptions/sync-all',
            handler: 'bilibili-subscription.syncAll',
            config: {
                policies: ['global::is-panel-maintainer'],
            },
        },
    ],
};
