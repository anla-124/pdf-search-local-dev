import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/api-auth'
import { PaginationUtils, DatabasePagination } from '@/lib/utils/pagination'
import { DatabaseDocumentWithContent } from '@/types/external-apis'
import { logger } from '@/lib/logger'
import type { PostgrestResponse } from '@supabase/supabase-js'
import { createServiceClient, releaseServiceClient } from '@/lib/supabase/server'
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    // Authenticate request using centralized helper
    // Supports: JWT tokens, service role (test-only), and cookie-based sessions
    const authResult = await authenticateRequest(request)
    if (authResult instanceof NextResponse) {
      return authResult // Return error response
    }

    const { userId, supabase } = authResult

    // Parse pagination and filter parameters
    const paginationParams = PaginationUtils.parseParams(request)
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const includeJobs = searchParams.get('include_jobs') === 'true'
    
    // Validate pagination parameters
    const validation = PaginationUtils.validateParams(paginationParams)
    if (!validation.valid) {
      return NextResponse.json({
        error: 'Invalid pagination parameters',
        details: validation.errors
      }, { status: 400 })
    }

    logger.info('Documents API: fetching documents for user', { userId, statusParam: status, searchParam: search, includeJobsParam: includeJobs })

    // Get total count for pagination (with same filters)
    let countQuery = supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
    
    if (status) {
      countQuery = countQuery.eq('status', status)
    }
    
    if (search) {
      countQuery = countQuery.or(`title.ilike.%${search}%,filename.ilike.%${search}%`)
    }
    
    // Enhanced query with JOIN to avoid N+1 issues when job info is needed
    const baseSelect = `
      id,
      user_id,
      title,
      filename,
      file_path,
      file_size,
      content_type,
      status,
      processing_error,
      extracted_fields,
      metadata,
      page_count,
      created_at,
      updated_at,
      document_content(extracted_text)
    `.trim()

    const selectClause = includeJobs ? `
      ${baseSelect},
      document_jobs(
        id,
        status,
        processing_method,
        attempts,
        error_message,
        created_at,
        updated_at
      )
    `.trim() : baseSelect

    let query = supabase
      .from('documents')
      .select(selectClause)

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,filename.ilike.%${search}%`)
    }

    // Apply pagination with proper sorting
    query = DatabasePagination.applyPagination(query, paginationParams)

    const startTime = Date.now()

    // Execute both queries concurrently for better performance
    const [documentsResult, countResult] = await Promise.all([
      query,
      countQuery
    ])

    const { data: documents, error: dbError } = documentsResult as PostgrestResponse<DatabaseDocumentWithContent>
    const { count } = countResult

    if (dbError) {
      logger.error('Documents API: database error', dbError)
      return NextResponse.json({ 
        error: 'Failed to fetch documents',
        code: 'DATABASE_ERROR',
        details: dbError.message
      }, { status: 500 })
    }

    const queryTime = Date.now() - startTime
    
    // Flatten extracted_text from document_content for each document
    const flattenedDocuments = documents?.map((doc: DatabaseDocumentWithContent) => {
      if (doc.document_content && doc.document_content.length > 0) {
        return {
          ...doc,
          extracted_text: doc.document_content[0]?.extracted_text ?? '',
          document_content: undefined // Remove the nested object
        }
      }
      return doc
    }) || []

    // Enrich with user display information (full name or email) via service role
    const uniqueUserIds = Array.from(new Set(flattenedDocuments.map(doc => doc.user_id).filter(Boolean)))
    const userDisplayMap: Record<string, { name: string | null; email: string | null }> = {}

    // Prefer a dedicated admin client (service role) for auth lookups
    const adminUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    let serviceClient: Awaited<ReturnType<typeof createServiceClient>> | undefined
    try {
      if (adminUrl && adminKey) {
        const adminClient = createSupabaseAdminClient(adminUrl, adminKey)

        await Promise.all(uniqueUserIds.map(async userId => {
          try {
            const { data, error } = await adminClient.auth.admin.getUserById(userId)
            if (error) {
              logger.warn('Documents API: failed to fetch user for display', { userId, error: error.message })
              return
            }
            const fullName = typeof data?.user?.user_metadata?.full_name === 'string'
              ? (data.user.user_metadata.full_name as string)
              : null
            const email = data?.user?.email ?? null
            userDisplayMap[userId] = { name: fullName, email }
          } catch (err) {
            logger.warn('Documents API: user lookup error', { userId, error: err instanceof Error ? err.message : String(err) })
          }
        }))
      } else {
        // Fallback to pooled service client if admin key is missing
        const poolClient = await createServiceClient()
        serviceClient = poolClient

        await Promise.all(uniqueUserIds.map(async userId => {
          try {
            const { data, error } = await poolClient.auth.admin.getUserById(userId)
            if (error) {
              logger.warn('Documents API: failed to fetch user for display (pool)', { userId, error: error.message })
              return
            }
            const fullName = typeof data?.user?.user_metadata?.full_name === 'string'
              ? (data.user.user_metadata.full_name as string)
              : null
            const email = data?.user?.email ?? null
            userDisplayMap[userId] = { name: fullName, email }
          } catch (err) {
            logger.warn('Documents API: user lookup error (pool)', { userId, error: err instanceof Error ? err.message : String(err) })
          }
        }))
      }
    } catch (err) {
      logger.warn('Documents API: service client unavailable for user display', { error: err instanceof Error ? err.message : String(err) })
    } finally {
      if (serviceClient) releaseServiceClient(serviceClient)
    }

    const enhancedDocuments = flattenedDocuments.map(doc => {
      const display = userDisplayMap[doc.user_id]
      // Prefer explicit full_name; fallback to first part of email; else null
      const derivedName = display?.name?.trim() || (display?.email ? display.email.split('@')[0] : null)
      return {
        ...doc,
        updated_by_name: derivedName,
        updated_by_email: display?.email ?? null
      }
    })

    logger.info('Documents API: returned documents', { userId, count: flattenedDocuments.length, documentIds: flattenedDocuments.map(doc => doc.id) })

    // Create paginated response
    const responseData = PaginationUtils.createPaginatedResponse(
      enhancedDocuments,
      count || 0,
      paginationParams,
      (request.url || '').split('?')[0] || '/api/documents',
      { status: status || '', search: search || '', include_jobs: includeJobs.toString() }
    )

    // Add query metadata and backwards compatibility
    const enhancedResponse = {
      ...responseData,
      documents: responseData.data, // Backwards compatibility for frontend
      query_metadata: {
        query_time_ms: queryTime,
        cached: false,
        fresh: true,
        filters: { status, search, include_jobs: includeJobs },
        sort: {
          by: paginationParams.sortBy,
          order: paginationParams.sortOrder
        }
      }
    }

    return NextResponse.json(enhancedResponse)

  } catch (error) {
    logger.error('Documents API error', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
