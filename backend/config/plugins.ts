export default ({ env }) => ({
  upload: {
    config: (() => {
      const cloudinaryName = env('CLOUDINARY_NAME');
      const cloudinaryKey = env('CLOUDINARY_KEY');
      const cloudinarySecret = env('CLOUDINARY_SECRET');
      const hasAnyCloudinaryConfig = Boolean(cloudinaryName || cloudinaryKey || cloudinarySecret);
      const hasFullCloudinaryConfig = Boolean(cloudinaryName && cloudinaryKey && cloudinarySecret);

      if (hasAnyCloudinaryConfig && !hasFullCloudinaryConfig) {
        throw new Error('CLOUDINARY_NAME, CLOUDINARY_KEY, and CLOUDINARY_SECRET must be configured together.');
      }

      if (!hasFullCloudinaryConfig) {
        return {};
      }

      return {
        provider: 'cloudinary',
        providerOptions: {
          cloud_name: cloudinaryName,
          api_key: cloudinaryKey,
          api_secret: cloudinarySecret,
        },
        actionOptions: {
          upload: {},
          uploadStream: {},
          delete: {},
        },
      };
    })(),
  },
  i18n: {
    enabled: true,
    config: {
      locales: ['zh-Hans', 'en', 'ja'],
      defaultLocale: 'zh-Hans',
    },
  },
});
