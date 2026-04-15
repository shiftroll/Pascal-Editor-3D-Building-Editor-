'use client'

import { ArrowUp, Square } from 'lucide-react'
import { type KeyboardEvent, useRef, useState } from 'react'
import { cn } from './../../../../../lib/utils'

interface AIInputProps {
  onSubmit: (message: string) => void
  onStop?: () => void
  isLoading: boolean
  placeholder?: string
}

export function AIInput({
  onSubmit,
  onStop,
  isLoading,
  placeholder = 'Describe what to build...',
}: AIInputProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = () => {
    const trimmed = value.trim()
    if (!trimmed || isLoading) return
    onSubmit(trimmed)
    setValue('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleInput = () => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
    }
  }

  return (
    <div className="flex items-end gap-2 border-border/50 border-t p-3">
      <textarea
        ref={textareaRef}
        className={cn(
          'flex-1 resize-none rounded-lg border border-border/50 bg-accent/30 px-3 py-2 text-sm',
          'placeholder:text-muted-foreground/60',
          'focus:border-primary/50 focus:outline-none',
          'min-h-[36px] max-h-[120px]',
        )}
        disabled={isLoading}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        rows={1}
        value={value}
      />
      {isLoading ? (
        <button
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-destructive/80 text-destructive-foreground transition-colors hover:bg-destructive"
          onClick={onStop}
          type="button"
        >
          <Square className="h-3.5 w-3.5" />
        </button>
      ) : (
        <button
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors',
            value.trim()
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'bg-accent text-muted-foreground',
          )}
          disabled={!value.trim()}
          onClick={handleSubmit}
          type="button"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
