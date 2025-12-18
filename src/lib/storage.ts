import { createServiceClient } from '@/lib/auth'

// Cache for buckets that have been verified/created
const verifiedBuckets = new Set<string>()

/**
 * Ensure a bucket exists, create it if it doesn't
 */
async function ensureBucketExists(supabase: ReturnType<typeof createServiceClient>, bucket: string): Promise<void> {
  // Skip if already verified this session
  if (verifiedBuckets.has(bucket)) {
    return
  }

  try {
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    
    if (listError) {
      console.warn('Could not list buckets:', listError.message)
      // Continue anyway - the bucket might exist
      return
    }

    const bucketExists = buckets?.some(b => b.name === bucket)
    
    if (!bucketExists) {
      console.log(`Creating storage bucket: ${bucket}`)
      const { error: createError } = await supabase.storage.createBucket(bucket, {
        public: true, // Make it public for easy access to URLs
        fileSizeLimit: 10 * 1024 * 1024, // 10MB limit
      })
      
      if (createError && !createError.message.includes('already exists')) {
        console.warn(`Could not create bucket ${bucket}:`, createError.message)
        // Continue anyway - might be permissions issue but bucket exists
      } else {
        console.log(`✓ Created bucket: ${bucket}`)
      }
    }
    
    verifiedBuckets.add(bucket)
  } catch (error) {
    console.warn('Bucket check failed, continuing:', error)
    // Continue anyway - bucket operations might still work
  }
}

export async function saveUpload(
  file: Buffer | string,
  path: string,
  bucket: string = 'uploads',
  contentType: string = 'image/jpeg'
): Promise<string> {
  try {
    // Use service client to bypass RLS policies for server-side uploads
    const supabase = createServiceClient()

    // Ensure bucket exists
    await ensureBucketExists(supabase, bucket)

    // If file is base64 string, convert to buffer
    let fileBuffer: Buffer
    if (typeof file === 'string') {
      // Remove data URL prefix if present
      const base64Data = file.replace(/^data:image\/\w+;base64,/, '')
      fileBuffer = Buffer.from(base64Data, 'base64')
    } else {
      fileBuffer = file
    }

    const { data, error } = await supabase.storage.from(bucket).upload(path, fileBuffer, {
      contentType,
      upsert: true,
    })

    if (error) {
      throw error
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(data.path)

    return publicUrl
  } catch (error) {
    console.error('Storage upload error:', error)
    throw error
  }
}

export async function getUploadUrl(path: string, bucket: string = 'uploads'): Promise<string> {
  try {
    // Use service client for server-side operations
    const supabase = createServiceClient()
    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(path)

    return publicUrl
  } catch (error) {
    console.error('Get upload URL error:', error)
    throw error
  }
}

export async function deleteUpload(path: string, bucket: string = 'uploads'): Promise<void> {
  try {
    // Use service client for server-side operations
    const supabase = createServiceClient()
    const { error } = await supabase.storage.from(bucket).remove([path])

    if (error) {
      throw error
    }
  } catch (error) {
    console.error('Delete upload error:', error)
    throw error
  }
}
