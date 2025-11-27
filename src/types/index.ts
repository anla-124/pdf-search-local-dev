// Re-export comprehensive types for enterprise-grade type safety
export * from './external-apis'
export * from './api-responses'

// LEGACY TYPES - Maintained for backward compatibility
// These will be gradually migrated to the new type system

export interface User {
  id: string
  email: string
  full_name?: string
  role: 'admin' | 'user'
  created_at: string
  updated_at: string
}


// ExtractedField interface removed - extracted_fields table no longer exists
// OCR processor doesn't extract form fields (only Form Parser does, but app always uses OCR)

export interface DocumentEmbedding {
  id: string
  document_id: string
  vector_id: string
  embedding: number[]
  chunk_text: string
  chunk_index: number
  page_number?: number
  created_at: string
}

export interface SearchFilters {
  investor_type?: string[]
  document_type?: string[]
  date_range?: {
    start_date?: string
    end_date?: string
  }
  tags?: string[]
  // Business metadata filters
  law_firm?: string[]
  fund_manager?: string[]
  fund_admin?: string[]
  jurisdiction?: string[]
  min_score?: number
  topK?: number
  page_range?: {
    start_page?: number
    end_page?: number
    use_entire_document?: boolean
  }
}

export interface ProcessingStatus {
  document_id: string
  // Status values match database schema (MASTER-DATABASE-SETUP.sql:116)
  // CHECK constraint: ('queued', 'processing', 'completed', 'error', 'cancelled')
  status: 'queued' | 'processing' | 'completed' | 'error' | 'cancelled'
  progress: number
  message?: string
  error?: string
}

