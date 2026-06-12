'use client'

/* eslint-disable react-hooks/immutability -- Canvas 力导向模拟需要原地修改节点坐标，
   全部状态保存在 ref 中，与 React 渲染解耦。 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocalePath } from '@/components/locale-link'
import { translations, type Locale } from '@/lib/i18n'

export type GraphNodeType = 'entry' | 'theme' | 'subject'

export interface GraphNode {
  id: string
  label: string
  type: GraphNodeType
  href: string
  /** 连接数，用于决定节点大小 */
  degree?: number
}

export interface GraphEdge {
  source: string
  target: string
}

interface ResearchGraphProps {
  nodes: GraphNode[]
  edges: GraphEdge[]
  locale: Locale
}

interface SimNode extends GraphNode {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
}

const NODE_COLORS: Record<GraphNodeType, string> = {
  entry: '#4a9eda',
  theme: '#e8a33d',
  subject: '#6bbf8a',
}

/**
 * 轻量级力导向知识图谱（Canvas，自实现弹簧-斥力布局，无外部依赖）。
 * 支持拖拽节点、滚轮缩放、平移和点击跳转。
 */
export function ResearchGraph({ nodes, edges, locale }: ResearchGraphProps) {
  const t = translations[locale] || translations['zh-Hans']
  const router = useRouter()
  const toLocalePath = useLocalePath()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const simRef = useRef<{ nodes: SimNode[]; edges: GraphEdge[] }>({ nodes: [], edges: [] })
  const viewRef = useRef({ x: 0, y: 0, scale: 1 })
  const dragRef = useRef<{ node: SimNode | null; panning: boolean; lastX: number; lastY: number; moved: boolean }>({
    node: null, panning: false, lastX: 0, lastY: 0, moved: false,
  })
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const hoveredRef = useRef<string | null>(null)

  const updateHovered = useCallback((id: string | null) => {
    hoveredRef.current = id
    setHoveredNode(id)
  }, [])

  // 初始化模拟节点
  useEffect(() => {
    const degree = new Map<string, number>()
    for (const edge of edges) {
      degree.set(edge.source, (degree.get(edge.source) || 0) + 1)
      degree.set(edge.target, (degree.get(edge.target) || 0) + 1)
    }

    const count = nodes.length || 1
    simRef.current = {
      nodes: nodes.map((node, index) => {
        const angle = (index / count) * Math.PI * 2
        const spread = 120 + (index % 7) * 40
        return {
          ...node,
          degree: degree.get(node.id) || 0,
          x: Math.cos(angle) * spread,
          y: Math.sin(angle) * spread,
          vx: 0,
          vy: 0,
          radius: 6 + Math.min(10, (degree.get(node.id) || 0) * 1.5),
        }
      }),
      edges,
    }
    viewRef.current = { x: 0, y: 0, scale: 1 }
  }, [nodes, edges])

  const tick = useCallback(() => {
    const sim = simRef.current
    const nodeById = new Map(sim.nodes.map((node) => [node.id, node]))

    // 斥力（节点数有限，O(n²) 可接受）
    for (let i = 0; i < sim.nodes.length; i++) {
      const a = sim.nodes[i]
      for (let j = i + 1; j < sim.nodes.length; j++) {
        const b = sim.nodes[j]
        let dx = a.x - b.x
        let dy = a.y - b.y
        let distSq = dx * dx + dy * dy
        if (distSq < 1) {
          dx = (Math.random() - 0.5)
          dy = (Math.random() - 0.5)
          distSq = 1
        }
        const force = 1800 / distSq
        const dist = Math.sqrt(distSq)
        const fx = (dx / dist) * force
        const fy = (dy / dist) * force
        a.vx += fx
        a.vy += fy
        b.vx -= fx
        b.vy -= fy
      }
    }

    // 弹簧（边）
    for (const edge of sim.edges) {
      const source = nodeById.get(edge.source)
      const target = nodeById.get(edge.target)
      if (!source || !target) continue
      const dx = target.x - source.x
      const dy = target.y - source.y
      const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy))
      const force = (dist - 90) * 0.015
      const fx = (dx / dist) * force
      const fy = (dy / dist) * force
      source.vx += fx
      source.vy += fy
      target.vx -= fx
      target.vy -= fy
    }

    // 向心力 + 阻尼 + 位置更新
    for (const node of sim.nodes) {
      node.vx -= node.x * 0.003
      node.vy -= node.y * 0.003
      node.vx *= 0.85
      node.vy *= 0.85
      if (dragRef.current.node !== node) {
        node.x += node.vx
        node.y += node.vy
      }
    }
  }, [])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { width, height } = canvas
    const view = viewRef.current
    const sim = simRef.current
    const nodeById = new Map(sim.nodes.map((node) => [node.id, node]))
    const hovered = hoveredRef.current
    const neighborIds = new Set<string>()
    if (hovered) {
      neighborIds.add(hovered)
      for (const edge of sim.edges) {
        if (edge.source === hovered) neighborIds.add(edge.target)
        if (edge.target === hovered) neighborIds.add(edge.source)
      }
    }

    ctx.clearRect(0, 0, width, height)
    ctx.save()
    ctx.translate(width / 2 + view.x, height / 2 + view.y)
    ctx.scale(view.scale, view.scale)

    // 边
    for (const edge of sim.edges) {
      const source = nodeById.get(edge.source)
      const target = nodeById.get(edge.target)
      if (!source || !target) continue
      const active = hovered && (edge.source === hovered || edge.target === hovered)
      ctx.strokeStyle = active ? 'rgba(74,158,218,0.7)' : 'rgba(140,150,160,0.25)'
      ctx.lineWidth = active ? 1.6 : 1
      ctx.beginPath()
      ctx.moveTo(source.x, source.y)
      ctx.lineTo(target.x, target.y)
      ctx.stroke()
    }

    // 节点
    for (const node of sim.nodes) {
      const dimmed = hovered ? !neighborIds.has(node.id) : false
      ctx.globalAlpha = dimmed ? 0.25 : 1
      ctx.fillStyle = NODE_COLORS[node.type]
      ctx.beginPath()
      ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2)
      ctx.fill()
      if (node.id === hovered) {
        ctx.strokeStyle = 'rgba(74,158,218,0.9)'
        ctx.lineWidth = 2
        ctx.stroke()
      }

      // 标签：悬停邻域内或缩放足够大时显示
      if (!dimmed && (view.scale > 0.8 || neighborIds.has(node.id))) {
        ctx.font = `${node.id === hovered ? 'bold ' : ''}11px sans-serif`
        ctx.fillStyle = 'rgba(80,90,100,0.95)'
        ctx.textAlign = 'center'
        const label = node.label.length > 14 ? `${node.label.slice(0, 13)}…` : node.label
        ctx.fillText(label, node.x, node.y + node.radius + 13)
      }
    }
    ctx.globalAlpha = 1
    ctx.restore()
  }, [])

  // 动画循环
  useEffect(() => {
    let frame: number
    const loop = () => {
      tick()
      draw()
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [tick, draw])

  // 画布尺寸自适应
  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const resize = () => {
      const rect = container.getBoundingClientRect()
      canvas.width = rect.width
      canvas.height = Math.max(420, Math.min(640, rect.width * 0.6))
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  const toWorld = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const view = viewRef.current
    return {
      x: (clientX - rect.left - canvas.width / 2 - view.x) / view.scale,
      y: (clientY - rect.top - canvas.height / 2 - view.y) / view.scale,
    }
  }, [])

  const findNodeAt = useCallback((worldX: number, worldY: number) => {
    const sim = simRef.current
    for (let i = sim.nodes.length - 1; i >= 0; i--) {
      const node = sim.nodes[i]
      const dx = node.x - worldX
      const dy = node.y - worldY
      if (dx * dx + dy * dy <= (node.radius + 4) ** 2) {
        return node
      }
    }
    return null
  }, [])

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    const world = toWorld(event.clientX, event.clientY)
    const node = findNodeAt(world.x, world.y)
    dragRef.current = {
      node,
      panning: !node,
      lastX: event.clientX,
      lastY: event.clientY,
      moved: false,
    }
  }, [toWorld, findNodeAt])

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current
    const view = viewRef.current

    if (drag.node) {
      const world = toWorld(event.clientX, event.clientY)
      drag.node.x = world.x
      drag.node.y = world.y
      drag.node.vx = 0
      drag.node.vy = 0
      drag.moved = true
      return
    }

    if (drag.panning && event.buttons > 0) {
      view.x += event.clientX - drag.lastX
      view.y += event.clientY - drag.lastY
      drag.lastX = event.clientX
      drag.lastY = event.clientY
      drag.moved = true
      return
    }

    const world = toWorld(event.clientX, event.clientY)
    const node = findNodeAt(world.x, world.y)
    updateHovered(node?.id || null)
  }, [toWorld, findNodeAt, updateHovered])

  const handlePointerUp = useCallback(() => {
    const drag = dragRef.current
    if (drag.node && !drag.moved) {
      router.push(toLocalePath(drag.node.href))
    }
    dragRef.current = { node: null, panning: false, lastX: 0, lastY: 0, moved: false }
  }, [router, toLocalePath])

  const handleWheel = useCallback((event: React.WheelEvent<HTMLCanvasElement>) => {
    const view = viewRef.current
    const factor = event.deltaY < 0 ? 1.1 : 0.9
    view.scale = Math.min(3, Math.max(0.3, view.scale * factor))
  }, [])

  if (nodes.length === 0) {
    return (
      <p className="py-16 text-center text-muted-foreground">
        {t['research.graph.empty'] as string}
      </p>
    )
  }

  return (
    <div ref={containerRef} className="space-y-3">
      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: NODE_COLORS.entry }} />
          {t['research.graph.legend.entry'] as string}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: NODE_COLORS.theme }} />
          {t['research.graph.legend.theme'] as string}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: NODE_COLORS.subject }} />
          {t['research.graph.legend.subject'] as string}
        </span>
        <span className="ml-auto">{t['research.graph.hint'] as string}</span>
      </div>
      <canvas
        ref={canvasRef}
        className="w-full touch-none rounded-lg border bg-card"
        style={{ cursor: hoveredNode ? 'pointer' : 'grab' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
      />
    </div>
  )
}
