/**
 * Test Scenarios Configuration
 *
 * Define your document pairs and test scenarios here.
 * Each scenario will be automatically tested and results compared.
 */

export interface TestDocument {
  title: string;
  text: string;
}

export interface TestScenario {
  name: string;
  description: string;
  doc1: TestDocument;
  doc2: TestDocument;
  metadata?: {
    doc1_meta?: Record<string, unknown>;
    doc2_meta?: Record<string, unknown>;
  };
}

export interface SearchParameters {
  stage0_topK: number;
  stage1_topK: number;
  stage1_enabled: boolean;
  stage1_neighborsPerChunk?: number;
  stage2_parallelWorkers?: number;
  stage2_threshold?: number;
  source_min_score: number;
  target_min_score: number;
  topK: number;
  filters?: {
    document_type?: string;
    jurisdiction?: string;
    page_range?: {
      use_entire_document: boolean;
      start_page: number;
      end_page: number;
    };
    [key: string]: unknown;
  };
}

export interface ParameterVariation {
  name: string;
  params: SearchParameters;
}

export interface TestConfig {
  api_base_url: string;
  test_email: string;
  test_password: string;
  max_wait_seconds: number;
  output_dir: string;
  save_pdfs: boolean;
}

// ============================================================================
// TEST SCENARIOS
// ============================================================================

export const TEST_SCENARIOS: TestScenario[] = [
  {
    name: 'Partnership vs Fund - Original',
    description: 'Original sample documents comparing Partnership/Investor vs Fund/Subscriber clauses',
    doc1: {
      title: 'Partnership-Investor-Clause',
      text: `As of the date hereof and at all times through the final liquidation of the Partnership, either:
(i)  The Investor is not an entity (including a partnership, limited liability company or other entity (including a non-U.S. entity)) treated as a partnership, grantor trust or Subchapter S corporation for U.S. federal income tax purposes, or  (ii)  (1) substantially all of the value of any Beneficial Owner's interest in the Investor is not (and will not be) attributable to the Investor's interest (direct or indirect) in the Partnership and (2) permitting the Partnership to satisfy the 100- partner limitation set forth in Treasury Regulations Section 1.7704-1(h)(1)(ii) is not a principal purpose of the use of the tiered arrangement, in each case, within the meaning of Treasury Regulations Section 1.7704-1(h)(3)(ii).
If the Investor is an entity disregarded as separate from its owner for U.S. federal income tax purposes (a "Disregarded Entity"), the Investor represents and warrants that the representations in this paragraph 5(u) would be true if all references to "the Investor" were replaced with "the first direct or indirect Beneficial Owner of the Investor that is not a Disregarded Entity." `,
    },
    doc2: {
      title: 'Fund-Subscriber-Clause',
      text: `As of the date hereof and at all times through the final liquidation of the Fund, either:
(i)  The Subscriber is not an entity (including a partnership, limited liability company or other entity) treated as a partnership, grantor trust or Subchapter S corporation for U.S. federal income tax purposes, or  (ii)  (1) substantially all of the value of any Beneficial Owner's interest in the Subscriber is not (and will not be) attributable to the Subscriber's interest in the Fund and (2) permitting the Fund to satisfy the 100- partner limitation set forth in Treasury Regulations Section 1.7704-1(h)(1)(ii) is not a principal purpose of the use of the tiered arrangement, in each case, within the meaning of Treasury Regulations Section 1.7704-1(h)(3)(ii).
If the Subscriber is an entity disregarded as separate from its owner for U.S. federal income tax purposes (a "Disregarded Entity"), the Subscriber represents and warrants that the representations in this paragraph 5(u) would be true if all references to "the Subscriber" were replaced with "the first direct or indirect Beneficial Owner of the Investor that is not a Disregarded Entity." `,
    },
    metadata: {
      doc1_meta: { document_type: 'partnership_agreement', jurisdiction: 'DE' },
      doc2_meta: { document_type: 'fund_agreement', jurisdiction: 'DE' },
    },
  },

  // Add more scenarios below:
  // {
  //   name: 'Scenario 2: Minor Variations',
  //   description: 'Testing with minor word changes',
  //   doc1: {
  //     title: 'Document-A',
  //     text: 'Your document text here...',
  //   },
  //   doc2: {
  //     title: 'Document-B',
  //     text: 'Your modified document text here...',
  //   },
  //   metadata: {
  //     doc1_meta: {},
  //     doc2_meta: {},
  //   },
  // },
];

// ============================================================================
// SEARCH PARAMETERS
// ============================================================================

export const SEARCH_PARAMETERS: SearchParameters = {
  // Stage 0: Centroid-based candidate retrieval
  stage0_topK: 600, // Number of candidates from centroid search

  // Stage 1: Chunk-level prefiltering
  stage1_topK: 250, // Number of candidates after chunk prefilter
  stage1_enabled: true, // Set to false to skip Stage 1
  stage1_neighborsPerChunk: 45, // Neighbors per chunk in prefilter

  // Stage 2: Final adaptive scoring
  stage2_parallelWorkers: 28, // Number of parallel workers
  stage2_threshold: 0.9, // Cosine similarity threshold (0.0-1.0)

  // Result filtering
  source_min_score: 0.0, // Minimum source coverage score (0.0-1.0)
  target_min_score: 0.0, // Minimum target coverage score (0.0-1.0)
  topK: 10, // Maximum number of results to return

  // Optional filters
  filters: {
    // document_type: 'contract',
    // jurisdiction: 'NY',
    // page_range: {
    //   use_entire_document: false,
    //   start_page: 1,
    //   end_page: 10,
    // },
  },
};

// ============================================================================
// PARAMETER VARIATIONS
// ============================================================================

export const PARAMETER_VARIATIONS: ParameterVariation[] = [
  // Default parameters
  {
    name: 'Default (Threshold 0.90)',
    params: { ...SEARCH_PARAMETERS },
  },

  // Uncomment to test different configurations:

  // More lenient matching
  // {
  //   name: 'Lenient (Threshold 0.75)',
  //   params: {
  //     ...SEARCH_PARAMETERS,
  //     stage2_threshold: 0.75,
  //     source_min_score: 0.5,
  //     target_min_score: 0.5,
  //   },
  // },

  // Stricter matching
  // {
  //   name: 'Strict (Threshold 0.95)',
  //   params: {
  //     ...SEARCH_PARAMETERS,
  //     stage2_threshold: 0.95,
  //     source_min_score: 0.8,
  //     target_min_score: 0.8,
  //   },
  // },

  // Skip Stage 1 for comparison
  // {
  //   name: 'No Stage 1 Prefilter',
  //   params: {
  //     ...SEARCH_PARAMETERS,
  //     stage1_enabled: false,
  //   },
  // },
];

// ============================================================================
// CONFIGURATION
// ============================================================================

export const CONFIG: TestConfig = {
  api_base_url: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  test_email: process.env.TEST_USER_EMAIL || 'test@anduintransact.com',
  test_password: process.env.TEST_USER_PASSWORD || 'test123456',
  max_wait_seconds: 120,
  output_dir: 'test_results',
  save_pdfs: false, // Set to true to keep generated PDFs
};
