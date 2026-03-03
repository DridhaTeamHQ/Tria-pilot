import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function createClient() {
    const cookieStore = await cookies()

    return createServerClient(
        (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim(),
        (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim(),
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch {
                        // The `setAll` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
        }
    )
}

/**
 * Creates a Supabase client with service role key for server-side operations
 * that need to bypass RLS (Row Level Security) policies.
 * Use this for storage operations and admin tasks.
 */
export function createServiceClient() {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set in environment variables')
    }

    return createSupabaseClient(
        (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim(),
        (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(),
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        }
    )
}
