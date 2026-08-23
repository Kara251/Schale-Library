/**
 * 面板角色准入：对齐旧后端 is-panel-maintainer 语义。
 * ADMIN_PANEL_ALLOWED_ROLES（逗号分隔）存在时按其判定；
 * 开发环境缺省放行 maintainer/admin；生产环境缺省拒绝全部（fail-closed）。
 */
const DEVELOPMENT_DEFAULT_ROLES = ['maintainer', 'admin']

export function getAllowedRoles(env: string | undefined, production: boolean): Record<string, true> {
  const configured = env
    ? env
    : production
      ? ''
      : DEVELOPMENT_DEFAULT_ROLES.join(',')
  const allowed: Record<string, true> = {}
  for (const role of configured.split(',')) {
    const normalized = role.trim().toLowerCase()
    if (normalized) allowed[normalized] = true
  }
  return allowed
}

/** blocked 用户与无角色用户一律拒绝。 */
export function isAllowedAdminUser(
  user: { role: string; blocked?: number },
  env: string | undefined,
  production: boolean
): boolean {
  if (user.blocked) return false
  return getAllowedRoles(env, production)[user.role.trim().toLowerCase()] === true
}
