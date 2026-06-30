import { useEffect } from 'react'
import { useAnnotationStore } from '../store/annotationStore'
import { supabase, type Highlight, type Note, type Tag } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useAnnotations(docId: string) {
  const { user } = useAuth()
  const {
    highlights, notes, tags,
    loading, fetchAnnotations, fetchTags,
    addHighlight, addNote, addTag,
    deleteHighlight, deleteNote,
  } = useAnnotationStore()

  useEffect(() => {
    if (!docId || !user) return
    fetchAnnotations(docId, user.id)
    fetchTags(user.id)
  }, [docId, user])

  async function saveHighlight(
    text: string,
    color: string,
    style: 'highlight' | 'underline',
    pageNumber: number,
    rangeInfo?: any
  ): Promise<Highlight | null> {
    if (!user) return null

    const { data, error } = await supabase
      .from('highlights')
      .insert({
        user_id: user.id,
        doc_id: docId,
        text,
        color,
        style,
        page_number: pageNumber,
        position: rangeInfo || {},
      })
      .select()
      .single()

    if (error || !data) return null
    addHighlight(data)
    return data
  }

  async function saveNote(
    highlightId: string,
    content: string,
    tagId: string | null
  ): Promise<Note | null> {
    if (!user) return null

    const { data, error } = await supabase
      .from('notes')
      .insert({
        user_id: user.id,
        doc_id: docId,
        highlight_id: highlightId,
        tag_id: tagId,
        content,
        type: 'tagged',
      })
      .select(`*, tags(*)`)
      .single()

    if (error || !data) return null
    addNote(data)
    return data
  }

  async function saveTag(
    name: string,
    color: string
  ): Promise<Tag | null> {
    if (!user) return null

    const { data, error } = await supabase
      .from('tags')
      .insert({ user_id: user.id, name, color })
      .select()
      .single()

    if (error || !data) return null
    addTag(data)
    return data
  }

  async function removeHighlight(id: string) {
    await supabase.from('highlights').delete().eq('id', id)
    deleteHighlight(id)
  }

  async function removeNote(id: string) {
    await supabase.from('notes').delete().eq('id', id)
    deleteNote(id)
  }

  return {
    highlights, notes, tags, loading,
    saveHighlight, saveNote, saveTag,
    removeHighlight, removeNote,
  }
}