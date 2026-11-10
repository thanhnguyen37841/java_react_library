
import { useState } from 'react'
import { register } from '../services/authService'

const PASSWORD_REQUIREMENTS = [
  {
    label: 'Ít nhất 12 ký tự',
    test: (value) => value.length >= 12,
  },
  {
    label: 'Có ít nhất một chữ thường (a-z)',
    test: (value) => /[a-z]/.test(value),
  },
  {
    label: 'Có ít nhất một chữ hoa (A-Z)',
    test: (value) => /[A-Z]/.test(value),
  },
  {
    label: 'Có ít nhất một chữ số (0-9)',
    test: (value) => /\d/.test(value),
  },
  {
    label: 'Có ít nhất một ký tự đặc biệt',
    test: (value) => /[^a-zA-Z0-9\s]/.test(value),
  },
  {
    label: 'Không chứa khoảng trắng',
    test: (value) => !/\s/.test(value),
  },
]

function RegisterPage({
  email: emailProp,
  setEmail: setEmailProp,
  onNavigate,
  onRegisterSuccess,
  showToast,
  onToast,
}) {
  const [localEmail, setLocalEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isWaitingForVerification, setIsWaitingForVerification] =
    useState(false)
  const [registeredEmail, setRegisteredEmail] = useState('')
  const [registerError, setRegisterError] = useState('')

  const email =
    typeof emailProp === 'string' ? emailProp : localEmail

  const setEmail =
    typeof setEmailProp === 'function'
      ? setEmailProp
      : setLocalEmail

  const notify = (message, type = 'info') => {
    if (typeof showToast === 'function') {
      showToast(message, type)
      return
    }

    if (typeof onToast === 'function') {
      onToast(message, type)
      return
    }

    if (type === 'error') {
      console.error(message)
    } else {
      console.info(message)
    }
  }

  const passwordRequirements = PASSWORD_REQUIREMENTS.map(
    (requirement) => ({
      label: requirement.label,
      valid: requirement.test(password),
    })
  )

  const isPasswordValid = passwordRequirements.every(
    (requirement) => requirement.valid
  )

  const isConfirmPasswordValid =
    password.length > 0 && password === confirmPassword

  const handleRegister = async (event) => {
    event.preventDefault()

    if (isLoading) return

    setRegisterError('')

    const normalizedEmail = email.trim()

    if (!normalizedEmail) {
      setRegisterError('Vui lòng nhập email.')
      return
    }

    if (!isPasswordValid) {
      setRegisterError(
        'Mật khẩu chưa đáp ứng đầy đủ các yêu cầu bảo mật.'
      )
      return
    }

    if (!isConfirmPasswordValid) {
      setRegisterError('Mật khẩu xác nhận không khớp.')
      return
    }

    setIsLoading(true)

    try {
      const data = await register({
        email: normalizedEmail,
        password,
        confirmPassword,
      })

      setRegisteredEmail(normalizedEmail)
      setEmail(normalizedEmail)
      setPassword('')
      setConfirmPassword('')
      setRegisterError('')
      setIsWaitingForVerification(true)

      notify(
        data?.message ||
          'Đã tiếp nhận yêu cầu đăng ký. Vui lòng xác thực email trước khi đăng nhập.',
        'success'
      )

      if (typeof onRegisterSuccess === 'function') {
        onRegisterSuccess()
      }
    } catch (err) {
      console.error('Register error:', err)

      const backendMessage =
        typeof err?.message === 'string'
          ? err.message.trim()
          : ''

      const normalizedMessage = backendMessage.toLowerCase()

      const isDuplicateEmail =
        err?.status === 409 ||
        normalizedMessage.includes('already exists') ||
        normalizedMessage.includes('already registered') ||
        normalizedMessage.includes('email already') ||
        normalizedMessage.includes('duplicate') ||
        normalizedMessage.includes('email exists') ||
        normalizedMessage.includes('đã tồn tại') ||
        normalizedMessage.includes('đã được sử dụng') ||
        normalizedMessage.includes('đã đăng ký') ||
        normalizedMessage.includes('email đã')

      let message

      if (isDuplicateEmail) {
        message =
          'Email này đã được đăng ký. Vui lòng sử dụng email khác.'
      } else if (
        err instanceof TypeError &&
        /fetch|network|failed/i.test(backendMessage)
      ) {
        message =
          'Không thể kết nối đến máy chủ. Vui lòng kiểm tra Backend và kết nối mạng.'
      } else if (backendMessage) {
        message = backendMessage
      } else {
        message = 'Đăng ký thất bại. Vui lòng thử lại.'
      }

      // Chỉ hiển thị lỗi tại trang đăng ký.
      // Không gọi notify() ở đây để tránh toast xuất hiện
      // lần nữa tại góc trên bên phải trang chủ.
      setRegisterError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleBackHome = () => {
    if (typeof onNavigate === 'function') {
      onNavigate('/')
    } else {
      window.location.assign('/')
    }
  }

  if (isWaitingForVerification) {
    return (
      <section className="login-card">
        <div className="brand">
          <div className="brand-icon">L</div>
          <span>Library Management</span>
        </div>

        <div className="login-heading">
          <p className="eyebrow">EMAIL VERIFICATION</p>
          <h1>Kiểm tra email của bạn</h1>
          <p>
            Chúng tôi đã tiếp nhận yêu cầu đăng ký. Hãy mở email
            bên dưới và nhấn vào liên kết xác thực để hoàn tất
            đăng ký.
          </p>
          <p>
            <strong>{registeredEmail}</strong>
          </p>
        </div>

        <p className="register-link">
          Chưa nhận được email? Hãy kiểm tra thư mục Spam hoặc
          Thư rác. Bạn cần hoàn tất xác thực email trước khi
          đăng nhập.
        </p>

        <button
          type="button"
          className="login-button"
          onClick={() => onNavigate?.('/login')}
        >
          Đến trang đăng nhập
        </button>

        <button
          type="button"
          className="back-home-link"
          onClick={handleBackHome}
        >
          <span className="back-home-arrow" aria-hidden="true">
            ←
          </span>
          <span>Quay lại trang chủ</span>
        </button>

        <div className="login-footer">
          Library API · Đang chờ xác thực tài khoản
        </div>
      </section>
    )
  }

  return (
    <section className="login-card">
      <div className="brand">
        <div className="brand-icon">L</div>
        <span>Library Management</span>
      </div>

      <div className="login-heading">
        <p className="eyebrow">LIBRARY MANAGEMENT</p>
        <h1>Tạo tài khoản</h1>
        <p>Đăng ký tài khoản để sử dụng hệ thống thư viện.</p>
      </div>

      <form onSubmit={handleRegister} noValidate>
        <div className="form-group">
          <label htmlFor="register-email">Email</label>
          <input
            id="register-email"
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value)
              setRegisterError('')
            }}
            autoComplete="email"
            required
          />

          {registerError && (
            <p className="login-error" role="alert">
              <span
                className="login-error__icon"
                aria-hidden="true"
              >
                !
              </span>
              <span>{registerError}</span>
            </p>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="register-password">Mật khẩu</label>

          <div className="password-input">
            <input
              id="register-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Tạo mật khẩu bảo mật"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                setRegisterError('')
              }}
              autoComplete="new-password"
              minLength={12}
              required
            />

            <button
              type="button"
              className="toggle-password"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={
                showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'
              }
            >
              {showPassword ? 'Ẩn' : 'Hiện'}
            </button>
          </div>

          <div className="password-requirements">
            <h4>Yêu cầu mật khẩu</h4>
            <ul>
              {passwordRequirements.map((requirement) => (
                <li
                  key={requirement.label}
                  className={
                    requirement.valid ? 'valid' : 'invalid'
                  }
                >
                  <span className="requirement-icon">
                    {requirement.valid ? '✓' : '○'}
                  </span>
                  <span>{requirement.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="register-confirm-password">
            Xác nhận mật khẩu
          </label>

          <div className="password-input">
            <input
              id="register-confirm-password"
              type={
                showConfirmPassword ? 'text' : 'password'
              }
              placeholder="Nhập lại mật khẩu"
              value={confirmPassword}
              onChange={(event) => {
                setConfirmPassword(event.target.value)
                setRegisterError('')
              }}
              autoComplete="new-password"
              minLength={12}
              aria-invalid={
                confirmPassword.length > 0 &&
                password !== confirmPassword
              }
              required
            />

            <button
              type="button"
              className="toggle-password"
              onClick={() =>
                setShowConfirmPassword((value) => !value)
              }
              aria-label={
                showConfirmPassword
                  ? 'Ẩn mật khẩu xác nhận'
                  : 'Hiện mật khẩu xác nhận'
              }
            >
              {showConfirmPassword ? 'Ẩn' : 'Hiện'}
            </button>
          </div>

          {confirmPassword.length > 0 && (
            <small
              className={`password-match ${
                isConfirmPasswordValid ? 'valid' : 'invalid'
              }`}
            >
              {isConfirmPasswordValid
                ? '✓ Mật khẩu xác nhận khớp.'
                : 'Mật khẩu xác nhận chưa khớp.'}
            </small>
          )}
        </div>

        <button
          type="submit"
          className="login-button"
          disabled={isLoading}
        >
          {isLoading ? 'Đang đăng ký...' : 'Đăng ký'}
        </button>
      </form>

      <button
        type="button"
        className="back-home-link"
        onClick={handleBackHome}
      >
        <span className="back-home-arrow" aria-hidden="true">
          ←
        </span>
        <span>Quay lại trang chủ</span>
      </button>

      <div className="login-footer">
        Library API · Hệ thống quản lý thư viện
      </div>
    </section>
  )
}

export default RegisterPage
