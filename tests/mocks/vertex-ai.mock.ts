/**
 * Mock implementation of Vertex AI embeddings for unit testing
 *
 * Provides deterministic embedding vectors without hitting Google Cloud API
 */

export interface MockEmbeddingResponse {
  predictions: Array<{
    embeddings: {
      values: number[]
    }
  }>
}

export class MockVertexAI {
  // Standard embedding dimension for text-embedding-005 model
  private static readonly EMBEDDING_DIMENSION = 768

  /**
   * Generate mock embeddings for text
   * Returns deterministic embeddings based on text content for reproducible tests
   */
  static async generateEmbedding(text: string): Promise<number[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 50))

    // Generate deterministic embedding based on text hash
    const hash = MockVertexAI.simpleHash(text)
    const embedding: number[] = []

    for (let i = 0; i < MockVertexAI.EMBEDDING_DIMENSION; i++) {
      // Create deterministic but varied values
      const seed = hash + i
      const value = Math.sin(seed) * Math.cos(seed * 1.5) * 0.5
      embedding.push(value)
    }

    // Normalize the vector
    return MockVertexAI.normalizeVector(embedding)
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  static async generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
    // Simulate batch processing delay (shorter per-item than individual calls)
    await new Promise(resolve => setTimeout(resolve, 30 * texts.length))

    return Promise.all(texts.map(text => MockVertexAI.generateEmbedding(text)))
  }

  /**
   * Simple hash function for deterministic mock data
   */
  private static simpleHash(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
  }

  /**
   * Normalize vector to unit length (L2 normalization)
   */
  private static normalizeVector(vector: number[]): number[] {
    const magnitude = Math.sqrt(
      vector.reduce((sum, val) => sum + val * val, 0)
    )

    if (magnitude === 0) {
      return vector.map(() => 0)
    }

    return vector.map(val => val / magnitude)
  }

  /**
   * Calculate cosine similarity between two vectors
   * Useful for testing search relevance
   */
  static cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have same dimension')
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

  /**
   * Mock embeddings for common test scenarios
   */
  static getMockEmbeddings() {
    return {
      contract: MockVertexAI.generateEmbedding('contract agreement terms conditions'),
      invoice: MockVertexAI.generateEmbedding('invoice payment amount bill'),
      generic: MockVertexAI.generateEmbedding('test document sample text')
    }
  }
}
