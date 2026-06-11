import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useDocumentStore } from '../../store/documentStore'
import { uploadPDF } from '../../lib/storage'

export default function UploadZone() {
  const { user } = useAuth()
  const { addDocument } = useDocumentStore()
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0]
    if (!file || !user) return

    setUploading(true)
    setError(null)
    setProgress(0)

    try {
      // Upload to supabase
      const result = await uploadPDF(file, user.id, setProgress)

      // Save metadata to Supabase
      const { data, error: dbError } = await supabase
        .from('documents')
        .insert({
          user_id: user.id,
          name: file.name,
          file_url: result.url,
          storage_path: result.path, //This should be the name of the file in the bucket
          status: 'unread',
          last_page: 1,
          total_pages: 0,
        })
        .select()
        .single()

      if (dbError) throw dbError
      if (data) addDocument(data)

    } catch (err) {
      setError('Upload failed. Please try again.')
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }, [user, addDocument])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    disabled: uploading,
  })

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
        isDragActive
          ? 'border-[#534AB7] bg-[#534AB7]/5'
          : 'border-white/10 hover:border-white/20 hover:bg-white/2'
      } ${uploading ? 'pointer-events-none' : ''}`}
    >
      <input {...getInputProps()} />

      {uploading ? (
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#534AB7] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[#a09d98]">Uploading... {progress}%</p>
          <div className="w-48 h-1 bg-[#242220] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#534AB7] rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <div className="w-10 h-10 rounded-2xl bg-[#242220] flex items-center justify-center mb-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5a5855" strokeWidth="1.5">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
            </svg>
          </div>
          <p className="text-sm text-[#a09d98]">
            {isDragActive ? 'Drop your PDF here' : 'Drag a PDF here or click to upload'}
          </p>
          <p className="text-xs text-[#3a3835]">PDF files only</p>
        </div>
      )}

      {error && (
        <p className="mt-3 text-xs text-[#F0997B]">{error}</p>
      )}
    </div>
  )
}