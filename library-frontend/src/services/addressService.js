
const ADDRESS_API = 'https://www.tinhthanhpho.com/api/v1'

function extractList(payload) {
  const candidates = [
    payload,
    payload?.data,
    payload?.items,
    payload?.results,
    payload?.data?.items,
    payload?.data?.results,
    payload?.provinces,
    payload?.wards,
    payload?.data?.provinces,
    payload?.data?.wards,
  ]

  return candidates.find(Array.isArray) || []
}

function getName(value) {
  if (typeof value === 'string') {
    return value.trim()
  }

  if (!value || typeof value !== 'object') {
    return ''
  }

  return String(
    value.local ||
    value.vi ||
    value.name ||
    value.full_name ||
    value.fullName ||
    ''
  ).trim()
}

function normalizeItems(payload) {
  return extractList(payload)
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null
      }

      const code = String(
        item.code ??
        item.id ??
        item.province_code ??
        item.ward_code ??
        ''
      ).trim()

      const name = getName(item.name ?? item)

      if (!code || !name) {
        return null
      }

      return { code, name }
    })
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name, 'vi'))
}

async function fetchJson(url, signal) {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    signal,
  })

  if (!response.ok) {
    throw new Error(
      `Không tải được danh mục địa chỉ (HTTP ${response.status}).`
    )
  }

  return response.json()
}

export async function getProvinces(signal) {
  const payload = await fetchJson(
    `${ADDRESS_API}/new-provinces?limit=100&page=1`,
    signal
  )

  const provinces = normalizeItems(payload)

  if (provinces.length === 0) {
    throw new Error(
      'Nguồn dữ liệu không trả về danh sách tỉnh/thành phố hợp lệ. ' +
      'Vui lòng thử tải lại hoặc kiểm tra kết nối.'
    )
  }

  return provinces
}

export async function getWards(provinceCode, signal) {
  if (provinceCode === undefined || provinceCode === null || provinceCode === '') {
    return []
  }

  const payload = await fetchJson(
    `${ADDRESS_API}/new-provinces/${encodeURIComponent(provinceCode)}/wards?limit=500&page=1`,
    signal
  )

  const wards = normalizeItems(payload)

  if (wards.length === 0) {
    throw new Error(
      'Nguồn dữ liệu không trả về phường/xã hợp lệ cho tỉnh/thành phố đã chọn.'
    )
  }

  return wards
}
