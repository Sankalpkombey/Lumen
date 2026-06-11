import { create } from 'zustand'
import { supabase, type Document, type Category } from '../lib/supabase'

interface DocumentStore {
  documents: Document[]
  categories: Category[]
  loading: boolean
  activeCategoryId: string | null

  fetchDocuments: (userId: string) => Promise<void>
  fetchCategories: (userId: string) => Promise<void>
  addDocument: (doc: Document) => void
  updateDocument: (id: string, updates: Partial<Document>) => void
  deleteDocument: (id: string) => void
  addCategory: (cat: Category) => void
  deleteCategory: (id: string) => void
  setActiveCategory: (id: string | null) => void
}

export const useDocumentStore = create<DocumentStore>((set) => ({
  documents: [],
  categories: [],
  loading: false,
  activeCategoryId: null,

  fetchDocuments: async (userId) => {
    set({ loading: true })
    const { data } = await supabase
      .from('documents')
      .select(`
        *,
        document_categories (
          category_id,
          categories (*)
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    set({
      documents: data ?? [],
      loading: false
    })
  },

  fetchCategories: async (userId) => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    set({ categories: data ?? [] })
  },

  addDocument: (doc) =>
    set((state) => ({ documents: [doc, ...state.documents] })),

  updateDocument: (id, updates) =>
    set((state) => ({
      documents: state.documents.map((d) =>
        d.id === id ? { ...d, ...updates } : d
      )
    })),

  deleteDocument: (id) =>
    set((state) => ({
      documents: state.documents.filter((d) => d.id !== id)
    })),

  addCategory: (cat) =>
    set((state) => ({ categories: [...state.categories, cat] })),

  deleteCategory: (id) =>
    set((state) => ({
      categories: state.categories.filter((c) => c.id !== id)
    })),

  setActiveCategory: (id) => set({ activeCategoryId: id }),
}))