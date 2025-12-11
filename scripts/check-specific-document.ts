/**
 * Check specific document status
 */

/* eslint-disable no-console */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import path from 'path'

config({ path: path.join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function checkDocument() {
  const documentId = '6edb79b3-103b-4a71-b36a-6559cf8a51f1'

  console.log('🔍 Checking document status...\n')

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  // Check database
  const { data: doc, error: dbError } = await supabase
    .from('documents')
    .select('id, title, filename, file_path, status, user_id, created_at')
    .eq('id', documentId)
    .single()

  if (dbError || !doc) {
    console.log('❌ Document not found in database')
    return
  }

  console.log('📊 DATABASE:')
  console.log(`   ID: ${doc.id}`)
  console.log(`   Title: ${doc.title}`)
  console.log(`   Filename: ${doc.filename}`)
  console.log(`   File Path: ${doc.file_path}`)
  console.log(`   Status: ${doc.status}`)
  console.log(`   User ID: ${doc.user_id}`)
  console.log(`   Created: ${doc.created_at}`)
  console.log()

  // Check storage
  console.log('💾 STORAGE:')
  const userFolder = doc.file_path.split('/')[0]
  const { data: files, error: storageError } = await supabase
    .storage
    .from('documents')
    .list(userFolder)

  if (storageError) {
    console.log(`❌ Storage error: ${storageError.message}`)
  } else {
    const targetFile = files?.find(f => `${userFolder}/${f.name}` === doc.file_path)

    if (targetFile) {
      console.log(`   ✅ File exists: ${targetFile.name}`)
      console.log(`   Size: ${targetFile.metadata?.size || 'unknown'} bytes`)
    } else {
      console.log(`   ❌ FILE MISSING FROM STORAGE`)
      console.log(`\n   Expected: ${doc.file_path}`)
      console.log(`   Found ${files?.length || 0} files in folder:`)
      files?.slice(0, 10).forEach(f => console.log(`      - ${f.name}`))
      if (files && files.length > 10) {
        console.log(`      ... and ${files.length - 10} more`)
      }
    }
  }
  console.log()

  // Check if this is an orphan
  if (doc && files) {
    const targetExists = files.some(f => `${userFolder}/${f.name}` === doc.file_path)

    if (!targetExists) {
      console.log('⚠️  ORPHANED DOCUMENT DETECTED')
      console.log('   Database has a record but file is missing from storage.')
      console.log()
      console.log('💡 SOLUTION: Delete and re-upload')
      console.log(`   Document ID: ${doc.id}`)
      console.log(`   Title: ${doc.title}`)
    }
  }
}

checkDocument().catch(console.error)
