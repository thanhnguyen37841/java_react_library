
import { useCallback, useEffect, useState } from 'react'

import MembersPage from './features/admin/members/MembersPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import VerifyEmailPage from './pages/VerifyEmailPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import ChangePasswordPage from './pages/ChangePasswordPage'
import ChangeEmailPage from './pages/ChangeEmailPage'

import BooksPage from './features/admin/books/BooksPage'
import BorrowsPage from './features/admin/borrows/BorrowsPage'
import EbooksManagementPage from './features/admin/books/EbooksManagementPage'
import CategoriesPage from './features/admin/categories/CategoriesPage'
import Toast from './components/Toast'
import AdminPermissions from './components/AdminPermissions'
import UserMyBooksPage from './features/user/books/UserMyBooksPage'

import AdminLayout from './features/admin/layouts/AdminLayout'
import AdminDashboard from './features/admin/dashboard/AdminDashboard'
import AdminPlaceholder from './features/admin/shared/AdminPlaceholder'
import PermissionGroupsPage from './features/admin/permissions/PermissionGroupsPage'

import UserLayout from './features/user/layouts/UserLayout'
import UserHomePage from './features/user/home/UserHomePage'
import UserBooksPage from './features/user/books/UserBooksPage'
import UserBookDetailPage from './features/user/books/UserBookDetailPage'
import EbooksPage from './features/user/books/EbooksPage'
import UserProfilePage from './features/user/profile/UserProfilePage'
import ProfileCompletionGate from './features/user/profile/ProfileCompletionGate'

import { getBooks } from './services/bookService'
import { fetchWithAuth, refreshAccessToken } from './services/authSession'
import { getCurrentUserPermissions } from './services/adminService'

import SystemSettingsPage from './features/admin/settings/SystemSettingsPage'

import './styles/App.css'

const API_URL = 'http://localhost:8080'

// Lấy quyền hiện tại. fetchWithAuth tự refresh access token khi cần.
async function getCurrentPermissionsWithRefresh() {
  try {
    return await getCurrentUserPermissions()
  } catch (error) {
    if (error?.status !== 401 && error?.authExpired !== true) {
      throw error
    }

    if (!localStorage.getItem('refreshToken')) {
      throw error
    }

    await refreshAccessToken()
    return getCurrentUserPermissions()
  }
}

const ADMIN_ONLY_ROUTES = [
  '/admin/permissions',
  '/admin/permission-groups',
  '/admin/settings',
]

const ROUTE_PERMISSIONS = {
  '/admin/books': [
    'BOOK_READ',
    'BOOK_CREATE',
    'BOOK_UPDATE',
    'BOOK_DELETE',
    'BOOK_IMPORT',
  ],
  '/admin/ebooks': ['BOOK_READ', 'BOOK_UPDATE'],
  '/admin/members': [
    'MEMBER_READ',
    'MEMBER_CREATE',
    'MEMBER_UPDATE',
    'MEMBER_DELETE',
  ],
  '/admin/borrows': [
    'BORROW_READ',
    'BORROW_CREATE',
    'BORROW_APPROVE',
    'BORROW_REJECT',
    'BORROW_HANDOVER',
    'BORROW_RETURN',
  ],
  '/admin/categories': [
    'CATEGORY_READ',
    'CATEGORY_CREATE',
    'CATEGORY_UPDATE',
    'CATEGORY_DELETE',
  ],
}

/**
 * Kiểm tra quyền truy cập trang quản trị.
 *
 * ADMIN:
 *   Được truy cập khu vực quản trị.
 *
 * STAFF:
 *   Chỉ được truy cập nếu có quyền nghiệp vụ phù hợp.
 *   Không được truy cập các trang chỉ dành cho ADMIN.
 *
 * USER thông thường:
 *   Không được truy cập khu vực quản trị,
 *   kể cả khi có quyền nghiệp vụ.
 */
function canAccessAdminRoute(path, isAdmin, isStaff, permissions) {
  if (isAdmin) return true

  // Không phải STAFF thì tuyệt đối không được vào Admin.
  if (!isStaff) return false

  // Các trang quản lý phân quyền và cấu hình chỉ dành cho ADMIN.
  if (ADMIN_ONLY_ROUTES.includes(path)) return false

  // STAFF chỉ vào Dashboard nếu có ít nhất một quyền nghiệp vụ.
  if (path === '/admin' || path === '/admin/') {
      const allBusinessPermissions = [
    ...Object.values(ROUTE_PERMISSIONS).flat(),
    'REPORT_READ',
  ]

    return permissions.some((permission) =>
      allBusinessPermissions.includes(permission)
    )
  }

  const requiredPermissions = ROUTE_PERMISSIONS[path]

  return Boolean(
    requiredPermissions &&
      requiredPermissions.some((permission) =>
        permissions.includes(permission)
      )
  )
}

function App() {
  const [route, setRoute] = useState(window.location.pathname)

  const [email, setEmail] = useState(
    localStorage.getItem('accountEmail') || ''
  )
  const [password, setPassword] = useState('')

  // Chỉ chuyển sang trạng thái đăng nhập sau khi backend khôi phục phiên.
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  const [bookFilters, setBookFilters] = useState({
    categoryId: 'all',
    stockStatus: 'ALL',
    sortBy: 'title',
    sortDir: 'asc',
  })
  // Chỉ render route được bảo vệ sau khi đã khôi phục/xác minh phiên.
  const [isAuthReady, setIsAuthReady] = useState(
    !localStorage.getItem('accessToken') &&
      !localStorage.getItem('refreshToken')
  )

  const [isAdmin, setIsAdmin] = useState(false)

  // Phân biệt STAFF với USER thông thường.
  const [isStaff, setIsStaff] = useState(false)

  const [isAdminChecking, setIsAdminChecking] = useState(false)
  const [effectivePermissions, setEffectivePermissions] = useState([])

  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [loginError, setLoginError] = useState('')

  // Phiên bị từ chối và đang chờ người dùng đóng thông báo.
  const [pendingSessionExpiry, setPendingSessionExpiry] = useState(false)

  const [toast, setToast] = useState({
    message: '',
    type: 'info',
  })

  const [books, setBooks] = useState([])
  const [currentPage, setCurrentPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)

  const [keyword, setKeyword] = useState('')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [isBooksLoading, setIsBooksLoading] = useState(false)
  const [booksError, setBooksError] = useState('')

  const [showAdminPermissions, setShowAdminPermissions] = useState(false)

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type })
  }, [])

  // Điều hướng và giữ query string/hash.
  const navigate = useCallback((path) => {
    const target = new URL(path, window.location.origin)

    const nextPath = target.pathname + target.search + target.hash

    const currentPath =
      window.location.pathname +
      window.location.search +
      window.location.hash

    if (currentPath !== nextPath) {
      window.history.pushState({}, '', nextPath)
    }

    setRoute(target.pathname)
  }, [])

  useEffect(() => {
    function handlePopState() {
      setRoute(window.location.pathname)
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  // Xóa toàn bộ phiên đăng nhập và dữ liệu trạng thái liên quan.
  const clearSession = useCallback(() => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('tokenType')
    localStorage.removeItem('accountEmail')

    setIsLoggedIn(false)
    setIsAdmin(false)
    setIsStaff(false)
    setIsAdminChecking(false)
    setEffectivePermissions([])

    setEmail('')
    setPassword('')
    setLoginError('')

    setBooks([])
    setCurrentPage(0)
    setTotalPages(0)
    setTotalElements(0)

    setKeyword('')
    setSearchKeyword('')
    setIsBooksLoading(false)
    setBooksError('')

    setShowAdminPermissions(false)
    setPendingSessionExpiry(false)
  }, [])

  // Khi authSession phát hiện phiên không còn hợp lệ,
  // hiển thị thông báo trước khi chuyển về trang đăng nhập.
  useEffect(() => {
    function handleAuthLogout() {
      setPendingSessionExpiry(true)

      setToast({
        message:
          'Phiên đăng nhập đã được sử dụng trên thiết bị khác hoặc không còn hợp lệ. Vui lòng đóng thông báo để đăng nhập lại.',
        type: 'error',
      })
    }

    window.addEventListener('auth:logout', handleAuthLogout)

    return () => {
      window.removeEventListener('auth:logout', handleAuthLogout)
    }
  }, [])

  // Chỉ đăng xuất khỏi giao diện sau khi người dùng đóng thông báo.
  const handleToastClose = useCallback(() => {
    if (pendingSessionExpiry) {
      clearSession()
      setToast({ message: '', type: 'info' })
      navigate('/login')
      return
    }

    setToast({ message: '', type: 'info' })
  }, [pendingSessionExpiry, clearSession, navigate])

  // Kiểm tra phiên định kỳ để phát hiện phiên bị thu hồi.
  useEffect(() => {
    if (!isAuthReady || !isLoggedIn || pendingSessionExpiry) {
      return
    }

    let cancelled = false
    let checking = false

    async function checkCurrentSession() {
      if (checking || cancelled) return

      checking = true

      try {
        const response = await fetchWithAuth(
          `${API_URL}/api/borrows/my`,
          {
            method: 'GET',
            headers: {
              Accept: 'application/json',
            },
          }
        )

        if (response.status === 401 && !cancelled) {
          window.dispatchEvent(new Event('auth:logout'))
        }
      } catch (error) {
        if (
          error?.authExpired &&
          !cancelled &&
          !localStorage.getItem('accessToken') &&
          !localStorage.getItem('refreshToken')
        ) {
          window.dispatchEvent(new Event('auth:logout'))
        }

        // Lỗi mạng tạm thời không đồng nghĩa phiên đã bị thu hồi.
      } finally {
        checking = false
      }
    }

    const intervalId = window.setInterval(checkCurrentSession, 5000)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [isAuthReady, isLoggedIn, pendingSessionExpiry])

  // Khôi phục phiên khi tải lại trang.
  useEffect(() => {
    let cancelled = false

    async function restoreSession() {
      const accessToken = localStorage.getItem('accessToken')
      const refreshToken = localStorage.getItem('refreshToken')

      if (!refreshToken) {
        if (accessToken) {
          clearSession()
        } else {
          setIsLoggedIn(false)
        }

        setIsAuthReady(true)
        return
      }

      try {
        const response = await fetchWithAuth(
          `${API_URL}/api/borrows/my`,
          {
            method: 'GET',
            headers: {
              Accept: 'application/json',
            },
          }
        )

        if (!response.ok) {
          const error = new Error(
            `Không thể xác minh phiên đăng nhập (HTTP ${response.status}).`
          )
          error.status = response.status
          throw error
        }

        if (cancelled) return

        setEmail(localStorage.getItem('accountEmail') || '')
        setIsLoggedIn(true)
      } catch (error) {
        if (cancelled) return

        if (error?.authExpired) {
          setPendingSessionExpiry(true)

          setToast({
            message:
              'Phiên đăng nhập không còn hợp lệ. Đóng thông báo để quay về trang đăng nhập.',
            type: 'error',
          })
        } else {
          setIsLoggedIn(false)

          showToast(
            'Chưa thể xác minh phiên đăng nhập. Kiểm tra Backend rồi tải lại trang.',
            'warning'
          )
        }
      } finally {
        if (!cancelled) {
          setIsAuthReady(true)
        }
      }
    }

    restoreSession()

    return () => {
      cancelled = true
    }
  }, [clearSession, showToast])

  // Chặn URL riêng tư nếu chưa khôi phục được phiên.
  useEffect(() => {
    if (!isAuthReady || isLoggedIn || pendingSessionExpiry) {
      return
    }

    const privateRoutes = [
      '/ebooks',
      '/my-books',
      '/profile',
      '/change-password',
      '/change-email',
    ]

    if (
      route.startsWith('/admin') ||
      privateRoutes.includes(route)
    ) {
      navigate('/login')
    }
  }, [
    route,
    isAuthReady,
    isLoggedIn,
    pendingSessionExpiry,
    navigate,
  ])

  // Tải danh sách sách cho trang Admin.
  const loadBooks = useCallback(
    async (
      page = 0,
      search = searchKeyword,
      filters = bookFilters,
    ) => {
      setIsBooksLoading(true)
      setBooksError('')

      try {
        const categoryId =
          filters.categoryId === 'all' ? '' : filters.categoryId

        const result = await getBooks(
          page,
          search,
          categoryId,
          {
            stockStatus: filters.stockStatus,
            isbnStatus: 'ALL',
            sortBy: filters.sortBy,
            sortDir: filters.sortDir,
          },
        )

        setBooks(result.books)
        setTotalPages(result.totalPages)
        setTotalElements(result.totalElements)
        setCurrentPage(result.page)
        setSearchKeyword(search)
      } catch (error) {
        const message =
          error.message || 'Không thể tải danh sách sách.'

        setBooksError(message)
        showToast(message, 'error')
      } finally {
        setIsBooksLoading(false)
      }
    },
    [bookFilters, searchKeyword, showToast],
  )

  // Tự tải sách khi truy cập trang quản lý sách.
  useEffect(() => {
    if (route !== '/admin/books') return

    loadBooks(0, searchKeyword, bookFilters)
    // Chỉ chạy khi đường dẫn thay đổi; các thao tác tìm kiếm,
    // lọc và phân trang được xử lý qua callback của BooksPage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route])

  // Xác minh vai trò và quyền mỗi khi truy cập khu vực quản trị.
  useEffect(() => {
    let cancelled = false

    async function verifyAdminAccess() {
      if (!isAuthReady || !route.startsWith('/admin')) return

      const token = localStorage.getItem('accessToken')
      const refreshToken = localStorage.getItem('refreshToken')

      if (!token && !refreshToken) {
        clearSession()
        navigate('/login')
        showToast('Vui lòng đăng nhập để truy cập trang quản trị.', 'error')
        return
      }

      setIsAdminChecking(true)

      try {
        const account = await getCurrentPermissionsWithRefresh()
        if (cancelled) return

        const permissions = Array.isArray(account.permissions)
          ? account.permissions
          : []

        const admin = account.admin === true
        const staff = !admin && account.staff === true

        setIsAdmin(admin)
        setIsStaff(staff)
        setEffectivePermissions(permissions)

        if (!canAccessAdminRoute(route, admin, staff, permissions)) {
          let firstAllowedRoute = null

          if (admin) {
            firstAllowedRoute = '/admin'
          } else if (staff) {
            firstAllowedRoute = Object.keys(ROUTE_PERMISSIONS).find(
              (path) =>
                canAccessAdminRoute(
                  path,
                  false,
                  true,
                  permissions
                )
            )
          }

          if (firstAllowedRoute) {
            navigate(firstAllowedRoute)
            showToast(
              'Bạn không có quyền truy cập trang này. Đã chuyển đến trang được cấp quyền.',
              'warning'
            )
          } else {
            // USER thông thường không được tự chuyển vào Admin
            // chỉ vì tài khoản có một quyền nghiệp vụ.
            navigate('/')
            showToast(
              staff
                ? 'Nhân viên chưa được cấp quyền truy cập trang quản trị nào.'
                : 'Tài khoản không thuộc nhóm STAFF và không có quyền truy cập Admin.',
              'warning'
            )
          }
        }
      } catch (error) {
        if (cancelled) return

        setIsAdmin(false)
        setIsStaff(false)
        setEffectivePermissions([])

        showToast(
          error.message || 'Không thể tải quyền tài khoản.',
          'error'
        )

        if (
          error.authExpired ||
          error.status === 401 ||
          !localStorage.getItem('refreshToken')
        ) {
          navigate('/login')
        } else {
          navigate('/')
        }
      } finally {
        if (!cancelled) setIsAdminChecking(false)
      }
    }

    verifyAdminAccess()

    return () => {
      cancelled = true
    }
  }, [
    route,
    isLoggedIn,
    isAuthReady,
    clearSession,
    navigate,
    showToast,
  ])

  // Chỉ ADMIN và STAFF mới được tự chuyển từ trang chủ vào Admin.
  useEffect(() => {
    let cancelled = false

    async function redirectStaffFromHome() {
      if (!isAuthReady || route !== '/' || !isLoggedIn) return

      if (
        !localStorage.getItem('accessToken') &&
        !localStorage.getItem('refreshToken')
      ) {
        return
      }

      try {
        const account = await getCurrentPermissionsWithRefresh()
        if (cancelled) return

        const permissions = Array.isArray(account.permissions)
          ? account.permissions
          : []

        const admin = account.admin === true
        const staff = !admin && account.staff === true

        setIsAdmin(admin)
        setIsStaff(staff)
        setEffectivePermissions(permissions)

        if (admin) {
          navigate('/admin')
          return
        }

        // USER không thuộc STAFF luôn ở giao diện người dùng.
        if (!staff) {
          return
        }

        const firstAllowedRoute = Object.keys(ROUTE_PERMISSIONS).find(
          (path) =>
            canAccessAdminRoute(
              path,
              false,
              true,
              permissions
            )
        )

        if (firstAllowedRoute) {
          navigate(firstAllowedRoute)
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Không thể tải quyền tài khoản:', error)
        }
      }
    }

    redirectStaffFromHome()

    return () => {
      cancelled = true
    }
  }, [route, isLoggedIn, isAuthReady, navigate])

  // Đăng nhập.
  async function handleLogin(event) {
    event.preventDefault()

    if (isLoggingIn) return

    setLoginError('')
    setIsLoggingIn(true)

    try {
      const normalizedEmail = email.trim()

      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          email: normalizedEmail,
          password,
        }),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Email hoặc mật khẩu không chính xác.')
        }

        throw new Error(
          data?.message ||
            data?.error ||
            `Đăng nhập thất bại (HTTP ${response.status}).`
        )
      }

      if (!data?.accessToken || !data?.refreshToken) {
        throw new Error(
          'Backend không trả về đầy đủ accessToken và refreshToken.'
        )
      }

      localStorage.setItem('accessToken', data.accessToken)
      localStorage.setItem(
        'tokenType',
        data.tokenType || 'Bearer'
      )
      localStorage.setItem('accountEmail', normalizedEmail)
      localStorage.setItem('refreshToken', data.refreshToken)

      setEmail(normalizedEmail)
      setPassword('')
      setIsLoggedIn(true)

      try {
        const account = await getCurrentPermissionsWithRefresh()

        const permissions = Array.isArray(account.permissions)
          ? account.permissions
          : []

        const admin = account.admin === true
        const staff = !admin && account.staff === true

        setIsAdmin(admin)
        setIsStaff(staff)
        setEffectivePermissions(permissions)

        if (admin) {
          navigate('/admin')
          showToast('Đăng nhập thành công với quyền Admin.', 'success')
        } else if (staff) {
          const firstAllowedRoute = Object.keys(ROUTE_PERMISSIONS).find(
            (path) =>
              canAccessAdminRoute(
                path,
                false,
                true,
                permissions
              )
          )

          if (firstAllowedRoute) {
            navigate(firstAllowedRoute)
            showToast(
              'Đăng nhập thành công với quyền nhân viên.',
              'success'
            )
          } else {
            navigate('/')
            showToast(
              'Đăng nhập thành công nhưng tài khoản STAFF chưa được cấp quyền nghiệp vụ.',
              'warning'
            )
            await loadBooks(0, '')
          }
        } else {
          // USER thông thường luôn vào giao diện người dùng.
          setIsAdmin(false)
          setIsStaff(false)
          navigate('/')
          showToast('Đăng nhập thành công.', 'success')
          await loadBooks(0, '')
        }
      } catch (error) {
        if (error.authExpired || error.status === 401) {
          clearSession()
          navigate('/login')
          setLoginError(
            'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.'
          )
          return
        }

        // Không tự cấp quyền quản trị khi API quyền gặp lỗi.
        setIsAdmin(false)
        setIsStaff(false)
        setEffectivePermissions([])
        navigate('/')

        showToast(
          'Đăng nhập thành công nhưng chưa thể tải quyền tài khoản.',
          'warning'
        )

        await loadBooks(0, '')
      }
    } catch (error) {
      setLoginError(
        error.message || 'Không thể kết nối Backend. Vui lòng thử lại.'
      )
    } finally {
      setIsLoggingIn(false)
    }
  }

  // Đăng xuất: gửi yêu cầu thu hồi phiên hiện tại đến Backend.
  async function handleLogout() {
    const token = localStorage.getItem('accessToken')
    const refreshToken = localStorage.getItem('refreshToken')
    const tokenType = localStorage.getItem('tokenType') || 'Bearer'

    let message = 'Bạn đã đăng xuất thành công.'
    let type = 'success'

    try {
      if (token || refreshToken) {
        const response = await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            ...(token
              ? { Authorization: `${tokenType} ${token}` }
              : {}),
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({ refreshToken }),
        })

        if (!response.ok) {
          message =
            'Đã đăng xuất khỏi giao diện, nhưng Backend chưa xác nhận yêu cầu.'
          type = 'warning'
        }
      }
    } catch {
      message =
        'Đã đăng xuất khỏi giao diện, nhưng không thể kết nối Backend.'
      type = 'warning'
    } finally {
      clearSession()
      navigate('/')
      showToast(message, type)
    }
  }

  function handleRegisterSuccess() {
    navigate('/verify-email')
  }

  function handleAuthSuccess(message) {
    navigate('/login')
    showToast(message || 'Thao tác thành công.', 'success')
  }

  // Các trang đăng nhập, đăng ký và xác thực tài khoản.
  function renderAuthPage() {
    if (route === '/register') {
      return (
        <RegisterPage
          onNavigate={navigate}
          onRegisterSuccess={handleRegisterSuccess}
          onToast={showToast}
        />
      )
    }

    if (route === '/verify-email') {
      return (
        <VerifyEmailPage
          onNavigate={navigate}
          onSuccess={handleAuthSuccess}
          onToast={showToast}
        />
      )
    }

    if (route === '/forgot-password') {
      return (
        <ForgotPasswordPage
          onNavigate={navigate}
          onToast={showToast}
        />
      )
    }

    if (route === '/reset-password') {
      return (
        <ResetPasswordPage
          onNavigate={navigate}
          onSuccess={handleAuthSuccess}
          onToast={showToast}
        />
      )
    }

    if (route === '/change-password') {
      return (
        <ChangePasswordPage
          onBack={() => navigate('/')}
          onNavigate={navigate}
          onSuccess={handleAuthSuccess}
          onToast={showToast}
        />
      )
    }

    if (route === '/change-email') {
      return (
        <ChangeEmailPage
          onBack={() => navigate('/')}
          onNavigate={navigate}
          onSuccess={handleAuthSuccess}
          onToast={showToast}
        />
      )
    }

    return (
      <LoginPage
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        isLoading={isLoggingIn}
        loginError={loginError}
        onSubmit={handleLogin}
        onNavigate={navigate}
        onToast={showToast}
        onClearLoginError={() => setLoginError('')}
      />
    )
  }

  // Khu vực Admin: ADMIN và STAFF được phép vào theo quyền.
  function renderAdminPage() {
    if (!isLoggedIn) {
      return renderAuthPage()
    }

    if (isAdminChecking) {
      return (
        <main className="admin-auth-checking">
          <div className="admin-loading-spinner" />
          <p>Đang xác minh quyền quản trị...</p>
        </main>
      )
    }

    if (!isAdmin && !isStaff) {
      return (
        <main className="admin-auth-checking">
          <p>
            Tài khoản không thuộc nhóm STAFF và không có quyền truy cập Admin.
          </p>
          <button
            type="button"
            onClick={() => navigate('/')}
          >
            Quay về trang chính
          </button>
        </main>
      )
    }

    if (
      !canAccessAdminRoute(
        route,
        isAdmin,
        isStaff,
        effectivePermissions
      )
    ) {
      return (
        <main className="admin-auth-checking">
          <p>Tài khoản không có quyền truy cập chức năng này.</p>
          <button
            type="button"
            onClick={() => navigate('/')}
          >
            Quay về trang chính
          </button>
        </main>
      )
    }

    let adminPage

    if (route === '/admin' || route === '/admin/') {
      adminPage = (
          <AdminDashboard
          email={email}
          onNavigate={navigate}
          permissions={effectivePermissions}
          isAdmin={isAdmin}
        />
      )
    } else if (route === '/admin/categories') {
        adminPage = (
          <CategoriesPage
            onToast={showToast}
            permissions={effectivePermissions}
            isAdmin={isAdmin}
          />
        )
    }else if (route === '/admin/books') {
      adminPage = (
        <BooksPage
          books={books}
          page={currentPage}
          totalPages={totalPages}
          totalElements={totalElements}
          keyword={searchKeyword}
          searchInput={keyword}
          setSearchInput={setKeyword}
          isBooksLoading={isBooksLoading}
          error={booksError}
          filters={bookFilters}
          onFiltersChange={(nextFilters) => {
            setBookFilters(nextFilters)
            loadBooks(0, searchKeyword, nextFilters)
          }}
          onSearch={(event) => {
            event.preventDefault()
            loadBooks(0, keyword, bookFilters)
          }}
          onLoadBooks={(page) => {
            loadBooks(page, searchKeyword, bookFilters)
          }}
          permissions={effectivePermissions}
          isAdmin={isAdmin}
        />
      )
    } else if (route === '/admin/permissions') {
      adminPage = <AdminPermissions onToast={showToast} />
    } else if (route === '/admin/permission-groups') {
        adminPage = (
        <PermissionGroupsPage
          onToast={showToast}
          isAdmin={isAdmin}
          permissions={effectivePermissions}
        />
      )
    } else if (route === '/admin/members') {
      adminPage = (
        <MembersPage
          onToast={showToast}
          permissions={effectivePermissions}
          isAdmin={isAdmin}
        />
      )
    } else if (route === '/admin/borrows') {
          adminPage = (
        <BorrowsPage
          permissions={effectivePermissions}
          isAdmin={isAdmin}
        />
      )
    } else if (route === '/admin/ebooks') {
      adminPage = <EbooksManagementPage />
    } else if (route === '/admin/settings') {
      adminPage = (
        <SystemSettingsPage onToast={showToast} />
      )
    } else {
      adminPage = (
        <AdminPlaceholder
          title="Không tìm thấy trang quản trị"
          description="Đường dẫn Admin không tồn tại."
        />
      )
    }

    return (
      <AdminLayout
        route={route}
        email={email}
        onNavigate={navigate}
        onLogout={handleLogout}
        onChangePassword={() => navigate('/change-password')}
        onChangeEmail={() => navigate('/change-email')}
        permissions={effectivePermissions}
        isAdmin={isAdmin}
        currentPath={route}
      >
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={handleToastClose}
        />

        {adminPage}
      </AdminLayout>
    )
  }

  // Không hiển thị trang riêng tư trước khi Backend xác minh phiên.
  const protectedRoute =
    route.startsWith('/admin') ||
    [
      '/ebooks',
      '/my-books',
      '/profile',
      '/change-password',
      '/change-email',
    ].includes(route)

  if (
    !isAuthReady &&
    (protectedRoute || route === '/login')
  ) {
    return (
      <main className="admin-auth-checking">
        <div className="admin-loading-spinner" />
        <p>Đang khôi phục phiên đăng nhập...</p>
      </main>
    )
  }

  // Các route Admin luôn được xử lý riêng.
  if (route.startsWith('/admin')) {
    return renderAdminPage()
  }

  // Chặn truy cập trực tiếp trang đổi mật khẩu/email khi chưa đăng nhập.
  if (
    (route === '/change-password' || route === '/change-email') &&
    !isLoggedIn
  ) {
    return (
      <LoginPage
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        isLoading={isLoggingIn}
        loginError={loginError}
        onSubmit={handleLogin}
        onNavigate={navigate}
        onToast={showToast}
        onClearLoginError={() => setLoginError('')}
      />
    )
  }

  // Các trang xác thực.
  if (
    route === '/login' ||
    route === '/register' ||
    route === '/verify-email' ||
    route === '/forgot-password' ||
    route === '/reset-password' ||
    route === '/change-password' ||
    route === '/change-email'
  ) {
    return renderAuthPage()
  }

  // Người chưa đăng nhập vẫn xem được danh sách và chi tiết sách.
  const detailMatch = route.match(/^\/books\/([^/]+)\/?$/)

  let userPage

  if (route === '/' || route === '') {
    userPage = (
      <UserHomePage
        navigate={navigate}
        isLoggedIn={isLoggedIn}
      />
    )
  } else if (route === '/books' || route === '/books/') {
    userPage = (
      <UserBooksPage
        key={`${route}:${window.location.search}`}
        navigate={navigate}
        onToast={showToast}
      />
    )
  } else if (detailMatch) {
    userPage = (
      <UserBookDetailPage
        key={detailMatch[1]}
        bookId={decodeURIComponent(detailMatch[1])}
        navigate={navigate}
      />
    )
  } else if (route === '/ebooks' || route === '/ebooks/') {
    userPage = isLoggedIn ? (
      <EbooksPage />
    ) : (
      <section className="user-books-state">
        <h1>Sách điện tử</h1>
        <p>Đăng nhập để mượn và đọc sách điện tử.</p>
        <button
          type="button"
          className="user-primary-button"
          onClick={() => navigate('/login')}
        >
          Đăng nhập
        </button>
      </section>
    )
  } else if (route === '/my-books') {
    userPage = isLoggedIn ? (
      <UserMyBooksPage />
    ) : (
      <section className="user-books-state">
        <h1>Sách của tôi</h1>
        <p>Đăng nhập để truy cập sách của bạn.</p>
        <button
          type="button"
          className="user-primary-button"
          onClick={() => navigate('/login')}
        >
          Đăng nhập
        </button>
      </section>
    )
  } else if (route === '/profile') {
    userPage = isLoggedIn ? (
      <UserProfilePage
        accountEmail={email}
        navigate={navigate}
      />
    ) : (
      <section className="user-books-state">
        <h1>Hồ sơ cá nhân</h1>
        <p>Vui lòng đăng nhập để xem và cập nhật hồ sơ.</p>
        <button
          type="button"
          className="user-primary-button"
          onClick={() => navigate('/login')}
        >
          Đăng nhập
        </button>
      </section>
    )
  } else {
    userPage = (
      <section className="user-books-state">
        <h1>Không tìm thấy trang</h1>
        <p>Đường dẫn bạn truy cập không tồn tại.</p>
        <button
          type="button"
          className="user-primary-button"
          onClick={() => navigate('/')}
        >
          Về trang chủ
        </button>
      </section>
    )
  }

  return (
    <UserLayout
      route={route}
      navigate={navigate}
      onLogout={handleLogout}
      isLoggedIn={isLoggedIn}
      accountEmail={email}
    >
      <ProfileCompletionGate
        route={route}
        navigate={navigate}
        isLoggedIn={isLoggedIn}
      >
        {userPage}
      </ProfileCompletionGate>

      <Toast
        message={toast.message}
        type={toast.type}
        onClose={handleToastClose}
      />
    </UserLayout>
  )
}

export default App
