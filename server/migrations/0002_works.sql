-- works 平移表：旧 Strapi work 集合原样搬迁（W4 仍在服役；W5 退役 + 301 到 creators 后，随 W6 清理清单删除）。
-- 字段语义对齐 frontend/tests/contracts/works.ts 的 Work 接口。
-- 时间列一律 INTEGER (unixepoch ms)；original_publish_date 为旧数据原样 ISO 日期字符串。
CREATE TABLE works (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  author TEXT,
  description TEXT,
  cover_image_url TEXT,             -- 站内/R2 封面路径
  cover_image_url_external TEXT,    -- 外链封面（bilibili/pixiv 等）
  nature TEXT NOT NULL DEFAULT 'fanmade' CHECK (nature IN ('official','fanmade')),
  work_type TEXT NOT NULL DEFAULT 'other',
  link TEXT,
  source_platform TEXT,
  source_url TEXT,
  source_id TEXT,
  is_featured INTEGER NOT NULL DEFAULT 0,
  featured_priority INTEGER NOT NULL DEFAULT 0,
  featured_reason TEXT,
  featured_until INTEGER,
  is_active INTEGER NOT NULL DEFAULT 1,
  is_auto_imported INTEGER NOT NULL DEFAULT 0,
  imported_at INTEGER,
  original_publish_date TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  published_at INTEGER              -- NULL = 草稿，公开 API 不可见
);
CREATE INDEX idx_works_published ON works(is_active, published_at);
CREATE INDEX idx_works_featured ON works(is_featured, featured_priority);
CREATE INDEX idx_works_author ON works(author);

-- 出场学生 M2M
CREATE TABLE works_students (
  work_id INTEGER NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (work_id, student_id)
);
CREATE INDEX idx_works_students_student ON works_students(student_id);
