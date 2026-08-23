/**
 * bootstrap 维护账号：BOOTSTRAP_ADMIN_USERNAME / BOOTSTRAP_ADMIN_PASSWORD
 * 环境变量存在且 users 表为空时自动创建（幂等，可重复调用）。
 */
import { hashPassword } from './password'

export async function ensureBootstrapAdmin(
  db: D1Database,
  username: string | undefined,
  password: string | undefined,
  now = Date.now()
): Promise<void> {
  if (!username || !password) return

  const count = await db.prepare('SELECT COUNT(*) AS n FROM users').first<{ n: number }>()
  if (!count || count.n > 0) return

  const passwordHash = await hashPassword(password)
  await db
    .prepare('INSERT INTO users (username, email, password_hash, role, blocked, confirmed, created_at) VALUES (?1, NULL, ?2, ?3, 0, 1, ?4)')
    .bind(username, passwordHash, 'maintainer', now)
    .run()
}
