/**
 * Delete orphaned document record
 */

/* eslint-disable no-console */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import path from 'path'

config({ path: path.join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function deleteOrphanedDocument() {
  const documentId = 'bbaa0952-731f-441c-b5e7-78ab27d2b923'

  console.log('🗑️  Deleting orphaned document...\n')

  const supabase = createClient(supabaseUrl, supabaseKey)

  // Get document details first
  const { data: doc, error: fetchError } = await supabase
    .from('documents')
    .select('id, title, filename, file_path')
    .eq('id', documentId)
    .single()

  if (fetchError || !doc) {
    console.log('❌ Document not found in database')
    return
  }

  console.log('Document to delete:')
  console.log(`  ID: ${doc.id}`)
  console.log(`  Title: ${doc.title}`)
  console.log(`  Filename: ${doc.filename}`)
  console.log(`  File path: ${doc.file_path}`)
  console.log()

  // Delete document (CASCADE will delete related records)
  const { error: deleteError } = await supabase
    .from('documents')
    .delete()
    .eq('id', documentId)

  if (deleteError) {
    console.error('❌ Failed to delete:', deleteError.message)
    return
  }

  console.log('✅ Document deleted successfully!')
  console.log()
  console.log('Related records also deleted:')
  console.log('  • document_embeddings (vector data)')
  console.log('  • document_content (extracted text)')
  console.log('  • processing_status (status logs)')
  console.log('  • document_jobs (processing jobs)')
  console.log()
  console.log('You can now re-upload the PDF file.')
}

deleteOrphanedDocument().catch(console.error)
