/**
 * 测试公共基建：D1 迁移执行 + fixture 读取（Text 模块导入，Workers 运行时无 fs）。
 */
import baselineSql from '../migrations/0001_baseline.sql?raw'

export interface FixtureSet {
  subscriptions: unknown
  works: unknown
  students: unknown
  schools: unknown
  online: unknown
  offline: unknown
}

/** 切分迁移 SQL 为可执行语句（跳过注释行）。幂等性由调用方保证。 */
export function splitSqlStatements(sql: string): string[] {
  return sql
    .split(';')
    .map((statement) =>
      statement
        .split('\n')
        .filter((line) => !line.trim().startsWith('--'))
        .join('\n')
        .trim(),
    )
    .filter((statement) => statement.length > 0)
}

const BASELINE_STATEMENTS = splitSqlStatements(baselineSql as string).map((statement) =>
  // 测试环境每次 describe 重建：CREATE TABLE → CREATE TABLE IF NOT EXISTS，
  // 使 applyBaseline 幂等（生产迁移文件不改）。
  statement
    .replace(/^CREATE TABLE /i, 'CREATE TABLE IF NOT EXISTS ')
    .replace(/^CREATE UNIQUE INDEX /i, 'CREATE UNIQUE INDEX IF NOT EXISTS ')
    .replace(/^CREATE INDEX /i, 'CREATE INDEX IF NOT EXISTS ')
)

// 追加迁移（0002_works.sql）：同样以 ?raw 内联；新迁移文件加入此处
import worksMigrationSql from '../migrations/0002_works.sql?raw'

export async function applyBaseline(db: D1Database): Promise<void> {
  for (const statement of BASELINE_STATEMENTS) {
    await db.prepare(statement).run()
  }
}
const MIGRATIONS: Record<string, string> = {
  'migrations/0001_baseline.sql': baselineSql as string,
  'migrations/0002_works.sql': worksMigrationSql as string,
}

/** 与 BASELINE_STATEMENTS 相同的幂等化：多 spec 共享 D1 存储时防 "table already exists" */
function idempotent(statement: string): string {
  return statement
    .replace(/^CREATE TABLE /i, 'CREATE TABLE IF NOT EXISTS ')
    .replace(/^CREATE UNIQUE INDEX /i, 'CREATE UNIQUE INDEX IF NOT EXISTS ')
    .replace(/^CREATE INDEX /i, 'CREATE INDEX IF NOT EXISTS ')
}

export async function applyMigration(db: D1Database, relativePath: string): Promise<void> {
  const sql = MIGRATIONS[relativePath]
  if (sql === undefined) throw new Error(`未内联的迁移文件：${relativePath}`)
  for (const statement of splitSqlStatements(sql)) {
    await db.prepare(idempotent(statement)).run()
  }
}

// fixtures 以 raw 文本模块内联（vitest.config.ts modulesRules 未含 json → 用 ?raw 声明）
import subscriptionsJson from './fixtures/subscriptions.json?raw'
import worksJson from './fixtures/works.json?raw'
import studentsJson from './fixtures/students.json?raw'
import schoolsJson from './fixtures/schools.json?raw'
import onlineEventsJson from './fixtures/online_events.json?raw'
import offlineEventsJson from './fixtures/offline_events.json?raw'

export async function readFixtures(): Promise<FixtureSet> {
  return {
    subscriptions: JSON.parse(subscriptionsJson as string),
    works: JSON.parse(worksJson as string),
    students: JSON.parse(studentsJson as string),
    schools: JSON.parse(schoolsJson as string),
    online: JSON.parse(onlineEventsJson as string),
    offline: JSON.parse(offlineEventsJson as string),
  }
}
/** 单个 fixture 读取（etl.spec 使用）：name 形如 'subscriptions.json' */
export async function readFixture(name: string): Promise<unknown> {
  const all = await readFixtures()
  const map: Record<string, unknown> = {
    'subscriptions.json': all.subscriptions,
    'works.json': all.works,
    'students.json': all.students,
    'schools.json': all.schools,
    'online_events.json': all.online,
    'offline_events.json': all.offline,
  }
  if (!(name in map)) {
    throw new Error(`Unknown fixture: ${name}`)
  }
  return map[name]
}

/** 全内容表统一清理（跨域测试隔离）：按外键依赖逆序 DELETE。 */
export async function resetAllContent(db: D1Database): Promise<void> {
  const tables = [
    'entry_revisions', 'entry_related_links', 'entry_citations', 'entry_themes',
    'entry_subjects', 'subject_students', 'path_steps', 'research_paths',
    'research_citations', 'research_entries', 'research_themes', 'research_subjects',
    'spoiler_tiers', 'curator', 'event_locations', 'events', 'works_students',
    'works', 'representative_works', 'creator_students', 'creators', 'students',
    'schools', 'friend_links', 'announcements',
  ]
  for (const table of tables) {
    // 只跑过 baseline 的 spec 没有 works/works_students：捕获并跳过
    try {
      await db.prepare(`DELETE FROM ${table}`).run()
      // 重置 AUTOINCREMENT 序列，保证跨 suite 硬编码 id=1 的种子可复现
      await db.prepare(`DELETE FROM sqlite_sequence WHERE name = ?`).bind(table).run()
    } catch {
      // 表不存在（未应用对应迁移）→ 跳过
    }
  }
}
