
import { useEffect, useState } from 'react'
import { fetchWithAuth } from '../../../services/authSession'

const API_URL = 'http://localhost:8080'

const PROFILE_EXEMPT_ROUTES = new Set([
  '/profile',
  '/change-password',
  '/change-email',
])

function isProfileComplete(profile) {
  if (!profile) return false

  const fullName = String(profile.fullName || '').trim()
  const phoneNumber = String(profile.phoneNumber || '').trim()
  const address = String(profile.address || '').trim()
  const dateOfBirth = String(profile.dateOfBirth || '').trim()

  const validPhone = /^(0\d{9}|\+84\d{9})$/.test(phoneNumber)
  const validDate = /^\d{4}[-/]\d{2}[-/]\d{2}$/.test(dateOfBirth)

  return Boolean(
    fullName &&
    validPhone &&
    validDate &&
    address
  )
}

export default function ProfileCompletionGate({
  children,
  route,
  navigate,
  isLoggedIn,
}) {
  const [checking, setChecking] = useState(false)
  const [connectionWarning, setConnectionWarning] = useState('')
  const [isMaintenance, setIsMaintenance] = useState(false)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function checkProfile() {
      if (!isLoggedIn || PROFILE_EXEMPT_ROUTES.has(route)) {
        setChecking(false)
        setConnectionWarning('')
        setIsMaintenance(false)
        return
      }

      setChecking(true)
      setConnectionWarning('')
      setIsMaintenance(false)

      try {
        const response = await fetchWithAuth(
          `${API_URL}/api/members/me`,
          {
            method: 'GET',
            headers: {
              Accept: 'application/json',
            },
          }
        )

        if (cancelled) return

        if (response.status === 503) {
          setIsMaintenance(true)
          setConnectionWarning(
            'Hệ thống đang bảo trì. Vui lòng quay lại sau.'
          )
          return
        }

        if (response.status === 428) {
          navigate('/profile')
          return
        }

        if (!response.ok) {
          throw new Error(
            `Không kiểm tra được hồ sơ (HTTP ${response.status}).`
          )
        }

        const profile = await response.json()

        if (cancelled) return

        if (!isProfileComplete(profile)) {
          navigate('/profile')
        }
      } catch (error) {
        if (!cancelled) {
          setIsMaintenance(false)
          setConnectionWarning(
            error?.message ||
            'Tạm thời chưa kiểm tra được hồ sơ. Vui lòng thử lại.'
          )
        }
      } finally {
        if (!cancelled) {
          setChecking(false)
        }
      }
    }

    checkProfile()

    return () => {
      cancelled = true
    }
  }, [route, isLoggedIn, navigate, retryKey])

  if (checking) {
    return (
      <section className="user-books-state" aria-live="polite">
        <h1>Đang kiểm tra hồ sơ</h1>
        <p>Vui lòng chờ trong giây lát...</p>
      </section>
    )
  }

  if (isMaintenance && isLoggedIn) {
    return (
      <section
        className="user-books-state"
        role="status"
        aria-live="polite"
      >
        <h1>Hệ thống đang bảo trì</h1>

        <p>
          Các chức năng hiện tạm thời không khả dụng.
          Vui lòng quay lại sau khi hệ thống hoạt động trở lại.
        </p>

        <button
          type="button"
          onClick={() => setRetryKey((value) => value + 1)}
        >
          Kiểm tra lại
        </button>
      </section>
    )
  }

  return (
    <>
      {connectionWarning &&
        isLoggedIn &&
        !PROFILE_EXEMPT_ROUTES.has(route) && (
          <div className="profile-gate-warning" role="status">
            <span>
              {connectionWarning}
              {!isMaintenance &&
                ' Hồ sơ chưa được xác minh trong lần kiểm tra này; một số chức năng có thể chưa sử dụng được.'}
            </span>

            <button
              type="button"
              onClick={() => setRetryKey((value) => value + 1)}
            >
              Thử lại
            </button>
          </div>
        )}

      {children}
    </>
  )
}
