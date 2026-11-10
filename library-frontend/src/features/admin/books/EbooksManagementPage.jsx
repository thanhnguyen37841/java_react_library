
import { useCallback, useEffect, useState } from 'react'
import { getBooks } from '../../../services/bookService'
import { uploadEbookPdf } from '../../../services/ebookService'
import './ebooks-management.css'

const PAGE_SIZE = 10
const MAX_PDF_SIZE = 30 * 1024 * 1024

function normalizeBook(book) {
  return {
    ...book,
    id: book.id ?? book.bookId,
    title: book.title || book.name || 'Chưa có tên sách',
    author: book.author || 'Chưa cập nhật',
    hasEbook: Boolean(
      book.hasEbook || book.ebookFilePath || book.ebookFileUrl,
    ),
  }
}

export default function EbooksManagementPage() {
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [page, setPage] = useState(0)

  const loadBooks = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const first = await getBooks(0, '')
      let all = [...(first.books || [])]

      for (
        let current = 1;
        current < (first.totalPages || 1) && current < 100;
        current += 1
      ) {
        const result = await getBooks(current, '')
        all = all.concat(result.books || [])
      }

      setBooks(all.map(normalizeBook))
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách sách.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadBooks()
  }, [loadBooks])

  async function handleUpload(book, file) {
    if (!file) return

    if (
      !file.name.toLowerCase().endsWith('.pdf') ||
      (file.type && file.type !== 'application/pdf')
    ) {
      setError('Chỉ được tải tệp PDF hợp lệ.')
      return
    }

    if (file.size > MAX_PDF_SIZE) {
      setError('Tệp PDF không được vượt quá 30 MB.')
      return
    }

    setBusyId(book.id)
    setError('')
    setNotice('')

    try {
      await uploadEbookPdf(book.id, file)
      setNotice(`Đã cập nhật bản điện tử cho "${book.title}".`)
      await loadBooks()
    } catch (err) {
      setError(err.message || 'Không thể tải PDF lên.')
    } finally {
      setBusyId(null)
    }
  }

  const totalPages = Math.max(1, Math.ceil(books.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages - 1)
  const visibleBooks = books.slice(
    safePage * PAGE_SIZE,
    (safePage + 1) * PAGE_SIZE,
  )

  return (
    <section className="library-content admin-ebooks">
      <header className="admin-ebooks__header">
        <div className="admin-ebooks__intro">
          <p className="admin-ebooks__eyebrow">QUẢN LÝ TÀI NGUYÊN SỐ</p>
          <h1>Quản lý sách điện tử</h1>
          <p className="admin-ebooks__description">
            Quản lý tệp PDF theo từng đầu sách. Tệp được lưu riêng trên máy
            chủ và chỉ được phân phối qua API kiểm tra quyền đọc.
          </p>
        </div>

        <button
          type="button"
          className="admin-ebooks__refresh"
          onClick={() => void loadBooks()}
          disabled={loading}
        >
          <span className="admin-ebooks__refresh-icon" aria-hidden="true">
            ↻
          </span>
          {loading ? 'Đang tải...' : 'Làm mới danh sách'}
        </button>
      </header>

      <div className="admin-ebooks__summary">
        <div className="admin-ebooks__summary-icon" aria-hidden="true">
          PDF
        </div>
        <div>
          <p className="admin-ebooks__summary-label">Tổng số đầu sách</p>
          <p className="admin-ebooks__summary-value">
            {loading ? '—' : books.length}
          </p>
        </div>
        <div className="admin-ebooks__summary-divider" />
        <div className="admin-ebooks__summary-detail">
          <span className="admin-ebooks__summary-dot" />
          <span>
            {loading
              ? 'Đang đồng bộ dữ liệu'
              : `${books.filter((book) => book.hasEbook).length} sách đã có PDF`}
          </span>
        </div>
      </div>

      {error && (
        <div className="admin-ebooks__alert admin-ebooks__alert--error" role="alert">
          <span className="admin-ebooks__alert-icon" aria-hidden="true">
            !
          </span>
          <p>{error}</p>
        </div>
      )}

      {notice && (
        <div className="admin-ebooks__alert admin-ebooks__alert--success" role="status">
          <span className="admin-ebooks__alert-icon" aria-hidden="true">
            ✓
          </span>
          <p>{notice}</p>
        </div>
      )}

      <section className="admin-ebooks__panel">
        <div className="admin-ebooks__panel-header">
          <div>
            <h2>Danh sách bản điện tử</h2>
            <p>Chọn một đầu sách để tải lên hoặc thay thế tệp PDF.</p>
          </div>
          <span className="admin-ebooks__page-size">
            {PAGE_SIZE} mục / trang
          </span>
        </div>

        {loading ? (
          <div className="admin-ebooks__loading" role="status">
            <span className="admin-ebooks__spinner" />
            <span>Đang tải danh sách sách...</span>
          </div>
        ) : (
          <>
            <div className="admin-ebooks__table-wrapper">
              <table className="admin-ebooks__table">
                <thead>
                  <tr>
                    <th className="admin-ebooks__number-column">STT</th>
                    <th>Tên sách</th>
                    <th>Tác giả</th>
                    <th>Trạng thái PDF</th>
                    <th className="admin-ebooks__action-column">
                      Thao tác
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {visibleBooks.map((book, index) => (
                    <tr key={book.id}>
                      <td className="admin-ebooks__number">
                        {safePage * PAGE_SIZE + index + 1}
                      </td>

                      <td>
                        <div className="admin-ebooks__book-title">
                          <span
                            className="admin-ebooks__book-icon"
                            aria-hidden="true"
                          >
                            PDF
                          </span>
                          <span>{book.title}</span>
                        </div>
                      </td>

                      <td className="admin-ebooks__author">
                        {book.author}
                      </td>

                      <td>
                        {book.hasEbook ? (
                          <span className="admin-ebooks__status admin-ebooks__status--ready">
                            <span />
                            Đã có PDF
                          </span>
                        ) : (
                          <span className="admin-ebooks__status admin-ebooks__status--missing">
                            <span />
                            Chưa có PDF
                          </span>
                        )}
                      </td>

                      <td>
                        <label
                          className={`admin-ebooks__upload ${
                            busyId === book.id
                              ? 'admin-ebooks__upload--busy'
                              : ''
                          }`}
                        >
                          <span>
                            {busyId === book.id ? (
                              <>
                                <span className="admin-ebooks__button-spinner" />
                                Đang tải...
                              </>
                            ) : (
                              <>
                                <span aria-hidden="true">
                                  {book.hasEbook ? '↻' : '↑'}
                                </span>
                                {book.hasEbook ? 'Thay PDF' : 'Tải PDF'}
                              </>
                            )}
                          </span>

                          <input
                            type="file"
                            accept=".pdf,application/pdf"
                            disabled={busyId === book.id}
                            onChange={(event) => {
                              const file = event.target.files?.[0]
                              event.target.value = ''
                              void handleUpload(book, file)
                            }}
                          />
                        </label>
                      </td>
                    </tr>
                  ))}

                  {visibleBooks.length === 0 && (
                    <tr>
                      <td colSpan={5}>
                        <div className="admin-ebooks__empty">
                          <span
                            className="admin-ebooks__empty-icon"
                            aria-hidden="true"
                          >
                            ▤
                          </span>
                          <strong>Chưa có đầu sách</strong>
                          <p>Danh sách sách hiện chưa có dữ liệu để hiển thị.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <footer className="admin-ebooks__pagination">
              <span>
                Hiển thị{' '}
                {books.length === 0 ? 0 : safePage * PAGE_SIZE + 1}
                {' – '}
                {Math.min((safePage + 1) * PAGE_SIZE, books.length)}
                {' trong tổng số '}
                <strong>{books.length}</strong> đầu sách
              </span>

              <div className="admin-ebooks__pagination-controls">
                <button
                  type="button"
                  disabled={safePage === 0}
                  onClick={() =>
                    setPage((current) => Math.max(0, current - 1))
                  }
                >
                  ← Trước
                </button>

                <span className="admin-ebooks__page-indicator">
                  {safePage + 1} / {totalPages}
                </span>

                <button
                  type="button"
                  disabled={safePage >= totalPages - 1}
                  onClick={() =>
                    setPage((current) =>
                      Math.min(totalPages - 1, current + 1),
                    )
                  }
                >
                  Sau →
                </button>
              </div>
            </footer>
          </>
        )}
      </section>

      <p className="admin-ebooks__footnote">
        <span aria-hidden="true">ⓘ</span>
        Chỉ chấp nhận tệp PDF có dung lượng tối đa 30 MB.
      </p>
    </section>
  )
}
