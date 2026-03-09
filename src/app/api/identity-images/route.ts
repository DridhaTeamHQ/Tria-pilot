import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/auth'
import {
  IdentityImageType,
  IDENTITY_IMAGE_REQUIREMENTS,
  isIdentitySetupComplete,
  getUploadProgress
} from '@/lib/identity/types'

async function findInfluencerProfile(
  client: any,
  authUserId: string,
  selectClause: string
): Promise<any> {
  const byUserId = await client
    .from('influencer_profiles')
    .select(selectClause)
    .eq('user_id', authUserId)
    .maybeSingle()

  if (byUserId.data) return byUserId.data

  const byId = await client
    .from('influencer_profiles')
    .select(selectClause)
    .eq('id', authUserId)
    .maybeSingle()

  return byId.data ?? null
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const profile: any = await findInfluencerProfile(supabase, authUser.id, '*, identity_images(*)')

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

    // Look for existing influencer profile by user_id first (canonical), then id fallback.
    let profile: any = await findInfluencerProfile(supabase, authUser.id, 'id, identity_images(*)')

    // Auto-create influencer profile if it doesn't exist.
    if (!profile) {
      let createErr: any = null

      const createByUserId = await db
        .from('influencer_profiles')
        .upsert({ user_id: authUser.id }, { onConflict: 'user_id' })
        .select('id, identity_images(*)')
        .maybeSingle()

      createErr = createByUserId.error
      profile = createByUserId.data ?? null

      if (!profile) {
        const createById = await db
          .from('influencer_profiles')
          .upsert({ id: authUser.id, user_id: authUser.id }, { onConflict: 'id' })
          .select('id, identity_images(*)')
          .maybeSingle()
        createErr = createById.error || createErr
        profile = createById.data ?? null
      }

      if (!profile) {
        profile = await findInfluencerProfile(db, authUser.id, 'id, identity_images(*)')
      }

      if (!profile) {
        console.error('Failed to create influencer profile for identity images:', createErr)
        return NextResponse.json({ error: 'Could not create profile for identity images' }, { status: 500 })
      }
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

    // Always update or insert by checking existing first to avoid missing composite unique constraint errors
    const { data: existingImage } = await db
      .from('identity_images')
      .select('id')
      .eq('influencer_profile_id', profile.id)
      .eq('image_type', imageType)
      .maybeSingle()

    const payload = {
      influencer_profile_id: profile.id,
      image_type: imageType,
      image_path: fileName,
      image_url: publicUrl,
      is_active: true,
      updated_at: new Date().toISOString(),
    }

    let record;
    let dbError;

    if (existingImage) {
      const { data, error } = await db
        .from('identity_images')
        .update(payload)
        .eq('id', existingImage.id)
        .select()
        .single()
      record = data
      dbError = error
    } else {
      const { data, error } = await db
        .from('identity_images')
        .insert({ ...payload, id: crypto.randomUUID() })
        .select()
        .single()
      record = data
      dbError = error
    }

    if (dbError) throw dbError

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

    const profile: any = await findInfluencerProfile(db, authUser.id, 'id')
    if (!profile?.id) {
      return NextResponse.json({ success: true, progress: 0, isComplete: false })
    }

    await db
      .from('identity_images')
      .update({ is_active: false })
      .eq('influencer_profile_id', profile.id)
      .eq('image_type', imageType)

    // Re-check completion
    const { data: allImages } = await db.from('identity_images').select('image_type').eq('influencer_profile_id', profile.id).eq('is_active', true)
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
