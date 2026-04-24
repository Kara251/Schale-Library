export default [
  'strapi::errors',
  {
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'connect-src': ["'self'", 'https:'],
          'img-src': [
            "'self'",
            'data:',
            'blob:',
            'market-assets.strapi.io',
            'res.cloudinary.com', // 关键：允许 Cloudinary 图片
          ],
          'media-src': [
            "'self'",
            'data:',
            'blob:',
            'market-assets.strapi.io',
            'res.cloudinary.com', // 关键：允许 Cloudinary 媒体
          ],
          upgradeInsecureRequests: null,
        },
      },
    },
  },
  'strapi::cors',
  'strapi::poweredBy',
  'strapi::logger',
  'strapi::query',
  {
    name: 'strapi::body',
    config: {
      formLimit: '25mb',
      jsonLimit: '10mb',
      textLimit: '10mb',
      formidable: {
        maxFileSize: 25 * 1024 * 1024,
      },
    },
  },
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];