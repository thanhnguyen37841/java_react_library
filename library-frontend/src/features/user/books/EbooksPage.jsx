
import { useCallback, useEffect, useRef, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { getMyBorrows } from '../../../services/borrowService'
import {
  borrowEbook,
  getEbooks,
  openEbookPdf,
  returnEbook,
} from '../../../services/ebookService'
import './EbooksPage.css'

import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

function formatDate(value) {
  if (!value) return '—'

  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('vi-VN')
}

export default function EbooksPage() {
  const [books, setBooks] = useState([])
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [pdfUrl, setPdfUrl] = useState('')
  const [readingBookId, setReadingBookId] = useState(null)
  const [readingTitle, setReadingTitle] = useState('')
  const [pageNumber, setPageNumber] = useState(1)
  const [numPages, setNumPages] = useState(0)
  const [scale, setScale] = useState(1)
  const [darkMode, setDarkMode] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfError, setPdfError] = useState('')

  const readerRef = useRef(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const [ebookList, borrowResult] = await Promise.all([
        getEbooks(),
        getMyBorrows({ page: 0, size: 10 }),
      ])

      setBooks(ebookList)
      setRecords(
        borrowResult.records.filter(
          (item) => item.loanType === 'EBOOK',
        ),
      )
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách ebook.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  // Giải phóng URL tạm khi đóng sách, chuyển sách hoặc unmount.
  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl)
    }
  }, [pdfUrl])

  function activeRecord(bookId) {
    return records.find(
      (record) =>
        Number(record.bookId ?? record.book?.id) === Number(bookId) &&
        ['BORROWING', 'OVERDUE'].includes(record.status),
    )
  }

  async function handleBorrow(book) {
    setBusyId(book.id)
    setError('')
    setNotice('')

    try {
      await borrowEbook(book.id)
      setNotice(
        `Đã cấp quyền đọc "${book.title}" trong 14 ngày.`,
      )
      await refresh()
    } catch (err) {
      setError(err.message || 'Không thể mượn ebook.')
    } finally {
      setBusyId(null)
    }
  }

  async function handleRead(book) {
    setBusyId(book.id)
    setError('')
    setPdfError('')
    setPdfLoading(true)

    try {
      const nextUrl = await openEbookPdf(book.id)

      setReadingBookId(book.id)
      setReadingTitle(book.title)
      setPageNumber(1)
      setNumPages(0)
      setScale(1)
      setPdfUrl(nextUrl)
    } catch (err) {
      setError(err.message || 'Không thể mở ebook.')
      setPdfLoading(false)
    } finally {
      setBusyId(null)
    }
  }

  async function handleReturn(record, book) {
    if (
      !window.confirm(
        `Bạn có chắc muốn kết thúc lượt đọc "${book.title}"?`,
      )
    ) {
      return
    }

    setBusyId(book.id)
    setError('')
    setNotice('')

    try {
      await returnEbook(record.id)

      if (Number(readingBookId) === Number(book.id)) {
        closeReader()
      }

      setNotice('Đã kết thúc lượt đọc trực tuyến.')
      await refresh()
    } catch (err) {
      setError(err.message || 'Không thể kết thúc lượt đọc.')
    } finally {
      setBusyId(null)
    }
  }

  function closeReader() {
    setPdfUrl('')
    setReadingBookId(null)
    setReadingTitle('')
    setPageNumber(1)
    setNumPages(0)
    setPdfError('')
    setPdfLoading(false)
  }

  function onDocumentLoadSuccess({ numPages: totalPages }) {
    setNumPages(totalPages)

    const savedPage = Number(
      localStorage.getItem(`ebook-page-${readingBookId}`) || 1,
    )

    const initialPage = Math.min(
      Math.max(savedPage, 1),
      totalPages,
    )

    setPageNumber(initialPage)
    setPdfLoading(false)
  }

  function changePage(nextPage) {
    if (nextPage < 1 || nextPage > numPages) return

    setPageNumber(nextPage)

    if (readingBookId !== null) {
      localStorage.setItem(
        `ebook-page-${readingBookId}`,
        String(nextPage),
      )
    }
  }

  function zoomIn() {
    setScale((current) => Math.min(2, current + 0.15))
  }

  function zoomOut() {
    setScale((current) => Math.max(0.5, current - 0.15))
  }

  function toggleFullscreen() {
    if (!readerRef.current) return

    if (!document.fullscreenElement) {
      readerRef.current.requestFullscreen?.()
    } else {
      document.exitFullscreen?.()
    }
  }

  useEffect(() => {
    if (!pdfUrl) return undefined

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        if (document.fullscreenElement) {
          document.exitFullscreen?.()
        } else {
          closeReader()
        }
      }

      if (event.key === 'ArrowRight') {
        setPageNumber((current) => {
          const next = Math.min(current + 1, numPages)
          if (readingBookId !== null) {
            localStorage.setItem(
              `ebook-page-${readingBookId}`,
              String(next),
            )
          }
          return next
        })
      }

      if (event.key === 'ArrowLeft') {
        setPageNumber((current) => {
          const next = Math.max(1, current - 1)
          if (readingBookId !== null) {
            localStorage.setItem(
              `ebook-page-${readingBookId}`,
              String(next),
            )
          }
          return next
        })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [pdfUrl, numPages, readingBookId])

  return (
    <main className="ebooks-page">
      <section className="ebooks-hero">
        <div className="ebooks-hero-copy">
          <span className="ebooks-eyebrow">YOUR DIGITAL LIBRARY</span>
          <h1>Không gian đọc của bạn</h1>
          <p>
            Một góc nhỏ để khám phá tri thức, lưu lại từng trang
            sách và tiếp tục hành trình đọc của riêng bạn.
          </p>
        </div>

        <div className="ebooks-hero-mark" aria-hidden="true">
          <span>READ</span>
          <span>·</span>
          <span>EXPLORE</span>
        </div>
      </section>

      {error && (
        <div className="ebooks-alert ebooks-alert-error" role="alert">
          {error}
        </div>
      )}

      {notice && (
        <div className="ebooks-alert ebooks-alert-success" role="status">
          {notice}
        </div>
      )}

      <section className="ebooks-section">
        <div className="ebooks-section-heading">
          <div>
            <span className="ebooks-eyebrow">THE COLLECTION</span>
            <h2>Kệ sách điện tử</h2>
          </div>
          <span className="ebooks-count">
            {books.length} đầu sách
          </span>
        </div>

        {loading ? (
          <div className="ebooks-empty">Đang tải kệ sách...</div>
        ) : books.length === 0 ? (
          <div className="ebooks-empty">
            <span className="ebooks-empty-icon">⌑</span>
            <h3>Kệ sách đang chờ bạn</h3>
            <p>Hiện chưa có sách điện tử được đăng tải.</p>
          </div>
        ) : (
          <div className="ebooks-grid">
            {books.map((book, index) => {
              const record = activeRecord(book.id)
              const colors = ['sand', 'sage', 'rose', 'blue']
              const coverStyle = colors[index % colors.length]

              return (
                <article className="ebook-card" key={book.id}>
                  <div className={`ebook-cover ${coverStyle}`}>
                    <span className="ebook-cover-label">
                      DIGITAL EDITION
                    </span>
                    <span className="ebook-cover-decoration">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div className="ebook-cover-title">
                      <span>THE LIBRARY</span>
                      <strong>{book.title}</strong>
                    </div>
                    <span className="ebook-cover-author">
                      {book.author || 'Tác giả chưa cập nhật'}
                    </span>
                  </div>

                  <div className="ebook-card-body">
                    <div className="ebook-card-meta">
                      <span>PDF</span>
                      <span>
                        {record ? 'Đang có quyền đọc' : 'Sách điện tử'}
                      </span>
                    </div>

                    <h3>{book.title}</h3>
                    <p className="ebook-author">
                      {book.author || 'Chưa cập nhật tác giả'}
                    </p>

                    {record && (
                      <p className="ebook-due-date">
                        Hạn đọc: <strong>{formatDate(record.dueDate)}</strong>
                      </p>
                    )}

                    <div className="ebook-card-actions">
                      {record ? (
                        <>
                          <button
                            type="button"
                            className="ebook-button-primary"
                            disabled={busyId === book.id}
                            onClick={() => handleRead(book)}
                          >
                            {busyId === book.id
                              ? 'Đang mở...'
                              : 'Đọc sách'}
                            <span aria-hidden="true">↗</span>
                          </button>

                          <button
                            type="button"
                            className="ebook-button-secondary"
                            disabled={busyId === book.id}
                            onClick={() => handleReturn(record, book)}
                          >
                            Kết thúc lượt đọc
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="ebook-button-primary"
                          disabled={busyId === book.id}
                          onClick={() => handleBorrow(book)}
                        >
                          {busyId === book.id
                            ? 'Đang xử lý...'
                            : 'Mượn đọc trực tuyến'}
                          <span aria-hidden="true">↗</span>
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      {pdfUrl && (
        <section
          ref={readerRef}
          className={`ebook-reader ${darkMode ? 'reader-dark' : ''}`}
          aria-label="Trình đọc sách điện tử"
        >
          <header className="reader-topbar">
            <button
              type="button"
              className="reader-back"
              onClick={closeReader}
            >
              <span aria-hidden="true">←</span>
              <span>Về kệ sách</span>
            </button>

            <div className="reader-book-heading">
              <span>ĐANG ĐỌC</span>
              <strong title={readingTitle}>{readingTitle}</strong>
            </div>

            <button
              type="button"
              className="reader-icon-button"
              onClick={toggleFullscreen}
              title="Toàn màn hình"
              aria-label="Toàn màn hình"
            >
              ⛶
            </button>
          </header>

          <div className="reader-toolbar">
            <div className="reader-toolbar-group">
              <button
                type="button"
                className="reader-tool-button"
                onClick={zoomOut}
                disabled={scale <= 0.5}
                aria-label="Thu nhỏ"
              >
                −
              </button>
              <span className="reader-zoom-value">
                {Math.round(scale * 100)}%
              </span>
              <button
                type="button"
                className="reader-tool-button"
                onClick={zoomIn}
                disabled={scale >= 2}
                aria-label="Phóng to"
              >
                +
              </button>
            </div>

            <div className="reader-toolbar-group reader-pagination">
              <button
                type="button"
                className="reader-tool-button"
                onClick={() => changePage(pageNumber - 1)}
                disabled={pageNumber <= 1}
                aria-label="Trang trước"
              >
                ‹
              </button>

              <label className="reader-page-input">
                <input
                  type="number"
                  min="1"
                  max={numPages || 1}
                  value={pageNumber}
                  onChange={(event) => {
                    const value = Number(event.target.value)
                    if (value >= 1 && value <= numPages) {
                      changePage(value)
                    }
                  }}
                  aria-label="Số trang hiện tại"
                />
                <span>/ {numPages || '—'}</span>
              </label>

              <button
                type="button"
                className="reader-tool-button"
                onClick={() => changePage(pageNumber + 1)}
                disabled={!numPages || pageNumber >= numPages}
                aria-label="Trang tiếp theo"
              >
                ›
              </button>
            </div>

            <button
              type="button"
              className="reader-icon-button reader-theme-button"
              onClick={() => setDarkMode((current) => !current)}
              title={darkMode ? 'Chế độ sáng' : 'Chế độ tối'}
            >
              {darkMode ? '☀' : '☾'}
            </button>
          </div>

          <div className="reader-progress-track">
            <div
              className="reader-progress-fill"
              style={{
                width: numPages
                  ? `${(pageNumber / numPages) * 100}%`
                  : '0%',
              }}
            />
          </div>

          <div className="reader-workspace">
            <div className="reader-paper">
              {pdfLoading && (
                <div className="reader-message">
                  <span className="reader-spinner" />
                  <p>Đang chuẩn bị trang sách...</p>
                </div>
              )}

              {pdfError ? (
                <div className="reader-message reader-error">
                  <h3>Không thể hiển thị trang sách</h3>
                  <p>{pdfError}</p>
                </div>
              ) : (
                <Document
                  file={pdfUrl}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={(err) => {
                    setPdfError(err.message || 'Không thể đọc file PDF.')
                    setPdfLoading(false)
                  }}
                  loading={null}
                  error={null}
                  noData="Không có dữ liệu PDF."
                >
                  <Page
                    pageNumber={pageNumber}
                    scale={scale}
                    renderTextLayer
                    renderAnnotationLayer
                    loading={
                      <div className="reader-message">
                        Đang tải trang...
                      </div>
                    }
                  />
                </Document>
              )}
            </div>
          </div>

          <footer className="reader-footer">
            <span>YOUR DIGITAL LIBRARY</span>
            <span>
              {numPages
                ? `Bạn đang ở trang ${pageNumber} / ${numPages}`
                : 'Đang chuẩn bị tài liệu'}
            </span>
            <span>Tiến độ đọc được lưu trên thiết bị này</span>
          </footer>
        </section>
      )}
    </main>
  )
}
