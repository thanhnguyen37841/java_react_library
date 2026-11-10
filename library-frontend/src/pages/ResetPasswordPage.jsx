import { useState } from 'react'
import { resetPassword } from '../services/authService'

function ResetPasswordPage({ onBackToLogin }) {
  const [token] = useState(
    () => new URLSearchParams(window.location.search).get('token') || ''
  )

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()

    setMessage('')
    setError('')

    if (!token) {
      setError(
        'Liên kết không có token. Vui lòng mở liên kết trong email.'
      )
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.')
      return
    }

    setLoading(true)

    try {
      const result = await resetPassword({
        token,
        newPassword,
        confirmPassword,
      })

      setMessage(
        typeof result === 'string'
          ? result
          : result.message || 'Đặt lại mật khẩu thành công!'
      )

      setNewPassword('')
      setConfirmPassword('')
      setIsSuccess(true)
    } catch (err) {
      setError(
        err instanceof TypeError
          ? 'Không thể kết nối Backend. Hãy kiểm tra Spring Boot và CORS.'
          : err.message
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="login-card account-card">
      <div className="brand">
        <div className="brand-icon">L</div>
        <span>Library Management</span>
      </div>

      <div className="login-heading">
        <p className="eyebrow">RESET PASSWORD</p>
        <h1>Đặt lại mật khẩu</h1>
        <p>
          Nhập mật khẩu mới để khôi phục quyền truy cập tài khoản.
        </p>
      </div>

      {!isSuccess && (
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="reset-password">Mật khẩu mới</label>

            <input
              id="reset-password"
              type="password"
              autoComplete="new-password"
              minLength={12}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="reset-confirm-password">
              Xác nhận mật khẩu mới
            </label>

            <input
              id="reset-confirm-password"
              type="password"
              autoComplete="new-password"
              minLength={12}
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(event.target.value)
              }
              required
            />
          </div>

          {error && (
            <p
              className="account-message error-message"
              role="alert"
            >
              {error}
            </p>
          )}

          <button
            className="login-button"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Đang cập nhật...' : 'Đặt lại mật khẩu'}
          </button>
        </form>
      )}

      {message && (
        <p
          className="account-message success-message"
          role="status"
        >
          {message}
        </p>
      )}

      <p className="register-link">
        <a
          href="/"
          onClick={(event) => {
            event.preventDefault()
            onBackToLogin()
          }}
        >
          Quay lại đăng nhập
        </a>
      </p>

      <div className="login-footer">
        Library API · Bảo mật tài khoản
      </div>
    </section>
  )
}

export default ResetPasswordPage