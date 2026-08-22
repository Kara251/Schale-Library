import type { Locale } from '@/lib/i18n'

// 编辑表单三语文案字典（原 admin-editor-form.tsx 内的 labels）
export interface AdminEditorLabels {
  save: string
  saving: string
  cancel: string
  upload: string
  uploading: string
  uploadHint: string
  removeImage: string
  saveSuccess: string
  saveFailed: string
  requiredError: string
  emptySelection: string
  relationSearch: string
  addRow: string
  removeRow: string
  moveUp: string
  moveDown: string
  emptyRows: string
  emptyLocation: string
}

export const labels: Record<Locale, AdminEditorLabels> = {
  'zh-Hans': {
    save: '保存',
    saving: '保存中...',
    cancel: '返回列表',
    upload: '上传文件',
    uploading: '上传中...',
    uploadHint: '支持直接上传到受保护的维护接口。',
    removeImage: '移除当前图片',
    saveSuccess: '保存成功',
    saveFailed: '保存失败',
    requiredError: '请至少填写标题或名称',
    emptySelection: '暂无可选项',
    relationSearch: '搜索可选项',
    addRow: '添加一行',
    removeRow: '删除',
    moveUp: '上移',
    moveDown: '下移',
    emptyRows: '尚未添加内容',
    emptyLocation: '不填写',
  },
  en: {
    save: 'Save',
    saving: 'Saving...',
    cancel: 'Back to list',
    upload: 'Upload file',
    uploading: 'Uploading...',
    uploadHint: 'Files are sent through the protected maintainer endpoint.',
    removeImage: 'Remove current image',
    saveSuccess: 'Saved successfully',
    saveFailed: 'Save failed',
    requiredError: 'Please provide at least a title or name',
    emptySelection: 'No available options',
    relationSearch: 'Search options',
    addRow: 'Add row',
    removeRow: 'Remove',
    moveUp: 'Move up',
    moveDown: 'Move down',
    emptyRows: 'Nothing added yet',
    emptyLocation: 'Leave empty',
  },
  ja: {
    save: '保存',
    saving: '保存中...',
    cancel: '一覧へ戻る',
    upload: 'ファイルをアップロード',
    uploading: 'アップロード中...',
    uploadHint: '保護された管理用エンドポイント経由で送信されます。',
    removeImage: '現在の画像を削除',
    saveSuccess: '保存しました',
    saveFailed: '保存に失敗しました',
    requiredError: 'タイトルまたは名前を入力してください',
    emptySelection: '選択肢がありません',
    relationSearch: '選択肢を検索',
    addRow: '行を追加',
    removeRow: '削除',
    moveUp: '上へ',
    moveDown: '下へ',
    emptyRows: 'まだ何も追加されていません',
    emptyLocation: '空欄',
  },
}
