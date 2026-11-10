import { useEffect, useMemo, useState } from 'react';
import {
    getPermissionOptions,
    getPermissionGroups,
    getDeletedPermissionGroups,
    restorePermissionGroup,
    createPermissionGroup,
    updatePermissionGroup,
    deletePermissionGroup,
    getAdminUsers,
    assignUsersToGroup,
    removeUserFromGroup
} from '../../../services/permissionGroupService';
import './permission-groups.css';

const EMPTY_FORM = {
    name: '',
    description: '',
    permissionIds: []
};

const USER_PAGE_SIZE = 8;

export default function PermissionGroupsPage({ permissions: effectivePermissions = [], isAdmin = false }) {
    const hasPermission = code => isAdmin || effectivePermissions.includes(code);
    const canRead = hasPermission('PERMISSION_GROUP_READ');
    const canCreate = hasPermission('PERMISSION_GROUP_CREATE');
    const canUpdate = hasPermission('PERMISSION_GROUP_UPDATE');
    const canDelete = hasPermission('PERMISSION_GROUP_DELETE');

    const [permissions, setPermissions] = useState([]);
    const [groups, setGroups] = useState([]);
    const [deletedGroups, setDeletedGroups] = useState([]);
    const [trashLoading, setTrashLoading] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [editingId, setEditingId] = useState(null);
    const [permissionSearch, setPermissionSearch] = useState('');

    const [loading, setLoading] = useState(canRead || canCreate || canUpdate);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // null: thu gọn cả hai chức năng
    // create: hiển thị biểu mẫu tạo/cập nhật nhóm quyền
    // groups: hiển thị danh sách nhóm quyền
    const [activeSection, setActiveSection] = useState(null);

    // Quản lý thao tác trên từng nhóm quyền
    const [expandedGroupId, setExpandedGroupId] = useState(null);
    const [managingGroupId, setManagingGroupId] = useState(null);

    // Quản lý người dùng và phân trang
    const [users, setUsers] = useState([]);
    const [userKeyword, setUserKeyword] = useState('');
    const [userPage, setUserPage] = useState(0);

    const [userPageData, setUserPageData] = useState({
        totalPages: 0,
        totalElements: 0,
        first: true,
        last: true
    });

    const [usersLoading, setUsersLoading] = useState(false);
    const [selectedUserIds, setSelectedUserIds] = useState([]);
    const [savingUsers, setSavingUsers] = useState(false);

    // =====================================================
    // TẢI DANH MỤC QUYỀN VÀ DANH SÁCH NHÓM QUYỀN
    // =====================================================

    async function loadData(showLoading = true) {
        if (showLoading) {
            setLoading(true);
        }

        setError('');

        try {
            const [permissionData, groupData] = await Promise.all([
                canCreate || canUpdate ? getPermissionOptions() : Promise.resolve([]),
                canRead ? getPermissionGroups() : Promise.resolve([])
            ]);

            setPermissions(Array.isArray(permissionData) ? permissionData : []);
            setGroups(Array.isArray(groupData) ? groupData : []);
        } catch (err) {
            setError(
                err.message || 'Không thể tải dữ liệu nhóm quyền.'
            );
        } finally {
            if (showLoading) {
                setLoading(false);
            }
        }
    }

    async function loadTrash(showLoading = true) {
        if (!canRead) return;
        if (showLoading) setTrashLoading(true);
        setError('');

        try {
            const data = await getDeletedPermissionGroups();
            setDeletedGroups(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(err.message || 'Không thể tải thùng rác nhóm quyền.');
        } finally {
            if (showLoading) setTrashLoading(false);
        }
    }

    async function handleRestore(group) {
        if (!canUpdate) {
            setError('Bạn không có quyền khôi phục nhóm quyền.');
            return;
        }

        const confirmed = window.confirm(
            `Bạn muốn khôi phục nhóm quyền "${group.name}"?`
        );
        if (!confirmed) return;

        setError('');
        setSuccess('');

        try {
            await restorePermissionGroup(group.id);
            setSuccess(`Đã khôi phục nhóm quyền "${group.name}".`);
            await Promise.all([loadData(false), loadTrash(false)]);
        } catch (err) {
            setError(err.message || 'Không thể khôi phục nhóm quyền.');
        }
    }

    useEffect(() => {
        loadData();
    }, []);

    // =====================================================
    // TẢI NGƯỜI DÙNG CÓ PHÂN TRANG
    // =====================================================

    async function loadUsers(page = userPage, keyword = userKeyword) {
        setUsersLoading(true);
        setError('');

        try {
            const result = await getAdminUsers({
                keyword,
                page,
                size: USER_PAGE_SIZE
            });

            setUsers(
                Array.isArray(result?.content)
                    ? result.content
                    : []
            );

            setUserPageData({
                totalPages: result?.totalPages || 0,
                totalElements: result?.totalElements || 0,
                first: result?.first ?? true,
                last: result?.last ?? true
            });

            setUserPage(result?.number ?? page);
        } catch (err) {
            setError(
                err.message || 'Không thể tải danh sách người dùng.'
            );

            setUsers([]);

            setUserPageData({
                totalPages: 0,
                totalElements: 0,
                first: true,
                last: true
            });
        } finally {
            setUsersLoading(false);
        }
    }

    // =====================================================
    // TÌM KIẾM VÀ PHÂN LOẠI QUYỀN
    // =====================================================

    const groupedPermissions = useMemo(() => {
        const keyword = permissionSearch.trim().toLowerCase();

        const filtered = permissions.filter(permission => {
            return (
                !keyword ||
                permission.name?.toLowerCase().includes(keyword) ||
                permission.description?.toLowerCase().includes(keyword)
            );
        });

        return filtered.reduce((result, permission) => {
            const category = permission.categoryLabel || 'Quyền khác';

            if (!result[category]) {
                result[category] = [];
            }

            result[category].push(permission);

            return result;
        }, {});
    }, [permissions, permissionSearch]);

    // =====================================================
    // CHỌN / BỎ CHỌN QUYỀN
    // =====================================================

    function togglePermission(permissionId) {
        setForm(current => ({
            ...current,
            permissionIds: current.permissionIds.includes(permissionId)
                ? current.permissionIds.filter(id => id !== permissionId)
                : [...current.permissionIds, permissionId]
        }));
    }

    // =====================================================
    // ĐÓNG / MỞ CHỨC NĂNG
    // =====================================================

    function toggleSection(section) {
        setActiveSection(current => {
            return current === section ? null : section;
        });
    }

    function openCreateSection() {
        setActiveSection('create');
    }



    // =====================================================
    // RESET BIỂU MẪU
    // =====================================================

    function resetForm() {
        setForm(EMPTY_FORM);
        setEditingId(null);
        setPermissionSearch('');
    }

    // =====================================================
    // CHỈNH SỬA NHÓM QUYỀN
    // =====================================================

    function startEdit(group) {
        if (!canUpdate) {
            setError('Bạn không có quyền chỉnh sửa nhóm quyền.');
            return;
        }

        setEditingId(group.id);

        setForm({
            name: group.name || '',
            description: group.description || '',
            permissionIds: group.permissionIds || []
        });

        setActiveSection('create');

        setError('');
        setSuccess('');

        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }

    // =====================================================
    // TẠO / CẬP NHẬT NHÓM QUYỀN
    // =====================================================

    async function handleSubmit(event) {
        event.preventDefault();

        const allowed = editingId !== null ? canUpdate : canCreate;
        if (!allowed) {
            setError(editingId !== null
                ? 'Bạn không có quyền cập nhật nhóm quyền.'
                : 'Bạn không có quyền tạo nhóm quyền.');
            return;
        }

        setError('');
        setSuccess('');

        if (!form.name.trim()) {
            setError('Vui lòng nhập tên nhóm quyền.');
            return;
        }

        if (form.permissionIds.length === 0) {
            setError('Vui lòng chọn ít nhất một quyền.');
            return;
        }

        setSaving(true);

        try {
            const payload = {
                name: form.name.trim(),
                description: form.description.trim(),
                permissionIds: form.permissionIds
            };

            if (editingId !== null) {
                await updatePermissionGroup(editingId, payload);

                setSuccess('Cập nhật nhóm quyền thành công.');
            } else {
                await createPermissionGroup(payload);

                setSuccess('Tạo nhóm quyền thành công.');
            }

            resetForm();

            // Sau khi lưu, chuyển về danh sách để xem kết quả
            setActiveSection(canRead ? 'groups' : null);

            await loadData(false);
        } catch (err) {
            setError(
                err.message || 'Không thể lưu nhóm quyền.'
            );
        } finally {
            setSaving(false);
        }
    }

    // =====================================================
    // XÓA NHÓM QUYỀN
    // =====================================================

    async function handleDelete(group) {
        if (!canDelete) {
            setError('Bạn không có quyền xóa nhóm quyền.');
            return;
        }

        const confirmed = window.confirm(
            `Bạn có chắc muốn xóa nhóm "${group.name}"?`
        );

        if (!confirmed) {
            return;
        }

        setError('');
        setSuccess('');

        try {
            await deletePermissionGroup(group.id);

            setSuccess('Đã xóa nhóm quyền.');

            if (editingId === group.id) {
                resetForm();
            }

            if (expandedGroupId === group.id) {
                setExpandedGroupId(null);
            }

            if (managingGroupId === group.id) {
                setManagingGroupId(null);
            }

            await loadData(false);
        } catch (err) {
            setError(
                err.message || 'Không thể xóa nhóm quyền.'
            );
        }
    }

    // =====================================================
    // MỞ / ĐÓNG DANH SÁCH THAO TÁC CỦA MỘT NHÓM
    // =====================================================

    function toggleGroupActions(group) {
        if (expandedGroupId === group.id) {
            setExpandedGroupId(null);
            setManagingGroupId(null);
            return;
        }

        setExpandedGroupId(group.id);
        setManagingGroupId(null);
    }

    // =====================================================
    // MỞ QUẢN LÝ NGƯỜI DÙNG
    // =====================================================

    async function openUserManager(group) {
        if (!canUpdate) {
            setError('Bạn không có quyền quản lý người dùng trong nhóm.');
            return;
        }

        setManagingGroupId(group.id);
        setSelectedUserIds(group.userIds || []);
        setUserKeyword('');
        setUserPage(0);

        await loadUsers(0, '');
    }

    // =====================================================
    // CHỌN / BỎ CHỌN NGƯỜI DÙNG
    // =====================================================

    function toggleUser(userId) {
        setSelectedUserIds(current => {
            return current.includes(userId)
                ? current.filter(id => id !== userId)
                : [...current, userId];
        });
    }

    // =====================================================
    // LƯU NGƯỜI DÙNG CHO NHÓM
    // =====================================================

    async function saveGroupUsers(group) {
        if (!canUpdate) {
            setError('Bạn không có quyền cập nhật người dùng của nhóm.');
            return;
        }

        setSavingUsers(true);
        setError('');
        setSuccess('');

        try {
            const currentIds = group.userIds || [];

            const addIds = selectedUserIds.filter(
                id => !currentIds.includes(id)
            );

            const removeIds = currentIds.filter(
                id => !selectedUserIds.includes(id)
            );

            if (addIds.length > 0) {
                await assignUsersToGroup(group.id, addIds);
            }

            for (const userId of removeIds) {
                await removeUserFromGroup(group.id, userId);
            }

            setSuccess(
                `Đã cập nhật người dùng cho nhóm "${group.name}".`
            );

            setManagingGroupId(null);
            setExpandedGroupId(null);

            await loadData(false);
        } catch (err) {
            setError(
                err.message ||
                'Không thể cập nhật người dùng của nhóm.'
            );
        } finally {
            setSavingUsers(false);
        }
    }

    // =====================================================
    // TRẠNG THÁI LOADING
    // =====================================================

    if (!canRead && !canCreate && !canUpdate && !canDelete) {
        return (
            <main className="permission-groups-page">
                <div className="pg-alert error" role="alert">
                    Bạn không có quyền truy cập chức năng quản lý nhóm quyền.
                </div>
            </main>
        );
    }

    if (loading) {
        return (
            <main className="permission-groups-page">
                <div className="pg-empty">
                    Đang tải dữ liệu nhóm quyền...
                </div>
            </main>
        );
    }

    // =====================================================
    // GIAO DIỆN CHÍNH
    // =====================================================

    return (
        <main className="permission-groups-page">
            {/* HEADER */}
            <header className="pg-header">
                <div>
                    <h1>Quản lý nhóm quyền</h1>

                    <p>
                        Tạo nhóm từ danh mục quyền có sẵn và quản lý
                        quyền được gán cho từng nhóm.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => loadData()}
                    className="pg-button secondary"
                    disabled={saving || savingUsers}
                >
                    Làm mới
                </button>
            </header>

            {/* THÔNG BÁO */}
            {error && (
                <div className="pg-alert error" role="alert">
                    {error}
                </div>
            )}

            {success && (
                <div className="pg-alert success" role="status">
                    {success}
                </div>
            )}

            {/* DANH SÁCH ĐIỀU HƯỚNG */}
            <nav
                className="pg-section-menu"
                aria-label="Chức năng quản lý nhóm quyền"
            >
                {/* MỤC TẠO NHÓM QUYỀN */}
                {canCreate && <button
                    type="button"
                    className={`pg-section-toggle ${
                        activeSection === 'create' ? 'active' : ''
                    }`}
                    aria-expanded={activeSection === 'create'}
                    onClick={() => toggleSection('create')}
                >
                    <span className="pg-section-icon">＋</span>

                    <span className="pg-section-text">
                        <strong>
                            {editingId !== null
                                ? 'Cập nhật nhóm quyền'
                                : 'Tạo nhóm quyền'}
                        </strong>

                        <small>
                            Nhập thông tin nhóm và chọn các quyền được cấp
                        </small>
                    </span>

                    <span className="pg-section-chevron">
                        {activeSection === 'create' ? '▲' : '▼'}
                    </span>
                </button>}

                {/* MỤC DANH SÁCH NHÓM QUYỀN */}
                {canRead && <button
                    type="button"
                    className={`pg-section-toggle ${
                        activeSection === 'groups' ? 'active' : ''
                    }`}
                    aria-expanded={activeSection === 'groups'}
                    onClick={() => toggleSection('groups')}
                >
                    <span className="pg-section-icon">☷</span>

                    <span className="pg-section-text">
                        <strong>Danh sách nhóm quyền</strong>

                        <small>
                            Xem nhóm quyền, chỉnh sửa, xóa và quản lý người dùng
                        </small>
                    </span>

                    <span className="pg-section-chevron">
                        {activeSection === 'groups' ? '▲' : '▼'}
                    </span>
                </button>}

                {/* MỤC THÙNG RÁC NHÓM QUYỀN */}
                {canRead && <button
                    type="button"
                    className={`pg-section-toggle ${activeSection === 'trash' ? 'active' : ''}`}
                    aria-expanded={activeSection === 'trash'}
                    onClick={() => {
                        toggleSection('trash');
                        if (activeSection !== 'trash') loadTrash();
                    }}
                >
                    <span className="pg-section-icon">♲</span>
                    <span className="pg-section-text">
                        <strong>Thùng rác nhóm quyền</strong>
                        <small>Khôi phục nhóm quyền đã xóa mềm</small>
                    </span>
                    <span className="pg-section-chevron">
                        {activeSection === 'trash' ? '▲' : '▼'}
                    </span>
                </button>} 
            </nav>

            {activeSection === 'trash' && canRead && (
                <section className="pg-panel pg-section-content">
                    <div className="pg-panel-heading">
                        <div>
                            <h2>Thùng rác nhóm quyền</h2>
                            <p>Nhóm được khôi phục sẽ xuất hiện lại trong danh sách đang hoạt động.</p>
                        </div>
                        <button
                            type="button"
                            className="pg-button secondary"
                            onClick={() => loadTrash()}
                            disabled={trashLoading}
                        >
                            {trashLoading ? 'Đang tải...' : 'Làm mới thùng rác'}
                        </button>
                    </div>

                    {trashLoading ? (
                        <p className="pg-empty">Đang tải nhóm quyền đã xóa...</p>
                    ) : deletedGroups.length === 0 ? (
                        <p className="pg-empty">Thùng rác hiện không có nhóm quyền nào.</p>
                    ) : (
                        <div className="pg-group-list">
                            {deletedGroups.map(group => (
                                <article className="pg-group-card" key={group.id}>
                                    <div className="pg-group-card-header">
                                        <div>
                                            <h3>{group.name}</h3>
                                            <p>{group.description || 'Không có mô tả.'}</p>
                                            <small>
                                                {(group.permissions || []).length} quyền
                                            </small>
                                        </div>
                                        {canUpdate && (
                                            <button
                                                type="button"
                                                className="pg-button secondary"
                                                onClick={() => handleRestore(group)}
                                            >
                                                Khôi phục
                                            </button>
                                        )}
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            )}

            {!canRead && !canCreate && (canUpdate || canDelete) && (
                <div className="pg-alert" role="status">
                    Tài khoản có quyền thao tác nhưng chưa có quyền xem danh sách nhóm quyền.
                    Cần cấp PERMISSION_GROUP_READ để chọn nhóm cần chỉnh sửa hoặc xóa.
                </div>
            )}

            {/* =================================================
                CHỨC NĂNG 1: TẠO / CẬP NHẬT NHÓM QUYỀN
               ================================================= */}

            {activeSection === 'create' && (editingId !== null ? canUpdate : canCreate) && (
                <section className="pg-panel pg-section-content">
                    <h2>
                        {editingId !== null
                            ? 'Cập nhật nhóm quyền'
                            : 'Tạo nhóm quyền'}
                    </h2>

                    <form onSubmit={handleSubmit}>
                        {/* TÊN NHÓM */}
                        <label className="pg-label">
                            Tên nhóm

                            <input
                                value={form.name}
                                onChange={event =>
                                    setForm(current => ({
                                        ...current,
                                        name: event.target.value
                                    }))
                                }
                                placeholder="Ví dụ: Nhân viên quản lý sách"
                                maxLength={100}
                                required
                            />
                        </label>

                        {/* MÔ TẢ */}
                        <label className="pg-label">
                            Mô tả

                            <textarea
                                value={form.description}
                                onChange={event =>
                                    setForm(current => ({
                                        ...current,
                                        description: event.target.value
                                    }))
                                }
                                placeholder="Mô tả chức năng của nhóm"
                                rows={3}
                            />
                        </label>

                        {/* DANH MỤC QUYỀN */}
                        <div className="pg-permission-heading">
                            <h3>Danh mục quyền</h3>

                            <span>
                                Đã chọn: {form.permissionIds.length}
                            </span>
                        </div>

                        {/* TÌM KIẾM QUYỀN */}
                        <input
                            className="pg-search"
                            value={permissionSearch}
                            onChange={event =>
                                setPermissionSearch(event.target.value)
                            }
                            placeholder="Tìm theo mã quyền hoặc mô tả..."
                            aria-label="Tìm kiếm quyền"
                        />

                        {/* DANH SÁCH QUYỀN */}
                        <div className="pg-permission-tree">
                            {Object.entries(groupedPermissions).map(
                                ([category, items]) => (
                                    <section                                        key={category}
                                        className="pg-category"
                                    >
                                        <h4>{category}</h4>

                                        {items.map(permission => (
                                            <label
                                                key={permission.id}
                                                className="pg-permission"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={form.permissionIds.includes(
                                                        permission.id
                                                    )}
                                                    onChange={() =>
                                                        togglePermission(
                                                            permission.id
                                                        )
                                                    }
                                                />

                                                <span>
                                                    <strong>
                                                        {permission.name}
                                                    </strong>

                                                    <small>
                                                        {permission.description ||
                                                            'Không có mô tả'}
                                                    </small>
                                                </span>
                                            </label>
                                        ))}
                                    </section>
                                )
                            )}

                            {!Object.keys(groupedPermissions).length && (
                                <p className="pg-empty">
                                    Không tìm thấy quyền phù hợp.
                                </p>
                            )}
                        </div>

                        {/* NÚT THAO TÁC BIỂU MẪU */}
                        <div className="pg-actions">
                            <button
                                type="submit"
                                className="pg-button primary"
                                disabled={saving || savingUsers}
                            >
                                {saving
                                    ? 'Đang lưu...'
                                    : editingId !== null
                                        ? 'Lưu thay đổi'
                                        : 'Tạo nhóm quyền'}
                            </button>

                            {editingId !== null && (
                                <button
                                    type="button"
                                    className="pg-button secondary"
                                    disabled={saving}
                                    onClick={() => {
                                        resetForm();
                                        setError('');
                                        setSuccess('');
                                    }}
                                >
                                    Hủy chỉnh sửa
                                </button>
                            )}

                            <button
                                type="button"
                                className="pg-button secondary"
                                onClick={() => setActiveSection(null)}
                            >
                                Thu gọn
                            </button>
                        </div>
                    </form>
                </section>
            )}

            {/* =================================================
                CHỨC NĂNG 2: DANH SÁCH NHÓM QUYỀN
               ================================================= */}

            {activeSection === 'groups' && canRead && (
                <section className="pg-panel pg-section-content">
                    <h2>Danh sách nhóm quyền</h2>

                    {!groups.length ? (
                        <p className="pg-empty">
                            Chưa có nhóm quyền nào.
                        </p>
                    ) : (
                        <div className="pg-group-list">
                            {groups.map(group => (
                                <article
                                    key={group.id}
                                    className="pg-group-card"
                                >
                                    {/* THÔNG TIN TÓM TẮT NHÓM */}
                                    <button
                                        type="button"
                                        className="pg-group-summary"
                                        aria-expanded={
                                            expandedGroupId === group.id
                                        }
                                        onClick={() =>
                                            toggleGroupActions(group)
                                        }
                                    >
                                        <span className="pg-group-summary-main">
                                            <strong>{group.name}</strong>

                                            <small>
                                                {group.description ||
                                                    'Chưa có mô tả'}
                                            </small>

                                            <small>
                                                {(group.userIds || []).length}
                                                {' '}người dùng
                                            </small>
                                        </span>

                                        <span className="pg-summary-right">
                                            <span className="pg-count">
                                                {(group.permissionIds || []).length}
                                                {' '}quyền
                                            </span>

                                            <span className="pg-chevron">
                                                {expandedGroupId === group.id
                                                    ? 'Thu gọn ▲'
                                                    : 'Quản lý ▼'}
                                            </span>
                                        </span>
                                    </button>

                                    {/* DANH SÁCH THAO TÁC MỞ RỘNG */}
                                    {expandedGroupId === group.id && (
                                        <div className="pg-expanded-actions">
                                            <div className="pg-actions">
                                                {canUpdate && (
                                                    <button
                                                        type="button"
                                                        className="pg-button secondary"
                                                        onClick={() => startEdit(group)}
                                                    >
                                                        Sửa nhóm/quyền
                                                    </button>
                                                )}

                                                {canUpdate && (
                                                    <button
                                                        type="button"
                                                        className="pg-button secondary"
                                                        onClick={() => openUserManager(group)}
                                                    >
                                                        Quản lý người dùng
                                                    </button>
                                                )}

                                                {canDelete && (
                                                    <button
                                                        type="button"
                                                        className="pg-button danger"
                                                        onClick={() => handleDelete(group)}
                                                    >
                                                        Xóa nhóm
                                                    </button>
                                                )}
                                            </div>

                                            {/* QUẢN LÝ NGƯỜI DÙNG */}
                                            {managingGroupId === group.id && (
                                                <div className="pg-user-manager">
                                                    <h4>
                                                        Gán người dùng vào
                                                        {' '}“{group.name}”
                                                    </h4>

                                                    {/* TÌM KIẾM NGƯỜI DÙNG */}
                                                    <input
                                                        className="pg-search"
                                                        value={userKeyword}
                                                        onChange={event => {
                                                            const value =
                                                                event.target.value;

                                                            setUserKeyword(value);
                                                            setUserPage(0);

                                                            loadUsers(0, value);
                                                        }}
                                                        placeholder="Tìm theo tên hoặc email..."
                                                        aria-label="Tìm người dùng"
                                                    />

                                                    <p className="pg-user-help">
                                                        Chọn tài khoản ở các
                                                        trang rồi lưu một lần.
                                                        Chỉ hiển thị tài khoản
                                                        đã xác thực.
                                                    </p>

                                                    {/* DANH SÁCH TÀI KHOẢN */}
                                                    {usersLoading ? (
                                                        <p className="pg-empty">
                                                            Đang tải người dùng...
                                                        </p>
                                                    ) : users.length === 0 ? (
                                                        <p className="pg-empty">
                                                            Không tìm thấy tài khoản
                                                            phù hợp.
                                                        </p>
                                                    ) : (
                                                        users.map(user => (
                                                            <label
                                                                key={user.id}
                                                                className="pg-user-option"
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedUserIds.includes(
                                                                        user.id
                                                                    )}
                                                                    onChange={() =>
                                                                        toggleUser(
                                                                            user.id
                                                                        )
                                                                    }
                                                                />

                                                                <span>
                                                                    <strong>
                                                                        {user.fullName ||
                                                                            user.email}
                                                                    </strong>

                                                                    <small>
                                                                        {user.email}

                                                                        {user.verified
                                                                            ? ' · Đã xác thực'
                                                                            : ''}
                                                                    </small>
                                                                </span>
                                                            </label>
                                                        ))
                                                    )}

                                                    {/* PHÂN TRANG */}
                                                    <div className="pg-pagination">
                                                        <span>
                                                            {userPageData.totalElements}
                                                            {' '}tài khoản · Trang{' '}
                                                            {userPageData.totalPages
                                                                ? userPage + 1
                                                                : 0}
                                                            /{userPageData.totalPages}
                                                        </span>

                                                        <div>
                                                            <button
                                                                type="button"
                                                                className="pg-button secondary"
                                                                disabled={
                                                                    usersLoading ||
                                                                    userPageData.first
                                                                }
                                                                onClick={() =>
                                                                    loadUsers(
                                                                        userPage - 1,
                                                                        userKeyword
                                                                    )
                                                                }
                                                            >
                                                                Trước
                                                            </button>

                                                            <button
                                                                type="button"
                                                                className="pg-button secondary"
                                                                disabled={
                                                                    usersLoading ||
                                                                    userPageData.last
                                                                }
                                                                onClick={() =>
                                                                    loadUsers(
                                                                        userPage + 1,
                                                                        userKeyword
                                                                    )
                                                                }
                                                            >
                                                                Sau
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* LƯU / ĐÓNG QUẢN LÝ NGƯỜI DÙNG */}
                                                    <div className="pg-actions">
                                                        <button
                                                            type="button"
                                                            className="pg-button primary"
                                                            disabled={
                                                                savingUsers ||
                                                                usersLoading
                                                            }
                                                            onClick={() =>
                                                                saveGroupUsers(group)
                                                            }
                                                        >
                                                            {savingUsers
                                                                ? 'Đang lưu...'
                                                                : `Lưu lựa chọn (${selectedUserIds.length})`}
                                                        </button>

                                                        <button
                                                            type="button"
                                                            className="pg-button secondary"
                                                            disabled={savingUsers}
                                                            onClick={() =>
                                                                setManagingGroupId(null)
                                                            }
                                                        >
                                                            Đóng
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </article>
                            ))}
                        </div>
                    )}

                    <div className="pg-actions">
                        {canCreate && (
                            <button
                                type="button"
                                className="pg-button secondary"
                                onClick={openCreateSection}
                            >
                                ＋ Tạo nhóm quyền
                            </button>
                        )}

                        <button
                            type="button"
                            className="pg-button secondary"
                            onClick={() => setActiveSection(null)}
                        >
                            Thu gọn
                        </button>
                    </div>
                </section>
            )}
        </main>
    );
}