/**
 * Mock implementation of Document AI for unit testing
 *
 * Provides realistic responses without hitting the actual Google Cloud API
 */

export interface MockDocumentAIResponse {
  text: string
  pages: Array<{
    pageNumber: number
    blocks: Array<{
      layout: {
        textAnchor: {
          textSegments: Array<{
            startIndex: string
            endIndex: string
          }>
        }
        confidence: number
        boundingPoly: {
          normalizedVertices: Array<{
            x: number
            y: number
          }>
        }
      }
      paragraphs: Array<{
        layout: {
          textAnchor: {
            textSegments: Array<{
              startIndex: string
              endIndex: string
            }>
          }
          confidence: number
        }
      }>
    }>
  }>
}

export class MockDocumentAI {
  /**
   * Mock OCR processing - returns pre-defined text based on filename
   */
  static async processDocument(
    filePath: string,
    _mimeType: string
  ): Promise<MockDocumentAIResponse> {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 100))

    // Return mock response based on filename pattern
    if (filePath.includes('contract')) {
      return MockDocumentAI.getMockContractResponse()
    } else if (filePath.includes('invoice')) {
      return MockDocumentAI.getMockInvoiceResponse()
    } else {
      return MockDocumentAI.getMockGenericResponse()
    }
  }

  /**
   * Mock response for contract documents
   */
  private static getMockContractResponse(): MockDocumentAIResponse {
    const text = `AGREEMENT

This Contract Agreement ("Agreement") is entered into as of January 1, 2024, by and between Company A ("Party A") and Company B ("Party B").

1. PURPOSE
The purpose of this Agreement is to establish the terms and conditions under which Party A will provide services to Party B.

2. TERM
This Agreement shall commence on the Effective Date and continue for a period of twelve (12) months.

3. COMPENSATION
Party B agrees to pay Party A the sum of $10,000 per month for the services rendered.`

    return {
      text,
      pages: [{
        pageNumber: 1,
        blocks: [{
          layout: {
            textAnchor: {
              textSegments: [{ startIndex: '0', endIndex: String(text.length) }]
            },
            confidence: 0.95,
            boundingPoly: {
              normalizedVertices: [
                { x: 0.1, y: 0.1 },
                { x: 0.9, y: 0.1 },
                { x: 0.9, y: 0.9 },
                { x: 0.1, y: 0.9 }
              ]
            }
          },
          paragraphs: [{
            layout: {
              textAnchor: {
                textSegments: [{ startIndex: '0', endIndex: String(text.length) }]
              },
              confidence: 0.95
            }
          }]
        }]
      }]
    }
  }

  /**
   * Mock response for invoice documents
   */
  private static getMockInvoiceResponse(): MockDocumentAIResponse {
    const text = `INVOICE

Invoice Number: INV-2024-001
Date: January 15, 2024

Bill To:
Acme Corporation
123 Business Street
New York, NY 10001

Services Rendered:
- Consulting Services (10 hours @ $150/hr): $1,500
- Software Development (20 hours @ $200/hr): $4,000

Total Amount Due: $5,500

Payment Terms: Net 30 days`

    return {
      text,
      pages: [{
        pageNumber: 1,
        blocks: [{
          layout: {
            textAnchor: {
              textSegments: [{ startIndex: '0', endIndex: String(text.length) }]
            },
            confidence: 0.98,
            boundingPoly: {
              normalizedVertices: [
                { x: 0.1, y: 0.1 },
                { x: 0.9, y: 0.1 },
                { x: 0.9, y: 0.9 },
                { x: 0.1, y: 0.9 }
              ]
            }
          },
          paragraphs: [{
            layout: {
              textAnchor: {
                textSegments: [{ startIndex: '0', endIndex: String(text.length) }]
              },
              confidence: 0.98
            }
          }]
        }]
      }]
    }
  }

  /**
   * Mock response for generic documents
   */
  private static getMockGenericResponse(): MockDocumentAIResponse {
    const text = `This is a test document for integration testing purposes. It contains sample text to verify document processing functionality.`

    return {
      text,
      pages: [{
        pageNumber: 1,
        blocks: [{
          layout: {
            textAnchor: {
              textSegments: [{ startIndex: '0', endIndex: String(text.length) }]
            },
            confidence: 0.92,
            boundingPoly: {
              normalizedVertices: [
                { x: 0.1, y: 0.1 },
                { x: 0.9, y: 0.1 },
                { x: 0.9, y: 0.9 },
                { x: 0.1, y: 0.9 }
              ]
            }
          },
          paragraphs: [{
            layout: {
              textAnchor: {
                textSegments: [{ startIndex: '0', endIndex: String(text.length) }]
              },
              confidence: 0.92
            }
          }]
        }]
      }]
    }
  }
}
