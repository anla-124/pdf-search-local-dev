/**
 * Find ALL orphaned documents (database vs storage mismatch)
 */

/* eslint-disable no-console */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import path from 'path'

config({ path: path.join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function findAllOrphaned() {
  console.log('🔍 Scanning for orphaned documents...\n')

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  // Get all documents
  const { data: docs, error: dbError } = await supabase
    .from('documents')
    .select('id, title, filename, file_path, user_id, status')
    .eq('status', 'completed')

  if (dbError) {
    console.error('❌ Database error:', dbError.message)
    return
  }

  console.log(`📊 Found ${docs?.length || 0} completed documents\n`)

  const orphaned: typeof docs = []
  const userFolderCache = new Map<string, Set<string>>()

  // Check each document
  for (const doc of docs || []) {
    const userFolder = doc.file_path.split('/')[0]

    // Get files in user folder (cached)
    if (!userFolderCache.has(userFolder)) {
      const { data: files } = await supabase
        .storage
        .from('documents')
        .list(userFolder)

      const fileSet = new Set(files?.map(f => `${userFolder}/${f.name}`) || [])
      userFolderCache.set(userFolder, fileSet)
    }

    const filesInFolder = userFolderCache.get(userFolder)!
    if (!filesInFolder.has(doc.file_path)) {
      orphaned.push(doc)
    }
  }

  console.log('=' .repeat(70))
  console.log(`📋 RESULTS: Found ${orphaned.length} orphaned document(s)\n`)

  if (orphaned.length > 0) {
    console.log('Orphaned documents:')
    orphaned.forEach((doc, i) => {
      console.log(`\n${i + 1}. ${doc.title}`)
      console.log(`   ID: ${doc.id}`)
      console.log(`   Filename: ${doc.filename}`)
      console.log(`   Expected path: ${doc.file_path}`)

      // Try to find similar files
      const userFolder = doc.file_path.split('/')[0]
      const files = userFolderCache.get(userFolder)!
      const similarFiles = Array.from(files)
        .filter(f => f.includes(doc.filename.replace('.pdf', '').substring(0, 20)))

      if (similarFiles.length > 0) {
        console.log(`   Possible matches in storage:`)
        similarFiles.forEach(f => console.log(`      - ${f.split('/')[1]}`))
      }
    })

    console.log('\n' + '=' .repeat(70))
    console.log('💡 RECOMMENDED ACTIONS:\n')
    console.log('1. Delete all orphaned documents via UI')
    console.log('2. Re-upload the PDF files')
    console.log('3. Test rename with fresh uploads (should work now!)\n')
    console.log('OR run cleanup script to delete all at once:')
    console.log('   npx tsx scripts/delete-all-orphaned.ts')
  } else {
    console.log('✅ No orphaned documents found!')
    console.log('All database records match storage files.')
  }
}

findAllOrphaned().catch(console.error)
