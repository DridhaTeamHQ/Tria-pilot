import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { 
  IdentityImageType, 
  IDENTITY_IMAGE_REQUIREMENTS,
  isIdentitySetupComplete,
  getUploadProgress 
} from '@/lib/identity/types'

/**
 * GET /api/identity-images
 * Get all identity images for the current influencer
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: authUser.email! },
      include: {
        influencerProfile: {
          include: {
            identityImages: {
              where: { isActive: true },
              orderBy: { createdAt: 'asc' }
            }
          }
        }
      }
    })

    if (!dbUser || dbUser.role !== 'INFLUENCER' || !dbUser.influencerProfile) {
      return NextResponse.json({ error: 'Influencer profile required' }, { status: 403 })
    }

    const uploadedImages = dbUser.influencerProfile.identityImages
    const uploadedTypes = uploadedImages.map(img => img.imageType as IdentityImageType)
    
    return NextResponse.json({
      images: uploadedImages,
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

/**
 * POST /api/identity-images
 * Upload or update an identity image
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: authUser.email! },
      include: {
        influencerProfile: {
          include: {
            identityImages: true
          }
        }
      }
    })

    if (!dbUser || dbUser.role !== 'INFLUENCER' || !dbUser.influencerProfile) {
      return NextResponse.json({ error: 'Influencer profile required' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const imageType = formData.get('imageType') as IdentityImageType

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!imageType) {
      return NextResponse.json({ error: 'Image type is required' }, { status: 400 })
    }

    // Validate image type
    const validTypes = IDENTITY_IMAGE_REQUIREMENTS.map(r => r.type)
    if (!validTypes.includes(imageType)) {
      return NextResponse.json({ error: 'Invalid image type' }, { status: 400 })
    }

    // Use service role client for storage operations
    let serviceClient
    try {
      serviceClient = createServiceClient()
    } catch {
      serviceClient = supabase
    }

    // Upload to Supabase Storage
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const fileName = `${dbUser.influencerProfile.id}/${imageType}-${Date.now()}.jpg`
    
    const { data: uploadData, error: uploadError } = await serviceClient.storage
      .from('identity-images')
      .upload(fileName, buffer, {
        contentType: file.type || 'image/jpeg',
        upsert: true,
      })

    // Fallback to uploads bucket if identity-images doesn't exist
    let actualBucket = 'identity-images'
    let actualPath = fileName
    
    if (uploadError?.message?.includes('Bucket not found')) {
      const fallbackResult = await serviceClient.storage
        .from('uploads')
        .upload(`identity/${fileName}`, buffer, {
          contentType: file.type || 'image/jpeg',
          upsert: true,
        })
      
      if (fallbackResult.error) {
        console.error('Upload error:', fallbackResult.error)
        return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 })
      }
      
      actualBucket = 'uploads'
      actualPath = `identity/${fileName}`
    } else if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 })
    }

    // Get public URL
    const { data: { publicUrl } } = serviceClient.storage
      .from(actualBucket)
      .getPublicUrl(actualPath)

    // Check if image of this type already exists
    const existingImage = dbUser.influencerProfile.identityImages.find(
      img => img.imageType === imageType
    )

    let identityImage
    if (existingImage) {
      // Update existing
      identityImage = await prisma.identityImage.update({
        where: { id: existingImage.id },
        data: {
          imagePath: actualPath,
          imageUrl: publicUrl,
          isActive: true,
          updatedAt: new Date(),
        }
      })
    } else {
      // Create new
      identityImage = await prisma.identityImage.create({
        data: {
          influencerProfileId: dbUser.influencerProfile.id,
          imageType,
          imagePath: actualPath,
          imageUrl: publicUrl,
          isActive: true,
        }
      })
    }

    // Check if all required images are now uploaded
    const allImages = await prisma.identityImage.findMany({
      where: {
        influencerProfileId: dbUser.influencerProfile.id,
        isActive: true,
      }
    })
    
    const uploadedTypes = allImages.map(img => img.imageType as IdentityImageType)
    const isComplete = isIdentitySetupComplete(uploadedTypes)

    // Update identity setup status if complete
    if (isComplete && !dbUser.influencerProfile.identitySetupComplete) {
      await prisma.influencerProfile.update({
        where: { id: dbUser.influencerProfile.id },
        data: { identitySetupComplete: true }
      })
    }

    return NextResponse.json({
      image: identityImage,
      progress: getUploadProgress(uploadedTypes),
      isComplete,
      uploadedTypes,
    })
  } catch (error) {
    console.error('Upload identity image error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/identity-images
 * Delete an identity image
 */
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const imageType = searchParams.get('imageType') as IdentityImageType

    if (!imageType) {
      return NextResponse.json({ error: 'Image type is required' }, { status: 400 })
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: authUser.email! },
      include: {
        influencerProfile: true
      }
    })

    if (!dbUser || dbUser.role !== 'INFLUENCER' || !dbUser.influencerProfile) {
      return NextResponse.json({ error: 'Influencer profile required' }, { status: 403 })
    }

    // Soft delete - just mark as inactive
    await prisma.identityImage.updateMany({
      where: {
        influencerProfileId: dbUser.influencerProfile.id,
        imageType,
      },
      data: {
        isActive: false,
      }
    })

    // Update identity setup status
    const remainingImages = await prisma.identityImage.findMany({
      where: {
        influencerProfileId: dbUser.influencerProfile.id,
        isActive: true,
      }
    })
    
    const uploadedTypes = remainingImages.map(img => img.imageType as IdentityImageType)
    const isComplete = isIdentitySetupComplete(uploadedTypes)

    if (!isComplete) {
      await prisma.influencerProfile.update({
        where: { id: dbUser.influencerProfile.id },
        data: { identitySetupComplete: false }
      })
    }

    return NextResponse.json({
      success: true,
      progress: getUploadProgress(uploadedTypes),
      isComplete,
    })
  } catch (error) {
    console.error('Delete identity image error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

