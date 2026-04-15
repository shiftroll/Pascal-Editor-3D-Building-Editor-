'use client'

import { Bot, User, Wrench } from 'lucide-react'
import { cn } from './../../../../../lib/utils'

interface ToolCall {
  toolName: string
  args: Record<string, unknown>
  result?: { content: Array<{ text: string }> | string } | string
}

interface AIMessageProps {
  role: 'user' | 'assistant'
  content: string
  toolInvocations?: ToolCall[]
  isStreaming?: boolean
}

export function AIMessage({ role, content, toolInvocations, isStreaming }: AIMessageProps) {
  return (
    <div
      className={cn(
        'flex gap-2 px-3 py-2',
        role === 'user' ? 'flex-row-reverse' : 'flex-row',
      )}
    >
      <div
        className={cn(
          'flex h-6 w-6 shrink-0 items-center justify-center rounded-md',
          role === 'user' ? 'bg-primary/20' : 'bg-accent',
        )}
      >
        {role === 'user' ? (
          <User className="h-3.5 w-3.5" />
        ) : (
          <Bot className="h-3.5 w-3.5" />
        )}
      </div>
      <div
        className={cn(
          'flex max-w-[85%] flex-col gap-1',
          role === 'user' ? 'items-end' : 'items-start',
        )}
      >
        {/* Tool invocations */}
        {toolInvocations?.map((tool, i) => (
          <div
            key={i}
            className="flex items-center gap-1.5 rounded-md bg-accent/50 px-2 py-1 text-muted-foreground text-xs"
          >
            <Wrench className="h-3 w-3 shrink-0" />
            <span className="font-medium">{formatToolName(tool.toolName)}</span>
            {tool.result && (
              <span className="text-emerald-400">done</span>
            )}
          </div>
        ))}

        {/* Message content */}
        {content && (
          <div
            className={cn(
              'rounded-lg px-3 py-2 text-sm leading-relaxed',
              role === 'user'
                ? 'bg-primary text-primary-foreground'
                : 'bg-accent/80 text-foreground',
            )}
          >
            {content}
            {isStreaming && (
              <span className="ml-1 inline-block h-3 w-1 animate-pulse bg-foreground/60" />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function formatToolName(name: string): string {
  return name.replace(/_/g, ' ')
}
