import { expect, test } from '@playwright/test'

test('renders public home content', async ({ page }) => {
  await page.goto('/zh-Hans')

  await expect(page.getByRole('heading', { name: '最新推荐作品' })).toBeVisible()
  await expect(page.getByText('暂无推荐作品')).toBeVisible()
})

test('keeps works filters and pagination shareable in the URL', async ({ page }) => {
  await page.goto('/zh-Hans/works?q=alice&nature=fanmade&type=video&source=bilibili&page=2')

  await expect(page.getByRole('heading', { name: '推荐作品' })).toBeVisible()
  await expect(page.getByPlaceholder('搜索作品名称、作者...')).toHaveValue('alice')
  await expect(page).toHaveURL(/q=alice/)
  await expect(page).toHaveURL(/nature=fanmade/)
  await expect(page).toHaveURL(/type=video/)
  await expect(page).toHaveURL(/source=bilibili/)
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

test('rejects untrusted image proxy hosts', async ({ request }) => {
  const response = await request.get('/api/image-proxy?url=https%3A%2F%2Fexample.com%2Fcover.jpg')

  expect(response.status()).toBe(403)
})
