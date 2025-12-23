import type { StrapiApp } from '@strapi/strapi/admin';

export default {
    config: {
        locales: [
            'zh-Hans', // 简体中文
            'zh',      // 中文
        ],
    },
    bootstrap(app: StrapiApp) {
        // 应用启动时的自定义逻辑
    },
};
