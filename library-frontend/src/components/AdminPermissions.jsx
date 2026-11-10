import { useEffect, useState } from 'react'

const API_URL = 'http://localhost:8080'
const PAGE_SIZE = 8

// Danh mục đầy đủ 32 quyền đang được sử dụng trong hệ thống.
const PERMISSION_GROUPS = [
  {
    title: 'Quản lý sách',
    items: [
      ['BOOK_READ', 'Xem danh sách và chi tiết sách'],
      ['BOOK_CREATE', 'Thêm sách'],
      ['BOOK_UPDATE', 'Cập nhật thông tin sách'],
      ['BOOK_DELETE', 'Xóa sách'],
      ['BOOK_IMPORT', 'Nhập sách từ file CSV'],
    ],
  },
  {
    title: 'Quản lý thể loại',
    items: [
      ['CATEGORY_READ', 'Xem danh sách và chi tiết thể loại'],
      ['CATEGORY_CREATE', 'Thêm thể loại'],
      ['CATEGORY_UPDATE', 'Cập nhật thể loại'],
      ['CATEGORY_DELETE', 'Xóa thể loại'],
    ],
  },
  {
    title: 'Quản lý thành viên',
    items: [
      ['MEMBER_READ', 'Xem danh sách thành viên'],
      ['MEMBER_CREATE', 'Thêm thành viên'],
      ['MEMBER_UPDATE', 'Cập nhật thành viên'],
      ['MEMBER_DELETE', 'Xóa thành viên'],
      ['MEMBER_EXPORT', 'Xuất danh sách thành viên'],
    ],
  },
  {
    title: 'Quản lý mượn và trả sách',
    items: [
      ['BORROW_READ', 'Xem danh sách và chi tiết phiếu mượn'],
      ['BORROW_CREATE', 'Tạo lượt mượn sách'],
      ['BORROW_APPROVE', 'Duyệt yêu cầu mượn sách'],
      ['BORROW_REJECT', 'Từ chối yêu cầu mượn sách'],
      ['BORROW_HANDOVER', 'Xác nhận bàn giao sách'],
      ['BORROW_RETURN', 'Quyền trả sách cũ'],
      ['BORROW_CONFIRM_RETURN', 'Xác nhận nhận lại sách đã trả'],
      ['BORROW_CANCEL', 'Hủy yêu cầu mượn đang chờ xử lý'],
    ],
  },
  {
    title: 'Báo cáo và thống kê',
    items: [
      ['REPORT_READ', 'Xem báo cáo và thống kê'],
      ['REPORT_EXPORT', 'Xuất báo cáo và thống kê'],
    ],
  },
  {
    title: 'Quản lý nhóm quyền',
    items: [
      ['PERMISSION_GROUP_READ', 'Xem danh sách và chi tiết nhóm quyền'],
      ['PERMISSION_GROUP_CREATE', 'Tạo nhóm quyền'],
      ['PERMISSION_GROUP_UPDATE', 'Cập nhật nhóm quyền và thành viên nhóm'],
      ['PERMISSION_GROUP_DELETE', 'Xóa nhóm quyền'],
    ],
  },
  {
    title: 'Quản lý tài khoản',
    items: [
      ['ACCOUNT_CHANGE_PASSWORD', 'Đổi mật khẩu'],
      ['ACCOUNT_CHANGE_EMAIL', 'Đổi email'],
    ],
  },
  {
    title: 'Cấu hình hệ thống',
    items: [
      ['SYSTEM_CONFIG_READ', 'Xem cấu hình hệ thống'],
      ['SYSTEM_CONFIG_UPDATE', 'Cập nhật cấu hình hệ thống'],
    ],
  },
]

function AdminPermissions({ onToast }) {
  const [users, setUsers] = useState([])
  const [keyword, setKeyword] = useState('')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [userPage, setUserPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalUsers, setTotalUsers] = useState(0)

  const [selectedUser, setSelectedUser] = useState(null)
  const [permissions, setPermissions] = useState([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(false)
  const [savingPermission, setSavingPermission] = useState('')

  const getTokenHeaders = () => {
    const accessToken = localStorage.getItem('accessToken')
    const tokenType = localStorage.getItem('tokenType') || 'Bearer'

    if (!accessToken) {
      throw new Error(
        'Phiên đăng nhập không tồn tại. Vui lòng đăng nhập lại.'
      )
    }

    return {
      'Content-Type': 'application/json',
      Authorization: `${tokenType} ${accessToken}`,
    }
  }

  const readResponse = async (response) => {
    const text = await response.text()

    if (!text) return null

    try {
      return JSON.parse(text)
    } catch {
      return { message: text }
    }
  }

  const getErrorMessage = (response, data) => {
    if (response.status === 401) {
      return 'Phiên đăng nhập hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.'
    }

    if (response.status === 403) {
      return 'Bạn không có quyền thực hiện thao tác này.'
    }

    return (
      data?.message ||
      data?.error ||
      data?.detail ||
      `Yêu cầu thất bại (HTTP ${response.status}).`
    )
  }

  // Tải danh sách tài khoản đã xác thực email.
  const fetchUsers = async (page = 0, search = searchKeyword) => {
    setIsLoadingUsers(true)

    try {
      const params = new URLSearchParams({
        keyword: search.trim(),
        page: String(page),
        size: String(PAGE_SIZE),
      })

      const response = await fetch(
        `${API_URL}/api/admin/users?${params.toString()}`,
        {
          method: 'GET',
          headers: getTokenHeaders(),
        }
      )

      const data = await readResponse(response)

      if (!response.ok) {
        throw new Error(getErrorMessage(response, data))
      }

      if (!Array.isArray(data?.content)) {
        throw new Error(
          'API danh sách tài khoản không trả về dữ liệu phân trang hợp lệ.'
        )
      }

      // Bộ lọc dự phòng ở frontend.
      // Backend vẫn cần lọc isVerified=true trước khi phân trang.
      const verifiedUsers = data.content.filter(
        (user) => user.verified === true
      )

      setUsers(verifiedUsers)
      setUserPage(data.number ?? page)
      setTotalPages(data.totalPages ?? 0)
      setTotalUsers(data.totalElements ?? verifiedUsers.length)
    } catch (err) {
      onToast(
        'error',
        err instanceof TypeError
          ? 'Không thể kết nối Backend. Hãy kiểm tra Spring Boot và CORS.'
          : err.message
      )
    } finally {
      setIsLoadingUsers(false)
    }
  }

  // Tải danh sách lần đầu khi mở trang phân quyền.
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers(0, '')
    }, 0)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Tìm kiếm tài khoản theo họ tên hoặc email.
  const handleSearch = async (event) => {
    event.preventDefault()

    const search = keyword.trim()

    setSearchKeyword(search)
    setUserPage(0)
    setSelectedUser(null)
    setPermissions([])

    await fetchUsers(0, search)
  }

  // Chuyển trang danh sách tài khoản.
  const changePage = async (nextPage) => {
    if (nextPage < 0 || nextPage >= totalPages) return

    setSelectedUser(null)
    setPermissions([])

    await fetchUsers(nextPage)
  }

  // Chọn tài khoản và tải danh sách quyền.
  const selectUser = async (user) => {
    setSelectedUser(user)
    setPermissions([])
    setIsLoadingPermissions(true)

    try {
      const response = await fetch(
        `${API_URL}/api/admin/users/${encodeURIComponent(user.id)}/permissions`,
        {
          method: 'GET',
          headers: getTokenHeaders(),
        }
      )

      const data = await readResponse(response)

      if (!response.ok) {
        throw new Error(getErrorMessage(response, data))
      }

      if (!Array.isArray(data)) {
        throw new Error('API không trả về danh sách quyền hợp lệ.')
      }

      setPermissions(data)

      onToast(
        'success',
        `Đã tải quyền của ${user.fullName?.trim() || user.email}.`
      )
    } catch (err) {
      setPermissions([])

      onToast(
        'error',
        err instanceof TypeError
          ? 'Không thể kết nối Backend.'
          : err.message
      )
    } finally {
      setIsLoadingPermissions(false)
    }
  }

  // Cấp hoặc thu hồi quyền riêng của tài khoản.
  const updatePermission = async (permission, granted) => {
    if (!selectedUser || savingPermission) return

    setSavingPermission(permission.name)

    try {
      const response = await fetch(
        `${API_URL}/api/admin/users/${encodeURIComponent(selectedUser.id)}/permissions`,
        {
          method: 'PUT',
          headers: getTokenHeaders(),
          body: JSON.stringify({
            permissionId: permission.permissionId,
            granted,
          }),
        }
      )

      const data = await readResponse(response)

      if (!response.ok) {
        throw new Error(getErrorMessage(response, data))
      }

      setPermissions((current) =>
        current.map((item) =>
          item.permissionId === permission.permissionId
            ? {
                ...item,
                overrideGranted: granted,
                effectiveGranted: granted,
              }
            : item
        )
      )

      const description =
        PERMISSION_GROUPS
          .flatMap((group) => group.items)
          .find(([name]) => name === permission.name)?.[1] ||
        permission.name

      onToast(
        'success',
        `Đã ${granted ? 'cấp' : 'thu hồi'} quyền "${description}".`
      )
    } catch (err) {
      onToast(
        'error',
        err instanceof TypeError
          ? 'Không thể kết nối Backend.'
          : err.message
      )
    } finally {
      setSavingPermission('')
    }
  }

  const permissionMap = new Map(
    permissions.map((permission) => [permission.name, permission])
  )

  return (
    <section className="admin-permissions">
      <div className="admin-permissions-heading">
        <p className="eyebrow">ADMINISTRATION</p>
        <h2>Phân quyền theo chức năng</h2>
        <p>
          Tìm tài khoản đã xác thực email, chọn người dùng và điều chỉnh
          quyền truy cập theo từng chức năng.
        </p>
      </div>

      <form className="permission-search" onSubmit={handleSearch}>
        <label htmlFor="permission-user-search">
          Tìm tài khoản
        </label>

        <input
          id="permission-user-search"
          type="search"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="Nhập họ tên hoặc email..."
        />

        <button type="submit" disabled={isLoadingUsers}>
          {isLoadingUsers ? 'Đang tìm...' : 'Tìm kiếm'}
        </button>
      </form>

      <div className="permission-user-list">
        <div className="permission-user-list-heading">
          <h3>Danh sách tài khoản đã xác thực</h3>
          <span>{totalUsers} tài khoản</span>
        </div>

        {isLoadingUsers ? (
          <p role="status">Đang tải danh sách tài khoản...</p>
        ) : users.length === 0 ? (
          <p>Không tìm thấy tài khoản đã xác thực phù hợp.</p>
        ) : (
          <div className="permission-user-grid">
            {users.map((user) => {
              const isSelected = selectedUser?.id === user.id

              return (
                <button
                  key={user.id}
                  type="button"
                  className={`permission-user-card ${
                    isSelected ? 'selected' : ''
                  }`}
                  onClick={() => selectUser(user)}
                  disabled={isLoadingPermissions || Boolean(savingPermission)}
                >
                  <span className="permission-user-avatar">
                    {(user.fullName?.trim() || user.email || '?')
                      .charAt(0)
                      .toUpperCase()}
                  </span>

                  <span className="permission-user-info">
                    <strong>
                      {user.fullName?.trim() || 'Chưa cập nhật họ tên'}
                    </strong>
                    <small>{user.email}</small>
                    <small className="verified-label">
                      ✓ Đã xác thực email
                    </small>
                  </span>

                  <span className="permission-user-check">
                    {isSelected ? '✓ Đang chọn' : 'Chọn'}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        <div className="permission-pagination">
          <button
            type="button"
            onClick={() => changePage(userPage - 1)}
            disabled={isLoadingUsers || userPage <= 0}
          >
            ← Trang trước
          </button>

          <span>
            Trang {totalPages === 0 ? 0 : userPage + 1} / {totalPages}
          </span>

          <button
            type="button"
            onClick={() => changePage(userPage + 1)}
            disabled={isLoadingUsers || userPage + 1 >= totalPages}
          >
            Trang sau →
          </button>
        </div>
      </div>

      {selectedUser && (
        <div className="permission-user-summary">
          <span>Đang phân quyền cho:</span>
          <strong>
            {selectedUser.fullName?.trim() || 'Chưa cập nhật họ tên'}
          </strong>
          <span>{selectedUser.email}</span>
        </div>
      )}

      {isLoadingPermissions && (
        <p role="status">Đang tải quyền của tài khoản...</p>
      )}

      {selectedUser && !isLoadingPermissions && (
        permissions.length === 0 ? (
          <p>Không có dữ liệu quyền để hiển thị.</p>
        ) : (
          <div className="permission-groups">
            {PERMISSION_GROUPS.map((group) => (
              <section className="permission-group" key={group.title}>
                <h3>{group.title}</h3>

                <div className="permission-table-wrapper">
                  <table className="permission-table">
                    <thead>
                      <tr>
                        <th>Chức năng</th>
                        <th>Quyền từ Role</th>
                        <th>Quyền ghi đè</th>
                        <th>Quyền hiệu lực</th>
                        <th>Điều chỉnh</th>
                      </tr>
                    </thead>

                    <tbody>
                      {group.items.map(([name, description]) => {
                        const permission = permissionMap.get(name)

                        if (!permission) {
                          return (
                            <tr key={name}>
                              <td>
                                <strong>{description}</strong>
                              </td>
                              <td colSpan="4">
                                Backend chưa trả về quyền này.
                              </td>
                            </tr>
                          )
                        }

                        const isSaving = savingPermission === name

                        return (
                          <tr key={name}>
                            <td>
                              <strong>{description}</strong>
                            </td>

                            <td>
                              {permission.roleGranted ? 'Có' : 'Không'}
                            </td>

                            <td>
                              {permission.overrideGranted == null
                                ? 'Mặc định'
                                : permission.overrideGranted
                                  ? 'Cấp riêng'
                                  : 'Thu hồi riêng'}
                            </td>

                            <td>
                              <span
                                className={`permission-status ${
                                  permission.effectiveGranted
                                    ? 'permission-allowed'
                                    : 'permission-denied'
                                }`}
                              >
                                {permission.effectiveGranted
                                  ? 'Được phép'
                                  : 'Bị từ chối'}
                              </span>
                            </td>

                            <td>
                              <label className="permission-toggle">
                                <input
                                  type="checkbox"
                                  checked={Boolean(
                                    permission.effectiveGranted
                                  )}
                                  disabled={Boolean(savingPermission)}
                                  onChange={(event) =>
                                    updatePermission(
                                      permission,
                                      event.target.checked
                                    )
                                  }
                                />

                                <span>
                                  {isSaving
                                    ? 'Đang lưu...'
                                    : permission.effectiveGranted
                                      ? 'Thu hồi'
                                      : 'Cấp quyền'}
                                </span>
                              </label>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
          </div>
        )
      )}
    </section>
  )
}

export default AdminPermissions