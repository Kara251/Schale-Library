export default {
  routes: [
    {
      method: 'POST',
      path: '/panel/upload',
      handler: 'panel.upload',
      config: {
        auth: false,
        policies: ['global::is-panel-maintainer'],
      },
    },
    {
      method: 'POST',
      path: '/panel/internal/rate-limit',
      handler: 'panel.rateLimit',
      config: {
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/panel/system/health',
      handler: 'panel.systemHealth',
      config: {
        auth: false,
        policies: ['global::is-panel-maintainer'],
      },
    },
    {
      method: 'GET',
      path: '/panel/quality/issues',
      handler: 'panel.qualityIssues',
      config: {
        auth: false,
        policies: ['global::is-panel-maintainer'],
      },
    },
    {
      method: 'POST',
      path: '/panel/quality/scan',
      handler: 'panel.scanQuality',
      config: {
        auth: false,
        policies: ['global::is-panel-maintainer'],
      },
    },
    {
      method: 'POST',
      path: '/panel/bulk-action',
      handler: 'panel.bulkAction',
      config: {
        auth: false,
        policies: ['global::is-panel-maintainer'],
      },
    },
    {
      method: 'GET',
      path: '/panel/admin-audit-logs/export',
      handler: 'panel.exportAuditLogs',
      config: {
        auth: false,
        policies: ['global::is-panel-maintainer'],
      },
    },
    {
      method: 'GET',
      path: '/panel/:collection',
      handler: 'panel.list',
      config: {
        auth: false,
        policies: ['global::is-panel-maintainer'],
      },
    },
    {
      method: 'GET',
      path: '/panel/:collection/:id',
      handler: 'panel.findOne',
      config: {
        auth: false,
        policies: ['global::is-panel-maintainer'],
      },
    },
    {
      method: 'POST',
      path: '/panel/:collection',
      handler: 'panel.create',
      config: {
        auth: false,
        policies: ['global::is-panel-maintainer'],
      },
    },
    {
      method: 'PUT',
      path: '/panel/:collection/:id',
      handler: 'panel.update',
      config: {
        auth: false,
        policies: ['global::is-panel-maintainer'],
      },
    },
    {
      method: 'DELETE',
      path: '/panel/:collection/:id',
      handler: 'panel.delete',
      config: {
        auth: false,
        policies: ['global::is-panel-maintainer'],
      },
    },
  ],
}
