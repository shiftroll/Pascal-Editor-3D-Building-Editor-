'use client'

import { emitter } from '@pascal-app/core'
import { Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'

export function AIStatusIndicator() {
  const [activeAction, setActiveAction] = useState<string | null>(null)

  useEffect(() => {
    const onStart = (e: { toolName: string }) => {
      setActiveAction(e.toolName.replace(/_/g, ' '))
    }
    const onComplete = () => {
      setActiveAction(null)
    }
    const onError = () => {
      setActiveAction(null)
    }

    emitter.on('ai:action-start', onStart)
    emitter.on('ai:action-complete', onComplete)
    emitter.on('ai:error', onError)

    return () => {
      emitter.off('ai:action-start', onStart)
      emitter.off('ai:action-complete', onComplete)
      emitter.off('ai:error', onError)
    }
  }, [])

  if (!activeAction) return null

  return (
    <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-primary text-xs backdrop-blur-md">
      <Sparkles className="h-3.5 w-3.5 animate-pulse" />
      <span className="capitalize">{activeAction}...</span>
    </div>
  )
}
