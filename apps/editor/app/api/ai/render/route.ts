import { anthropic } from '@ai-sdk/anthropic'
import { streamText } from 'ai'

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error:
          'ANTHROPIC_API_KEY not configured. Add it to your .env.local file to enable AI features.',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const { imageBase64, mode, prompt, sceneContext } = await req.json()

  const systemPrompts: Record<string, string> = {
    describe: `You are an expert architectural photographer and designer. Analyze this 3D building render and provide a detailed, evocative architectural description. Describe the structure, materials, spatial relationships, lighting conditions, and overall design character. Write as if describing a real building for an architectural publication.`,

    suggest: `You are a senior architect reviewing a building design. Analyze this 3D render and provide specific, actionable improvement suggestions. Consider: layout efficiency, natural light, material choices, structural integrity, aesthetic coherence, and modern design principles. Be constructive and specific.`,

    review: `You are a professional architectural critic. Provide a thorough review of this building design shown in the 3D render. Evaluate: proportions, material palette, fenestration, spatial flow, structural expression, and overall design quality. Rate aspects on a 1-5 scale and provide an overall assessment.`,

    style: `You are an interior designer and architect. Based on the user's style request and this 3D render, describe in vivid detail how the building would look if redesigned in that style. Include specific material recommendations, color palettes, furniture suggestions, and lighting changes. Be detailed enough that the description could guide the redesign.`,
  }

  const systemPrompt =
    systemPrompts[mode] ||
    systemPrompts.describe

  const userContent: Array<{ type: string; text?: string; image?: { url: string } }> = []

  if (imageBase64) {
    userContent.push({
      type: 'image',
      image: { url: imageBase64 },
    })
  }

  let userText = ''
  if (mode === 'style' && prompt) {
    userText = `Style request: ${prompt}\n\n`
  }
  if (sceneContext) {
    userText += `Scene information:\n${sceneContext}\n\n`
  }
  userText += mode === 'style'
    ? 'Describe how this building would look in the requested style.'
    : mode === 'suggest'
      ? 'What improvements would you suggest for this design?'
      : mode === 'review'
        ? 'Please provide a professional architectural review of this design.'
        : 'Describe this architectural design in detail.'

  userContent.push({ type: 'text', text: userText })

  const result = streamText({
    model: anthropic('claude-sonnet-4-20250514'),
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: userContent as any,
      },
    ],
  })

  return result.toDataStreamResponse()
}
