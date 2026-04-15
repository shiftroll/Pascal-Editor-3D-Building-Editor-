'use client'

import { serializeSceneContext, getNodeTypeReference } from './scene-context'
import { toolExecutors } from './tools'

/**
 * Sends a chat message to the AI backend and handles the streaming response.
 * Tool calls in the response are executed client-side via toolExecutors.
 *
 * This is used by the AI chat panel's useChat hook as the onToolCall handler.
 */
export async function executeToolCall({
  toolName,
  args,
}: {
  toolName: string
  args: Record<string, unknown>
}): Promise<string> {
  const executor = toolExecutors[toolName]
  if (!executor) {
    return `Unknown tool: ${toolName}`
  }

  try {
    return executor(args)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return `Tool execution error: ${message}`
  }
}

/**
 * Build the request body for the AI chat API route,
 * injecting current scene context and node type reference.
 */
export function buildChatRequestBody(messages: Array<{ role: string; content: string }>) {
  return {
    messages,
    sceneContext: serializeSceneContext(),
    nodeTypeReference: getNodeTypeReference(),
  }
}
