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
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      })
      
      if (createError && !createError.message.includes('already exists')) {
        console.warn(`Could not create bucket ${bucket}:`, createError.message)
        // Continue anyway - might be permissions issue but bucket exists
      } else {
        console.log(`✓ Created bucket: ${bucket} (public: true)`)
      }
    } else {
      // Bucket exists - verify it's public
      const bucketInfo = buckets?.find(b => b.name === bucket)
      if (bucketInfo && !bucketInfo.public) {
        console.warn(`⚠️  Bucket "${bucket}" exists but is NOT public. Images may fail to load.`)
        console.warn(`   Please make the bucket public in Supabase Storage settings.`)
      } else if (bucketInfo && bucketInfo.public) {
        console.log(`✓ Bucket "${bucket}" exists and is public`)
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
    // Validate environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL is not configured')
    }
    
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured. Please set it in your environment variables.')
    }

    // Use service client to bypass RLS policies for server-side uploads
    let supabase
    try {
      supabase = createServiceClient()
      
      // Quick validation: try to access storage API
      // This will fail early if credentials are wrong
      const { error: testError } = await supabase.storage.listBuckets()
      if (testError) {
        // If we get an error listing buckets, credentials might be wrong
        if (testError.message.includes('Invalid API key') || 
            testError.message.includes('JWT') ||
            testError.message.includes('401') ||
            testError.message.includes('403')) {
          throw new Error('Invalid Supabase service role key. Please verify your SUPABASE_SERVICE_ROLE_KEY environment variable is correct.')
        }
        // Other errors (like network issues) we'll handle during actual upload
        console.warn('Warning: Could not list buckets (non-fatal):', testError.message)
      }
    } catch (clientError) {
      console.error('Failed to create or validate Supabase service client:', clientError)
      if (clientError instanceof Error) {
        throw clientError
      }
      throw new Error('Storage service is not properly configured. Please check your Supabase credentials.')
    }

    // Ensure bucket exists
    await ensureBucketExists(supabase, bucket)

    // If file is base64 string, convert to buffer
    let fileBuffer: Buffer
    if (typeof file === 'string') {
      // Remove data URL prefix if present
      const base64Data = file.replace(/^data:image\/\w+;base64,/, '')
      try {
        fileBuffer = Buffer.from(base64Data, 'base64')
      } catch (parseError) {
        throw new Error('Invalid base64 image data')
      }
    } else {
      fileBuffer = file
    }

    // Validate file buffer
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new Error('Empty file buffer - cannot upload')
    }

    console.log(`Uploading to bucket "${bucket}" at path: ${path} (${fileBuffer.length} bytes)`)

    const { data, error } = await supabase.storage.from(bucket).upload(path, fileBuffer, {
      contentType,
      upsert: true,
    })

    if (error) {
      // Handle different error types
      let errorMessage = error.message || 'Storage upload failed'
      
      // Check if error is an HTML response (common when Supabase returns error page)
      if (typeof error === 'object' && 'originalError' in error) {
        const originalError = (error as any).originalError
        if (originalError && originalError.message && originalError.message.includes('Unexpected token')) {
          errorMessage = 'Storage service returned an invalid response. Please check your Supabase configuration and service role key.'
        }
      }

      // Provide specific error messages for common issues
      if (errorMessage.includes('Bucket not found') || errorMessage.includes('does not exist')) {
        errorMessage = `Storage bucket "${bucket}" does not exist. Please create it in Supabase Storage settings.`
      } else if (errorMessage.includes('new row violates row-level security') || errorMessage.includes('row-level security')) {
        errorMessage = `Permission denied. Please check bucket policies in Supabase Storage. Make sure the bucket is public or has proper RLS policies.`
      } else if (errorMessage.includes('Invalid API key') || errorMessage.includes('JWT')) {
        errorMessage = 'Invalid Supabase service role key. Please check your SUPABASE_SERVICE_ROLE_KEY environment variable.'
      }

      console.error('Supabase storage upload error:', {
        message: error.message,
        statusCode: (error as any).statusCode,
        error: error,
      })

      throw new Error(errorMessage)
    }

    if (!data || !data.path) {
      throw new Error('Upload succeeded but no data returned from storage')
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(data.path)

    if (!publicUrl) {
      throw new Error('Failed to generate public URL for uploaded file')
    }

    console.log(`✓ Successfully uploaded to: ${publicUrl}`)
    return publicUrl
  } catch (error) {
    console.error('Storage upload error:', error)
    
    // Re-throw with improved error message
    if (error instanceof Error) {
      throw error
    }
    
    // Handle unknown error types
    const errorStr = String(error)
    if (errorStr.includes('HTML') || errorStr.includes('<html>')) {
      throw new Error('Storage service returned an HTML error page. Please check your Supabase configuration, service role key, and storage bucket settings.')
    }
    
    throw new Error(`Storage upload failed: ${errorStr}`)
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
