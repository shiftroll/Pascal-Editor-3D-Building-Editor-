import { useScene } from '@pascal-app/core'
import type { AnyNode } from '@pascal-app/core'

/**
 * Serializes the current scene graph into a compact text representation
 * suitable for inclusion in an LLM prompt. Structures nodes as a tree
 * and includes key properties (type, dimensions, materials, position).
 */
export function serializeSceneContext(): string {
  const { nodes, rootNodeIds } = useScene.getState()

  if (rootNodeIds.length === 0) {
    return 'The scene is empty. No buildings or structures have been created yet.'
  }

  const lines: string[] = ['Current scene:']

  function describeNode(nodeId: string, depth: number): void {
    const node = nodes[nodeId]
    if (!node) return

    const indent = '  '.repeat(depth)
    const parts: string[] = [`${indent}- ${node.type} (id: ${node.id})`]

    // Add type-specific details
    switch (node.type) {
      case 'building': {
        const b = node as AnyNode & { type: 'building'; position?: number[]; rotation?: number }
        if (b.position) parts.push(`pos: [${b.position.map((n: number) => n.toFixed(1)).join(', ')}]`)
        if (b.rotation) parts.push(`rot: ${b.rotation.toFixed(1)}`)
        break
      }
      case 'level': {
        const l = node as AnyNode & { type: 'level'; height?: number }
        if (l.height != null) parts.push(`height: ${l.height}`)
        break
      }
      case 'wall': {
        const w = node as AnyNode & {
          type: 'wall'
          points?: number[][]
          height?: number
          thickness?: number
          material?: { preset?: string }
        }
        if (w.points) parts.push(`points: ${w.points.length}`)
        if (w.height != null) parts.push(`h: ${w.height}`)
        if (w.thickness != null) parts.push(`thick: ${w.thickness}`)
        if (w.material?.preset) parts.push(`material: ${w.material.preset}`)
        break
      }
      case 'slab':
      case 'ceiling': {
        const s = node as AnyNode & { type: 'slab' | 'ceiling'; material?: { preset?: string } }
        if (s.material?.preset) parts.push(`material: ${s.material.preset}`)
        break
      }
      case 'door':
      case 'window': {
        const d = node as AnyNode & { type: 'door' | 'window'; width?: number; height?: number }
        if (d.width != null) parts.push(`w: ${d.width}`)
        if (d.height != null) parts.push(`h: ${d.height}`)
        break
      }
      case 'item': {
        const i = node as AnyNode & {
          type: 'item'
          assetUrl?: string
          position?: number[]
          scale?: number[]
        }
        if (i.assetUrl) parts.push(`asset: ${i.assetUrl.split('/').pop()}`)
        if (i.position) parts.push(`pos: [${i.position.map((n: number) => n.toFixed(1)).join(', ')}]`)
        break
      }
      case 'zone': {
        const z = node as AnyNode & { type: 'zone'; label?: string }
        if (z.label) parts.push(`label: "${z.label}"`)
        break
      }
      case 'roof': {
        parts.push('roof group')
        break
      }
      case 'roof-segment': {
        const rs = node as AnyNode & {
          type: 'roof-segment'
          roofType?: string
          width?: number
          depth?: number
        }
        if (rs.roofType) parts.push(`type: ${rs.roofType}`)
        if (rs.width != null) parts.push(`w: ${rs.width}`)
        if (rs.depth != null) parts.push(`d: ${rs.depth}`)
        break
      }
      case 'stair':
      case 'stair-segment': {
        parts.push(node.type)
        break
      }
    }

    lines.push(parts.join(' | '))

    // Recurse into children
    const children = (node as any).children as string[] | undefined
    if (children) {
      for (const childId of children) {
        describeNode(childId, depth + 1)
      }
    }
  }

  for (const rootId of rootNodeIds) {
    describeNode(rootId, 1)
  }

  const nodeCount = Object.keys(nodes).length
  lines.push(`\nTotal nodes: ${nodeCount}`)

  return lines.join('\n')
}

/**
 * Returns a summary of available node types and their key properties,
 * used as part of the system prompt to inform the AI about what it can create.
 */
export function getNodeTypeReference(): string {
  return `Available node types and hierarchy:
- site: Top-level container for buildings
  - building: A building structure (position: [x, y, z], rotation: degrees)
    - level: A floor/story (height: meters, typically 2.7-3.0)
      - wall: Wall segment (points: [[x1,z1],[x2,z2]], height: meters, thickness: meters, material)
        - window: Window opening (width, height, sillHeight)
        - door: Door opening (width, height)
      - slab: Floor slab (boundary: [[x,z],...] polygon points, material)
      - ceiling: Ceiling element (boundary: [[x,z],...] polygon points, material)
      - roof: Roof group containing roof-segments
        - roof-segment: Roof piece (roofType: "gable"|"hip", width, depth, roofHeight)
      - zone: Named area/room (boundary: [[x,z],...], label: string)
      - item: Furniture/fixture (assetUrl, position: [x,y,z], rotation, scale: [x,y,z])
      - stair: Stair group containing stair-segments

Materials can be set with presets: white, brick, concrete, wood, glass, metal, plaster, tile, marble
Or custom: { color: "#hex", roughness: 0-1, metalness: 0-1, opacity: 0-1 }

Coordinate system: X = right, Y = up, Z = forward. Units are in meters.
Wall points are 2D [x, z] coordinates on the floor plane.
To create a rectangular room, create 4 walls forming a closed loop.`
}
