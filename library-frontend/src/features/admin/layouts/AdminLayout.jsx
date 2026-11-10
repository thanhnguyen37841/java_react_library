import { useState } from 'react'
import '../../../styles/admin.css'
import '../../../styles/admin-books-refinement.css'
import '../../../styles/admin-refinement.css'

const navigation = [
  {
    title: 'TỔNG QUAN',
    items: [
      {
        label: 'Dashboard',
        path: '/admin',
        icon: '▦',
        adminOnly: true,
      },
    ],
  },
  {
    title: 'QUẢN LÝ THƯ VIỆN',
    items: [
      {
        label: 'Danh mục sách',
        path: '/admin/categories',
        icon: '▧',
        permissions: ['CATEGORY_READ'],
      },
      {
        label: 'Sách',
        path: '/admin/books',
        icon: '▤',
        permissions: ['BOOK_READ'],
      },
      {
        label: 'Sách điện tử',
        path: '/admin/ebooks',
        icon: '▧',
        permissions: ['BOOK_READ'],
      },
      {
        label: 'Thành viên',
        path: '/admin/members',
        icon: '♙',
        permissions: ['MEMBER_READ'],
      },
      {
        label: 'Mượn / Trả sách',
        path: '/admin/borrows',
        icon: '⇄',
        permissions: ['BORROW_READ'],
      },
    ],
  },
  {
    title: 'HỆ THỐNG',
    items: [
      {
        label: 'Phân quyền',
        path: '/admin/permissions',
        icon: '♧',
        adminOnly: true,
      },
      {
        label: 'Nhóm quyền',
        path: '/admin/permission-groups',
        icon: '♙',
        permissions: [
          'PERMISSION_GROUP_READ',
          'PERMISSION_GROUP_CREATE',
          'PERMISSION_GROUP_UPDATE',
          'PERMISSION_GROUP_DELETE',
        ],
      },
      {
        label: 'Cài đặt',
        path: '/admin/settings',
        icon: '⚙',
        adminOnly: true,
      },
    ],
  },
]

const pageTitles = {
  '/admin': 'Dashboard',
  '/admin/categories': 'Quản lý danh mục sách',
  '/admin/books': 'Quản lý sách',
  '/admin/ebooks': 'Quản lý sách điện tử',
  '/admin/members': 'Quản lý thành viên',
  '/admin/borrows': 'Quản lý mượn / trả sách',
  '/admin/permissions': 'Phân quyền',
  '/admin/permission-groups': 'Quản lý nhóm quyền',
  '/admin/settings': 'Cài đặt hệ thống',
}

function canSeeItem(item, isAdmin, permissions) {
  if (isAdmin) return true
  if (item.adminOnly) return false

  if (
    !Array.isArray(permissions) ||
    !Array.isArray(item.permissions)
  ) {
    return false
  }

  return item.permissions.some((permission) =>
    permissions.includes(permission)
  )
}

function AdminLayout({
  children,
  route = '/admin',
  currentPath,
  email,
  onNavigate,
  onLogout,
  isAdmin = false,
  isStaff = false,
  permissions = [],
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const activePath = currentPath ?? route
  const pageTitle = pageTitles[activePath] || 'Quản trị hệ thống'
  const accountEmail = email || 'Tài khoản'
  const avatarLetter = accountEmail.charAt(0).toUpperCase()

  // App hiện tại chưa truyền isStaff xuống layout ở mọi luồng.
  // Với tài khoản không phải Admin nhưng có quyền nghiệp vụ,
  // hiển thị đúng nhãn Nhân viên thay vì Người dùng.
  const accountLabel = isAdmin
    ? 'Quản trị viên'
    : isStaff || permissions.length > 0
      ? 'Nhân viên'
      : 'Người dùng'

  const visibleNavigation = navigation
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        canSeeItem(item, isAdmin, permissions)
      ),
    }))
    .filter((group) => group.items.length > 0)

  function goTo(path) {
    if (typeof onNavigate === 'function') {
      onNavigate(path)
    }

    setSidebarOpen(false)
  }

  return (
    <div className="admin-shell">
      {sidebarOpen && (
        <button
          type="button"
          className="admin-sidebar-backdrop"
          aria-label="Đóng menu"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`admin-sidebar ${sidebarOpen ? 'is-open' : ''}`}
        aria-label="Thanh điều hướng quản trị"
      >
        <button
          type="button"
          className="admin-brand"
          onClick={() =>
            goTo(
              isAdmin
                ? '/admin'
                : visibleNavigation[0]?.items[0]?.path || '/'
            )
          }
          aria-label="Về trang quản trị"
        >
          <span className="admin-brand-mark">L</span>

          <span className="admin-brand-text">
            <strong>LIBRARY</strong>
            <span>ADMINISTRATION</span>
          </span>
        </button>

        <nav
          className="admin-navigation"
          aria-label="Điều hướng quản trị"
        >
          {visibleNavigation.map((group) => (
            <div className="admin-nav-group" key={group.title}>
              <p className="admin-nav-heading">{group.title}</p>

              {group.items.map((item) => {
                const active =
                  item.path === '/admin'
                    ? activePath === '/admin'
                    : activePath === item.path ||
                      activePath.startsWith(`${item.path}/`)

                return (
                  <button
                    key={item.path}
                    type="button"
                    className={`admin-nav-item ${active ? 'active' : ''}`}
                    onClick={() => goTo(item.path)}
                    aria-current={active ? 'page' : undefined}
                  >
                    <span
                      className="admin-nav-icon"
                      aria-hidden="true"
                    >
                      {item.icon}
                    </span>

                    <span>{item.label}</span>
                  </button>
                )
              })}
            </div>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-profile-avatar" aria-hidden="true">
            {avatarLetter}
          </div>

          <div className="admin-profile-info">
            <strong>{accountLabel}</strong>
            <span title={accountEmail}>{accountEmail}</span>
          </div>

          <button
            type="button"
            className="admin-logout-button"
            onClick={onLogout}
            title="Đăng xuất"
            aria-label="Đăng xuất"
          >
            <span aria-hidden="true">↪</span>
          </button>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <button
            type="button"
            className="admin-menu-toggle"
            onClick={() => setSidebarOpen(true)}
            aria-label="Mở menu điều hướng"
          >
            ☰
          </button>

          <div className="admin-breadcrumb">
            <span>Library</span>
            <span className="admin-breadcrumb-separator">/</span>
            <strong>{pageTitle}</strong>
          </div>

          <div className="admin-topbar-right">
            <span className="admin-online-indicator" />
            <span>Hệ thống quản lý thư viện</span>
            <span className="admin-topbar-divider" />
            <span
              className="admin-topbar-email"
              title={accountEmail}
            >
              {accountEmail}
            </span>
          </div>
        </header>

        <main className="admin-content">{children}</main>
      </div>
    </div>
  )
}

export default AdminLayout