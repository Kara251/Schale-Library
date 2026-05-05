function splitList(value?: string) {
  return (value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function assertProductionCorsOrigins(origins: string[]) {
  for (const origin of origins) {
    if (origin === '*') {
      throw new Error('STRAPI_CORS_ORIGINS must not include * in production.');
    }

    try {
      const parsed = new URL(origin);
      if (parsed.protocol !== 'https:') {
        throw new Error('invalid protocol');
      }
    } catch {
      throw new Error('STRAPI_CORS_ORIGINS must contain valid HTTPS origins in production.');
    }
  }
}

export default ({ env }) => {
  const corsOrigins = splitList(env('STRAPI_CORS_ORIGINS'));

  if (env('NODE_ENV') === 'production' && corsOrigins.length === 0) {
    throw new Error('STRAPI_CORS_ORIGINS is required in production.');
  }
  if (env('NODE_ENV') === 'production') {
    assertProductionCorsOrigins(corsOrigins);
  }

  return [
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
    {
      name: 'strapi::cors',
      config: {
        origin: corsOrigins.length > 0 ? corsOrigins : ['http://localhost:3000', 'http://127.0.0.1:3000'],
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
        headers: ['Content-Type', 'Authorization', 'Origin', 'Accept'],
        keepHeaderOnError: true,
      },
    },
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
};
