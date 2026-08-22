-- 夏莱图书馆 D1 基线 schema（v2 计划：创作者优先 + student 瘦身 + event 合并）
-- 约定：
-- - i18n JSON 列仅用于真 localized 字段（SchemaScout 矩阵）；单 locale 字段用 TEXT
-- - published_at 为 NULL 表示草稿（对应 12 个 draftAndPublish CT）
-- - 时间一律 INTEGER (unixepoch ms)
-- - 无 sync_log / job_locks（RSS 已退役；调度由平台 Cron + DO Alarm 保证单实例）

CREATE TABLE creators (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  bio_json TEXT,                -- {"zh-Hans":...,"en":...,"ja":...} 可空
  platform TEXT NOT NULL DEFAULT 'bilibili',
  platform_uid TEXT,
  homepage_url TEXT,
  is_featured INTEGER NOT NULL DEFAULT 0,
  featured_priority INTEGER NOT NULL DEFAULT 0,
  needs_review INTEGER NOT NULL DEFAULT 0,   -- ETL 占位创作者标记
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  published_at INTEGER
);
CREATE INDEX idx_creators_featured ON creators(is_featured, featured_priority);

CREATE TABLE creator_students (
  creator_id INTEGER NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  PRIMARY KEY (creator_id, student_id)
);

-- 代表作：组件语义，零独立工作流
CREATE TABLE representative_works (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  creator_id INTEGER NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  url TEXT NOT NULL,             -- 入库时校验 http(s)（S1 渲染校验原则）
  cover_url TEXT,
  note_json TEXT
);

CREATE TABLE students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,            -- 单列（现状无字段级本地化）
  avatar_url TEXT,
  organization TEXT,
  wiki_url TEXT,                 -- kivo.wiki / SchaleDB 外链
  school_id INTEGER REFERENCES schools(id),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  published_at INTEGER
);

CREATE TABLE schools (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  name_json TEXT NOT NULL,       -- localized:true
  description_json TEXT,
  short_name_json TEXT,
  color TEXT,
  logo_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  published_at INTEGER
);

-- online/offline 合并：kind 区分，场地字段收敛为 location 组件表
CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL CHECK (kind IN ('online','offline')),
  title_json TEXT NOT NULL,
  description_json TEXT,
  nature TEXT NOT NULL CHECK (nature IN ('official','fanmade')),
  event_format TEXT,
  status_override TEXT,
  start_time INTEGER,
  end_time INTEGER,
  link TEXT,
  cover_image_url TEXT,
  organizer TEXT,
  organizer_verified INTEGER NOT NULL DEFAULT 0,
  source_platform TEXT,
  source_url TEXT,
  last_verified_at INTEGER,
  tags_json TEXT,                -- JSON array
  guests_json TEXT,
  ticket_price_text_json TEXT,
  price_min REAL,
  price_max REAL,
  currency TEXT,
  ticket_status TEXT,
  ticket_url TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  published_at INTEGER
);
CREATE INDEX idx_events_start ON events(kind, start_time DESC);
CREATE INDEX idx_events_published_start ON events(published_at, start_time DESC);

-- 场地组件（offline）：原 location/mapUrl/country/region/city 收敛
CREATE TABLE event_locations (
  event_id INTEGER PRIMARY KEY REFERENCES events(id) ON DELETE CASCADE,
  country TEXT,
  region TEXT,
  city TEXT,
  venue TEXT,
  address TEXT,
  location_note TEXT,
  map_url TEXT
);

CREATE TABLE announcements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id TEXT NOT NULL UNIQUE,
  title_json TEXT NOT NULL,
  content_json TEXT,
  cover_image_url TEXT,
  link TEXT,
  priority INTEGER NOT NULL DEFAULT 0,
  is_pinned INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  published_at INTEGER
);
CREATE INDEX idx_announcements_created ON announcements(created_at DESC);

CREATE TABLE friend_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id TEXT NOT NULL UNIQUE,
  title_json TEXT NOT NULL,
  description_json TEXT,
  url TEXT NOT NULL,
  icon_url TEXT,
  priority INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  published_at INTEGER
);

CREATE TABLE spoiler_tiers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id TEXT NOT NULL UNIQUE,
  key TEXT NOT NULL UNIQUE,
  title_json TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- ===== 考据系列（结构平移，localized 字段转 JSON 列）=====
CREATE TABLE research_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  title_json TEXT NOT NULL,
  summary_json TEXT,
  body_json TEXT,
  stance TEXT NOT NULL DEFAULT 'official',
  media_type TEXT NOT NULL DEFAULT 'text',
  spoiler_tier_id INTEGER REFERENCES spoiler_tiers(id),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  published_at INTEGER
);
CREATE INDEX idx_research_entries_slug ON research_entries(slug);

CREATE TABLE research_themes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  title_json TEXT NOT NULL,
  curated_intro_json TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  published_at INTEGER
);

CREATE TABLE research_subjects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  title_json TEXT NOT NULL,
  description_json TEXT,
  subject_type TEXT NOT NULL,
  cover_url TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  published_at INTEGER
);

CREATE TABLE research_paths (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  title_json TEXT NOT NULL,
  description_json TEXT,
  difficulty TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  published_at INTEGER
);

CREATE TABLE research_citations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id TEXT NOT NULL UNIQUE,
  claim_short_json TEXT,
  source_type TEXT,
  source_ref TEXT,
  source_quote_json TEXT,
  confidence TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  published_at INTEGER
);

-- 关联表
CREATE TABLE entry_themes (
  entry_id INTEGER NOT NULL REFERENCES research_entries(id) ON DELETE CASCADE,
  theme_id INTEGER NOT NULL REFERENCES research_themes(id) ON DELETE CASCADE,
  PRIMARY KEY (entry_id, theme_id)
);
CREATE TABLE entry_subjects (
  entry_id INTEGER NOT NULL REFERENCES research_entries(id) ON DELETE CASCADE,
  subject_id INTEGER NOT NULL REFERENCES research_subjects(id) ON DELETE CASCADE,
  PRIMARY KEY (entry_id, subject_id)
);
CREATE TABLE subject_students (
  subject_id INTEGER NOT NULL REFERENCES research_subjects(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  PRIMARY KEY (subject_id, student_id)
);
CREATE TABLE entry_citations (
  entry_id INTEGER NOT NULL REFERENCES research_entries(id) ON DELETE CASCADE,
  citation_id INTEGER NOT NULL REFERENCES research_citations(id) ON DELETE CASCADE,
  PRIMARY KEY (entry_id, citation_id)
);

-- related-link 组件（语义边）
CREATE TABLE entry_related_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entry_id INTEGER NOT NULL REFERENCES research_entries(id) ON DELETE CASCADE,
  target_document_id TEXT NOT NULL,
  relation_type TEXT NOT NULL DEFAULT 'related'
    CHECK (relation_type IN ('prototype','echoes','extends','contradicts','prerequisite','related')),
  curate_note_json TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- path-step 组件
CREATE TABLE path_steps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  path_id INTEGER NOT NULL REFERENCES research_paths(id) ON DELETE CASCADE,
  target_document_id TEXT NOT NULL,
  step_note_json TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- revision 组件
CREATE TABLE entry_revisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entry_id INTEGER NOT NULL REFERENCES research_entries(id) ON DELETE CASCADE,
  revised_at TEXT,
  revision_type TEXT NOT NULL DEFAULT 'created',
  note_json TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- curator singleType
CREATE TABLE curator (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  featured_entry_document_id TEXT,
  pick_note_json TEXT,
  path_description_json TEXT,
  path_steps_json TEXT,          -- 组件序列整体 JSON 存取频率低
  updated_at INTEGER NOT NULL
);

-- 运维表
CREATE TABLE admin_audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,
  target_collection TEXT,
  target_document_id TEXT,
  payload_summary TEXT,
  actor_username TEXT,
  ip TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_audit_created ON admin_audit_logs(created_at);

CREATE TABLE rate_limit_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scope TEXT NOT NULL,
  identifier TEXT NOT NULL,
  key TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  reset_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_rate_limit_reset ON rate_limit_records(reset_at);
CREATE INDEX idx_rate_limit_scope_key ON rate_limit_records(scope, identifier, key);

CREATE TABLE content_quality_issues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  issue_type TEXT NOT NULL,
  collection TEXT NOT NULL,
  target_document_id TEXT,
  detail_json TEXT,
  batch_id TEXT,
  created_at INTEGER NOT NULL
);

-- 会话（manage 后台）
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  email TEXT UNIQUE,
  password_hash TEXT NOT NULL,   -- PBKDF2(WebCrypto) $pbkdf2$iter$salt$hash
  role TEXT NOT NULL DEFAULT 'maintainer',
  blocked INTEGER NOT NULL DEFAULT 0,
  confirmed INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,           -- 随机 token id，cookie 只存此 id
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- 301/外跳映射表（ETL 产出随部署加载）
CREATE TABLE redirect_map (
  from_path TEXT PRIMARY KEY,    -- /works/abc 或 /students/xyz
  to_kind TEXT NOT NULL CHECK (to_kind IN ('creator','external','archive')),
  to_target TEXT NOT NULL        -- /creators/slug 或 https://... 或 /creators
);
