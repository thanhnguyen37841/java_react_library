
import { fetchWithAuth } from './authSession'

const API_URL = 'http://localhost:8080'

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
    throw error
  }

  return data
}

async function request(path, options = {}, authenticated = false) {
  const headers = {
    Accept: 'application/json',
    ...(options.headers || {}),
  }

  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] =
      headers['Content-Type'] || 'application/json'
  }

  if (authenticated) {
    const response = await fetchWithAuth(
      `${API_URL}${path}`,
      {
        ...options,
        headers,
      }
    )

    return readResponse(response)
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  })

  return readResponse(response)
}

export function register(data) {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function verifyEmail(token) {
  return request(
    `/auth/verify?token=${encodeURIComponent(token)}`
  )
}

export function forgotPassword(email) {
  return request('/account/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export function resetPassword({
  token,
  newPassword,
  confirmPassword,
}) {
  return request('/account/reset-password', {
    method: 'POST',
    body: JSON.stringify({
      token,
      newPassword,
      confirmPassword,
    }),
  })
}

export function changePassword({
  oldPassword,
  newPassword,
  confirmPassword,
}) {
  return request(
    '/account/change-password',
    {
      method: 'POST',
      body: JSON.stringify({
        oldPassword,
        newPassword,
        confirmPassword,
      }),
    },
    true
  )
}

export function requestChangeEmail(newEmail) {
  return request(
    '/account/change-email',
    {
      method: 'POST',
      body: JSON.stringify({ newEmail }),
    },
    true
  )
}

export function confirmChangeEmail(code) {
  return request(
    '/account/confirm-change-email',
    {
      method: 'POST',
      body: JSON.stringify({ code }),
    },
    true
  )
}
