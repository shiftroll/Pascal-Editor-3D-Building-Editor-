'use client'

import { create } from 'zustand'

export type AIAnalysisMode = 'describe' | 'suggest' | 'review' | 'style'

export interface AIMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  toolCalls?: Array<{
    name: string
    args: Record<string, unknown>
    result?: string
  }>
  timestamp: number
}

export interface AIRenderEntry {
  id: string
  imageDataUrl: string
  mode: AIAnalysisMode
  prompt: string
  response: string
  timestamp: number
}

interface AIState {
  // Chat state
  messages: AIMessage[]
  isLoading: boolean
  error: string | null

  // Render history
  renderHistory: AIRenderEntry[]
  activeRender: AIRenderEntry | null

  // Actions
  addMessage: (message: AIMessage) => void
  setMessages: (messages: AIMessage[]) => void
  clearMessages: () => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void

  // Render actions
  addRenderEntry: (entry: AIRenderEntry) => void
  setActiveRender: (entry: AIRenderEntry | null) => void
  clearRenderHistory: () => void
}

const useAI = create<AIState>((set) => ({
  messages: [],
  isLoading: false,
  error: null,
  renderHistory: [],
  activeRender: null,

  addMessage: (message) =>
    set((s) => ({ messages: [...s.messages, message] })),

  setMessages: (messages) => set({ messages }),

  clearMessages: () => set({ messages: [] }),

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),

  addRenderEntry: (entry) =>
    set((s) => ({
      renderHistory: [entry, ...s.renderHistory].slice(0, 20),
      activeRender: entry,
    })),

  setActiveRender: (entry) => set({ activeRender: entry }),

  clearRenderHistory: () => set({ renderHistory: [], activeRender: null }),
}))

export default useAI
