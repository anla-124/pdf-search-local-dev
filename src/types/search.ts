/**
 * Search Types
 *
 * Type definitions for document search functionality including
 * keyword-based content search and semantic similarity search.
 */

// ============================================================================
// SEARCH MODES
// ============================================================================

/**
 * Available search modes in the application
 */
export enum SearchMode {
  /** Search by document name/title (existing functionality) */
  DOCUMENT_NAME = 'name',
  /** Search by keyword in document content (new feature) */
  KEYWORD_CONTENT = 'content',
  /** Semantic similarity search using vector embeddings */
  SIMILARITY = 'similarity'
}

// ============================================================================
// KEYWORD SEARCH
// ============================================================================

/**
 * Request parameters for keyword search API
 */
export interface KeywordSearchRequest {
  /** Search query string (keywords or phrases) */
  query: string
  /** Maximum number of matching pages to return per document (default: 3) */
  maxPagesPerDoc?: number
  /** Maximum number of documents to return (default: 20) */
  maxDocuments?: number
}

/**
 * A single keyword match within a document
 * Represents one page with matching content and its excerpt
 */
export interface KeywordMatch {
  /** Page number where the keyword was found */
  pageNumber: number
  /** Text excerpt containing the keyword (150-200 chars with highlighting) */
  excerpt: string
  /** Relevance score (0.0 to 1.0, higher is more relevant) */
  score: number
}

/**
 * Search result for a single document
 * Contains document metadata and all matching pages (up to maxPagesPerDoc)
 */
export interface KeywordSearchResult {
  /** Unique document identifier */
  documentId: string
  /** Document title */
  title: string
  /** Original filename */
  filename: string
  /** Total number of pages with matches (may be > matches.length if limited) */
  totalMatches: number
  /** Array of matching pages with excerpts (limited to maxPagesPerDoc) */
  matches: KeywordMatch[]
  /** Document creation timestamp (optional) */
  created_at?: string
  /** Additional document metadata (optional) */
  metadata?: Record<string, unknown>
}

/**
 * Complete response from keyword search API
 */
export interface KeywordSearchResponse {
  /** Array of matching documents */
  results: KeywordSearchResult[]
  /** Original search query */
  query: string
  /** Total number of documents returned */
  total: number
}

// ============================================================================
// DATABASE TYPES
// ============================================================================

/**
 * Row returned from search_document_keywords() stored function
 * Maps directly to PostgreSQL function output
 */
export interface KeywordSearchDBRow {
  document_id: string
  title: string
  filename: string
  total_matches: number
  matches: {
    pageNumber: number
    excerpt: string
    score: number
  }[]
}
