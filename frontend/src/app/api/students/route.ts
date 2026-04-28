import { NextRequest, NextResponse } from 'next/server'

import { getStudents, type SchoolType } from '@/lib/api'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const locale = searchParams.get('locale') || 'zh-Hans'
  const page = Math.max(1, Number(searchParams.get('page') || '1'))
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') || '50')))
  const school = searchParams.get('school') as SchoolType | 'all' | null

  try {
    const response = await getStudents(locale, {
      query: searchParams.get('q') || undefined,
      school: school || undefined,
      page,
      pageSize,
    })

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, max-age=30, stale-while-revalidate=120',
      },
    })
  } catch (error) {
    console.error('Failed to load students:', error)
    return NextResponse.json({ data: [], meta: { pagination: { page, pageSize, pageCount: 1, total: 0 } } }, { status: 502 })
  }
}
