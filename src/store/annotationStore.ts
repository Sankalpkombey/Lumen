import { create } from 'zustand'
import { supabase, type Highlight, type Note, type Tag } from '../lib/supabase'

interface AnnotationStore {
  highlights: Highlight[]
  notes: Note[]
  tags: Tag[]
  loading: boolean

  fetchAnnotations: (docId: string, userId: string) => Promise<void>
  fetchTags: (userId: string) => Promise<void>
  addHighlight: (highlight: Highlight) => void
  addNote: (note: Note) => void
  addTag: (tag: Tag) => void
  deleteHighlight: (id: string) => void
  deleteNote: (id: string) => void
}

export const useAnnotationStore = create<AnnotationStore>((set) => ({
  highlights: [],
  notes: [],
  tags: [],
  loading: false,

  fetchAnnotations: async (docId, userId) => {
    set({ loading: true })

    const [highlightsRes, notesRes] = await Promise.all([
      supabase
        .from('highlights')
        .select('*')
        .eq('doc_id', docId)
        .eq('user_id', userId)
        .order('created_at', { ascending: true }),

      supabase
        .from('notes')
        .select(`*, tags(*)`)
        .eq('doc_id', docId)
        .eq('user_id', userId)
        .order('created_at', { ascending: true }),
    ])

    set({
      highlights: highlightsRes.data ?? [],
      notes: notesRes.data ?? [],
      loading: false,
    })
  },

  fetchTags: async (userId) => {
    const { data } = await supabase
      .from('tags')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    set({ tags: data ?? [] })
  },

  addHighlight: (highlight) =>
    set((state) => ({ highlights: [...state.highlights, highlight] })),

  addNote: (note) =>
    set((state) => ({ notes: [...state.notes, note] })),

  addTag: (tag) =>
    set((state) => ({ tags: [...state.tags, tag] })),

  deleteHighlight: (id) =>
    set((state) => ({
      highlights: state.highlights.filter((h) => h.id !== id),
      notes: state.notes.filter((n) => n.highlight_id !== id),
    })),

  deleteNote: (id) =>
    set((state) => ({
      notes: state.notes.filter((n) => n.id !== id),
    })),
}))