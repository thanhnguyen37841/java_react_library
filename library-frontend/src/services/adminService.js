
import { fetchWithAuth } from './authSession'

const API_URL = 'http://localhost:8080'

async function readResponseError(response, defaultMessage) {
  const responseText = await response.text()
  let data = null

  try {
    data = responseText ? JSON.parse(responseText) : null
  } catch {
    data = null
  }

  const error = new Error(
    data?.message ||
      data?.error ||
      `${defaultMessage}: HTTP ${response.status}`
  )

  error.status = response.status
  error.responseData = data

  return error
}

/**
 * Lấy thông tin tài khoản và quyền hiệu lực từ Backend.
 *
 * Backend /api/me/permissions trả về:
 * {
 *   userId: 1,
 *   email: "user@example.com",
 *   admin: false,
 *   staff: true,
 *   permissions: ["BOOK_READ", "MEMBER_READ"]
 * }
 *
 * Chỉ sử dụng trường staff do Backend xác định.
 * Không tự suy luận STAFF từ danh sách permissions.
 */
export async function getCurrentUserPermissions() {
  const response = await fetchWithAuth(`${API_URL}/api/me/permissions`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw await readResponseError(
      response,
      'Không thể lấy quyền hiện tại của tài khoản'
    )
  }

  const data = await response.json()

  const admin = data?.admin === true

  return {
    ...data,
    admin,
    // ADMIN không cần được phân loại thành STAFF.
    staff: !admin && data?.staff === true,
    permissions: Array.isArray(data?.permissions)
      ? data.permissions.filter(
          (permission) => typeof permission === 'string'
        )
      : [],
  }
}

/**
 * Kiểm tra tài khoản có vai trò ADMIN hay không.
 */
export async function checkAdminAccess() {
  const account = await getCurrentUserPermissions()
  return account.admin
}
