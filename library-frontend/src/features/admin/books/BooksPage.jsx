import { useEffect, useRef, useState } from 'react'
import {
  createBook,
  updateBook,
  deleteBook,
  importBooksFromCsv,
  getCategories,
  getDeletedBooks,
  restoreBook,
  uploadBookCover,
} from '../../../services/bookService'

const EMPTY_FORM = {
  title: '',
  author: '',
  isbn: '',
  edition: '1',
  totalQuantity: '1',
  categoryId: '',
  coverImageUrl: '',
  description: '',
  publisher: '',
  publicationYear: '',
  language: '',
  pageCount: '',
}

const IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/svg+xml',
  'image/avif',
]

function normalizeImagePath(path) {
  if (!path || typeof path !== 'string') return ''

  let normalized = path.trim().replace(/\\/g, '/')
  normalized = normalized.replace(/^file:\/\/\/?/i, '')

  if (/^[a-zA-Z]:[\\/]/.test(normalized)) return normalized

  if (!/^https?:\/\//i.test(normalized)) {
    normalized = normalized.replace(/\/{2,}/g, '/')
    if (normalized && !normalized.startsWith('/')) {
      normalized = `/${normalized}`
    }
  }

  return normalized
}

function isWindowsFilePath(path) {
  return /^[a-zA-Z]:[\\/]/.test(path) || /^\\\\/.test(path)
}

function getBookTitle(book) {
  return book?.title || book?.name || 'Chưa có tên sách'
}

function getBookId(book) {
  return book?.id ?? book?.bookId
}

function BooksPage({
  books = [],
  page = 0,
  totalPages = 0,
  totalElements = 0,
  keyword = '',
  searchInput = '',
  setSearchInput,
  isBooksLoading = false,
  error = '',
  onSearch,
  onLoadBooks,
  filters = {},
  onFiltersChange,
  permissions = [],
  isAdmin = false,
}) {
  const permissionSet = new Set(Array.isArray(permissions) ? permissions : [])
  const can = (permission) => isAdmin || permissionSet.has(permission)
  const canCreate = can('BOOK_CREATE')
  const canUpdate = can('BOOK_UPDATE')
  const canDelete = can('BOOK_DELETE')
  const canImport = can('BOOK_IMPORT')

  const [showForm, setShowForm] = useState(false)
  const [editingBook, setEditingBook] = useState(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [formError, setFormError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const [notice, setNotice] = useState('')
  const [importResult, setImportResult] = useState(null)
  const [isImporting, setIsImporting] = useState(false)
  const fileInputRef = useRef(null)
  const coverInputRef = useRef(null)

  const [localCoverPreview, setLocalCoverPreview] = useState('')
  const [selectedCoverFile, setSelectedCoverFile] = useState(null)
  const [coverPreviewError, setCoverPreviewError] = useState(false)

  const [categories, setCategories] = useState([])
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(false)
  const [categoriesError, setCategoriesError] = useState('')

  const [showTrash, setShowTrash] = useState(false)

  const categoryFilter = filters.categoryId ?? 'all'

  const stockFilter =
    filters.stockStatus === 'AVAILABLE'
      ? 'available'
      : filters.stockStatus === 'LOW_STOCK'
        ? 'low'
        : filters.stockStatus === 'OUT_OF_STOCK'
          ? 'out'
          : 'all'

  const sortBy =
    filters.sortBy === 'title' && filters.sortDir === 'desc'
      ? 'title-desc'
      : filters.sortBy === 'totalQuantity' && filters.sortDir === 'desc'
        ? 'quantity-desc'
        : filters.sortBy === 'totalQuantity' && filters.sortDir === 'asc'
          ? 'quantity-asc'
          : filters.sortBy === 'availableQuantity'
            ? 'available-asc'
            : 'title-asc'

  const [detailBook, setDetailBook] = useState(null)
  const [deletedBooks, setDeletedBooks] = useState([])
  const [isTrashLoading, setIsTrashLoading] = useState(false)

  const getAvailableQuantity = (book) =>
    Number(
      book?.availableQuantity ??
        book?.availableCopies ??
        book?.remainingQuantity ??
        0,
    ) || 0

  const getTotalQuantity = (book) =>
    Number(book?.totalQuantity ?? 0) || 0

  // Backend đã lọc và sắp xếp trước khi phân trang.
  // Không lọc/sắp xếp lại riêng 10 dòng của trang hiện tại ở frontend.
  const visibleBooks = books

  function exportVisibleBooks() {
    const headers = [
      'STT',
      'Tên sách',
      'Tác giả',
      'ISBN',
      'Phiên bản / tái bản',
      'Danh mục',
      'Tổng số lượng',
      'Còn lại',
    ]

    const rows = visibleBooks.map((book, index) => [
      page * 10 + index + 1,
      getBookTitle(book),
      book.author || '',
      book.isbn || '',
      book.edition ?? '',
      book.categoryName || book.category?.name || '',
      book.totalQuantity ?? '',
      getAvailableQuantity(book),
    ])

    const escapeCsv = (value) =>
      `"${String(value ?? '').replace(/"/g, '""')}"`

    const csv =
      '\uFEFF' +
      [headers, ...rows]
        .map((row) => row.map(escapeCsv).join(','))
        .join('\r\n')

    const blob = new Blob([csv], {
      type: 'text/csv;charset=utf-8;',
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = `danh-sach-sach-trang-${page + 1}.csv`

    document.body.appendChild(link)
    link.click()
    link.remove()

    URL.revokeObjectURL(url)
  }

  useEffect(() => {
    let cancelled = false

    async function loadCategories() {
      setIsCategoriesLoading(true)
      setCategoriesError('')

      try {
        const result = await getCategories()

        if (!cancelled) {
          setCategories(Array.isArray(result) ? result : [])
        }
      } catch (err) {
        if (!cancelled) {
          setCategoriesError(
            err.message || 'Không thể tải danh sách danh mục.',
          )
        }
      } finally {
        if (!cancelled) {
          setIsCategoriesLoading(false)
        }
      }
    }

    void loadCategories()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    return () => {
      if (localCoverPreview) {
        URL.revokeObjectURL(localCoverPreview)
      }
    }
  }, [localCoverPreview])

  function clearLocalCoverPreview() {
    setLocalCoverPreview((current) => {
      if (current) URL.revokeObjectURL(current)
      return ''
    })
  }

  function openCreateForm() {
    if (!canCreate) return

    clearLocalCoverPreview()
    setSelectedCoverFile(null)
    setEditingBook(null)
    setForm({ ...EMPTY_FORM })
    setFormError('')
    setCoverPreviewError(false)
    setShowForm(true)
  }

  function openEditForm(book) {
    if (!canUpdate) return

    clearLocalCoverPreview()
    setSelectedCoverFile(null)
    setEditingBook(book)

    setForm({
      title: book.title ?? book.name ?? '',
      author: book.author ?? '',
      isbn: book.isbn ?? '',
      edition: String(book.edition ?? '1'),
      totalQuantity: String(book.totalQuantity ?? 1),
      categoryId:
        book.categoryId != null ? String(book.categoryId) : '',
      coverImageUrl: normalizeImagePath(book.coverImageUrl ?? ''),
      description: book.description ?? '',
      publisher: book.publisher ?? '',
      publicationYear: book.publicationYear != null ? String(book.publicationYear) : '',
      language: book.language ?? '',
      pageCount: book.pageCount != null ? String(book.pageCount) : '',
    })

    setFormError('')
    setCoverPreviewError(false)
    setShowForm(true)
  }

  function closeForm() {
    if (isSaving) return

    clearLocalCoverPreview()
    setSelectedCoverFile(null)
    setShowForm(false)
    setEditingBook(null)
    setForm({ ...EMPTY_FORM })
    setFormError('')
    setCoverPreviewError(false)
  }

  function handleFormChange(event) {
    const { name, value } = event.target

    setForm((current) => ({
      ...current,
      [name]:
        name === 'coverImageUrl'
          ? normalizeImagePath(value)
          : value,
    }))

    if (name === 'coverImageUrl') {
      clearLocalCoverPreview()
      setSelectedCoverFile(null)
      setCoverPreviewError(false)
      setFormError('')
    }
  }

  function handleLocalCoverChange(event) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) return

    const extension = file.name.split('.').pop()?.toLowerCase()

    const allowedExtensions = [
      'jpg',
      'jpeg',
      'png',
      'webp',
      'gif',
      'bmp',
      'svg',
      'avif',
    ]

    if (
      !IMAGE_TYPES.includes(file.type) &&
      !allowedExtensions.includes(extension)
    ) {
      setFormError(
        'Định dạng ảnh chưa được hỗ trợ. Hãy chọn JPG, JPEG, PNG, WEBP, GIF, BMP, SVG hoặc AVIF.',
      )
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setFormError('Ảnh bìa không được vượt quá 10 MB.')
      return
    }

    clearLocalCoverPreview()

    const previewUrl = URL.createObjectURL(file)

    setLocalCoverPreview(previewUrl)
    setSelectedCoverFile(file)
    setCoverPreviewError(false)
    setFormError('')
  }

  async function handleSave(event) {
    if (editingBook ? !canUpdate : !canCreate) return

    event.preventDefault()
    setFormError('')
    setNotice('')

    const title = form.title.trim()
    const author = form.author.trim()
    const isbn = form.isbn
      .trim()
      .replace(/[\s-]/g, '')
      .toUpperCase()

    const edition = String(form.edition ?? '').trim()
    const totalQuantity = Number(form.totalQuantity)
    const categoryId = Number(form.categoryId)
    const coverImageUrl = normalizeImagePath(form.coverImageUrl)
    const description = form.description.trim()
    const publisher = form.publisher.trim()
    const publicationYear = form.publicationYear.trim() === '' ? null : Number(form.publicationYear)
    const language = form.language.trim()
    const pageCount = form.pageCount.trim() === '' ? null : Number(form.pageCount)

    if (!title || !author) {
      setFormError('Tên sách và tác giả không được để trống.')
      return
    }

    if (isbn.length > 20) {
      setFormError('ISBN không được vượt quá 20 ký tự.')
      return
    }

    if (edition.length > 100) {
      setFormError('Phiên bản/tái bản phải có tối đa 100 ký tự.')
      return
    }

    if (!Number.isInteger(totalQuantity) || totalQuantity < 1) {
      setFormError('Tổng số lượng phải là số nguyên từ 1 trở lên.')
      return
    }

    if (
      !form.categoryId ||
      !Number.isInteger(categoryId) ||
      categoryId < 1
    ) {
      setFormError('Vui lòng chọn danh mục.')
      return
    }

    if (publisher.length > 255) {
      setFormError('Nhà xuất bản không được vượt quá 255 ký tự.')
      return
    }

    if (language.length > 100) {
      setFormError('Ngôn ngữ không được vượt quá 100 ký tự.')
      return
    }

    if (publicationYear !== null && (!Number.isInteger(publicationYear) || publicationYear < 0 || publicationYear > new Date().getFullYear() + 1)) {
      setFormError('Năm xuất bản phải là số nguyên hợp lệ.')
      return
    }

    if (pageCount !== null && (!Number.isInteger(pageCount) || pageCount < 1)) {
      setFormError('Số trang phải là số nguyên lớn hơn 0.')
      return
    }

    if (coverImageUrl.length > 1000) {
      setFormError('Đường dẫn ảnh bìa không được vượt quá 1000 ký tự.')
      return
    }

    if (coverImageUrl && isWindowsFilePath(coverImageUrl)) {
      setFormError(
        'Không nhập đường dẫn ổ đĩa Windows. Hãy dùng URL ảnh hoặc đường dẫn ảnh trong thư mục public.',
      )
      return
    }

    setIsSaving(true)

    let savedBook
    const isEditing = Boolean(editingBook)

    try {
      const payload = {
        title,
        author,
        isbn: isbn || null,
        edition: edition || null,
        totalQuantity,
        categoryId,
        coverImageUrl: coverImageUrl || null,
        description: description || null,
        publisher: publisher || null,
        publicationYear,
        language: language || null,
        pageCount,
      }

      savedBook = isEditing
        ? await updateBook(getBookId(editingBook), payload)
        : await createBook(payload)

      let coverUploadError = ''

      if (selectedCoverFile) {
        try {
          await uploadBookCover(
            getBookId(savedBook || editingBook),
            selectedCoverFile,
          )
        } catch (err) {
          coverUploadError =
            err.message || 'Không thể tải ảnh bìa lên máy chủ.'
        }
      }

      setNotice(
        coverUploadError
          ? `${isEditing ? 'Thông tin sách đã được cập nhật' : 'Sách đã được thêm'}, nhưng ảnh bìa chưa lưu được: ${coverUploadError}`
          : `${isEditing ? 'Cập nhật sách' : 'Thêm sách'} thành công${selectedCoverFile ? ' và đã lưu ảnh bìa lên máy chủ.' : '.'}`,
      )

      clearLocalCoverPreview()
      setSelectedCoverFile(null)
      setShowForm(false)
      setEditingBook(null)
      setForm({ ...EMPTY_FORM })

      try {
        await onLoadBooks?.(page)
      } catch {
        // Không ghi đè kết quả lưu sách bằng lỗi tải lại danh sách.
      }
    } catch (err) {
      setFormError(err.message || 'Không thể lưu thông tin sách.')
    } finally {
      setIsSaving(false)
    }
  }
    async function handleDelete(book) {
    if (!canDelete) return

    const title = getBookTitle(book)
    const id = getBookId(book)

    if (!window.confirm(`Bạn có chắc muốn xóa sách "${title}" không?`)) {
      return
    }

    setNotice('')
    setFormError('')

    try {
      await deleteBook(id)
      setNotice(`Đã xóa sách "${title}" thành công.`)

      const nextPage = books.length === 1 && page > 0 ? page - 1 : page
      await onLoadBooks?.(nextPage)
    } catch (err) {
      setFormError(err.message || 'Không thể xóa sách.')
    }
  }

  async function loadTrash() {
    setIsTrashLoading(true)
    setFormError('')
    setNotice('')

    try {
      const result = await getDeletedBooks()
      setDeletedBooks(Array.isArray(result) ? result : [])
      setShowTrash(true)
      setShowForm(false)
      setEditingBook(null)
    } catch (err) {
      setFormError(err.message || 'Không thể tải thùng rác sách.')
    } finally {
      setIsTrashLoading(false)
    }
  }

  async function handleRestore(book) {
    if (!canDelete) return

    const title = getBookTitle(book)
    const id = getBookId(book)

    if (!window.confirm(`Bạn có muốn khôi phục sách "${title}" không?`)) {
      return
    }

    setFormError('')
    setNotice('')

    try {
      await restoreBook(id)
      setDeletedBooks((current) =>
        current.filter((item) => getBookId(item) !== id),
      )
      setNotice(`Đã khôi phục sách "${title}" thành công.`)
      await onLoadBooks?.(0)
    } catch (err) {
      setFormError(err.message || 'Không thể khôi phục sách.')
    }
  }

  async function toggleTrash() {
    if (!canDelete) return

    if (showTrash) {
      setShowTrash(false)
      setFormError('')
      setNotice('')
      await onLoadBooks?.(0)
      return
    }

    await loadTrash()
  }

  async function handleImport(event) {
    if (!canImport) return

    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) return

    setImportResult(null)
    setNotice('')
    setFormError('')

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setFormError('Vui lòng chọn file có định dạng .csv.')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setFormError('File CSV không được vượt quá 5 MB.')
      return
    }

    setIsImporting(true)

    try {
      const result = await importBooksFromCsv(file)

      setImportResult({
        success: result?.success ?? 0,
        failed: result?.failed ?? 0,
        errors: Array.isArray(result?.errors) ? result.errors : [],
      })

      setNotice('Đã xử lý file CSV.')
      await onLoadBooks?.(page)
    } catch (err) {
      setFormError(err.message || 'Import CSV thất bại.')
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <section className="library-content admin-books">
      <div className="library-heading admin-books__heading">
        <div>
          <p className="eyebrow">LIBRARY MANAGEMENT</p>
          <h1>{showTrash ? 'Thùng rác sách' : 'Quản lý sách'}</h1>
          <p>
            {showTrash
              ? 'Xem và khôi phục các đầu sách đã xóa.'
              : 'Tra cứu, thêm, chỉnh sửa và nhập dữ liệu sách.'}
          </p>
        </div>

        <div className="admin-books__heading-actions">
          {canDelete && (
            <button
              type="button"
              className="admin-books__button admin-books__button--secondary"
              disabled={isTrashLoading}
              onClick={toggleTrash}
            >
              {isTrashLoading
                ? 'Đang tải...'
                : showTrash
                  ? 'Quay lại danh sách'
                  : 'Thùng rác'}
            </button>
          )}

          {!showTrash && (
            <>
              <button
                type="button"
                className="admin-books__button admin-books__button--secondary"
                onClick={exportVisibleBooks}
                disabled={visibleBooks.length === 0}
                title="Xuất các sách đang hiển thị trong trang hiện tại"
              >
                Xuất CSV
              </button>

              {canImport && (
                <>
                  <button
                    type="button"
                    className="admin-books__button admin-books__button--secondary"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isImporting}
                  >
                    {isImporting ? 'Đang nhập...' : 'Nhập CSV'}
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    hidden
                    onChange={handleImport}
                  />
                </>
              )}

              {canCreate && (
                <button
                  type="button"
                  className="admin-books__button"
                  onClick={openCreateForm}
                >
                  + Thêm sách
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {error && !showTrash && (
        <p className="admin-books__inline-error" role="alert">
          {error}
        </p>
      )}

      {formError && (
        <p className="admin-books__inline-error" role="alert">
          {formError}
        </p>
      )}

      {notice && (
        <p className="admin-books__notice" role="status">
          {notice}
        </p>
      )}

      {importResult && (
        <div className="admin-books__import-result" role="status">
          <p>
            Nhập CSV hoàn tất: thành công {importResult.success}, thất bại{' '}
            {importResult.failed}.
          </p>

          {importResult.errors.length > 0 && (
            <ul>
              {importResult.errors.map((item, index) => (
                <li key={`${index}-${String(item)}`}>
                  {typeof item === 'string' ? item : JSON.stringify(item)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {showTrash ? (
        <div className="admin-books__table-wrapper">
          {isTrashLoading ? (
            <p className="admin-books__empty">Đang tải thùng rác...</p>
          ) : (
            <table className="admin-books__table">
              <thead>
                <tr>
                  <th>Tên sách</th>
                  <th>Tác giả</th>
                  <th>ISBN</th>
                  <th>Phiên bản / tái bản</th>
                  <th>Danh mục</th>
                  <th>Tổng số lượng</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {deletedBooks.map((book) => (
                  <tr key={getBookId(book)}>
                    <td>{getBookTitle(book)}</td>
                    <td>{book.author || '—'}</td>
                    <td>{book.isbn || '—'}</td>
                    <td>{book.edition ?? '—'}</td>
                    <td>{book.categoryName || book.category?.name || '—'}</td>
                    <td>{book.totalQuantity ?? '—'}</td>
                    <td>
                      <button
                        type="button"
                        className="admin-books__button"
                        disabled={!canDelete}
                        onClick={() => handleRestore(book)}
                      >
                        Khôi phục
                      </button>
                    </td>
                  </tr>
                ))}

                {deletedBooks.length === 0 && (
                  <tr>
                    <td colSpan={7} className="admin-books__empty">
                      Thùng rác đang trống.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <>
          <div className="admin-books__filter-row">
            <label>
              <span>Danh mục</span>
              <select
                value={categoryFilter}
                disabled={isBooksLoading}
                onChange={(event) => {
                  const nextCategoryId = event.target.value
                  onFiltersChange?.({
                    ...filters,
                    categoryId: nextCategoryId,
                  })
                }}
              >
                <option value="all">Tất cả danh mục</option>
                {categories.map((category) => (
                  <option key={category.id} value={String(category.id)}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Tình trạng kho</span>
              <select
                value={stockFilter}
                onChange={(event) => {
                  const value = event.target.value

                  const stockStatus =
                    value === 'available'
                      ? 'AVAILABLE'
                      : value === 'low'
                        ? 'LOW_STOCK'
                        : value === 'out'
                          ? 'OUT_OF_STOCK'
                          : 'ALL'

                  onFiltersChange?.({
                    ...filters,
                    stockStatus,
                  })
                }}
              >
                <option value="all">Tất cả tình trạng</option>
                <option value="available">Còn bản khả dụng</option>
                <option value="low">Sắp hết (1–3 bản)</option>
                <option value="out">Hết hàng</option>
              </select>
            </label>

            <label>
              <span>Sắp xếp</span>
              <select
                value={sortBy}
                onChange={(event) => {
                  const value = event.target.value

                  const sort =
                    value === 'title-desc'
                      ? { sortBy: 'title', sortDir: 'desc' }
                      : value === 'quantity-desc'
                        ? { sortBy: 'totalQuantity', sortDir: 'desc' }
                        : value === 'quantity-asc'
                          ? { sortBy: 'totalQuantity', sortDir: 'asc' }
                          : value === 'available-asc'
                            ? {
                                sortBy: 'availableQuantity',
                                sortDir: 'asc',
                              }
                            : { sortBy: 'title', sortDir: 'asc' }

                  onFiltersChange?.({
                    ...filters,
                    ...sort,
                  })
                }}
              >
                <option value="title-asc">Tên sách A–Z</option>
                <option value="title-desc">Tên sách Z–A</option>
                <option value="quantity-desc">
                  Tổng số lượng giảm dần
                </option>
                <option value="quantity-asc">
                  Tổng số lượng tăng dần
                </option>
                <option value="available-asc">Còn lại ít đến nhiều</option>
              </select>
            </label>

            <button
              type="button"
              className="admin-books__button admin-books__button--secondary"
              onClick={() => {
                onFiltersChange?.({
                  categoryId: 'all',
                  stockStatus: 'ALL',
                  sortBy: 'title',
                  sortDir: 'asc',
                })
              }}
            >
              Xóa bộ lọc
            </button>
          </div>

          <form
            className="admin-books__filters"
            onSubmit={(event) => {
              event.preventDefault()
              onSearch?.(event)
            }}
          >
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput?.(event.target.value)}
              placeholder="Tìm theo tên sách, tác giả..."
              aria-label="Tìm kiếm sách"
            />

            <button
              type="submit"
              className="admin-books__button"
              disabled={isBooksLoading}
            >
              Tìm kiếm
            </button>
          </form>

          <div className="admin-books__table-wrapper">
            <table className="admin-books__table">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Tên sách</th>
                  <th>Tác giả</th>
                  <th>ISBN</th>
                  <th>Phiên bản / tái bản</th>
                  <th>Danh mục</th>
                  <th>Tổng số lượng</th>
                  <th>Còn lại</th>
                  <th>Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {isBooksLoading ? (
                  <tr>
                    <td colSpan={9} className="admin-books__empty">
                      Đang tải danh sách sách...
                    </td>
                  </tr>
                ) : visibleBooks.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="admin-books__empty">
                      Không có sách phù hợp với bộ lọc hiện tại.
                    </td>
                  </tr>
                ) : (
                  visibleBooks.map((book, index) => (
                    <tr key={getBookId(book)}>
                      <td>{page * 10 + index + 1}</td>

                      <td>
                        <button
                          type="button"
                          className="admin-books__book-title-link"
                          onClick={() => setDetailBook(book)}
                          title="Xem thông tin chi tiết sách"
                        >
                          {getBookTitle(book)}
                        </button>

                        {book.coverImageUrl && (
                          <span className="admin-books__cover-available">
                            Có ảnh bìa
                          </span>
                        )}
                      </td>

                      <td>{book.author || '—'}</td>
                      <td>{book.isbn || '—'}</td>
                      <td>{book.edition ?? '—'}</td>
                      <td>{book.categoryName || book.category?.name || '—'}</td>
                      <td>{book.totalQuantity ?? '—'}</td>
                      <td>
                        {book.availableQuantity ??
                          book.availableCopies ??
                          book.remainingQuantity ??
                          '—'}
                      </td>

                      <td className="admin-books__row-actions">
                        {canUpdate && (
                          <button
                            type="button"
                            className="admin-books__button admin-books__button--secondary"
                            onClick={() => openEditForm(book)}
                          >
                            Sửa
                          </button>
                        )}

                        {canDelete && (
                          <button
                            type="button"
                            className="admin-books__button admin-books__button--danger"
                            onClick={() => handleDelete(book)}
                          >
                            Xóa
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <footer className="admin-books__pagination">
            <span>
              Trang {totalPages > 0 ? page + 1 : 0}/{totalPages} ·{' '}
              {totalElements} đầu sách
              {categoryFilter !== 'all'
                ? ' trong danh mục đã chọn'
                : ''}
            </span>

            <div>
              <button
                type="button"
                className="admin-books__button admin-books__button--secondary"
                disabled={isBooksLoading || page <= 0}
                onClick={() => onLoadBooks?.(page - 1)}
              >
                Trước
              </button>

              <button
                type="button"
                className="admin-books__button admin-books__button--secondary"
                disabled={
                  isBooksLoading ||
                  totalPages === 0 ||
                  page + 1 >= totalPages
                }
                onClick={() => onLoadBooks?.(page + 1)}
              >
                Sau
              </button>
            </div>
          </footer>
        </>
      )}
            {detailBook && !showTrash && (
        <div
          className="admin-books__modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setDetailBook(null)
          }}
        >
          <section
            className="admin-books__form-modal admin-books__detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-book-detail-title"
          >
            <div className="admin-books__modal-header">
              <div>
                <p className="eyebrow">BOOK DETAILS</p>
                <h2 id="admin-book-detail-title">Chi tiết sách</h2>
              </div>

              <button
                type="button"
                className="admin-books__close-button"
                onClick={() => setDetailBook(null)}
                aria-label="Đóng chi tiết"
              >
                ×
              </button>
            </div>

            <div className="admin-books__detail-content">
              {detailBook.coverImageUrl && (
                <img
                  className="admin-books__detail-cover"
                  src={normalizeImagePath(detailBook.coverImageUrl)}
                  alt={`Bìa ${getBookTitle(detailBook)}`}
                  onError={(event) => {
                    event.currentTarget.style.display = 'none'
                  }}
                />
              )}

              <dl>
                <div>
                  <dt>Tên sách</dt>
                  <dd>{getBookTitle(detailBook)}</dd>
                </div>
                <div>
                  <dt>Tác giả</dt>
                  <dd>{detailBook.author || '—'}</dd>
                </div>
                <div>
                  <dt>ISBN</dt>
                  <dd>{detailBook.isbn || '—'}</dd>
                </div>
                <div>
                  <dt>Phiên bản / tái bản</dt>
                  <dd>{detailBook.edition ?? '—'}</dd>
                </div>
                <div>
                  <dt>Mô tả</dt>
                  <dd>{detailBook.description || '—'}</dd>
                </div>
                <div>
                  <dt>Nhà xuất bản</dt>
                  <dd>{detailBook.publisher || '—'}</dd>
                </div>
                <div>
                  <dt>Năm xuất bản</dt>
                  <dd>{detailBook.publicationYear ?? '—'}</dd>
                </div>
                <div>
                  <dt>Ngôn ngữ</dt>
                  <dd>{detailBook.language || '—'}</dd>
                </div>
                <div>
                  <dt>Số trang</dt>
                  <dd>{detailBook.pageCount ?? '—'}</dd>
                </div>
                <div>
                  <dt>Danh mục</dt>
                  <dd>
                    {detailBook.categoryName ||
                      detailBook.category?.name ||
                      '—'}
                  </dd>
                </div>
                <div>
                  <dt>Tổng số lượng</dt>
                  <dd>{detailBook.totalQuantity ?? '—'}</dd>
                </div>
                <div>
                  <dt>Còn khả dụng</dt>
                  <dd>{getAvailableQuantity(detailBook)}</dd>
                </div>
                <div>
                  <dt>Trạng thái kho</dt>
                  <dd>
                    {getAvailableQuantity(detailBook) <= 0
                      ? 'Hết hàng'
                      : getAvailableQuantity(detailBook) <= 3
                        ? 'Sắp hết'
                        : 'Còn hàng'}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="admin-books__form-actions">
              {canUpdate && (
                <button
                  type="button"
                  className="admin-books__button"
                  onClick={() => {
                    const selected = detailBook
                    setDetailBook(null)
                    openEditForm(selected)
                  }}
                >
                  Chỉnh sửa
                </button>
              )}

              <button
                type="button"
                className="admin-books__button admin-books__button--secondary"
                onClick={() => setDetailBook(null)}
              >
                Đóng
              </button>
            </div>
          </section>
        </div>
      )}

      {showForm && (
        <div
          className="admin-books__modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeForm()
          }}
        >
          <section
            className="admin-books__form-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-book-form-title"
          >
            <h2 id="admin-book-form-title">
              {editingBook ? 'Chỉnh sửa sách' : 'Thêm sách mới'}
            </h2>

            <form onSubmit={handleSave}>
              <label>
                Tên sách <span>*</span>
                <input
                  name="title"
                  value={form.title}
                  onChange={handleFormChange}
                  maxLength={255}
                  required
                />
              </label>

              <label>
                Tác giả <span>*</span>
                <input
                  name="author"
                  value={form.author}
                  onChange={handleFormChange}
                  maxLength={255}
                  required
                />
              </label>

              <label>
                ISBN
                <input
                  name="isbn"
                  value={form.isbn}
                  onChange={handleFormChange}
                  maxLength={20}
                  placeholder="Ví dụ: 978604..."
                />
              </label>

              <label>
                Phiên bản / lần tái bản 
                <input
                  name="edition"
                  value={form.edition}
                  onChange={handleFormChange}
                  maxLength={100}
                  placeholder="Ví dụ: 1 hoặc Tái bản lần 2"
                />
              </label>

              <label>
                Mô tả sách
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleFormChange}
                  rows={4}
                  maxLength={10000}
                  placeholder="Giới thiệu nội dung sách..."
                />
              </label>

              <label>
                Nhà xuất bản
                <input
                  name="publisher"
                  value={form.publisher}
                  onChange={handleFormChange}
                  maxLength={255}
                  placeholder="Tên nhà xuất bản"
                />
              </label>

              <label>
                Năm xuất bản
                <input
                  type="number"
                  name="publicationYear"
                  value={form.publicationYear}
                  onChange={handleFormChange}
                  min="0"
                  max={new Date().getFullYear() + 1}
                  step="1"
                  placeholder="Ví dụ: 2024"
                />
              </label>

              <label>
                Ngôn ngữ
                <input
                  name="language"
                  value={form.language}
                  onChange={handleFormChange}
                  maxLength={100}
                  placeholder="Ví dụ: Tiếng Việt"
                />
              </label>

              <label>
                Số trang
                <input
                  type="number"
                  name="pageCount"
                  value={form.pageCount}
                  onChange={handleFormChange}
                  min="1"
                  step="1"
                  placeholder="Ví dụ: 256"
                />
              </label>

              <label>
                Tổng số lượng <span>*</span>
                <input
                  type="number"
                  name="totalQuantity"
                  value={form.totalQuantity}
                  onChange={handleFormChange}
                  min="1"
                  step="1"
                  required
                />
              </label>

              <label>
                Danh mục <span>*</span>
                <select
                  name="categoryId"
                  value={form.categoryId}
                  onChange={handleFormChange}
                  required
                  disabled={isCategoriesLoading || categories.length === 0}
                >
                  <option value="">
                    {isCategoriesLoading
                      ? 'Đang tải danh mục...'
                      : categories.length === 0
                        ? 'Không có danh mục'
                        : '— Chọn danh mục —'}
                  </option>

                  {categories.map((category) => (
                    <option key={category.id} value={String(category.id)}>
                      {category.name}
                    </option>
                  ))}
                </select>

                {categoriesError && (
                  <span className="admin-books__inline-error" role="alert">
                    {categoriesError}
                  </span>
                )}
              </label>

              <label>
                URL ảnh bìa
                <input
                  type="text"
                  name="coverImageUrl"
                  value={form.coverImageUrl}
                  onChange={handleFormChange}
                  maxLength={1000}
                  placeholder="/image/Chi-Pheo.jpg hoặc https://example.com/book-cover.jpg"
                />
                <small>
                  Nhập URL ảnh hoặc đường dẫn trong thư mục public. Đường dẫn
                  ổ đĩa máy tính của bạn không dùng được trên máy người khác.
                </small>
              </label>

              <div className="admin-books__cover-picker">
                <button
                  type="button"
                  className="admin-books__button admin-books__button--secondary"
                  onClick={() => coverInputRef.current?.click()}
                >
                  Chọn ảnh từ máy tính
                </button>

                <input
                  ref={coverInputRef}
                  type="file"
                  hidden
                  accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.bmp,.svg,.avif"
                  onChange={handleLocalCoverChange}
                />

                <small>
                  Hỗ trợ JPG, JPEG, PNG, WEBP, GIF, BMP, SVG, AVIF; tối đa 10 MB.
                </small>
              </div>

              {(localCoverPreview || form.coverImageUrl.trim()) && (
                <div className="admin-books__cover-preview">
                  <p>Xem trước ảnh bìa</p>

                  {coverPreviewError ? (
                    <p className="admin-books__inline-error" role="status">
                      Không thể tải ảnh. Hãy kiểm tra lại ảnh hoặc URL.
                    </p>
                  ) : (
                    <img
                      src={
                        localCoverPreview ||
                        normalizeImagePath(form.coverImageUrl)
                      }
                      alt="Xem trước bìa sách"
                      onError={() => setCoverPreviewError(true)}
                      onLoad={() => setCoverPreviewError(false)}
                      style={{
                        display: 'block',
                        width: 140,
                        height: 190,
                        objectFit: 'contain',
                        border: '1px solid #ddd',
                        borderRadius: 8,
                        background: '#f8f8f8',
                      }}
                    />
                  )}
                </div>
              )}

              {formError && (
                <p className="admin-books__inline-error" role="alert">
                  {formError}
                </p>
              )}

              <div className="admin-books__form-actions">
                <button
                  type="button"
                  className="admin-books__button admin-books__button--secondary"
                  disabled={isSaving}
                  onClick={closeForm}
                >
                  Hủy
                </button>

                <button
                  type="submit"
                  className="admin-books__button"
                  disabled={isSaving || isCategoriesLoading}
                >
                  {isSaving
                    ? 'Đang lưu...'
                    : editingBook
                      ? 'Lưu thay đổi'
                      : 'Thêm sách'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  )
}

export default BooksPage