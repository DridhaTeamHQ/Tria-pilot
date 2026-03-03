import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/auth'
import { writeFile, unlink } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

export async function POST(request: Request) {
  try {
    // Check authentication with regular client
    const supabase = await createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use service role client for storage operations to bypass RLS
    let serviceClient
    try {
      serviceClient = createServiceClient()
    } catch (error) {
      console.error('Service role key not configured, falling back to regular client:', error)
      // Fallback to regular client if service role key is not set
      serviceClient = supabase
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const bucket = (formData.get('bucket') as string) || 'uploads'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Save file temporarily
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const tempPath = join(tmpdir(), `${Date.now()}-${file.name}`)
    await writeFile(tempPath, buffer)

    // Upload to Supabase Storage using service role client (bypasses RLS)
    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    
    let uploadResult = await serviceClient.storage.from(bucket).upload(fileName, buffer, {
      contentType: file.type || 'image/jpeg',
      upsert: true,
    })

    let actualBucket = bucket

    // If bucket doesn't exist, try fallback to 'uploads'
    if (uploadResult.error && (uploadResult.error.message?.includes('Bucket not found') || uploadResult.error.message?.includes('does not exist'))) {
      console.warn(`Bucket "${bucket}" not found, trying fallback "uploads" bucket`)
      uploadResult = await serviceClient.storage.from('uploads').upload(fileName, buffer, {
        contentType: file.type || 'image/jpeg',
        upsert: true,
      })
      if (!uploadResult.error) {
        actualBucket = 'uploads'
      }
    }

    // Clean up temp file
    await unlink(tempPath).catch(() => {})

    if (uploadResult.error) {
      console.error('Supabase storage upload error:', uploadResult.error)
      const errorMessage = uploadResult.error.message || 'Failed to upload to storage'
      
      // Provide helpful error message for common issues
      let userFriendlyError = errorMessage
      if (errorMessage.includes('Bucket not found') || errorMessage.includes('does not exist')) {
        userFriendlyError = `Storage bucket "${bucket}" does not exist. Please create it in Supabase Storage settings, or it will fallback to "uploads" bucket.`
      } else if (errorMessage.includes('new row violates row-level security') || errorMessage.includes('row-level security')) {
        userFriendlyError = `Permission denied. Please check bucket policies in Supabase Storage. Make sure the bucket is public or has proper RLS policies.`
      }
      
      return NextResponse.json(
        { 
          error: userFriendlyError,
          details: uploadResult.error
        },
        { status: 500 }
      )
    }

    const { data } = uploadResult

    if (!data) {
      return NextResponse.json({ error: 'Upload failed - no data returned' }, { status: 500 })
    }

    // Get public URL (use service client for consistency)
    const {
      data: { publicUrl },
    } = serviceClient.storage.from(actualBucket).getPublicUrl(data.path)

    return NextResponse.json({ path: publicUrl, storagePath: data.path })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

