import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/auth'

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

        const { data: profile, error } = await supabase
            .from('influencer_profiles')
            .select('profile_images')
            .eq('user_id', authUser.id)
            .maybeSingle()

        if (error) {
            return NextResponse.json({ images: [] })
        }

        const images = Array.isArray(profile?.profile_images)
            ? profile.profile_images.map((img: any, index: number) => ({
                id: img.id || `img-${index}`,
                imageUrl: img.url || img.imageUrl || img,
                isPrimary: Boolean(img.isPrimary || index === 0),
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

        // Prefer service client for storage/DB writes; fall back to auth client if service env is missing.
        let db: Awaited<ReturnType<typeof createClient>> | ReturnType<typeof createServiceClient> = supabase
        try {
            db = createServiceClient()
        } catch {
            db = supabase
        }

        const contentTypeHeader = request.headers.get('content-type') || ''
        let label: string | null = null
        let makePrimary = false
        let fileBuffer: Buffer | null = null
        let uploadContentType = 'image/jpeg'
        let extension = 'jpg'

        if (contentTypeHeader.includes('multipart/form-data')) {
            const formData = await request.formData()
            const file = formData.get('file')
            const labelValue = formData.get('label')
            const makePrimaryValue = formData.get('makePrimary')
            label = typeof labelValue === 'string' ? labelValue : null
            makePrimary = makePrimaryValue === 'true'

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
            const body = await request.json().catch(() => null)
            const imageBase64 = body?.imageBase64
            label = body?.label || null
            makePrimary = Boolean(body?.makePrimary)

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

        const { error: uploadError } = await db.storage
            .from('profile-images')
            .upload(fileName, fileBuffer, {
                contentType: uploadContentType,
                upsert: false
            })

        if (uploadError) {
            console.error('Upload error:', uploadError)
            return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 })
        }

        const { data: urlData } = db.storage
            .from('profile-images')
            .getPublicUrl(fileName)

        const imageUrl = urlData.publicUrl

        const { data: existingProfile, error: existingProfileError } = await db
            .from('influencer_profiles')
            .select('id, profile_images')
            .eq('user_id', authUser.id)
            .maybeSingle()

        if (existingProfileError) {
            console.error('Failed to read influencer profile:', existingProfileError)
            return NextResponse.json({ error: 'Failed to read profile image metadata' }, { status: 500 })
        }

        const currentImages = Array.isArray(existingProfile?.profile_images) ? existingProfile.profile_images : []
        const normalizedExisting = currentImages.map((img: any, index: number) => ({
            ...img,
            isPrimary: makePrimary ? false : Boolean(img?.isPrimary || index === 0),
        }))

        const newImage = {
            id: `img-${Date.now()}`,
            url: imageUrl,
            label: label || null,
            isPrimary: makePrimary || normalizedExisting.length === 0
        }

        const nextImages = [...normalizedExisting, newImage]
        const now = new Date().toISOString()

        if (existingProfile?.id) {
            const { error: updateError } = await db
                .from('influencer_profiles')
                .update({
                    profile_images: nextImages,
                    updated_at: now
                })
                .eq('id', existingProfile.id)

            if (updateError) {
                console.error('Failed to update image metadata:', updateError)
                return NextResponse.json({ error: 'Failed to save profile image metadata' }, { status: 500 })
            }
        } else {
            const { error: insertError } = await db
                .from('influencer_profiles')
                .insert({
                    user_id: authUser.id,
                    profile_images: nextImages,
                    updated_at: now
                })

            if (insertError) {
                console.error('Failed to create image metadata row:', insertError)
                return NextResponse.json({ error: 'Failed to create profile image metadata' }, { status: 500 })
            }
        }

        const { error: profileUpdateError } = await db
            .from('profiles')
            .update({
                avatar_url: imageUrl,
                updated_at: now
            })
            .eq('id', authUser.id)

        if (profileUpdateError) {
            console.warn('Failed to update profiles.avatar_url:', profileUpdateError)
        }

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
