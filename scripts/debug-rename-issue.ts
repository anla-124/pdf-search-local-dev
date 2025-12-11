/**
 * Debug rename issue - check storage permissions and service client
 */

/* eslint-disable no-console */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import path from 'path'

config({ path: path.join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function debugRenameIssue() {
  const filePath = 'cc9a3d26-78dd-41ec-a88c-eb366ab50fb8/1765427832270-k1pqu13mb.pdf'

  console.log('🔍 DEBUGGING RENAME ISSUE\n')
  console.log('File path:', filePath)
  console.log()

  // Create service client the CORRECT way
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  // Test 1: Check if file exists in storage
  console.log('TEST 1: Does file exist in storage?')
  console.log('=' .repeat(60))
  const { data: files, error: listError } = await supabase
    .storage
    .from('documents')
    .list('cc9a3d26-78dd-41ec-a88c-eb366ab50fb8')

  if (listError) {
    console.log('❌ Storage list error:', listError.message)
  } else {
    console.log(`✅ Found ${files?.length || 0} files in user folder`)
    const targetFile = files?.find(f => `cc9a3d26-78dd-41ec-a88c-eb366ab50fb8/${f.name}` === filePath)
    if (targetFile) {
      console.log(`✅ TARGET FILE EXISTS: ${targetFile.name}`)
      console.log(`   Size: ${targetFile.metadata?.size || 'unknown'} bytes`)
      console.log(`   Updated: ${targetFile.updated_at}`)
    } else {
      console.log(`❌ TARGET FILE NOT FOUND`)
      console.log('\nFiles in folder:')
      files?.forEach(f => console.log(`   - ${f.name}`))
    }
  }
  console.log()

  // Test 2: Test service client permissions - can we copy?
  console.log('TEST 2: Can service client copy files?')
  console.log('=' .repeat(60))

  if (files && files.length > 0) {
    const testFile = files[0]!
    const testSource = `cc9a3d26-78dd-41ec-a88c-eb366ab50fb8/${testFile.name}`
    const testTarget = `cc9a3d26-78dd-41ec-a88c-eb366ab50fb8/test-copy-${Date.now()}.pdf`

    console.log(`Attempting to copy: ${testFile.name}`)
    console.log(`From: ${testSource}`)
    console.log(`To: ${testTarget}`)

    const { error: copyError } = await supabase
      .storage
      .from('documents')
      .copy(testSource, testTarget)

    if (copyError) {
      console.log(`❌ COPY FAILED: ${copyError.message}`)
      console.log('Details:', copyError)
    } else {
      console.log(`✅ COPY SUCCESSFUL`)

      // Clean up test file
      await supabase.storage.from('documents').remove([testTarget])
      console.log('✅ Test file cleaned up')
    }
  } else {
    console.log('⚠️  No files to test with')
  }
  console.log()

  // Test 3: Check database record
  console.log('TEST 3: Database record for failed file')
  console.log('=' .repeat(60))
  const { data: doc, error: docError } = await supabase
    .from('documents')
    .select('id, title, filename, file_path, status')
    .eq('file_path', filePath)
    .single()

  if (docError) {
    console.log('❌ Database error:', docError.message)
  } else if (!doc) {
    console.log('❌ No database record found')
  } else {
    console.log('✅ Database record found:')
    console.log(`   ID: ${doc.id}`)
    console.log(`   Title: ${doc.title}`)
    console.log(`   Filename: ${doc.filename}`)
    console.log(`   Status: ${doc.status}`)
  }
  console.log()

  // Test 4: Verify environment variables
  console.log('TEST 4: Environment variables')
  console.log('=' .repeat(60))
  console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing')
  console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? `✅ Set (${supabaseKey.substring(0, 20)}...)` : '❌ Missing')
  console.log()

  // Test 5: Try the exact rename operation that's failing
  if (files?.find(f => `cc9a3d26-78dd-41ec-a88c-eb366ab50fb8/${f.name}` === filePath)) {
    console.log('TEST 5: Attempting actual rename operation')
    console.log('=' .repeat(60))
    const newPath = 'cc9a3d26-78dd-41ec-a88c-eb366ab50fb8/Aztec Verification of Identity Questionnaire - Jersey ehhe.pdf'

    console.log('Step 1: Delete target if exists...')
    await supabase.storage.from('documents').remove([newPath])
    console.log('✅ Cleanup complete')

    console.log('\nStep 2: Copy file...')
    const { error: copyErr } = await supabase.storage
      .from('documents')
      .copy(filePath, newPath)

    if (copyErr) {
      console.log(`❌ COPY FAILED: ${copyErr.message}`)
      console.log('Full error:', copyErr)
    } else {
      console.log('✅ COPY SUCCESSFUL')

      // Clean up
      await supabase.storage.from('documents').remove([newPath])
      console.log('✅ Test cleanup complete')
    }
  }
}

debugRenameIssue().catch(console.error)
