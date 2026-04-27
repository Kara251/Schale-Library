import type { Core } from '@strapi/strapi'

const DEVELOPMENT_ALLOWED_ROLES = 'authenticated'

function getAllowedRoles(): Set<string> {
  const configuredRoles = process.env.ADMIN_PANEL_ALLOWED_ROLES ||
    (process.env.NODE_ENV === 'production' ? '' : DEVELOPMENT_ALLOWED_ROLES)

  return new Set(
    configuredRoles
      .split(',')
      .map((role) => role.trim().toLowerCase())
      .filter(Boolean)
  )
}

export default async (policyContext: any, _config: unknown, { strapi }: { strapi: Core.Strapi }) => {
  try {
    const tokenPayload = await strapi.plugin('users-permissions').service('jwt').getToken(policyContext)

    if (!tokenPayload?.id) {
      return false
    }

    const user = await strapi.db.query('plugin::users-permissions.user').findOne({
      where: { id: tokenPayload.id },
      populate: ['role'],
    })

    if (!user || user.blocked) {
      return false
    }

    const roleCandidates = [user.role?.type, user.role?.name]
      .filter((role): role is string => Boolean(role))
      .map((role) => role.toLowerCase())

    if (roleCandidates.length === 0) {
      return process.env.NODE_ENV !== 'production' && process.env.ADMIN_PANEL_ALLOW_MISSING_ROLE === 'true'
    }

    const allowedRoles = getAllowedRoles()
    const isAllowed = roleCandidates.some((role) => allowedRoles.has(role))

    if (isAllowed) {
      policyContext.state.user = user
    }

    return isAllowed
  } catch (error) {
    strapi.log.warn(`后台面板权限校验失败: ${(error as Error).message}`)
    return false
  }
}
