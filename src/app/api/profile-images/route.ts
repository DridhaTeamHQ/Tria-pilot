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

        const [{ data: profile }, { data: accountProfile }] = await Promise.all([
            supabase
                .from('influencer_profiles')
                .select('profile_images')
                .eq('user_id', authUser.id)
                .maybeSingle(),
            supabase
                .from('profiles')
                .select('avatar_url')
                .eq('id', authUser.id)
                .maybeSingle(),
        ])

        let images = Array.isArray(profile?.profile_images)
            ? profile.profile_images.map((img: any, index: number) => ({
                id: img.id || `img-${index}`,
                imageUrl: img.url || img.imageUrl || img,
                isPrimary: Boolean(img.isPrimary || index === 0),
                label: img.label || null,
            }))
            : []

        // Fallback: if structured image metadata is missing, use profiles.avatar_url.
        if (images.length === 0 && typeof accountProfile?.avatar_url === 'string' && accountProfile.avatar_url) {
            images = [{
                id: 'avatar-primary',
                imageUrl: accountProfile.avatar_url,
                isPrimary: true,
                label: 'avatar',
            }]
        }

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
                upsert: false,
            })

        if (uploadError) {
            console.error('Upload error:', uploadError)
            return NextResponse.json({
                error: uploadError.message || 'Failed to upload image',
            }, { status: 500 })
        }

        const { data: urlData } = db.storage
            .from('profile-images')
            .getPublicUrl(fileName)

        const imageUrl = urlData.publicUrl
        const now = new Date().toISOString()

        // Primary persistence path: profile avatar.
        const { error: profileUpdateError } = await db
            .from('profiles')
            .update({
                avatar_url: imageUrl,
                updated_at: now,
            })
            .eq('id', authUser.id)

        if (profileUpdateError) {
            console.error('Failed to update profiles.avatar_url:', profileUpdateError)
            return NextResponse.json({
                error: 'Failed to save profile avatar. Please try again.',
            }, { status: 500 })
        }

        // Secondary metadata (best effort): influencer profile image history.
        try {
            const { data: existingProfile } = await db
                .from('influencer_profiles')
                .select('id, profile_images')
                .eq('user_id', authUser.id)
                .maybeSingle()

            const currentImages = Array.isArray(existingProfile?.profile_images) ? existingProfile.profile_images : []
            const normalizedExisting = currentImages.map((img: any, index: number) => ({
                ...img,
                isPrimary: makePrimary ? false : Boolean(img?.isPrimary || index === 0),
            }))

            const newImage = {
                id: `img-${Date.now()}`,
                url: imageUrl,
                label: label || null,
                isPrimary: makePrimary || normalizedExisting.length === 0,
            }

            const nextImages = [...normalizedExisting, newImage]

            if (existingProfile?.id) {
                await db
                    .from('influencer_profiles')
                    .update({
                        profile_images: nextImages,
                        updated_at: now,
                    })
                    .eq('id', existingProfile.id)
            } else {
                await db
                    .from('influencer_profiles')
                    .insert({
                        user_id: authUser.id,
                        profile_images: nextImages,
                        updated_at: now,
                    })
            }

            return NextResponse.json({
                success: true,
                image: {
                    id: newImage.id,
                    imageUrl: newImage.url,
                    isPrimary: newImage.isPrimary,
                    label: newImage.label,
                },
            })
        } catch (metadataError) {
            console.warn('Profile image metadata write skipped:', metadataError)
            return NextResponse.json({
                success: true,
                image: {
                    id: `img-${Date.now()}`,
                    imageUrl,
                    isPrimary: true,
                    label: label || null,
                },
                warning: 'Avatar updated, but image history metadata was not saved.',
            })
        }
    } catch (error) {
        console.error('Save profile image error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
