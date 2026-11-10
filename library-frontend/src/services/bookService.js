const API_URL = 'http://localhost:8080'

let refreshPromise = null

function clearAuthData() {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('tokenType')
  localStorage.removeItem('accountEmail')

  window.dispatchEvent(new Event('auth:logout'))
}

async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('refreshToken')

  if (!refreshToken) {
    const error = new Error(
      'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
    )
    error.status = 401
    error.authExpired = true
    clearAuthData()
    throw error
  }

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const response = await fetch(`${API_URL}/auth/refresh-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({ refreshToken }),
        })

        const data = await response.json().catch(() => null)

        if (!response.ok || !data?.accessToken || !data?.refreshToken) {
          const error = new Error(
            data?.message ||
              data?.error ||
              `Làm mới token thất bại (HTTP ${response.status}).`,
          )
          error.status = response.status
          error.authExpired = true
          throw error
        }

        localStorage.setItem('accessToken', data.accessToken)
        localStorage.setItem('refreshToken', data.refreshToken)
        localStorage.setItem('tokenType', data.tokenType || 'Bearer')

        return data.accessToken
      } catch (error) {
        clearAuthData()
        error.status = error.status || 401
        error.authExpired = true
        throw error
      } finally {
        refreshPromise = null
      }
    })()
  }

  return refreshPromise
}

function getAuthHeaders() {
  const accessToken = localStorage.getItem('accessToken')
  const tokenType = localStorage.getItem('tokenType') || 'Bearer'

  if (!accessToken) {
    const error = new Error('Không tìm thấy access token.')
    error.status = 401
    throw error
  }

  return {
    Authorization: `${tokenType} ${accessToken}`,
  }
}

async function sendRequest(url, options = {}) {
  let response

  try {
    response = await fetch(url, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...options.headers,
        ...getAuthHeaders(),
      },
    })
  } catch (cause) {
    const error = new Error(
      'Không thể kết nối Backend. Vui lòng kiểm tra kết nối.',
    )
    error.cause = cause
    throw error
  }

  const responseText = await response.text()
  let data = null

  if (responseText) {
    try {
      data = JSON.parse(responseText)
    } catch {
      data = responseText
    }
  }

  if (!response.ok) {
    const message =
      typeof data === 'object' && data !== null
        ? data.message || data.error
        : null

    const error = new Error(
      message || `Yêu cầu thất bại (HTTP ${response.status}).`,
    )
    error.status = response.status
    error.responseData = data
    throw error
  }

  return data
}

async function request(url, options = {}) {
  const accessToken = localStorage.getItem('accessToken')
  const refreshToken = localStorage.getItem('refreshToken')

  if (!accessToken && !refreshToken) {
    const error = new Error(
      'Phiên đăng nhập không tồn tại. Vui lòng đăng nhập lại.',
    )
    error.status = 401
    error.authExpired = true
    throw error
  }

  if (!accessToken && refreshToken) {
    await refreshAccessToken()
  }

  try {
    return await sendRequest(url, options)
  } catch (error) {
    if (error.status !== 401 || error.authExpired) {
      throw error
    }

    await refreshAccessToken()

    try {
      return await sendRequest(url, options)
    } catch (retryError) {
      if (retryError.status === 401) {
        clearAuthData()
        retryError.authExpired = true
      }

      throw retryError
    }
  }
}

export async function getBooks(
  page = 0,
  keyword = '',
  categoryId = '',
  filters = {},
) {
  const params = new URLSearchParams({
    page: String(page),
    stockStatus: filters.stockStatus || 'ALL',
    isbnStatus: filters.isbnStatus || 'ALL',
    ebookStatus: filters.ebookStatus || 'ALL',
    myBorrowStatus: filters.myBorrowStatus || 'ALL',
    sortBy: filters.sortBy || 'updatedAt',
    sortDir: filters.sortDir || 'desc',
  })

  if (typeof keyword === 'string' && keyword.trim()) {
    params.set('keyword', keyword.trim())
  }

  if (
    categoryId !== '' &&
    categoryId !== null &&
    categoryId !== undefined &&
    categoryId !== 'all'
  ) {
    params.set('categoryId', String(categoryId))
  }

  const optionalFilters = [
    'publisher',
    'language',
    'publicationYearFrom',
    'publicationYearTo',
    'minPageCount',
    'maxPageCount',
  ]

  for (const key of optionalFilters) {
    const value = filters[key]

    if (value !== undefined && value !== null && String(value).trim() !== '') {
      params.set(key, String(value).trim())
    }
  }

  const data = await request(`${API_URL}/api/books?${params.toString()}`)

  if (!data || !Array.isArray(data.content)) {
    throw new Error('Dữ liệu danh sách sách từ Backend không hợp lệ.')
  }

  return {
    books: data.content,
    page: data.number ?? page,
    totalPages: data.totalPages ?? 0,
    totalElements: data.totalElements ?? 0,
  }
}

export async function getBookById(id) {
  return request(`${API_URL}/api/books/${id}`)
}

export async function createBook(book) {
  return request(`${API_URL}/api/books`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(book),
  })
}

export async function updateBook(id, book) {
  return request(`${API_URL}/api/books/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(book),
  })
}

export async function deleteBook(id) {
  return request(`${API_URL}/api/books/${id}`, { method: 'DELETE' })
}

export async function importBooksFromCsv(file) {
  const formData = new FormData()
  formData.append('file', file)

  return request(`${API_URL}/api/books/import`, {
    method: 'POST',
    body: formData,
  })
}

export async function getCategories() {
  const data = await request(`${API_URL}/api/categories`)

  if (!Array.isArray(data)) {
    throw new Error('Dữ liệu danh mục từ Backend không hợp lệ.')
  }

  return data
}

export async function getDeletedBooks() {
  const data = await request(`${API_URL}/api/books/trash`)

  if (!Array.isArray(data)) {
    throw new Error('Dữ liệu thùng rác sách từ Backend không hợp lệ.')
  }

  return data
}

export async function restoreBook(id) {
  return request(`${API_URL}/api/books/${id}/restore`, { method: 'PUT' })
}

export async function uploadBookCover(bookId, file) {
  if (!bookId) {
    throw new Error('Không xác định được ID sách để lưu ảnh bìa.')
  }

  if (!(file instanceof File)) {
    throw new Error('Vui lòng chọn một file ảnh hợp lệ.')
  }

  const formData = new FormData()
  formData.append('file', file)

  return request(
    `${API_URL}/api/books/${encodeURIComponent(bookId)}/cover`,
    {
      method: 'POST',
      body: formData,
    },
  )
}
