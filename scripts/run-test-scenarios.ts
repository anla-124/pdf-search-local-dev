#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Test Runner for Document Variation Testing
 *
 * Runs all test scenarios defined in test-scenarios.config.ts and generates
 * a comprehensive comparison report.
 *
 * Usage:
 *   npm run test:scenarios
 *   OR
 *   tsx scripts/run-test-scenarios.ts
 */

import { chromium } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  TEST_SCENARIOS,
  PARAMETER_VARIATIONS,
  CONFIG,
  type TestScenario,
  type ParameterVariation,
  type SearchParameters,
} from './test-scenarios.config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local
config({ path: path.join(__dirname, '..', '.env.local') });

// ============================================================================
// TYPES
// ============================================================================

interface DocumentResponse {
  id: string;
  title: string;
  jobId: string;
}

interface DocumentStatus {
  id: string;
  title: string;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  processing_error?: string;
}

interface SimilarityResult {
  document: {
    id: string;
    title: string;
    filename: string;
    page_count: number;
  };
  scores: {
    sourceScore: number;
    targetScore: number;
    matchedSourceCharacters: number;
    matchedTargetCharacters: number;
    lengthRatio: number;
    explanation: string;
  };
  matchedChunks: number;
  sections?: Array<{
    docA_pageRange: string;
    docB_pageRange: string;
    avgScore: number;
    chunkCount: number;
    reusable?: boolean;
  }>;
}

interface SimilaritySearchResponse {
  document_title: string;
  total_results: number;
  results: SimilarityResult[];
  timing: {
    stage0_ms: number;
    stage1_ms: number;
    stage2_ms: number;
    total_ms: number;
  };
}

interface TestResult {
  scenario: string;
  parameter_set: string;
  description: string;
  doc1_title: string;
  doc2_title: string;
  doc1_id: string;
  doc2_id: string;
  parameters: SearchParameters;
  results_1to2: SimilaritySearchResponse;
  results_2to1: SimilaritySearchResponse;
  timestamp: string;
}

// ============================================================================
// COLORS
// ============================================================================

const Colors = {
  HEADER: '\x1b[95m',
  BLUE: '\x1b[94m',
  CYAN: '\x1b[96m',
  GREEN: '\x1b[92m',
  YELLOW: '\x1b[93m',
  RED: '\x1b[91m',
  END: '\x1b[0m',
  BOLD: '\x1b[1m',
};

// ============================================================================
// TEST RUNNER CLASS
// ============================================================================

class TestRunner {
  private accessToken: string = '';
  private results: TestResult[] = [];
  private outputDir: string;

  constructor() {
    this.outputDir = path.join(__dirname, '..', CONFIG.output_dir);
  }

  private log(message: string, color?: string): void {
    if (color) {
      console.log(`${color}${message}${Colors.END}`);
    } else {
      console.log(message);
    }
  }

  async createPDF(
    text: string,
    filename: string,
    metadata?: Record<string, unknown>
  ): Promise<string> {
    this.log(`  Creating PDF: ${filename}`, Colors.CYAN);

    const filepath = path.join(this.outputDir, filename);

    // Create HTML content
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page {
      size: Letter;
      margin: 1in;
    }
    body {
      font-family: 'Times New Roman', serif;
      font-size: 12pt;
      line-height: 1.6;
      max-width: 6.5in;
    }
    h1 {
      font-size: 14pt;
      font-weight: bold;
      margin-bottom: 20px;
    }
    .metadata {
      font-size: 10pt;
      color: #666;
      margin-bottom: 20px;
      border-bottom: 1px solid #ccc;
      padding-bottom: 10px;
    }
    .metadata-item {
      margin: 5px 0;
    }
    p {
      margin: 12px 0;
      text-align: justify;
    }
  </style>
</head>
<body>
  <h1>${filename.replace('.pdf', '').replace(/-/g, ' ')}</h1>
  ${
    metadata
      ? `
  <div class="metadata">
    ${Object.entries(metadata)
      .map(
        ([key, value]) =>
          `<div class="metadata-item"><strong>${key}:</strong> ${value}</div>`
      )
      .join('')}
  </div>
  `
      : ''
  }
  ${text
    .split('\n')
    .filter((p) => p.trim())
    .map((p) => `<p>${p.trim()}</p>`)
    .join('\n')}
</body>
</html>
    `.trim();

    // Use Playwright to generate PDF
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.setContent(html);
    await page.pdf({
      path: filepath,
      format: 'Letter',
      printBackground: true,
    });
    await browser.close();

    return filepath;
  }

  async login(): Promise<void> {
    this.log('\nAuthenticating...', Colors.BLUE);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase environment variables not found');
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Sign in with test user
    const { data, error } = await supabase.auth.signInWithPassword({
      email: CONFIG.test_email,
      password: CONFIG.test_password,
    });

    if (error || !data.session) {
      throw new Error(`Failed to sign in test user: ${error?.message || 'No session returned'}`);
    }

    this.accessToken = data.session.access_token;
    this.log('✓ Authenticated successfully', Colors.GREEN);
  }

  async uploadDocument(
    pdfPath: string,
    metadata?: Record<string, unknown>
  ): Promise<string> {
    const filename = path.basename(pdfPath);
    this.log(`  Uploading: ${filename}`, Colors.CYAN);

    const fileBuffer = await fs.readFile(pdfPath);
    const formData = new FormData();
    formData.append('file', new Blob([fileBuffer], { type: 'application/pdf' }), filename);

    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata));
    }

    const response = await fetch(`${CONFIG.api_base_url}/api/documents/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Upload failed: ${response.status} ${error}`);
    }

    const result = (await response.json()) as DocumentResponse;
    this.log(`  ✓ Uploaded: ${result.id}`, Colors.GREEN);
    return result.id;
  }

  async waitForProcessing(docId: string): Promise<void> {
    this.log(`  Waiting for processing: ${docId}`, Colors.CYAN);

    const startTime = Date.now();
    let lastStatus: string | null = null;

    while (Date.now() - startTime < CONFIG.max_wait_seconds * 1000) {
      const response = await fetch(`${CONFIG.api_base_url}/api/documents`, {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      });

      if (!response.ok) {
        throw new Error(`Failed to get document status: ${response.status}`);
      }

      const { data } = await response.json();
      const doc = data.find((d: DocumentStatus) => d.id === docId);

      if (!doc) {
        throw new Error(`Document ${docId} not found`);
      }

      if (doc.status !== lastStatus) {
        this.log(`    Status: ${doc.status}`, Colors.YELLOW);
        lastStatus = doc.status;
      }

      if (doc.status === 'completed') {
        this.log('  ✓ Processing completed', Colors.GREEN);
        return;
      } else if (doc.status === 'error') {
        throw new Error(`Processing failed: ${doc.processing_error || 'Unknown error'}`);
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    throw new Error('Processing timeout');
  }

  async runSimilaritySearch(
    sourceDocId: string,
    params: SearchParameters
  ): Promise<SimilaritySearchResponse> {
    this.log('  Running similarity search...', Colors.CYAN);

    const response = await fetch(
      `${CONFIG.api_base_url}/api/documents/${sourceDocId}/similar-v2`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Search failed: ${response.status} ${error}`);
    }

    const result = (await response.json()) as SimilaritySearchResponse;
    this.log(
      `  ✓ Search completed in ${result.timing.total_ms}ms`,
      Colors.GREEN
    );
    return result;
  }

  displayQuickSummary(
    results1to2: SimilaritySearchResponse,
    results2to1: SimilaritySearchResponse,
    scenario: TestScenario
  ): void {
    const { doc1, doc2 } = scenario;

    if (results1to2.results.length > 0) {
      const match = results1to2.results[0]!;
      this.log(`\n  ${doc1.title} → ${doc2.title}:`, Colors.CYAN);
      this.log(`    Source Coverage: ${(match.scores.sourceScore * 100).toFixed(1)}%`);
      this.log(`    Target Coverage: ${(match.scores.targetScore * 100).toFixed(1)}%`);
      this.log(`    Matched Chunks: ${match.matchedChunks}`);
      this.log(`    Length Ratio: ${(match.scores.lengthRatio * 100).toFixed(1)}%`);
    } else {
      this.log(`\n  ${doc1.title} → ${doc2.title}: No matches found`, Colors.YELLOW);
    }

    if (results2to1.results.length > 0) {
      const match = results2to1.results[0]!;
      this.log(`\n  ${doc2.title} → ${doc1.title}:`, Colors.CYAN);
      this.log(`    Source Coverage: ${(match.scores.sourceScore * 100).toFixed(1)}%`);
      this.log(`    Target Coverage: ${(match.scores.targetScore * 100).toFixed(1)}%`);
      this.log(`    Matched Chunks: ${match.matchedChunks}`);
      this.log(`    Length Ratio: ${(match.scores.lengthRatio * 100).toFixed(1)}%`);
    } else {
      this.log(`\n  ${doc2.title} → ${doc1.title}: No matches found`, Colors.YELLOW);
    }
  }

  async runScenario(
    scenario: TestScenario,
    paramVariation: ParameterVariation
  ): Promise<TestResult | null> {
    const scenarioName = scenario.name;
    const paramName = paramVariation.name;

    this.log('\n' + '='.repeat(80), Colors.BOLD);
    this.log(`SCENARIO: ${scenarioName}`, Colors.HEADER);
    this.log(`PARAMETERS: ${paramName}`, Colors.HEADER);
    this.log('='.repeat(80), Colors.BOLD);
    this.log(`Description: ${scenario.description}`);

    try {
      // Create PDFs
      this.log('\n[1/5] Creating PDFs...', Colors.BLUE);
      const pdf1Path = await this.createPDF(
        scenario.doc1.text,
        `${scenario.doc1.title}.pdf`,
        scenario.metadata?.doc1_meta
      );
      const pdf2Path = await this.createPDF(
        scenario.doc2.text,
        `${scenario.doc2.title}.pdf`,
        scenario.metadata?.doc2_meta
      );

      // Upload documents
      this.log('\n[2/5] Uploading documents...', Colors.BLUE);
      const doc1Id = await this.uploadDocument(pdf1Path, scenario.metadata?.doc1_meta);
      const doc2Id = await this.uploadDocument(pdf2Path, scenario.metadata?.doc2_meta);

      // Wait for processing
      this.log('\n[3/5] Processing documents...', Colors.BLUE);
      await this.waitForProcessing(doc1Id);
      await this.waitForProcessing(doc2Id);

      // Run similarity searches
      this.log('\n[4/5] Running similarity searches...', Colors.BLUE);

      this.log(
        `\n  Direction: ${scenario.doc1.title} → ${scenario.doc2.title}`,
        Colors.CYAN
      );
      const results1to2 = await this.runSimilaritySearch(doc1Id, paramVariation.params);

      this.log(
        `\n  Direction: ${scenario.doc2.title} → ${scenario.doc1.title}`,
        Colors.CYAN
      );
      const results2to1 = await this.runSimilaritySearch(doc2Id, paramVariation.params);

      // Store results
      const resultData: TestResult = {
        scenario: scenarioName,
        parameter_set: paramName,
        description: scenario.description,
        doc1_title: scenario.doc1.title,
        doc2_title: scenario.doc2.title,
        doc1_id: doc1Id,
        doc2_id: doc2Id,
        parameters: paramVariation.params,
        results_1to2: results1to2,
        results_2to1: results2to1,
        timestamp: new Date().toISOString(),
      };

      this.results.push(resultData);

      // Display summary
      this.log('\n[5/5] Results Summary:', Colors.BLUE);
      this.displayQuickSummary(results1to2, results2to1, scenario);

      // Cleanup PDFs if not needed
      if (!CONFIG.save_pdfs) {
        await fs.unlink(pdf1Path);
        await fs.unlink(pdf2Path);
      }

      return resultData;
    } catch (error) {
      this.log(
        `\n✗ Scenario failed: ${error instanceof Error ? error.message : String(error)}`,
        Colors.RED
      );
      return null;
    }
  }

  async generateReport(): Promise<{ reportFile: string; jsonFile: string }> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const reportFile = path.join(this.outputDir, `test_report_${timestamp}.txt`);
    const jsonFile = path.join(this.outputDir, `test_results_${timestamp}.json`);

    // Save raw JSON
    await fs.writeFile(jsonFile, JSON.stringify(this.results, null, 2));
    this.log(`\n✓ Raw results saved to: ${jsonFile}`, Colors.GREEN);

    // Generate text report
    const lines: string[] = [];
    lines.push('='.repeat(100));
    lines.push('DOCUMENT VARIATION TEST REPORT');
    lines.push('='.repeat(100));
    lines.push(`\nGenerated: ${new Date().toLocaleString()}`);
    lines.push(`Total Scenarios: ${this.results.length}`);
    lines.push('\n' + '='.repeat(100) + '\n');

    for (const [idx, result] of this.results.entries()) {
      if (!result) continue;

      lines.push('\n' + '='.repeat(100));
      lines.push(`TEST ${idx + 1}: ${result.scenario} - ${result.parameter_set}`);
      lines.push('='.repeat(100));
      lines.push(`\nDescription: ${result.description}`);
      lines.push(`Document 1: ${result.doc1_title}`);
      lines.push(`Document 2: ${result.doc2_title}`);
      lines.push('\nParameters Used:');
      for (const [key, value] of Object.entries(result.parameters)) {
        if (key !== 'filters') {
          lines.push(`  ${key}: ${value}`);
        }
      }

      // Direction 1 → 2
      lines.push('\n' + '-'.repeat(100));
      lines.push(`COMPARISON: ${result.doc1_title} → ${result.doc2_title}`);
      lines.push('-'.repeat(100));

      if (result.results_1to2.results.length > 0) {
        for (const [rank, match] of result.results_1to2.results.entries()) {
          lines.push(`\nRank ${rank + 1}: ${match.document.title}`);
          lines.push(`  Source Coverage: ${(match.scores.sourceScore * 100).toFixed(2)}%`);
          lines.push(`  Target Coverage: ${(match.scores.targetScore * 100).toFixed(2)}%`);
          lines.push(`  Matched Chunks: ${match.matchedChunks}`);
          lines.push(`  Length Ratio: ${(match.scores.lengthRatio * 100).toFixed(2)}%`);
          lines.push(
            `  Matched Source Chars: ${match.scores.matchedSourceCharacters.toLocaleString()}`
          );
          lines.push(
            `  Matched Target Chars: ${match.scores.matchedTargetCharacters.toLocaleString()}`
          );

          if (match.sections && match.sections.length > 0) {
            lines.push('\n  Matched Sections:');
            for (const section of match.sections) {
              const reusable = section.reusable ? '✓ REUSABLE' : '';
              lines.push(
                `    Pages ${section.docA_pageRange} ↔ ${section.docB_pageRange} ` +
                  `(avg: ${(section.avgScore * 100).toFixed(1)}%, chunks: ${section.chunkCount}) ${reusable}`
              );
            }
          }

          lines.push(`\n  ${match.scores.explanation}`);
        }
      } else {
        lines.push('\nNo matches found.');
      }

      lines.push('\nTiming:');
      lines.push(`  Stage 0: ${result.results_1to2.timing.stage0_ms}ms`);
      lines.push(`  Stage 1: ${result.results_1to2.timing.stage1_ms}ms`);
      lines.push(`  Stage 2: ${result.results_1to2.timing.stage2_ms}ms`);
      lines.push(`  Total: ${result.results_1to2.timing.total_ms}ms`);

      // Direction 2 → 1
      lines.push('\n' + '-'.repeat(100));
      lines.push(`COMPARISON: ${result.doc2_title} → ${result.doc1_title}`);
      lines.push('-'.repeat(100));

      if (result.results_2to1.results.length > 0) {
        for (const [rank, match] of result.results_2to1.results.entries()) {
          lines.push(`\nRank ${rank + 1}: ${match.document.title}`);
          lines.push(`  Source Coverage: ${(match.scores.sourceScore * 100).toFixed(2)}%`);
          lines.push(`  Target Coverage: ${(match.scores.targetScore * 100).toFixed(2)}%`);
          lines.push(`  Matched Chunks: ${match.matchedChunks}`);
          lines.push(`  Length Ratio: ${(match.scores.lengthRatio * 100).toFixed(2)}%`);
          lines.push(
            `  Matched Source Chars: ${match.scores.matchedSourceCharacters.toLocaleString()}`
          );
          lines.push(
            `  Matched Target Chars: ${match.scores.matchedTargetCharacters.toLocaleString()}`
          );

          if (match.sections && match.sections.length > 0) {
            lines.push('\n  Matched Sections:');
            for (const section of match.sections) {
              const reusable = section.reusable ? '✓ REUSABLE' : '';
              lines.push(
                `    Pages ${section.docA_pageRange} ↔ ${section.docB_pageRange} ` +
                  `(avg: ${(section.avgScore * 100).toFixed(1)}%, chunks: ${section.chunkCount}) ${reusable}`
              );
            }
          }

          lines.push(`\n  ${match.scores.explanation}`);
        }
      } else {
        lines.push('\nNo matches found.');
      }

      lines.push('\nTiming:');
      lines.push(`  Stage 0: ${result.results_2to1.timing.stage0_ms}ms`);
      lines.push(`  Stage 1: ${result.results_2to1.timing.stage1_ms}ms`);
      lines.push(`  Stage 2: ${result.results_2to1.timing.stage2_ms}ms`);
      lines.push(`  Total: ${result.results_2to1.timing.total_ms}ms`);

      lines.push('');
    }

    lines.push('\n' + '='.repeat(100));
    lines.push('END OF REPORT');
    lines.push('='.repeat(100));

    await fs.writeFile(reportFile, lines.join('\n'));
    this.log(`✓ Detailed report saved to: ${reportFile}`, Colors.GREEN);

    return { reportFile, jsonFile };
  }

  async runAll(): Promise<void> {
    this.log('\n' + '='.repeat(100), Colors.BOLD);
    this.log('STARTING DOCUMENT VARIATION TESTS', Colors.HEADER);
    this.log('='.repeat(100), Colors.BOLD);
    this.log(`\nTotal Scenarios: ${TEST_SCENARIOS.length}`, Colors.CYAN);
    this.log(`Parameter Variations: ${PARAMETER_VARIATIONS.length}`, Colors.CYAN);
    this.log(
      `Total Tests: ${TEST_SCENARIOS.length * PARAMETER_VARIATIONS.length}`,
      Colors.CYAN
    );

    try {
      // Create output directory
      await fs.mkdir(this.outputDir, { recursive: true });

      // Login once
      await this.login();

      // Run each scenario with each parameter variation
      for (const scenario of TEST_SCENARIOS) {
        for (const paramVariation of PARAMETER_VARIATIONS) {
          await this.runScenario(scenario, paramVariation);
        }
      }

      // Generate report
      this.log('\n' + '='.repeat(100), Colors.BOLD);
      this.log('GENERATING FINAL REPORT', Colors.HEADER);
      this.log('='.repeat(100), Colors.BOLD);

      const { reportFile, jsonFile } = await this.generateReport();

      this.log('\n' + '='.repeat(100), Colors.BOLD);
      this.log('ALL TESTS COMPLETED SUCCESSFULLY', Colors.GREEN);
      this.log('='.repeat(100), Colors.BOLD);
      this.log(`\nResults saved in: ${this.outputDir}/`, Colors.GREEN);
      this.log(`  - Detailed report: ${path.basename(reportFile)}`, Colors.CYAN);
      this.log(`  - JSON data: ${path.basename(jsonFile)}`, Colors.CYAN);
    } catch (error) {
      this.log(
        `\n✗ Test run failed: ${error instanceof Error ? error.message : String(error)}`,
        Colors.RED
      );
      if (error instanceof Error && error.stack) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const runner = new TestRunner();
  await runner.runAll();
}

main();
