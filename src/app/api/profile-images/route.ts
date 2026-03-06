import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth'

/**
 * GET /api/profile-images
 * 
 * Returns the current user's saved profile images.
 */
export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user: authUser } } = await supabase.auth.getUser()

        if (!authUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Fetch profile images from influencer_profiles
        const { data: profile, error } = await supabase
            .from('influencer_profiles')
            .select('profile_images')
            .eq('id', authUser.id)
            .single()

        if (error) {
            // No influencer profile found - return empty array (not an error)
            return NextResponse.json({ images: [] })
        }

        // profile_images is typically a JSONB array of image objects
        const images = Array.isArray(profile?.profile_images)
            ? profile.profile_images.map((img: any, index: number) => ({
                id: img.id || `img-${index}`,
                imageUrl: img.url || img.imageUrl || img,
                isPrimary: img.isPrimary || index === 0,
                label: img.label || null
            }))
            : []

        return NextResponse.json({ images })
    } catch (error) {
        console.error('Profile images error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

/**
 * POST /api/profile-images
 * 
 * Saves a new profile image for the current user.
 * Supports multipart/form-data (fast path) and JSON base64 (backward compatibility).
 */
export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user: authUser } } = await supabase.auth.getUser()

        if (!authUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const contentTypeHeader = request.headers.get('content-type') || ''
        let label: string | null = null
        let fileBuffer: Buffer | null = null
        let uploadContentType = 'image/jpeg'
        let extension = 'jpg'

        if (contentTypeHeader.includes('multipart/form-data')) {
            const formData = await request.formData()
            const file = formData.get('file')
            const labelValue = formData.get('label')
            label = typeof labelValue === 'string' ? labelValue : null

            if (!(file instanceof File)) {
                return NextResponse.json({ error: 'Image file required' }, { status: 400 })
            }

            if (!file.type.startsWith('image/')) {
                return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
            }

            if (file.size > 5 * 1024 * 1024) {
                return NextResponse.json({ error: 'Image must be less than 5MB' }, { status: 400 })
            }

            const arrayBuffer = await file.arrayBuffer()
            fileBuffer = Buffer.from(arrayBuffer)
            uploadContentType = file.type || 'image/jpeg'
            extension = uploadContentType.split('/')[1] || 'jpg'
        } else {
            // Backward-compatible JSON body support
            const body = await request.json().catch(() => null)
            const imageBase64 = body?.imageBase64
            label = body?.label || null

            if (!imageBase64) {
                return NextResponse.json({ error: 'Image data required' }, { status: 400 })
            }

            const base64Data = String(imageBase64).replace(/^data:image\/\w+;base64,/, '')
            fileBuffer = Buffer.from(base64Data, 'base64')
            uploadContentType = 'image/jpeg'
            extension = 'jpg'
        }

        if (!fileBuffer || fileBuffer.length === 0) {
            return NextResponse.json({ error: 'Invalid image payload' }, { status: 400 })
        }

        const fileName = `profile-images/${authUser.id}/${Date.now()}.${extension}`

        const { error: uploadError } = await supabase.storage
            .from('profile-images')
            .upload(fileName, fileBuffer, {
                contentType: uploadContentType,
                upsert: false
            })

        if (uploadError) {
            console.error('Upload error:', uploadError)
            return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 })
        }

        const { data: urlData } = supabase.storage
            .from('profile-images')
            .getPublicUrl(fileName)

        const imageUrl = urlData.publicUrl

        // Get current profile images
        const { data: profile } = await supabase
            .from('influencer_profiles')
            .select('profile_images')
            .eq('id', authUser.id)
            .single()

        const currentImages = Array.isArray(profile?.profile_images) ? profile.profile_images : []

        // Add new image
        const newImage = {
            id: `img-${Date.now()}`,
            url: imageUrl,
            label: label || null,
            isPrimary: currentImages.length === 0
        }

        // Update profile
        await supabase
            .from('influencer_profiles')
            .update({
                profile_images: [...currentImages, newImage],
                updated_at: new Date().toISOString()
            })
            .eq('id', authUser.id)

        return NextResponse.json({
            success: true,
            image: {
                id: newImage.id,
                imageUrl: newImage.url,
                isPrimary: newImage.isPrimary,
                label: newImage.label
            }
        })
    } catch (error) {
        console.error('Save profile image error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
