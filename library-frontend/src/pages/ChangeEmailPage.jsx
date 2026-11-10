import { useState } from 'react'
import {
  requestChangeEmail,
  confirmChangeEmail,
} from '../services/authService'

function ChangeEmailPage({ onBack }) {
  const [newEmail, setNewEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState(1)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isEmailChanged, setIsEmailChanged] = useState(false)

  async function handleRequestCode(event) {
    event.preventDefault()
    setMessage('')
    setError('')
    setLoading(true)

    try {
      const result = await requestChangeEmail(newEmail.trim())

      setMessage(
        typeof result === 'string'
          ? result
          : result.message || 'Mã xác thực đã được gửi đến email mới.'
      )

      setStep(2)
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

  async function handleConfirmCode(event) {
    event.preventDefault()
    setMessage('')
    setError('')

    if (!/^\d{6}$/.test(code)) {
      setError('Mã xác thực phải gồm đúng 6 chữ số.')
      return
    }

    setLoading(true)

    try {
      const result = await confirmChangeEmail(code.trim())

      setMessage(
        typeof result === 'string'
          ? result
          : result.message || 'Đổi email thành công!'
      )

      setIsEmailChanged(true)
      setCode('')
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

        <h1>
          {isEmailChanged ? 'Đổi email thành công' : 'Đổi email'}
        </h1>

        <p>
          {isEmailChanged
            ? `Địa chỉ email mới của bạn là ${newEmail}.`
            : step === 1
              ? 'Nhập địa chỉ email mới mà bạn muốn sử dụng.'
              : `Nhập mã xác thực đã gửi đến ${newEmail}.`}
        </p>
      </div>

      {!isEmailChanged && (
        <>
          {step === 1 ? (
            <form onSubmit={handleRequestCode}>
              <div className="form-group">
                <label htmlFor="new-email">Email mới</label>

                <input
                  id="new-email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  value={newEmail}
                  onChange={(event) => setNewEmail(event.target.value)}
                  required
                  disabled={loading}
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
                {loading ? 'Đang gửi mã...' : 'Gửi mã xác thực'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleConfirmCode}>
              <div className="form-group">
                <label htmlFor="email-code">Mã xác thực</label>

                <input
                  id="email-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="Nhập mã 6 chữ số"
                  maxLength={6}
                  value={code}
                  onChange={(event) =>
                    setCode(
                      event.target.value.replace(/\D/g, '').slice(0, 6)
                    )
                  }
                  required
                  disabled={loading}
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
                {loading ? 'Đang xác nhận...' : 'Xác nhận đổi email'}
              </button>

              <p className="register-link">
                <button
                  type="button"
                  className="text-button"
                  disabled={loading}
                  onClick={() => {
                    setStep(1)
                    setCode('')
                    setError('')
                    setMessage('')
                  }}
                >
                  Sử dụng email khác
                </button>
              </p>
            </form>
          )}
        </>
      )}

      {message && (
        <p
          className="account-message success-message"
          role="status"
        >
          {message}
        </p>
      )}

      {isEmailChanged ? (
        <button
          type="button"
          className="login-button"
          onClick={onBack}
        >
          Đăng nhập lại bằng email mới
        </button>
      ) : (
        <p className="register-link">
          <button
            type="button"
            className="text-button"
            onClick={onBack}
          >
            Quay lại thư viện
          </button>
        </p>
      )}

      <div className="login-footer">
        Library API · Bảo mật tài khoản
      </div>
    </section>
  )
}

export default ChangeEmailPage
