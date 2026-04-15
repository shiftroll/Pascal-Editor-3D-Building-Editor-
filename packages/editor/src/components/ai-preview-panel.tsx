'use client'

import { useCompletion } from 'ai/react'
import {
  Camera,
  ClipboardCopy,
  Download,
  Eye,
  Lightbulb,
  MessageSquare,
  Palette,
  Star,
  X,
} from 'lucide-react'
import { useCallback, useState } from 'react'
import { captureViewportAsDataUrl } from '../lib/ai/preview-capture'
import { serializeSceneContext } from '../lib/ai/scene-context'
import useAI, { type AIAnalysisMode } from '../store/use-ai'

const MODES: { id: AIAnalysisMode; label: string; icon: React.ReactNode; description: string }[] = [
  {
    id: 'describe',
    label: 'Describe',
    icon: <Eye className="h-3.5 w-3.5" />,
    description: 'Detailed architectural description',
  },
  {
    id: 'suggest',
    label: 'Suggest',
    icon: <Lightbulb className="h-3.5 w-3.5" />,
    description: 'Design improvement suggestions',
  },
  {
    id: 'review',
    label: 'Review',
    icon: <Star className="h-3.5 w-3.5" />,
    description: 'Professional architectural review',
  },
  {
    id: 'style',
    label: 'Style',
    icon: <Palette className="h-3.5 w-3.5" />,
    description: 'Style transfer description',
  },
]

interface AIPreviewPanelProps {
  onClose: () => void
}

export function AIPreviewPanel({ onClose }: AIPreviewPanelProps) {
  const [mode, setMode] = useState<AIAnalysisMode>('describe')
  const [customPrompt, setCustomPrompt] = useState('')
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)

  const { completion, isLoading, complete, error } = useCompletion({
    api: '/api/ai/render',
  })

  const handleCapture = useCallback(async () => {
    setIsCapturing(true)
    try {
      const dataUrl = await captureViewportAsDataUrl()
      setCapturedImage(dataUrl)
    } catch (err) {
      console.error('Failed to capture viewport:', err)
    } finally {
      setIsCapturing(false)
    }
  }, [])

  const handleAnalyze = useCallback(async () => {
    if (!capturedImage) return

    const sceneContext = serializeSceneContext()

    await complete('', {
      body: {
        imageBase64: capturedImage,
        mode,
        prompt: customPrompt,
        sceneContext,
      },
    })

    // Store in render history
    if (completion) {
      const { nanoid } = await import('nanoid')
      useAI.getState().addRenderEntry({
        id: nanoid(8),
        imageDataUrl: capturedImage,
        mode,
        prompt: customPrompt,
        response: completion,
        timestamp: Date.now(),
      })
    }
  }, [capturedImage, mode, customPrompt, complete, completion])

  const handleCopy = useCallback(() => {
    if (completion) {
      navigator.clipboard.writeText(completion)
    }
  }, [completion])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-8">
      <div className="flex h-full max-h-[800px] w-full max-w-[1000px] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-border border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <Camera className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">AI Preview Analysis</span>
          </div>
          <button
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Image preview */}
          <div className="flex w-1/2 flex-col border-border border-r">
            <div className="flex-1 overflow-hidden bg-neutral-900 p-4">
              {capturedImage ? (
                <img
                  src={capturedImage}
                  alt="Scene capture"
                  className="h-full w-full rounded-lg object-contain"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
                  <Camera className="h-8 w-8" />
                  <p className="text-sm">Capture your current viewport</p>
                </div>
              )}
            </div>
            <div className="border-border border-t p-3">
              <button
                className="w-full rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground text-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
                disabled={isCapturing}
                onClick={handleCapture}
                type="button"
              >
                {isCapturing ? 'Capturing...' : capturedImage ? 'Recapture' : 'Capture Viewport'}
              </button>
            </div>
          </div>

          {/* Right: Analysis */}
          <div className="flex w-1/2 flex-col">
            {/* Mode selector */}
            <div className="flex gap-1 border-border border-b p-3">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs transition-colors ${
                    mode === m.id
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  }`}
                  onClick={() => setMode(m.id)}
                  title={m.description}
                  type="button"
                >
                  {m.icon}
                  {m.label}
                </button>
              ))}
            </div>

            {/* Style prompt (shown only for 'style' mode) */}
            {mode === 'style' && (
              <div className="border-border border-b p-3">
                <input
                  className="w-full rounded-md border border-border bg-accent/30 px-3 py-1.5 text-sm placeholder:text-muted-foreground/60 focus:border-primary/50 focus:outline-none"
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="e.g., Modern minimalist, Scandinavian, Industrial..."
                  value={customPrompt}
                />
              </div>
            )}

            {/* Analysis result */}
            <div className="flex-1 overflow-y-auto p-4">
              {error ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-destructive text-sm">
                  {error.message || 'Analysis failed. Check your API key configuration.'}
                </div>
              ) : completion ? (
                <div className="whitespace-pre-wrap text-sm leading-relaxed">{completion}</div>
              ) : isLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Analyzing scene...
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                  <MessageSquare className="h-6 w-6" />
                  <p className="text-sm">
                    Capture the viewport, then click Analyze
                  </p>
                </div>
              )}
            </div>

            {/* Action bar */}
            <div className="flex items-center gap-2 border-border border-t p-3">
              <button
                className="flex-1 rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground text-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
                disabled={!capturedImage || isLoading}
                onClick={handleAnalyze}
                type="button"
              >
                {isLoading ? 'Analyzing...' : 'Analyze'}
              </button>
              {completion && (
                <button
                  className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  onClick={handleCopy}
                  title="Copy to clipboard"
                  type="button"
                >
                  <ClipboardCopy className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
