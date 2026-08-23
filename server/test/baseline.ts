/**
 * 基线 schema 加载：以 Vite ?raw 导入 SQL 文本（workers 运行时无 fs），
 * 切分为可逐条执行的语句列表。
 */
import baselineSql from '../migrations/0001_baseline.sql?raw'

export const BASELINE_STATEMENTS: string[] = (baselineSql as unknown as string)
  .split(';')
  .map((s) =>
    s
      .split('\n')
      .filter((line) => !line.trim().startsWith('--'))
      .join('\n')
      .trim()
  )
  .filter((s) => s.length > 0)
  // 多 spec 共享同一 D1 存储：CREATE TABLE → IF NOT EXISTS，保证幂等
  .map((statement) =>
    statement
      .replace(/^CREATE TABLE /i, 'CREATE TABLE IF NOT EXISTS ')
      .replace(/^CREATE UNIQUE INDEX /i, 'CREATE UNIQUE INDEX IF NOT EXISTS ')
      .replace(/^CREATE INDEX /i, 'CREATE INDEX IF NOT EXISTS ')
  )
