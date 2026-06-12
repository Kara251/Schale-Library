import { expect, test } from '@playwright/test'

test('renders public home content', async ({ page }) => {
  await page.goto('/zh-Hans')

  await expect(page.getByRole('heading', { name: '精选推荐作品' })).toBeVisible()
  await expect(page.getByText('暂无推荐作品')).toBeVisible()
})

test('keeps works filters and pagination shareable in the URL', async ({ page }) => {
  await page.goto('/zh-Hans/works?q=alice&nature=fanmade&type=video&students=1,2&page=2')

  await expect(page.getByRole('heading', { name: '推荐作品' })).toBeVisible()
  await expect(page.getByPlaceholder('搜索作品名称、作者...')).toHaveValue('alice')
  await expect(page).toHaveURL(/q=alice/)
  await expect(page).toHaveURL(/nature=fanmade/)
  await expect(page).toHaveURL(/type=video/)
  await expect(page).toHaveURL(/students=1%2C2|students=1,2/)
  await expect(page).toHaveURL(/page=2/)
})

test('keeps event filters shareable in the URL', async ({ page }) => {
  await page.goto('/zh-Hans/online-events?q=live&nature=official&status=upcoming&sort=endTime&page=2')

  await expect(page.getByRole('heading', { name: '线上活动' })).toBeVisible()
  await expect(page.getByPlaceholder('搜索活动名称、主办方...')).toHaveValue('live')
  await expect(page.locator('#event-sort')).toHaveValue('endTime')
  await expect(page).toHaveURL(/q=live/)
  await expect(page).toHaveURL(/nature=official/)
  await expect(page).toHaveURL(/status=upcoming/)
  await expect(page).toHaveURL(/sort=endTime/)
  await expect(page).toHaveURL(/page=2/)
})

test('renders the custom panel login form', async ({ page }) => {
  await page.goto('/zh-Hans/login')

  await expect(page.getByRole('heading', { name: '登录' })).toBeVisible()
  await expect(page.getByLabel('邮箱或用户名')).toBeVisible()
  await expect(page.getByLabel('密码')).toBeVisible()
  await expect(page.getByRole('button', { name: '登录' })).toBeVisible()
})

test('redirects protected maintainer routes to login without a session', async ({ page }) => {
  await page.goto('/zh-Hans/manage')

  await expect(page).toHaveURL(/\/zh-Hans\/login\?next=/)
  await expect(page.getByRole('heading', { name: '登录' })).toBeVisible()
})

test('protects operational admin pages without a session', async ({ page }) => {
  await page.goto('/zh-Hans/manage/system-health')
  await expect(page).toHaveURL(/\/zh-Hans\/login\?next=/)

  await page.goto('/zh-Hans/manage/content-quality')
  await expect(page).toHaveURL(/\/zh-Hans\/login\?next=/)

  await page.goto('/zh-Hans/manage/bulk-actions')
  await expect(page).toHaveURL(/\/zh-Hans\/login\?next=/)
})

test('renders global search error fallback without crashing', async ({ page }) => {
  await page.goto('/zh-Hans/global-search?q=alice')

  await expect(page.getByRole('heading', { name: '搜索图书馆' })).toBeVisible()
  await expect(page.getByText('部分搜索结果暂时不可用，请稍后重试。')).toBeVisible()
})

test('renders research archive hub with knowledge-system navigation', async ({ page }) => {
  await page.goto('/zh-Hans/research-archives')

  await expect(page.getByRole('heading', { name: '考据档案' })).toBeVisible()
  await expect(page.getByRole('link', { name: '主题' })).toBeVisible()
  await expect(page.getByRole('link', { name: '考据对象' })).toBeVisible()
  await expect(page.getByRole('link', { name: '阅读路径' })).toBeVisible()
  await expect(page.getByRole('link', { name: '知识图谱' })).toBeVisible()
  await expect(page.getByText('阅读进度')).toHaveCount(0)
})

test('renders research themes page empty state', async ({ page }) => {
  await page.goto('/zh-Hans/research-archives/themes')

  await expect(page.getByRole('heading', { name: '主题' })).toBeVisible()
  await expect(page.getByText('暂无考据主题')).toBeVisible()
})

test('renders research subjects page empty state', async ({ page }) => {
  await page.goto('/zh-Hans/research-archives/subjects')

  await expect(page.getByRole('heading', { name: '考据对象' })).toBeVisible()
  await expect(page.getByText('暂无考据对象')).toBeVisible()
})

test('renders reading paths page empty state', async ({ page }) => {
  await page.goto('/zh-Hans/research-archives/paths')

  await expect(page.getByRole('heading', { name: '阅读路径' })).toBeVisible()
  await expect(page.getByText('暂无阅读路径')).toBeVisible()
})

test('renders knowledge graph page', async ({ page }) => {
  await page.goto('/zh-Hans/research-archives/graph')

  await expect(page.getByRole('heading', { name: '知识图谱' })).toBeVisible()
  await expect(page.getByText('暂无足够数据生成图谱')).toBeVisible()
})

test('renders announcements page', async ({ page }) => {
  await page.goto('/zh-Hans/announcements')

  await expect(page.getByRole('heading', { name: '公告' })).toBeVisible()
})

test('protects new manage collections without a session', async ({ page }) => {
  await page.goto('/zh-Hans/manage/schools')
  await expect(page).toHaveURL(/\/zh-Hans\/login\?next=/)

  await page.goto('/zh-Hans/manage/research-subjects')
  await expect(page).toHaveURL(/\/zh-Hans\/login\?next=/)

  await page.goto('/zh-Hans/manage/research-paths')
  await expect(page).toHaveURL(/\/zh-Hans\/login\?next=/)
})

test('rejects untrusted image proxy hosts', async ({ request }) => {
  const response = await request.get('/api/image-proxy?url=https%3A%2F%2Fexample.com%2Fcover.jpg')

  expect(response.status()).toBe(403)
})
