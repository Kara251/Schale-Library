const AUDIT_LOG_UID = 'api::admin-audit-log.admin-audit-log' as any

export type AdminAuditAction = 'create' | 'update' | 'delete' | 'upload' | 'publish' | 'unpublish' | 'sync-one' | 'sync-all'
export type AdminAuditStatus = 'success' | 'partial' | 'failed'

function getClientIp(ctx: any) {
  // 取 x-forwarded-for 的最后一跳：它由最近的可信代理写入，前面的值可被客户端伪造
  const forwardedFor = ctx.request.headers['x-forwarded-for']
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    const hops = forwardedFor.split(',').map((part: string) => part.trim()).filter(Boolean)
    if (hops.length > 0) {
      return hops[hops.length - 1]
    }
  }

  return ctx.request.ip || ctx.ip || undefined
}

function getActor(ctx: any) {
  const user = ctx.state?.user
  if (!user || typeof user !== 'object') {
    return {}
  }

  return {
    actorId: typeof user.id === 'number' ? user.id : undefined,
    actorEmail: typeof user.email === 'string' ? user.email : undefined,
    actorUsername: typeof user.username === 'string' ? user.username : undefined,
    actorRole: typeof user.role?.type === 'string' ? user.role.type : typeof user.role?.name === 'string' ? user.role.name : undefined,
  }
}

export function getEntryLabel(entry: unknown) {
  if (!entry || typeof entry !== 'object') {
    return undefined
  }

  const record = entry as Record<string, unknown>
  return [record.title, record.name, record.upName, record.targetName]
    .find((value) => typeof value === 'string' && value.trim().length > 0) as string | undefined
}

export async function recordAdminAuditLog(ctx: any, input: {
  action: AdminAuditAction
  status: AdminAuditStatus
  targetCollection: string
  targetId?: number
  targetName?: string
  locale?: string
  message?: string
  details?: Record<string, unknown>
}) {
  try {
    await strapi.entityService.create(AUDIT_LOG_UID, {
      data: {
        ...input,
        ...getActor(ctx),
        ip: getClientIp(ctx),
        userAgent: typeof ctx.request.headers['user-agent'] === 'string' ? ctx.request.headers['user-agent'] : undefined,
      } as any,
    })
  } catch (error) {
    strapi.log.warn(`后台审计日志写入失败: ${(error as Error).message}`)
  }
}
