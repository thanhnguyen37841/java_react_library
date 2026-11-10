
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getBooks, getCategories } from '../../../services/bookService'
import './UserPages.css'

const SORT_OPTIONS = [
  { value: 'title-asc', label: 'Tên sách: A → Z' },
  { value: 'title-desc', label: 'Tên sách: Z → A' },
  { value: 'author-asc', label: 'Tác giả: A → Z' },
  { value: 'createdAt-desc', label: 'Sách mới thêm' },
  { value: 'updatedAt-desc', label: 'Mới cập nhật' },
  { value: 'publicationYear-desc', label: 'Năm xuất bản: mới nhất' },
  { value: 'publicationYear-asc', label: 'Năm xuất bản: cũ nhất' },
  { value: 'pageCount-desc', label: 'Số trang: nhiều nhất' },
  { value: 'pageCount-asc', label: 'Số trang: ít nhất' },
]

const DEFAULT_FILTERS = {
  categoryId: '',
  ebookStatus: 'ALL',
  myBorrowStatus: 'ALL',
  publisher: '',
  language: '',
  publicationYearFrom: '',
  publicationYearTo: '',
  minPageCount: '',
  maxPageCount: '',
  sort: 'updatedAt-desc',
}

function getTitle(book) {
  return book?.title || book?.name || 'Chưa có tên sách'
}

function getAuthor(book) {
  const author = book?.authorName || book?.author || book?.authors

  if (Array.isArray(author)) {
    return author.map((item) => item?.name || item).join(', ')
  }

  if (author && typeof author === 'object') {
    return author.name || 'Chưa cập nhật tác giả'
  }

  return author || 'Chưa cập nhật tác giả'
}

function getCover(book) {
  return (
    book?.coverUrl ||
    book?.coverImageUrl ||
    book?.imageUrl ||
    book?.thumbnailUrl ||
    ''
  )
}

function getId(book) {
  return book?.id ?? book?.bookId
}

function getCategory(book) {
  if (typeof book?.category === 'string') return book.category
  return book?.category?.name || book?.categoryName || ''
}

function getCategoryId(category) {
  return category?.id ?? category?.categoryId
}

function getSortParams(value) {
  const separator = value.lastIndexOf('-')

  if (separator < 0) {
    return { sortBy: 'updatedAt', sortDir: 'desc' }
  }

  const key = value.slice(0, separator)
  const sortDir = value.slice(separator + 1)

  const sortBy = {
    title: 'title',
    author: 'author',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    publicationYear: 'publicationYear',
    pageCount: 'pageCount',
  }[key]

  if (!sortBy || !['asc', 'desc'].includes(sortDir)) {
    return { sortBy: 'updatedAt', sortDir: 'desc' }
  }

  return { sortBy, sortDir }
}

function getMetadata(book) {
  return [
    { label: 'Nhà xuất bản', value: book?.publisher },
    { label: 'Năm xuất bản', value: book?.publicationYear },
    { label: 'Ngôn ngữ', value: book?.language },
    { label: 'Số trang', value: book?.pageCount },
  ].filter(
    (item) =>
      item.value !== null &&
      item.value !== undefined &&
      String(item.value).trim() !== '',
  )
}

function normalizeFilters(filters) {
  return {
    ...filters,
    publisher: filters.publisher.trim(),
    language: filters.language.trim(),
  }
}

export default function UserBooksPage({ navigate, onToast }) {
  const initialKeyword = useMemo(
    () => new URLSearchParams(window.location.search).get('keyword') || '',
    [],
  )

  const searchAreaRef = useRef(null)
  const activeSuggestionRequest = useRef(0)

  const [books, setBooks] = useState([])
  const [categories, setCategories] = useState([])
  const [keyword, setKeyword] = useState(initialKeyword)
  const [appliedKeyword, setAppliedKeyword] = useState(initialKeyword)
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS)

  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1)

  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [categoryError, setCategoryError] = useState('')

  const loadBooks = useCallback(async (
    targetPage = 0,
    search = appliedKeyword,
    targetFilters = appliedFilters,
  ) => {
    setLoading(true)
    setError('')
    setShowSuggestions(false)

    try {
      const sort = getSortParams(targetFilters.sort)

      const result = await getBooks(
        targetPage,
        search,
        targetFilters.categoryId,
        {
          ...sort,
          ebookStatus: targetFilters.ebookStatus,
          myBorrowStatus: targetFilters.myBorrowStatus,
          publisher: targetFilters.publisher,
          language: targetFilters.language,
          publicationYearFrom: targetFilters.publicationYearFrom,
          publicationYearTo: targetFilters.publicationYearTo,
          minPageCount: targetFilters.minPageCount,
          maxPageCount: targetFilters.maxPageCount,
        },
      )

      setBooks(result.books || [])
      setPage(result.page ?? targetPage)
      setTotalPages(result.totalPages ?? 0)
      setTotalElements(result.totalElements ?? 0)
      setAppliedKeyword(search)
      setAppliedFilters(targetFilters)
    } catch (err) {
      const message = err.message || 'Không thể tải danh sách sách.'
      setError(message)
      setBooks([])
      setTotalPages(0)
      setTotalElements(0)
      onToast?.(message, 'error')
    } finally {
      setLoading(false)
    }
  }, [appliedKeyword, appliedFilters, onToast])

  // Gợi ý tìm kiếm: chờ người dùng ngừng gõ 300 ms,
  // chỉ lấy tối đa 5 sách và bỏ qua phản hồi cũ.
  useEffect(() => {
    const search = keyword.trim()
    const requestId = ++activeSuggestionRequest.current

    if (search.length < 2 || search === appliedKeyword.trim()) {
      setSuggestions([])
      setSuggestionsLoading(false)
      setActiveSuggestionIndex(-1)

      if (search.length < 2) {
        setShowSuggestions(false)
      }

      return undefined
    }

    const timer = window.setTimeout(async () => {
      setSuggestionsLoading(true)

      try {
        const result = await getBooks(0, search, '', {
          stockStatus: 'ALL',
          isbnStatus: 'ALL',
          ebookStatus: 'ALL',
          myBorrowStatus: 'ALL',
          sortBy: 'title',
          sortDir: 'asc',
        })

        if (requestId !== activeSuggestionRequest.current) return

        const items = (result.books || [])
          .filter((book) => getId(book) != null)
          .slice(0, 5)

        setSuggestions(items)
        setActiveSuggestionIndex(-1)
        setShowSuggestions(true)
      } catch {
        if (requestId !== activeSuggestionRequest.current) return
        setSuggestions([])
        setShowSuggestions(true)
      } finally {
        if (requestId === activeSuggestionRequest.current) {
          setSuggestionsLoading(false)
        }
      }
    }, 300)

    return () => window.clearTimeout(timer)
  }, [keyword, appliedKeyword])

  // Đóng gợi ý khi bấm ra ngoài khu vực tìm kiếm.
  useEffect(() => {
    function handleOutsideClick(event) {
      if (
        searchAreaRef.current &&
        !searchAreaRef.current.contains(event.target)
      ) {
        setShowSuggestions(false)
        setActiveSuggestionIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadInitialData() {
      setLoading(true)
      setError('')
      setCategoryError('')

      const bookPromise = getBooks(0, initialKeyword, '', {
        stockStatus: 'ALL',
        isbnStatus: 'ALL',
        ebookStatus: 'ALL',
        myBorrowStatus: 'ALL',
        sortBy: 'updatedAt',
        sortDir: 'desc',
      })

      const categoryPromise = getCategories()

      const [bookResult, categoryResult] = await Promise.allSettled([
        bookPromise,
        categoryPromise,
      ])

      if (cancelled) return

      if (bookResult.status === 'fulfilled') {
        const result = bookResult.value
        setBooks(result.books || [])
        setPage(result.page ?? 0)
        setTotalPages(result.totalPages ?? 0)
        setTotalElements(result.totalElements ?? 0)
        setAppliedKeyword(initialKeyword)
      } else {
        const message =
          bookResult.reason?.message || 'Không thể tải dữ liệu sách.'
        setError(message)
        onToast?.(message, 'error')
      }

      if (categoryResult.status === 'fulfilled') {
        setCategories(categoryResult.value || [])
      } else {
        setCategoryError(
          categoryResult.reason?.message ||
            'Không thể tải danh sách thể loại.',
        )
      }

      setKeyword(initialKeyword)
      setLoading(false)
    }

    loadInitialData().catch((err) => {
      if (cancelled) return
      const message = err.message || 'Không thể tải dữ liệu.'
      setError(message)
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [initialKeyword, onToast])

  function updateFilter(name, value) {
    setFilters((current) => ({
      ...current,
      [name]: value,
    }))
  }

  function applyFilters(event) {
    event.preventDefault()

    const normalized = normalizeFilters(filters)
    setPage(0)
    loadBooks(0, appliedKeyword, normalized)
  }

  function handleSearch(event) {
    event.preventDefault()

    const search = keyword.trim()
    const nextPath = search
      ? `/books?keyword=${encodeURIComponent(search)}`
      : '/books'

    setShowSuggestions(false)
    setActiveSuggestionIndex(-1)
    navigate(nextPath)
    setPage(0)
    loadBooks(0, search, appliedFilters)
  }

  function selectSuggestion(book) {
    const title = getTitle(book)
    const id = getId(book)

    if (id == null) return

    setKeyword(title)
    setSuggestions([])
    setShowSuggestions(false)
    setActiveSuggestionIndex(-1)

    // Giữ trang danh sách sách và áp dụng tên sách đã chọn
    // như một từ khóa tìm kiếm bình thường.
    navigate(`/books?keyword=${encodeURIComponent(title)}`)
    setPage(0)
    loadBooks(0, title, appliedFilters)
  }

  function handleSearchKeyDown(event) {
    if (!showSuggestions || suggestions.length === 0) {
      if (event.key === 'Escape') {
        setShowSuggestions(false)
      }
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveSuggestionIndex((current) =>
        current >= suggestions.length - 1 ? 0 : current + 1,
      )
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveSuggestionIndex((current) =>
        current <= 0 ? suggestions.length - 1 : current - 1,
      )
    } else if (
      event.key === 'Enter' &&
      activeSuggestionIndex >= 0 &&
      suggestions[activeSuggestionIndex]
    ) {
      event.preventDefault()
      selectSuggestion(suggestions[activeSuggestionIndex])
    } else if (event.key === 'Escape') {
      setShowSuggestions(false)
      setActiveSuggestionIndex(-1)
    }
  }

  function clearSearch() {
    setKeyword('')
    setSuggestions([])
    setShowSuggestions(false)
    setActiveSuggestionIndex(-1)
    navigate('/books')
    setPage(0)
    loadBooks(0, '', appliedFilters)
  }

  function resetFilters() {
    const reset = { ...DEFAULT_FILTERS }
    setFilters(reset)
    setAppliedFilters(reset)
    setKeyword('')
    setSuggestions([])
    setShowSuggestions(false)
    navigate('/books')
    setPage(0)
    loadBooks(0, '', reset)
  }

  function handlePageChange(nextPage) {
    if (nextPage < 0 || nextPage >= totalPages || loading) return

    loadBooks(nextPage, appliedKeyword, appliedFilters)

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  const hasActiveFilters =
    Boolean(appliedFilters.categoryId) ||
    appliedFilters.ebookStatus !== 'ALL' ||
    appliedFilters.myBorrowStatus !== 'ALL' ||
    Boolean(appliedFilters.publisher) ||
    Boolean(appliedFilters.language) ||
    appliedFilters.publicationYearFrom !== '' ||
    appliedFilters.publicationYearTo !== '' ||
    appliedFilters.minPageCount !== '' ||
    appliedFilters.maxPageCount !== '' ||
    appliedFilters.sort !== DEFAULT_FILTERS.sort

  const activeCategory = categories.find(
    (category) =>
      String(getCategoryId(category)) ===
      String(appliedFilters.categoryId),
  )

  return (
    <section className="user-books-page">
      <header className="user-books-heading">
        <div>
          <span className="user-eyebrow">KHÁM PHÁ THƯ VIỆN</span>
          <h1>Khám phá sách</h1>
          <p>
            Tìm sách theo tên, tác giả, ISBN, thông tin xuất bản
            và nhu cầu đọc của bạn.
          </p>
        </div>

        <div className="user-books-count">
          <strong>{totalElements}</strong>
          <span>đầu sách</span>
        </div>
      </header>

      <div className="user-books-search-area" ref={searchAreaRef}>
        <form className="user-books-search" onSubmit={handleSearch}>
          <span className="user-search-icon" aria-hidden="true">
            ⌕
          </span>

          <input
            type="search"
            value={keyword}
            onChange={(event) => {
              setKeyword(event.target.value)
              setShowSuggestions(true)
            }}
            onFocus={() => {
              if (keyword.trim().length >= 2 &&
                  keyword.trim() !== appliedKeyword.trim()) {
                setShowSuggestions(true)
              }
            }}
            onKeyDown={handleSearchKeyDown}
            placeholder="Tên sách, tác giả hoặc ISBN..."
            aria-label="Tìm theo tên sách, tác giả hoặc ISBN"
            aria-autocomplete="list"
            aria-expanded={showSuggestions && suggestions.length > 0}
            aria-controls="user-book-suggestions"
            autoComplete="off"
          />

          {keyword && (
            <button
              type="button"
              className="user-search-clear"
              onClick={() => {
                setKeyword('')
                setSuggestions([])
                setShowSuggestions(false)
              }}
              aria-label="Xóa từ khóa"
            >
              ×
            </button>
          )}

          <button
            type="submit"
            className="user-primary-button"
            disabled={loading}
          >
            Tìm sách
          </button>
        </form>

        {showSuggestions && keyword.trim().length >= 2 && (
          <div
            id="user-book-suggestions"
            className="user-search-suggestions"
            role="listbox"
            aria-label="Gợi ý sách"
          >
            {suggestionsLoading ? (
              <div className="user-suggestions-message">
                <span className="user-suggestion-spinner" />
                Đang tìm sách phù hợp...
              </div>
            ) : suggestions.length > 0 ? (
              <>
                <div className="user-suggestions-heading">
                  GỢI Ý SÁCH
                  <span>Tối đa 5 kết quả</span>
                </div>

                {suggestions.map((book, index) => {
                  const id = getId(book)
                  const title = getTitle(book)
                  const cover = getCover(book)
                  const author = getAuthor(book)

                  return (
                    <button
                      type="button"
                      role="option"
                      aria-selected={activeSuggestionIndex === index}
                      className={
                        activeSuggestionIndex === index
                          ? 'user-search-suggestion is-active'
                          : 'user-search-suggestion'
                      }
                      key={id}
                      onMouseDown={(event) => event.preventDefault()}
                      onMouseEnter={() => setActiveSuggestionIndex(index)}
                      onClick={() => selectSuggestion(book)}
                    >
                      <span className="user-suggestion-cover">
                        {cover ? (
                          <img
                            src={cover}
                            alt=""
                            onError={(event) => {
                              event.currentTarget.style.display = 'none'
                            }}
                          />
                        ) : (
                          <span aria-hidden="true">▤</span>
                        )}
                      </span>

                      <span className="user-suggestion-info">
                        <strong>{title}</strong>
                        <small>{author}</small>
                      </span>

                      <span
                        className="user-suggestion-arrow"
                        aria-hidden="true"
                      >
                        ↗
                      </span>
                    </button>
                  )
                })}

                <button
                  type="button"
                  className="user-suggestions-see-all"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    setShowSuggestions(false)
                    handleSearch({
                      preventDefault: () => {},
                    })
                  }}
                >
                  Xem tất cả kết quả cho “{keyword.trim()}”
                  <span aria-hidden="true">→</span>
                </button>
              </>
            ) : (
              <div className="user-suggestions-message">
                Không tìm thấy gợi ý phù hợp. Nhấn “Tìm sách” để tìm kiếm đầy đủ.
              </div>
            )}
          </div>
        )}
      </div>

      <form
        className="user-books-filter-panel"
        aria-label="Bộ lọc và sắp xếp sách"
        onSubmit={applyFilters}
      >
        <div className="user-books-filter-grid">
          <label className="user-books-filter-field">
            <span>Thể loại</span>
            <select
              value={filters.categoryId}
              onChange={(event) =>
                updateFilter('categoryId', event.target.value)
              }
              disabled={loading}
            >
              <option value="">Tất cả thể loại</option>
              {categories.map((category, index) => {
                const id = getCategoryId(category)
                const name = category?.name || category?.categoryName

                if (id == null || !name) return null

                return (
                  <option key={id ?? index} value={String(id)}>
                    {name}
                  </option>
                )
              })}
            </select>
          </label>

          <label className="user-books-filter-field">
            <span>Nhà xuất bản</span>
            <input
              type="text"
              value={filters.publisher}
              onChange={(event) =>
                updateFilter('publisher', event.target.value)
              }
              placeholder="Nhập nhà xuất bản"
              maxLength={255}
              disabled={loading}
            />
          </label>

          <label className="user-books-filter-field">
            <span>Ngôn ngữ</span>
            <input
              type="text"
              value={filters.language}
              onChange={(event) =>
                updateFilter('language', event.target.value)
              }
              placeholder="Ví dụ: Tiếng Việt"
              maxLength={100}
              disabled={loading}
            />
          </label>

          <label className="user-books-filter-field">
            <span>Năm xuất bản từ</span>
            <input
              type="number"
              min="0"
              step="1"
              value={filters.publicationYearFrom}
              onChange={(event) =>
                updateFilter('publicationYearFrom', event.target.value)
              }
              placeholder="Năm bắt đầu"
              disabled={loading}
            />
          </label>

          <label className="user-books-filter-field">
            <span>Năm xuất bản đến</span>
            <input
              type="number"
              min="0"
              step="1"
              value={filters.publicationYearTo}
              onChange={(event) =>
                updateFilter('publicationYearTo', event.target.value)
              }
              placeholder="Năm kết thúc"
              disabled={loading}
            />
          </label>

          <label className="user-books-filter-field">
            <span>Số trang tối thiểu</span>
            <input
              type="number"
              min="0"
              step="1"
              value={filters.minPageCount}
              onChange={(event) =>
                updateFilter('minPageCount', event.target.value)
              }
              placeholder="Ví dụ: 100"
              disabled={loading}
            />
          </label>

          <label className="user-books-filter-field">
            <span>Số trang tối đa</span>
            <input
              type="number"
              min="0"
              step="1"
              value={filters.maxPageCount}
              onChange={(event) =>
                updateFilter('maxPageCount', event.target.value)
              }
              placeholder="Ví dụ: 500"
              disabled={loading}
            />
          </label>

          <label className="user-books-filter-field">
            <span>Khả năng đọc ebook</span>
            <select
              value={filters.ebookStatus}
              onChange={(event) =>
                updateFilter('ebookStatus', event.target.value)
              }
              disabled={loading}
            >
              <option value="ALL">Tất cả sách</option>
              <option value="HAS_EBOOK">Có bản đọc trực tuyến</option>
              <option value="NO_EBOOK">Chưa có bản đọc trực tuyến</option>
            </select>
          </label>

          <label className="user-books-filter-field">
            <span>Lịch sử mượn của tôi</span>
            <select
              value={filters.myBorrowStatus}
              onChange={(event) =>
                updateFilter('myBorrowStatus', event.target.value)
              }
              disabled={loading}
            >
              <option value="ALL">Tất cả sách</option>
              <option value="ACTIVE">Đang có yêu cầu hoặc đang mượn</option>
              <option value="HISTORY">Đã trả hoặc bị từ chối</option>
              <option value="NEVER">Chưa từng mượn</option>
            </select>
          </label>

          <label className="user-books-filter-field">
            <span>Sắp xếp theo</span>
            <select
              value={filters.sort}
              onChange={(event) =>
                updateFilter('sort', event.target.value)
              }
              disabled={loading}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="user-books-filter-footer">
          <div className="user-books-filter-summary">
            {activeCategory && (
              <span className="user-filter-chip">
                Thể loại: {activeCategory.name || activeCategory.categoryName}
              </span>
            )}

            {appliedFilters.publisher && (
              <span className="user-filter-chip">
                Nhà xuất bản: {appliedFilters.publisher}
              </span>
            )}

            {appliedFilters.language && (
              <span className="user-filter-chip">
                Ngôn ngữ: {appliedFilters.language}
              </span>
            )}

            {(appliedFilters.publicationYearFrom !== '' ||
              appliedFilters.publicationYearTo !== '') && (
              <span className="user-filter-chip">
                Năm xuất bản:{' '}
                {appliedFilters.publicationYearFrom || 'Bất kỳ'} –{' '}
                {appliedFilters.publicationYearTo || 'Bất kỳ'}
              </span>
            )}

            {(appliedFilters.minPageCount !== '' ||
              appliedFilters.maxPageCount !== '') && (
              <span className="user-filter-chip">
                Số trang: {appliedFilters.minPageCount || 'Bất kỳ'} –{' '}
                {appliedFilters.maxPageCount || 'Bất kỳ'}
              </span>
            )}

            {appliedFilters.ebookStatus !== 'ALL' && (
              <span className="user-filter-chip">
                {appliedFilters.ebookStatus === 'HAS_EBOOK'
                  ? 'Có ebook'
                  : 'Chưa có ebook'}
              </span>
            )}

            {appliedFilters.myBorrowStatus !== 'ALL' && (
              <span className="user-filter-chip">
                {appliedFilters.myBorrowStatus === 'ACTIVE'
                  ? 'Đang mượn hoặc chờ duyệt'
                  : appliedFilters.myBorrowStatus === 'HISTORY'
                    ? 'Lịch sử mượn'
                    : 'Chưa từng mượn'}
              </span>
            )}
          </div>

          <div className="user-books-filter-actions">
            <button
              type="submit"
              className="user-primary-button"
              disabled={loading}
            >
              Áp dụng bộ lọc
            </button>

            {hasActiveFilters && (
              <button
                type="button"
                className="user-text-button"
                onClick={resetFilters}
                disabled={loading}
              >
                Xóa bộ lọc
              </button>
            )}
          </div>
        </div>
      </form>

      {categoryError && (
        <p className="user-inline-error" role="alert">
          {categoryError}
        </p>
      )}

      {error && (
        <div className="user-error-panel" role="alert">
          <strong>Không tải được danh sách sách</strong>
          <p>{error}</p>
          <button
            type="button"
            className="user-secondary-button"
            onClick={() => loadBooks(page, appliedKeyword, appliedFilters)}
          >
            Thử lại
          </button>
        </div>
      )}

      <div className="user-books-results-heading">
        <div>
          <h2>Danh mục sách</h2>
          <p>
            {loading
              ? 'Đang tải dữ liệu...'
              : `Tìm thấy ${totalElements} đầu sách`}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="user-books-loading" role="status">
          <span className="user-loading-spinner" />
          <p>Đang tải danh sách sách...</p>
        </div>
      ) : books.length === 0 ? (
        <div className="user-empty-state">
          <span className="user-empty-icon" aria-hidden="true">⌕</span>
          <h3>Không tìm thấy sách phù hợp</h3>
          <p>
            Hãy thử thay đổi từ khóa tìm kiếm hoặc điều chỉnh bộ lọc.
          </p>
          <button
            type="button"
            className="user-primary-button"
            onClick={resetFilters}
          >
            Xóa bộ lọc
          </button>
        </div>
      ) : (
        <div className="user-books-grid">
          {books.map((book, index) => {
            const id = getId(book)
            const title = getTitle(book)
            const author = getAuthor(book)
            const cover = getCover(book)
            const category = getCategory(book)
            const metadata = getMetadata(book)
            const available = Number(
              book?.availableQuantity ?? book?.available ?? 0,
            )

            return (
              <article
                className="user-book-card"
                key={id ?? `${title}-${index}`}
              >
                <button
                  type="button"
                  className="user-book-card-cover"
                  onClick={() => navigate(`/books/${id}`)}
                  aria-label={`Xem chi tiết sách ${title}`}
                >
                  {cover ? (
                    <img
                      src={cover}
                      alt={`Bìa sách ${title}`}
                      loading="lazy"
                      onError={(event) => {
                        event.currentTarget.style.display = 'none'
                      }}
                    />
                  ) : (
                    <span className="user-book-cover-placeholder">
                      <span aria-hidden="true">▤</span>
                      <span>Chưa có ảnh bìa</span>
                    </span>
                  )}
                </button>

                <div className="user-book-card-content">
                  {category && (
                    <span className="user-book-category">{category}</span>
                  )}

                  <button
                    type="button"
                    className="user-book-card-title"
                    onClick={() => navigate(`/books/${id}`)}
                  >
                    {title}
                  </button>

                  <p className="user-book-card-author">{author}</p>

                  {book?.isbn && (
                    <p className="user-book-card-isbn">
                      ISBN: {book.isbn}
                    </p>
                  )}

                  {metadata.length > 0 && (
                    <dl className="user-book-card-metadata">
                      {metadata.map((item) => (
                        <div key={item.label}>
                          <dt>{item.label}</dt>
                          <dd>{item.value}</dd>
                        </div>
                      ))}
                    </dl>
                  )}

                  {book?.description && (
                    <p className="user-book-card-description">
                      {book.description}
                    </p>
                  )}

                  <div className="user-book-card-footer">
                    <span
                      className={
                        available > 0
                          ? 'user-stock-status is-available'
                          : 'user-stock-status is-unavailable'
                      }
                    >
                      {available > 0
                        ? `Còn ${available} cuốn`
                        : 'Tạm hết sách'}
                    </span>

                    {(book?.hasEbook || book?.ebookFilePath) && (
                      <span className="user-ebook-badge">Có ebook</span>
                    )}
                  </div>

                  <button
                    type="button"
                    className="user-book-detail-button"
                    onClick={() => navigate(`/books/${id}`)}
                  >
                    Xem chi tiết
                    <span aria-hidden="true">→</span>
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {!loading && totalPages > 1 && (
        <nav className="user-pagination" aria-label="Phân trang sách">
          <button
            type="button"
            className="user-pagination-button"
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 0 || loading}
          >
            ← Trước
          </button>

          <div className="user-pagination-pages">
            {Array.from({ length: totalPages }, (_, index) => index)
              .filter(
                (pageNumber) =>
                  pageNumber === 0 ||
                  pageNumber === totalPages - 1 ||
                  Math.abs(pageNumber - page) <= 2,
              )
              .reduce((result, pageNumber, index, pages) => {
                if (index > 0 && pageNumber - pages[index - 1] > 1) {
                  result.push('ellipsis')
                }

                result.push(pageNumber)
                return result
              }, [])
              .map((pageNumber, index) => {
                if (pageNumber === 'ellipsis') {
                  return (
                    <span
                      className="user-pagination-ellipsis"
                      key={`ellipsis-${index}`}
                    >
                      …
                    </span>
                  )
                }

                return (
                  <button
                    type="button"
                    key={pageNumber}
                    className={
                      pageNumber === page
                        ? 'user-pagination-page is-active'
                        : 'user-pagination-page'
                    }
                    onClick={() => handlePageChange(pageNumber)}
                    disabled={loading}
                    aria-current={pageNumber === page ? 'page' : undefined}
                  >
                    {pageNumber + 1}
                  </button>
                )
              })}
          </div>

          <button
            type="button"
            className="user-pagination-button"
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages - 1 || loading}
          >
            Sau →
          </button>
        </nav>
      )}
    </section>
  )
}
