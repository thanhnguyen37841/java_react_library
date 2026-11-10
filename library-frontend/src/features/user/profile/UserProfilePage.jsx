
import { useEffect, useMemo, useState } from 'react'
import {
  getMyProfile,
  updateMyProfile,
} from '../../../services/profileService'
import {
  getProvinces,
  getWards,
} from '../../../services/addressService'
import './UserProfilePage.css'

const PHONE_PATTERN = /^(0\d{9}|\+84\d{9})$/

/**
 * Trả về ngày hiện tại theo định dạng yyyy-MM-dd.
 * Sử dụng giờ địa phương, không chuyển đổi qua UTC.
 */
function todayString() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

/**
 * Chuẩn hóa ngày thành yyyy-MM-dd.
 *
 * Hỗ trợ:
 * - yyyy-MM-dd
 * - yyyy/MM/dd
 * - dd/MM/yyyy
 *
 * Trả về chuỗi rỗng nếu ngày không hợp lệ.
 */
function normalizeDateForInput(value) {
  const date = String(value || '').trim()

  if (!date) return ''

  let year
  let month
  let day

  const isoMatch = date.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/)

  if (isoMatch) {
    ;[, year, month, day] = isoMatch
  } else {
    const vietnameseMatch = date.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)

    if (!vietnameseMatch) return ''

    ;[, day, month, year] = vietnameseMatch
  }

  month = String(month).padStart(2, '0')
  day = String(day).padStart(2, '0')

  const normalized = `${year}-${month}-${day}`
  const parsed = new Date(`${normalized}T00:00:00`)

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== Number(year) ||
    parsed.getMonth() + 1 !== Number(month) ||
    parsed.getDate() !== Number(day)
  ) {
    return ''
  }

  return normalized
}

/**
 * Hiển thị ngày theo định dạng Việt Nam dd/MM/yyyy.
 */
function formatDateForDisplay(value) {
  const normalized = normalizeDateForInput(value)

  if (!normalized) return ''

  const [year, month, day] = normalized.split('-')

  return `${day}/${month}/${year}`
}

/**
 * Định dạng ngày gửi lên backend theo quy ước hiện tại.
 */
function formatDateForApi(value) {
  const normalized = normalizeDateForInput(value)

  return normalized ? normalized.replaceAll('-', '/') : ''
}

function getErrorMessage(error) {
  if (error?.fieldErrors) {
    const messages = Object.values(error.fieldErrors)
      .flat()
      .filter(Boolean)

    if (messages.length > 0) {
      return messages.join('. ')
    }
  }

  return (
    error?.message ||
    'Không thể thực hiện yêu cầu. Vui lòng thử lại.'
  )
}

export default function UserProfilePage({
  accountEmail = '',
  navigate,
}) {
  const [profile, setProfile] = useState(null)

  const [fullName, setFullName] = useState('')
  // Lưu ngày sinh dưới dạng chuỗi hiển thị để người dùng có thể
  // nhập từng phần mà không bị xóa nội dung đang gõ.
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')

  const [addressDetail, setAddressDetail] = useState('')
  const [editingAddress, setEditingAddress] = useState(false)
  const [provinceCode, setProvinceCode] = useState('')
  const [wardCode, setWardCode] = useState('')

  const [provinces, setProvinces] = useState([])
  const [wards, setWards] = useState([])

  const [loadingProfile, setLoadingProfile] = useState(true)
  const [loadingProvinces, setLoadingProvinces] = useState(true)
  const [loadingWards, setLoadingWards] = useState(false)
  const [saving, setSaving] = useState(false)

  const [profileError, setProfileError] = useState('')
  const [addressError, setAddressError] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const [profileRetryKey, setProfileRetryKey] = useState(0)
  const [addressRetryKey, setAddressRetryKey] = useState(0)

  const selectedProvince = useMemo(
    () =>
      provinces.find(
        (item) => String(item.code) === String(provinceCode)
      ) || null,
    [provinces, provinceCode]
  )

  const selectedWard = useMemo(
    () =>
      wards.find(
        (item) => String(item.code) === String(wardCode)
      ) || null,
    [wards, wardCode]
  )

  const currentAddress = String(profile?.address || '').trim()

  // =====================================================
  // TẢI HỒ SƠ CÁ NHÂN
  // =====================================================

  useEffect(() => {
    let cancelled = false

    async function loadProfile() {
      setLoadingProfile(true)
      setProfileError('')

      try {
        const data = await getMyProfile()

        if (cancelled) return

        const result = data || {}

        setProfile(result)
        setEditingAddress(!String(result.address || '').trim())
        setFullName(result.fullName || '')
        setDateOfBirth(formatDateForDisplay(result.dateOfBirth))
        setPhoneNumber(result.phoneNumber || '')
      } catch (err) {
        if (!cancelled) {
          setProfileError(getErrorMessage(err))
        }
      } finally {
        if (!cancelled) {
          setLoadingProfile(false)
        }
      }
    }

    loadProfile()

    return () => {
      cancelled = true
    }
  }, [profileRetryKey])

  // =====================================================
  // TẢI DANH SÁCH TỈNH / THÀNH PHỐ
  // =====================================================

  useEffect(() => {
    const controller = new AbortController()

    async function loadProvinces() {
      setLoadingProvinces(true)
      setAddressError('')

      try {
        const data = await getProvinces(controller.signal)

        if (controller.signal.aborted) return

        setProvinces(Array.isArray(data) ? data : [])
      } catch (err) {
        if (
          !controller.signal.aborted &&
          err?.name !== 'AbortError'
        ) {
          setAddressError(getErrorMessage(err))
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingProvinces(false)
        }
      }
    }

    loadProvinces()

    return () => controller.abort()
  }, [addressRetryKey])

  // =====================================================
  // TẢI DANH SÁCH PHƯỜNG / XÃ
  // =====================================================

  useEffect(() => {
    let cancelled = false

    if (!provinceCode) {
      // Danh sách và mã phường/xã đã được xóa ngay trong
      // sự kiện thay đổi tỉnh/thành phố.
      return () => {
        cancelled = true
      }
    }

    async function loadWards() {
      try {
        const data = await getWards(provinceCode)

        if (cancelled) return

        const wardList = Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
            ? data.data
            : []

        setWards(wardList)
      } catch (err) {
        if (cancelled) return

        setWards([])
        setAddressError(getErrorMessage(err))
      } finally {
        if (!cancelled) {
          setLoadingWards(false)
        }
      }
    }

    loadWards()

    return () => {
      cancelled = true
    }
  }, [provinceCode])

  // =====================================================
  // GHÉP ĐỊA CHỈ
  // =====================================================

  const composedAddress = useMemo(() => {
    if (
      !addressDetail.trim() ||
      !selectedProvince ||
      !selectedWard
    ) {
      return ''
    }

    return [
      addressDetail.trim(),
      selectedWard.name,
      selectedProvince.name,
    ].join(', ')
  }, [addressDetail, selectedProvince, selectedWard])

  // =====================================================
  // MỞ LỊCH CHỌN NGÀY
  // =====================================================

  function openDatePicker(event) {
    const wrapper = event.currentTarget.closest(
      '.user-profile-date-wrapper'
    )
    const picker = wrapper?.querySelector(
      '.user-profile-date-picker'
    )

    if (!picker) return

    try {
      if (typeof picker.showPicker === 'function') {
        picker.showPicker()
      } else {
        picker.focus()
        picker.click()
      }
    } catch {
      picker.focus()
      picker.click()
    }
  }

  function handleDateTextChange(event) {
    setDateOfBirth(event.target.value)
    setError('')
    setMessage('')
  }

  function handleDatePickerChange(event) {
    const value = event.target.value

    setDateOfBirth(value ? formatDateForDisplay(value) : '')
    setError('')
    setMessage('')
  }

  // =====================================================
  // LƯU HỒ SƠ
  // =====================================================

  async function handleSubmit(event) {
    event.preventDefault()

    setError('')
    setMessage('')

    const trimmedName = fullName.trim()
    const trimmedPhone = phoneNumber.trim()
    const trimmedDetail = addressDetail.trim()

    if (!trimmedName) {
      setError('Vui lòng nhập họ và tên.')
      return
    }

    if (trimmedName.length > 100) {
      setError('Họ và tên không được vượt quá 100 ký tự.')
      return
    }

    if (!dateOfBirth.trim()) {
      setError('Vui lòng chọn ngày sinh.')
      return
    }

    const normalizedDate = normalizeDateForInput(dateOfBirth)

    if (!normalizedDate) {
      setError(
        'Ngày sinh không hợp lệ. Vui lòng nhập theo dd/MM/yyyy hoặc chọn ngày bằng lịch.'
      )
      return
    }

    if (normalizedDate >= todayString()) {
      setError('Ngày sinh phải nhỏ hơn ngày hiện tại.')
      return
    }

    if (!PHONE_PATTERN.test(trimmedPhone)) {
      setError(
        'Số điện thoại phải gồm 10 chữ số bắt đầu bằng 0 hoặc mã quốc gia +84.'
      )
      return
    }

    // Mặc định giữ nguyên địa chỉ hiện tại.
    // Chỉ ghép địa chỉ mới khi người dùng chủ động chỉnh sửa.
    let addressToSave = currentAddress

    if (editingAddress) {
      if (!provinceCode || !selectedProvince) {
        setError('Vui lòng chọn tỉnh/thành phố.')
        return
      }

      if (!wardCode || !selectedWard) {
        setError('Vui lòng chọn phường/xã.')
        return
      }

      if (!trimmedDetail) {
        setError(
          'Vui lòng nhập số nhà, tên đường hoặc địa chỉ chi tiết.'
        )
        return
      }

      if (trimmedDetail.length > 200) {
        setError(
          'Địa chỉ chi tiết không được vượt quá 200 ký tự.'
        )
        return
      }

      if (!composedAddress || composedAddress.length > 255) {
        setError(
          'Địa chỉ hoàn chỉnh không hợp lệ hoặc vượt quá 255 ký tự.'
        )
        return
      }

      addressToSave = composedAddress
    } else if (!addressToSave) {
      setError('Vui lòng bổ sung địa chỉ của bạn.')
      setEditingAddress(true)
      return
    }

    setSaving(true)

    try {
      const saved = await updateMyProfile({
        fullName: trimmedName,
        dateOfBirth: formatDateForApi(normalizedDate),
        phoneNumber: trimmedPhone,
        address: addressToSave,
      })

      const result = saved || {}

      const savedBirthDate = normalizeDateForInput(
        result.dateOfBirth || normalizedDate
      )

      setProfile((current) => ({
        ...(current || {}),
        ...result,
        fullName: result.fullName || trimmedName,
        dateOfBirth:
          result.dateOfBirth ||
          formatDateForApi(normalizedDate),
        phoneNumber: result.phoneNumber || trimmedPhone,
        address: result.address || addressToSave,
      }))

      setFullName(result.fullName || trimmedName)
      setDateOfBirth(formatDateForDisplay(savedBirthDate))
      setPhoneNumber(result.phoneNumber || trimmedPhone)

      // Sau khi lưu, đóng phần chỉnh sửa địa chỉ.
      setAddressDetail('')
      setProvinceCode('')
      setWardCode('')
      setWards([])
      setEditingAddress(false)

      setMessage('Lưu hồ sơ thành công.')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  // =====================================================
  // TRẠNG THÁI ĐANG TẢI HỒ SƠ
  // =====================================================

  if (loadingProfile) {
    return (
      <section className="user-profile-page">
        <div
          className="user-profile-loading"
          role="status"
          aria-live="polite"
        >
          <div className="user-profile-spinner" />
          <p>Đang tải hồ sơ cá nhân...</p>
        </div>
      </section>
    )
  }

  // =====================================================
  // GIAO DIỆN HỒ SƠ
  // =====================================================

  return (
    <section className="user-profile-page">
      <div className="user-profile-container">
        <header className="user-profile-heading">
          <p className="user-profile-eyebrow">
            TÀI KHOẢN CỦA BẠN
          </p>

          <h1>Hồ sơ cá nhân</h1>

          <p>
            {profile?.id
              ? 'Kiểm tra và cập nhật thông tin độc giả.'
              : 'Tài khoản của bạn chưa có hồ sơ độc giả. Vui lòng bổ sung thông tin để tiếp tục sử dụng thư viện.'}
          </p>
        </header>

        <div className="user-profile-account">
          <span
            className="user-profile-account-icon"
            aria-hidden="true"
          >
            @
          </span>

          <div>
            <span className="user-profile-label">
              Email tài khoản
            </span>

            <strong>
              {profile?.email || accountEmail || 'Không có email'}
            </strong>

            <small>
              {profile?.verified ?? profile?.isVerified
                ? 'Email đã xác minh'
                : 'Email chưa xác minh'}
            </small>
          </div>
        </div>

        {currentAddress && !editingAddress && (
          <div className="user-profile-notice">
            <strong>Địa chỉ hiện tại</strong>

            <p>{currentAddress}</p>

            <small>
              Địa chỉ này sẽ được giữ nguyên khi bạn chỉ cập nhật
              thông tin cá nhân.
            </small>

            <button
              type="button"
              className="user-profile-secondary-button"
              onClick={() => {
                setError('')
                setMessage('')
                setEditingAddress(true)
              }}
            >
              Chỉnh sửa địa chỉ
            </button>
          </div>
        )}

        {profileError && (
          <div
            className="user-profile-alert error"
            role="alert"
          >
            <p>{profileError}</p>

            <button
              type="button"
              className="user-profile-secondary-button"
              onClick={() => setProfileRetryKey((value) => value + 1)}
            >
              Tải lại hồ sơ
            </button>
          </div>
        )}

        {addressError && (
          <div
            className="user-profile-alert error"
            role="alert"
          >
            <p>{addressError}</p>

            <button
              type="button"
              className="user-profile-secondary-button"
              onClick={() => {
                setAddressError('')
                setAddressRetryKey((value) => value + 1)
              }}
            >
              Tải lại danh mục địa chỉ
            </button>
          </div>
        )}

        {error && (
          <div
            className="user-profile-alert error"
            role="alert"
          >
            {error}
          </div>
        )}

        {message && (
          <div
            className="user-profile-alert success"
            role="status"
          >
            {message}
          </div>
        )}

        <form
          className="user-profile-form"
          onSubmit={handleSubmit}
        >
          <div className="user-profile-section-heading">
            <h2>Thông tin cá nhân</h2>
            <p>Tất cả các trường có dấu * đều bắt buộc.</p>
          </div>

          <div className="user-profile-field">
            <label htmlFor="profile-full-name">
              Họ và tên *
            </label>

            <input
              id="profile-full-name"
              type="text"
              autoComplete="name"
              maxLength={100}
              value={fullName}
              onChange={(event) => {
                setFullName(event.target.value)
                setError('')
                setMessage('')
              }}
              placeholder="Nhập họ và tên"
              required
            />
          </div>

          <div className="user-profile-grid">
            <div className="user-profile-field">
              <label htmlFor="profile-date-of-birth">
                Ngày sinh *
              </label>

              <div className="user-profile-date-wrapper">
                <input
                  id="profile-date-of-birth"
                  type="text"
                  inputMode="numeric"
                  placeholder="dd/mm/yyyy"
                  value={dateOfBirth}
                  onChange={handleDateTextChange}
                  maxLength={10}
                  autoComplete="bday"
                  aria-describedby="profile-date-hint"
                  required
                />

                <input
                  type="date"
                  aria-label="Chọn ngày sinh bằng lịch"
                  max={todayString()}
                  value={normalizeDateForInput(dateOfBirth)}
                  onChange={handleDatePickerChange}
                  className="user-profile-date-picker"
                  tabIndex={-1}
                />

                <button
                  type="button"
                  className="user-profile-date-button"
                  aria-label="Mở lịch chọn ngày sinh"
                  onClick={openDatePicker}
                >
                  <span aria-hidden="true">📅</span>
                </button>
              </div>

              <small id="profile-date-hint">
                Nhập ngày theo định dạng dd/MM/yyyy hoặc nhấn biểu
                tượng lịch để chọn ngày, tháng và năm. Ngày sinh
                phải trước ngày hiện tại.
              </small>
            </div>

            <div className="user-profile-field">
              <label htmlFor="profile-phone">
                Số điện thoại *
              </label>

              <input
                id="profile-phone"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                maxLength={13}
                value={phoneNumber}
                onChange={(event) => {
                  setPhoneNumber(event.target.value)
                  setError('')
                  setMessage('')
                }}
                placeholder="0912345678"
                required
              />

              <small>
                Ví dụ: 0912345678 hoặc +84912345678
              </small>
            </div>
          </div>

          {editingAddress && (
            <>
              <div className="user-profile-section-heading address-heading">
                <h2>Địa chỉ</h2>

                <p>
                  Chọn tỉnh/thành phố trước, sau đó chọn phường/xã.
                  Địa chỉ sẽ được ghép tự động khi lưu.
                </p>
              </div>

              <div className="user-profile-field">
                <label htmlFor="profile-province">
                  Tỉnh/thành phố *
                </label>

                <select
                  id="profile-province"
                  value={provinceCode}
                  onChange={(event) => {
                    const nextProvinceCode = event.target.value

                    setProvinceCode(nextProvinceCode)
                    setWardCode('')
                    setWards([])
                    setAddressError('')
                    setError('')
                    setMessage('')
                    setLoadingWards(Boolean(nextProvinceCode))
                  }}
                  required
                  disabled={
                    loadingProvinces ||
                    provinces.length === 0
                  }
                >
                  <option value="">
                    {loadingProvinces
                      ? 'Đang tải danh sách...'
                      : 'Chọn tỉnh/thành phố'}
                  </option>

                  {provinces.map((province) => (
                    <option
                      key={province.code}
                      value={province.code}
                    >
                      {province.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="user-profile-field">
                <label htmlFor="profile-ward">
                  Phường/xã *
                </label>

                <select
                  id="profile-ward"
                  value={wardCode}
                  onChange={(event) => {
                    setWardCode(event.target.value)
                    setError('')
                    setMessage('')
                  }}
                  required
                  disabled={
                    !provinceCode ||
                    loadingWards ||
                    wards.length === 0
                  }
                >
                  <option value="">
                    {!provinceCode
                      ? 'Chọn tỉnh/thành phố trước'
                      : loadingWards
                        ? 'Đang tải phường/xã...'
                        : 'Chọn phường/xã'}
                  </option>

                  {wards.map((ward) => (
                    <option
                      key={ward.code}
                      value={ward.code}
                    >
                      {ward.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="user-profile-field">
                <label htmlFor="profile-address-detail">
                  Số nhà, đường, căn hộ hoặc địa chỉ chi tiết *
                </label>

                <input
                  id="profile-address-detail"
                  type="text"
                  autoComplete="street-address"
                  maxLength={200}
                  value={addressDetail}
                  onChange={(event) => {
                    setAddressDetail(event.target.value)
                    setError('')
                    setMessage('')
                  }}
                  placeholder="Ví dụ: 123 Nguyễn Trãi"
                  required
                />
              </div>

              <div className="user-profile-address-preview">
                <span>Địa chỉ sau khi ghép</span>

                <p>
                  {composedAddress ||
                    'Địa chỉ hoàn chỉnh sẽ xuất hiện tại đây sau khi bạn chọn đủ thông tin.'}
                </p>
              </div>

              {currentAddress && (
                <button
                  type="button"
                  className="user-profile-secondary-button"
                  onClick={() => {
                    setError('')
                    setMessage('')
                    setAddressDetail('')
                    setProvinceCode('')
                    setWardCode('')
                    setWards([])
                    setLoadingWards(false)
                    setEditingAddress(false)
                  }}
                >
                  Hủy chỉnh sửa địa chỉ
                </button>
              )}
            </>
          )}

          <div className="user-profile-actions">
            <button
              type="submit"
              className="user-profile-primary-button"
              disabled={
                saving ||
                (editingAddress &&
                  (loadingProvinces ||
                    loadingWards ||
                    !selectedProvince ||
                    !selectedWard))
              }
            >
              {saving ? 'Đang lưu hồ sơ...' : 'Lưu hồ sơ'}
            </button>

            <button
              type="button"
              className="user-profile-secondary-button"
              onClick={() => navigate?.('/change-password')}
            >
              Đổi mật khẩu
            </button>

            <button
              type="button"
              className="user-profile-secondary-button"
              onClick={() => navigate?.('/change-email')}
            >
              Đổi email
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}
