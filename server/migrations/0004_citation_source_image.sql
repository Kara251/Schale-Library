-- research_citations 补 source_image_url。
-- 面板早已提供「出处截图」字段（media 类型），但表上没有对应列，
-- 提交时被判为未登记字段直接 400 —— 引证集合从后台一条都存不进去。
ALTER TABLE research_citations ADD COLUMN source_image_url TEXT;
