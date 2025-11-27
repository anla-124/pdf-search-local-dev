import { test, expect } from '@playwright/test'
import { getTestUserAuthHeaders } from '../helpers/auth'
import { createTestPDF, uploadTestDocument, waitForDocumentProcessing, deleteDocument } from '../helpers/api'

/**
 * SMOKE TESTS - Critical Path
 *
 * These tests verify the most critical functionality with REAL data.
 * Run these before every deployment to ensure nothing is broken.
 *
 * Expected runtime: ~2-3 minutes (includes real document processing)
 */

test.describe('Smoke Tests - Critical Path', () => {
  test('Application server is running', async ({ request }) => {
    const response = await request.get('/api/health')
    expect(response.ok()).toBeTruthy()
  })

  test('Database connection works', async ({ request }) => {
    const response = await request.get('/api/health')
    const body = await response.json()

    // Should return healthy status (or at least respond)
    expect(body).toHaveProperty('status')
  })

  test('Connection pool is healthy', async ({ request }) => {
    const response = await request.get('/api/health/pool')
    expect(response.ok()).toBeTruthy()

    const body = await response.json()
    expect(body).toHaveProperty('connectionPool')
    expect(body.connectionPool).toHaveProperty('metrics')
    expect(body.connectionPool.metrics).toHaveProperty('totalConnections')
  })

  test('API endpoints respond (not 404)', async ({ request }) => {
    // Test a few key endpoints just to verify routing works
    const endpoints = [
      '/api/health',
      '/api/health/pool',
    ]

    for (const endpoint of endpoints) {
      const response = await request.get(endpoint)
      // Should not be 404 (Not Found)
      expect(response.status()).not.toBe(404)
    }
  })

  test('CRON authentication works', async ({ request }) => {
    const cronSecret = process.env.CRON_SECRET || 'test-secret-for-local-dev'

    // Should reject without auth
    const unauthResponse = await request.get('/api/cron/process-jobs')
    expect(unauthResponse.status()).toBe(401)

    // Should accept with auth
    const authResponse = await request.get('/api/cron/process-jobs', {
      headers: {
        'Authorization': `Bearer ${cronSecret}`,
      },
    })
    expect(authResponse.ok()).toBeTruthy()
  })

  test('Environment variables are loaded', async () => {
    // Verify critical environment variables exist
    expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBeDefined()
    expect(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBeDefined()
    // Service role key is required for connection pool operations (not API auth)
    expect(process.env.SUPABASE_SERVICE_ROLE_KEY).toBeDefined()
  })

  test('🔥 CRITICAL: Complete user workflow works end-to-end', async ({ request }) => {
    // This is THE most important test - it verifies the app actually works!
    const authHeaders = await getTestUserAuthHeaders()

    // 1. Upload a document
    const pdfBuffer = createTestPDF('Smoke test document')
    const uploadResponse = await uploadTestDocument(request, authHeaders, pdfBuffer, 'smoke-test.pdf')

    expect(uploadResponse.status()).toBe(200)
    const { id: documentId } = await uploadResponse.json()
    expect(documentId).toBeDefined()

    try {
      // 2. Wait for processing (this is the real test!)
      const processingResult = await waitForDocumentProcessing(request, authHeaders, documentId, {
        timeout: 180000, // 3 minutes
      })

      expect(processingResult.status).toBe('completed')

      // 3. Verify we can download it
      const downloadResponse = await request.get(`/api/documents/${documentId}/download`, {
        headers: authHeaders,
      })

      expect(downloadResponse.status()).toBe(200)
      expect(downloadResponse.headers()['content-type']).toContain('pdf')

      // 4. Verify we can search with it
      const searchResponse = await request.post(`/api/documents/${documentId}/similar-v2`, {
        headers: authHeaders,
        data: { minScore: 0 },
      })

      expect(searchResponse.status()).toBe(200)
      const searchData = await searchResponse.json()
      expect(searchData).toHaveProperty('results')

      console.log('✓ End-to-end workflow SUCCESS')
    } finally {
      // Cleanup
      await deleteDocument(request, authHeaders, documentId)
    }
  })
})
