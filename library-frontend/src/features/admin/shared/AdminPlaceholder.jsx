// src/features/admin/shared/AdminPlaceholder.jsx

function AdminPlaceholder({
  title = 'Chức năng đang phát triển',
  description = 'Chức năng này sẽ được triển khai trong giai đoạn tiếp theo.',
}) {
  return (
    <section className="admin-placeholder">
      <div className="admin-placeholder-icon" aria-hidden="true">
        <span>⚙</span>
      </div>

      <div className="admin-placeholder-content">
        <span className="admin-eyebrow">ADMINISTRATION</span>

        <h2>{title}</h2>

        <p>{description}</p>
      </div>
    </section>
  )
}

export default AdminPlaceholder