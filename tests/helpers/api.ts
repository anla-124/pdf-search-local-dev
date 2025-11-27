import { APIRequestContext, APIResponse, expect } from '@playwright/test'

/**
 * API Testing Helper Utilities
 *
 * Provides common functions for testing API endpoints
 */

/**
 * Validate that an API response is successful (2xx status)
 */
export async function expectSuccessResponse(response: APIResponse, expectedStatus = 200) {
  expect(response.ok()).toBeTruthy()
  expect(response.status()).toBe(expectedStatus)
}

/**
 * Validate that an API response is an error with expected status
 */
export async function expectErrorResponse(response: APIResponse, expectedStatus: number, expectedError?: string) {
  expect(response.ok()).toBeFalsy()
  expect(response.status()).toBe(expectedStatus)

  if (expectedError) {
    const body = await response.json()
    expect(body.error).toContain(expectedError)
  }
}

/**
 * Validate response contains expected JSON structure
 */
export async function expectJsonResponse(response: APIResponse, expectedKeys: string[]) {
  expect(response.headers()['content-type']).toContain('application/json')
  const body = await response.json()

  for (const key of expectedKeys) {
    expect(body).toHaveProperty(key)
  }

  return body
}

/**
 * Wait for async operation to complete (e.g., document processing)
 */
export async function waitForCondition(
  request: APIRequestContext,
  checkFn: () => Promise<boolean>,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> {
  const timeout = options.timeout || 30000 // 30 seconds default
  const interval = options.interval || 1000 // 1 second default
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    if (await checkFn()) {
      return
    }
    await new Promise(resolve => setTimeout(resolve, interval))
  }

  throw new Error(`Condition not met within ${timeout}ms`)
}

/**
 * Upload a test document
 */
export async function uploadTestDocument(
  request: APIRequestContext,
  authHeaders: Record<string, string>,
  pdfBuffer: Buffer,
  filename: string = 'test-document.pdf',
  metadata?: Record<string, unknown>
) {
  type MultipartPayload = NonNullable<Parameters<APIRequestContext['post']>[1]>['multipart']
  const multipart: MultipartPayload = {
    file: {
      name: filename,
      mimeType: 'application/pdf',
      buffer: pdfBuffer
    },
    ...(metadata ? { metadata: JSON.stringify(metadata) } : {})
  } as MultipartPayload

  const response = await request.post('/api/documents/upload', {
    headers: { ...authHeaders },
    multipart
  })

  return response
}

/**
 * Delete a document (cleanup helper)
 */
export async function deleteDocument(
  request: APIRequestContext,
  authHeaders: Record<string, string>,
  documentId: string
) {
  const response = await request.delete(`/api/documents/${documentId}`, {
    headers: authHeaders,
  })

  return response
}

/**
 * Wait for document processing to complete
 */
export async function waitForDocumentProcessing(
  request: APIRequestContext,
  authHeaders: Record<string, string>,
  documentId: string,
  options: { timeout?: number; interval?: number } = {}
): Promise<{ status: string; processingTimeMs?: number }> {
  const timeout = options.timeout || 120000 // 2 minutes default
  const interval = options.interval || 2000 // 2 seconds default
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    const response = await request.get(`/api/documents/${documentId}/processing-status`, {
      headers: authHeaders,
    })

    if (!response.ok()) {
      throw new Error(`Failed to get processing status: ${response.status()}`)
    }

    const data = await response.json()

    if (data.status === 'completed' || data.status === 'failed') {
      return data
    }

    await new Promise(resolve => setTimeout(resolve, interval))
  }

  throw new Error(`Document processing timeout after ${timeout}ms`)
}

/**
 * Create a sample PDF file for testing (in-memory)
 * Creates a valid minimal PDF with text content
 */
export function createTestPDF(text: string = 'Test Document Content'): Buffer {
  // Minimal valid PDF structure
  const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 5 0 R
>>
>>
>>
endobj
4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
100 700 Td
(${text}) Tj
ET
endstream
endobj
5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000274 00000 n
0000000367 00000 n
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
445
%%EOF`

  return Buffer.from(pdfContent)
}

/**
 * Generate a random string for unique test data
 */
export function randomString(length = 10): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * Generate a unique document title for testing
 */
export function generateTestDocumentTitle(): string {
  return `test-document-${randomString(8)}-${Date.now()}`
}
