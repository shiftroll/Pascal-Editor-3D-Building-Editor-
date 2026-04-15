import { anthropic } from '@ai-sdk/anthropic'
import { streamText } from 'ai'
import { z } from 'zod'

const materialZod = z
  .object({
    preset: z
      .enum([
        'white',
        'brick',
        'concrete',
        'wood',
        'glass',
        'metal',
        'plaster',
        'tile',
        'marble',
        'custom',
      ])
      .optional(),
    properties: z
      .object({
        color: z.string().optional(),
        roughness: z.number().min(0).max(1).optional(),
        metalness: z.number().min(0).max(1).optional(),
        opacity: z.number().min(0).max(1).optional(),
        transparent: z.boolean().optional(),
      })
      .optional(),
  })
  .optional()

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

  const { messages, sceneContext, nodeTypeReference } = await req.json()

  const systemPrompt = `You are an AI architect assistant integrated into Pascal Editor, a 3D building design tool.
You help users design buildings by creating and modifying 3D structures using the available tools.

IMPORTANT RULES:
- Always use the tools to make changes. Never just describe what you would do — actually do it.
- Use get_scene_info first if you need to understand the current state of the scene.
- When creating a building, start with create_building, then use create_room for rooms.
- Room coordinates are in meters on the floor plane (X, Z axes). Y is up.
- To create multiple rooms, offset their origins so they share walls or are adjacent.
- After making changes, briefly describe what you created.
- Keep the design practical and architecturally sound.
- Default wall height is 2.7m, thickness 0.15m.

${nodeTypeReference ? `\n${nodeTypeReference}` : ''}
${sceneContext ? `\nCurrent scene state:\n${sceneContext}` : ''}`

  const result = streamText({
    model: anthropic('claude-sonnet-4-20250514'),
    system: systemPrompt,
    messages,
    maxSteps: 10,
    tools: {
      create_building: {
        description:
          'Create a new building with one or more levels. Returns the building ID and level IDs.',
        parameters: z.object({
          position: z
            .tuple([z.number(), z.number(), z.number()])
            .default([0, 0, 0])
            .describe('World position [x, y, z] in meters'),
          rotation: z
            .tuple([z.number(), z.number(), z.number()])
            .default([0, 0, 0])
            .describe('Rotation [x, y, z] in radians'),
          levelCount: z
            .number()
            .int()
            .min(1)
            .max(10)
            .default(1)
            .describe('Number of floors to create'),
          levelHeight: z
            .number()
            .min(2)
            .max(6)
            .default(2.7)
            .describe('Height of each level in meters'),
        }),
      },
      create_wall: {
        description: 'Create a wall segment on a specific level.',
        parameters: z.object({
          levelId: z.string().describe('ID of the level'),
          start: z.tuple([z.number(), z.number()]).describe('Start point [x, z] in meters'),
          end: z.tuple([z.number(), z.number()]).describe('End point [x, z] in meters'),
          height: z.number().min(0.5).max(10).default(2.7),
          thickness: z.number().min(0.05).max(1).default(0.15),
          material: materialZod,
        }),
      },
      create_room: {
        description:
          'Create a rectangular room (4 walls) with optional floor slab, ceiling, and zone label.',
        parameters: z.object({
          levelId: z.string().describe('ID of the level'),
          origin: z
            .tuple([z.number(), z.number()])
            .describe('Bottom-left corner [x, z] in meters'),
          width: z.number().min(1).max(50).describe('Room width (X axis) in meters'),
          depth: z.number().min(1).max(50).describe('Room depth (Z axis) in meters'),
          height: z.number().min(0.5).max(10).default(2.7),
          thickness: z.number().min(0.05).max(1).default(0.15),
          material: materialZod,
          addSlab: z.boolean().default(true).describe('Add a floor slab'),
          addCeiling: z.boolean().default(false).describe('Add a ceiling'),
          label: z.string().optional().describe('Room name/label'),
        }),
      },
      add_door: {
        description: 'Add a door opening to an existing wall.',
        parameters: z.object({
          wallId: z.string().describe('ID of the wall'),
          position: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0]),
          width: z.number().min(0.5).max(3).default(0.9),
          height: z.number().min(1).max(3.5).default(2.1),
        }),
      },
      add_window: {
        description: 'Add a window opening to an existing wall.',
        parameters: z.object({
          wallId: z.string().describe('ID of the wall'),
          position: z.tuple([z.number(), z.number(), z.number()]).default([0, 0, 0]),
          width: z.number().min(0.3).max(5).default(1.5),
          height: z.number().min(0.3).max(3).default(1.5),
        }),
      },
      set_material: {
        description:
          'Set material on a node. Available presets: white, brick, concrete, wood, glass, metal, plaster, tile, marble.',
        parameters: z.object({
          nodeId: z.string(),
          material: z.object({
            preset: z
              .enum([
                'white',
                'brick',
                'concrete',
                'wood',
                'glass',
                'metal',
                'plaster',
                'tile',
                'marble',
                'custom',
              ])
              .optional(),
            properties: z
              .object({
                color: z.string().optional(),
                roughness: z.number().min(0).max(1).optional(),
                metalness: z.number().min(0).max(1).optional(),
              })
              .optional(),
          }),
        }),
      },
      modify_node: {
        description: 'Update properties of an existing node.',
        parameters: z.object({
          nodeId: z.string(),
          updates: z.record(z.string(), z.unknown()).describe('Partial update object'),
        }),
      },
      delete_node: {
        description: 'Delete a node and all its children from the scene.',
        parameters: z.object({
          nodeId: z.string(),
        }),
      },
      get_scene_info: {
        description:
          'Get a description of the current scene including all buildings, levels, walls, and objects.',
        parameters: z.object({}),
      },
      select_node: {
        description: 'Select and focus the camera on a specific node.',
        parameters: z.object({
          nodeId: z.string(),
        }),
      },
    },
  })

  return result.toDataStreamResponse()
}
