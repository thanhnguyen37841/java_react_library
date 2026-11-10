
import { useCallback, useEffect, useState } from 'react'

import {
  getCategories,
  getDeletedCategories,
  getCategoryStatistics,
  createCategory,
  updateCategory,
  deleteCategory,
  restoreCategory,
  permanentlyDeleteCategory
} from '../../../services/categoryService'

import '../members/members.css'
import './categories.css'

export default function CategoriesPage({
  onToast,
  permissions = [],
  isAdmin = false
}) {
  const permissionSet = new Set(
    Array.isArray(permissions) ? permissions : []
  )

  const can = (permission) =>
    isAdmin || permissionSet.has(permission)

  const canRead = can('CATEGORY_READ')
  const canCreate = can('CATEGORY_CREATE')
  const canUpdate = can('CATEGORY_UPDATE')
  const canDelete = can('CATEGORY_DELETE')

  const [activeTab, setActiveTab] = useState('active')
  const [categories, setCategories] = useState([])
  const [deletedCategories, setDeletedCategories] = useState([])
  const [statistics, setStatistics] = useState([])

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const [showModal, setShowModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)

  const [nameInput, setNameInput] = useState('')
  const [descriptionInput, setDescriptionInput] = useState('')

  const notify = useCallback((message, type = 'info') => {
    onToast?.(message, type)
  }, [onToast])

  const loadCategories = useCallback(async () => {
    if (!canRead) {
      setCategories([])
      setDeletedCategories([])
      setStatistics([])
      return
    }

    setLoading(true)

    try {
      const [
        activeData,
        deletedData,
        statisticsData
      ] = await Promise.all([
        getCategories(),
        getDeletedCategories(),
        getCategoryStatistics()
      ])

      setCategories(activeData)
      setDeletedCategories(deletedData)
      setStatistics(statisticsData)
    } catch (error) {
      notify(
        error.message || 'Không thể tải dữ liệu danh mục.',
        'error'
      )
    } finally {
      setLoading(false)
    }
  }, [canRead, notify])

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  const totalCategories = statistics.length

  const totalBooks = statistics.reduce(
    (sum, item) => sum + Number(item.totalBooks || 0),
    0
  )

  const totalCopies = statistics.reduce(
    (sum, item) => sum + Number(item.totalQuantity || 0),
    0
  )

  function openCreateModal() {
    if (!canCreate) {
      notify('Bạn không có quyền thêm danh mục.', 'error')
      return
    }

    setEditingCategory(null)
    setNameInput('')
    setDescriptionInput('')
    setShowModal(true)
  }

  function openEditModal(category) {
    if (!canUpdate) {
      notify('Bạn không có quyền sửa danh mục.', 'error')
      return
    }

    setEditingCategory(category)
    setNameInput(category.name || '')
    setDescriptionInput(category.description || '')
    setShowModal(true)
  }

  async function handleSave(event) {
    event.preventDefault()

    if (!nameInput.trim()) {
      notify('Tên danh mục không được để trống.', 'error')
      return
    }

    setSaving(true)

    try {
      const payload = {
        name: nameInput.trim(),
        description: descriptionInput.trim()
      }

      if (editingCategory) {
        await updateCategory(editingCategory.id, payload)
        notify('Cập nhật danh mục thành công.', 'success')
      } else {
        await createCategory(payload)
        notify('Thêm danh mục thành công.', 'success')
      }

      setShowModal(false)
      await loadCategories()
    } catch (error) {
      notify(error.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(category) {
    if (!canDelete) {
      notify('Bạn không có quyền xóa danh mục.', 'error')
      return
    }

    if (!window.confirm(
      `Chuyển danh mục "${category.name}" vào thùng rác?`
    )) return

    try {
      await deleteCategory(category.id)
      notify('Đã chuyển danh mục vào thùng rác.', 'success')
      await loadCategories()
    } catch (error) {
      notify(error.message, 'error')
    }
  }

  async function handleRestore(category) {
    if (!canUpdate) {
      notify('Bạn không có quyền khôi phục danh mục.', 'error')
      return
    }

    if (!window.confirm(
      `Khôi phục danh mục "${category.name}"?`
    )) return

    try {
      await restoreCategory(category.id)
      notify('Khôi phục danh mục thành công.', 'success')
      await loadCategories()
    } catch (error) {
      notify(error.message, 'error')
    }
  }

  async function handlePermanentDelete(category) {
    if (!isAdmin) {
      notify('Chỉ Admin mới có quyền xóa vĩnh viễn.', 'error')
      return
    }

    const confirmed = window.confirm(
      `CẢNH BÁO: Xóa vĩnh viễn danh mục "${category.name}"?\n\n` +
      'Thao tác này không thể hoàn tác.'
    )

    if (!confirmed) return

    try {
      await permanentlyDeleteCategory(category.id)
      notify('Đã xóa vĩnh viễn danh mục.', 'success')
      await loadCategories()
    } catch (error) {
      notify(error.message, 'error')
    }
  }

  const displayedCategories = activeTab === 'active'
    ? categories
    : deletedCategories

  return (
    <section className="members-page categories-page">

      {/* Tiêu đề */}
      <div className="members-page-header">
        <div>
          <h1>Quản lý danh mục sách</h1>
          <p>
            Quản lý, phân loại và theo dõi danh mục sách trong thư viện.
          </p>
        </div>

        {activeTab === 'active' && canCreate && (
          <div className="members-header-actions">
            <button type="button" onClick={openCreateModal}>
              + Thêm danh mục
            </button>
          </div>
        )}
      </div>

      {/* Thống kê */}
      <div className="categories-statistics">
        <div className="categories-stat-card">
          <span>Tổng danh mục</span>
          <strong>{totalCategories}</strong>
        </div>

        <div className="categories-stat-card">
          <span>Tổng đầu sách</span>
          <strong>{totalBooks}</strong>
        </div>

        <div className="categories-stat-card">
          <span>Tổng bản sách</span>
          <strong>{totalCopies}</strong>
        </div>
      </div>

      {/* Tabs */}
      <div className="categories-tabs">
        <button
          type="button"
          className={activeTab === 'active' ? 'active' : ''}
          onClick={() => setActiveTab('active')}
        >
          Danh mục đang hoạt động
          <span>{categories.length}</span>
        </button>

        <button
          type="button"
          className={activeTab === 'trash' ? 'active' : ''}
          onClick={() => setActiveTab('trash')}
        >
          Thùng rác
          <span>{deletedCategories.length}</span>
        </button>
      </div>

      {/* Bảng danh mục */}
      <div className="members-table-card">
        <div className="members-table-heading">
          <h2>
            {activeTab === 'active'
              ? 'Danh sách danh mục'
              : 'Danh mục đã xóa'}
          </h2>

          <span>
            Tổng cộng: {displayedCategories.length}
          </span>
        </div>

        <div className="members-table-wrapper">
          <table className="members-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Tên danh mục</th>
                <th>Mô tả</th>
                <th>Số đầu sách</th>
                <th>Tổng bản</th>
                <th>Có sẵn</th>

                {activeTab === 'trash' && (
                  <th>Ngày xóa</th>
                )}

                <th>Thao tác</th>
              </tr>
            </thead>

            <tbody>
              {!canRead ? (
                <tr>
                  <td colSpan={activeTab === 'trash' ? 8 : 7}
                      className="members-empty">
                    Bạn không có quyền xem danh mục.
                  </td>
                </tr>
              ) : loading ? (
                <tr>
                  <td colSpan={activeTab === 'trash' ? 8 : 7}
                      className="members-empty">
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : displayedCategories.length === 0 ? (
                <tr>
                  <td colSpan={activeTab === 'trash' ? 8 : 7}
                      className="members-empty">
                    {activeTab === 'active'
                      ? 'Chưa có danh mục nào.'
                      : 'Thùng rác đang trống.'}
                  </td>
                </tr>
              ) : (
                displayedCategories.map((category) => {
                  const stat = statistics.find(
                    item => Number(item.id) === Number(category.id)
                  )

                  return (
                    <tr key={category.id}>
                      <td>{category.id}</td>

                      <td>
                        <strong>{category.name}</strong>
                      </td>

                      <td>{category.description || '—'}</td>

                      <td>{stat?.totalBooks ?? 0}</td>

                      <td>{stat?.totalQuantity ?? 0}</td>

                      <td>{stat?.availableQuantity ?? 0}</td>

                      {activeTab === 'trash' && (
                        <td>
                          {category.deletedAt
                            ? new Date(category.deletedAt).toLocaleString('vi-VN')
                            : '—'}
                        </td>
                      )}

                      <td>
                        <div className="member-row-actions">
                          {activeTab === 'active' ? (
                            <>
                              {canUpdate && (
                                <button
                                  type="button"
                                  className="member-btn-edit"
                                  onClick={() => openEditModal(category)}
                                >
                                  Sửa
                                </button>
                              )}

                              {canDelete && (
                                <button
                                  type="button"
                                  className="member-btn-delete"
                                  onClick={() => handleDelete(category)}
                                >
                                  Xóa
                                </button>
                              )}
                            </>
                          ) : (
                            <>
                              {canUpdate && (
                                <button
                                  type="button"
                                  className="member-btn-edit"
                                  onClick={() => handleRestore(category)}
                                >
                                  Khôi phục
                                </button>
                              )}

                              {isAdmin && (
                                <button
                                  type="button"
                                  className="member-btn-delete"
                                  onClick={() => handlePermanentDelete(category)}
                                >
                                  Xóa vĩnh viễn
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal thêm / sửa */}
      {showModal && (
        <div
          className="member-modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !saving
            ) {
              setShowModal(false)
            }
          }}
        >
          <div className="member-modal categories-modal">
            <form onSubmit={handleSave} className="member-form">

              <h2>
                {editingCategory
                  ? 'Cập nhật danh mục'
                  : 'Thêm danh mục mới'}
              </h2>

              <label className="member-form-field">
                Tên danh mục *
                <input
                  type="text"
                  required
                  maxLength={255}
                  value={nameInput}
                  onChange={(event) => setNameInput(event.target.value)}
                  placeholder="VD: Công nghệ thông tin"
                />
              </label>

              <label className="member-form-field">
                Mô tả
                <textarea
                  rows={4}
                  maxLength={500}
                  value={descriptionInput}
                  onChange={(event) => setDescriptionInput(event.target.value)}
                  placeholder="Mô tả ngắn gọn về danh mục..."
                />
              </label>

              <div className="member-form-actions">
                <button
                  type="button"
                  className="member-btn-secondary"
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                >
                  Hủy
                </button>

                <button type="submit" disabled={saving}>
                  {saving ? 'Đang lưu...' : 'Lưu danh mục'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </section>
  )
}
