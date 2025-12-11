/* eslint-disable no-console */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import path from 'path'

config({ path: path.join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function check() {
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  const filePath = 'cc9a3d26-78dd-41ec-a88c-eb366ab50fb8/1765428717725-xj0msm92j.pdf'

  console.log('🔍 Checking:', filePath)
  console.log()

  // Check storage
  const { data: files, error: listError } = await supabase
    .storage
    .from('documents')
    .list('cc9a3d26-78dd-41ec-a88c-eb366ab50fb8')

  if (listError) {
    console.log('❌ Storage error:', listError.message)
    return
  }

  const exists = files?.some(f => `cc9a3d26-78dd-41ec-a88c-eb366ab50fb8/${f.name}` === filePath)

  console.log('📁 File exists in storage:', exists ? '✅ YES' : '❌ NO')

  if (!exists) {
    console.log('\n💾 Files in folder:')
    files?.forEach(f => {
      const isMatch = f.name.includes('1765428717725')
      console.log(`   ${isMatch ? '→ ' : '  '}${f.name} ${isMatch ? '(SIMILAR)' : ''}`)
    })
  }

  // Check database
  console.log('\n📊 Checking database...')
  const { data: doc } = await supabase
    .from('documents')
    .select('id, title, filename, file_path, status')
    .eq('id', '6d440e1c-c04c-4ba3-9fe2-909efa305a1c')
    .single()

  if (doc) {
    console.log('   ID:', doc.id)
    console.log('   Title:', doc.title)
    console.log('   Filename:', doc.filename)
    console.log('   File path:', doc.file_path)
    console.log('   Status:', doc.status)
  }

  // Try to copy if exists
  if (exists) {
    console.log('\n🧪 Testing copy operation...')
    const { error } = await supabase.storage
      .from('documents')
      .copy(filePath, 'cc9a3d26-78dd-41ec-a88c-eb366ab50fb8/test-copy.pdf')

    console.log('   Result:', error ? `❌ ${error.message}` : '✅ SUCCESS')

    if (!error) {
      await supabase.storage.from('documents').remove(['cc9a3d26-78dd-41ec-a88c-eb366ab50fb8/test-copy.pdf'])
      console.log('   ✅ Cleanup done')
    }
  }
}

check().catch(console.error)
