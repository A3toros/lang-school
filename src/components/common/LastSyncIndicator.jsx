import { useEffect, useState } from 'react'

export default function LastSyncIndicator({ resource }) {
  const [last, setLast] = useState(null)

  useEffect(() => {
    const handler = (e) => {
      if (!resource || e.detail.resource === resource) {
        setLast(new Date())
      }
    }
    window.addEventListener('cache:update', handler)
    return () => window.removeEventListener('cache:update', handler)
  }, [resource])

  if (!last) return null
  const mins = Math.max(0, Math.round((Date.now() - last.getTime()) / 60000))

  return (
    <span className="text-xs text-gray-500">Last synced {mins === 0 ? 'just now' : `${mins} min${mins>1?'s':''} ago`}</span>
  )
}


