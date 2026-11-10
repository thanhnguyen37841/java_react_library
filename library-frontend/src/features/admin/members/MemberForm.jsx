import { useEffect, useState } from 'react'
import { searchAdminUsers } from '../../../services/memberService'

const PHONE_REGEX = /^(0\d{9}|\+84\d{9})$/

function formatUserLabel(user) {
  if (!user) return ''

  return user.fullName
    ? `${user.fullName} — ${user.email}`
    : user.email
}

function getLocalDateString() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function toBackendDate(date) {
  if (!date) return ''

  const parts = date.split('-')

  if (parts.length !== 3) return date

  const [year, month, day] = parts
  return `${year}/${month}/${day}`
}

export default function MemberForm({
  member,
  onSubmit,
  onCancel,
  isSaving = false
}) {
  const [fullName, setFullName] = useState(member?.fullName || '')
  const [dateOfBirth, setDateOfBirth] = useState(
    member?.dateOfBirth || ''
  )
  const [phoneNumber, setPhoneNumber] = useState(
    member?.phoneNumber || ''
  )
  const [address, setAddress] = useState(member?.address || '')

  const [userId, setUserId] = useState(
    member?.userId ? String(member.userId) : ''
  )
  const [userQuery, setUserQuery] = useState(member?.email || '')
  const [userOptions, setUserOptions] = useState([])
  const [selectedUser, setSelectedUser] = useState(
    member?.userId
      ? {
          id: member.userId,
          email: member.email || '',
          fullName: member.fullName || ''
        }
      : null
  )

  const [userLoading, setUserLoading] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    if (member) return

    let cancelled = false

    async function loadInitialUsers() {
      setUserLoading(true)

      try {
        const result = await searchAdminUsers('', 0, 8)

        if (!cancelled) {
          setUserOptions(result)
        }
      } catch (error) {
        if (!cancelled) {
          setSubmitError(
            error.message || 'Không thể tải danh sách tài khoản.'
          )
        }
      } finally {
        if (!cancelled) {
          setUserLoading(false)
        }
      }
    }

    loadInitialUsers()

    return () => {
      cancelled = true
    }
  }, [member])

  useEffect(() => {
    if (!dropdownOpen || member) return

    let cancelled = false

    const timeoutId = setTimeout(async () => {
      setUserLoading(true)

      try {
        const result = await searchAdminUsers(
          userQuery.trim(),
          0,
          8
        )

        if (!cancelled) {
          setUserOptions(result)
        }
      } catch (error) {
        if (!cancelled) {
          setUserOptions([])
          setSubmitError(
            error.message || 'Không thể tìm kiếm tài khoản.'
          )
        }
      } finally {
        if (!cancelled) {
          setUserLoading(false)
        }
      }
    }, 300)

    return () => {
      cancelled = true
      clearTimeout(timeoutId)
    }
  }, [userQuery, dropdownOpen, member])

  function validateForm() {
    const nextErrors = {}

    const normalizedName = fullName.trim()
    const normalizedPhone = phoneNumber.trim()
    const normalizedAddress = address.trim()

    if (!normalizedName) {
      nextErrors.fullName = 'Vui lòng nhập họ và tên.'
    } else if (normalizedName.length > 100) {
      nextErrors.fullName =
        'Họ tên không được vượt quá 100 ký tự.'
    }

    if (!dateOfBirth) {
      nextErrors.dateOfBirth = 'Vui lòng chọn ngày sinh.'
    } else {
      const selectedDate = new Date(`${dateOfBirth}T00:00:00`)
      const today = new Date(`${getLocalDateString()}T00:00:00`)

      if (Number.isNaN(selectedDate.getTime())) {
        nextErrors.dateOfBirth = 'Ngày sinh không hợp lệ.'
      } else if (selectedDate >= today) {
        nextErrors.dateOfBirth =
          'Ngày sinh phải nhỏ hơn ngày hiện tại.'
      }
    }

    if (!normalizedPhone) {
      nextErrors.phoneNumber = 'Vui lòng nhập số điện thoại.'
    } else if (!PHONE_REGEX.test(normalizedPhone)) {
      nextErrors.phoneNumber =
        'Số điện thoại phải có dạng 0xxxxxxxxx hoặc +84xxxxxxxxx.'
    }

    if (!normalizedAddress) {
      nextErrors.address = 'Vui lòng nhập địa chỉ.'
    } else if (normalizedAddress.length > 255) {
      nextErrors.address =
        'Địa chỉ không được vượt quá 255 ký tự.'
    }

    if (!member && !userId) {
      nextErrors.userId = 'Vui lòng chọn tài khoản liên kết.'
    }

    setErrors(nextErrors)

    return Object.keys(nextErrors).length === 0
  }

  function handleSelectUser(user) {
    setSelectedUser(user)
    setUserId(String(user.id))
    setUserQuery(formatUserLabel(user))
    setDropdownOpen(false)

    setErrors((previous) => ({
      ...previous,
      userId: ''
    }))
  }

  function handleUserQueryChange(value) {
    setUserQuery(value)
    setSelectedUser(null)
    setUserId('')
    setDropdownOpen(true)

    setErrors((previous) => ({
      ...previous,
      userId: ''
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitError('')

    if (isSaving || !validateForm()) return

    const payload = {
      fullName: fullName.trim(),
      dateOfBirth: toBackendDate(dateOfBirth),
      phoneNumber: phoneNumber.trim(),
      address: address.trim()
    }

    // Chỉ tạo mới mới cần gửi userId.
    // Khi cập nhật, giữ nguyên tài khoản đã liên kết.
    if (!member) {
      payload.userId = Number(userId)
    }

    try {
      await onSubmit(payload)
    } catch (error) {
      setSubmitError(
        error.message || 'Không thể lưu thông tin thành viên.'
      )
    }
  }

  return (
    <form
      className="member-form"
      onSubmit={handleSubmit}
      noValidate
    >
      <h2>
        {member ? 'Cập nhật thành viên' : 'Thêm thành viên'}
      </h2>

      <div className="member-form-field">
        <label htmlFor="member-full-name">
          Họ và tên *
        </label>

        <input
          id="member-full-name"
          type="text"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          placeholder="Nhập họ và tên"
          maxLength={100}
          disabled={isSaving}
        />

        {errors.fullName && (
          <small className="member-field-error">
            {errors.fullName}
          </small>
        )}
      </div>

      <div className="member-form-field">
        <label htmlFor="member-date-of-birth">
          Ngày sinh *
        </label>

        <input
          id="member-date-of-birth"
          type="date"
          value={dateOfBirth}
          max={getLocalDateString()}
          onChange={(event) => setDateOfBirth(event.target.value)}
          disabled={isSaving}
        />

        {errors.dateOfBirth && (
          <small className="member-field-error">
            {errors.dateOfBirth}
          </small>
        )}
      </div>

      <div className="member-form-field">
        <label htmlFor="member-phone-number">
          Số điện thoại *
        </label>

        <input
          id="member-phone-number"
          type="tel"
          value={phoneNumber}
          onChange={(event) => setPhoneNumber(event.target.value)}
          placeholder="Ví dụ: 0912345678"
          maxLength={13}
          disabled={isSaving}
        />

        <small>
          Định dạng: 0xxxxxxxxx hoặc +84xxxxxxxxx
        </small>

        {errors.phoneNumber && (
          <small className="member-field-error">
            {errors.phoneNumber}
          </small>
        )}
      </div>

      <div className="member-form-field">
        <label htmlFor="member-address">
          Địa chỉ *
        </label>

        <textarea
          id="member-address"
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          placeholder="Nhập địa chỉ đầy đủ"
          maxLength={255}
          rows={3}
          disabled={isSaving}
        />

        <small>{address.length}/255 ký tự</small>

        {errors.address && (
          <small className="member-field-error">
            {errors.address}
          </small>
        )}
      </div>

      {!member && (
        <div className="member-form-field member-user-combobox">
          <label htmlFor="member-user-search">
            Tài khoản liên kết *
          </label>

          <input
            id="member-user-search"
            type="text"
            value={userQuery}
            onChange={(event) =>
              handleUserQueryChange(event.target.value)
            }
            onFocus={() => setDropdownOpen(true)}
            onBlur={() => {
              setTimeout(() => setDropdownOpen(false), 150)
            }}
            placeholder="Tìm theo tên hoặc email..."
            autoComplete="off"
            disabled={isSaving}
          />

          {dropdownOpen && (
            <div className="member-user-options">
              {userLoading ? (
                <div className="member-user-option-empty">
                  Đang tìm tài khoản...
                </div>
              ) : userOptions.length === 0 ? (
                <div className="member-user-option-empty">
                  Không tìm thấy tài khoản chưa liên kết.
                </div>
              ) : (
                userOptions.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    className="member-user-option"
                    onMouseDown={(event) =>
                      event.preventDefault()
                    }
                    onClick={() => handleSelectUser(user)}
                    disabled={isSaving}
                  >
                    <strong>
                      {user.fullName || 'Chưa có họ tên'}
                    </strong>

                    <span>{user.email}</span>
                  </button>
                ))
              )}
            </div>
          )}

          {selectedUser && (
            <small className="member-user-selected">
              Đã chọn: {selectedUser.email}
            </small>
          )}

          {errors.userId && (
            <small className="member-field-error">
              {errors.userId}
            </small>
          )}
        </div>
      )}

      {submitError && (
        <div className="member-form-error" role="alert">
          {submitError}
        </div>
      )}

      <div className="member-form-actions">
        <button type="submit" disabled={isSaving}>
          {isSaving
            ? 'Đang lưu...'
            : member
              ? 'Lưu thay đổi'
              : 'Tạo thành viên'}
        </button>

        <button
          type="button"
          className="member-btn-secondary"
          onClick={onCancel}
          disabled={isSaving}
        >
          Hủy
        </button>
      </div>
    </form>
  )
}
