import { useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useDocumentStore } from '../store/documentStore'
import LibraryHeader from '../components/library/LibraryHeader'
import Sidebar from '../components/library/Sidebar'
import DocumentGrid from '../components/library/DocumentGrid'

export default function LibraryPage() {
  const { user } = useAuth()
  const { fetchDocuments, fetchCategories } = useDocumentStore()

  useEffect(() => {
    if (user) {
      fetchDocuments(user.id)
      fetchCategories(user.id)
    }
  }, [user])

  return (
    <div className="min-h-screen bg-[#141210] flex flex-col">
      <LibraryHeader />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <DocumentGrid />
      </div>
    </div>
  )
}