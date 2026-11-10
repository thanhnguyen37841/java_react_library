
import { useCallback, useEffect, useState } from 'react'

import {
  getMaintenanceStatus,
  setMaintenanceStatus,
} from '../../../services/systemConfigService'

function SystemSettingsPage({ onToast }) {
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [savedMode, setSavedMode] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [loadError, setLoadError] = useState('')

  const loadSettings = useCallback(async () => {
    setIsLoading(true)
    setLoadError('')

    try {
      const currentStatus = await getMaintenanceStatus()

      setMaintenanceMode(currentStatus)
      setSavedMode(currentStatus)
    } catch (error) {
      setLoadError(
        error.message || 'Không thể tải cấu hình hệ thống.'
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  const handleSave = async () => {
    if (maintenanceMode === savedMode || isSaving) {
      return
    }

    const action = maintenanceMode ? 'BẬT' : 'TẮT'

    const confirmed = window.confirm(
      `Bạn có chắc muốn ${action} chế độ bảo trì?\n\n` +
        (maintenanceMode
          ? 'Các API thông thường sẽ bị chặn trong thời gian bảo trì. Chỉ các API được backend cho phép mới tiếp tục hoạt động.'
          : 'Hệ thống sẽ tiếp tục phục vụ các API thông thường.')
    )

    if (!confirmed) {
      return
    }

    setIsSaving(true)

    try {
      await setMaintenanceStatus(maintenanceMode)

      setSavedMode(maintenanceMode)

      onToast?.(
        maintenanceMode
          ? 'Đã bật chế độ bảo trì.'
          : 'Đã tắt chế độ bảo trì.',
        'success'
      )
    } catch (error) {
      // Khôi phục lựa chọn đã lưu để tránh hiển thị
      // trạng thái chưa được backend chấp nhận.
      setMaintenanceMode(savedMode)

      onToast?.(
        error.message || 'Không thể cập nhật cấu hình hệ thống.',
        'error'
      )
    } finally {
      setIsSaving(false)
    }
  }

  const isDirty = maintenanceMode !== savedMode

  const styles = {
    page: {
      maxWidth: 980,
      margin: '0 auto',
      padding: '8px 0 32px',
    },
    header: {
      marginBottom: 24,
    },
    eyebrow: {
      display: 'inline-block',
      color: '#64748b',
      fontSize: 12,
      fontWeight: 700,
      letterSpacing: '0.09em',
      marginBottom: 8,
    },
    title: {
      margin: '0 0 8px',
      color: '#0f172a',
      fontSize: 28,
    },
    subtitle: {
      margin: 0,
      color: '#64748b',
      lineHeight: 1.6,
    },
    card: {
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: 14,
      padding: 24,
      boxShadow: '0 4px 18px rgba(15, 23, 42, 0.04)',
    },
    cardHeader: {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 16,
      flexWrap: 'wrap',
      marginBottom: 18,
    },
    cardTitle: {
      margin: '0 0 6px',
      fontSize: 18,
      color: '#0f172a',
    },
    description: {
      margin: 0,
      color: '#64748b',
      lineHeight: 1.6,
    },
    status: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      borderRadius: 999,
      padding: '7px 12px',
      fontWeight: 700,
      fontSize: 13,
      background: maintenanceMode ? '#fff1f2' : '#ecfdf5',
      color: maintenanceMode ? '#be123c' : '#047857',
      whiteSpace: 'nowrap',
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: maintenanceMode ? '#e11d48' : '#10b981',
    },
    option: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 14,
      padding: '18px 0',
      borderTop: '1px solid #e2e8f0',
    },
    checkbox: {
      width: 19,
      height: 19,
      marginTop: 3,
      accentColor: '#2563eb',
    },
    optionTitle: {
      display: 'block',
      color: '#0f172a',
      fontWeight: 700,
      marginBottom: 5,
    },
    optionDescription: {
      display: 'block',
      color: '#64748b',
      lineHeight: 1.6,
      fontSize: 14,
    },
    warning: {
      background: '#fffbeb',
      border: '1px solid #fde68a',
      color: '#92400e',
      padding: '12px 14px',
      borderRadius: 10,
      marginTop: 12,
      lineHeight: 1.6,
      fontSize: 14,
    },
    error: {
      background: '#fff1f2',
      border: '1px solid #fecdd3',
      color: '#9f1239',
      padding: 14,
      borderRadius: 10,
      marginBottom: 16,
    },
    footer: {
      display: 'flex',
      justifyContent: 'flex-end',
      alignItems: 'center',
      gap: 12,
      flexWrap: 'wrap',
      marginTop: 22,
    },
    button: {
      border: 0,
      borderRadius: 9,
      padding: '11px 17px',
      fontWeight: 700,
      fontSize: 14,
      cursor: 'pointer',
    },
  }

  return (
    <section style={styles.page}>
      <header style={styles.header}>
        <span style={styles.eyebrow}>ADMINISTRATION</span>

        <h1 style={styles.title}>Cài đặt hệ thống</h1>

        <p style={styles.subtitle}>
          Quản lý trạng thái vận hành của hệ thống thư viện.
          Cấu hình được lưu ở backend và dùng chung cho các
          phiên truy cập.
        </p>
      </header>

      {loadError && (
        <div role="alert" style={styles.error}>
          <strong>Không tải được cấu hình.</strong>

          <div style={{ marginTop: 5 }}>
            {loadError}
          </div>

          <button
            type="button"
            onClick={loadSettings}
            style={{
              ...styles.button,
              marginTop: 12,
              background: '#e2e8f0',
              color: '#0f172a',
            }}
          >
            Thử tải lại
          </button>
        </div>
      )}

      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <div>
            <h2 style={styles.cardTitle}>
              Chế độ bảo trì
            </h2>

            <p style={styles.description}>
              Khi bật, backend sẽ từ chối các API thông thường
              bằng HTTP 503 theo chính sách của bộ lọc bảo trì.
            </p>
          </div>

          {!isLoading && !loadError && (
            <span style={styles.status}>
              <span style={styles.dot} />
              {maintenanceMode
                ? 'Đang bảo trì'
                : 'Đang hoạt động'}
            </span>
          )}
        </div>

        {isLoading ? (
          <p role="status" style={styles.description}>
            Đang tải cấu hình...
          </p>
        ) : !loadError ? (
          <>
            <label style={styles.option}>
              <input
                type="checkbox"
                checked={maintenanceMode}
                onChange={(event) =>
                  setMaintenanceMode(event.target.checked)
                }
                disabled={isSaving}
                style={styles.checkbox}
              />

              <span>
                <span style={styles.optionTitle}>
                  Bật chế độ bảo trì
                </span>

                <span style={styles.optionDescription}>
                  Chỉ chọn khi cần tạm dừng các chức năng
                  thông thường để bảo trì hoặc cập nhật hệ thống.
                </span>
              </span>
            </label>

            {maintenanceMode && (
              <div style={styles.warning}>
                <strong>Lưu ý:</strong> Sau khi lưu, người dùng
                có thể không truy cập được các API thông thường.
                Hãy bảo đảm bạn có quyền cập nhật cấu hình để
                có thể tắt chế độ bảo trì.
              </div>
            )}

            <div style={styles.footer}>
              <button
                type="button"
                onClick={() => setMaintenanceMode(savedMode)}
                disabled={!isDirty || isSaving}
                style={{
                  ...styles.button,
                  background: '#f1f5f9',
                  color: '#334155',
                  opacity:
                    !isDirty || isSaving ? 0.55 : 1,
                }}
              >
                Hủy thay đổi
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={!isDirty || isSaving}
                style={{
                  ...styles.button,
                  background: '#2563eb',
                  color: '#fff',
                  opacity:
                    !isDirty || isSaving ? 0.55 : 1,
                }}
              >
                {isSaving ? 'Đang lưu...' : 'Lưu cấu hình'}
              </button>
            </div>
          </>
        ) : null}
      </div>
    </section>
  )
}

export default SystemSettingsPage
