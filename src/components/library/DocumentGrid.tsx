import { useDocumentStore } from '../../store/documentStore'
import DocumentCard from './DocumentCard'
import UploadZone from './UploadZone'

export default function DocumentGrid() {
  const { documents, categories, activeCategoryId, loading } = useDocumentStore()

  const filtered = activeCategoryId
    ? documents.filter(doc =>
        doc.document_categories?.some(
          dc => dc.category_id === activeCategoryId
        )
      )
    : documents

  const activeCategory = categories.find(c => c.id === activeCategoryId)

  return (
    <div className="flex-1 overflow-y-auto p-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          {activeCategory && (
            <span
              className="w-2.5 h-2.5 rounded-sm"
              style={{ background: activeCategory.color }}
            />
          )}
          <h2 className="text-base font-medium text-[#f0ede8]">
            {activeCategory ? activeCategory.name : 'All Documents'}
          </h2>
          <span className="text-xs text-[#3a3835] ml-1">
            {filtered.length}
          </span>
        </div>
      </div>

      {/* Upload zone */}
      <div className="mb-6">
        <UploadZone />
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-5 h-5 border-2 border-[#534AB7] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-16">
          <p className="text-sm text-[#3a3835]">
            {activeCategoryId
              ? 'No documents in this folder yet'
              : 'Upload your first PDF to get started'
            }
          </p>
        </div>
      )}

      {/* Grid */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filtered.map(doc => (
            <DocumentCard key={doc.id} doc={doc} />
          ))}
        </div>
      )}
    </div>
  )
}