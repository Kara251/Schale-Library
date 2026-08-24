import { Badge } from '@/components/ui/badge'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { AdminPagination } from '@/components/admin/admin-pagination'
import { AdminTable } from '@/components/admin/admin-table'
import { AdminUserActions } from '@/components/admin/admin-user-actions'
import { AdminUserCreateForm } from '@/components/admin/admin-user-create-form'
import { requireAdminSession } from '@/lib/server/admin-auth'
import { listPanelUsers } from '@/lib/server/admin-content'
import type { Locale } from '@/lib/i18n'

interface UsersPageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ page?: string; search?: string; status?: string }>
}

const PAGE_SIZE = 20

const labels: Record<Locale, {
  title: string
  description: string
  forbidden: string
  forbiddenHint: string
  columnUser: string
  columnRole: string
  columnStatus: string
  columnCreated: string
  columnActions: string
  active: string
  blocked: string
  you: string
  empty: string
  previous: string
  next: string
  pagination: string
  totalSummary: string
  create: Parameters<typeof AdminUserCreateForm>[0]['labels']
  actions: Parameters<typeof AdminUserActions>[0]['labels']
}> = {
  'zh-Hans': {
    title: '用户管理',
    description: '管理维护者账号：新建、调整角色、封禁、重置密码、删除。',
    forbidden: '需要管理员权限',
    forbiddenHint: '只有 admin 角色可以管理用户。如需权限，请联系站点管理员。',
    columnUser: '用户',
    columnRole: '角色',
    columnStatus: '状态',
    columnCreated: '创建时间',
    columnActions: '操作',
    active: '正常',
    blocked: '已封禁',
    you: '当前登录',
    empty: '没有符合条件的用户。',
    previous: '上一页',
    next: '下一页',
    pagination: '第 {page} / {pageCount} 页',
    totalSummary: '共 {total} 条',
    create: {
      title: '新建用户',
      description: '新建的用户可立即用所设密码登录。',
      username: '用户名',
      usernameHint: '3–32 位，仅限字母、数字、下划线、点、连字符',
      email: '邮箱',
      emailHint: '可留空',
      password: '初始密码',
      passwordHint: '至少 12 位，请通过安全渠道转交对方',
      role: '角色',
      roleMaintainer: 'maintainer（内容维护）',
      roleAdmin: 'admin（含用户管理）',
      submit: '创建',
      submitting: '创建中…',
      created: '用户已创建',
      errorUsername: '用户名格式不符合要求',
      errorTooShort: '密码至少需要 12 位',
      errorTaken: '用户名或邮箱已被占用',
      errorEmail: '邮箱格式不正确',
      errorDefault: '创建失败，请稍后重试',
    },
    actions: {
      promote: '提为 admin',
      demote: '降为 maintainer',
      block: '封禁',
      unblock: '解封',
      resetPassword: '重置密码',
      delete: '删除',
      working: '处理中…',
      confirmDelete: '确定删除用户 {username}？该操作不可撤销。',
      promptPassword: '输入新密码（至少 12 位）。对方的全部登录会被登出。',
      done: '操作已完成',
      errorLastAdmin: '不能移除最后一个管理员',
      errorSelf: '不能对自己执行该操作',
      errorTooShort: '密码至少需要 12 位',
      errorDefault: '操作失败，请稍后重试',
    },
  },
  en: {
    title: 'Users',
    description: 'Manage maintainer accounts: create, change roles, block, reset passwords, delete.',
    forbidden: 'Administrator access required',
    forbiddenHint: 'Only the admin role can manage users. Contact a site administrator for access.',
    columnUser: 'User',
    columnRole: 'Role',
    columnStatus: 'Status',
    columnCreated: 'Created',
    columnActions: 'Actions',
    active: 'Active',
    blocked: 'Blocked',
    you: 'You',
    empty: 'No users matched the current filters.',
    previous: 'Previous',
    next: 'Next',
    pagination: 'Page {page} / {pageCount}',
    totalSummary: '{total} items',
    create: {
      title: 'New user',
      description: 'The new account can sign in immediately with the password you set.',
      username: 'Username',
      usernameHint: '3–32 characters: letters, digits, underscore, dot, hyphen',
      email: 'Email',
      emailHint: 'Optional',
      password: 'Initial password',
      passwordHint: 'At least 12 characters; hand it over through a secure channel',
      role: 'Role',
      roleMaintainer: 'maintainer (content)',
      roleAdmin: 'admin (includes user management)',
      submit: 'Create',
      submitting: 'Creating…',
      created: 'User created',
      errorUsername: 'Username format is not allowed',
      errorTooShort: 'Password must be at least 12 characters',
      errorTaken: 'Username or email already taken',
      errorEmail: 'Invalid email format',
      errorDefault: 'Could not create the user, please try again',
    },
    actions: {
      promote: 'Make admin',
      demote: 'Make maintainer',
      block: 'Block',
      unblock: 'Unblock',
      resetPassword: 'Reset password',
      delete: 'Delete',
      working: 'Working…',
      confirmDelete: 'Delete user {username}? This cannot be undone.',
      promptPassword: 'Enter a new password (at least 12 characters). All their sessions will be signed out.',
      done: 'Done',
      errorLastAdmin: 'Cannot remove the last administrator',
      errorSelf: 'You cannot perform this action on yourself',
      errorTooShort: 'Password must be at least 12 characters',
      errorDefault: 'Action failed, please try again',
    },
  },
  ja: {
    title: 'ユーザー管理',
    description: 'メンテナー アカウントの作成、ロール変更、ブロック、パスワード再設定、削除。',
    forbidden: '管理者権限が必要です',
    forbiddenHint: 'ユーザー管理は admin ロールのみ利用できます。権限が必要な場合は管理者にご連絡ください。',
    columnUser: 'ユーザー',
    columnRole: 'ロール',
    columnStatus: '状態',
    columnCreated: '作成日時',
    columnActions: '操作',
    active: '有効',
    blocked: 'ブロック中',
    you: 'ログイン中',
    empty: '条件に一致するユーザーはありません。',
    previous: '前へ',
    next: '次へ',
    pagination: '{page} / {pageCount} ページ',
    totalSummary: '全 {total} 件',
    create: {
      title: '新規ユーザー',
      description: '作成したアカウントは設定したパスワードで直ちにログインできます。',
      username: 'ユーザー名',
      usernameHint: '3〜32 文字：英数字、アンダースコア、ドット、ハイフン',
      email: 'メールアドレス',
      emailHint: '任意',
      password: '初期パスワード',
      passwordHint: '12 文字以上。安全な経路で本人にお渡しください',
      role: 'ロール',
      roleMaintainer: 'maintainer（コンテンツ）',
      roleAdmin: 'admin（ユーザー管理を含む）',
      submit: '作成',
      submitting: '作成中…',
      created: 'ユーザーを作成しました',
      errorUsername: 'ユーザー名の形式が正しくありません',
      errorTooShort: 'パスワードは 12 文字以上必要です',
      errorTaken: 'ユーザー名またはメールアドレスは既に使用されています',
      errorEmail: 'メールアドレスの形式が正しくありません',
      errorDefault: '作成に失敗しました。もう一度お試しください',
    },
    actions: {
      promote: 'admin にする',
      demote: 'maintainer にする',
      block: 'ブロック',
      unblock: 'ブロック解除',
      resetPassword: 'パスワード再設定',
      delete: '削除',
      working: '処理中…',
      confirmDelete: 'ユーザー {username} を削除しますか？この操作は取り消せません。',
      promptPassword: '新しいパスワードを入力してください（12 文字以上）。対象のログインはすべて解除されます。',
      done: '完了しました',
      errorLastAdmin: '最後の管理者は削除できません',
      errorSelf: '自分自身にこの操作は行えません',
      errorTooShort: 'パスワードは 12 文字以上必要です',
      errorDefault: '操作に失敗しました。もう一度お試しください',
    },
  },
}

export default async function UsersPage({ params, searchParams }: UsersPageProps) {
  const { locale } = await params
  const session = await requireAdminSession(locale, `/${locale}/manage/users`)
  const t = labels[locale as Locale] || labels['zh-Hans']

  // 权限判断只用于渲染分支；真正的拦截在 Worker 端（maintainer 一律 403）
  const isAdmin = (session.user.role?.type || '').toLowerCase() === 'admin'
  if (!isAdmin) {
    return (
      <>
        <AdminPageHeader title={t.forbidden} description={t.forbiddenHint} />
      </>
    )
  }

  const query = await searchParams
  const page = Math.max(1, Number(query.page || '1') || 1)
  const search = query.search?.trim() || ''
  const status = (query.status as 'all' | 'active' | 'blocked') || 'all'

  const response = await listPanelUsers(session, { page, pageSize: PAGE_SIZE, search, status })

  function buildHref(nextPage: number): string {
    const params = new URLSearchParams()
    params.set('page', String(nextPage))
    if (search) params.set('search', search)
    if (status !== 'all') params.set('status', status)
    return `/${locale}/manage/users?${params.toString()}`
  }

  return (
    <>
      <AdminPageHeader title={t.title} description={t.description} />

      <AdminUserCreateForm locale={locale as Locale} labels={t.create} />

      <AdminTable
        emptyText={t.empty}
        items={response.data}
        columns={[
          {
            key: 'user',
            header: t.columnUser,
            render: (item) => (
              <div>
                <p className="font-medium">
                  {item.username}
                  {item.id === session.user.id ? (
                    <Badge variant="secondary" className="ml-2">
                      {t.you}
                    </Badge>
                  ) : null}
                </p>
                <p className="text-xs text-muted-foreground">{item.email || '—'}</p>
              </div>
            ),
          },
          {
            key: 'role',
            header: t.columnRole,
            render: (item) => <Badge variant="outline">{item.role?.type}</Badge>,
          },
          {
            key: 'status',
            header: t.columnStatus,
            render: (item) => (
              <Badge variant={item.blocked ? 'destructive' : 'secondary'}>
                {item.blocked ? t.blocked : t.active}
              </Badge>
            ),
          },
          {
            key: 'created',
            header: t.columnCreated,
            render: (item) => (
              <span className="text-sm text-muted-foreground">
                {new Date(item.createdAt).toLocaleString(locale)}
              </span>
            ),
          },
          {
            key: 'actions',
            header: t.columnActions,
            render: (item) => (
              <AdminUserActions
                locale={locale as Locale}
                currentUserId={session.user.id}
                user={{
                  id: item.id,
                  username: item.username,
                  role: item.role?.type || 'maintainer',
                  blocked: item.blocked,
                }}
                labels={t.actions}
              />
            ),
          },
        ]}
      />

      <AdminPagination
        page={response.meta.pagination.page}
        pageCount={response.meta.pagination.pageCount}
        total={response.meta.pagination.total}
        buildHref={buildHref}
        labels={{ previous: t.previous, next: t.next, summary: t.pagination, totalSummary: t.totalSummary }}
      />
    </>
  )
}
