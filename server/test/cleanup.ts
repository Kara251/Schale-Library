/**
 * 全内容表统一清理（跨域测试隔离）：按外键依赖逆序 DELETE。
 * 各 spec 的 beforeEach 调用 resetAllContent(env.DB)。
 */
const ALL_CONTENT_TABLES = [
  'entry_revisions',
  'entry_related_links',
  'entry_citations',
  'entry_themes',
  'entry_subjects',
  'subject_students',
  'path_steps',
  'research_paths',
  'research_citations',
  'research_entries',
  'research_themes',
  'research_subjects',
  'spoiler_tiers',
  'curator',
  'event_locations',
  'events',
  'works_students',
  'works',
  'representative_works',
  'creator_students',
  'creators',
  'students',
  'schools',
  'friend_links',
  'announcements',
]

export async function resetAllContent(db: D1Database): Promise<void> {
  for (const table of ALL_CONTENT_TABLES) {
    await db.prepare(`DELETE FROM ${table}`).run()
  }
}
