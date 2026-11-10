const API_URL = 'http://localhost:8080/api/admin'

function getHeaders() {
  const token = localStorage.getItem('accessToken')
  const tokenType = localStorage.getItem('tokenType') || 'Bearer'

  if (!token) {
    throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `${tokenType} ${token}`,
  }
}

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...getHeaders(),
      ...options.headers,
    },
  })

  if (response.status === 204) {
    return null
  }

  const text = await response.text()
  let payload = null

  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = null
    }
  }

  if (!response.ok) {
    const message =
      payload?.message ||
      payload?.error ||
      text ||
      `Yêu cầu thất bại (HTTP ${response.status}).`

    const error = new Error(message)
    error.status = response.status
    error.code = payload?.code
    throw error
  }

  if (!text) return null
  return payload ?? text
}

export function getPermissionOptions() {
  return request('/permissions')
}

export function getPermissionGroups() {
  return request('/permission-groups')
}

export function getDeletedPermissionGroups() {
  return request('/permission-groups/trash')
}

export function createPermissionGroup(data) {
  return request('/permission-groups', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updatePermissionGroup(id, data) {
  return request(`/permission-groups/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export function deletePermissionGroup(id) {
  return request(`/permission-groups/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

export function restorePermissionGroup(id) {
  return request(
    `/permission-groups/${encodeURIComponent(id)}/restore`,
    { method: 'PUT' }
  )
}

// API riêng cho chức năng gán người dùng vào nhóm quyền.
// Backend loại tài khoản ROLE_ADMIN khỏi kết quả.
export function getAdminUsers({
  keyword = '',
  page = 0,
  size = 8,
} = {}) {
  const params = new URLSearchParams({
    keyword: keyword.trim(),
    page: String(Math.max(0, page)),
    size: String(Math.max(1, size)),
  })

  return request(`/permission-groups/users?${params.toString()}`)
}

export function assignUsersToGroup(groupId, userIds) {
  return request(
    `/permission-groups/${encodeURIComponent(groupId)}/users`,
    {
      method: 'POST',
      body: JSON.stringify({ userIds }),
    }
  )
}

export function removeUserFromGroup(groupId, userId) {
  return request(
    `/permission-groups/${encodeURIComponent(groupId)}/users/${encodeURIComponent(userId)}`,
    { method: 'DELETE' }
  )
}