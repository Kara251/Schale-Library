import type { Locale } from '@/lib/i18n'

export interface AdminActionLabels {
  create: string
  edit: string
  delete: string
  deleting: string
  cancel: string
  actions: string
  createFailed: string
  deleteConfirm: string
  confirmDelete: string
  deleteSuccess: string
}

const adminActionLabels: Record<Locale, AdminActionLabels> = {
  'zh-Hans': {
    create: '新建',
    edit: '编辑',
    delete: '删除',
    deleting: '删除中...',
    cancel: '取消',
    actions: '操作',
    createFailed: '操作失败',
    deleteConfirm: '确定删除这条内容吗？此操作不可撤销。',
    confirmDelete: '确认删除',
    deleteSuccess: '已删除',
  },
  en: {
    create: 'New',
    edit: 'Edit',
    delete: 'Delete',
    deleting: 'Deleting...',
    cancel: 'Cancel',
    actions: 'Actions',
    createFailed: 'Operation failed',
    deleteConfirm: 'Delete this entry? This action cannot be undone.',
    confirmDelete: 'Confirm delete',
    deleteSuccess: 'Deleted',
  },
  ja: {
    create: '新規作成',
    edit: '編集',
    delete: '削除',
    deleting: '削除中...',
    cancel: 'キャンセル',
    actions: '操作',
    createFailed: '操作に失敗しました',
    deleteConfirm: 'この項目を削除しますか。この操作は元に戻せません。',
    confirmDelete: '削除を確定',
    deleteSuccess: '削除しました',
  },
}

export function getAdminActionLabels(locale: Locale): AdminActionLabels {
  return adminActionLabels[locale] || adminActionLabels['zh-Hans']
}
