import { createClient } from '@supabase/supabase-js'

/**
 * Authentication Helper for Tests
 *
 * Provides utilities for authenticating test requests using real Supabase auth
 */

export interface TestUser {
  email: string
  password: string
  accessToken?: string
  refreshToken?: string
}

/**
 * Test user credentials
 */
export const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'test@anduintransact.com',
  password: process.env.TEST_USER_PASSWORD || 'test123456',
}

/**
 * Sign in with test user and get auth headers
 * This creates a real Supabase session that respects RLS policies
 */
export async function getTestUserAuthHeaders(): Promise<Record<string, string>> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase environment variables not found')
  }

  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  // Sign in with test user
  const { data, error } = await supabase.auth.signInWithPassword({
    email: TEST_USER.email,
    password: TEST_USER.password,
  })

  if (error || !data.session) {
    throw new Error(`Failed to sign in test user: ${error?.message || 'No session returned'}`)
  }

  return {
    'Authorization': `Bearer ${data.session.access_token}`,
    'Content-Type': 'application/json',
  }
}

/**
 * Get authorization headers for authenticated requests
 */
export function getAuthHeaders(accessToken: string): Record<string, string> {
  return {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  }
}

/**
 * Get CRON_SECRET authorization header for cron endpoints
 */
export function getCronAuthHeader(): Record<string, string> {
  const cronSecret = process.env.CRON_SECRET || 'test-secret-for-local-dev'
  return {
    'Authorization': `Bearer ${cronSecret}`,
    'Content-Type': 'application/json',
  }
}
