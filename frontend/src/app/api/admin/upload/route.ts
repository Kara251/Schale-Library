import { NextResponse } from 'next/server'

import { uploadAdminMedia } from '@/lib/server/admin-content'
import { getAdminSession } from '@/lib/server/admin-auth'
import { createForbiddenOriginResponse, verifyTrustedOrigin } from '@/lib/server/request-security'

type UploadPolicy = {
  maxMb: number
  label: string
}

const DEFAULT_UPLOAD_POLICY: UploadPolicy = {
  maxMb: Math.max(1, Number(process.env.ADMIN_PANEL_MAX_UPLOAD_MB || '8')),
  label: '常规图片',
}

const COVER_UPLOAD_POLICY: UploadPolicy = {
  maxMb: Math.max(DEFAULT_UPLOAD_POLICY.maxMb, Number(process.env.ADMIN_PANEL_COVER_MAX_UPLOAD_MB || '12')),
  label: '封面图',
}

const AVATAR_UPLOAD_POLICY: UploadPolicy = {
  maxMb: Math.max(1, Number(process.env.ADMIN_PANEL_AVATAR_MAX_UPLOAD_MB || '4')),
  label: '头像图',
}

const GIF_UPLOAD_POLICY: UploadPolicy = {
  maxMb: Math.max(COVER_UPLOAD_POLICY.maxMb, Number(process.env.ADMIN_PANEL_GIF_MAX_UPLOAD_MB || '20')),
  label: 'GIF 动图',
}

const SVG_UPLOAD_POLICY: UploadPolicy = {
  maxMb: Math.max(1, Number(process.env.ADMIN_PANEL_SVG_MAX_UPLOAD_MB || '2')),
  label: 'SVG 图像',
}

function getUploadPolicy(file: File, fieldName: string | null): UploadPolicy {
  if (file.type === 'image/svg+xml') {
    return SVG_UPLOAD_POLICY
  }

  if (file.type === 'image/gif') {
    return GIF_UPLOAD_POLICY
  }

  if (fieldName === 'avatar') {
    return AVATAR_UPLOAD_POLICY
  }

  if (fieldName === 'coverImage') {
    return COVER_UPLOAD_POLICY
  }

  return DEFAULT_UPLOAD_POLICY
}

export async function POST(request: Request) {
  const originError = verifyTrustedOrigin(request)
  if (originError) {
    return createForbiddenOriginResponse(originError)
  }

  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('files')
    const fieldName = formData.get('fieldName')
    const collection = formData.get('collection')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: '未提供有效文件' }, { status: 400 })
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: '仅允许上传图片文件' }, { status: 400 })
    }

    const policy = getUploadPolicy(file, typeof fieldName === 'string' ? fieldName : null)
    const maxUploadBytes = policy.maxMb * 1024 * 1024

    if (file.size > maxUploadBytes) {
      return NextResponse.json(
        { error: `${policy.label}上传不得超过 ${policy.maxMb} MB` },
        { status: 400 }
      )
    }

    const data = await uploadAdminMedia(
      session,
      file,
      typeof fieldName === 'string' ? fieldName : undefined,
      typeof collection === 'string' ? collection : undefined
    )
    return NextResponse.json({ data }, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '上传失败' },
      { status: 500 }
    )
  }
}
