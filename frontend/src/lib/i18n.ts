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
    'nav.works': '推荐作品',
    'nav.researchArchives': '考据档案',
    'nav.resources': '资源整理',
    'nav.events': '活动',
    'nav.announcements': '公告',
    'nav.login': '登录',
    'nav.search': '搜索',
    'nav.searchPlaceholder': '搜索活动、资源...',

    // 首页
    'home.title': '欢迎来到夏莱图书馆',
    'home.latestEvents': '正在进行 / 即将开始',
    'home.latestWorks': '最新推荐作品',
    'home.featuredWorks': '精选推荐作品',
    'home.noEvents': '暂无活动',
    'home.noWorks': '暂无推荐作品',
    'home.friendLinks': '友情链接',
    'home.loadMore': '加载更多',
    'home.researchArchives': '最新考据档案',
    'home.noResearch': '暂无考据内容',
    'home.viewAll': '查看全部',
    'research.theme.noEntries': '该主题下暂无条目',

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

    // 考据档案
    'research.title': '考据档案',
    'research.description': '蔚蓝档案原型考据、主题分析与文学性研究',
    'research.filter.title': '筛选条目',
    'research.filter.mediaType': '媒介类型',
    'research.filter.affiliation': '世界观归属',
    'research.filter.theme': '主题',
    'research.filter.mode.and': '精确匹配',
    'research.filter.mode.or': '宽松匹配',
    'research.filter.mode.hint.and': '各筛选轴同时满足',
    'research.filter.mode.hint.or': '满足任一筛选轴即可',
    'research.filter.clear': '清除筛选',
    'research.filter.count': '找到 {count} 篇',
    'research.filter.empty': '暂无符合条件的条目',
    'research.stance.official': '官方依据',
    'research.stance.personal': '个人推论',
    'research.stance.speculative': '推测性',
    'research.sidebar.featured': '主编精选',
    'research.sidebar.recommendedPath': '推荐游走路径',
    'research.sidebar.recent': '最近更新',
    'research.sidebar.empty': '暂无策展内容',
    'research.entry.back': '返回考据档案',
    'research.entry.citations': '引证来源',
    'research.entry.relatedLinks': '延伸阅读',
    'research.entry.noContent': '暂无正文',
    'research.citation.confidence.official': '官方',
    'research.citation.confidence.derived': '推导',
    'research.citation.confidence.conjecture': '推测',
    'research.citation.source.game_line': '游戏台词',
    'research.citation.source.interview': '官方访谈',
    'research.citation.source.visual': '视觉证据',
    'research.citation.source.external': '外部来源',
  },

  'en': {
    // Navigation
    'nav.works': 'Works',
    'nav.researchArchives': 'Research Archives',
    'nav.resources': 'Resources',
    'nav.events': 'Events',
    'nav.announcements': 'Announcements',
    'nav.login': 'Login',
    'nav.search': 'Search',
    'nav.searchPlaceholder': 'Search events, resources...',

    // Home
    'home.title': 'Welcome to Schale Library',
    'home.latestEvents': 'Ongoing / Upcoming',
    'home.latestWorks': 'Latest Recommended Works',
    'home.featuredWorks': 'Featured Works',
    'home.noEvents': 'No events',
    'home.noWorks': 'No recommended works yet',
    'home.friendLinks': 'Friend Links',
    'home.loadMore': 'Load More',
    'home.researchArchives': 'Latest Research',
    'home.noResearch': 'No research entries yet',
    'home.viewAll': 'View all',
    'research.theme.noEntries': 'No entries in this theme',

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

    // Research Archives
    'research.title': 'Research Archives',
    'research.description': 'Blue Archive prototype research, thematic analysis, and literary studies',
    'research.filter.title': 'Filter entries',
    'research.filter.mediaType': 'Media type',
    'research.filter.affiliation': 'Affiliation',
    'research.filter.theme': 'Theme',
    'research.filter.mode.and': 'Precise match',
    'research.filter.mode.or': 'Loose match',
    'research.filter.mode.hint.and': 'All selected axes must match',
    'research.filter.mode.hint.or': 'Any selected axis can match',
    'research.filter.clear': 'Clear filters',
    'research.filter.count': '{count} found',
    'research.filter.empty': 'No entries match the current filters',
    'research.stance.official': 'Official basis',
    'research.stance.personal': 'Personal analysis',
    'research.stance.speculative': 'Speculative',
    'research.sidebar.featured': 'Editor\'s pick',
    'research.sidebar.recommendedPath': 'Recommended path',
    'research.sidebar.recent': 'Recent updates',
    'research.sidebar.empty': 'No curated content yet',
    'research.entry.back': 'Back to Research Archives',
    'research.entry.citations': 'Citations',
    'research.entry.relatedLinks': 'Further reading',
    'research.entry.noContent': 'No content yet',
    'research.citation.confidence.official': 'Official',
    'research.citation.confidence.derived': 'Derived',
    'research.citation.confidence.conjecture': 'Conjecture',
    'research.citation.source.game_line': 'Game line',
    'research.citation.source.interview': 'Interview',
    'research.citation.source.visual': 'Visual evidence',
    'research.citation.source.external': 'External source',
  },

  'ja': {
    // ナビゲーション
    'nav.works': '作品',
    'nav.researchArchives': '考察アーカイブ',
    'nav.resources': 'リソース',
    'nav.events': 'イベント',
    'nav.announcements': 'お知らせ',
    'nav.login': 'ログイン',
    'nav.search': '検索',
    'nav.searchPlaceholder': 'イベントやリソースを検索...',

    // ホーム
    'home.title': 'シャーレ図書館へようこそ',
    'home.latestEvents': '開催中 / 近日開催',
    'home.latestWorks': '最新おすすめ作品',
    'home.featuredWorks': 'おすすめ作品',
    'home.noEvents': 'イベントはありません',
    'home.noWorks': 'おすすめ作品がありません',
    'home.friendLinks': '相互リンク',
    'home.loadMore': 'もっと見る',
    'home.researchArchives': '最新考察記事',
    'home.noResearch': '考察記事はまだありません',
    'home.viewAll': 'すべて見る',
    'research.theme.noEntries': 'このテーマの記事はありません',

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

    // 考察アーカイブ
    'research.title': '考察アーカイブ',
    'research.description': 'ブルーアーカイブの原型考察・テーマ分析・文学的研究',
    'research.filter.title': '絞り込み',
    'research.filter.mediaType': 'メディアタイプ',
    'research.filter.affiliation': '所属',
    'research.filter.theme': 'テーマ',
    'research.filter.mode.and': '厳密マッチ',
    'research.filter.mode.or': '緩いマッチ',
    'research.filter.mode.hint.and': 'すべての軸を満たす',
    'research.filter.mode.hint.or': 'いずれかの軸を満たす',
    'research.filter.clear': 'フィルターをクリア',
    'research.filter.count': '{count}件',
    'research.filter.empty': '条件に合う記事がありません',
    'research.stance.official': '公式根拠',
    'research.stance.personal': '個人考察',
    'research.stance.speculative': '推測的',
    'research.sidebar.featured': '編集部おすすめ',
    'research.sidebar.recommendedPath': 'おすすめ読み順',
    'research.sidebar.recent': '最近の更新',
    'research.sidebar.empty': 'キュレーションコンテンツなし',
    'research.entry.back': '考察アーカイブに戻る',
    'research.entry.citations': '引用元',
    'research.entry.relatedLinks': '関連記事',
    'research.entry.noContent': '本文なし',
    'research.citation.confidence.official': '公式',
    'research.citation.confidence.derived': '推導',
    'research.citation.confidence.conjecture': '推測',
    'research.citation.source.game_line': 'ゲーム台詞',
    'research.citation.source.interview': '公式インタビュー',
    'research.citation.source.visual': 'ビジュアル証拠',
    'research.citation.source.external': '外部ソース',
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
