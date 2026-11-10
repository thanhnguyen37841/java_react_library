import { fetchWithAuth } from './authSession'

const API_URL = 'http://localhost:8080'

async function parseResponse(response, fallbackMessage) {
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
    const message =
      typeof data === 'object' && data !== null
        ? data.message || data.error
        : data

    const error = new Error(
      message ||
        `${fallbackMessage} (HTTP ${response.status})`
    )

    error.status = response.status
    error.authExpired = response.status === 401

    throw error
  }

  return data
}

async function request(url, options = {}, fallback) {
  const headers = {
    Accept: 'application/json',
    ...(options.headers || {}),
  }

  if (options.body !== undefined && options.body !== null) {
    headers['Content-Type'] =
      headers['Content-Type'] || 'application/json'
  }

  const response = await fetchWithAuth(url, {
    ...options,
    headers,
  })

  return parseResponse(response, fallback)
}

export async function getMyBorrows({
  page = 0,
  size = 10,
  keyword = '',
  status = '',
} = {}) {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
  })

  if (keyword.trim()) {
    params.set('keyword', keyword.trim())
  }

  if (status) {
    params.set('status', status)
  }

  const data = await request(
    `${API_URL}/api/borrows/my?${params}`,
    { method: 'GET' },
    'Không thể tải lịch sử mượn sách'
  )

  return {
    records: Array.isArray(data?.content)
      ? data.content
      : [],
    page: data?.number ?? page,
    size: data?.size ?? size,
    totalPages: data?.totalPages ?? 0,
    totalElements: data?.totalElements ?? 0,
    first: data?.first ?? true,
    last: data?.last ?? true,
  }
}

export async function getBorrows({
  page = 0,
  size = 10,
  keyword = '',
  status = '',
} = {}) {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
  })

  if (keyword.trim()) {
    params.set('keyword', keyword.trim())
  }

  if (status) {
    params.set('status', status)
  }

  const data = await request(
    `${API_URL}/api/borrows?${params}`,
    { method: 'GET' },
    'Không thể tải danh sách phiếu mượn'
  )

  return {
    records: Array.isArray(data?.content)
      ? data.content
      : [],
    page: data?.number ?? page,
    size: data?.size ?? size,
    totalPages: data?.totalPages ?? 0,
    totalElements: data?.totalElements ?? 0,
  }
}

export async function getBorrowById(id) {
  return request(
    `${API_URL}/api/borrows/${encodeURIComponent(id)}`,
    { method: 'GET' },
    'Không thể tải chi tiết phiếu mượn'
  )
}

export async function cancelBorrow(id) {
  if (id === null || id === undefined) {
    throw new Error('ID phiếu mượn không hợp lệ.')
  }

  return request(
    `${API_URL}/api/borrows/${encodeURIComponent(id)}/cancel`,
    { method: 'POST' },
    'Không thể hủy yêu cầu mượn sách'
  )
}

export async function returnBorrow(id) {
  if (id === null || id === undefined) {
    throw new Error('ID phiếu mượn không hợp lệ.')
  }

  return request(
    `${API_URL}/api/borrows/${encodeURIComponent(id)}/return`,
    { method: 'PUT' },
    'Không thể xác nhận trả sách'
  )
}

export async function approveBorrow(id) {
  return request(
    `${API_URL}/api/borrows/${encodeURIComponent(id)}/approve`,
    { method: 'POST' },
    'Không thể duyệt yêu cầu mượn'
  )
}

export async function rejectBorrow(id) {
  return request(
    `${API_URL}/api/borrows/${encodeURIComponent(id)}/reject`,
    { method: 'POST' },
    'Không thể từ chối yêu cầu mượn'
  )
}

export async function handoverBorrow(id) {
  return request(
    `${API_URL}/api/borrows/${encodeURIComponent(id)}/handover`,
    { method: 'POST' },
    'Không thể xác nhận giao sách'
  )
}