import { useCallback, useEffect, useState } from 'react'
import {
  cancelBorrow,
  getMyBorrows,
} from '../../../services/borrowService'
import './UserMyBooksPage.css'

const PAGE_SIZE = 10

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'BORROW_REQUESTED', label: 'Chờ duyệt' },
  { value: 'BORROW_APPROVED', label: 'Chờ nhận sách' },
  { value: 'BORROW_REJECTED', label: 'Đã từ chối' },
  { value: 'BORROW_CANCELLED', label: 'Đã hủy' },
  { value: 'BORROWING', label: 'Đang mượn / đọc' },
  { value: 'OVERDUE', label: 'Quá hạn' },
  { value: 'RETURNED', label: 'Đã trả / kết thúc đọc' },
]

const STATUS_LABELS = {
  BORROW_REQUESTED: 'Chờ duyệt',
  BORROW_APPROVED: 'Chờ nhận sách',
  BORROW_REJECTED: 'Đã từ chối',
  BORROW_CANCELLED: 'Đã hủy',
  BORROWING: 'Đang mượn / đọc',
  OVERDUE: 'Quá hạn',
  RETURNED: 'Đã trả / kết thúc đọc',
}

function getRecordCode(record) {
  return record?.borrowCode || record?.borrow_code || null
}

function getRecordId(record) {
  return record?.id ?? record?.borrowRecordId
}

function getBookTitle(record) {
  return (
    record?.bookTitle ||
    record?.book?.title ||
    record?.title ||
    'Không có tên sách'
  )
}

function formatDate(value) {
  if (!value) return '—'

  const date = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value,
  )

  if (Number.isNaN(date.getTime())) return String(value)

  return date.toLocaleDateString('vi-VN')
}

function getDueWarning(record) {
  if (
    record.status === 'RETURNED' ||
    record.status === 'BORROW_REJECTED' ||
    record.status === 'BORROW_CANCELLED' ||
    !record.dueDate
  ) {
    return null
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const dueDate = new Date(`${record.dueDate}T00:00:00`)
  if (Number.isNaN(dueDate.getTime())) return null

  const diffDays = Math.round(
    (dueDate.getTime() - today.getTime()) / 86400000,
  )

  if (diffDays < 0 || record.status === 'OVERDUE') {
    return { label: 'Đã quá hạn', type: 'overdue' }
  }

  if (diffDays === 0) {
    return { label: 'Đến hạn hôm nay', type: 'due-today' }
  }

  if (diffDays <= 3) {
    return { label: `Còn ${diffDays} ngày`, type: 'due-soon' }
  }

  return null
}

function getErrorMessage(err) {
  if (err?.status === 401 || err?.authExpired) {
    return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
  }

  if (err?.status === 403) {
    return 'Tài khoản không có quyền xem lịch sử mượn sách.'
  }

  return err?.message || 'Không thể tải lịch sử mượn sách.'
}

function normalizeRecords(result) {
  const items =
    result?.records ??
    result?.content ??
    result?.borrowRecords ??
    result?.items ??
    []

  return {
    items: Array.isArray(items) ? items : [],
    totalPages: Number(result?.totalPages ?? 0),
    totalElements: Number(result?.totalElements ?? items.length),
  }
}

export default function UserMyBooksPage() {
  const [records, setRecords] = useState([])
  const [keywordInput, setKeywordInput] = useState('')
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(0)

  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [cancellingId, setCancellingId] = useState(null)

  const loadRecords = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const result = await getMyBorrows({
        page,
        size: PAGE_SIZE,
        keyword,
        status,
      })

      const normalized = normalizeRecords(result)
      setRecords(normalized.items)
      setTotalPages(normalized.totalPages)
      setTotalElements(normalized.totalElements)
    } catch (err) {
      setRecords([])
      setTotalPages(0)
      setTotalElements(0)
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [page, keyword, status])

  useEffect(() => {
    void loadRecords()
  }, [loadRecords])

  function handleSearch(event) {
    event.preventDefault()

    const nextKeyword = keywordInput.trim()

    if (nextKeyword !== keyword) {
      setPage(0)
      setKeyword(nextKeyword)
      return
    }

    if (page !== 0) {
      setPage(0)
      return
    }

    void loadRecords()
  }

  function handleStatusChange(event) {
    setPage(0)
    setStatus(event.target.value)
  }

  function handlePageChange(nextPage) {
    if (nextPage < 0 || nextPage >= totalPages) return
    setPage(nextPage)
  }

  async function handleCancel(record) {
    const id = getRecordId(record)

    if (id === null || id === undefined) {
      setActionError('Không xác định được phiếu mượn cần hủy.')
      return
    }

    if (
      record.loanType !== 'PAPER' ||
      record.status !== 'BORROW_REQUESTED'
    ) {
      return
    }

    const confirmed = window.confirm(
      'Bạn có chắc chắn muốn hủy yêu cầu mượn sách này không?',
    )

    if (!confirmed) return

    setCancellingId(id)
    setActionError('')

    try {
      await cancelBorrow(id)
      await loadRecords()

      window.alert('Đã hủy yêu cầu mượn sách thành công.')
    } catch (err) {
      setActionError(
        err?.message || 'Không thể hủy yêu cầu mượn sách.',
      )
    } finally {
      setCancellingId(null)
    }
  }

  return (
    <main className="my-books-page">
      <header className="my-books-header">
        <div>
          <p className="my-books-eyebrow">TÀI KHOẢN CỦA BẠN</p>
          <h1>Lịch sử mượn sách</h1>
          <p className="my-books-description">
            Theo dõi sách đang mượn, hạn trả và lịch sử trả sách.
          </p>
        </div>

        <div className="my-books-total">
          <span>Tổng lượt mượn</span>
          <strong>{totalElements}</strong>
        </div>
      </header>

      <form className="my-books-toolbar" onSubmit={handleSearch}>
        <input
          type="search"
          value={keywordInput}
          onChange={(event) => setKeywordInput(event.target.value)}
          placeholder="Tìm theo tên sách..."
          aria-label="Tìm theo tên sách"
        />

        <select
          value={status}
          onChange={handleStatusChange}
          aria-label="Lọc theo trạng thái"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <button
          type="submit"
          className="my-books-search-button"
          disabled={loading}
        >
          Tìm kiếm
        </button>
      </form>

      {error && (
        <div className="my-books-error" role="alert">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void loadRecords()}
            disabled={loading}
          >
            Thử lại
          </button>
        </div>
      )}

      {actionError && (
        <div className="my-books-error" role="alert">
          <span>{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError('')}
          >
            Đóng
          </button>
        </div>
      )}

      <section className="my-books-table-card">
        {loading ? (
          <div className="my-books-state" aria-live="polite">
            Đang tải dữ liệu...
          </div>
        ) : error ? (
          <div className="my-books-state">
            Không thể hiển thị dữ liệu.
          </div>
        ) : records.length === 0 ? (
          <div className="my-books-state">
            <strong>Chưa có lượt mượn sách</strong>
            <p>Thử thay đổi từ khóa hoặc bộ lọc trạng thái.</p>
          </div>
        ) : (
          <div className="my-books-table-wrapper">
            <table className="my-books-table">
              <thead>
                <tr>
                  <th>Mã phiếu</th>
                  <th>Tên sách</th>
                  <th>Hình thức</th>
                  <th>Ngày mượn</th>
                  <th>Hạn trả</th>
                  <th>Ngày trả</th>
                  <th>Trạng thái</th>
                  <th>Cảnh báo</th>
                  <th>Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {records.map((record, index) => {
                  const warning = getDueWarning(record)
                  const code = getRecordCode(record)
                  const id = getRecordId(record)

                  const canCancel =
                    record.loanType === 'PAPER' &&
                    record.status === 'BORROW_REQUESTED'

                  return (
                    <tr key={id ?? `${code ?? 'record'}-${index}`}>
                      <td>
                        {code || (id != null ? `#${id}` : '—')}
                      </td>

                      <td className="my-books-title">
                        {getBookTitle(record)}
                      </td>

                      <td>
                        {record.loanType === 'EBOOK'
                          ? 'Đọc trực tuyến'
                          : 'Sách giấy'}
                      </td>

                      <td>{formatDate(record.borrowDate)}</td>
                      <td>{formatDate(record.dueDate)}</td>
                      <td>{formatDate(record.returnDate)}</td>

                      <td>
                        <span
                          className={`my-books-status my-books-status--${String(
                            record.status || '',
                          ).toLowerCase()}`}
                        >
                          {STATUS_LABELS[record.status] ||
                            record.status ||
                            'Không xác định'}
                        </span>
                      </td>

                      <td>
                        {warning ? (
                          <span
                            className={`my-books-warning my-books-warning--${warning.type}`}
                          >
                            {warning.label}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>

                      <td>
                        {canCancel ? (
                          <button
                            type="button"
                            className="my-books-search-button"
                            disabled={cancellingId === id}
                            onClick={() => void handleCancel(record)}
                          >
                            {cancellingId === id
                              ? 'Đang hủy...'
                              : 'Hủy yêu cầu'}
                          </button>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {!loading && !error && totalElements > 0 && (
        <footer className="my-books-pagination">
          <span>
            Trang {page + 1}/{Math.max(totalPages, 1)}
            {' · '}
            {totalElements} lượt
          </span>

          <div>
            <button
              type="button"
              disabled={page === 0}
              onClick={() => handlePageChange(page - 1)}
            >
              Trước
            </button>

            <button
              type="button"
              disabled={totalPages === 0 || page >= totalPages - 1}
              onClick={() => handlePageChange(page + 1)}
            >
              Tiếp
            </button>
          </div>
        </footer>
      )}
    </main>
  )
}