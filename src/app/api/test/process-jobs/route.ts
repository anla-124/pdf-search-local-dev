import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { GET as processCronJobs } from '@/app/api/cron/process-jobs/route'

export async function GET(request: NextRequest) {
  try {
    // Only allow in development environment for security
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({
        error: 'Test endpoint not available in production'
      }, { status: 403 })
    }

    logger.info('Manual job processing triggered via test endpoint')

    // Call the cron endpoint directly (avoids self-fetch networking issues in dev)
    // Production deployments should use external cron to call /api/cron/process-jobs via HTTP
    const mockRequest = new NextRequest(
      new URL('/api/cron/process-jobs', request.url),
      {
        headers: {
          'authorization': `Bearer ${process.env['CRON_SECRET'] || 'test-secret-for-local-dev'}`
        }
      }
    )

    const response = await processCronJobs(mockRequest)
    const result = await response.json()

    // Return the result with additional test info
    return NextResponse.json({
      testTrigger: true,
      timestamp: new Date().toISOString(),
      cronResponse: {
        status: response.status,
        statusText: response.statusText,
        data: result
      },
      message: response.ok
        ? 'Job processing completed successfully'
        : 'Job processing failed - check logs'
    }, {
      status: response.status
    })

  } catch (error) {
    logger.error('Test endpoint error', error as Error)
    return NextResponse.json({ 
      testTrigger: true,
      error: 'Failed to trigger job processing',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// Support POST as well for convenience
export async function POST(request: NextRequest) {
  return GET(request)
}