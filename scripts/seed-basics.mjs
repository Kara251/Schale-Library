const STRAPI_URL = (process.env.SEED_STRAPI_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8083').replace(/\/+$/, '')
const token = process.env.SEED_API_TOKEN

const students = [
  { name: 'Shiroko', school: 'abydos', organization: 'Foreclosure Task Force' },
  { name: 'Hoshino', school: 'abydos', organization: 'Foreclosure Task Force' },
  { name: 'Aris', school: 'millennium', organization: 'Game Development Department' },
  { name: 'Mika', school: 'trinity', organization: 'Tea Party' },
  { name: 'Hina', school: 'gehenna', organization: 'Prefect Team' },
]

async function request(path, options = {}) {
  const response = await fetch(`${STRAPI_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (!response.ok) {
    throw new Error(`${options.method || 'GET'} ${path} failed: ${response.status} ${await response.text()}`)
  }

  return response.json()
}

async function ensureStudent(student) {
  const query = new URLSearchParams({
    'filters[name][$eq]': student.name,
    'pagination[pageSize]': '1',
  })
  const existing = await request(`/api/students?${query.toString()}`)
  if (existing.data?.length) {
    console.log(`[seed] exists: ${student.name}`)
    return
  }

  await request('/api/students', {
    method: 'POST',
    body: JSON.stringify({ data: { ...student, publishedAt: new Date().toISOString() } }),
  })
  console.log(`[seed] created: ${student.name}`)
}

for (const student of students) {
  await ensureStudent(student)
}
