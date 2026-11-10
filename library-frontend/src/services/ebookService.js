
import { fetchWithAuth } from './authSession'

const API_URL = 'http://localhost:8080'

async function parse(response, fallback) {
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
        : null

    const error = new Error(
      message ||
        fallback ||
        `Yêu cầu thất bại (${response.status}).`
    )

    error.status = response.status
    throw error
  }

  return data
}

export async function getEbooks() {
  const response = await fetchWithAuth(
    `${API_URL}/api/ebooks`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    }
  )

  const data = await parse(
    response,
    'Không thể tải danh sách ebook.'
  )

  return Array.isArray(data) ? data : []
}

export async function borrowEbook(bookId) {
  const response = await fetchWithAuth(
    `${API_URL}/api/borrows/me/ebooks?bookId=${encodeURIComponent(bookId)}`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
      },
    }
  )

  return parse(response, 'Không thể mượn ebook.')
}

export async function returnEbook(recordId) {
  const response = await fetchWithAuth(
    `${API_URL}/api/borrows/${encodeURIComponent(recordId)}/return-online`,
    {
      method: 'PUT',
      headers: {
        Accept: 'application/json',
      },
    }
  )

  return parse(response, 'Không thể kết thúc lượt đọc.')
}

export async function openEbookPdf(bookId) {
  const response = await fetchWithAuth(
    `${API_URL}/api/ebooks/books/${encodeURIComponent(bookId)}/content`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/pdf',
      },
    }
  )

  if (!response.ok) {
    const text = await response.text()
    let data = null

    try {
      data = text ? JSON.parse(text) : null
    } catch {
      data = null
    }

    throw new Error(
      data?.message ||
        data?.error ||
        'Không thể mở PDF. Hãy kiểm tra quyền đọc còn hạn.'
    )
  }

  return URL.createObjectURL(await response.blob())
}

export async function uploadEbookPdf(bookId, file) {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetchWithAuth(
    `${API_URL}/api/ebooks/books/${encodeURIComponent(bookId)}/file`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
      },
      body: formData,
    }
  )

  return parse(response, 'Không thể tải PDF lên.')
}
