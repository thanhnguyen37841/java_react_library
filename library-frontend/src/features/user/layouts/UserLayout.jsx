import { useEffect, useRef, useState } from 'react'
import './UserLayout.css'

export default function UserLayout({
  children,
  route = '/',
  navigate,
  onLogout,
  isLoggedIn = false,
  accountEmail = ''
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)

  const accountMenuRef = useRef(null)

  const navItems = [
    { label: 'Trang chủ', path: '/', icon: '⌂' },
    { label: 'Khám phá sách', path: '/books', icon: '▤' },
    { label: 'Sách điện tử', path: '/ebooks', icon: '▧', requiresAuth: true },
    {
      label: 'Sách của tôi',
      path: '/my-books',
      icon: '▣',
      requiresAuth: true
    }
  ]

  function goTo(path) {
    setMobileMenuOpen(false)
    setAccountMenuOpen(false)

    if (typeof navigate === 'function') {
      navigate(path)
    }
  }

  function handleNavigation(event, path, requiresAuth = false) {
    event.preventDefault()

    if (requiresAuth && !isLoggedIn) {
      goTo('/login')
      return
    }

    goTo(path)
  }

  useEffect(() => {
    function handleOutsideClick(event) {
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(event.target)
      ) {
        setAccountMenuOpen(false)
      }
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setAccountMenuOpen(false)
        setMobileMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  useEffect(() => {
    setMobileMenuOpen(false)
    setAccountMenuOpen(false)
  }, [route])

  const accountInitial = accountEmail
    ? accountEmail.charAt(0).toUpperCase()
    : 'U'

  return (
    <div className="user-app">
      <header className="user-header">
        <div className="user-header-inner">
          <a
            href="/"
            className="user-brand"
            onClick={(event) => handleNavigation(event, '/')}
            aria-label="Về trang chủ thư viện"
          >
            <span className="user-brand-icon">
              <span>BK</span>
            </span>

            <span className="user-brand-text">
              <strong>BookSpace</strong>
              <small>Thư viện của bạn</small>
            </span>
          </a>

          <button
            type="button"
            className="user-mobile-toggle"
            aria-label={mobileMenuOpen ? 'Đóng menu' : 'Mở menu'}
            aria-expanded={mobileMenuOpen}
            onClick={() =>
              setMobileMenuOpen((current) => !current)
            }
          >
            <span />
            <span />
            <span />
          </button>

          <nav
            className={`user-nav ${mobileMenuOpen ? 'is-open' : ''}`}
            aria-label="Điều hướng chính"
          >
            {navItems.map((item) => {
              const active =
                item.path === '/'
                  ? route === '/'
                  : route === item.path ||
                    route.startsWith(`${item.path}/`)

              return (
                <a
                  key={item.path}
                  href={item.path}
                  className={`user-nav-link ${active ? 'active' : ''}`}
                  aria-current={active ? 'page' : undefined}
                  onClick={(event) =>
                    handleNavigation(
                      event,
                      item.path,
                      item.requiresAuth
                    )
                  }
                >
                  <span className="user-nav-icon" aria-hidden="true">
                    {item.icon}
                  </span>
                  {item.label}
                </a>
              )
            })}
          </nav>

          <div className="user-header-actions">
            {isLoggedIn ? (
              <div className="user-account" ref={accountMenuRef}>
                <button
                  type="button"
                  className="user-account-trigger"
                  aria-expanded={accountMenuOpen}
                  onClick={() =>
                    setAccountMenuOpen((current) => !current)
                  }
                >
                  <span className="user-avatar">
                    {accountInitial}
                  </span>

                  <span className="user-account-label">
                    <strong>Tài khoản</strong>
                    <small>{accountEmail || 'Thành viên'}</small>
                  </span>

                  <span
                    className="user-account-chevron"
                    aria-hidden="true"
                  >
                    {accountMenuOpen ? '▲' : '▼'}
                  </span>
                </button>

                {accountMenuOpen && (
                  <div className="user-account-menu">
                    <div className="user-account-menu-header">
                      <strong>Tài khoản của tôi</strong>
                      <span>{accountEmail}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => goTo('/profile')}
                    >
                      <span>♙</span>
                      Hồ sơ cá nhân
                    </button>

                    <button
                      type="button"
                      onClick={() => goTo('/change-password')}
                    >
                      <span>⌑</span>
                      Đổi mật khẩu
                    </button>

                    <button
                      type="button"
                      onClick={() => goTo('/change-email')}
                    >
                      <span>✉</span>
                      Đổi email
                    </button>

                    <div className="user-account-menu-divider" />

                    <button
                      type="button"
                      className="user-logout-action"
                      onClick={() => {
                        setAccountMenuOpen(false)
                        onLogout?.()
                      }}
                    >
                      <span>↪</span>
                      Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="user-auth-actions">
                <button
                  type="button"
                  className="user-login-button"
                  onClick={() => goTo('/login')}
                >
                  Đăng nhập
                </button>

                <button
                  type="button"
                  className="user-register-button"
                  onClick={() => goTo('/register')}
                >
                  Đăng ký
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="user-main">{children}</main>

      <footer className="user-footer">
        <div className="user-footer-inner">
          <div className="user-footer-brand">
            <strong>BookSpace</strong>
            <p>Khám phá tri thức, mở rộng thế giới của bạn.</p>
          </div>

          <div className="user-footer-links">
            <button
              type="button"
              onClick={() => goTo('/books')}
            >
              Khám phá sách
            </button>

            <button
              type="button"
              onClick={() => {
                if (!isLoggedIn) {
                  goTo('/login')
                  return
                }

                goTo('/my-books')
              }}
            >
              Sách của tôi
            </button>
          </div>

          <p className="user-footer-copyright">
            © {new Date().getFullYear()} BookSpace
          </p>
        </div>
      </footer>
    </div>
  )
}