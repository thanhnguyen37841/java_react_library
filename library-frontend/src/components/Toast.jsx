import "../styles/Toast.css";



function Toast({ type = 'info', message, onClose }) {
  if (!message) return null

  const icons = {
    success: '✓',
    error: '✕',
    warning: '!',
    info: 'i',
  }

  const titles = {
    success: 'Thành công',
    error: 'Thất bại',
    warning: 'Cảnh báo',
    info: 'Thông báo',
  }

  return (
    <div
      className={`toast toast-${type}`}
      role={type === 'error' ? 'alert' : 'status'}
      aria-live={type === 'error' ? 'assertive' : 'polite'}
    >
      <span className="toast-icon">
        {icons[type] || icons.info}
      </span>

      <div className="toast-content">
        <strong>{titles[type] || titles.info}</strong>
        <p>{message}</p>
      </div>

      <button
        type="button"
        className="toast-close"
        onClick={onClose}
        aria-label="Đóng thông báo"
      >
        ×
      </button>
    </div>
  )
}

export default Toast
