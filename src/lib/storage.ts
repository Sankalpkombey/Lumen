import { supabase } from './supabase'

export interface UploadResult {
  url: string
  path: string
}

export async function uploadPDF(
  file: File,
  userId: string,
  _onProgress?: (percent: number) => void
): Promise<UploadResult> {
  // Unique path per user so files never collide
  const fileName = `${Date.now()}-${file.name.replace(/\s/g, '_')}`
  const filePath = `${userId}/${fileName}`

  const { data, error } = await supabase.storage
    .from('documents')
    .upload(filePath, file, {
      contentType: 'application/pdf',
      upsert: false,
    })

  if (error) throw error

  // Get the public URL
  const { data: { publicUrl } } = supabase.storage
    .from('documents')
    .getPublicUrl(data.path)

  return {
    url: publicUrl,
    path: data.path
  }
}

export async function deletePDF(path: string): Promise<void> {
  const { error } = await supabase.storage
    .from('documents')
    .remove([path])

  if (error) throw error
}