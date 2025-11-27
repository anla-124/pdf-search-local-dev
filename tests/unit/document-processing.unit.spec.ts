import { test, expect } from '@playwright/test'
import { MockDocumentAI } from '../mocks/document-ai.mock'
import { MockVertexAI } from '../mocks/vertex-ai.mock'
import { MockQdrant } from '../mocks/qdrant.mock'

/**
 * Unit Tests for Document Processing Logic
 *
 * These tests use mocked external services to validate business logic
 * without hitting real APIs. They are:
 * - Fast (< 1 second total)
 * - Free (no API costs)
 * - Deterministic (no flakiness from external services)
 *
 * Use these for:
 * - CI/CD on every commit
 * - Local development
 * - Testing edge cases and error conditions
 *
 * Reserve integration tests for:
 * - Pre-deployment validation
 * - Verifying actual API integrations
 */

test.describe('Document Processing - Unit Tests', () => {
  test.beforeEach(() => {
    // Clear all mock data before each test
    MockQdrant.clearAll()
  })

  test('Document AI mock returns structured OCR data', async () => {
    const response = await MockDocumentAI.processDocument(
      'test-contract.pdf',
      'application/pdf'
    )

    expect(response).toHaveProperty('text')
    expect(response).toHaveProperty('pages')
    expect(response.pages).toHaveLength(1)
    expect(response.text).toContain('Agreement')
    expect(response.text.length).toBeGreaterThan(0)
  })

  test('Vertex AI mock generates consistent embeddings', async () => {
    const text = 'test document content'

    // Generate embedding twice
    const embedding1 = await MockVertexAI.generateEmbedding(text)
    const embedding2 = await MockVertexAI.generateEmbedding(text)

    // Should be deterministic (same input = same output)
    expect(embedding1).toHaveLength(768) // Standard dimension
    expect(embedding2).toHaveLength(768)
    expect(embedding1).toEqual(embedding2)

    // Should be normalized (unit length)
    const magnitude = Math.sqrt(
      embedding1.reduce((sum, val) => sum + val * val, 0)
    )
    expect(magnitude).toBeCloseTo(1.0, 5)
  })

  test('Similar texts produce similar embeddings', async () => {
    const text1 = 'contract agreement terms'
    const text2 = 'contract agreement conditions'
    const text3 = 'invoice payment bill'

    const [emb1, emb2, emb3] = await Promise.all([
      MockVertexAI.generateEmbedding(text1),
      MockVertexAI.generateEmbedding(text2),
      MockVertexAI.generateEmbedding(text3)
    ])

    // Similar texts should have higher similarity
    const similarity12 = MockVertexAI.cosineSimilarity(emb1, emb2)
    const similarity13 = MockVertexAI.cosineSimilarity(emb1, emb3)

    expect(similarity12).toBeGreaterThan(similarity13)
    expect(similarity12).toBeGreaterThan(0.4) // Mock embeddings have moderate similarity
  })

  test('Qdrant mock stores and retrieves vectors', async () => {
    const collectionName = 'test-collection'

    // Create collection
    await MockQdrant.createCollection(collectionName)
    expect(await MockQdrant.collectionExists(collectionName)).toBe(true)

    // Generate embeddings
    const text1 = 'first document'
    const text2 = 'second document'

    const embedding1 = await MockVertexAI.generateEmbedding(text1)
    const embedding2 = await MockVertexAI.generateEmbedding(text2)

    // Upsert vectors
    await MockQdrant.upsert(collectionName, [
      {
        id: 'doc1',
        vector: embedding1,
        payload: { text: text1, type: 'test' }
      },
      {
        id: 'doc2',
        vector: embedding2,
        payload: { text: text2, type: 'test' }
      }
    ])

    // Verify storage
    const info = await MockQdrant.getCollectionInfo(collectionName)
    expect(info.pointsCount).toBe(2)
  })

  test('Qdrant mock performs similarity search', async () => {
    const collectionName = 'search-test'
    await MockQdrant.createCollection(collectionName)

    // Store documents with embeddings
    const docs = [
      { id: 'contract1', text: 'contract agreement legal terms' },
      { id: 'contract2', text: 'contract conditions obligations' },
      { id: 'invoice1', text: 'invoice payment due amount' }
    ]

    const embeddings = await MockVertexAI.generateEmbeddingsBatch(
      docs.map(d => d.text)
    )

    const points = docs.map((doc, i) => {
      const vector = embeddings[i]
      if (!vector) {
        throw new Error('Missing embedding for document')
      }
      return {
        id: doc.id,
        vector,
        payload: { text: doc.text }
      }
    })

    await MockQdrant.upsert(collectionName, points)

    // Search for contract-related documents
    const queryEmbedding = await MockVertexAI.generateEmbedding('contract legal')
    const results = await MockQdrant.search(collectionName, queryEmbedding, 3)

    // Should return all 3 docs, sorted by relevance
    expect(results).toHaveLength(3)

    const [first, second, third] = results
    if (!first || !second || !third) {
      throw new Error('Search results missing')
    }

    // All documents should have IDs
    expect([first, second, third].every(r => typeof r.id === 'string')).toBe(true)

    // Scores should be descending (proves sorting works)
    expect(first.score).toBeGreaterThanOrEqual(second.score)
    expect(second.score).toBeGreaterThanOrEqual(third.score)

    // Scores should be in valid range
    expect(first.score).toBeGreaterThan(-1)
    expect(first.score).toBeLessThanOrEqual(1)
  })

  test('Qdrant mock filters results by metadata', async () => {
    const collectionName = 'filter-test'
    await MockQdrant.createCollection(collectionName)

    const embedding = await MockVertexAI.generateEmbedding('test')

    // Store documents with different types
    await MockQdrant.upsert(collectionName, [
      {
        id: 'doc1',
        vector: embedding,
        payload: { type: 'contract', year: 2024 }
      },
      {
        id: 'doc2',
        vector: embedding,
        payload: { type: 'invoice', year: 2024 }
      },
      {
        id: 'doc3',
        vector: embedding,
        payload: { type: 'contract', year: 2023 }
      }
    ])

    // Search with filter
    const results = await MockQdrant.search(
      collectionName,
      embedding,
      10,
      { type: 'contract' }
    )

    expect(results).toHaveLength(2)
    expect(results.every(r => r.payload.type === 'contract')).toBe(true)
  })

  test('Qdrant mock deletes vectors by ID', async () => {
    const collectionName = 'delete-test'
    await MockQdrant.createCollection(collectionName)

    const embedding = await MockVertexAI.generateEmbedding('test')

    await MockQdrant.upsert(collectionName, [
      { id: 'doc1', vector: embedding, payload: {} },
      { id: 'doc2', vector: embedding, payload: {} },
      { id: 'doc3', vector: embedding, payload: {} }
    ])

    // Delete one document
    await MockQdrant.deletePoints(collectionName, ['doc2'])

    const info = await MockQdrant.getCollectionInfo(collectionName)
    expect(info.pointsCount).toBe(2)

    // Verify deleted doc not in results
    const remaining = await MockQdrant.getPoints(collectionName, ['doc1', 'doc2', 'doc3'])
    expect(remaining).toHaveLength(2)
    expect(remaining.find(p => p.id === 'doc2')).toBeUndefined()
  })

  test('Qdrant mock deletes vectors by filter', async () => {
    const collectionName = 'delete-filter-test'
    await MockQdrant.createCollection(collectionName)

    const embedding = await MockVertexAI.generateEmbedding('test')

    await MockQdrant.upsert(collectionName, [
      { id: 'doc1', vector: embedding, payload: { status: 'draft' } },
      { id: 'doc2', vector: embedding, payload: { status: 'published' } },
      { id: 'doc3', vector: embedding, payload: { status: 'draft' } }
    ])

    // Delete all drafts
    const deletedCount = await MockQdrant.deleteByFilter(collectionName, {
      status: 'draft'
    })

    expect(deletedCount).toBe(2)

    const info = await MockQdrant.getCollectionInfo(collectionName)
    expect(info.pointsCount).toBe(1)
  })

  test('Complete workflow: OCR → Embeddings → Vector Storage → Search', async () => {
    // Simulate complete document processing pipeline with mocks

    // Step 1: OCR extraction
    const ocrResult = await MockDocumentAI.processDocument(
      'test-contract.pdf',
      'application/pdf'
    )
    expect(ocrResult.text).toContain('Agreement')

    // Step 2: Generate embeddings for extracted text
    const embedding = await MockVertexAI.generateEmbedding(ocrResult.text)
    expect(embedding).toHaveLength(768)

    // Step 3: Store in vector database
    const collectionName = 'documents'
    await MockQdrant.createCollection(collectionName)
    await MockQdrant.upsert(collectionName, [{
      id: 'doc-123',
      vector: embedding,
      payload: {
        filename: 'test-contract.pdf',
        text: ocrResult.text,
        pageCount: ocrResult.pages.length
      }
    }])

    // Step 4: Search for similar documents
    const queryText = 'contract agreement'
    const queryEmbedding = await MockVertexAI.generateEmbedding(queryText)
    const searchResults = await MockQdrant.search(
      collectionName,
      queryEmbedding,
      5
    )

    // Verify end-to-end flow
    expect(searchResults).toHaveLength(1)
    const [firstResult] = searchResults
    if (!firstResult) {
      throw new Error('Expected a search result')
    }
    expect(firstResult.id).toBe('doc-123')
    expect(firstResult.payload.filename).toBe('test-contract.pdf')
    expect(firstResult.score).toBeGreaterThan(0) // Mock embeddings have variable similarity
    expect(firstResult.score).toBeLessThanOrEqual(1)
  })
})
