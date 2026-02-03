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
 */
export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user: authUser } } = await supabase.auth.getUser()

        if (!authUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { imageBase64, label } = body

        if (!imageBase64) {
            return NextResponse.json({ error: 'Image data required' }, { status: 400 })
        }

        // Upload to storage
        const fileName = `profile-images/${authUser.id}/${Date.now()}.jpg`

        // Convert base64 to blob
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '')
        const buffer = Buffer.from(base64Data, 'base64')

        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('profile-images')
            .upload(fileName, buffer, {
                contentType: 'image/jpeg',
                upsert: false
            })

        if (uploadError) {
            console.error('Upload error:', uploadError)
            return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 })
        }

        // Get public URL
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
