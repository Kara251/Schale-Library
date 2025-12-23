/**
 * API 密钥验证中间件
 * 用于保护同步接口
 */

export default (config, { strapi }) => {
    return async (ctx, next) => {
        const apiKey = ctx.request.header['x-api-key'] || ctx.query.apiKey;
        const expectedKey = process.env.SYNC_API_KEY;

        // 检查是否为本地请求
        const isLocalhost = ctx.request.ip === '::1' || ctx.request.ip === '127.0.0.1';

        // 如果没有配置密钥且是本地请求，允许访问（仅用于开发）
        if (!expectedKey && isLocalhost) {
            return next();
        }

        // 验证 API 密钥
        if (!apiKey || apiKey !== expectedKey) {
            return ctx.unauthorized('Invalid API key');
        }

        return next();
    };
};
