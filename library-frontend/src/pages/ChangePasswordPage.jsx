import { useState } from 'react'
import { changePassword } from '../services/authService'

function ChangePasswordPage({ onBack }) {
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setMessage('')
    setError('')

    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.')
      return
    }

    if (oldPassword === newPassword) {
      setError('Mật khẩu mới phải khác mật khẩu hiện tại.')
      return
    }

    setLoading(true)

    try {
      const result = await changePassword({
        oldPassword,
        newPassword,
        confirmPassword,
      })

      setMessage(
        typeof result === 'string'
          ? result
          : result.message || 'Đổi mật khẩu thành công!'
      )

      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setError(
        err instanceof TypeError
          ? 'Không thể kết nối Backend. Vui lòng thử lại.'
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
        <p className="eyebrow">ACCOUNT SECURITY</p>
        <h1>Đổi mật khẩu</h1>
        <p>Nhập mật khẩu hiện tại và thiết lập mật khẩu mới.</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="old-password">Mật khẩu hiện tại</label>
          <input
            id="old-password"
            type="password"
            autoComplete="current-password"
            value={oldPassword}
            onChange={(event) => setOldPassword(event.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="new-password">Mật khẩu mới</label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            minLength={12}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="confirm-password">
            Xác nhận mật khẩu mới
          </label>
          <input
            id="confirm-password"
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

        {message && (
          <p className="account-message success-message" role="status">
            {message}
          </p>
        )}

        {error && (
          <p className="account-message error-message" role="alert">
            {error}
          </p>
        )}

        <button className="login-button" type="submit" disabled={loading}>
          {loading ? 'Đang cập nhật...' : 'Đổi mật khẩu'}
        </button>
      </form>

      <p className="register-link">
        <button type="button" className="text-button" onClick={onBack}>
          Quay lại thư viện
        </button>
      </p>

      <div className="login-footer">
        Library API · Bảo mật tài khoản
      </div>
    </section>
  )
}

export default ChangePasswordPage