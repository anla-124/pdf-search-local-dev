/**
 * Realistic Load Test Script
 *
 * Simulates 5 team members performing concurrent operations:
 * - Upload documents
 * - Search
 * - Rename
 * - Update metadata
 * - Delete
 */

import { createClient } from '@supabase/supabase-js'
import { PDFDocument, StandardFonts } from 'pdf-lib'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const API_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'test@anduintransact.com'
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || 'test123456'

console.log('\n🚀 Starting Realistic Team Usage Load Test\n')
console.log(`API URL: ${API_URL}`)
console.log(`Test User: ${TEST_USER_EMAIL}\n`)

// Get auth token
async function getAuthToken() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  const { data, error } = await supabase.auth.signInWithPassword({
    email: TEST_USER_EMAIL,
    password: TEST_USER_PASSWORD,
  })

  if (error || !data.session) {
    throw new Error(`Auth failed: ${error?.message}`)
  }

  return data.session.access_token
}

// Create a test PDF
async function createTestPDF(text) {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([600, 400])
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

  page.drawText(text, {
    x: 50,
    y: 350,
    size: 12,
    font,
  })

  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}

// Upload document
async function uploadDocument(authToken, filename, pdfBuffer, metadata = {}) {
  const formData = new FormData()
  const blob = new Blob([pdfBuffer], { type: 'application/pdf' })
  formData.append('file', blob, filename)
  formData.append('metadata', JSON.stringify(metadata))

  const response = await fetch(`${API_URL}/api/documents/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
    body: formData,
  })

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status} ${response.statusText}`)
  }

  return await response.json()
}

// Wait for document to be ready for similarity search
async function waitForDocumentReady(authToken, docId, maxWaitMs = 60000, pollIntervalMs = 2000) {
  const start = Date.now()

  while (Date.now() - start < maxWaitMs) {
    const response = await fetch(`${API_URL}/api/documents/${docId}/processing-status`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to check document status: ${response.status}`)
    }

    const data = await response.json()

    if (data.status === 'completed') {
      return true
    }

    if (data.status === 'failed') {
      throw new Error(`Document processing failed: ${data.processing_error}`)
    }

    // Wait before polling again
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs))
  }

  throw new Error(`Document not ready after ${maxWaitMs}ms`)
}

// Similarity search documents
async function searchSimilarDocuments(authToken, sourceDocId, targetDocIds) {
  const response = await fetch(`${API_URL}/api/documents/selected-search`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sourceDocumentId: sourceDocId,
      targetDocumentIds: targetDocIds,
      minScore: 0.1
    }),
  })

  if (!response.ok) {
    throw new Error(`Similarity search failed: ${response.status}`)
  }

  return await response.json()
}

// Rename document
async function renameDocument(authToken, docId, newTitle) {
  const response = await fetch(`${API_URL}/api/documents/${docId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title: newTitle }),
  })

  if (!response.ok) {
    throw new Error(`Rename failed: ${response.status}`)
  }

  return await response.json()
}

// Update metadata
async function updateMetadata(authToken, docId, metadata) {
  const response = await fetch(`${API_URL}/api/documents/${docId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ metadata }),
  })

  if (!response.ok) {
    throw new Error(`Metadata update failed: ${response.status}`)
  }

  return await response.json()
}

// Delete document
async function deleteDocument(authToken, docId) {
  const response = await fetch(`${API_URL}/api/documents/${docId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Delete failed: ${response.status}`)
  }

  return true
}

// Simulate one user's workflow
async function simulateUserWorkflow(userNum, authToken, results) {
  const userDocs = []

  try {
    console.log(`[User ${userNum}] Starting workflow...`)

    // Upload 2-3 documents
    const docsToUpload = 2 + Math.floor(Math.random() * 2)
    console.log(`[User ${userNum}] Uploading ${docsToUpload} documents...`)

    for (let i = 1; i <= docsToUpload; i++) {
      const start = Date.now()
      try {
        const pdfBuffer = await createTestPDF(`User ${userNum} - Document ${i}`)
        const filename = `user${userNum}-doc${i}.pdf`
        const data = await uploadDocument(authToken, filename, pdfBuffer, {
          category: 'contract',
          department: `Team ${userNum}`
        })

        userDocs.push(data.id)
        results.push({ user: userNum, type: 'upload', success: true, duration: Date.now() - start })
        console.log(`[User ${userNum}] ✅ Uploaded: ${filename} (${Date.now() - start}ms)`)
      } catch (error) {
        results.push({ user: userNum, type: 'upload', success: false, duration: Date.now() - start, error: error.message })
        console.log(`[User ${userNum}] ❌ Upload failed: ${error.message}`)
      }
    }

    // Similarity search (if user has at least 2 documents)
    if (userDocs.length >= 2) {
      const start = Date.now()
      try {
        const sourceDoc = userDocs[0]
        const targetDocs = userDocs.slice(1) // Compare first doc against others

        // Wait for source document to be processed (max 60s)
        console.log(`[User ${userNum}] ⏳ Waiting for document processing...`)
        await waitForDocumentReady(authToken, sourceDoc, 60000)
        console.log(`[User ${userNum}] ✅ Document ready for search`)

        // Perform similarity search
        await searchSimilarDocuments(authToken, sourceDoc, targetDocs)
        results.push({ user: userNum, type: 'search', success: true, duration: Date.now() - start })
        console.log(`[User ${userNum}] ✅ Similarity search completed (${Date.now() - start}ms)`)
      } catch (error) {
        results.push({ user: userNum, type: 'search', success: false, duration: Date.now() - start, error: error.message })
        console.log(`[User ${userNum}] ❌ Similarity search failed: ${error.message}`)
      }
    }

    // Rename
    if (userDocs.length > 0) {
      const start = Date.now()
      try {
        await renameDocument(authToken, userDocs[0], `User ${userNum} - Renamed ${Date.now()}`)
        results.push({ user: userNum, type: 'rename', success: true, duration: Date.now() - start })
        console.log(`[User ${userNum}] ✅ Renamed document (${Date.now() - start}ms)`)
      } catch (error) {
        results.push({ user: userNum, type: 'rename', success: false, duration: Date.now() - start, error: error.message })
        console.log(`[User ${userNum}] ❌ Rename failed: ${error.message}`)
      }
    }

    // Update metadata
    if (userDocs.length > 1) {
      const start = Date.now()
      try {
        await updateMetadata(authToken, userDocs[1], {
          status: 'reviewed',
          priority: 'high',
          reviewer: `User ${userNum}`
        })
        results.push({ user: userNum, type: 'metadata', success: true, duration: Date.now() - start })
        console.log(`[User ${userNum}] ✅ Updated metadata (${Date.now() - start}ms)`)
      } catch (error) {
        results.push({ user: userNum, type: 'metadata', success: false, duration: Date.now() - start, error: error.message })
        console.log(`[User ${userNum}] ❌ Metadata update failed: ${error.message}`)
      }
    }

    // Delete one document
    if (userDocs.length > 0) {
      const start = Date.now()
      const docToDelete = userDocs.pop()
      try {
        await deleteDocument(authToken, docToDelete)
        results.push({ user: userNum, type: 'delete', success: true, duration: Date.now() - start })
        console.log(`[User ${userNum}] ✅ Deleted document (${Date.now() - start}ms)`)
      } catch (error) {
        results.push({ user: userNum, type: 'delete', success: false, duration: Date.now() - start, error: error.message })
        console.log(`[User ${userNum}] ❌ Delete failed: ${error.message}`)
      }
    }

    console.log(`[User ${userNum}] ✅ Workflow complete\n`)
    return userDocs

  } catch (error) {
    console.log(`[User ${userNum}] ❌ Workflow error: ${error.message}\n`)
    return userDocs
  }
}

// Main test
async function runTest() {
  const startTime = Date.now()
  const results = []
  let allDocIds = []

  try {
    // Get auth token
    console.log('Authenticating...')
    const authToken = await getAuthToken()
    console.log('✅ Authenticated\n')

    // Run 5 users concurrently
    const USERS_COUNT = 5
    console.log(`Starting ${USERS_COUNT} concurrent user workflows...\n`)

    const userWorkflows = []
    for (let i = 1; i <= USERS_COUNT; i++) {
      userWorkflows.push(simulateUserWorkflow(i, authToken, results))
    }

    const userDocs = await Promise.all(userWorkflows)
    allDocIds = userDocs.flat()

    const totalTime = Date.now() - startTime

    // Analyze results
    const operations = results.length
    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length

    console.log(`\n═══════════════════════════════════════════════════════`)
    console.log(`📊 REALISTIC USAGE TEST RESULTS`)
    console.log(`═══════════════════════════════════════════════════════`)
    console.log(`Concurrent Users:  ${USERS_COUNT}`)
    console.log(`Total Operations:  ${operations}`)
    console.log(`Successful:        ${successful} (${((successful/operations)*100).toFixed(1)}%)`)
    console.log(`Failed:            ${failed}`)
    console.log(`Total Time:        ${totalTime}ms (${(totalTime/1000).toFixed(1)}s)`)
    console.log(`Avg Time/Op:       ${(totalTime/operations).toFixed(0)}ms`)
    console.log(`═══════════════════════════════════════════════════════\n`)

    // Break down by operation type
    const byType = {}
    for (const result of results) {
      if (!byType[result.type]) byType[result.type] = []
      byType[result.type].push(result)
    }

    console.log(`📈 OPERATION BREAKDOWN:`)
    console.log(`───────────────────────────────────────────────────────`)
    for (const [type, ops] of Object.entries(byType)) {
      const typeSuccessful = ops.filter(o => o.success).length
      const typeTotal = ops.length
      const avgTime = ops.reduce((sum, o) => sum + o.duration, 0) / typeTotal
      console.log(`${type.padEnd(12)} ${typeSuccessful}/${typeTotal} success  avg: ${avgTime.toFixed(0)}ms`)
    }
    console.log(`───────────────────────────────────────────────────────\n`)

    // Check system health
    console.log(`🔍 Checking system health...`)
    const healthResponse = await fetch(`${API_URL}/api/health/pool`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    })

    if (healthResponse.ok) {
      const health = await healthResponse.json()
      console.log(`\n📈 SYSTEM METRICS:`)
      console.log(`───────────────────────────────────────────────────────`)
      console.log(`Status:              ${health.status}`)

      if (health.connectionPool) {
        const pool = health.connectionPool
        console.log(`\nConnection Pool:`)
        console.log(`  Active:            ${pool.metrics.activeConnections}`)
        console.log(`  Idle:              ${pool.metrics.idleConnections}`)
        console.log(`  Utilization:       ${pool.metrics.utilizationRate?.toFixed(1)}%`)
      }

      if (health.throttling) {
        console.log(`\nThrottling:`)
        console.log(`  Upload Active:     ${health.throttling.upload.global.active}`)
        console.log(`  Upload Waiting:    ${health.throttling.upload.global.waiting}`)
        console.log(`  Delete Active:     ${health.throttling.delete.global.active}`)
        console.log(`  Delete Waiting:    ${health.throttling.delete.global.waiting}`)
      }
      console.log(`───────────────────────────────────────────────────────\n`)
    }

    // Cleanup
    if (allDocIds.length > 0) {
      console.log(`🧹 Cleaning up ${allDocIds.length} remaining documents...`)
      const cleanupPromises = allDocIds.map(id => deleteDocument(authToken, id).catch(() => {}))
      await Promise.all(cleanupPromises)
      console.log(`✅ Cleanup complete\n`)
    }

    console.log(`\n✅ Load test complete - ${successful}/${operations} operations succeeded\n`)

    if (successful / operations >= 0.95) {
      console.log(`🎉 EXCELLENT: System handled realistic team usage with >95% success rate!\n`)
    } else if (successful / operations >= 0.8) {
      console.log(`✅ GOOD: System handled realistic team usage with >80% success rate.\n`)
    } else {
      console.log(`⚠️  WARNING: Success rate below 80%. Consider reviewing system configuration.\n`)
    }

  } catch (error) {
    console.error(`\n❌ Test failed: ${error.message}\n`)
    console.error(error.stack)
    process.exit(1)
  }
}

runTest()
