import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
    Database, Download, RotateCcw, Trash2, Plus, FileArchive,
    Clock, User, FileText, AlertTriangle, Check, X, Loader2
} from 'lucide-react';
import { toast } from 'react-toastify';

const API_BASE_URL = 'http://localhost:8000';

function formatFileSize(bytes) {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 2 : 0) + ' ' + units[i];
}

function formatDateTime(isoString) {
    if (!isoString) return '-';
    const d = new Date(isoString);
    return d.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

function DeleteConfirmModal({ isOpen, onClose, onConfirm, backupName }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md bg-panel-card border border-panel-border rounded-2xl shadow-2xl overflow-hidden">
                <div className="flex items-center gap-3 px-6 py-4 border-b border-panel-border/60">
                    <div className="p-2 rounded-xl bg-red-500/20">
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-panel-text">确认删除</h2>
                        <p className="text-xs text-panel-muted">此操作不可撤销</p>
                    </div>
                </div>

                <div className="p-6">
                    <p className="text-panel-text mb-2">确定要删除以下备份吗？</p>
                    <div className="bg-panel-bg/50 rounded-lg p-3 border border-panel-border/60">
                        <div className="flex items-center gap-2">
                            <FileArchive className="w-4 h-4 text-honey-400" />
                            <span className="font-mono text-sm text-panel-text">{backupName}</span>
                        </div>
                    </div>
                    <p className="text-red-400 text-sm mt-4 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4" />
                        删除后将无法恢复该备份文件
                    </p>
                </div>

                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-panel-border/60 bg-panel-bg/30">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg bg-panel-bg border border-panel-border text-panel-text hover:bg-panel-border/30 transition-all text-sm font-medium"
                    >
                        取消
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 transition-all text-sm font-medium flex items-center gap-1.5"
                    >
                        <Trash2 className="w-4 h-4" />
                        确认删除
                    </button>
                </div>
            </div>
        </div>
    );
}

function RestoreConfirmModal({ isOpen, onClose, onConfirm, backupName }) {
    const [confirmText, setConfirmText] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setConfirmText('');
            setLoading(false);
        }
    }, [isOpen]);

    const handleConfirm = async () => {
        if (confirmText !== 'RESTORE') {
            toast.warning('请输入 RESTORE 确认恢复');
            return;
        }
        setLoading(true);
        try {
            await onConfirm();
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md bg-panel-card border border-panel-border rounded-2xl shadow-2xl overflow-hidden">
                <div className="flex items-center gap-3 px-6 py-4 border-b border-panel-border/60">
                    <div className="p-2 rounded-xl bg-amber-500/20">
                        <RotateCcw className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-panel-text">数据恢复确认</h2>
                        <p className="text-xs text-panel-muted">请谨慎操作</p>
                    </div>
                </div>

                <div className="p-6 space-y-4">
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                            <div className="space-y-2 text-sm">
                                <p className="text-amber-200 font-medium">恢复数据前请注意：</p>
                                <ul className="text-amber-200/80 space-y-1 text-xs">
                                    <li>• 系统将自动生成当前数据快照用于回滚</li>
                                    <li>• 恢复操作将覆盖当前所有业务数据</li>
                                    <li>• 对象存储文件将被同步还原</li>
                                    <li>• 恢复过程中请勿关闭页面</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm text-panel-muted mb-2">
                            待恢复备份：
                        </label>
                        <div className="bg-panel-bg/50 rounded-lg p-3 border border-panel-border/60">
                            <div className="flex items-center gap-2">
                                <FileArchive className="w-4 h-4 text-honey-400" />
                                <span className="font-mono text-sm text-panel-text">{backupName}</span>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm text-panel-muted mb-2">
                            请输入 <span className="text-red-400 font-bold">RESTORE</span> 以确认恢复
                        </label>
                        <input
                            type="text"
                            value={confirmText}
                            onChange={e => setConfirmText(e.target.value)}
                            placeholder="请输入 RESTORE"
                            className="w-full px-4 py-2.5 rounded-xl bg-panel-bg border border-panel-border text-panel-text font-mono focus:border-amber-500 outline-none"
                            disabled={loading}
                        />
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-panel-border/60 bg-panel-bg/30">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="px-4 py-2 rounded-lg bg-panel-bg border border-panel-border text-panel-text hover:bg-panel-border/30 transition-all text-sm font-medium disabled:opacity-50"
                    >
                        取消
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={loading || confirmText !== 'RESTORE'}
                        className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white transition-all text-sm font-medium flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                恢复中...
                            </>
                        ) : (
                            <>
                                <RotateCcw className="w-4 h-4" />
                                确认恢复
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

function BackupScreen() {
    const [backups, setBackups] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(10);
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);
    const [backupProgress, setBackupProgress] = useState(0);

    const [deleteModal, setDeleteModal] = useState({ isOpen: false, backupId: null, backupName: '' });
    const [restoreModal, setRestoreModal] = useState({ isOpen: false, backupId: null, backupName: '' });
    const [remarks, setRemarks] = useState('');
    const [showRemarksInput, setShowRemarksInput] = useState(false);

    const fetchBackups = useCallback(async () => {
        setLoading(true);
        try {
            const resp = await axios.get(`${API_BASE_URL}/api/backup`, {
                params: { page, page_size: pageSize }
            });
            setBackups(resp.data.records || []);
            setTotal(resp.data.total || 0);
        } catch (err) {
            toast.error('获取备份列表失败');
        } finally {
            setLoading(false);
        }
    }, [page, pageSize]);

    useEffect(() => {
        fetchBackups();
    }, [fetchBackups]);

    const handleCreateBackup = async () => {
        setCreating(true);
        setBackupProgress(0);

        const progressInterval = setInterval(() => {
            setBackupProgress(prev => {
                if (prev >= 90) return prev;
                return prev + Math.random() * 15;
            });
        }, 300);

        try {
            const resp = await axios.post(`${API_BASE_URL}/api/backup`, {
                generated_by: 'admin',
                remarks: remarks.trim() || null
            });

            setBackupProgress(100);
            toast.success('备份创建成功！');
            setRemarks('');
            setShowRemarksInput(false);
            fetchBackups();
        } catch (err) {
            toast.error(err.response?.data?.detail || '备份创建失败');
        } finally {
            clearInterval(progressInterval);
            setTimeout(() => {
                setCreating(false);
                setBackupProgress(0);
            }, 500);
        }
    };

    const handleDownload = (backup) => {
        const url = `${API_BASE_URL}/api/backup/${backup.id}/download`;
        const a = document.createElement('a');
        a.href = url;
        a.download = backup.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success('开始下载备份文件');
    };

    const handleRestore = async () => {
        const backupId = restoreModal.backupId;
        try {
            await axios.post(`${API_BASE_URL}/api/backup/${backupId}/restore`, {
                generated_by: 'admin',
                confirm_text: 'RESTORE'
            });
            toast.success('数据恢复成功！已自动生成回滚快照');
            setRestoreModal({ isOpen: false, backupId: null, backupName: '' });
            fetchBackups();
        } catch (err) {
            toast.error(err.response?.data?.detail || '恢复失败');
            throw err;
        }
    };

    const handleDelete = async () => {
        const backupId = deleteModal.backupId;
        try {
            await axios.delete(`${API_BASE_URL}/api/backup/${backupId}`);
            toast.success('备份已删除');
            setDeleteModal({ isOpen: false, backupId: null, backupName: '' });
            fetchBackups();
        } catch (err) {
            toast.error(err.response?.data?.detail || '删除失败');
        }
    };

    const totalPages = Math.ceil(total / pageSize);

    return (
        <div className="min-h-screen p-6 md:p-8 bg-panel-bg honeycomb-bg">
            <div className="max-w-6xl mx-auto space-y-6">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-honey-500 to-amber-600 rounded-2xl shadow-lg shadow-amber-500/20">
                            <Database className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold gradient-text">数据备份与恢复</h1>
                            <p className="text-panel-muted text-sm mt-1">
                                业务数据库与对象存储的整库备份管理
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="px-3 py-1 bg-honey-500/10 border border-honey-500/30 rounded-full text-xs text-honey-400 font-medium flex items-center gap-1.5">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            共 {total} 个备份
                        </span>
                    </div>
                </header>

                <div className="dashboard-card p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <div>
                            <h2 className="text-lg font-semibold text-panel-text flex items-center gap-2">
                                <FileArchive className="w-5 h-5 text-honey-400" />
                                备份管理
                            </h2>
                            <p className="text-sm text-panel-muted mt-1">
                                支持手动全量备份，每次备份包含业务数据库和对象存储清单
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            {showRemarksInput && (
                                <input
                                    type="text"
                                    value={remarks}
                                    onChange={e => setRemarks(e.target.value)}
                                    placeholder="备份备注（可选）"
                                    className="px-3 py-2 rounded-lg bg-panel-bg border border-panel-border text-panel-text text-sm focus:border-honey-500 outline-none w-48"
                                    disabled={creating}
                                />
                            )}
                            <button
                                onClick={() => setShowRemarksInput(!showRemarksInput)}
                                disabled={creating}
                                className="px-3 py-2 rounded-lg bg-panel-bg border border-panel-border text-panel-muted hover:text-panel-text hover:border-honey-500/50 transition-all text-sm flex items-center gap-1.5 disabled:opacity-50"
                            >
                                <FileText className="w-4 h-4" />
                                备注
                            </button>
                            <button
                                onClick={handleCreateBackup}
                                disabled={creating}
                                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-honey-500 to-amber-600 hover:from-honey-600 hover:to-amber-700 text-white font-medium flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {creating ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        备份中...
                                    </>
                                ) : (
                                    <>
                                        <Plus className="w-4 h-4" />
                                        立即备份
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {creating && (
                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-panel-muted">正在创建备份...</span>
                                <span className="text-sm text-honey-400 font-medium">{Math.round(backupProgress)}%</span>
                            </div>
                            <div className="h-2 bg-panel-border/50 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-honey-500 to-amber-500 rounded-full transition-all duration-300"
                                    style={{ width: `${backupProgress}%` }}
                                />
                            </div>
                        </div>
                    )}

                    <div className="rounded-xl border border-panel-border/60 overflow-hidden bg-panel-bg/30">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-panel-card/50 text-panel-muted text-sm">
                                    <th className="px-5 py-3 font-medium">文件名</th>
                                    <th className="px-5 py-3 font-medium">大小</th>
                                    <th className="px-5 py-3 font-medium">类型</th>
                                    <th className="px-5 py-3 font-medium">生成人</th>
                                    <th className="px-5 py-3 font-medium">生成时间</th>
                                    <th className="px-5 py-3 font-medium">备注</th>
                                    <th className="px-5 py-3 font-medium text-right">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-panel-border/60">
                                {loading ? (
                                    <tr>
                                        <td colSpan="7" className="px-5 py-12 text-center text-panel-muted">
                                            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                                            加载中...
                                        </td>
                                    </tr>
                                ) : backups.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="px-5 py-12 text-center text-panel-muted">
                                            <FileArchive className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                            <p>暂无备份记录</p>
                                            <p className="text-xs mt-1">点击右上角"立即备份"创建第一个备份</p>
                                        </td>
                                    </tr>
                                ) : (
                                    backups.map(backup => (
                                        <tr key={backup.id} className="hover:bg-panel-card/30 transition-colors">
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-2">
                                                    <FileArchive className="w-4 h-4 text-honey-400 flex-shrink-0" />
                                                    <span className="font-mono text-sm text-panel-text truncate max-w-xs">
                                                        {backup.filename}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-sm text-panel-text">
                                                {formatFileSize(backup.file_size)}
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                                    backup.backup_type === 'manual'
                                                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                                        : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                                }`}>
                                                    {backup.backup_type_name}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-sm text-panel-text">
                                                <div className="flex items-center gap-1.5">
                                                    <User className="w-3.5 h-3.5 text-panel-muted" />
                                                    {backup.generated_by}
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-sm text-panel-muted">
                                                <div className="flex items-center gap-1.5">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    {formatDateTime(backup.created_at)}
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-sm text-panel-muted max-w-[150px] truncate">
                                                {backup.remarks || '-'}
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={() => handleDownload(backup)}
                                                        className="p-2 rounded-lg text-panel-muted hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
                                                        title="下载"
                                                    >
                                                        <Download className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => setRestoreModal({
                                                            isOpen: true,
                                                            backupId: backup.id,
                                                            backupName: backup.filename
                                                        })}
                                                        className="p-2 rounded-lg text-panel-muted hover:text-amber-400 hover:bg-amber-500/10 transition-all"
                                                        title="恢复"
                                                    >
                                                        <RotateCcw className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteModal({
                                                            isOpen: true,
                                                            backupId: backup.id,
                                                            backupName: backup.filename
                                                        })}
                                                        className="p-2 rounded-lg text-panel-muted hover:text-red-400 hover:bg-red-500/10 transition-all"
                                                        title="删除"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-panel-border/60">
                            <span className="text-sm text-panel-muted">
                                共 {total} 条记录，第 {page} / {totalPages} 页
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="px-3 py-1.5 rounded-lg bg-panel-bg border border-panel-border text-panel-text text-sm hover:bg-panel-border/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    上一页
                                </button>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="px-3 py-1.5 rounded-lg bg-panel-bg border border-panel-border text-panel-text text-sm hover:bg-panel-border/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    下一页
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="dashboard-card p-6">
                    <h3 className="text-lg font-semibold text-panel-text mb-4 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-400" />
                        备份说明
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-panel-bg/50 rounded-xl p-4 border border-panel-border/60">
                            <div className="text-honey-400 font-medium mb-2 text-sm">📦 全量备份</div>
                            <p className="text-xs text-panel-muted leading-relaxed">
                                每次备份包含所有业务数据表和对象存储文件清单，支持完整恢复。
                            </p>
                        </div>
                        <div className="bg-panel-bg/50 rounded-xl p-4 border border-panel-border/60">
                            <div className="text-emerald-400 font-medium mb-2 text-sm">🔄 自动快照</div>
                            <p className="text-xs text-panel-muted leading-relaxed">
                                恢复前自动生成当前数据快照，确保可以随时回滚到恢复前状态。
                            </p>
                        </div>
                        <div className="bg-panel-bg/50 rounded-xl p-4 border border-panel-border/60">
                            <div className="text-red-400 font-medium mb-2 text-sm">⚠️ 二次确认</div>
                            <p className="text-xs text-panel-muted leading-relaxed">
                                删除和恢复操作均需二次确认，防止误操作导致数据丢失。
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <DeleteConfirmModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, backupId: null, backupName: '' })}
                onConfirm={handleDelete}
                backupName={deleteModal.backupName}
            />

            <RestoreConfirmModal
                isOpen={restoreModal.isOpen}
                onClose={() => setRestoreModal({ isOpen: false, backupId: null, backupName: '' })}
                onConfirm={handleRestore}
                backupName={restoreModal.backupName}
            />
        </div>
    );
}

export default BackupScreen;
