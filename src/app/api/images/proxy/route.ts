/**
 * IMAGE PROXY API
 * 
 * Proxies images from Supabase storage to bypass CORS issues
 * GET /api/images/proxy?url=<encoded_url>
 */
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
    try {
        const url = request.nextUrl.searchParams.get('url')

        if (!url) {
            return NextResponse.json({ error: 'URL parameter required' }, { status: 400 })
        }

        // Decode the URL
        const imageUrl = decodeURIComponent(url)

        // Only allow Supabase storage URLs
        if (!imageUrl.includes('supabase.co/storage')) {
            return NextResponse.json({ error: 'Only Supabase storage URLs allowed' }, { status: 403 })
        }

        console.log('[Image Proxy] Fetching:', imageUrl)

        // Fetch the image
        const response = await fetch(imageUrl, {
            headers: {
                'Accept': 'image/*',
            },
        })

        if (!response.ok) {
            console.error('[Image Proxy] Fetch failed:', response.status, response.statusText)
            return NextResponse.json({
                error: `Failed to fetch image: ${response.status}`,
                status: response.status,
                statusText: response.statusText,
            }, { status: response.status })
        }

        // Get the content type
        const contentType = response.headers.get('content-type') || 'image/jpeg'
        console.log('[Image Proxy] Content-Type:', contentType)

        // Get the image data
        const imageBuffer = await response.arrayBuffer()
        console.log('[Image Proxy] Size:', imageBuffer.byteLength, 'bytes')

        // Return the image
        return new NextResponse(imageBuffer, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=86400', // Cache for 1 day
                'Access-Control-Allow-Origin': '*',
            },
        })
    } catch (error) {
        console.error('[Image Proxy] Error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Proxy failed' },
            { status: 500 }
        )
    }
}
