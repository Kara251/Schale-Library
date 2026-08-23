import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config'

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: './wrangler.toml' },
        d1Databases: ['DB'],
        isolatedStorage: false,
        miniflare: {
          modulesRules: [{ type: 'Text', include: ['**/*.sql'] }],
        },
      },
    },
  },
})
