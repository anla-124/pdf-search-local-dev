/**
 * Keyword Search Results Component
 *
 * Displays keyword search results with document matches, page numbers,
 * and highlighted excerpts.
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { KeywordSearchResult } from '@/types/search'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileText, Eye, ChevronDown, ChevronUp } from 'lucide-react'

interface KeywordResultsProps {
  results: KeywordSearchResult[]
  query: string
  isLoading?: boolean
  onViewDocument?: (documentId: string, pageNumber?: number) => void
}

export function KeywordResults({
  results,
  query,
  isLoading = false,
  onViewDocument
}: KeywordResultsProps) {
  const router = useRouter()
  const [expandedDocs, setExpandedDocs] = useState<Set<string>>(new Set())

  /**
   * Toggle expansion of a document's matches
   */
  const toggleExpanded = (documentId: string) => {
    const newExpanded = new Set(expandedDocs)
    if (newExpanded.has(documentId)) {
      newExpanded.delete(documentId)
    } else {
      newExpanded.add(documentId)
    }
    setExpandedDocs(newExpanded)
  }

  /**
   * Sanitize HTML excerpt to prevent XSS while preserving <b> tags
   * ts_headline() returns excerpts with <b> tags for highlighting
   */
  const sanitizeExcerpt = (excerpt: string): string => {
    return excerpt
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      .replace(/&lt;b&gt;/g, '<strong>')
      .replace(/&lt;\/b&gt;/g, '</strong>')
  }

  /**
   * Handle viewing a document at a specific page
   */
  const handleViewPage = (documentId: string, pageNumber: number) => {
    if (onViewDocument) {
      onViewDocument(documentId, pageNumber)
    } else {
      // Default: navigate to document view page with page number
      router.push(`/documents/${documentId}?page=${pageNumber}`)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Searching for &quot;{query}&quot;...</p>
        </CardContent>
      </Card>
    )
  }

  if (results.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
          <p className="text-gray-600">
            No documents contain the keyword{query.includes(' ') ? 's' : ''} &quot;{query}&quot;
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Try different keywords or check your spelling
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4 keyword-results">
      {/* Results Summary */}
      <div className="text-sm text-gray-600">
        Found {results.length} document{results.length !== 1 ? 's' : ''} matching &quot;{query}&quot;
      </div>

      {/* Results List */}
      {results.map((doc) => {
        const isExpanded = expandedDocs.has(doc.documentId)
        const visibleMatches = isExpanded ? doc.matches : doc.matches.slice(0, 1)

        return (
          <Card key={doc.documentId} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="h-5 w-5 text-blue-600 flex-shrink-0" />
                    <CardTitle className="text-lg truncate">
                      {doc.title}
                    </CardTitle>
                  </div>
                  <p className="text-sm text-gray-500 truncate">{doc.filename}</p>
                </div>
                <Badge variant="secondary" className="flex-shrink-0">
                  {doc.totalMatches} match{doc.totalMatches !== 1 ? 'es' : ''}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              {/* Matches */}
              <div className="space-y-3">
                {visibleMatches.map((match, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-xs">
                            Page {match.pageNumber}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            Relevance: {(match.score * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div
                          className="text-sm text-gray-700 leading-relaxed"
                          dangerouslySetInnerHTML={{
                            __html: sanitizeExcerpt(match.excerpt)
                          }}
                          style={{
                            // Style for highlighted keywords
                            '--highlight-bg': '#fef3c7',
                            '--highlight-text': '#92400e'
                          } as React.CSSProperties}
                        />
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleViewPage(doc.documentId, match.pageNumber)}
                        className="flex-shrink-0"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Show More/Less Button */}
              {doc.matches.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleExpanded(doc.documentId)}
                  className="w-full mt-3 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-1" />
                      Show less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-1" />
                      Show {doc.matches.length - 1} more match
                      {doc.matches.length - 1 !== 1 ? 'es' : ''}
                    </>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
        )
      })}

      {/* CSS for highlighted keywords */}
      <style jsx global>{`
        .keyword-results strong {
          background-color: #fef3c7;
          color: #92400e;
          font-weight: 600;
          padding: 1px 2px;
          border-radius: 2px;
        }
      `}</style>
    </div>
  )
}
