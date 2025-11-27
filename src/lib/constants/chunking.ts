// Sentence-based chunking constants (fallback when paragraph metadata unavailable)
export const SENTENCES_PER_CHUNK = parseInt(process.env['SENTENCES_PER_CHUNK'] ?? '4', 10)
export const SENTENCE_OVERLAP = parseInt(process.env['SENTENCE_OVERLAP'] ?? '1', 10)

// Paragraph-based chunking constants (primary approach)
// Greedy algorithm uses character-based limits for strict enforcement
export const MIN_CHUNK_CHARACTERS = parseInt(process.env['MIN_CHUNK_CHARACTERS'] ?? '320', 10) 
export const MAX_CHUNK_CHARACTERS = parseInt(process.env['MAX_CHUNK_CHARACTERS'] ?? '1000', 10)