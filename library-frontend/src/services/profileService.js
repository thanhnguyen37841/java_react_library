
import { fetchWithAuth } from './authSession'

const API_URL = 'http://localhost:8080'

function normalizeDateForApi(value) {
  const date = String(value || '').trim()

  if (!date) return ''

  // Hỗ trợ cả yyyy-MM-dd từ input date và yyyy/MM/dd từ backend.
  const match = date.match(/^(\d{4})[-/](\d{2})[-/](\d{2})$/)

  if (!match) {
    return date
  }

  return `${match[1]}/${match[2]}/${match[3]}`
}

async function readResponse(response) {
  const text = await response.text()
  let data = {}

  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = { message: text }
    }
  }

  if (!response.ok) {
    const error = new Error(
      data.message ||
      data.error ||
      `Yêu cầu thất bại (HTTP ${response.status})`
    )

    error.status = response.status
    error.code = data.code
    error.fieldErrors = data.fieldErrors || null

    throw error
  }

  return data
}

export async function getMyProfile() {
  const response = await fetchWithAuth(
    `${API_URL}/api/members/me`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    }
  )

  return readResponse(response)
}

export async function updateMyProfile(profile) {
  const payload = {
    ...profile,
    fullName: String(profile?.fullName || '').trim(),
    dateOfBirth: normalizeDateForApi(profile?.dateOfBirth),
    phoneNumber: String(profile?.phoneNumber || '').trim(),
    address: String(profile?.address || '').trim(),
  }

  if (payload.address.length > 255) {
    throw new Error('Địa chỉ không được vượt quá 255 ký tự.')
  }

  const response = await fetchWithAuth(
    `${API_URL}/api/members/me`,
    {
      method: 'PUT',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  )

  return readResponse(response)
}
