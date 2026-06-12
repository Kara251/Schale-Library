import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { LocaleLink } from '@/components/locale-link'
import { ResearchGraph, type GraphEdge, type GraphNode } from '@/components/research-graph'
import { ArrowLeft } from 'lucide-react'
import { getResearchGraphEntries, type ResearchEntry } from '@/lib/api'
import { extractWikiLinkSlugs } from '@/lib/wiki-links'
import { translations, type Locale } from '@/lib/i18n'

interface GraphPageProps {
  params: Promise<{ locale: string }>
}

export const revalidate = 60

export async function generateMetadata({ params }: GraphPageProps) {
  const { locale } = await params
  const t = translations[locale as Locale] || translations['zh-Hans']
  return {
    title: `${t['research.graph.title'] as string} – Schale Library`,
    description: t['research.graph.description'] as string,
  }
}

function buildGraph(entries: ResearchEntry[]) {
  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []
  const nodeIds = new Set<string>()
  const edgeKeys = new Set<string>()
  const entryBySlug = new Map(entries.map((entry) => [entry.slug, entry]))

  const addNode = (node: GraphNode) => {
    if (!nodeIds.has(node.id)) {
      nodeIds.add(node.id)
      nodes.push(node)
    }
  }
  const addEdge = (source: string, target: string) => {
    if (!nodeIds.has(source) || !nodeIds.has(target) || source === target) return
    const key = source < target ? `${source}|${target}` : `${target}|${source}`
    if (edgeKeys.has(key)) return
    edgeKeys.add(key)
    edges.push({ source, target })
  }

  for (const entry of entries) {
    addNode({
      id: `entry:${entry.slug}`,
      label: entry.title,
      type: 'entry',
      href: `/research-archives/${entry.slug}`,
    })
  }

  for (const entry of entries) {
    const entryId = `entry:${entry.slug}`

    for (const theme of entry.themes || []) {
      const themeId = `theme:${theme.slug}`
      addNode({
        id: themeId,
        label: theme.name,
        type: 'theme',
        href: `/research-archives/themes/${theme.slug}`,
      })
      addEdge(entryId, themeId)
    }

    for (const subject of entry.subjects || []) {
      const subjectId = `subject:${subject.slug}`
      addNode({
        id: subjectId,
        label: subject.name,
        type: 'subject',
        href: `/research-archives/subjects/${subject.slug}`,
      })
      addEdge(entryId, subjectId)
    }

    for (const link of entry.related_links || []) {
      if (link.target_entry?.slug) {
        addEdge(entryId, `entry:${link.target_entry.slug}`)
      }
    }

    for (const wikiSlug of extractWikiLinkSlugs(entry.body)) {
      if (entryBySlug.has(wikiSlug)) {
        addEdge(entryId, `entry:${wikiSlug}`)
      }
    }
  }

  return { nodes, edges }
}

export default async function ResearchGraphPage({ params }: GraphPageProps) {
  const { locale } = await params
  const t = translations[locale as Locale] || translations['zh-Hans']

  const entriesRes = await getResearchGraphEntries(locale).catch(() => ({ data: [] as ResearchEntry[] }))
  const { nodes, edges } = buildGraph(entriesRes.data || [])

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="relative flex-1 container mx-auto px-4 pt-6 pb-12">
        <div className="content-panel">
          <LocaleLink
            href="/research-archives"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            {t['research.entry.back'] as string}
          </LocaleLink>

          <div className="mb-6">
            <h1 className="text-4xl font-bold mb-2">{t['research.graph.title'] as string}</h1>
            <p className="text-muted-foreground">{t['research.graph.description'] as string}</p>
          </div>

          <ResearchGraph nodes={nodes} edges={edges} locale={locale as Locale} />
        </div>
      </main>

      <Footer />
    </div>
  )
}
