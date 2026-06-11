'use client'

import { useCallback, useSyncExternalStore } from 'react'
import { SPOILER_SCOPE_ORDER, type ResearchSpoilerScope } from '@/lib/api'

const STORAGE_KEY = 'schale-spoiler-progress'
const CHANGE_EVENT = 'schale-spoiler-progress-change'

function readStoredProgress(): ResearchSpoilerScope {
  const value = window.localStorage.getItem(STORAGE_KEY)
  return value && value in SPOILER_SCOPE_ORDER ? value as ResearchSpoilerScope : 'none'
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange)
  window.addEventListener('storage', onChange)
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange)
    window.removeEventListener('storage', onChange)
  }
}

/**
 * 读者的剧情阅读进度（localStorage 持久化，跨组件实时同步）。
 * 进度为 none 时表示「不想看到任何剧透」。
 */
export function useSpoilerProgress(): [ResearchSpoilerScope, (next: ResearchSpoilerScope) => void] {
  const progress = useSyncExternalStore(subscribe, readStoredProgress, () => 'none' as ResearchSpoilerScope)

  const setProgress = useCallback((next: ResearchSpoilerScope) => {
    window.localStorage.setItem(STORAGE_KEY, next)
    window.dispatchEvent(new Event(CHANGE_EVENT))
  }, [])

  return [progress, setProgress]
}

/** 条目剧透范围是否超出读者进度 */
export function isSpoilerBlocked(
  scope: ResearchSpoilerScope | undefined,
  progress: ResearchSpoilerScope
): boolean {
  if (!scope || scope === 'none') {
    return false
  }
  return SPOILER_SCOPE_ORDER[scope] > SPOILER_SCOPE_ORDER[progress]
}
