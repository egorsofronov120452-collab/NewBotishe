/**
 * A* Pathfinding Algorithm for Taxi Routes
 * Supports: road mask, one-way streets, radars, traffic lights
 */

export interface Point {
  x: number
  y: number
}

export interface OneWay {
  id: string
  segments: { x1: number; y1: number; x2: number; y2: number }[]
  direction: 'forward' | 'backward'
}

export interface Radar {
  id: string
  x: number
  y: number
  width: number
}

export interface TrafficLight {
  id: string
  x: number
  y: number
  width: number
  delay?: number
}

export interface PathfindingOptions {
  roadMaskData: Uint8ClampedArray | null
  maskWidth: number
  maskHeight: number
  oneWays: OneWay[]
  radars: Radar[]
  trafficLights: TrafficLight[]
}

// Heuristic for A* (Manhattan distance)
function heuristic(a: Point, b: Point): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
}

// Check if pixel is on road
function isRoad(x: number, y: number, data: Uint8ClampedArray | null, width: number, height: number): boolean {
  if (!data) return true // Allow anywhere if no mask
  if (x < 0 || y < 0 || x >= width || y >= height) return false
  const idx = (Math.floor(y) * width + Math.floor(x)) * 4 + 3 // Alpha channel
  return data[idx] > 60
}

// Check if movement is blocked by one-way restriction
function isBlockedByOneWay(from: Point, to: Point, oneWays: OneWay[]): boolean {
  const dx = to.x - from.x
  const dy = to.y - from.y
  
  for (const ow of oneWays) {
    for (const seg of ow.segments) {
      // Calculate segment midpoint and direction
      const midX = (seg.x1 + seg.x2) / 2
      const midY = (seg.y1 + seg.y2) / 2
      
      // Check if movement is near this segment
      const distToMid = Math.hypot(from.x - midX, from.y - midY)
      if (distToMid > 40) continue
      
      // Segment direction
      const segDx = seg.x2 - seg.x1
      const segDy = seg.y2 - seg.y1
      
      // Dot product to check if moving with or against segment
      const dot = dx * segDx + dy * segDy
      
      // If forward direction only allowed and we're moving backward
      if (ow.direction === 'forward' && dot < -0.5) {
        return true
      }
      // If backward direction only allowed and we're moving forward
      if (ow.direction === 'backward' && dot > 0.5) {
        return true
      }
    }
  }
  return false
}

// Get movement cost (higher near radars for penalty)
function getMovementCost(from: Point, to: Point, radars: Radar[], trafficLights: TrafficLight[]): number {
  const baseCost = Math.hypot(to.x - from.x, to.y - from.y)
  let multiplier = 1
  
  // Radar penalty (slightly slower routes avoid radars)
  for (const radar of radars) {
    const dist = Math.hypot(to.x - radar.x, to.y - radar.y)
    if (dist < radar.width * 2) {
      multiplier += 0.5 // 50% penalty near radars
    }
  }
  
  // Traffic light penalty
  for (const light of trafficLights) {
    const dist = Math.hypot(to.x - light.x, to.y - light.y)
    if (dist < light.width * 2) {
      multiplier += (light.delay || 30) / 60 // Penalty based on delay
    }
  }
  
  return baseCost * multiplier
}

// Snap point to nearest road
export function snapToRoad(p: Point, data: Uint8ClampedArray | null, width: number, height: number): Point {
  if (!data) return p
  if (isRoad(p.x, p.y, data, width, height)) return { x: Math.round(p.x), y: Math.round(p.y) }
  
  // Search in expanding squares
  for (let r = 1; r < 100; r++) {
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        if (Math.abs(dx) === r || Math.abs(dy) === r) {
          const nx = Math.round(p.x) + dx
          const ny = Math.round(p.y) + dy
          if (isRoad(nx, ny, data, width, height)) {
            return { x: nx, y: ny }
          }
        }
      }
    }
  }
  return { x: Math.round(p.x), y: Math.round(p.y) }
}

// Main A* pathfinding function
export function findPath(
  start: Point,
  end: Point,
  options: PathfindingOptions
): Point[] | null {
  const { roadMaskData, maskWidth, maskHeight, oneWays, radars, trafficLights } = options
  
  // Snap start and end to roads
  const startSnapped = snapToRoad(start, roadMaskData, maskWidth, maskHeight)
  const endSnapped = snapToRoad(end, roadMaskData, maskWidth, maskHeight)
  
  // Step size for performance (don't check every pixel)
  const STEP = 6
  const toKey = (p: Point) => `${Math.floor(p.x / STEP)},${Math.floor(p.y / STEP)}`
  
  // A* data structures
  const openSet = new Map<string, { point: Point; f: number; g: number }>()
  const cameFrom = new Map<string, Point>()
  const gScore = new Map<string, number>()
  
  const startKey = toKey(startSnapped)
  gScore.set(startKey, 0)
  openSet.set(startKey, {
    point: startSnapped,
    f: heuristic(startSnapped, endSnapped),
    g: 0,
  })
  
  // 8-directional neighbors
  const neighbors = [
    { dx: STEP, dy: 0 },
    { dx: -STEP, dy: 0 },
    { dx: 0, dy: STEP },
    { dx: 0, dy: -STEP },
    { dx: STEP, dy: STEP },
    { dx: -STEP, dy: STEP },
    { dx: STEP, dy: -STEP },
    { dx: -STEP, dy: -STEP },
  ]
  
  let iterations = 0
  const MAX_ITERATIONS = 150000
  
  while (openSet.size > 0 && iterations < MAX_ITERATIONS) {
    iterations++
    
    // Find node with lowest f score
    let current: { point: Point; f: number; g: number } | null = null
    let currentKey = ''
    for (const [key, node] of openSet) {
      if (!current || node.f < current.f) {
        current = node
        currentKey = key
      }
    }
    
    if (!current) break
    openSet.delete(currentKey)
    
    // Check if reached goal
    if (Math.hypot(current.point.x - endSnapped.x, current.point.y - endSnapped.y) < STEP * 2) {
      // Reconstruct path
      const path: Point[] = [endSnapped]
      let key = currentKey
      while (cameFrom.has(key)) {
        const p = cameFrom.get(key)!
        path.unshift(p)
        key = toKey(p)
      }
      
      // Simplify path (remove collinear points)
      return simplifyPath(path)
    }
    
    // Explore neighbors
    for (const { dx, dy } of neighbors) {
      const nx = current.point.x + dx
      const ny = current.point.y + dy
      
      // Check if on road
      if (!isRoad(nx, ny, roadMaskData, maskWidth, maskHeight)) continue
      
      // Check one-way restrictions
      if (isBlockedByOneWay(current.point, { x: nx, y: ny }, oneWays)) continue
      
      const neighborKey = toKey({ x: nx, y: ny })
      const moveCost = getMovementCost(current.point, { x: nx, y: ny }, radars, trafficLights)
      const tentativeG = current.g + moveCost
      
      const existingG = gScore.get(neighborKey)
      if (existingG === undefined || tentativeG < existingG) {
        cameFrom.set(neighborKey, current.point)
        gScore.set(neighborKey, tentativeG)
        const f = tentativeG + heuristic({ x: nx, y: ny }, endSnapped)
        openSet.set(neighborKey, { point: { x: nx, y: ny }, f, g: tentativeG })
      }
    }
  }
  
  // No path found - return direct line as fallback
  return [startSnapped, endSnapped]
}

// Simplify path by removing collinear points
function simplifyPath(path: Point[]): Point[] {
  if (path.length <= 2) return path
  
  const simplified: Point[] = [path[0]]
  
  for (let i = 1; i < path.length - 1; i++) {
    const prev = simplified[simplified.length - 1]
    const curr = path[i]
    const next = path[i + 1]
    
    // Check if collinear
    const dx1 = curr.x - prev.x
    const dy1 = curr.y - prev.y
    const dx2 = next.x - curr.x
    const dy2 = next.y - curr.y
    
    // Cross product to check collinearity
    const cross = Math.abs(dx1 * dy2 - dy1 * dx2)
    if (cross > 10) {
      simplified.push(curr)
    }
  }
  
  simplified.push(path[path.length - 1])
  return simplified
}

// Calculate total route distance
export function calculateRouteDistance(path: Point[]): number {
  let distance = 0
  for (let i = 1; i < path.length; i++) {
    distance += Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y)
  }
  return distance
}

// Count features along route
export function countRouteFeatures(
  path: Point[],
  radars: Radar[],
  trafficLights: TrafficLight[]
): { radarCount: number; trafficLightCount: number } {
  const passedRadars = new Set<string>()
  const passedLights = new Set<string>()
  
  for (const point of path) {
    for (const radar of radars) {
      if (Math.hypot(point.x - radar.x, point.y - radar.y) < radar.width * 1.5) {
        passedRadars.add(radar.id)
      }
    }
    for (const light of trafficLights) {
      if (Math.hypot(point.x - light.x, point.y - light.y) < light.width * 1.5) {
        passedLights.add(light.id)
      }
    }
  }
  
  return {
    radarCount: passedRadars.size,
    trafficLightCount: passedLights.size,
  }
}
