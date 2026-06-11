/**
 * 数据库任务锁（job_locks 表）
 * 供 cron 任务与手动触发的同步共用，避免同一任务并发执行。
 */

const JOB_LOCK_TABLE = 'job_locks';

export interface JobLock {
    id: number;
    owner: string;
}

export const BILIBILI_SYNC_LOCK = 'bilibili-rss-sync';

function isUniqueConstraintError(error: unknown) {
    const code = (error as { code?: string })?.code;
    const message = (error as Error)?.message || '';
    return code === '23505' || code === 'SQLITE_CONSTRAINT' || /unique constraint/i.test(message);
}

function jsonValueForDb(strapi: any, value: Record<string, unknown>) {
    const client = String(strapi.db.connection?.client?.config?.client || '');
    return client.includes('sqlite') ? JSON.stringify(value) : value;
}

async function findOwnedLock(strapi: any, name: string, owner: string) {
    return strapi.db.connection(JOB_LOCK_TABLE)
        .select('id')
        .where({ name, owner })
        .first();
}

export async function acquireJobLock(strapi: any, name: string, ttlMs: number): Promise<JobLock | null> {
    const now = new Date();
    const nowIso = now.toISOString();
    const lockedUntil = new Date(now.getTime() + ttlMs).toISOString();
    const owner = `${process.env.HOST || 'strapi'}:${process.pid}:${Date.now()}`;
    const table = strapi.db.connection(JOB_LOCK_TABLE);

    try {
        await table.insert({
            name,
            owner,
            locked_until: lockedUntil,
            details: jsonValueForDb(strapi, { createdAt: nowIso }),
            created_at: nowIso,
            updated_at: nowIso,
        });
        const created = await findOwnedLock(strapi, name, owner);
        return created ? { id: created.id, owner } : null;
    } catch (error) {
        if (!isUniqueConstraintError(error)) {
            throw error;
        }
    }

    const updated = await strapi.db.connection(JOB_LOCK_TABLE)
        .where({ name })
        .where((builder: any) => {
            builder.where('locked_until', '<=', nowIso).orWhereNull('locked_until');
        })
        .update({
            owner,
            locked_until: lockedUntil,
            details: jsonValueForDb(strapi, { refreshedAt: nowIso }),
            updated_at: nowIso,
        });

    if (Number(updated) === 0) {
        return null;
    }

    const refreshed = await findOwnedLock(strapi, name, owner);
    return refreshed ? { id: refreshed.id, owner } : null;
}

export async function releaseJobLock(strapi: any, lock: JobLock | null): Promise<void> {
    if (!lock) {
        return;
    }

    try {
        await strapi.db.connection(JOB_LOCK_TABLE)
            .where({ id: lock.id, owner: lock.owner })
            .update({
                owner: null,
                locked_until: new Date(0).toISOString(),
                details: jsonValueForDb(strapi, { releasedAt: new Date().toISOString() }),
                updated_at: new Date().toISOString(),
            });
    } catch (error) {
        strapi.log.warn(`释放任务锁失败 (${lock.id}): ${(error as Error).message}`);
    }
}
