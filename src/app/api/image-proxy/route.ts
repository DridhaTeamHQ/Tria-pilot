
import { createServiceClient } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
    const url = req.nextUrl.searchParams.get('url')

    if (!url) {
        return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 })
    }

    try {
        // If it's a Supabase URL, we can try to download it via the admin client
        // This bypasses public bucket restrictions if needed
        if (url.includes('supabase.co')) {
            const supabase = createServiceClient()

            // Extract path from URL
            // Format: .../storage/v1/object/public/bucket/path/to/file
            const matches = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/)

            if (matches) {
                const bucket = matches[1]
                const path = matches[2]

                console.log(`Proxying Supabase file: ${bucket}/${path}`)

                const { data, error } = await supabase.storage
                    .from(bucket)
                    .download(path)

                if (error) {
                    console.error('Supabase download error:', error)
                    // Fallback to fetch if internal download fails
                } else if (data) {
                    // Determine content type from path or default to jpeg
                    const format = path.split('.').pop()?.toLowerCase() || 'jpeg'
                    const contentType = format === 'png' ? 'image/png' : 'image/jpeg'

                    // Return the file directly
                    return new NextResponse(data, {
                        headers: {
                            'Content-Type': contentType,
                            'Cache-Control': 'public, max-age=31536000, immutable',
                        },
                    })
                }
            }
        }

        // Fallback for non-Supabase URLs or if internal download failed
        // Just fetch and stream back
        const response = await fetch(url)

        if (!response.ok) {
            return NextResponse.json(
                { error: `Failed to fetch image: ${response.statusText}` },
                { status: response.status }
            )
        }

        const blob = await response.blob()
        const contentType = response.headers.get('Content-Type') || 'image/jpeg'

        return new NextResponse(blob, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        })

    } catch (error) {
        console.error('Image proxy error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
