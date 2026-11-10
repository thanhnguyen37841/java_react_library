
function AdminAccessGuard({
  children,
  isChecking = false,
  allowed = false,
  onNavigate,
}) {
  if (isChecking) {
    return (
      <div className="admin-status">
        Đang kiểm tra quyền truy cập...
      </div>
    )
  }

  if (!allowed) {
    return (
      <div className="admin-status">
        <h2>Không có quyền truy cập</h2>
        <p>
          Tài khoản của bạn không có quyền truy cập trang này.
        </p>

        <button
          type="button"
          onClick={() => onNavigate?.('/')}
        >
          Quay lại trang chủ
        </button>
      </div>
    )
  }

  return children
}

export default AdminAccessGuard
