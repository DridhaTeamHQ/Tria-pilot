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

    let db: Awaited<ReturnType<typeof createClient>> | ReturnType<typeof createServiceClient> = supabase
    try {
      db = createServiceClient()
    } catch {
      db = supabase
    }

    // Look for existing influencer profile
    let { data: profile } = await supabase
      .from('influencer_profiles')
      .select('id, identity_images(*)')
      .eq('id', authUser.id)
      .single()

    // Auto-create influencer profile if it doesn't exist
    // This handles: brand users who need identity images, or new users
    if (!profile) {
      const { data: newProfile, error: createErr } = await db
        .from('influencer_profiles')
        .upsert({ id: authUser.id, user_id: authUser.id }, { onConflict: 'id' })
        .select('id, identity_images(*)')
        .single()

      if (createErr || !newProfile) {
        console.error('Failed to create influencer profile for identity images:', createErr)
        return NextResponse.json({ error: 'Could not create profile for identity images' }, { status: 500 })
      }
      profile = newProfile
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const imageType = formData.get('imageType') as IdentityImageType

    if (!file || !imageType) return NextResponse.json({ error: 'File and image type required' }, { status: 400 })
    const validTypes = new Set(IDENTITY_IMAGE_REQUIREMENTS.map((req) => req.type))
    if (!validTypes.has(imageType)) {
      return NextResponse.json({ error: 'Invalid image type' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const fileName = `${profile.id}/${imageType}-${Date.now()}.jpg`

    // Upload to storage — auto-create bucket if missing
    let uploadError: any = null
    const uploadToStorage = async () => {
      const result = await db.storage
        .from('identity-images')
        .upload(fileName, buffer, { contentType: file.type || 'image/jpeg', upsert: true })
      return result
    }

    let uploadResult = await uploadToStorage()
    uploadError = uploadResult.error

    // If bucket doesn't exist, create it and retry
    if (uploadError && (uploadError.message?.includes('not found') || uploadError.statusCode === 404 || uploadError.message?.includes('Bucket'))) {
      console.log('Creating identity-images storage bucket...')
      await db.storage.createBucket('identity-images', { public: true }).catch(() => null)
      uploadResult = await uploadToStorage()
      uploadError = uploadResult.error
    }

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = db.storage.from('identity-images').getPublicUrl(fileName)

    // Always upsert by unique key so re-uploads work for all seven slots,
    // including previously deleted/inactive rows.
    const { data: record, error: upsertError } = await db
      .from('identity_images')
      .upsert(
        {
          influencer_profile_id: profile.id,
          image_type: imageType,
          image_path: fileName,
          image_url: publicUrl,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'influencer_profile_id,image_type' }
      )
      .select()
      .single()
    if (upsertError) throw upsertError

    // Check completion
    const { data: allImages } = await db.from('identity_images').select('image_type').eq('influencer_profile_id', profile.id).eq('is_active', true)
    const types = (allImages || []).map((i: any) => i.image_type)
    const isComplete = isIdentitySetupComplete(types)


    return NextResponse.json({
      image: { ...record, imageType: record.image_type, imageUrl: record.image_url }, // map for frontend
      progress: getUploadProgress(types),
      isComplete,
      uploadedTypes: types
    })

  } catch (error) {
    console.error('Upload identity image error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload identity image' },
      { status: 500 }
    )
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

    let db: Awaited<ReturnType<typeof createClient>> | ReturnType<typeof createServiceClient> = supabase
    try {
      db = createServiceClient()
    } catch {
      db = supabase
    }

    // Soft delete
    // Need to find profile ID first or filter by inner join... 
    // identity_images linked to influencer_profile_id which is usually user_id (1:1)

    await db
      .from('identity_images')
      .update({ is_active: false })
      .eq('influencer_profile_id', authUser.id) // Assuming ID match
      .eq('image_type', imageType)

    // Re-check completion
    const { data: allImages } = await db.from('identity_images').select('image_type').eq('influencer_profile_id', authUser.id).eq('is_active', true)
    const types = (allImages || []).map((i: any) => i.image_type)
    const isComplete = isIdentitySetupComplete(types)


    return NextResponse.json({
      success: true,
      progress: getUploadProgress(types),
      isComplete
    })

  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}
