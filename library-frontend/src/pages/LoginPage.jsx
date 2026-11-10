
function LoginPage({
  email,
  setEmail,
  password,
  setPassword,
  isLoading = false,
  loginError = '',
  onSubmit,
  onNavigate,
  onClearLoginError,
}) {
  function handleEmailChange(event) {
    setEmail(event.target.value)
    onClearLoginError?.()
  }

  function handlePasswordChange(event) {
    setPassword(event.target.value)
    onClearLoginError?.()
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="brand">
          <div className="brand-icon">L</div>
          <span>Library Management</span>
        </div>

        <div className="login-heading">
          <p className="eyebrow">LIBRARY MANAGEMENT</p>
          <h1>Đăng nhập</h1>
          <p>Đăng nhập để tiếp tục sử dụng hệ thống thư viện.</p>
        </div>

        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={handleEmailChange}
              autoComplete="email"
              aria-invalid={Boolean(loginError)}
              aria-describedby={loginError ? 'login-error' : undefined}
              required
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="login-password">Mật khẩu</label>
            <input
              id="login-password"
              type="password"
              placeholder="Nhập mật khẩu"
              value={password}
              onChange={handlePasswordChange}
              autoComplete="current-password"
              aria-invalid={Boolean(loginError)}
              aria-describedby={loginError ? 'login-error' : undefined}
              required
              disabled={isLoading}
            />

            {loginError && (
              <p
                id="login-error"
                className="login-error"
                role="alert"
                aria-live="assertive"
              >
                <span className="login-error__icon" aria-hidden="true">
                  !
                </span>
                <span>{loginError}</span>
              </p>
            )}
          </div>

          <div className="forgot-password-link">
            <button
              type="button"
              className="auth-text-button"
              onClick={() => onNavigate('/forgot-password')}
              disabled={isLoading}
            >
              Quên mật khẩu?
            </button>
          </div>

          <button
            type="submit"
            className="login-button"
            disabled={isLoading}
          >
            {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>

        <p className="register-link">
          Chưa có tài khoản?{' '}
          <button
            type="button"
            className="auth-text-button"
            onClick={() => onNavigate('/register')}
            disabled={isLoading}
          >
            Đăng ký
          </button>
        </p>

        <div className="login-footer">
          Library API · Hệ thống quản lý thư viện
        </div>
      </section>
    </main>
  )
}

export default LoginPage
