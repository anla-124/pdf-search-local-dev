// Google Vertex AI Embeddings - Free alternative to OpenAI
import { GoogleAuth } from 'google-auth-library'
import { getGoogleClientOptions } from '@/lib/google-credentials'
import type { VertexAIEmbeddingResponse } from '@/types/external-apis'
import { logger } from '@/lib/logger'

export async function generateVertexEmbeddings(text: string): Promise<number[]> {
  try {
    const cleanedText = text.replace(/\n/g, ' ').trim()
    // text-embedding-005 has 2048 token limit (tokens ≈ characters/4 for English)
    // Use conservative 3072 character limit; API auto-truncates at token boundary
    const truncatedText = cleanedText.substring(0, 3072)

    if (!truncatedText) {
      throw new Error('Text is empty after cleaning')
    }

    logger.info('Generating Vertex AI embeddings', { textLength: truncatedText.length })

    // Create fresh GoogleAuth client per request to prevent state corruption
    const clientOptions = getGoogleClientOptions()
    const auth = new GoogleAuth({
      ...clientOptions,
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    })

    const client = await auth.getClient()
    const projectId = process.env['GOOGLE_CLOUD_PROJECT_ID']!

    // Use text-embedding-005 model (768 dimensions, specialized for English and code)
    const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/text-embedding-005:predict`

    const response = await client.request({
      url,
      method: 'POST',
      data: {
        instances: [
          {
            content: truncatedText,
            task_type: 'RETRIEVAL_DOCUMENT'
          }
        ]
      }
    })

    const embeddings = (response.data as VertexAIEmbeddingResponse)?.predictions?.[0]?.embeddings?.values

    if (!embeddings || !Array.isArray(embeddings)) {
      throw new Error('No embeddings returned from Vertex AI')
    }

    return embeddings
  } catch (error: unknown) {
    const statusCode = error instanceof Error && 'status' in error ? (error as { status: number }).status : undefined
    logger.error('Error generating Vertex AI embeddings', error as Error, { statusCode })

    
    if (statusCode === 403) {
      throw new Error('Vertex AI API not enabled. Enable it at: https://console.cloud.google.com/apis/library/aiplatform.googleapis.com')
    } else if (statusCode === 401) {
      throw new Error('Invalid Google Cloud credentials. Check your service account.')
    } else if (statusCode === 404) {
      throw new Error('Vertex AI model not found. The model may not be available in your region or project.')
    } else if (statusCode === 429) {
      throw new Error('Vertex AI rate limit exceeded. Please try again in a few minutes.')
    }
    
    throw new Error(`Failed to generate Vertex embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Main embedding function using Vertex AI
export async function generateEmbeddings(text: string): Promise<number[]> {
  return await generateVertexEmbeddings(text)
}