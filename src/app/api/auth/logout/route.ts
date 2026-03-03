import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    // Sign out from Supabase
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      console.error('Supabase signOut error:', error)
    }
    
    // Clear all auth-related cookies
    const cookieStore = await cookies()
    const authCookies = [
      'sb-access-token',
      'sb-refresh-token',
      'sb-auth-token',
    ]
    
    // Clear Supabase cookies (they use a pattern like sb-<project-ref>-auth-token)
    const allCookies = cookieStore.getAll()
    allCookies.forEach((cookie) => {
      if (cookie.name.includes('sb-') || cookie.name.includes('supabase')) {
        cookieStore.delete(cookie.name)
      }
    })
    
    // Return response with headers to clear cookies on client side
    const response = NextResponse.json({ success: true })
    
    // Clear cookies in response headers
    authCookies.forEach((cookieName) => {
      response.cookies.set(cookieName, '', {
        expires: new Date(0),
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      })
    })
    
    return response
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

