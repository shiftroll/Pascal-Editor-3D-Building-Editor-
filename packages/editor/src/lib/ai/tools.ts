import { useScene } from '@pascal-app/core'
import { useViewer } from '@pascal-app/viewer'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { serializeSceneContext } from './scene-context'

/** Wrapper to call serializeSceneContext from tool executors */
function serializeSceneForTools(): string {
  return serializeSceneContext()
}

/**
 * AI-callable tool definitions for scene manipulation.
 * Each tool maps to existing useScene store actions.
 * These are used server-side by the Vercel AI SDK's tool system.
 */

const materialSchema = z
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

/**
 * Zod schemas for AI tool parameters (used both for validation and
 * to auto-generate the JSON-Schema that the LLM sees).
 */
export const toolSchemas = {
  create_building: z.object({
    position: z
      .tuple([z.number(), z.number(), z.number()])
      .describe('World position [x, y, z] in meters')
      .default([0, 0, 0]),
    rotation: z
      .tuple([z.number(), z.number(), z.number()])
      .describe('Rotation [x, y, z] in radians')
      .default([0, 0, 0]),
    levelCount: z
      .number()
      .int()
      .min(1)
      .max(10)
      .describe('Number of levels/floors to create')
      .default(1),
    levelHeight: z
      .number()
      .min(2)
      .max(6)
      .describe('Height of each level in meters')
      .default(2.7),
  }),

  create_wall: z.object({
    levelId: z.string().describe('ID of the level to add the wall to'),
    start: z
      .tuple([z.number(), z.number()])
      .describe('Start point [x, z] on the floor plane in meters'),
    end: z
      .tuple([z.number(), z.number()])
      .describe('End point [x, z] on the floor plane in meters'),
    height: z.number().min(0.5).max(10).default(2.7).describe('Wall height in meters'),
    thickness: z.number().min(0.05).max(1).default(0.15).describe('Wall thickness in meters'),
    material: materialSchema,
  }),

  create_room: z.object({
    levelId: z.string().describe('ID of the level to create the room in'),
    origin: z
      .tuple([z.number(), z.number()])
      .describe('Bottom-left corner [x, z] of the room in meters'),
    width: z.number().min(1).max(50).describe('Room width (X axis) in meters'),
    depth: z.number().min(1).max(50).describe('Room depth (Z axis) in meters'),
    height: z.number().min(0.5).max(10).default(2.7).describe('Wall height in meters'),
    thickness: z.number().min(0.05).max(1).default(0.15).describe('Wall thickness in meters'),
    material: materialSchema,
    addSlab: z.boolean().default(true).describe('Whether to add a floor slab'),
    addCeiling: z.boolean().default(false).describe('Whether to add a ceiling'),
    label: z.string().optional().describe('Name/label for a zone in this room'),
  }),

  add_door: z.object({
    wallId: z.string().describe('ID of the wall to place the door on'),
    position: z
      .tuple([z.number(), z.number(), z.number()])
      .describe('Position [x, y, z] on the wall')
      .default([0, 0, 0]),
    width: z.number().min(0.5).max(3).default(0.9).describe('Door width in meters'),
    height: z.number().min(1).max(3.5).default(2.1).describe('Door height in meters'),
  }),

  add_window: z.object({
    wallId: z.string().describe('ID of the wall to place the window on'),
    position: z
      .tuple([z.number(), z.number(), z.number()])
      .describe('Position [x, y, z] on the wall')
      .default([0, 0, 0]),
    width: z.number().min(0.3).max(5).default(1.5).describe('Window width in meters'),
    height: z.number().min(0.3).max(3).default(1.5).describe('Window height in meters'),
  }),

  set_material: z.object({
    nodeId: z.string().describe('ID of the node to update material on'),
    material: z
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
      .describe('Material configuration'),
  }),

  modify_node: z.object({
    nodeId: z.string().describe('ID of the node to modify'),
    updates: z
      .record(z.string(), z.unknown())
      .describe('Partial node properties to update (must match the node schema)'),
  }),

  delete_node: z.object({
    nodeId: z.string().describe('ID of the node to delete'),
  }),

  get_scene_info: z.object({}).describe('Get information about the current scene'),

  select_node: z.object({
    nodeId: z.string().describe('ID of the node to select and focus on'),
  }),
} as const

/**
 * Client-side tool executors — these run in the browser and call useScene/useViewer actions.
 * They return a string result that gets fed back to the AI as the tool's output.
 */
export const toolExecutors: Record<string, (args: any) => string> = {
  create_building: (args: z.infer<typeof toolSchemas.create_building>) => {
    const scene = useScene.getState()
    const buildingId = `building_${nanoid(12)}`

    // Find or create a site
    const rootIds = scene.rootNodeIds
    let siteId = rootIds.find((id: string) => scene.nodes[id]?.type === 'site')
    if (!siteId) {
      siteId = `site_${nanoid(12)}`
      scene.createNode({
        object: 'node',
        id: siteId,
        type: 'site',
        parentId: null,
        visible: true,
        metadata: {},
        children: [],
      } as any)
    }

    // Create the building
    scene.createNode(
      {
        object: 'node',
        id: buildingId,
        type: 'building',
        parentId: siteId,
        visible: true,
        metadata: {},
        position: args.position,
        rotation: args.rotation,
        children: [],
      } as any,
      siteId,
    )

    // Create levels
    const levelIds: string[] = []
    for (let i = 0; i < args.levelCount; i++) {
      const levelId = `level_${nanoid(12)}`
      scene.createNode(
        {
          object: 'node',
          id: levelId,
          type: 'level',
          parentId: buildingId,
          visible: true,
          metadata: {},
          level: i,
          height: args.levelHeight,
          children: [],
        } as any,
        buildingId,
      )
      levelIds.push(levelId)
    }

    return `Created building "${buildingId}" with ${args.levelCount} level(s): ${levelIds.join(', ')}`
  },

  create_wall: (args: z.infer<typeof toolSchemas.create_wall>) => {
    const scene = useScene.getState()
    const wallId = `wall_${nanoid(12)}`

    scene.createNode(
      {
        object: 'node',
        id: wallId,
        type: 'wall',
        parentId: args.levelId,
        visible: true,
        metadata: {},
        start: args.start,
        end: args.end,
        height: args.height,
        thickness: args.thickness,
        material: args.material,
        children: [],
      } as any,
      args.levelId,
    )

    return `Created wall "${wallId}" from [${args.start}] to [${args.end}]`
  },

  create_room: (args: z.infer<typeof toolSchemas.create_room>) => {
    const scene = useScene.getState()
    const [ox, oz] = args.origin
    const w = args.width
    const d = args.depth

    // Create 4 walls forming a rectangle
    const corners: [number, number][] = [
      [ox, oz],
      [ox + w, oz],
      [ox + w, oz + d],
      [ox, oz + d],
    ]

    const wallIds: string[] = []
    for (let i = 0; i < 4; i++) {
      const wallId = `wall_${nanoid(12)}`
      const start = corners[i]
      const end = corners[(i + 1) % 4]
      scene.createNode(
        {
          object: 'node',
          id: wallId,
          type: 'wall',
          parentId: args.levelId,
          visible: true,
          metadata: {},
          start,
          end,
          height: args.height,
          thickness: args.thickness,
          material: args.material,
          children: [],
        } as any,
        args.levelId,
      )
      wallIds.push(wallId)
    }

    const result: string[] = [`Created room with 4 walls: ${wallIds.join(', ')}`]

    // Add floor slab
    if (args.addSlab) {
      const slabId = `slab_${nanoid(12)}`
      scene.createNode(
        {
          object: 'node',
          id: slabId,
          type: 'slab',
          parentId: args.levelId,
          visible: true,
          metadata: {},
          polygon: corners,
          holes: [],
          elevation: 0.05,
          material: args.material,
        } as any,
        args.levelId,
      )
      result.push(`Floor slab: ${slabId}`)
    }

    // Add ceiling
    if (args.addCeiling) {
      const ceilingId = `ceiling_${nanoid(12)}`
      scene.createNode(
        {
          object: 'node',
          id: ceilingId,
          type: 'ceiling',
          parentId: args.levelId,
          visible: true,
          metadata: {},
          polygon: corners,
          holes: [],
          height: args.height,
          material: args.material,
          children: [],
        } as any,
        args.levelId,
      )
      result.push(`Ceiling: ${ceilingId}`)
    }

    // Add zone label
    if (args.label) {
      const zoneId = `zone_${nanoid(12)}`
      scene.createNode(
        {
          object: 'node',
          id: zoneId,
          type: 'zone',
          parentId: args.levelId,
          visible: true,
          metadata: {},
          name: args.label,
          polygon: corners,
          color: '#3b82f6',
        } as any,
        args.levelId,
      )
      result.push(`Zone "${args.label}": ${zoneId}`)
    }

    return result.join('\n')
  },

  add_door: (args: z.infer<typeof toolSchemas.add_door>) => {
    const scene = useScene.getState()
    const doorId = `door_${nanoid(12)}`

    // Find the wall's parent level to set as parent
    const wall = scene.nodes[args.wallId]
    if (!wall) return `Error: Wall "${args.wallId}" not found`

    scene.createNode(
      {
        object: 'node',
        id: doorId,
        type: 'door',
        parentId: wall.parentId,
        visible: true,
        metadata: {},
        wallId: args.wallId,
        position: args.position,
        rotation: [0, 0, 0],
        width: args.width,
        height: args.height,
        frameThickness: 0.05,
        frameDepth: 0.07,
        threshold: true,
        thresholdHeight: 0.02,
        hingesSide: 'left',
        swingDirection: 'inward',
        handle: true,
        handleHeight: 1.05,
        handleSide: 'right',
        contentPadding: [0.04, 0.04],
        doorCloser: false,
        panicBar: false,
        panicBarHeight: 1.0,
        segments: [{ type: 'panel', heightRatio: 1, columnRatios: [1], dividerThickness: 0.03, panelDepth: 0.01, panelInset: 0.04 }],
      } as any,
      wall.parentId!,
    )

    return `Created door "${doorId}" on wall "${args.wallId}"`
  },

  add_window: (args: z.infer<typeof toolSchemas.add_window>) => {
    const scene = useScene.getState()
    const windowId = `window_${nanoid(12)}`

    const wall = scene.nodes[args.wallId]
    if (!wall) return `Error: Wall "${args.wallId}" not found`

    scene.createNode(
      {
        object: 'node',
        id: windowId,
        type: 'window',
        parentId: wall.parentId,
        visible: true,
        metadata: {},
        wallId: args.wallId,
        position: args.position,
        rotation: [0, 0, 0],
        width: args.width,
        height: args.height,
        frameThickness: 0.05,
        frameDepth: 0.07,
        columnRatios: [1],
        rowRatios: [1],
        columnDividerThickness: 0.03,
        rowDividerThickness: 0.03,
        sill: true,
        sillDepth: 0.08,
        sillThickness: 0.03,
      } as any,
      wall.parentId!,
    )

    return `Created window "${windowId}" on wall "${args.wallId}"`
  },

  set_material: (args: z.infer<typeof toolSchemas.set_material>) => {
    const scene = useScene.getState()
    const node = scene.nodes[args.nodeId]
    if (!node) return `Error: Node "${args.nodeId}" not found`

    scene.updateNode(args.nodeId, { material: args.material } as any)
    return `Updated material on "${args.nodeId}" to ${JSON.stringify(args.material)}`
  },

  modify_node: (args: z.infer<typeof toolSchemas.modify_node>) => {
    const scene = useScene.getState()
    const node = scene.nodes[args.nodeId]
    if (!node) return `Error: Node "${args.nodeId}" not found`

    scene.updateNode(args.nodeId, args.updates as any)
    return `Updated node "${args.nodeId}" with: ${JSON.stringify(args.updates)}`
  },

  delete_node: (args: z.infer<typeof toolSchemas.delete_node>) => {
    const scene = useScene.getState()
    const node = scene.nodes[args.nodeId]
    if (!node) return `Error: Node "${args.nodeId}" not found`

    scene.deleteNode(args.nodeId)
    return `Deleted node "${args.nodeId}" (type: ${node.type})`
  },

  get_scene_info: () => {
    return serializeSceneForTools()
  },

  select_node: (args: z.infer<typeof toolSchemas.select_node>) => {
    const scene = useScene.getState()
    const node = scene.nodes[args.nodeId]
    if (!node) return `Error: Node "${args.nodeId}" not found`

    const viewer = useViewer.getState()

    // Navigate to the right selection context based on node type
    switch (node.type) {
      case 'building':
        viewer.setSelection({ buildingId: args.nodeId })
        break
      case 'level':
        viewer.setSelection({ levelId: args.nodeId })
        break
      default:
        // For other node types, find the parent level/building
        if (node.parentId) {
          const parent = scene.nodes[node.parentId]
          if (parent?.type === 'level') {
            viewer.setSelection({ levelId: node.parentId })
          }
        }
        break
    }

    return `Selected node "${args.nodeId}" (type: ${node.type})`
  },
}
