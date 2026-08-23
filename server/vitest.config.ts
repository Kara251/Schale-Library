import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config'

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: './wrangler.toml' },
        d1Databases: ['DB'],
        // isolatedStorage:false → 全部 spec 共享同一 D1；必须单 worker 串行跑，
        // 否则并发文件的 resetAllContent 会清掉彼此正在用的表（跨文件竞态）。
        singleWorker: true,
        isolatedStorage: false,
        miniflare: {
          modulesRules: [{ type: 'Text', include: ['**/*.sql'] }],
          // 测试环境自持：不继承 wrangler.toml 的生产 vars（角色准入、Cookie Secure 语义都随之变）
          bindings: {
            ENVIRONMENT: 'development',
            ADMIN_PANEL_ALLOWED_ROLES: '',
          },
        },
      },
    },
  },
})
