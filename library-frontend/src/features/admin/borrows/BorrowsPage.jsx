import { useCallback, useEffect, useState } from 'react'
import {
  approveBorrow,
  cancelBorrow,
  getBorrowById,
  getBorrows,
  handoverBorrow,
  rejectBorrow,
  returnBorrow,
} from '../../../services/borrowService'
import './borrows.css'

const PAGE_SIZE = 10

function getRecordId(record) {
  return record?.id ?? record?.borrowRecordId
}

function getBorrowCode(record) {
  return record?.borrowCode || record?.borrow_code || null
}

function getStatus(record) {
  const raw = String(
    record?.status ?? record?.borrowStatus ?? '',
  ).toUpperCase()

  if (
    [
      'BORROW_REQUESTED',
      'BORROW_APPROVED',
      'BORROW_REJECTED',
      'BORROWING',
      'RETURNED',
      'OVERDUE',
      'PENDING',
    ].includes(raw)
  ) {
    return raw
  }

  if (record?.returnDate ?? record?.returnedAt ?? record?.actualReturnDate) {
    return 'RETURNED'
  }

  const dueDate = record?.dueDate ?? record?.returnDueDate
  if (dueDate && new Date(dueDate) < new Date()) return 'OVERDUE'

  return raw || 'UNKNOWN'
}

function getStatusLabel(status) {
  return (
    {
      BORROW_REQUESTED: 'Chờ duyệt',
      PENDING: 'Chờ duyệt',
      BORROW_APPROVED: 'Chờ nhận sách',
      BORROW_REJECTED: 'Đã từ chối',
      BORROWING: 'Đang mượn',
      OVERDUE: 'Quá hạn',
      RETURNED: 'Đã trả',
      UNKNOWN: 'Chưa xác định',
    }[status] || status
  )
}

function getMemberName(record) {
  return (
    record?.member?.fullName ||
    record?.memberName ||
    record?.fullName ||
    record?.user?.email ||
    '—'
  )
}

function getBookTitle(record) {
  return record?.book?.title || record?.bookTitle || record?.title || '—'
}

function formatDate(value) {
  if (!value) return '—'

  const date = new Date(value)

  return Number.isNaN(date.getTime())
    ? String(value)
    : new Intl.DateTimeFormat('vi-VN').format(date)
}

function BorrowsPage({
  permissions = [],
  isAdmin = false,
}) {
  // ADMIN được phép thực hiện tất cả thao tác.
  // STAFF chỉ được thực hiện thao tác có quyền tương ứng.
  const can = useCallback(
    (permission) =>
      isAdmin || permissions.includes(permission),
    [isAdmin, permissions],
  )

  const canRead = can('BORROW_READ')
  const canCreate = can('BORROW_WRITE') || can('BORROW_CREATE')
  const canApprove = can('BORROW_APPROVE')
  const canReject = can('BORROW_REJECT')
  const canHandover = can('BORROW_HANDOVER')
  const canConfirmReturn =
    can('BORROW_CONFIRM_RETURN') || can('BORROW_RETURN')
  const canCancel = can('BORROW_CANCEL')

  const [records, setRecords] = useState([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)

  const [keywordInput, setKeywordInput] = useState('')
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [selectedRecord, setSelectedRecord] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [busyId, setBusyId] = useState(null)

  const loadRecords = useCallback(
    async (nextPage = 0, nextKeyword = '', nextStatus = '') => {
      if (!canRead) {
        setRecords([])
        setLoading(false)
        setError('Bạn không có quyền xem danh sách phiếu mượn.')
        return
      }

      setLoading(true)
      setError('')

      try {
        const result = await getBorrows({
          page: nextPage,
          size: PAGE_SIZE,
          keyword: nextKeyword,
          status: nextStatus,
        })

        setRecords(result.records || [])
        setPage(result.page ?? nextPage)
        setTotalPages(result.totalPages ?? 0)
        setTotalElements(result.totalElements ?? 0)
      } catch (err) {
        setError(err.message || 'Không thể tải danh sách phiếu mượn.')
        setRecords([])
      } finally {
        setLoading(false)
      }
    },
    [canRead],
  )

  useEffect(() => {
    if (canRead) {
      void loadRecords(0, '', '')
    } else {
      setLoading(false)
      setRecords([])
    }
  }, [loadRecords, canRead])

  async function handleSearch(event) {
    event.preventDefault()

    const nextKeyword = keywordInput.trim()

    setKeyword(nextKeyword)
    await loadRecords(0, nextKeyword, statusFilter)
  }

  async function handleStatusChange(event) {
    const nextStatus = event.target.value

    setStatusFilter(nextStatus)
    await loadRecords(0, keyword, nextStatus)
  }

  async function openDetails(record) {
    if (!canRead) return

    setSelectedRecord(record)
    setDetailLoading(true)
    setError('')
    setNotice('')

    try {
      const id = getRecordId(record)

      if (id !== undefined && id !== null) {
        setSelectedRecord(await getBorrowById(id))
      }
    } catch (err) {
      setNotice(
        err.message ||
          'Không thể tải chi tiết; đang hiển thị dữ liệu trong danh sách.',
      )
    } finally {
      setDetailLoading(false)
    }
  }

  async function handleReturn(record) {
    if (!canConfirmReturn) {
      setError('Bạn không có quyền xác nhận trả sách.')
      return
    }

    const id = getRecordId(record)

    if (id === undefined || id === null) {
      setError('Phiếu mượn không có ID nên không thể xác nhận trả sách.')
      return
    }

    if (
      !window.confirm(
        `Xác nhận ghi nhận trả sách "${getBookTitle(record)}"?`,
      )
    ) {
      return
    }

    setBusyId(id)
    setError('')
    setNotice('')

    try {
      await returnBorrow(id)

      setNotice('Đã ghi nhận trả sách thành công.')
      setSelectedRecord(null)

      await loadRecords(page, keyword, statusFilter)
    } catch (err) {
      setError(err.message || 'Không thể ghi nhận trả sách.')
    } finally {
      setBusyId(null)
    }
  }

  async function handleCancelBorrow(record) {
    if (!canCancel) {
      setError('Bạn không có quyền hủy phiếu mượn.')
      return
    }

    const id = getRecordId(record)

    if (id === undefined || id === null) {
      setError('Phiếu mượn không có ID nên không thể hủy.')
      return
    }

    if (
      !window.confirm(
        `Bạn có chắc muốn hủy phiếu mượn "${getBookTitle(record)}"?`,
      )
    ) {
      return
    }

    setBusyId(id)
    setError('')
    setNotice('')

    try {
      await cancelBorrow(id)

      setNotice('Đã hủy phiếu mượn thành công.')
      setSelectedRecord(null)

      await loadRecords(page, keyword, statusFilter)
    } catch (err) {
      setError(err.message || 'Không thể hủy phiếu mượn.')
    } finally {
      setBusyId(null)
    }
  }

  async function handleWorkflowAction(record, action) {
    const permissionMap = {
      approve: canApprove,
      reject: canReject,
      handover: canHandover,
    }

    if (!permissionMap[action]) {
      setError('Bạn không có quyền thực hiện thao tác này.')
      return
    }

    const id = getRecordId(record)

    if (id === undefined || id === null) {
      setError('Phiếu mượn không có ID.')
      return
    }

    const labels = {
      approve: 'duyệt yêu cầu mượn',
      reject: 'từ chối yêu cầu mượn',
      handover: 'xác nhận đã giao sách',
    }

    if (
      !window.confirm(
        `Bạn có chắc muốn ${labels[action]} cho "${getBookTitle(record)}"?`,
      )
    ) {
      return
    }

    setBusyId(id)
    setError('')
    setNotice('')

    try {
      if (action === 'approve') await approveBorrow(id)
      if (action === 'reject') await rejectBorrow(id)
      if (action === 'handover') await handoverBorrow(id)

      setNotice(
        {
          approve: 'Đã duyệt yêu cầu mượn.',
          reject: 'Đã từ chối yêu cầu mượn.',
          handover:
            'Đã xác nhận giao sách. Ngày mượn và hạn trả đã được ghi nhận.',
        }[action],
      )

      setSelectedRecord(null)
      await loadRecords(page, keyword, statusFilter)
    } catch (err) {
      setError(err.message || 'Không thể cập nhật phiếu mượn.')
    } finally {
      setBusyId(null)
    }
  }

  function renderActions(record, status) {
    const id = getRecordId(record)
    const busy = busyId === id

    const isPhysicalBook = record.loanType !== 'EBOOK'
    const canCancelStatus = [
      'PENDING',
      'BORROW_REQUESTED',
      'BORROWING',
    ].includes(status)

    return (
      <div className="borrow-actions">
        {canRead && (
          <button
            type="button"
            className="admin-borrows__button admin-borrows__button--secondary"
            disabled={busy}
            onClick={() => void openDetails(record)}
          >
            Chi tiết
          </button>
        )}

        {status === 'BORROW_REQUESTED' || status === 'PENDING' ? (
          <>
            {canApprove && (
              <button
                type="button"
                className="admin-borrows__button"
                disabled={busy}
                onClick={() =>
                  void handleWorkflowAction(record, 'approve')
                }
              >
                Duyệt
              </button>
            )}

            {canReject && (
              <button
                type="button"
                className="admin-borrows__button admin-borrows__button--secondary"
                disabled={busy}
                onClick={() =>
                  void handleWorkflowAction(record, 'reject')
                }
              >
                Từ chối
              </button>
            )}
          </>
        ) : null}

        {status === 'BORROW_APPROVED' && (
          <>
            {canHandover && (
              <button
                type="button"
                className="admin-borrows__button"
                disabled={busy}
                onClick={() =>
                  void handleWorkflowAction(record, 'handover')
                }
              >
                Xác nhận giao sách
              </button>
            )}

            {canReject && (
              <button
                type="button"
                className="admin-borrows__button admin-borrows__button--secondary"
                disabled={busy}
                onClick={() =>
                  void handleWorkflowAction(record, 'reject')
                }
              >
                Hủy duyệt / trả tồn
              </button>
            )}
          </>
        )}

        {['BORROWING', 'OVERDUE'].includes(status) &&
          isPhysicalBook &&
          canConfirmReturn && (
            <button
              type="button"
              className="borrow-btn-return"
              disabled={busy}
              onClick={() => void handleReturn(record)}
            >
              {busy ? 'Đang xử lý...' : 'Xác nhận trả sách'}
            </button>
          )}

        {canCancelStatus && canCancel && (
          <button
            type="button"
            className="admin-borrows__button"
            disabled={busy}
            onClick={() => void handleCancelBorrow(record)}
          >
            {busy ? 'Đang xử lý...' : 'Hủy phiếu'}
          </button>
        )}
      </div>
    )
  }

  if (!canRead) {
    return (
      <section className="library-content admin-borrows">
        <p
          className="admin-borrows__alert admin-borrows__alert--error"
          role="alert"
        >
          Bạn không có quyền xem danh sách phiếu mượn.
        </p>
      </section>
    )
  }

  return (
    <section className="library-content admin-borrows">
      <div className="admin-borrows__heading">
        <div>
          <p className="eyebrow">LIBRARY MANAGEMENT</p>
          <h1>Quản lý mượn / trả sách</h1>
          <p>
            Theo dõi phiếu mượn, hạn trả và tình trạng hoàn trả sách.
          </p>
        </div>

        <button
          type="button"
          className="admin-borrows__button admin-borrows__button--secondary"
          onClick={() => void loadRecords(page, keyword, statusFilter)}
          disabled={loading}
        >
          {loading ? 'Đang tải...' : '↻ Làm mới'}
        </button>
      </div>

      <form className="admin-borrows__filters" onSubmit={handleSearch}>
        <input
          type="search"
          value={keywordInput}
          onChange={(event) => setKeywordInput(event.target.value)}
          placeholder="Tìm theo tên thành viên hoặc tên sách..."
          aria-label="Từ khóa tìm kiếm"
        />

        <select
          value={statusFilter}
          onChange={handleStatusChange}
          aria-label="Lọc theo trạng thái"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="BORROW_REQUESTED">Chờ duyệt</option>
          <option value="BORROW_APPROVED">Chờ nhận sách</option>
          <option value="BORROW_REJECTED">Đã từ chối</option>
          <option value="BORROWING">Đang mượn</option>
          <option value="RETURNED">Đã trả</option>
          <option value="OVERDUE">Quá hạn</option>
        </select>

        <button
          type="submit"
          className="admin-borrows__button"
          disabled={loading}
        >
          Tìm kiếm
        </button>
      </form>

      {error && (
        <p
          className="admin-borrows__alert admin-borrows__alert--error"
          role="alert"
        >
          {error}
        </p>
      )}

      {notice && (
        <p
          className="admin-borrows__alert admin-borrows__alert--success"
          role="status"
        >
          {notice}
        </p>
      )}

      <div className="admin-borrows__table-card">
        <table className="admin-borrows__table">
          <thead>
            <tr>
              <th>Mã phiếu</th>
              <th>Thành viên</th>
              <th>Sách</th>
              <th>Ngày mượn</th>
              <th>Hạn trả</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="admin-borrows__empty">
                  Đang tải danh sách phiếu mượn...
                </td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={7} className="admin-borrows__empty">
                  Không có phiếu mượn phù hợp.
                </td>
              </tr>
            ) : (
              records.map((record, index) => {
                const id = getRecordId(record) ?? `record-${index}`
                const status = getStatus(record)
                const code = getBorrowCode(record)

                return (
                  <tr key={id}>
                    <td>
                      {code ||
                        (getRecordId(record) != null
                          ? `#${getRecordId(record)}`
                          : '—')}
                    </td>

                    <td>{getMemberName(record)}</td>
                    <td>{getBookTitle(record)}</td>

                    <td>
                      {formatDate(
                        record.borrowDate ??
                          record.borrowedAt ??
                          record.createdAt,
                      )}
                    </td>

                    <td>
                      {formatDate(
                        record.dueDate ?? record.returnDueDate,
                      )}
                    </td>

                    <td>
                      <span
                        className={`admin-borrows__status admin-borrows__status--${
                          status === 'RETURNED' ||
                          status === 'BORROW_REJECTED'
                            ? 'returned'
                            : status === 'OVERDUE'
                              ? 'overdue'
                              : 'active'
                        }`}
                      >
                        {getStatusLabel(status)}
                      </span>
                    </td>

                    <td>{renderActions(record, status)}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="admin-borrows__pagination">
        <span className="admin-borrows__muted">
          Tổng số: {totalElements} phiếu mượn
        </span>

        <div className="admin-borrows__pagination-actions">
          <button
            type="button"
            className="admin-borrows__button admin-borrows__button--secondary"
            disabled={loading || page <= 0}
            onClick={() =>
              void loadRecords(page - 1, keyword, statusFilter)
            }
          >
            Trước
          </button>

          <span className="admin-borrows__muted">
            Trang {totalPages ? page + 1 : 0}/{totalPages}
          </span>

          <button
            type="button"
            className="admin-borrows__button admin-borrows__button--secondary"
            disabled={
              loading || totalPages === 0 || page + 1 >= totalPages
            }
            onClick={() =>
              void loadRecords(page + 1, keyword, statusFilter)
            }
          >
            Sau
          </button>
        </div>
      </div>

      {selectedRecord && (
        <div
          className="admin-borrows__modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedRecord(null)
            }
          }}
        >
          <section
            className="admin-borrows__modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="borrow-detail-title"
          >
            <h2 id="borrow-detail-title">
              Chi tiết phiếu mượn{' '}
              {getBorrowCode(selectedRecord) ||
                `#${getRecordId(selectedRecord) ?? '—'}`}
            </h2>

            {detailLoading ? (
              <p>Đang tải chi tiết...</p>
            ) : (
              <div className="admin-borrows__details">
                <div className="admin-borrows__detail">
                  <span>Mã phiếu</span>
                  <strong>
                    {getBorrowCode(selectedRecord) || 'Chưa có mã phiếu'}
                  </strong>
                </div>

                <div className="admin-borrows__detail">
                  <span>Thành viên</span>
                  <strong>{getMemberName(selectedRecord)}</strong>
                </div>

                <div className="admin-borrows__detail">
                  <span>Sách</span>
                  <strong>{getBookTitle(selectedRecord)}</strong>
                </div>

                <div className="admin-borrows__detail">
                  <span>Ngày mượn</span>
                  <strong>
                    {formatDate(
                      selectedRecord.borrowDate ??
                        selectedRecord.borrowedAt ??
                        selectedRecord.createdAt,
                    )}
                  </strong>
                </div>

                <div className="admin-borrows__detail">
                  <span>Hạn trả</span>
                  <strong>
                    {formatDate(
                      selectedRecord.dueDate ??
                        selectedRecord.returnDueDate,
                    )}
                  </strong>
                </div>

                <div className="admin-borrows__detail">
                  <span>Ngày trả thực tế</span>
                  <strong>
                    {formatDate(
                      selectedRecord.returnDate ??
                        selectedRecord.returnedAt ??
                        selectedRecord.actualReturnDate,
                    )}
                  </strong>
                </div>

                <div className="admin-borrows__detail">
                  <span>Trạng thái</span>
                  <strong>
                    {getStatusLabel(getStatus(selectedRecord))}
                  </strong>
                </div>
              </div>
            )}

            <div className="admin-borrows__modal-actions">
              <button
                type="button"
                className="admin-borrows__button admin-borrows__button--secondary"
                onClick={() => setSelectedRecord(null)}
              >
                Đóng
              </button>

              {renderActions(
                selectedRecord,
                getStatus(selectedRecord),
              )}
            </div>
          </section>
        </div>
      )}
    </section>
  )
}

export default BorrowsPage
