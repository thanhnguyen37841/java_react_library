import { useState } from 'react'
import { forgotPassword } from '../services/authService'

function ForgotPasswordPage({ onBackToLogin }) {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()

    setMessage('')
    setError('')
    setLoading(true)

    try {
      const result = await forgotPassword(email.trim())

      setMessage(
        typeof result === 'string'
          ? result
          : result.message ||
              'Yêu cầu đã được gửi. Vui lòng kiểm tra email.'
      )
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
        <p className="eyebrow">PASSWORD RECOVERY</p>
        <h1>Quên mật khẩu?</h1>
        <p>
          Nhập email đã đăng ký. Hệ thống sẽ gửi liên kết
          để bạn đặt lại mật khẩu.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="forgot-email">Email</label>

          <input
            id="forgot-email"
            type="email"
            autoComplete="email"
            placeholder="name@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>

        {message && (
          <p
            className="account-message success-message"
            role="status"
          >
            {message}
          </p>
        )}

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
          {loading ? 'Đang gửi...' : 'Gửi liên kết đặt lại'}
        </button>
      </form>

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
        Library API · Khôi phục tài khoản
      </div>
    </section>
  )
}

export default ForgotPasswordPage