/**
 * 国际化配置
 */

export type Locale = 'zh-Hans' | 'en' | 'ja'

export const locales: Locale[] = ['zh-Hans', 'en', 'ja']

export const localeNames: Record<Locale, string> = {
  'zh-Hans': '简体中文',
  'en': 'English',
  'ja': '日本語',
}

export const defaultLocale: Locale = 'zh-Hans'

/**
 * 获取当前语言
 */
export function getCurrentLocale(): Locale {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('locale') as Locale
    if (saved && locales.includes(saved)) {
      return saved
    }
  }
  return defaultLocale
}

/**
 * 设置语言
 */
export function setLocale(locale: Locale): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('locale', locale)
  }
}

/**
 * 翻译字典
 */
export const translations = {
  'zh-Hans': {
    // 导航
    'nav.resources': '资源整理',
    'nav.onlineEvents': '线上活动',
    'nav.offlineEvents': '线下活动',
    'nav.login': '登录',
    'nav.search': '搜索',
    'nav.searchPlaceholder': '搜索活动、资源...',

    // 首页
    'home.title': '欢迎来到夏莱图书馆',
    'home.latestEvents': '最新活动',
    'home.latestWorks': '最新推荐作品',
    'home.noEvents': '暂无活动',
    'home.noWorks': '暂无推荐作品',
    'home.loadMore': '加载更多',

    // 活动
    'event.status.upcoming': '未开始',
    'event.status.ongoing': '进行中',
    'event.status.ended': '已结束',
    'event.nature.official': '官方',
    'event.nature.fanmade': '同人',
    'event.details': '详情',
    'event.visit': '访问',
    'event.noLink': '暂无链接',

    // 筛选
    'filter.title': '筛选',
    'filter.clear': '清除',
    'filter.nature': '活动性质',
    'filter.status': '活动状态',
    'filter.all': '全部',

    // 搜索
    'search.placeholder': '搜索活动名称、主办方...',
    'search.button': '搜索',
    'search.results': '找到 {count} 个活动',
    'search.noResults': '没有找到符合条件的活动',

    // 分页
    'pagination.page': '第 {current} / {total} 页',
    'pagination.first': '首页',
    'pagination.prev': '上一页',
    'pagination.next': '下一页',
    'pagination.last': '末页',

    // 用户
    'user.logout': '登出',
    'user.settings': '设置',

    // 页脚
    'footer.about': '关于我们',
    'footer.contact': '联系方式',
    'footer.privacy': '隐私政策',
    'footer.copyright': '© 2025 Schale Library',
    'footer.disclaimer': '本站与Nexon及Yostar无关',
  },

  'en': {
    // Navigation
    'nav.resources': 'Resources',
    'nav.onlineEvents': 'Online Events',
    'nav.offlineEvents': 'Offline Events',
    'nav.login': 'Login',
    'nav.search': 'Search',
    'nav.searchPlaceholder': 'Search events, resources...',

    // Home
    'home.title': 'Welcome to Schale Library',
    'home.latestEvents': 'Latest Events',
    'home.latestWorks': 'Latest Recommended Works',
    'home.noEvents': 'No events',
    'home.noWorks': 'No recommended works yet',
    'home.loadMore': 'Load More',

    // Events
    'event.status.upcoming': 'Upcoming',
    'event.status.ongoing': 'Ongoing',
    'event.status.ended': 'Ended',
    'event.nature.official': 'Official',
    'event.nature.fanmade': 'Fan-made',
    'event.details': 'Details',
    'event.visit': 'Visit',
    'event.noLink': 'No link',

    // Filter
    'filter.title': 'Filter',
    'filter.clear': 'Clear',
    'filter.nature': 'Event Nature',
    'filter.status': 'Event Status',
    'filter.all': 'All',

    // Search
    'search.placeholder': 'Search events, organizers...',
    'search.button': 'Search',
    'search.results': 'Found {count} events',
    'search.noResults': 'No events found',

    // Pagination
    'pagination.page': 'Page {current} / {total}',
    'pagination.first': 'First',
    'pagination.prev': 'Previous',
    'pagination.next': 'Next',
    'pagination.last': 'Last',

    // User
    'user.logout': 'Logout',
    'user.settings': 'Settings',

    // Footer
    'footer.about': 'About',
    'footer.contact': 'Contact',
    'footer.privacy': 'Privacy',
    'footer.copyright': '© 2025 Schale Library',
    'footer.disclaimer': 'Not affiliated with Nexon or Yostar',
  },

  'ja': {
    // ナビゲーション
    'nav.resources': 'リソース',
    'nav.onlineEvents': 'オンラインイベント',
    'nav.offlineEvents': 'オフラインイベント',
    'nav.login': 'ログイン',
    'nav.search': '検索',
    'nav.searchPlaceholder': 'イベントやリソースを検索...',

    // ホーム
    'home.title': 'シャーレ図書館へようこそ',
    'home.latestEvents': '最新イベント',
    'home.latestWorks': '最新おすすめ作品',
    'home.noEvents': 'イベントはありません',
    'home.noWorks': 'おすすめ作品がありません',
    'home.loadMore': 'もっと見る',

    // イベント
    'event.status.upcoming': '未開始',
    'event.status.ongoing': '開催中',
    'event.status.ended': '終了',
    'event.nature.official': '公式',
    'event.nature.fanmade': '二次創作',
    'event.details': '詳細',
    'event.visit': '訪問',
    'event.noLink': 'リンクなし',

    // フィルター
    'filter.title': 'フィルター',
    'filter.clear': 'クリア',
    'filter.nature': 'イベント性質',
    'filter.status': 'イベント状態',
    'filter.all': 'すべて',

    // 検索
    'search.placeholder': 'イベント名、主催者を検索...',
    'search.button': '検索',
    'search.results': '{count}個のイベントが見つかりました',
    'search.noResults': 'イベントが見つかりませんでした',

    // ページネーション
    'pagination.page': 'ページ {current} / {total}',
    'pagination.first': '最初',
    'pagination.prev': '前へ',
    'pagination.next': '次へ',
    'pagination.last': '最後',

    // ユーザー
    'user.logout': 'ログアウト',
    'user.settings': '設定',

    // フッター
    'footer.about': '私たちについて',
    'footer.contact': 'お問い合わせ',
    'footer.privacy': 'プライバシー',
    'footer.copyright': '© 2025 シャーレ図書館',
    'footer.disclaimer': 'NexonやYostarとは関係ありません',
  },
}

/**
 * 翻译函数
 */
export function t(key: string, locale: Locale = getCurrentLocale(), params?: Record<string, string | number>): string {
  const localeTranslations = translations[locale] as Record<string, string>
  const defaultTranslations = translations[defaultLocale] as Record<string, string>
  let text = localeTranslations?.[key] || defaultTranslations?.[key] || key

  // 替换参数
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(`{${k}}`, String(v))
    })
  }

  return text
}
