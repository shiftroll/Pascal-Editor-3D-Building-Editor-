'use client'

import { Camera, ChevronDown, Eye } from 'lucide-react'
import { useState } from 'react'
import { AIPreviewPanel } from './ai-preview-panel'
import useEditor from '../store/use-editor'

export function PreviewButton() {
  const [showDropdown, setShowDropdown] = useState(false)
  const [showAIPreview, setShowAIPreview] = useState(false)

  return (
    <>
      <div className="relative">
        <div className="flex items-center rounded-lg border border-border bg-background/95 shadow-lg backdrop-blur-md">
          <button
            className="flex cursor-pointer items-center gap-2 px-3 py-2 font-medium text-sm transition-colors hover:bg-accent/90"
            onClick={() => useEditor.getState().setPreviewMode(true)}
          >
            <Eye className="h-4 w-4 shrink-0" />
            <span className="hidden whitespace-nowrap sm:inline">Preview</span>
          </button>
          <button
            className="flex h-full items-center border-border border-l px-1.5 py-2 text-muted-foreground transition-colors hover:bg-accent/90 hover:text-foreground"
            onClick={() => setShowDropdown((prev) => !prev)}
            type="button"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>

        {showDropdown && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowDropdown(false)}
            />
            <div className="absolute right-0 top-full z-50 mt-1 min-w-[160px] rounded-lg border border-border bg-background/95 py-1 shadow-lg backdrop-blur-md">
              <button
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors hover:bg-accent"
                onClick={() => {
                  setShowDropdown(false)
                  useEditor.getState().setPreviewMode(true)
                }}
                type="button"
              >
                <Eye className="h-3.5 w-3.5" />
                Preview
              </button>
              <button
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors hover:bg-accent"
                onClick={() => {
                  setShowDropdown(false)
                  setShowAIPreview(true)
                }}
                type="button"
              >
                <Camera className="h-3.5 w-3.5" />
                AI Render
              </button>
            </div>
          </>
        )}
      </div>

      {showAIPreview && (
        <AIPreviewPanel onClose={() => setShowAIPreview(false)} />
      )}
    </>
  )
}
