
import { fetchWithAuth } from './authSession'

const API_URL = 'http://localhost:8080'

async function readResponse(response) {
  const text = await response.text()
  let data = null

  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = { message: text }
    }
  }

  if (!response.ok) {
    const error = new Error(
      data?.message ||
        data?.error ||
        `Yêu cầu cấu hình hệ thống thất bại (HTTP ${response.status}).`
    )

    error.status = response.status
    error.code = data?.code
    throw error
  }

  return data
}

/** Lấy trạng thái chế độ bảo trì từ backend. */
export async function getMaintenanceStatus() {
  const response = await fetchWithAuth(
    `${API_URL}/api/configs/maintenance`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    }
  )

  const data = await readResponse(response)

  if (typeof data !== 'boolean') {
    throw new Error(
      'Backend trả về trạng thái bảo trì không hợp lệ.'
    )
  }

  return data
}

/** Cập nhật chế độ bảo trì thông qua tham số query status. */
export async function setMaintenanceStatus(status) {
  if (typeof status !== 'boolean') {
    throw new TypeError(
      'Trạng thái bảo trì phải là true hoặc false.'
    )
  }

  const response = await fetchWithAuth(
    `${API_URL}/api/configs/maintenance?status=${status}`,
    {
      method: 'PUT',
      headers: {
        Accept: 'application/json',
      },
    }
  )

  return readResponse(response)
}
