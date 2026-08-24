/**
 * 后端错误码 → 维护者看得懂的一句话。
 *
 * 后端返回的是 invalid_request、unknown_field:students 这类机器码。
 * 此前面板把它原样弹给维护者，等于没有提示。
 */
import type { Locale } from '@/lib/i18n'

type Messages = Record<string, string>

const MESSAGES: Record<Locale, Messages> = {
  'zh-Hans': {
    unauthorized: '登录状态已失效，请重新登录。',
    forbidden: '当前账号没有执行这个操作的权限。',
    not_found: '找不到这条记录，可能已被其他维护者删除。',
    invalid_request: '提交的内容格式不对，请检查后重试。',
    missing_required_field: '有必填项没有填写。',
    duplicate_slug: '网址标识已被占用，请换一个。',
    unknown_collection: '这个内容类型不存在。',
    read_only_collection: '这个内容类型只读，不能在这里修改。',
    collection_does_not_support_draft: '这个内容类型没有草稿状态。',
    create_failed: '新建失败，请稍后重试。',
    update_failed: '保存失败，请稍后重试。',
    insert_failed: '写入失败，请稍后重试。',
    rate_limited: '操作太频繁，请稍等一会儿再试。',
    invalid_credentials: '用户名或密码不正确。',
    no_access: '这个账号没有后台访问权限。',
    invalid_username: '用户名格式不正确。',
    invalid_email: '邮箱格式不正确。',
    invalid_role: '角色取值不正确。',
    username_or_email_taken: '用户名或邮箱已被占用。',
    email_taken: '邮箱已被占用。',
    password_too_short: '密码至少需要 12 位。',
    password_unchanged: '新密码不能与当前密码相同。',
    cannot_block_self: '不能封禁自己的账号。',
    cannot_demote_self: '不能降低自己的角色。',
    cannot_delete_self: '不能删除自己的账号。',
    last_admin: '这是最后一个管理员，不能封禁、降级或删除。',
    no_file: '没有选择文件。',
    file_too_large: '文件太大，请压缩后再上传。',
    unsupported_media_type: '只支持 JPG、PNG、WebP、GIF 图片。',
    invalid_multipart: '上传数据不完整，请重新选择文件。',
    ids_required: '请先选择要操作的条目。',
    ids_invalid: '选中的条目有误。',
    unsupported_bulk_action: '不支持这个批量操作。',
    action_only_for_students: '这个操作只能用于学生。',
    path_not_found: '找不到这条阅读路径。',
    entry_not_in_path: '这条考据不在该阅读路径中。',
  },
  en: {
    unauthorized: 'Your session has expired. Please sign in again.',
    forbidden: 'This account is not allowed to perform that action.',
    not_found: 'That record no longer exists.',
    invalid_request: 'The submitted data is not valid. Please check and retry.',
    missing_required_field: 'A required field is empty.',
    duplicate_slug: 'That web address is already taken. Please choose another.',
    unknown_collection: 'That content type does not exist.',
    read_only_collection: 'That content type is read-only here.',
    collection_does_not_support_draft: 'That content type has no draft state.',
    create_failed: 'Could not create. Please try again.',
    update_failed: 'Could not save. Please try again.',
    insert_failed: 'Could not write. Please try again.',
    rate_limited: 'Too many attempts. Please wait a moment.',
    invalid_credentials: 'Incorrect username or password.',
    no_access: 'This account has no panel access.',
    invalid_username: 'That username format is not valid.',
    invalid_email: 'That email format is not valid.',
    invalid_role: 'That role is not valid.',
    username_or_email_taken: 'That username or email is already taken.',
    email_taken: 'That email is already taken.',
    password_too_short: 'The password must be at least 12 characters.',
    password_unchanged: 'The new password must differ from the current one.',
    cannot_block_self: 'You cannot block your own account.',
    cannot_demote_self: 'You cannot lower your own role.',
    cannot_delete_self: 'You cannot delete your own account.',
    last_admin: 'This is the last administrator and cannot be blocked, demoted, or deleted.',
    no_file: 'No file selected.',
    file_too_large: 'The file is too large. Please compress it first.',
    unsupported_media_type: 'Only JPG, PNG, WebP, and GIF images are supported.',
    invalid_multipart: 'The upload was incomplete. Please pick the file again.',
    ids_required: 'Select the items to act on first.',
    ids_invalid: 'The selected items are not valid.',
    unsupported_bulk_action: 'That bulk action is not supported.',
    action_only_for_students: 'That action applies to students only.',
    path_not_found: 'That reading path does not exist.',
    entry_not_in_path: 'That entry is not part of the reading path.',
  },
  ja: {
    unauthorized: 'ログインの有効期限が切れました。もう一度サインインしてください。',
    forbidden: 'このアカウントにはその操作の権限がありません。',
    not_found: 'その項目は見つかりません。すでに削除された可能性があります。',
    invalid_request: '送信内容の形式が正しくありません。確認して再試行してください。',
    missing_required_field: '必須項目が未入力です。',
    duplicate_slug: 'そのウェブアドレスはすでに使われています。別の文字列にしてください。',
    unknown_collection: 'そのコンテンツ種別は存在しません。',
    read_only_collection: 'このコンテンツ種別はここでは読み取り専用です。',
    collection_does_not_support_draft: 'このコンテンツ種別に下書き状態はありません。',
    create_failed: '作成できませんでした。しばらくしてから再試行してください。',
    update_failed: '保存できませんでした。しばらくしてから再試行してください。',
    insert_failed: '書き込みできませんでした。しばらくしてから再試行してください。',
    rate_limited: '操作が多すぎます。少し待ってから再試行してください。',
    invalid_credentials: 'ユーザー名またはパスワードが正しくありません。',
    no_access: 'このアカウントには管理パネルへのアクセス権がありません。',
    invalid_username: 'ユーザー名の形式が正しくありません。',
    invalid_email: 'メールアドレスの形式が正しくありません。',
    invalid_role: 'ロールの値が正しくありません。',
    username_or_email_taken: 'そのユーザー名またはメールアドレスはすでに使われています。',
    email_taken: 'そのメールアドレスはすでに使われています。',
    password_too_short: 'パスワードは 12 文字以上にしてください。',
    password_unchanged: '新しいパスワードは現在のものと異なる必要があります。',
    cannot_block_self: '自分のアカウントはブロックできません。',
    cannot_demote_self: '自分のロールは下げられません。',
    cannot_delete_self: '自分のアカウントは削除できません。',
    last_admin: '最後の管理者のため、ブロック・降格・削除はできません。',
    no_file: 'ファイルが選択されていません。',
    file_too_large: 'ファイルが大きすぎます。圧縮してからアップロードしてください。',
    unsupported_media_type: 'JPG・PNG・WebP・GIF の画像のみ対応しています。',
    invalid_multipart: 'アップロードデータが不完全です。ファイルを選び直してください。',
    ids_required: '操作する項目を先に選択してください。',
    ids_invalid: '選択された項目が正しくありません。',
    unsupported_bulk_action: 'その一括操作には対応していません。',
    action_only_for_students: 'この操作は生徒にのみ使えます。',
    path_not_found: 'その読み順は見つかりません。',
    entry_not_in_path: 'その記事はこの読み順に含まれていません。',
  },
}

const UNKNOWN_FIELD: Record<Locale, (field: string) => string> = {
  'zh-Hans': (field) => `「${field}」这一项后台不接受，请联系管理员。`,
  en: (field) => `The field “${field}” is not accepted here. Please contact an administrator.`,
  ja: (field) => `項目「${field}」は受け付けられません。管理者に連絡してください。`,
}

const FALLBACK: Record<Locale, string> = {
  'zh-Hans': '操作失败，请稍后重试。',
  en: 'The action failed. Please try again.',
  ja: '操作に失敗しました。しばらくしてから再試行してください。',
}

/**
 * @param code   后端返回的 error 字段
 * @param locale 界面语言
 * @param fieldLabels 字段名 → 界面标签，用于把 unknown_field:students 说成「关联学生」
 */
export function adminErrorMessage(
  code: string | undefined,
  locale: Locale,
  fieldLabels?: Record<string, string>
): string {
  const table = MESSAGES[locale] || MESSAGES['zh-Hans']
  const fallback = FALLBACK[locale] || FALLBACK['zh-Hans']

  if (!code) return fallback

  if (code.startsWith('unknown_field:')) {
    const field = code.slice('unknown_field:'.length)
    const label = fieldLabels?.[field] || field
    return (UNKNOWN_FIELD[locale] || UNKNOWN_FIELD['zh-Hans'])(label)
  }

  // Object.hasOwn：错误码来自网络，不能让 __proto__ 之类的键命中原型链
  return Object.hasOwn(table, code) ? table[code]! : fallback
}
