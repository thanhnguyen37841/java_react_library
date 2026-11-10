import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchWithAuth } from '../../../services/authSession'
import '../../../styles/admin-dashboard.css'

const API_BASE_URL = 'http://localhost:8080'

const numberFormatter = new Intl.NumberFormat('vi-VN')

const shortcuts = [
  {
    title: 'Quản lý sách',
    description: 'Quản lý đầu sách, ISBN, lần tái bản, danh mục và số lượng.',
    path: '/admin/books',
    icon: '▤',
    category: 'DỮ LIỆU THƯ VIỆN',
    color: 'blue',
  },
  {
    title: 'Sách điện tử',
    description: 'Quản lý tài liệu điện tử và thông tin các tệp sách.',
    path: '/admin/ebooks',
    icon: '▧',
    category: 'TÀI NGUYÊN SỐ',
    color: 'cyan',
  },
  {
    title: 'Thành viên',
    description: 'Tra cứu thông tin độc giả và hồ sơ thành viên.',
    path: '/admin/members',
    icon: '♙',
    category: 'NGƯỜI DÙNG',
    color: 'green',
  },
  {
    title: 'Mượn / Trả sách',
    description: 'Theo dõi phiếu mượn và tình trạng trả sách.',
    path: '/admin/borrows',
    icon: '⇄',
    category: 'NGHIỆP VỤ',
    color: 'orange',
  },
  {
    title: 'Phân quyền',
    description: 'Kiểm soát quyền truy cập và chức năng được phép sử dụng.',
    path: '/admin/permissions',
    icon: '♧',
    category: 'BẢO MẬT',
    color: 'purple',
  },
  {
    title: 'Nhóm quyền',
    description: 'Tổ chức các quyền theo nhóm để thuận tiện quản lý.',
    path: '/admin/permission-groups',
    icon: '▦',
    category: 'BẢO MẬT',
    color: 'pink',
  },
  {
    title: 'Cài đặt hệ thống',
    description: 'Quản lý thiết lập và trạng thái hoạt động của hệ thống.',
    path: '/admin/settings',
    icon: '⚙',
    category: 'HỆ THỐNG',
    color: 'slate',
  },
]

const statDefinitions = [
  {
    key: 'totalBookTitles',
    label: 'Tổng đầu sách',
    description: 'Đầu sách đang hoạt động',
    icon: '▤',
    color: 'blue',
    path: '/admin/books',
  },
  {
    key: 'totalBookCopies',
    label: 'Tổng bản sách',
    description: 'Tổng số bản trong kho',
    icon: '▥',
    color: 'cyan',
    path: '/admin/books',
  },
  {
    key: 'availableCopies',
    label: 'Sẵn sàng cho mượn',
    description: 'Số bản hiện còn',
    icon: '✓',
    color: 'green',
    path: '/admin/books',
  },
  {
    key: 'outOfStockTitles',
    label: 'Đầu sách hết hàng',
    description: 'Không còn bản khả dụng',
    icon: '!',
    color: 'orange',
    path: '/admin/books',
  },
  {
    key: 'totalMembers',
    label: 'Thành viên',
    description: 'Hồ sơ đang hoạt động',
    icon: '♙',
    color: 'purple',
    path: '/admin/members',
  },
  {
    key: 'verifiedMembers',
    label: 'Đã xác minh',
    description: 'Tài khoản đã xác minh',
    icon: '✓',
    color: 'teal',
    path: '/admin/members',
  },
  {
    key: 'newMembersLast30Days',
    label: 'Thành viên mới',
    description: 'Đăng ký trong 30 ngày qua',
    icon: '+',
    color: 'pink',
    path: '/admin/members',
  },
]

const borrowStatusDefinitions = [
  {
    key: 'pendingRequests',
    label: 'Chờ xử lý',
    color: 'pending',
    description: 'Phiếu cần được xử lý',
  },
  {
    key: 'currentlyBorrowed',
    label: 'Đang mượn',
    color: 'borrowed',
    description: 'Phiếu đang trong thời gian mượn',
  },
  {
    key: 'overdueRecords',
    label: 'Quá hạn',
    color: 'overdue',
    description: 'Phiếu cần kiểm tra',
  },
  {
    key: 'returnedRecords',
    label: 'Đã trả',
    color: 'returned',
    description: 'Phiếu đã hoàn tất',
  },
]

const allStatKeys = [
  ...statDefinitions.map((item) => item.key),
  'totalBorrowRecords',
  ...borrowStatusDefinitions.map((item) => item.key),
]

function normalizeStats(payload) {
  const source =
    payload?.data && typeof payload.data === 'object'
      ? payload.data
      : payload

  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    throw new Error('Dữ liệu thống kê từ Backend không hợp lệ.')
  }

  const normalized = {}

  for (const field of allStatKeys) {
    const value = source[field]

    if (value === null || value === undefined || value === '') {
      normalized[field] = null
      continue
    }

    const number = Number(value)

    normalized[field] =
      Number.isFinite(number) && number >= 0 ? number : null
  }

  return normalized
}

function getErrorMessage(response, payload) {
  if (payload && typeof payload === 'object') {
    if (payload.message) return payload.message
    if (payload.error) return payload.error
  }

  if (response.status === 401) {
    return 'Phiên đăng nhập không còn hợp lệ. Vui lòng đăng nhập lại.'
  }

  if (response.status === 403) {
    return 'Tài khoản hiện tại không có quyền xem thống kê quản trị.'
  }

  return `Không thể tải thống kê (HTTP ${response.status}).`
}

function formatNumber(value) {
  return value === null || value === undefined
    ? '—'
    : numberFormatter.format(value)
}

function StatCard({ item, value, onNavigate }) {
  return (
    <button
      type="button"
      className="admin-dashboard-v2__stat-card"
      onClick={() => onNavigate(item.path)}
    >
      <span
        className={`admin-dashboard-v2__stat-icon admin-dashboard-v2__stat-icon--${item.color}`}
        aria-hidden="true"
      >
        {item.icon}
      </span>

      <span className="admin-dashboard-v2__stat-label">
        {item.label}
      </span>

      <strong className="admin-dashboard-v2__stat-value">
        {formatNumber(value)}
      </strong>

      <span className="admin-dashboard-v2__stat-description">
        {item.description}
      </span>

      <span className="admin-dashboard-v2__stat-link">
        Xem chi tiết <span aria-hidden="true">→</span>
      </span>
    </button>
  )
}

function escapeCsvValue(value) {
  let text = value === null || value === undefined ? '' : String(value)

  // Tránh CSV thực thi công thức khi mở bằng Excel.
  if (/^[\s]*[=+\-@]/.test(text)) {
    text = `'${text}`
  }

  return `"${text.replace(/"/g, '""')}"`
}

function PanelHeading({ eyebrow, title, description, action }) {
  return (
    <div className="admin-dashboard-v2__panel-heading">
      <div>
        {eyebrow && (
          <span className="admin-dashboard-v2__panel-eyebrow">
            {eyebrow}
          </span>
        )}

        <h3>{title}</h3>

        {description && <p>{description}</p>}
      </div>

      {action}
    </div>
  )
}

function BorrowStatusChart({ stats, onNavigate }) {
  const items = useMemo(
    () =>
      borrowStatusDefinitions.map((item) => ({
        ...item,
        value: stats?.[item.key] ?? null,
      })),
    [stats]
  )

  const knownItems = items.filter((item) => item.value !== null)

  const knownTotal = knownItems.reduce(
    (sum, item) => sum + item.value,
    0
  )

  const hasData = knownItems.length > 0 && knownTotal > 0

  const colorMap = {
    pending: '#d99a27',
    borrowed: '#3984ed',
    overdue: '#e05252',
    returned: '#19a67a',
  }

  let accumulatedPercentage = 0

  const gradientSegments = hasData
    ? knownItems.map((item) => {
        const start = accumulatedPercentage
        const percentage = (item.value / knownTotal) * 100

        accumulatedPercentage += percentage

        return `${colorMap[item.color]} ${start}% ${accumulatedPercentage}%`
      })
    : []

  const donutStyle = hasData
    ? {
        background: `conic-gradient(${gradientSegments.join(', ')})`,
      }
    : undefined

  return (
    <section className="admin-dashboard-v2__panel">
      <PanelHeading
        eyebrow="LOAN ANALYTICS"
        title="Tình trạng mượn / trả"
        description="Phân bổ các nhóm trạng thái theo dữ liệu Backend."
        action={
          <button
            type="button"
            className="admin-dashboard-v2__text-button"
            onClick={() => onNavigate('/admin/borrows')}
          >
            Quản lý phiếu <span aria-hidden="true">→</span>
          </button>
        }
      />

      <div className="admin-dashboard-v2__donut-layout">
        <div
          className={`admin-dashboard-v2__donut ${
            hasData ? '' : 'admin-dashboard-v2__donut--empty'
          }`}
          style={donutStyle}
          role="img"
          aria-label={
            hasData
              ? `Biểu đồ phân bổ ${formatNumber(knownTotal)} bản ghi có trạng thái`
              : 'Chưa có dữ liệu trạng thái để vẽ biểu đồ'
          }
        >
          <div className="admin-dashboard-v2__donut-hole">
            <strong>{hasData ? formatNumber(knownTotal) : '—'}</strong>
            <span>Bản ghi đã biết</span>
          </div>
        </div>

        <div className="admin-dashboard-v2__legend">
          {items.map((item) => {
            const percentage =
              item.value !== null && knownTotal > 0
                ? (item.value / knownTotal) * 100
                : null

            return (
              <button
                type="button"
                key={item.key}
                className="admin-dashboard-v2__legend-item"
                onClick={() => onNavigate('/admin/borrows')}
              >
                <span
                  className={`admin-dashboard-v2__status-dot admin-dashboard-v2__status-dot--${item.color}`}
                />

                <span className="admin-dashboard-v2__legend-name">
                  {item.label}
                </span>

                <strong>{formatNumber(item.value)}</strong>

                <span className="admin-dashboard-v2__legend-percent">
                  {percentage === null
                    ? '—'
                    : `${percentage.toFixed(1)}%`}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <p className="admin-dashboard-v2__chart-note">
        Tỷ lệ được tính trên tổng các nhóm có dữ liệu. Nếu Backend
        tính phiếu quá hạn đồng thời trong nhóm đang mượn, các nhóm
        có thể chồng lấn và tổng không đại diện cho số phiếu duy nhất.
      </p>
    </section>
  )
}

function InventoryChart({ stats, onNavigate }) {
  const items = [
    {
      key: 'totalBookTitles',
      label: 'Đầu sách',
      color: 'blue',
    },
    {
      key: 'totalBookCopies',
      label: 'Tổng bản sách',
      color: 'cyan',
    },
    {
      key: 'availableCopies',
      label: 'Bản còn khả dụng',
      color: 'green',
    },
    {
      key: 'outOfStockTitles',
      label: 'Đầu sách hết hàng',
      color: 'orange',
    },
  ].map((item) => ({
    ...item,
    value: stats?.[item.key] ?? null,
  }))

  const maxValue = Math.max(
    1,
    ...items.map((item) => item.value ?? 0)
  )

  return (
    <section className="admin-dashboard-v2__panel">
      <PanelHeading
        eyebrow="COLLECTION OVERVIEW"
        title="Tổng quan kho sách"
        description="So sánh các chỉ số kho sách hiện có."
        action={
          <button
            type="button"
            className="admin-dashboard-v2__text-button"
            onClick={() => onNavigate('/admin/books')}
          >
            Xem kho sách <span aria-hidden="true">→</span>
          </button>
        }
      />

      <div className="admin-dashboard-v2__bar-chart">
        {items.map((item) => {
          const percentage =
            item.value === null ? 0 : (item.value / maxValue) * 100

          return (
            <div className="admin-dashboard-v2__bar-row" key={item.key}>
              <div className="admin-dashboard-v2__bar-topline">
                <span>{item.label}</span>
                <strong>{formatNumber(item.value)}</strong>
              </div>

              <div
                className="admin-dashboard-v2__bar-track"
                role="img"
                aria-label={`${item.label}: ${formatNumber(item.value)}`}
              >
                <div
                  className={`admin-dashboard-v2__bar-fill admin-dashboard-v2__bar-fill--${item.color}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      <div className="admin-dashboard-v2__inventory-footer">
        <div>
          <span>Tỷ lệ bản sách còn khả dụng</span>
          <strong>
            {stats?.totalBookCopies > 0 &&
            stats?.availableCopies !== null &&
            stats?.availableCopies !== undefined
              ? `${(
                  (stats.availableCopies / stats.totalBookCopies) *
                  100
                ).toFixed(1)}%`
              : '—'}
          </strong>
        </div>

        <span
          className="admin-dashboard-v2__inventory-icon"
          aria-hidden="true"
        >
          ▤
        </span>
      </div>
    </section>
  )
}

function MembersSummary({ stats, onNavigate }) {
  const total = stats?.totalMembers
  const verified = stats?.verifiedMembers
  const newMembers = stats?.newMembersLast30Days

  const verifiedPercentage =
    total > 0 && verified !== null && verified !== undefined
      ? Math.min(100, (verified / total) * 100)
      : null

  return (
    <section className="admin-dashboard-v2__panel admin-dashboard-v2__member-panel">
      <PanelHeading
        eyebrow="MEMBER OVERVIEW"
        title="Tình hình thành viên"
        description="Tổng hợp hồ sơ và tài khoản đã xác minh."
        action={
          <button
            type="button"
            className="admin-dashboard-v2__text-button"
            onClick={() => onNavigate('/admin/members')}
          >
            Xem thành viên <span aria-hidden="true">→</span>
          </button>
        }
      />

      <div className="admin-dashboard-v2__member-numbers">
        <div>
          <span>Tổng thành viên</span>
          <strong>{formatNumber(total)}</strong>
        </div>

        <div>
          <span>Đã xác minh</span>
          <strong>{formatNumber(verified)}</strong>
        </div>

        <div>
          <span>Thành viên mới</span>
          <strong>{formatNumber(newMembers)}</strong>
          <small>Trong 30 ngày qua</small>
        </div>
      </div>

      <div className="admin-dashboard-v2__member-progress">
        <div className="admin-dashboard-v2__bar-topline">
          <span>Tỷ lệ xác minh</span>
          <strong>
            {verifiedPercentage === null
              ? '—'
              : `${verifiedPercentage.toFixed(1)}%`}
          </strong>
        </div>

        <div className="admin-dashboard-v2__bar-track">
          <div
            className="admin-dashboard-v2__bar-fill admin-dashboard-v2__bar-fill--purple"
            style={{
              width: `${verifiedPercentage ?? 0}%`,
            }}
          />
        </div>
      </div>
    </section>
  )
}

function AdminDashboard({
  onNavigate,
  email,
  permissions = [],
  isAdmin = false,
}) {
  const permissionSet = useMemo(
    () => new Set(Array.isArray(permissions) ? permissions : []),
    [permissions]
  )

  const canReadReport = isAdmin || permissionSet.has('REPORT_READ')
  const canExportReport = isAdmin || permissionSet.has('REPORT_EXPORT')

  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)

  const accountEmail =
    typeof email === 'string' && email.trim() ? email.trim() : ''

  const displayName = accountEmail
    ? accountEmail.split('@')[0]
    : 'bạn'

  const currentDate = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date())

  const openModule = useCallback(
    (path) => {
      if (typeof onNavigate === 'function') {
        onNavigate(path)
      }
    },
    [onNavigate]
  )

  const loadDashboardStats = useCallback(async (signal) => {
    setLoading(true)
    setError('')

    try {
      const response = await fetchWithAuth(
        `${API_BASE_URL}/api/admin/dashboard/stats`,
        {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
          ...(signal ? { signal } : {}),
        }
      )

      let payload = null

      try {
        payload = await response.json()
      } catch {
        // Response không phải JSON sẽ được xử lý bên dưới.
      }

      if (!response.ok) {
        throw new Error(getErrorMessage(response, payload))
      }

      const normalized = normalizeStats(payload)

      setStats(normalized)
      setLastUpdated(new Date())
    } catch (requestError) {
      if (requestError?.name === 'AbortError') return

      setError(
        requestError?.message ||
          'Đã xảy ra lỗi khi tải dữ liệu Dashboard.'
      )
    } finally {
      if (!signal?.aborted) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    if (!canReadReport) {
      setStats(null)
      setLoading(false)
      setError('')
      return
    }

    const controller = new AbortController()

    loadDashboardStats(controller.signal)

    return () => controller.abort()
  }, [canReadReport, loadDashboardStats])

  const handleExportReportCsv = useCallback(() => {
  if (!canExportReport) {
    setError('Bạn không có quyền xuất báo cáo (REPORT_EXPORT).')
    return
  }

  if (!stats) {
    setError('Chưa có dữ liệu thống kê để xuất báo cáo.')
    return
  }

  const reportDefinitions = [
    ...statDefinitions,
    {
      key: 'totalBorrowRecords',
      label: 'Tổng phiếu mượn',
      description: 'Tổng số phiếu mượn',
    },
    ...borrowStatusDefinitions,
  ]

  const headers = ['Chỉ số', 'Giá trị', 'Mô tả']

  const rows = reportDefinitions.map((item) => [
    item.label,
    stats[item.key] ?? '',
    item.description || '',
  ])

  const csvContent = [
    headers.map(escapeCsvValue).join(','),
    ...rows.map((row) => row.map(escapeCsvValue).join(',')),
  ].join('\r\n')

  const blob = new Blob(['\uFEFF' + csvContent], {
    type: 'text/csv;charset=utf-8;',
  })

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = `bao-cao-thu-vien-${new Date()
    .toISOString()
    .slice(0, 10)}.csv`

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  window.setTimeout(() => URL.revokeObjectURL(url), 1000)

  setError('')
}, [canExportReport, stats])

  if (!canReadReport) {
    return (
      <div className="admin-dashboard">
        <div className="members-table-card members-empty">
          Tài khoản của bạn không có quyền xem thống kê báo cáo (REPORT_READ).
        </div>
      </div>
    )
  }

  const missingRequiredStats =
    stats &&
    statDefinitions.some((item) => stats[item.key] === null)

  const overdueCount = stats?.overdueRecords ?? null

  return (
    <section className="admin-dashboard-v2">
      <header className="admin-dashboard-v2__heading">
        <div>
          <div className="admin-dashboard-v2__eyebrow">
            <span className="admin-dashboard-v2__eyebrow-dot" />
            TRUNG TÂM ĐIỀU HÀNH
          </div>

          <h1>Tổng quan thư viện</h1>

          <p>
            Theo dõi hoạt động, tình hình kho sách và các nghiệp vụ
            quản trị tại một nơi.
          </p>
        </div>

        <div className="admin-dashboard-v2__date">
          <span
            className="admin-dashboard-v2__date-icon"
            aria-hidden="true"
          >
            ▦
          </span>

          <div>
            <span>HÔM NAY</span>
            <strong>{currentDate}</strong>
          </div>
        </div>
      </header>

      <section className="admin-dashboard-v2__hero">
        <div className="admin-dashboard-v2__hero-content">
          <span className="admin-dashboard-v2__hero-label">
            LIBRARY MANAGEMENT SYSTEM
          </span>

          <h2>
            Xin chào, {displayName}!
            <span aria-hidden="true"> 👋</span>
          </h2>

          <p>
            Chào mừng bạn đến với hệ thống quản trị thư viện. Theo dõi
            các chỉ số vận hành hoặc chọn một phân hệ để bắt đầu công việc.
          </p>

          <button
            type="button"
            className="admin-dashboard-v2__primary-button"
            onClick={() => openModule('/admin/books')}
          >
            <span>Đi đến quản lý sách</span>
            <span aria-hidden="true">→</span>
          </button>
        </div>

        <div className="admin-dashboard-v2__hero-art" aria-hidden="true">
          <div className="admin-dashboard-v2__art-circle admin-dashboard-v2__art-circle--outer" />
          <div className="admin-dashboard-v2__art-circle admin-dashboard-v2__art-circle--inner" />

          <div className="admin-dashboard-v2__book admin-dashboard-v2__book--back">
            <span />
          </div>

          <div className="admin-dashboard-v2__book admin-dashboard-v2__book--middle">
            <span />
          </div>

          <div className="admin-dashboard-v2__book admin-dashboard-v2__book--front">
            <span />
            <span />
            <span />
          </div>

          <div className="admin-dashboard-v2__art-spark admin-dashboard-v2__art-spark--one">
            ✦
          </div>

          <div className="admin-dashboard-v2__art-spark admin-dashboard-v2__art-spark--two">
            ✧
          </div>
        </div>
      </section>

      <section className="admin-dashboard-v2__statistics">
        <div className="admin-dashboard-v2__section-heading">
          <div>
            <span>LIVE OVERVIEW</span>
            <h2>Chỉ số hệ thống</h2>

            <p>
              Dữ liệu được tải từ API thống kê của Backend.
              {lastUpdated && (
                <span className="admin-dashboard-v2__updated">
                  {' '}
                  Cập nhật lúc{' '}
                  {lastUpdated.toLocaleTimeString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
              )}
            </p>
          </div>

          <div className="admin-dashboard-v2__dashboard-actions">
            {canExportReport && (
              <button
                type="button"
                className="btn-export-report"
                onClick={handleExportReportCsv}
                disabled={loading || !stats}
              >
                Xuất báo cáo (CSV)
              </button>
            )}

            <button
              type="button"
              className="admin-dashboard-v2__refresh-button"
              onClick={() => loadDashboardStats()}
              disabled={loading}
            >
              <span aria-hidden="true">↻</span>
              {loading ? 'Đang tải...' : 'Làm mới'}
            </button>
          </div>
        </div>

        {error && (
          <div className="admin-dashboard-v2__error" role="alert">
            <span aria-hidden="true">!</span>

            <div>
              <strong>Không thể tải thống kê</strong>
              <p>{error}</p>

              <button
                type="button"
                onClick={() => loadDashboardStats()}
                disabled={loading}
              >
                Thử lại
              </button>
            </div>
          </div>
        )}

        {loading && !stats ? (
          <div className="admin-dashboard-v2__loading" role="status">
            <span className="admin-dashboard-v2__spinner" />
            <span>Đang tải dữ liệu Dashboard...</span>
          </div>
        ) : (
          <>
            {missingRequiredStats && (
              <p className="admin-dashboard-v2__partial-note">
                Một số trường thống kê chưa có trong response API.
                Các giá trị chưa nhận được sẽ hiển thị bằng dấu —.
              </p>
            )}

            <div className="admin-dashboard-v2__stats-grid">
              {statDefinitions.map((item) => (
                <StatCard
                  key={item.key}
                  item={item}
                  value={stats?.[item.key] ?? null}
                  onNavigate={openModule}
                />
              ))}
            </div>

            <div className="admin-dashboard-v2__chart-grid">
              <BorrowStatusChart
                stats={stats}
                onNavigate={openModule}
              />

              <InventoryChart
                stats={stats}
                onNavigate={openModule}
              />
            </div>

            <MembersSummary
              stats={stats}
              onNavigate={openModule}
            />

            <section className="admin-dashboard-v2__alert-panel">
              <div
                className="admin-dashboard-v2__alert-icon"
                aria-hidden="true"
              >
                !
              </div>

              <div className="admin-dashboard-v2__alert-content">
                <strong>Phiếu mượn quá hạn</strong>

                <p>
                  {overdueCount === null
                    ? 'Backend chưa cung cấp số liệu phiếu quá hạn.'
                    : overdueCount === 0
                      ? 'Hiện không có phiếu quá hạn theo dữ liệu thống kê.'
                      : `Hiện có ${formatNumber(
                          overdueCount
                        )} phiếu quá hạn cần kiểm tra.`}
                </p>
              </div>

              <button
                type="button"
                className="admin-dashboard-v2__text-button"
                onClick={() => openModule('/admin/borrows')}
              >
                Kiểm tra phiếu <span aria-hidden="true">→</span>
              </button>
            </section>
          </>
        )}
      </section>

      <section className="admin-dashboard-v2__activity">
        <PanelHeading
          eyebrow="RECENT ACTIVITY"
          title="Hoạt động gần đây"
          description="Khu vực dành cho các sự kiện mới nhất trong hệ thống."
        />

        <div className="admin-dashboard-v2__activity-empty">
          <span
            className="admin-dashboard-v2__activity-empty-icon"
            aria-hidden="true"
          >
            ◷
          </span>

          <div>
            <strong>Chưa có dữ liệu hoạt động gần đây</strong>
            <p>
              API thống kê hiện tại chỉ cung cấp số liệu tổng hợp.
              Để hiển thị chính xác lịch sử mượn, trả, đăng ký thành viên
              và cập nhật dữ liệu, Backend cần cung cấp API hoạt động gần đây.
            </p>
          </div>
        </div>
      </section>

      <section className="admin-dashboard-v2__modules">
        <div className="admin-dashboard-v2__section-heading">
          <div>
            <span>WORKSPACE</span>
            <h2>Phân hệ quản lý</h2>
            <p>Chọn chức năng bạn cần thao tác.</p>
          </div>

          <span className="admin-dashboard-v2__module-count">
            {shortcuts.length} phân hệ
          </span>
        </div>

        <div className="admin-dashboard-v2__grid">
          {shortcuts.map((item) => (
            <button
              type="button"
              className="admin-dashboard-v2__card"
              key={item.path}
              onClick={() => openModule(item.path)}
            >
              <div className="admin-dashboard-v2__card-top">
                <span
                  className={`admin-dashboard-v2__icon admin-dashboard-v2__icon--${item.color}`}
                  aria-hidden="true"
                >
                  {item.icon}
                </span>

                <span
                  className="admin-dashboard-v2__card-arrow"
                  aria-hidden="true"
                >
                  ↗
                </span>
              </div>

              <span className="admin-dashboard-v2__category">
                {item.category}
              </span>

              <strong className="admin-dashboard-v2__card-title">
                {item.title}
              </strong>

              <span className="admin-dashboard-v2__card-description">
                {item.description}
              </span>

              <span className="admin-dashboard-v2__card-link">
                Mở phân hệ <span aria-hidden="true">→</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <aside className="admin-dashboard-v2__notice" role="note">
        <span
          className="admin-dashboard-v2__notice-icon"
          aria-hidden="true"
        >
          i
        </span>

        <div>
          <strong>Thông tin về Dashboard</strong>
          <p>
            Các thẻ và biểu đồ sử dụng số liệu tổng hợp từ Backend.
            Biểu đồ lịch sử theo ngày/tháng và nhật ký hoạt động cần API
            riêng để bảo đảm dữ liệu chính xác.
          </p>
        </div>
      </aside>
    </section>
  )
}

export default AdminDashboard
