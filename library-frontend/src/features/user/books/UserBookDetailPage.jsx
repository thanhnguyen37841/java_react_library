
import { useEffect, useMemo, useState } from 'react'
import { getBookById, getBooks } from '../../../services/bookService'
import './UserPages.css'

const API_URL = 'http://localhost:8080'
const RECOMMENDATION_LIMIT = 5

function getTitle(book) {
  return book?.title || book?.name || 'Chưa có tên sách'
}

function getAuthor(book) {
  const author = book?.author ?? book?.authorName ?? book?.authors

  if (Array.isArray(author)) {
    return author.map((item) => item?.name || item).join(', ')
  }

  if (author && typeof author === 'object') {
    return author.name || 'Chưa cập nhật tác giả'
  }

  return author || 'Chưa cập nhật tác giả'
}

function getCover(book) {
  return book?.coverImageUrl || ''
}

function getCategory(book) {
  return book?.categoryName || book?.category?.name || ''
}

function getQuantity(book) {
  const value = book?.availableQuantity

  if (value === undefined || value === null || value === '') {
    return null
  }

  const quantity = Number(value)
  return Number.isFinite(quantity) ? quantity : null
}

function getBookId(book) {
  return book?.id ?? book?.bookId
}

function getToken() {
  return localStorage.getItem('accessToken')
}

function getTokenType() {
  return localStorage.getItem('tokenType') || 'Bearer'
}

function displayValue(value) {
  return value !== undefined && value !== null && value !== ''
    ? value
    : 'Chưa cập nhật'
}

function unwrapBook(response) {
  return response?.data ?? response
}

function unwrapBookList(response) {
  const result = unwrapBook(response)

  if (Array.isArray(result)) return result
  if (Array.isArray(result?.content)) return result.content
  if (Array.isArray(result?.items)) return result.items
  if (Array.isArray(result?.books)) return result.books
  if (Array.isArray(result?.data)) return result.data
  if (Array.isArray(result?.data?.content)) return result.data.content

  return []
}

function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLocaleLowerCase('vi')
}

function getCategoryId(book) {
  return book?.categoryId ?? book?.category?.id ?? null
}

function getAuthorKey(book) {
  return normalizeText(getAuthor(book))
}

function getCategoryKey(book) {
  const categoryId = getCategoryId(book)

  if (categoryId !== null && categoryId !== undefined) {
    return `id:${categoryId}`
  }

  return normalizeText(getCategory(book))
}

function getBookRoute(id) {
  return `/books/${id}`
}

export default function UserBookDetailPage({ bookId, navigate }) {
  const [book, setBook] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [imageFailed, setImageFailed] = useState(false)

  const [borrowing, setBorrowing] = useState(false)
  const [borrowMessage, setBorrowMessage] = useState('')
  const [borrowError, setBorrowError] = useState(false)

  const [relatedBooks, setRelatedBooks] = useState([])
  const [relatedLoading, setRelatedLoading] = useState(false)
  const [relatedError, setRelatedError] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function fetchBook() {
      if (!bookId) {
        setBook(null)
        setError('Không xác định được mã sách.')
        setLoading(false)
        return
      }

      setLoading(true)
      setError('')
      setBook(null)

      try {
        const result = await getBookById(bookId)

        if (!cancelled) {
          setBook(unwrapBook(result))
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Không thể tải thông tin chi tiết sách.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void fetchBook()

    return () => {
      cancelled = true
    }
  }, [bookId])

  useEffect(() => {
    setImageFailed(false)
    setBorrowMessage('')
    setBorrowError(false)
    setRelatedBooks([])
    setRelatedError(false)
  }, [bookId])

  useEffect(() => {
    let cancelled = false

    async function fetchRelatedBooks() {
      if (!book || !bookId) return

      setRelatedLoading(true)
      setRelatedError(false)

      try {
        const categoryId = getCategoryId(book)

        // Ưu tiên truy vấn theo thể loại nếu API hỗ trợ categoryId.
        let response

        try {
          response = await getBooks(
            0,
            '',
            categoryId !== null && categoryId !== undefined
              ? String(categoryId)
              : '',
          )
        } catch {
          // Nếu truy vấn theo thể loại thất bại, thử lấy danh sách sách chung.
          response = await getBooks(0)
        }

        if (cancelled) return

        const books = unwrapBookList(response)
        const currentId = String(getBookId(book) ?? bookId)

        const candidates = books.filter((item) => {
          const id = getBookId(item)

          return (
            id !== undefined &&
            id !== null &&
            String(id) !== currentId &&
            !item?.deleted
          )
        })

        const currentCategory = getCategoryKey(book)
        const currentAuthor = getAuthorKey(book)

        const sameCategory = []
        const sameAuthor = []
        const others = []

        candidates.forEach((item) => {
          const itemCategory = getCategoryKey(item)
          const itemAuthor = getAuthorKey(item)

          if (
            currentCategory &&
            itemCategory &&
            itemCategory === currentCategory
          ) {
            sameCategory.push(item)
          } else if (
            currentAuthor &&
            currentAuthor !== normalizeText('Chưa cập nhật tác giả') &&
            itemAuthor &&
            itemAuthor === currentAuthor
          ) {
            sameAuthor.push(item)
          } else {
            others.push(item)
          }
        })

        const selected = [
          ...sameCategory,
          ...sameAuthor,
          ...others,
        ].slice(0, RECOMMENDATION_LIMIT)

        if (!cancelled) {
          setRelatedBooks(selected)
        }
      } catch {
        if (!cancelled) {
          setRelatedError(true)
          setRelatedBooks([])
        }
      } finally {
        if (!cancelled) {
          setRelatedLoading(false)
        }
      }
    }

    void fetchRelatedBooks()

    return () => {
      cancelled = true
    }
  }, [book, bookId])

  async function handleBorrow() {
    const id = getBookId(book)

    if (!id || borrowing) return

    const token = getToken()

    if (!token) {
      setBorrowError(true)
      setBorrowMessage('Bạn cần đăng nhập trước khi mượn sách.')
      return
    }

    const quantity = getQuantity(book)

    if (quantity !== null && quantity <= 0) {
      setBorrowError(true)
      setBorrowMessage('Sách hiện đã hết.')
      return
    }

    setBorrowing(true)
    setBorrowMessage('')
    setBorrowError(false)

    try {
      const response = await fetch(
        `${API_URL}/api/borrows/me?bookId=${encodeURIComponent(id)}`,
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            Authorization: `${getTokenType()} ${token}`,
          },
        },
      )

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            (response.status === 401
              ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
              : response.status === 403
                ? 'Tài khoản chưa được phép thực hiện thao tác này.'
                : 'Không thể mượn sách. Vui lòng thử lại.'),
        )
      }

      setBorrowMessage(
        data?.status === 'BORROW_REQUESTED'
          ? 'Đã gửi yêu cầu mượn sách. Vui lòng chờ người có thẩm quyền duyệt. Ngày mượn và hạn trả được tính khi bạn nhận sách tại thư viện.'
          : `Đã tạo phiếu mượn${data?.dueDate ? `. Hạn trả: ${data.dueDate}` : '.'}`,
      )

      const refreshed = await getBookById(id)
      setBook(unwrapBook(refreshed))
    } catch (err) {
      setBorrowError(true)
      setBorrowMessage(err.message || 'Đã xảy ra lỗi khi mượn sách.')
    } finally {
      setBorrowing(false)
    }
  }

  const metadata = useMemo(() => {
    if (!book) return []

    return [
      { label: 'ISBN', value: book.isbn, icon: '▤' },
      { label: 'Lần tái bản', value: book.edition, icon: '↻' },
      { label: 'Nhà xuất bản', value: book.publisher, icon: '▣' },
      { label: 'Năm xuất bản', value: book.publicationYear, icon: '▦' },
      { label: 'Ngôn ngữ', value: book.language, icon: '文' },
      { label: 'Số trang', value: book.pageCount, icon: '☰' },
    ]
  }, [book])

  if (loading) {
    return (
      <section className="user-book-detail-page ubd-page">
        <style>{styles}</style>
        <div className="ubd-state-card" role="status">
          <span className="user-loading-spinner" />
          <h2>Đang tải thông tin sách</h2>
          <p>Vui lòng chờ trong giây lát...</p>
        </div>
      </section>
    )
  }

  if (error || !book) {
    return (
      <section className="user-book-detail-page ubd-page">
        <style>{styles}</style>

        <div className="ubd-shell">
          <button
            type="button"
            className="ubd-back-button"
            onClick={() => navigate('/books')}
          >
            <span aria-hidden="true">←</span>
            Quay lại danh sách sách
          </button>

          <div className="ubd-state-card ubd-error-card">
            <span className="ubd-state-icon" aria-hidden="true">!</span>
            <h1>Không thể mở thông tin sách</h1>
            <p>{error || 'Không tìm thấy thông tin sách.'}</p>
            <button
              type="button"
              className="ubd-button ubd-button-primary"
              onClick={() => navigate('/books')}
            >
              Về danh sách sách
            </button>
          </div>
        </div>
      </section>
    )
  }

  const title = getTitle(book)
  const author = getAuthor(book)
  const cover = getCover(book)
  const category = getCategory(book)
  const quantity = getQuantity(book)
  const unavailable = quantity !== null && quantity <= 0
  const hasEbook = Boolean(book.hasEbook || book.ebookFilePath)

  return (
    <section className="user-book-detail-page ubd-page">
      <style>{styles}</style>

      <div className="ubd-shell">
        <nav className="ubd-breadcrumb" aria-label="Điều hướng">
          <button
            type="button"
            className="ubd-back-button"
            onClick={() => navigate('/books')}
          >
            <span aria-hidden="true">←</span>
            Danh sách sách
          </button>
          <span className="ubd-breadcrumb-separator">/</span>
          <span className="ubd-breadcrumb-current">Chi tiết sách</span>
        </nav>

        <header className="ubd-page-heading">
          <div>
            <span className="ubd-overline">BOOKSPACE · THƯ VIỆN SỐ</span>
            <h1>Khám phá tri thức</h1>
            <p>Thông tin chi tiết, tình trạng sách và các đầu sách liên quan.</p>
          </div>
          <div className="ubd-heading-mark" aria-hidden="true">▤</div>
        </header>

        <article className="ubd-main-card">
          <aside className="ubd-cover-column">
            <div className="ubd-cover-stage">
              <div className="ubd-cover-decoration" aria-hidden="true" />

              {cover && !imageFailed ? (
                <img
                  className="ubd-cover"
                  src={cover}
                  alt={`Bìa sách ${title}`}
                  onError={() => setImageFailed(true)}
                />
              ) : (
                <div
                  className="ubd-cover-fallback"
                  role="img"
                  aria-label={`Chưa có ảnh bìa cho ${title}`}
                >
                  <span className="ubd-fallback-icon" aria-hidden="true">
                    📚
                  </span>
                  <strong>Chưa có ảnh bìa</strong>
                  <small>BOOKSPACE</small>
                </div>
              )}
            </div>

            <div className="ubd-cover-caption">
              <span aria-hidden="true">ⓘ</span>
              <p>Thông tin đầu sách được hiển thị theo dữ liệu thư viện.</p>
            </div>
          </aside>

          <div className="ubd-book-content">
            <div className="ubd-book-topline">
              <span className="ubd-book-label">THÔNG TIN ĐẦU SÁCH</span>
              {category && <span className="ubd-category">{category}</span>}
            </div>

            <h2 className="ubd-title">{title}</h2>

            <div className="ubd-author-row">
              <span className="ubd-author-icon" aria-hidden="true">✎</span>
              <span>Tác giả</span>
              <strong>{author}</strong>
            </div>

            <div
              className={`ubd-stock-card ${
                quantity === null
                  ? 'ubd-stock-unknown'
                  : unavailable
                    ? 'ubd-stock-unavailable'
                    : 'ubd-stock-available'
              }`}
            >
              <span className="ubd-stock-indicator" aria-hidden="true" />
              <div className="ubd-stock-copy">
                <strong>
                  {quantity === null
                    ? 'Chưa có dữ liệu số lượng'
                    : unavailable
                      ? 'Hiện đã hết sách'
                      : 'Sách đang có sẵn'}
                </strong>
                <span>
                  {quantity === null
                    ? 'Vui lòng liên hệ thư viện để biết thêm.'
                    : unavailable
                      ? 'Bạn có thể quay lại kiểm tra sau.'
                      : `Còn ${quantity} cuốn có thể tham khảo tại thư viện.`}
                </span>
              </div>
              <span className="ubd-stock-count">
                {quantity === null ? '—' : quantity}
              </span>
            </div>

            <section className="ubd-description-section">
              <h3 className="ubd-section-title">
                <span className="ubd-section-symbol" aria-hidden="true">≡</span>
                Giới thiệu sách
              </h3>
              <p className="ubd-description">
                {book.description || 'Chưa có mô tả cho đầu sách này.'}
              </p>
            </section>

            <div className="ubd-actions">
              <button
                type="button"
                className="ubd-button ubd-button-primary"
                disabled={borrowing || unavailable}
                onClick={handleBorrow}
              >
                {borrowing ? (
                  <>
                    <span className="ubd-button-spinner" />
                    Đang xử lý...
                  </>
                ) : unavailable ? (
                  'Đã hết sách'
                ) : (
                  <>
                    <span aria-hidden="true">↗</span>
                    Yêu cầu mượn sách giấy
                  </>
                )}
              </button>

              <button
                type="button"
                className="ubd-button ubd-button-secondary"
                onClick={() => navigate('/books')}
              >
                Tiếp tục khám phá
              </button>
            </div>

            {borrowMessage && (
              <div
                className={`ubd-message ${
                  borrowError ? 'ubd-message-error' : 'ubd-message-success'
                }`}
                role="status"
              >
                <span className="ubd-message-icon" aria-hidden="true">
                  {borrowError ? '!' : '✓'}
                </span>
                <p>{borrowMessage}</p>
              </div>
            )}
          </div>
        </article>

        <section className="ubd-details-card">
          <div className="ubd-details-heading">
            <div>
              <span className="ubd-overline">THÔNG TIN THAM KHẢO</span>
              <h2>Thông tin xuất bản</h2>
              <p>Các thông tin nhận diện và xuất bản của đầu sách.</p>
            </div>
            <span className="ubd-details-heading-icon" aria-hidden="true">▦</span>
          </div>

          <dl className="ubd-metadata">
            {metadata.map((item) => (
              <div className="ubd-metadata-item" key={item.label}>
                <span className="ubd-metadata-icon" aria-hidden="true">
                  {item.icon}
                </span>
                <div className="ubd-metadata-copy">
                  <dt>{item.label}</dt>
                  <dd>{displayValue(item.value)}</dd>
                </div>
              </div>
            ))}
          </dl>

          <div className="ubd-quantity-summary">
            <div className="ubd-quantity-item">
              <span className="ubd-quantity-icon" aria-hidden="true">▤</span>
              <div>
                <span>Tổng số lượng</span>
                <strong>{displayValue(book.totalQuantity)}</strong>
              </div>
            </div>
            <div className="ubd-quantity-divider" />
            <div className="ubd-quantity-item">
              <span className="ubd-quantity-icon" aria-hidden="true">✓</span>
              <div>
                <span>Số lượng còn</span>
                <strong>{displayValue(book.availableQuantity)}</strong>
              </div>
            </div>
          </div>
        </section>

        {hasEbook && (
          <section className="ubd-ebook-card">
            <div className="ubd-ebook-icon" aria-hidden="true">▣</div>
            <div className="ubd-ebook-copy">
              <span className="ubd-overline">PHIÊN BẢN ĐIỆN TỬ</span>
              <h2>Sách có bản điện tử</h2>
              <p>
                Đầu sách có bản điện tử. Bạn có thể truy cập mục Ebook để
                thực hiện thao tác mượn và đọc theo quyền được cấp.
              </p>
            </div>
          </section>
        )}

        <section className="ubd-related-section">
          <div className="ubd-related-heading">
            <div>
              <span className="ubd-overline">CÓ THỂ BẠN QUAN TÂM</span>
              <h2>Sách tương tự</h2>
              <p>
                {category
                  ? `Khám phá thêm sách cùng chủ đề ${category} hoặc cùng tác giả.`
                  : 'Khám phá thêm sách có nội dung hoặc tác giả liên quan.'}
              </p>
            </div>
            <span className="ubd-related-heading-icon" aria-hidden="true">✦</span>
          </div>

          {relatedLoading ? (
            <div className="ubd-related-state" role="status">
              <span className="ubd-button-spinner ubd-spinner-blue" />
              Đang tìm sách phù hợp...
            </div>
          ) : relatedBooks.length > 0 ? (
            <div className="ubd-related-grid">
              {relatedBooks.map((item) => {
                const id = getBookId(item)
                const itemTitle = getTitle(item)
                const itemAuthor = getAuthor(item)
                const itemQuantity = getQuantity(item)
                const itemCover = getCover(item)

                return (
                  <button
                    type="button"
                    className="ubd-related-book"
                    key={id}
                    onClick={() => navigate(getBookRoute(id))}
                    aria-label={`Xem chi tiết sách ${itemTitle}`}
                  >
                    <div className="ubd-related-cover-wrap">
                      {itemCover ? (
                        <img
                          className="ubd-related-cover"
                          src={itemCover}
                          alt={`Bìa sách ${itemTitle}`}
                          loading="lazy"
                        />
                      ) : (
                        <div className="ubd-related-cover-fallback">
                          <span aria-hidden="true">📚</span>
                          <small>BOOKSPACE</small>
                        </div>
                      )}
                      <span
                        className={`ubd-related-stock ${
                          itemQuantity !== null && itemQuantity > 0
                            ? 'is-available'
                            : 'is-unavailable'
                        }`}
                      >
                        {itemQuantity === null
                          ? 'Chưa rõ'
                          : itemQuantity > 0
                            ? 'Còn sách'
                            : 'Hết sách'}
                      </span>
                    </div>

                    <div className="ubd-related-copy">
                      <span className="ubd-related-category">
                        {getCategory(item) || 'Sách thư viện'}
                      </span>
                      <h3>{itemTitle}</h3>
                      <p>{itemAuthor}</p>
                      <span className="ubd-related-link">
                        Xem chi tiết <span aria-hidden="true">→</span>
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="ubd-related-empty">
              {relatedError
                ? 'Chưa thể tải danh sách sách tương tự. Bạn vẫn có thể khám phá toàn bộ danh sách sách.'
                : 'Chưa tìm thấy sách tương tự. Hãy khám phá danh sách sách của thư viện.'}
              <button
                type="button"
                className="ubd-related-browse"
                onClick={() => navigate('/books')}
              >
                Xem tất cả sách →
              </button>
            </div>
          )}
        </section>

        <footer className="ubd-bottom-nav">
          <span>BOOKSPACE · Không gian đọc và học tập</span>
          <button
            type="button"
            className="ubd-bottom-link"
            onClick={() => navigate('/books')}
          >
            Khám phá thêm sách <span aria-hidden="true">→</span>
          </button>
        </footer>
      </div>
    </section>
  )
}

const styles = `
  .ubd-page {
    --ubd-primary: #3157c8;
    --ubd-primary-dark: #2445a7;
    --ubd-ink: #17233d;
    --ubd-muted: #69758a;
    --ubd-border: #e7ebf2;
    display: block;
    min-height: 100%;
    padding: 26px 24px 42px;
    background: #f6f8fc;
    color: var(--ubd-ink);
  }

  .ubd-page,
  .ubd-page * {
    box-sizing: border-box;
  }

  .ubd-shell {
    width: 100%;
    max-width: 1180px;
    margin: 0 auto;
  }

  .ubd-breadcrumb {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 25px;
    color: var(--ubd-muted);
    font-size: 13px;
  }

  .ubd-back-button {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    padding: 7px 0;
    border: 0;
    background: transparent;
    color: #52617a;
    font: inherit;
    font-weight: 650;
    cursor: pointer;
  }

  .ubd-back-button:hover,
  .ubd-bottom-link:hover {
    color: var(--ubd-primary-dark);
  }

  .ubd-back-button span {
    font-size: 18px;
  }

  .ubd-breadcrumb-separator {
    color: #bdc5d2;
  }

  .ubd-breadcrumb-current {
    color: #253653;
    font-weight: 700;
  }

  .ubd-page-heading,
  .ubd-details-heading,
  .ubd-related-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
  }

  .ubd-page-heading {
    margin-bottom: 24px;
  }

  .ubd-overline {
    display: block;
    color: var(--ubd-primary);
    font-size: 10px;
    font-weight: 800;
    letter-spacing: .13em;
    line-height: 1.7;
  }

  .ubd-page-heading h1 {
    margin: 7px 0;
    font-size: clamp(27px, 3vw, 35px);
    font-weight: 800;
    letter-spacing: -.04em;
    line-height: 1.2;
  }

  .ubd-page-heading p,
  .ubd-details-heading p,
  .ubd-related-heading p {
    margin: 0;
    color: var(--ubd-muted);
    font-size: 13px;
    line-height: 1.7;
  }

  .ubd-heading-mark,
  .ubd-details-heading-icon,
  .ubd-related-heading-icon {
    display: grid;
    flex: 0 0 48px;
    width: 48px;
    height: 48px;
    place-items: center;
    border: 1px solid #dce5ff;
    border-radius: 14px;
    background: #eaf0ff;
    color: var(--ubd-primary);
    font-size: 24px;
  }

  .ubd-main-card,
  .ubd-details-card,
  .ubd-related-section {
    border: 1px solid var(--ubd-border);
    border-radius: 20px;
    background: #fff;
    box-shadow: 0 8px 30px rgba(28, 45, 78, .04);
  }

  .ubd-main-card {
    display: grid;
    grid-template-columns: minmax(230px, 320px) minmax(0, 1fr);
    gap: clamp(25px, 4vw, 45px);
    padding: clamp(20px, 3vw, 34px);
  }

  .ubd-cover-column,
  .ubd-book-content {
    min-width: 0;
  }

  .ubd-cover-stage {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 350px;
    padding: 22px;
    overflow: hidden;
    border: 1px solid #e8edf7;
    border-radius: 16px;
    background: radial-gradient(ellipse at center, #fff 0%, #f1f4fb 100%);
  }

  .ubd-cover-decoration {
    position: absolute;
    right: -55px;
    bottom: -75px;
    width: 190px;
    height: 190px;
    border: 1px solid rgba(49, 87, 200, .1);
    border-radius: 50%;
    pointer-events: none;
  }

  .ubd-cover-decoration::after {
    position: absolute;
    inset: 22px;
    border: 1px solid rgba(49, 87, 200, .1);
    border-radius: 50%;
    content: '';
  }

  .ubd-cover {
    position: relative;
    z-index: 1;
    display: block;
    width: 100%;
    max-width: 235px;
    max-height: 390px;
    object-fit: contain;
    border-radius: 5px 8px 8px 5px;
    box-shadow: 0 18px 32px rgba(24, 36, 63, .2);
    transition: transform .2s ease;
  }

  .ubd-cover:hover {
    transform: translateY(-3px);
  }

  .ubd-cover-fallback {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    width: 100%;
    min-height: 280px;
    padding: 20px;
    border: 1px dashed #cbd5e5;
    border-radius: 12px;
    background: #fff;
    color: #64748b;
    text-align: center;
  }

  .ubd-fallback-icon {
    font-size: 48px;
  }

  .ubd-cover-fallback strong {
    color: #35435d;
    font-size: 14px;
  }

  .ubd-cover-fallback small {
    color: #8793a7;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: .15em;
  }

  .ubd-cover-caption {
    display: flex;
    align-items: flex-start;
    gap: 9px;
    margin-top: 12px;
    color: #8491a8;
  }

  .ubd-cover-caption p {
    margin: 0;
    font-size: 11px;
    line-height: 1.7;
  }

  .ubd-book-topline {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 10px;
  }

  .ubd-book-label {
    color: #7a879d;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: .12em;
  }

  .ubd-category {
    display: inline-flex;
    max-width: 100%;
    padding: 6px 11px;
    overflow-wrap: anywhere;
    border: 1px solid #dce6ff;
    border-radius: 999px;
    background: #f0f4ff;
    color: #3157c8;
    font-size: 11px;
    font-weight: 700;
  }

  .ubd-title {
    margin: 18px 0 14px;
    font-size: clamp(26px, 3vw, 37px);
    font-weight: 800;
    letter-spacing: -.04em;
    line-height: 1.25;
    overflow-wrap: anywhere;
  }

  .ubd-author-row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 22px;
    color: #7b8799;
    font-size: 12px;
  }

  .ubd-author-icon {
    color: var(--ubd-primary);
    font-size: 16px;
  }

  .ubd-author-row strong {
    color: #35445e;
    font-size: 13px;
    overflow-wrap: anywhere;
  }

  .ubd-stock-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 15px;
    border: 1px solid transparent;
    border-radius: 12px;
  }

  .ubd-stock-available {
    border-color: #d5f0e1;
    background: #f1fbf5;
    color: #176b43;
  }

  .ubd-stock-unavailable {
    border-color: #f7dada;
    background: #fff5f5;
    color: #b42332;
  }

  .ubd-stock-unknown {
    border-color: #e5e9f0;
    background: #f7f8fb;
    color: #5f6c80;
  }

  .ubd-stock-indicator {
    flex: 0 0 9px;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: currentColor;
  }

  .ubd-stock-copy {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  .ubd-stock-copy strong {
    font-size: 12px;
    font-weight: 800;
  }

  .ubd-stock-copy span {
    font-size: 11px;
    line-height: 1.6;
  }

  .ubd-stock-count {
    padding-left: 5px;
    font-size: 24px;
    font-weight: 800;
  }

  .ubd-description-section {
    margin-top: 24px;
  }

  .ubd-section-title {
    display: flex;
    align-items: center;
    gap: 9px;
    margin: 0 0 10px;
    color: #24334e;
    font-size: 14px;
    font-weight: 800;
  }

  .ubd-section-symbol {
    display: grid;
    flex: 0 0 28px;
    width: 28px;
    height: 28px;
    place-items: center;
    border-radius: 8px;
    background: #f0f4ff;
    color: var(--ubd-primary);
    font-size: 18px;
  }

  .ubd-description {
    margin: 0;
    color: #69758a;
    font-size: 12px;
    line-height: 1.9;
    white-space: pre-line;
    overflow-wrap: anywhere;
  }

  .ubd-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 23px;
  }

  .ubd-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 43px;
    padding: 11px 15px;
    border: 1px solid transparent;
    border-radius: 10px;
    font-family: inherit;
    font-size: 12px;
    font-weight: 750;
    line-height: 1.5;
    text-align: center;
    cursor: pointer;
    transition: background .18s ease, border-color .18s ease, transform .18s ease;
  }

  .ubd-button:active:not(:disabled) {
    transform: translateY(1px);
  }

  .ubd-button-primary {
    background: var(--ubd-primary);
    color: #fff;
  }

  .ubd-button-primary:hover:not(:disabled) {
    background: var(--ubd-primary-dark);
  }

  .ubd-button:disabled {
    opacity: .55;
    cursor: not-allowed;
  }

  .ubd-button-secondary {
    border-color: #dce2ed;
    background: #fff;
    color: #40506b;
  }

  .ubd-button-secondary:hover {
    border-color: #bdcafa;
    background: #f7f9ff;
    color: var(--ubd-primary);
  }

  .ubd-button-spinner {
    display: inline-block;
    width: 15px;
    height: 15px;
    border: 2px solid rgba(255, 255, 255, .45);
    border-top-color: #fff;
    border-radius: 50%;
    animation: ubd-spin .7s linear infinite;
  }

  .ubd-spinner-blue {
    border-color: #dbe5ff;
    border-top-color: var(--ubd-primary);
  }

  .ubd-message {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    margin-top: 15px;
    padding: 12px;
    border: 1px solid transparent;
    border-radius: 10px;
  }

  .ubd-message-success {
    border-color: #ccebd9;
    background: #f1fbf5;
    color: #176b43;
  }

  .ubd-message-error {
    border-color: #f3d4d7;
    background: #fff5f5;
    color: #b42332;
  }

  .ubd-message-icon {
    display: grid;
    flex: 0 0 22px;
    width: 22px;
    height: 22px;
    place-items: center;
    border: 1px solid currentColor;
    border-radius: 50%;
    font-size: 12px;
    font-weight: 800;
  }

  .ubd-message p {
    margin: 1px 0 0;
    font-size: 12px;
    line-height: 1.75;
    overflow-wrap: anywhere;
  }

  .ubd-details-card,
  .ubd-related-section {
    margin-top: 21px;
    padding: clamp(20px, 3vw, 30px);
  }

  .ubd-details-heading,
  .ubd-related-heading {
    margin-bottom: 20px;
  }

  .ubd-details-heading h2,
  .ubd-related-heading h2,
  .ubd-ebook-copy h2 {
    margin: 5px 0 6px;
    color: var(--ubd-ink);
    font-size: 20px;
    font-weight: 800;
    letter-spacing: -.025em;
  }

  .ubd-metadata {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 11px;
    margin: 0;
  }

  .ubd-metadata-item {
    display: flex;
    align-items: flex-start;
    gap: 11px;
    min-width: 0;
    min-height: 78px;
    padding: 14px;
    border: 1px solid #edf0f6;
    border-radius: 12px;
    background: #fbfcfe;
  }

  .ubd-metadata-icon {
    display: grid;
    flex: 0 0 32px;
    width: 32px;
    height: 32px;
    place-items: center;
    border-radius: 9px;
    background: #edf2ff;
    color: var(--ubd-primary);
    font-size: 15px;
    font-weight: 700;
  }

  .ubd-metadata-copy {
    min-width: 0;
    padding-top: 1px;
  }

  .ubd-metadata-copy dt {
    margin-bottom: 6px;
    color: #7b879a;
    font-size: 10px;
    font-weight: 600;
  }

  .ubd-metadata-copy dd {
    margin: 0;
    color: #263650;
    font-size: 12px;
    font-weight: 750;
    line-height: 1.55;
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  .ubd-quantity-summary {
    display: flex;
    align-items: center;
    gap: 24px;
    margin-top: 15px;
    padding: 17px;
    border: 1px solid #e6ebf5;
    border-radius: 12px;
    background: #f7f9fe;
  }

  .ubd-quantity-item {
    display: flex;
    align-items: center;
    gap: 11px;
    flex: 1;
    min-width: 0;
  }

  .ubd-quantity-icon {
    display: grid;
    flex: 0 0 36px;
    width: 36px;
    height: 36px;
    place-items: center;
    border-radius: 10px;
    background: #e8eeff;
    color: var(--ubd-primary);
    font-size: 17px;
    font-weight: 800;
  }

  .ubd-quantity-item div {
    display: flex;
    flex-direction: column;
    gap: 5px;
    min-width: 0;
  }

  .ubd-quantity-item div span {
    color: #77849a;
    font-size: 11px;
  }

  .ubd-quantity-item div strong {
    color: #253650;
    font-size: 18px;
    font-weight: 800;
    overflow-wrap: anywhere;
  }

  .ubd-quantity-divider {
    align-self: stretch;
    width: 1px;
    background: #e0e6f0;
  }

  .ubd-ebook-card {
    display: flex;
    align-items: flex-start;
    gap: 16px;
    margin-top: 21px;
    padding: 22px;
    border: 1px solid #dce5ff;
    border-radius: 16px;
    background: linear-gradient(115deg, #f0f4ff 0%, #fff 100%);
  }

  .ubd-ebook-icon {
    display: grid;
    flex: 0 0 44px;
    width: 44px;
    height: 44px;
    place-items: center;
    border-radius: 12px;
    background: #dfe8ff;
    color: var(--ubd-primary);
    font-size: 22px;
  }

  .ubd-ebook-copy {
    min-width: 0;
  }

  .ubd-ebook-copy h2 {
    font-size: 17px;
  }

  .ubd-ebook-copy p {
    margin: 0;
    color: var(--ubd-muted);
    font-size: 12px;
    line-height: 1.8;
  }

  .ubd-related-heading {
    align-items: center;
  }

  .ubd-related-heading-icon {
    flex: 0 0 42px;
    width: 42px;
    height: 42px;
    font-size: 20px;
  }

  .ubd-related-grid {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 13px;
  }

  .ubd-related-book {
    display: flex;
    flex-direction: column;
    min-width: 0;
    padding: 0;
    overflow: hidden;
    border: 1px solid #e8edf5;
    border-radius: 13px;
    background: #fff;
    color: inherit;
    text-align: left;
    cursor: pointer;
    transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease;
  }

  .ubd-related-book:hover {
    transform: translateY(-3px);
    border-color: #cbd8ff;
    box-shadow: 0 9px 20px rgba(28, 45, 78, .08);
  }

  .ubd-related-book:focus-visible {
    outline: 3px solid rgba(49, 87, 200, .25);
    outline-offset: 3px;
  }

  .ubd-related-cover-wrap {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 174px;
    padding: 12px;
    overflow: hidden;
    background: #f4f6fb;
  }

  .ubd-related-cover {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
    border-radius: 3px;
  }

  .ubd-related-cover-fallback {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    height: 100%;
    border: 1px dashed #d5dceb;
    border-radius: 8px;
    color: #77849a;
  }

  .ubd-related-cover-fallback span {
    font-size: 35px;
  }

  .ubd-related-cover-fallback small {
    font-size: 8px;
    font-weight: 800;
    letter-spacing: .12em;
  }

  .ubd-related-stock {
    position: absolute;
    right: 7px;
    bottom: 7px;
    padding: 5px 7px;
    border-radius: 6px;
    background: rgba(255, 255, 255, .94);
    font-size: 9px;
    font-weight: 800;
  }

  .ubd-related-stock.is-available {
    color: #176b43;
  }

  .ubd-related-stock.is-unavailable {
    color: #a33a43;
  }

  .ubd-related-copy {
    display: flex;
    flex: 1;
    flex-direction: column;
    align-items: flex-start;
    min-width: 0;
    padding: 12px;
  }

  .ubd-related-category {
    display: block;
    max-width: 100%;
    margin-bottom: 7px;
    color: var(--ubd-primary);
    font-size: 9px;
    font-weight: 800;
    line-height: 1.5;
    overflow-wrap: anywhere;
  }

  .ubd-related-copy h3 {
    display: -webkit-box;
    width: 100%;
    min-height: 38px;
    margin: 0 0 7px;
    overflow: hidden;
    color: #253650;
    font-size: 12px;
    font-weight: 800;
    line-height: 1.55;
    overflow-wrap: anywhere;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  .ubd-related-copy p {
    display: -webkit-box;
    width: 100%;
    margin: 0 0 12px;
    overflow: hidden;
    color: #7b879a;
    font-size: 10px;
    line-height: 1.6;
    overflow-wrap: anywhere;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  .ubd-related-link {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: auto;
    color: var(--ubd-primary);
    font-size: 10px;
    font-weight: 800;
  }

  .ubd-related-state,
  .ubd-related-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: 12px;
    min-height: 100px;
    padding: 22px;
    border: 1px dashed #dfe5f0;
    border-radius: 12px;
    color: #69758a;
    font-size: 12px;
    line-height: 1.7;
    text-align: center;
  }

  .ubd-related-browse {
    padding: 6px 0;
    border: 0;
    background: transparent;
    color: var(--ubd-primary);
    font: inherit;
    font-weight: 800;
    cursor: pointer;
  }

  .ubd-bottom-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 14px;
    margin-top: 24px;
    padding: 0 3px;
    color: #8a95a7;
    font-size: 11px;
  }

  .ubd-bottom-link {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 5px 0;
    border: 0;
    background: transparent;
    color: var(--ubd-primary);
    font: inherit;
    font-weight: 750;
    cursor: pointer;
  }

  .ubd-state-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    max-width: 650px;
    min-height: 280px;
    margin: 40px auto;
    padding: 32px 24px;
    border: 1px solid var(--ubd-border);
    border-radius: 18px;
    background: #fff;
    text-align: center;
  }

  .ubd-state-card h1,
  .ubd-state-card h2 {
    margin: 16px 0 8px;
    color: var(--ubd-ink);
    font-size: 21px;
  }

  .ubd-state-card p {
    max-width: 480px;
    margin: 0 0 20px;
    color: var(--ubd-muted);
    font-size: 12px;
    line-height: 1.8;
  }

  .ubd-state-icon {
    display: grid;
    width: 50px;
    height: 50px;
    place-items: center;
    border-radius: 50%;
    background: #fff0f0;
    color: #c53030;
    font-size: 24px;
    font-weight: 800;
  }

  .ubd-error-card {
    margin-top: 20px;
  }

  @keyframes ubd-spin {
    to { transform: rotate(360deg); }
  }

  @media (max-width: 1050px) {
    .ubd-related-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .ubd-related-cover-wrap {
      height: 190px;
    }
  }

  @media (max-width: 850px) {
    .ubd-page {
      padding: 22px 17px 32px;
    }

    .ubd-main-card {
      grid-template-columns: minmax(190px, 250px) minmax(0, 1fr);
      gap: 23px;
      padding: 22px;
    }

    .ubd-cover-stage {
      min-height: 290px;
    }

    .ubd-metadata {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .ubd-actions {
      flex-direction: column;
    }

    .ubd-actions .ubd-button {
      width: 100%;
    }
  }

  @media (max-width: 600px) {
    .ubd-page {
      padding: 15px 12px 26px;
    }

    .ubd-breadcrumb {
      margin-bottom: 18px;
    }

    .ubd-page-heading {
      margin-bottom: 17px;
    }

    .ubd-page-heading h1 {
      font-size: 26px;
    }

    .ubd-page-heading p {
      font-size: 12px;
    }

    .ubd-heading-mark {
      flex-basis: 40px;
      width: 40px;
      height: 40px;
      border-radius: 11px;
      font-size: 20px;
    }

    .ubd-main-card {
      grid-template-columns: minmax(0, 1fr);
      gap: 22px;
      padding: 15px;
      border-radius: 16px;
    }

    .ubd-cover-stage {
      min-height: 260px;
    }

    .ubd-cover {
      max-height: 310px;
      max-width: 210px;
    }

    .ubd-cover-fallback {
      min-height: 210px;
    }

    .ubd-title {
      margin-top: 15px;
      font-size: 27px;
    }

    .ubd-details-card,
    .ubd-related-section {
      margin-top: 15px;
      padding: 17px 13px;
      border-radius: 15px;
    }

    .ubd-details-heading h2,
    .ubd-related-heading h2 {
      font-size: 18px;
    }

    .ubd-details-heading p,
    .ubd-related-heading p {
      font-size: 11px;
    }

    .ubd-details-heading-icon,
    .ubd-related-heading-icon {
      flex-basis: 36px;
      width: 36px;
      height: 36px;
      font-size: 18px;
    }

    .ubd-metadata {
      grid-template-columns: minmax(0, 1fr);
      gap: 8px;
    }

    .ubd-metadata-item {
      min-height: 65px;
      padding: 12px;
    }

    .ubd-quantity-summary {
      flex-direction: column;
      align-items: stretch;
      gap: 13px;
      padding: 14px;
    }

    .ubd-quantity-divider {
      width: 100%;
      height: 1px;
    }

    .ubd-ebook-card {
      gap: 12px;
      margin-top: 15px;
      padding: 16px 13px;
    }

    .ubd-ebook-icon {
      flex-basis: 38px;
      width: 38px;
      height: 38px;
      font-size: 19px;
    }

    .ubd-ebook-copy h2 {
      font-size: 16px;
    }

    .ubd-related-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }

    .ubd-related-cover-wrap {
      height: 175px;
    }

    .ubd-related-copy {
      padding: 10px;
    }

    .ubd-related-copy h3 {
      font-size: 11px;
    }

    .ubd-bottom-nav {
      align-items: flex-start;
      flex-direction: column;
      margin-top: 19px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .ubd-page *,
    .ubd-page *::before,
    .ubd-page *::after {
      animation-duration: .01ms !important;
      animation-iteration-count: 1 !important;
      scroll-behavior: auto !important;
      transition-duration: .01ms !important;
    }
  }
`
