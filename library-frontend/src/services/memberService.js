
import { fetchWithAuth } from './authSession'

const API_URL = 'http://localhost:8080/api/members'
const ADMIN_USER_API_URL = 'http://localhost:8080/api/admin/users'
const BOOK_API_URL = 'http://localhost:8080/api/books'

async function sendRequest(url, options = {}) {
  const headers = {
    Accept: 'application/json',
    ...(options.headers || {})
  }

  if (options.body !== undefined && options.body !== null) {
    headers['Content-Type'] =
      headers['Content-Type'] || 'application/json'
  }

  let response

  try {
    response = await fetchWithAuth(url, {
      ...options,
      headers
    })
  } catch (cause) {
    const error = new Error(
      'Không thể kết nối máy chủ. Vui lòng kiểm tra Backend hoặc kết nối mạng.'
    )
    error.code = 'NETWORK_ERROR'
    error.cause = cause
    throw error
  }

  const text = await response.text()
  let data = null

  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }

  if (!response.ok) {
    const backendMessage =
      typeof data === 'object' && data !== null
        ? data.message || data.error || data.detail
        : typeof data === 'string'
          ? data
          : null

    const error = new Error(
      backendMessage || `Lỗi HTTP ${response.status}`
    )

    error.status = response.status
    error.authExpired = response.status === 401
    error.responseData = data

    throw error
  }

  return data
}

// Chuẩn hóa lỗi tìm kiếm sách đang được mượn.
export function getBorrowedBookSearchError(error) {
  if (error?.authExpired || error?.status === 401) {
    return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
  }

  if (error?.status === 403) {
    return 'Bạn không có quyền xem hoặc tìm kiếm sách đang được mượn.'
  }

  if (error?.status === 404) {
    return 'Không tìm thấy API tìm kiếm sách đang được mượn. Vui lòng kiểm tra Backend.'
  }

  if (error?.status === 400) {
    return error.message || 'Yêu cầu tìm kiếm sách không hợp lệ.'
  }

  if (error?.status >= 500) {
    return 'Máy chủ đang gặp sự cố khi tìm kiếm sách. Vui lòng thử lại sau.'
  }

  if (error?.code === 'INVALID_BOOK_RESPONSE') {
    return 'Dữ liệu gợi ý sách từ máy chủ không đúng định dạng.'
  }

  if (error?.code === 'NETWORK_ERROR') {
    return error.message
  }

  return error?.message || 'Không thể tìm kiếm sách đang được mượn.'
}

// Tìm kiếm và phân trang thành viên.
export async function getMembers(filters = {}) {
  const params = new URLSearchParams()

  const fields = [
    'name',
    'email',
    'phoneNumber',
    'address',
    'birthFrom',
    'birthTo',
    'bookId',
    'isVerified'
  ]

  fields.forEach((field) => {
    const value = filters[field]

    if (
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ''
    ) {
      params.set(field, String(value).trim())
    }
  })

  params.set('page', String(filters.page ?? 0))
  params.set('size', String(filters.size ?? 10))

  const data = await sendRequest(
    `${API_URL}?${params.toString()}`
  )

  return {
    members: data?.content ?? [],
    page: data?.number ?? 0,
    totalPages: data?.totalPages ?? 0,
    totalElements: data?.totalElements ?? 0,
    size: data?.size ?? 10
  }
}

// Tìm sách đang được mượn theo tên, tác giả hoặc ISBN.
export async function searchBorrowedBooks(keyword = '') {
  const params = new URLSearchParams()
  const normalizedKeyword = String(keyword || '').trim()

  if (normalizedKeyword) {
    params.set('keyword', normalizedKeyword)
  }

  const data = await sendRequest(
    `${BOOK_API_URL}/borrowed-options?${params.toString()}`
  )

  if (!Array.isArray(data)) {
    const error = new Error(
      'Dữ liệu gợi ý sách từ máy chủ không đúng định dạng.'
    )
    error.code = 'INVALID_BOOK_RESPONSE'
    throw error
  }

  return data
}

// Tìm kiếm tài khoản đã xác thực và chưa liên kết Member.
export async function searchAdminUsers(
  keyword = '',
  page = 0,
  size = 8
) {
  const params = new URLSearchParams({
    keyword,
    page: String(page),
    size: String(size)
  })

  const data = await sendRequest(
    `${ADMIN_USER_API_URL}?${params.toString()}`
  )

  if (!Array.isArray(data?.content)) {
    throw new Error('Dữ liệu tài khoản từ Backend không hợp lệ.')
  }

  return data.content
}

// Lấy chi tiết một thành viên.
export async function getMemberById(id) {
  const result = await getMembers({
    page: 0,
    size: 100
  })

  const member = result.members.find(
    (item) => item.id === Number(id)
  )

  if (!member) {
    throw new Error('Không tìm thấy thành viên.')
  }

  return member
}

// Tạo thành viên.
export async function createMember(member) {
  return sendRequest(API_URL, {
    method: 'POST',
    body: JSON.stringify(member)
  })
}

// Cập nhật thành viên.
export async function updateMember(id, member) {
  return sendRequest(`${API_URL}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(member)
  })
}

// Xóa mềm thành viên.
export async function deleteMember(id) {
  return sendRequest(`${API_URL}/${id}`, {
    method: 'DELETE'
  })
}

// Lấy danh sách thành viên trong thùng rác.
export async function getDeletedMembers() {
  const data = await sendRequest(`${API_URL}/trash`)

  if (!Array.isArray(data)) {
    throw new Error(
      'Dữ liệu thùng rác thành viên từ Backend không hợp lệ.'
    )
  }

  return data
}

// Khôi phục thành viên từ thùng rác.
export async function restoreMember(id) {
  return sendRequest(`${API_URL}/${id}/restore`, {
    method: 'PUT'
  })
}
