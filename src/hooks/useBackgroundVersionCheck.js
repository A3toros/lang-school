import { useEffect, useRef } from 'react'
import api from '../utils/api'

// Simple background version polling with focus/online triggers
export default function useBackgroundVersionCheck(resources = [], intervalMs = 90000, onChange) {
  const timerRef = useRef(null)
  const lastVersionsRef = useRef(null)

  async function checkOnce(trigger) {
    try {
      const result = await api.getVersions()
      const versions = result?.versions || {}
      const changed = []
      if (lastVersionsRef.current) {
        for (const r of resources) {
          if (!r) continue
          const prev = lastVersionsRef.current[r]?.version
          const cur = versions[r]?.version
          if (prev && cur && prev !== cur) {
            changed.push(r)
          }
        }
      }
      lastVersionsRef.current = versions
      if (changed.length > 0 && typeof onChange === 'function') {
        onChange(changed, trigger)
        // Also broadcast for interested components
        for (const r of changed) {
          window.dispatchEvent(new CustomEvent('cache:update', { detail: { resource: r, trigger } }))
        }
      }
    } catch (e) {
      // ignore
    }
  }

  useEffect(() => {
    checkOnce('mount')
    timerRef.current = setInterval(() => checkOnce('interval'), intervalMs)
    const onFocus = () => checkOnce('focus')
    const onOnline = () => checkOnce('online')
    window.addEventListener('focus', onFocus)
    window.addEventListener('online', onOnline)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') checkOnce('visible')
    })
    return () => {
      clearInterval(timerRef.current)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('online', onOnline)
    }
  }, [intervalMs])
}


