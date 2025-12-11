/**
 * Check if a file exists in storage and database
 */

/* eslint-disable no-console */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import path from 'path'

config({ path: path.join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function checkFileStorage() {
  const filePath = 'cc9a3d26-78dd-41ec-a88c-eb366ab50fb8/Aztec Verification of Identity Questionnaire - Jersey (dup) - liuliu.pdf'

  console.log('🔍 Checking file status...\n')
  console.log('File path:', filePath)
  console.log()

  const supabase = createClient(supabaseUrl, supabaseKey)

  // Check database
  console.log('📊 DATABASE CHECK:')
  const { data: docs, error: dbError } = await supabase
    .from('documents')
    .select('id, title, filename, file_path, status, user_id')
    .eq('file_path', filePath)

  if (dbError) {
    console.error('❌ Database error:', dbError.message)
  } else if (!docs || docs.length === 0) {
    console.log('❌ No database record found for this file path')
  } else {
    console.log('✅ Database record found:')
    docs.forEach(doc => {
      console.log(`   ID: ${doc.id}`)
      console.log(`   Title: ${doc.title}`)
      console.log(`   Filename: ${doc.filename}`)
      console.log(`   Status: ${doc.status}`)
      console.log(`   User ID: ${doc.user_id}`)
    })
  }
  console.log()

  // Check storage
  console.log('💾 STORAGE CHECK:')
  const { data: storageFiles, error: storageError } = await supabase
    .storage
    .from('documents')
    .list('cc9a3d26-78dd-41ec-a88c-eb366ab50fb8')

  if (storageError) {
    console.error('❌ Storage error:', storageError.message)
  } else if (!storageFiles || storageFiles.length === 0) {
    console.log('❌ No files found in this user folder')
  } else {
    console.log('✅ Files in user folder:')
    storageFiles.forEach(file => {
      const fullPath = `cc9a3d26-78dd-41ec-a88c-eb366ab50fb8/${file.name}`
      const isTarget = fullPath === filePath
      console.log(`   ${isTarget ? '→ ' : '  '}${file.name} ${isTarget ? '(TARGET FILE)' : ''}`)
    })

    const targetExists = storageFiles.some(f =>
      `cc9a3d26-78dd-41ec-a88c-eb366ab50fb8/${f.name}` === filePath
    )

    console.log()
    if (targetExists) {
      console.log('✅ TARGET FILE EXISTS IN STORAGE')
    } else {
      console.log('❌ TARGET FILE MISSING FROM STORAGE (Database/Storage mismatch!)')
    }
  }
  console.log()

  // Diagnosis
  console.log('📋 DIAGNOSIS:')
  if (docs && docs.length > 0 && storageFiles) {
    const targetExists = storageFiles.some(f =>
      `cc9a3d26-78dd-41ec-a88c-eb366ab50fb8/${f.name}` === filePath
    )

    if (!targetExists) {
      console.log('⚠️  ORPHANED DATABASE RECORD DETECTED')
      console.log('   Database has a reference to a file that no longer exists in storage.')
      console.log()
      console.log('💡 SOLUTIONS:')
      console.log('   Option 1: Delete the document record from database')
      console.log(`   Option 2: Update file_path to point to an existing file`)
      console.log('   Option 3: Re-upload the PDF')
      console.log()
      console.log('   Recommended: Delete and re-upload')
      if (docs?.[0]?.id) {
        console.log(`   Document ID: ${docs[0]!.id}`)
      }
    } else {
      console.log('✅ File exists in both database and storage')
      console.log('   The rename should work. Try again or check service role permissions.')
    }
  }
}

checkFileStorage().catch(console.error)
