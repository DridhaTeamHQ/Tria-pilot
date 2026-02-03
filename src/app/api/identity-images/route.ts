import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/auth'
import {
  IdentityImageType,
  IDENTITY_IMAGE_REQUIREMENTS,
  isIdentitySetupComplete,
  getUploadProgress
} from '@/lib/identity/types'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Check if influencer profile exists
    // We can assume user ID matches profile ID for 1:1 relationship
    const { data: profile } = await supabase
      .from('influencer_profiles')
      .select('*, identity_images(*)')
      .eq('id', authUser.id)
      .single()

    if (!profile) {
      // Check if user is even an influencer role?
      const { data: userProfile } = await supabase.from('profiles').select('role').eq('id', authUser.id).single()
      if (!userProfile || (userProfile.role || '').toLowerCase() !== 'influencer') {
        // Return compatible "incomplete" response
        return NextResponse.json({
          code: 'PROFILE_INCOMPLETE',
          message: 'Influencer account required.',
          images: [],
          isComplete: false
        })
      }
      return NextResponse.json({
        code: 'PROFILE_INCOMPLETE',
        message: 'Influencer profile missing.',
        images: [],
        isComplete: false
      })
    }

    const uploadedImages = (profile.identity_images || []).filter((img: any) => img.is_active)

    // Map snake_case to camelCase for frontend compatibility if needed
    // But let's check types. The frontend likely expects `imageType`, not `image_type`.
    const mappedImages = uploadedImages.map((img: any) => ({
      ...img,
      imageType: img.image_type,
      imagePath: img.image_path,
      imageUrl: img.image_url,
      isActive: img.is_active
    }))

    const uploadedTypes = mappedImages.map((img: any) => img.imageType as IdentityImageType)

    return NextResponse.json({
      images: mappedImages,
      requirements: IDENTITY_IMAGE_REQUIREMENTS,
      progress: getUploadProgress(uploadedTypes),
      isComplete: isIdentitySetupComplete(uploadedTypes),
      uploadedTypes,
    })
  } catch (error) {
    console.error('Get identity images error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('influencer_profiles')
      .select('id, identity_setup_complete, identity_images(*)')
      .eq('id', authUser.id)
      .single()

    if (!profile) return NextResponse.json({ error: 'Influencer profile not found' }, { status: 404 })

    const formData = await request.formData()
    const file = formData.get('file') as File
    const imageType = formData.get('imageType') as IdentityImageType

    if (!file || !imageType) return NextResponse.json({ error: 'File and image type required' }, { status: 400 })

    const service = createServiceClient()
    const buffer = Buffer.from(await file.arrayBuffer())
    const fileName = `${profile.id}/${imageType}-${Date.now()}.jpg`

    const { error: uploadError } = await service.storage
      .from('identity-images')
      .upload(fileName, buffer, { contentType: file.type || 'image/jpeg', upsert: true })

    // If bucket missing, fallback logic omitted for brevity (Supabase should have buckets or create them manually)
    if (uploadError) throw uploadError

    const { data: { publicUrl } } = service.storage.from('identity-images').getPublicUrl(fileName)

    // Upsert logic for DB record
    // In SQL we can UPSERT if we have unique constraint on (profile_id, image_type) where active=true?
    // We don't have that constraint. So we find existing and update, or insert.

    const existing = (profile.identity_images || []).find((img: any) => img.image_type === imageType && img.is_active)
    let record

    if (existing) {
      const { data: updated, error } = await service
        .from('identity_images')
        .update({
          image_path: fileName,
          image_url: publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single()
      if (error) throw error
      record = updated
    } else {
      const { data: newRecord, error } = await service
        .from('identity_images')
        .insert({
          influencer_profile_id: profile.id,
          image_type: imageType,
          image_path: fileName,
          image_url: publicUrl,
          is_active: true
        })
        .select()
        .single()
      if (error) throw error
      record = newRecord
    }

    // Check completion
    const { data: allImages } = await service.from('identity_images').select('image_type').eq('influencer_profile_id', profile.id).eq('is_active', true)
    const types = (allImages || []).map((i: any) => i.image_type)
    const isComplete = isIdentitySetupComplete(types)

    if (isComplete && !profile.identity_setup_complete) {
      await service.from('influencer_profiles').update({ identity_setup_complete: true }).eq('id', profile.id)
    }

    return NextResponse.json({
      image: { ...record, imageType: record.image_type, imageUrl: record.image_url }, // map for frontend
      progress: getUploadProgress(types),
      isComplete,
      uploadedTypes: types
    })

  } catch (error) {
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  // Similar rewrite using service client and Supabase updates
  // Omitted for brevity but crucial to implement if deletion is needed
  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const imageType = searchParams.get('imageType')
    if (!imageType) return NextResponse.json({ error: 'Type required' }, { status: 400 })

    const service = createServiceClient()

    // Soft delete
    // Need to find profile ID first or filter by inner join... 
    // identity_images linked to influencer_profile_id which is usually user_id (1:1)

    await service
      .from('identity_images')
      .update({ is_active: false })
      .eq('influencer_profile_id', authUser.id) // Assuming ID match
      .eq('image_type', imageType)

    // Re-check completion
    const { data: allImages } = await service.from('identity_images').select('image_type').eq('influencer_profile_id', authUser.id).eq('is_active', true)
    const types = (allImages || []).map((i: any) => i.image_type)
    const isComplete = isIdentitySetupComplete(types)

    if (!isComplete) {
      await service.from('influencer_profiles').update({ identity_setup_complete: false }).eq('id', authUser.id)
    }

    return NextResponse.json({
      success: true,
      progress: getUploadProgress(types),
      isComplete
    })

  } catch (e) {
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}
