import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseAndUserId } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { supabase, userId } = await getServerSupabaseAndUserId()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 })
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}/${Date.now()}.${fileExt}`

    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true, // Replace if exists
      })

    if (uploadError) {
      console.error('[avatar/upload] Storage error:', uploadError)
      
      // Provide more specific error messages
      let errorMessage = 'Failed to upload image'
      if (uploadError.message?.includes('Bucket not found') || uploadError.message?.includes('does not exist')) {
        errorMessage = 'Storage bucket not configured. Please create an "avatars" bucket in Supabase Storage.'
      } else if (uploadError.message?.includes('permission') || uploadError.message?.includes('policy')) {
        errorMessage = 'Permission denied. Please check storage bucket policies.'
      } else if (uploadError.message) {
        errorMessage = `Upload failed: ${uploadError.message}`
      }
      
      return NextResponse.json({ 
        error: errorMessage,
        details: uploadError.message 
      }, { status: 500 })
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName)

    // Update profile with avatar URL
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('user_id', userId)

    if (updateError) {
      console.error('[avatar/upload] Profile update error:', updateError)
      // Try to delete the uploaded file if profile update fails
      await supabase.storage.from('avatars').remove([fileName])
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
    }

    return NextResponse.json({ avatar_url: publicUrl }, { status: 200 })
  } catch (err: any) {
    console.error('[avatar/upload] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { supabase, userId } = await getServerSupabaseAndUserId()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current avatar URL from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('user_id', userId)
      .single()

    if (profile?.avatar_url) {
      // Extract file path from URL
      const urlParts = profile.avatar_url.split('/avatars/')
      if (urlParts.length > 1) {
        const fileName = urlParts[1].split('?')[0] // Remove query params if any
        // Delete from storage
        await supabase.storage.from('avatars').remove([fileName])
      }
    }

    // Remove avatar URL from profile
    const { error } = await supabase
      .from('profiles')
      .update({ avatar_url: null })
      .eq('user_id', userId)

    if (error) {
      console.error('[avatar/delete] Error:', error)
      return NextResponse.json({ error: 'Failed to delete avatar' }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err: any) {
    console.error('[avatar/delete] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

