import { fetchWithAuth } from './authSession'

const API_BASE = 'http://localhost:8080/api/categories'

async function parseJsonSafely(response) {
  const text = await response.text()
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

async function handleResponse(response, fallbackMessage) {
  const data = await parseJsonSafely(response)

  if (!response.ok) {
    throw new Error(
      data?.message || data?.error || fallbackMessage
    )
  }

  return data
}

export async function getCategories() {
  const response = await fetchWithAuth(API_BASE)
  const data = await handleResponse(
    response,
    'Không thể tải danh sách danh mục.'
  )

  return Array.isArray(data) ? data : (data?.content || [])
}

export async function getDeletedCategories() {
  const response = await fetchWithAuth(`${API_BASE}/trash`)
  const data = await handleResponse(
    response,
    'Không thể tải thùng rác danh mục.'
  )

  return Array.isArray(data) ? data : (data?.content || [])
}

export async function createCategory(payload) {
  const response = await fetchWithAuth(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })

  return handleResponse(response, 'Không thể tạo danh mục.')
}

export async function updateCategory(id, payload) {
  const response = await fetchWithAuth(`${API_BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })

  return handleResponse(response, 'Không thể cập nhật danh mục.')
}

export async function deleteCategory(id) {
  const response = await fetchWithAuth(`${API_BASE}/${id}`, {
    method: 'DELETE'
  })

  await handleResponse(response, 'Không thể xóa danh mục.')
  return true
}

export async function restoreCategory(id) {
  const response = await fetchWithAuth(`${API_BASE}/${id}/restore`, {
    method: 'PUT'
  })

  return handleResponse(response, 'Không thể khôi phục danh mục.')
}

export async function permanentlyDeleteCategory(id) {
  const response = await fetchWithAuth(`${API_BASE}/${id}/permanent`, {
    method: 'DELETE'
  })

  await handleResponse(response, 'Không thể xóa vĩnh viễn danh mục.')
  return true
}
export async function getCategoryStatistics() {
  const response = await fetchWithAuth(`${API_BASE}/statistics`)
  const data = await handleResponse(
    response,
    'Không thể tải thống kê danh mục.'
  )

  return Array.isArray(data) ? data : []
}