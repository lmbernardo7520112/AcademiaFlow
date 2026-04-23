/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'warn',
      comment: 'This dependency is part of a circular relationship.',
      from: {},
      to: { circular: true }
    },
    {
      name: 'not-to-apps-from-shared',
      severity: 'warn',
      comment: 'Shared package should not depend on apps.',
      from: { path: '^packages/shared' },
      to: { path: '^apps' }
    },
    {
      name: 'not-to-api-from-web',
      severity: 'warn',
      comment: 'Web app should not directly import from API app.',
      from: { path: '^apps/web' },
      to: { path: '^apps/api' }
    }
  ],
  options: {
    doNotFollow: {
      path: 'node_modules'
    },
    includeOnly: '^(apps|packages)',
    tsPreCompilationDeps: true
  }
};
