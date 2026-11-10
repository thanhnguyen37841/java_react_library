
import { useEffect, useState } from 'react'
import { verifyEmail } from '../services/authService'

function VerifyEmailPage({ onBackToLogin }) {
  const [status, setStatus] = useState('loading')
  const [message, setMessage] = useState('Đang xác thực email...')

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token')

    if (!token) {
      setStatus('error')
      setMessage('Liên kết xác thực không có mã token.')
      return
    }

    let cancelled = false

    verifyEmail(token)
      .then((data) => {
        if (cancelled) return

        setStatus('success')
        setMessage(data.message || 'Email đã được xác thực thành công.')
      })
      .catch((error) => {
        if (cancelled) return

        setStatus('error')
        setMessage(error.message || 'Không thể xác thực email.')
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section className="login-card">
      <div className="brand">
        <div className="brand-icon">L</div>
        <span>Library Management</span>
      </div>

      <div className="login-heading">
        <p className="eyebrow">EMAIL VERIFICATION</p>
        <h1>
          {status === 'loading' && 'Đang xác thực'}
          {status === 'success' && 'Xác thực thành công'}
          {status === 'error' && 'Xác thực thất bại'}
        </h1>
        <p>{message}</p>
      </div>

      {status === 'success' && (
        <button
          type="button"
          className="login-button"
          onClick={onBackToLogin}
        >
          Tiếp tục đăng nhập
        </button>
      )}

      {status === 'error' && (
        <p className="register-link">
          Liên kết có thể không hợp lệ hoặc đã hết hạn.
          Hãy quay lại màn hình đăng ký để được hướng dẫn.
        </p>
      )}

      <div className="login-footer">
        Library API · Xác thực tài khoản
      </div>
    </section>
  )
}

export default VerifyEmailPage
