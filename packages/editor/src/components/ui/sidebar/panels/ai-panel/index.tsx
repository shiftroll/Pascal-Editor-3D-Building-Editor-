'use client'

import { useChat } from 'ai/react'
import { Bot, Sparkles, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useRef } from 'react'
import { executeToolCall } from '../../../../../lib/ai/agent'
import { serializeSceneContext, getNodeTypeReference } from '../../../../../lib/ai/scene-context'
import { AIInput } from './ai-input'
import { AIMessage } from './ai-message'

export function AIPanel() {
  const scrollRef = useRef<HTMLDivElement>(null)

  const { messages, input, isLoading, error, append, setMessages, stop, setInput } = useChat({
    api: '/api/ai/chat',
    maxSteps: 10,
    body: {
      sceneContext: '',
      nodeTypeReference: '',
    },
    async onToolCall({ toolCall }: any) {
      const result = await executeToolCall({
        toolName: toolCall.toolName,
        args: toolCall.args as Record<string, unknown>,
      })
      return result
    },
  })

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    const el = scrollRef.current
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  }, [messages])

  const handleSubmit = useCallback(
    (text: string) => {
      // Inject current scene context with each message
      const sceneContext = serializeSceneContext()
      const nodeTypeReference = getNodeTypeReference()

      append(
        { role: 'user', content: text },
        {
          body: { sceneContext, nodeTypeReference },
        },
      )
    },
    [append],
  )

  const handleClear = useCallback(() => {
    setMessages([])
  }, [setMessages])

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-border/50 border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">AI Assistant</span>
        </div>
        <button
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          onClick={handleClear}
          title="Clear conversation"
          type="button"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-4 py-12 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
              <Bot className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="font-medium text-sm">AI Building Assistant</p>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Describe what you want to build and I'll create it for you.
              </p>
            </div>
            <div className="mt-2 space-y-1.5">
              {[
                'Create a 2-story house with 4 rooms',
                'Add windows to all exterior walls',
                'Change all walls to brick material',
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  className="block w-full rounded-lg border border-border/50 px-3 py-1.5 text-left text-muted-foreground text-xs transition-colors hover:bg-accent hover:text-foreground"
                  onClick={() => handleSubmit(suggestion)}
                  type="button"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-1 py-2">
            {messages.map((message: any) => (
              <AIMessage
                key={message.id}
                content={message.content}
                role={message.role as 'user' | 'assistant'}
                toolInvocations={message.toolInvocations as any}
                isStreaming={isLoading && message.id === messages[messages.length - 1]?.id && message.role === 'assistant'}
              />
            ))}
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="mx-3 mb-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive text-xs">
            {error.message || 'An error occurred. Please try again.'}
          </div>
        )}
      </div>

      {/* Input */}
      <AIInput
        isLoading={isLoading}
        onSubmit={handleSubmit}
        onStop={stop}
      />
    </div>
  )
}
