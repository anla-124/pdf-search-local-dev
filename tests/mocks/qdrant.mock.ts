/**
 * Mock implementation of Qdrant vector database for unit testing
 *
 * Provides in-memory storage and search without requiring a running Qdrant instance
 */

export interface MockQdrantPoint {
  id: string
  vector: number[]
  payload: Record<string, unknown>
}

export interface MockSearchResult {
  id: string
  score: number
  payload: Record<string, unknown>
}

export class MockQdrant {
  private static collections: Map<string, MockQdrantPoint[]> = new Map()

  /**
   * Create or recreate a collection
   */
  static async createCollection(collectionName: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 10))
    MockQdrant.collections.set(collectionName, [])
  }

  /**
   * Check if collection exists
   */
  static async collectionExists(collectionName: string): Promise<boolean> {
    return MockQdrant.collections.has(collectionName)
  }

  /**
   * Upsert points into collection
   */
  static async upsert(
    collectionName: string,
    points: MockQdrantPoint[]
  ): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 20))

    const collection = MockQdrant.collections.get(collectionName) || []

    // Remove existing points with same IDs
    const existingIds = new Set(points.map(p => p.id))
    const filteredCollection = collection.filter(p => !existingIds.has(p.id))

    // Add new points
    MockQdrant.collections.set(collectionName, [...filteredCollection, ...points])
  }

  /**
   * Search for similar vectors
   */
  static async search(
    collectionName: string,
    queryVector: number[],
    limit: number = 10,
    filter?: Record<string, unknown>
  ): Promise<MockSearchResult[]> {
    await new Promise(resolve => setTimeout(resolve, 30))

    const collection = MockQdrant.collections.get(collectionName) || []

    // Apply filter if provided
    let filtered = collection
    if (filter) {
      filtered = collection.filter(point => {
        return Object.entries(filter).every(([key, value]) => {
          return point.payload[key] === value
        })
      })
    }

    // Calculate similarity scores
    const results = filtered.map(point => ({
      id: point.id,
      score: MockQdrant.cosineSimilarity(queryVector, point.vector),
      payload: point.payload
    }))

    // Sort by score descending and limit results
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
  }

  /**
   * Delete points by IDs
   */
  static async deletePoints(
    collectionName: string,
    pointIds: string[]
  ): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 15))

    const collection = MockQdrant.collections.get(collectionName) || []
    const idsToDelete = new Set(pointIds)

    const filtered = collection.filter(point => !idsToDelete.has(point.id))
    MockQdrant.collections.set(collectionName, filtered)
  }

  /**
   * Delete points by filter
   */
  static async deleteByFilter(
    collectionName: string,
    filter: Record<string, unknown>
  ): Promise<number> {
    await new Promise(resolve => setTimeout(resolve, 20))

    const collection = MockQdrant.collections.get(collectionName) || []

    const filtered = collection.filter(point => {
      return !Object.entries(filter).every(([key, value]) => {
        return point.payload[key] === value
      })
    })

    const deletedCount = collection.length - filtered.length
    MockQdrant.collections.set(collectionName, filtered)

    return deletedCount
  }

  /**
   * Get points by IDs
   */
  static async getPoints(
    collectionName: string,
    pointIds: string[]
  ): Promise<MockQdrantPoint[]> {
    await new Promise(resolve => setTimeout(resolve, 10))

    const collection = MockQdrant.collections.get(collectionName) || []
    const idSet = new Set(pointIds)

    return collection.filter(point => idSet.has(point.id))
  }

  /**
   * Get collection info
   */
  static async getCollectionInfo(collectionName: string): Promise<{
    pointsCount: number
    status: string
  }> {
    const collection = MockQdrant.collections.get(collectionName) || []
    return {
      pointsCount: collection.length,
      status: 'green'
    }
  }

  /**
   * Clear all collections (for test cleanup)
   */
  static clearAll(): void {
    MockQdrant.collections.clear()
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private static cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      return 0
    }

    let dotProduct = 0
    let magnitudeA = 0
    let magnitudeB = 0

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i]! * b[i]!
      magnitudeA += a[i]! * a[i]!
      magnitudeB += b[i]! * b[i]!
    }

    const magnitude = Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB)
    return magnitude === 0 ? 0 : dotProduct / magnitude
  }
}
