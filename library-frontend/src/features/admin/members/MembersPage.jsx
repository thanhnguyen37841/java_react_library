import { useCallback, useEffect, useState } from 'react'
import { getCurrentUserPermissions } from '../../../services/adminService'
import {
  createMember,
  deleteMember,
  getMembers,
  getDeletedMembers,
  restoreMember,
  updateMember,
  searchBorrowedBooks,
  getBorrowedBookSearchError
} from '../../../services/memberService'
import MemberForm from './MemberForm'
import './members.css'

const EMPTY_FILTERS = {
  name: '',
  email: '',
  phoneNumber: '',
  address: '',
  birthFrom: '',
  birthTo: '',
  bookTitle: '',
  bookId: '',
  isVerified: ''
}

function escapeCsvValue(value) {
  let text = value === null || value === undefined
    ? ''
    : String(value)

  // Ngăn dữ liệu CSV bị hiểu nhầm thành công thức trong Excel.
  if (/^[\s]*[=+\-@]/.test(text)) {
    text = `'${text}`
  }

  return `"${text.replace(/"/g, '""')}"`
}

export default function MembersPage({
  onToast,
  permissions: suppliedPermissions,
  isAdmin: suppliedIsAdmin
}) {
  const [loadedPermissions, setLoadedPermissions] = useState([])
  const [loadedIsAdmin, setLoadedIsAdmin] = useState(false)
  const [permissionsLoading, setPermissionsLoading] = useState(
    !Array.isArray(suppliedPermissions) ||
    typeof suppliedIsAdmin !== 'boolean'
  )
  const [permissionsError, setPermissionsError] = useState('')

  const permissions = Array.isArray(suppliedPermissions)
    ? suppliedPermissions
    : loadedPermissions

  const isAdmin = typeof suppliedIsAdmin === 'boolean'
    ? suppliedIsAdmin
    : loadedIsAdmin

  const permissionSet = new Set(
    Array.isArray(permissions) ? permissions : []
  )

  const can = (permission) => isAdmin || permissionSet.has(permission)

  const canRead = can('MEMBER_READ')
  const canCreate = can('MEMBER_CREATE')
  const canUpdate = can('MEMBER_UPDATE')
  const canDelete = can('MEMBER_DELETE')
  const canExport = can('MEMBER_EXPORT')

  const [members, setMembers] = useState([])
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [searchFilters, setSearchFilters] = useState(EMPTY_FILTERS)

  const [bookOptions, setBookOptions] = useState([])
  const [bookQuery, setBookQuery] = useState('')
  const [bookDropdownOpen, setBookDropdownOpen] = useState(false)
  const [bookLoading, setBookLoading] = useState(false)
  const [selectedBook, setSelectedBook] = useState(null)

  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingMember, setEditingMember] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [showTrash, setShowTrash] = useState(false)
  const [deletedMembers, setDeletedMembers] = useState([])
  const [bookSearchError, setBookSearchError] = useState('')

  const notify = useCallback((message, type = 'info') => {
    onToast?.(message, type)
  }, [onToast])

  // Tìm sách đang được mượn, debounce 300ms.
  useEffect(() => {
    if (!bookDropdownOpen || !bookQuery.trim()) {
      setBookOptions([])
      setBookLoading(false)
      setBookSearchError('')
      return
    }

    let cancelled = false

    setBookSearchError('')

    const timer = setTimeout(async () => {
      setBookLoading(true)
      setBookSearchError('')

      try {
        const results = await searchBorrowedBooks(bookQuery.trim())

        if (!cancelled) {
          setBookOptions(results)
          setBookSearchError('')
        }
      } catch (error) {
        if (!cancelled) {
          setBookOptions([])
          setBookSearchError(
            getBorrowedBookSearchError(error)
          )
        }
      } finally {
        if (!cancelled) {
          setBookLoading(false)
        }
      }
    }, 300)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [bookQuery, bookDropdownOpen])

  useEffect(() => {
    if (
      Array.isArray(suppliedPermissions) &&
      typeof suppliedIsAdmin === 'boolean'
    ) {
      setPermissionsLoading(false)
      setPermissionsError('')
      return
    }

    let cancelled = false

    async function loadPermissions() {
      setPermissionsLoading(true)
      setPermissionsError('')

      try {
        const account = await getCurrentUserPermissions()

        if (cancelled) return

        setLoadedPermissions(
          Array.isArray(account.permissions)
            ? account.permissions
            : []
        )
        setLoadedIsAdmin(account.admin === true)
      } catch (error) {
        if (cancelled) return

        setLoadedPermissions([])
        setLoadedIsAdmin(false)
        setPermissionsError(
          error.message || 'Không thể tải quyền tài khoản.'
        )
        notify(
          error.message || 'Không thể tải quyền tài khoản.',
          'error'
        )
      } finally {
        if (!cancelled) setPermissionsLoading(false)
      }
    }

    loadPermissions()

    return () => {
      cancelled = true
    }
  }, [
    suppliedPermissions,
    suppliedIsAdmin,
    notify
  ])

  const loadMembers = useCallback(async (
    nextPage = 0,
    nextFilters = searchFilters
  ) => {
    if (!canRead) {
      setMembers([])
      setTotalPages(0)
      setTotalElements(0)
      setPage(0)
      return
    }

    setLoading(true)

    try {
      const result = await getMembers({
        ...nextFilters,
        page: nextPage,
        size: 10
      })

      setMembers(result.members)
      setPage(result.page)
      setTotalPages(result.totalPages)
      setTotalElements(result.totalElements)
    } catch (error) {
      notify(
        error.message || 'Không thể tải danh sách thành viên.',
        'error'
      )
    } finally {
      setLoading(false)
    }
  }, [searchFilters, notify, canRead])

  useEffect(() => {
    let cancelled = false

    async function fetchInitialMembers() {
      if (!canRead) {
        setMembers([])
        setTotalPages(0)
        setTotalElements(0)
        setPage(0)
        return
      }

      setLoading(true)

      try {
        const result = await getMembers({
          ...EMPTY_FILTERS,
          page: 0,
          size: 10
        })

        if (cancelled) return

        setMembers(result.members)
        setPage(result.page)
        setTotalPages(result.totalPages)
        setTotalElements(result.totalElements)
      } catch (error) {
        if (!cancelled) {
          notify(
            error.message || 'Không thể tải danh sách thành viên.',
            'error'
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchInitialMembers()

    return () => {
      cancelled = true
    }
  }, [notify, canRead])

  function handleExportMembersCsv() {
    if (!canExport) {
      notify(
        'Bạn không có quyền xuất danh sách thành viên.',
        'error'
      )
      return
    }

    if (showTrash) {
      notify(
        'Không thể xuất danh sách khi đang ở chế độ thùng rác.',
        'error'
      )
      return
    }

    if (loading || members.length === 0) {
      notify('Không có dữ liệu thành viên để xuất.', 'warning')
      return
    }

    const headers = [
      'ID',
      'Họ tên',
      'Email',
      'Ngày sinh',
      'Số điện thoại',
      'Địa chỉ',
      'Đã xác thực'
    ]

    const rows = members.map((member) => {
      const isVerified = Boolean(
        member.isVerified || member.verified
      )

      return [
        member.id,
        member.fullName,
        member.email,
        member.dateOfBirth,
        member.phoneNumber,
        member.address,
        isVerified ? 'Yes' : 'No'
      ].map(escapeCsvValue).join(',')
    })

    const csvContent = [
      '\uFEFF' + headers.map(escapeCsvValue).join(','),
      ...rows
    ].join('\r\n')

    const blob = new Blob(
      [csvContent],
      { type: 'text/csv;charset=utf-8;' }
    )

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = 'danh-sach-thanh-vien.csv'

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    URL.revokeObjectURL(url)

    notify(
      `Đã xuất ${members.length} thành viên ra file CSV.`,
      'success'
    )
  }

  function handleFilterChange(event) {
    const { name, value } = event.target

    setFilters((previous) => ({
      ...previous,
      [name]: value
    }))
  }

  function handleBookQueryChange(event) {
    const value = event.target.value

    setBookQuery(value)
    setSelectedBook(null)
    setBookSearchError('')

    setFilters((previous) => ({
      ...previous,
      bookTitle: '',
      bookId: ''
    }))

    setBookDropdownOpen(true)
  }

  function selectBook(book) {
    setSelectedBook(book)
    setBookQuery(book.title || '')
    setBookSearchError('')

    setFilters((previous) => ({
      ...previous,
      bookTitle: book.title || '',
      bookId: book.id != null ? String(book.id) : ''
    }))

    setBookDropdownOpen(false)
  }

  function clearSelectedBook() {
    setSelectedBook(null)
    setBookQuery('')
    setBookOptions([])
    setBookSearchError('')
    setBookDropdownOpen(false)

    setFilters((previous) => ({
      ...previous,
      bookTitle: '',
      bookId: ''
    }))
  }

  function handleSearch(event) {
    event.preventDefault()

    const nextFilters = { ...filters }
    setSearchFilters(nextFilters)
    loadMembers(0, nextFilters)
  }

  function resetSearch() {
    const emptyFilters = { ...EMPTY_FILTERS }

    setFilters(emptyFilters)
    setSearchFilters(emptyFilters)
    setBookQuery('')
    setSelectedBook(null)
    setBookOptions([])
    setBookSearchError('')
    setBookDropdownOpen(false)

    loadMembers(0, emptyFilters)
  }

  function openCreateForm() {
    if (!canCreate) {
      notify('Bạn không có quyền thêm thành viên.', 'error')
      return
    }

    setEditingMember(null)
    setShowForm(true)
  }

  function openEditForm(member) {
    if (!canUpdate) {
      notify('Bạn không có quyền sửa thành viên.', 'error')
      return
    }

    setEditingMember(member)
    setShowForm(true)
  }

  async function handleSave(memberData) {
    if (editingMember ? !canUpdate : !canCreate) {
      const message = editingMember
        ? 'Bạn không có quyền sửa thành viên.'
        : 'Bạn không có quyền thêm thành viên.'

      notify(message, 'error')
      throw new Error(message)
    }

    setSaving(true)

    try {
      if (editingMember) {
        await updateMember(editingMember.id, memberData)
        notify('Cập nhật thành viên thành công.', 'success')
      } else {
        await createMember(memberData)
        notify('Tạo thành viên thành công.', 'success')
      }

      setShowForm(false)
      setEditingMember(null)

      await loadMembers(page, searchFilters)
    } catch (error) {
      notify(
        error.message || 'Không thể lưu thành viên.',
        'error'
      )

      throw error
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(member) {
    if (!canDelete) {
      notify('Bạn không có quyền xóa thành viên.', 'error')
      return
    }

    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa thành viên "${member.fullName}" không?`
    )

    if (!confirmed) return

    try {
      await deleteMember(member.id)
      notify('Xóa thành viên thành công.', 'success')

      const nextPage =
        members.length === 1 && page > 0
          ? page - 1
          : page

      await loadMembers(nextPage, searchFilters)
    } catch (error) {
      notify(
        error.message || 'Không thể xóa thành viên.',
        'error'
      )
    }
  }

  async function loadTrash() {
    if (!canRead) {
      notify(
        'Bạn không có quyền xem danh sách thành viên.',
        'error'
      )
      return
    }

    setLoading(true)

    try {
      const result = await getDeletedMembers()

      setDeletedMembers(
        Array.isArray(result) ? result : []
      )
      setShowTrash(true)
      setShowForm(false)
      setEditingMember(null)
    } catch (error) {
      notify(
        error.message || 'Không thể tải thùng rác thành viên.',
        'error'
      )
    } finally {
      setLoading(false)
    }
  }

  async function handleRestore(member) {
    if (!canUpdate) {
      notify('Bạn không có quyền khôi phục thành viên.', 'error')
      return
    }

    const confirmed = window.confirm(
      `Bạn có muốn khôi phục thành viên "${member.fullName}" không?`
    )

    if (!confirmed) return

    try {
      await restoreMember(member.id)

      setDeletedMembers((current) =>
        current.filter((item) => item.id !== member.id)
      )

      notify('Khôi phục thành viên thành công.', 'success')
      await loadMembers(0, searchFilters)
    } catch (error) {
      notify(
        error.message || 'Không thể khôi phục thành viên.',
        'error'
      )
    }
  }

  async function toggleTrash() {
    if (showTrash) {
      setShowTrash(false)
      await loadMembers(0, searchFilters)
      return
    }

    await loadTrash()
  }

  if (permissionsLoading) {
    return (
      <section className="members-page">
        <div className="members-table-card members-empty">
          Đang xác minh quyền truy cập...
        </div>
      </section>
    )
  }

  if (
    permissionsError &&
    !isAdmin &&
    permissions.length === 0
  ) {
    return (
      <section className="members-page">
        <div className="members-table-card members-empty">
          Không thể xác minh quyền tài khoản. Vui lòng tải lại trang
          hoặc đăng nhập lại.
        </div>
      </section>
    )
  }

  return (
    <section className="members-page">
      <div className="members-page-header">
        <div>
          <h1>Quản lý thành viên</h1>
          <p>Tra cứu và quản lý thông tin độc giả thư viện.</p>
        </div>

        <div className="members-header-actions">
          {canRead && (
            <button
              type="button"
              onClick={toggleTrash}
              disabled={loading}
            >
              {loading
                ? 'Đang tải...'
                : showTrash
                  ? 'Quay lại danh sách'
                  : 'Thùng rác'}
            </button>
          )}

          {!showTrash && canExport && (
            <button
              type="button"
              className="member-btn-secondary"
              onClick={handleExportMembersCsv}
              disabled={loading || members.length === 0}
            >
              Xuất CSV
            </button>
          )}

          {!showTrash && canCreate && (
            <button
              type="button"
              onClick={openCreateForm}
            >
              + Thêm thành viên
            </button>
          )}
        </div>
      </div>

      {canRead && !showTrash && (
        <form
          className="members-filter"
          onSubmit={handleSearch}
        >
          <div className="members-filter-grid">
            <label>
              Họ tên
              <input
                name="name"
                value={filters.name}
                onChange={handleFilterChange}
                placeholder="Nhập tên thành viên"
              />
            </label>

            <label>
              Email
              <input
                name="email"
                type="email"
                value={filters.email}
                onChange={handleFilterChange}
                placeholder="Nhập email"
              />
            </label>

            <label>
              Sinh từ ngày
              <input
                name="birthFrom"
                type="date"
                value={filters.birthFrom}
                onChange={handleFilterChange}
              />
            </label>

            <label>
              Sinh đến ngày
              <input
                name="birthTo"
                type="date"
                value={filters.birthTo}
                onChange={handleFilterChange}
              />
            </label>

            <label>
              Xác thực email
              <select
                name="isVerified"
                value={filters.isVerified}
                onChange={handleFilterChange}
              >
                <option value="">Tất cả</option>
                <option value="true">Đã xác thực</option>
                <option value="false">Chưa xác thực</option>
              </select>
            </label>

            <label>
              Số điện thoại
              <input
                name="phoneNumber"
                type="text"
                value={filters.phoneNumber}
                onChange={handleFilterChange}
                placeholder="Nhập số điện thoại"
              />
            </label>

            <label>
              Địa chỉ
              <input
                name="address"
                type="text"
                value={filters.address}
                onChange={handleFilterChange}
                placeholder="Nhập địa chỉ"
              />
            </label>

            <label className="member-book-filter">
              Tên sách đang mượn

              <div className="member-book-combobox">
                <input
                  type="text"
                  value={bookQuery}
                  onChange={handleBookQueryChange}
                  onFocus={() => setBookDropdownOpen(true)}
                  onBlur={() => {
                    setTimeout(() => setBookDropdownOpen(false), 150)
                  }}
                  placeholder="Tìm theo tên, tác giả hoặc ISBN"
                  autoComplete="off"
                />

                {bookDropdownOpen && bookQuery.trim() && (
                  <div className="member-book-options">
                    {bookLoading ? (
                      <div className="member-user-loading">
                        Đang tìm sách...
                      </div>
                    ) : bookSearchError ? (
                      <div
                        className="member-user-option-empty member-book-search-error"
                        role="alert"
                      >
                        {bookSearchError}
                      </div>
                    ) : bookOptions.length > 0 ? (
                      bookOptions.map((book) => (
                        <button
                          key={book.id}
                          type="button"
                          className="member-book-option"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => selectBook(book)}
                        >
                          {book.coverImageUrl && (
                            <img
                              src={book.coverImageUrl}
                              alt=""
                              onError={(event) => {
                                event.currentTarget.style.display = 'none'
                              }}
                            />
                          )}

                          <span className="member-book-option-info">
                            <strong>{book.title}</strong>
                            <small>
                              {book.author || 'Chưa cập nhật tác giả'}
                              {' · ISBN: '}
                              {book.isbn || '—'}
                            </small>
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="member-user-option-empty">
                        Không tìm thấy sách đang được mượn phù hợp.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {selectedBook && (
                <small className="member-book-selected">
                  <span>Đã chọn: {selectedBook.title}</span>

                  <button
                    type="button"
                    className="member-user-clear"
                    onClick={clearSelectedBook}
                  >
                    Bỏ chọn
                  </button>
                </small>
              )}

              <small className="member-book-hint">
                Nhập tên sách, tác giả hoặc ISBN rồi chọn kết quả gợi ý.
              </small>
            </label>
          </div>

          <div className="members-filter-actions">
            <button type="submit" disabled={loading}>
              Tìm kiếm
            </button>

            <button
              type="button"
              className="member-btn-secondary"
              onClick={resetSearch}
            >
              Xóa bộ lọc
            </button>
          </div>
        </form>
      )}

      <div className="members-table-card">
        <div className="members-table-heading">
          <h2>
            {showTrash
              ? 'Thùng rác thành viên'
              : 'Danh sách thành viên'}
          </h2>

          <span>
            {showTrash
              ? `Đã xóa: ${deletedMembers.length}`
              : `Tổng cộng: ${totalElements}`}
          </span>
        </div>

        <div className="members-table-wrapper">
          <table className="members-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Họ và tên</th>
                <th>Email</th>
                <th>Ngày sinh</th>
                <th>Xác thực</th>
                <th>Thao tác</th>
              </tr>
            </thead>

            <tbody>
              {!canRead ? (
                <tr>
                  <td colSpan="6" className="members-empty">
                    Tài khoản không có quyền xem danh sách thành viên.
                    Bạn vẫn có thể thêm thành viên nếu được cấp quyền.
                  </td>
                </tr>
              ) : loading ? (
                <tr>
                  <td colSpan="6" className="members-empty">
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : showTrash ? (
                deletedMembers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="members-empty">
                      Thùng rác thành viên đang trống.
                    </td>
                  </tr>
                ) : deletedMembers.map((member) => (
                  <tr key={member.id}>
                    <td>{member.id}</td>
                    <td>{member.fullName}</td>
                    <td>{member.email || '—'}</td>
                    <td>{member.dateOfBirth || '—'}</td>
                    <td>
                      <span
                        className={
                          member.isVerified || member.verified
                            ? 'member-status member-status-verified'
                            : 'member-status member-status-unverified'
                        }
                      >
                        {member.isVerified || member.verified
                          ? 'Đã xác thực'
                          : 'Chưa xác thực'}
                      </span>
                    </td>
                    <td>
                      {canUpdate && (
                        <button
                          type="button"
                          className="member-btn-edit"
                          onClick={() => handleRestore(member)}
                        >
                          Khôi phục
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan="6" className="members-empty">
                    Không tìm thấy thành viên.
                  </td>
                </tr>
              ) : members.map((member) => (
                <tr key={member.id}>
                  <td>{member.id}</td>
                  <td>{member.fullName}</td>
                  <td>{member.email || '—'}</td>
                  <td>{member.dateOfBirth || '—'}</td>
                  <td>
                    <span
                      className={
                        member.isVerified || member.verified
                          ? 'member-status member-status-verified'
                          : 'member-status member-status-unverified'
                      }
                    >
                      {member.isVerified || member.verified
                        ? 'Đã xác thực'
                        : 'Chưa xác thực'}
                    </span>
                  </td>
                  <td>
                    <div className="member-row-actions">
                      {canUpdate && (
                        <button
                          type="button"
                          className="member-btn-edit"
                          onClick={() => openEditForm(member)}
                        >
                          Sửa
                        </button>
                      )}

                      {canDelete && (
                        <button
                          type="button"
                          className="member-btn-delete"
                          onClick={() => handleDelete(member)}
                        >
                          Xóa
                        </button>
                      )}

                      {!canUpdate && !canDelete && (
                        <span>Không có thao tác khả dụng</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {canRead && !showTrash && (
          <div className="members-pagination">
            <span>
              Trang {totalPages === 0 ? 0 : page + 1} / {totalPages}
            </span>

            <div>
              <button
                type="button"
                className="member-btn-secondary"
                disabled={loading || page <= 0}
                onClick={() => loadMembers(page - 1)}
              >
                Trước
              </button>

              <button
                type="button"
                className="member-btn-secondary"
                disabled={loading || page + 1 >= totalPages}
                onClick={() => loadMembers(page + 1)}
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {showForm && !showTrash &&
        (editingMember ? canUpdate : canCreate) && (
          <div
            className="member-modal-backdrop"
            onMouseDown={(event) => {
              if (
                event.target === event.currentTarget &&
                !saving
              ) {
                setShowForm(false)
              }
            }}
          >
            <div
              className="member-modal"
              role="dialog"
              aria-modal="true"
              aria-label={
                editingMember
                  ? 'Sửa thành viên'
                  : 'Thêm thành viên'
              }
            >
              <MemberForm
                member={editingMember}
                onSubmit={handleSave}
                onCancel={() => setShowForm(false)}
                isSaving={saving}
              />
            </div>
          </div>
        )}
    </section>
  )
}