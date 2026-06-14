import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
    Database, Download, RotateCcw, Trash2, Plus, FileArchive,
    Clock, User, FileText, AlertTriangle, Check, X, Loader2,
    HardDrive, History, ShieldCheck, Undo2, Archive, Camera
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

function DeleteConfirmModal({ isOpen, onClose, onConfirm, backupName, type = 'backup' }) {
    if (!isOpen) return null;
    const isSnapshot = type === 'snapshot';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md bg-panel-card border border-panel-border rounded-2xl shadow-2xl overflow-hidden">
                <div className="flex items-center gap-3 px-6 py-4 border-b border-panel-border/60">
                    <div className="p-2 rounded-xl bg-red-500/20">
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-panel-text">
                            确认删除{isSnapshot ? '快照' : '备份'}
                        </h2>
                        <p className="text-xs text-panel-muted">此操作不可撤销</p>
                    </div>
                </div>

                <div className="p-6">
                    <p className="text-panel-text mb-2">确定要删除以下{isSnapshot ? '快照' : '备份'}吗？</p>
                    <div className="bg-panel-bg/50 rounded-lg p-3 border border-panel-border/60">
                        <div className="flex items-center gap-2">
                            <FileArchive className="w-4 h-4 text-honey-400" />
                            <span className="font-mono text-sm text-panel-text">{backupName}</span>
                        </div>
                    </div>
                    <p className="text-red-400 text-sm mt-4 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4" />
                        删除后将无法恢复该{isSnapshot ? '快照' : '备份'}文件
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
                                    <li>• 系统将自动生成<b>当前数据快照</b>用于回滚</li>
                                    <li>• 可在「快照管理」Tab 中查看并执行回滚</li>
                                    <li>• 恢复操作将覆盖当前所有业务数据</li>
                                    <li>• 对象存储文件将被同步还原</li>
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

function RollbackConfirmModal({ isOpen, onClose, onConfirm, snapshotId }) {
    const [confirmText, setConfirmText] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setConfirmText('');
            setLoading(false);
        }
    }, [isOpen]);

    const handleConfirm = async () => {
        if (confirmText !== 'ROLLBACK') {
            toast.warning('请输入 ROLLBACK 确认回滚');
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
                    <div className="p-2 rounded-xl bg-purple-500/20">
                        <Undo2 className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-panel-text">快照回滚确认</h2>
                        <p className="text-xs text-panel-muted">即将回到之前的数据状态</p>
                    </div>
                </div>

                <div className="p-6 space-y-4">
                    <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <ShieldCheck className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                            <div className="space-y-2 text-sm">
                                <p className="text-purple-200 font-medium">回滚前安全保障：</p>
                                <ul className="text-purple-200/80 space-y-1 text-xs">
                                    <li>• 回滚前<b>自动再做一次快照</b>，万无一失</li>
                                    <li>• 回滚会还原所有业务数据表</li>
                                    <li>• 对象存储文件将同步恢复到快照状态</li>
                                    <li>• 回滚后可在快照列表中找到新生成的保险快照</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm text-panel-muted mb-2">
                            目标快照 ID：
                        </label>
                        <div className="bg-panel-bg/50 rounded-lg p-3 border border-panel-border/60">
                            <div className="flex items-center gap-2">
                                <Camera className="w-4 h-4 text-purple-400" />
                                <span className="font-mono text-sm text-panel-text">{snapshotId}</span>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm text-panel-muted mb-2">
                            请输入 <span className="text-red-400 font-bold">ROLLBACK</span> 以确认回滚
                        </label>
                        <input
                            type="text"
                            value={confirmText}
                            onChange={e => setConfirmText(e.target.value)}
                            placeholder="请输入 ROLLBACK"
                            className="w-full px-4 py-2.5 rounded-xl bg-panel-bg border border-panel-border text-panel-text font-mono focus:border-purple-500 outline-none"
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
                        disabled={loading || confirmText !== 'ROLLBACK'}
                        className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white transition-all text-sm font-medium flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                回滚中...
                            </>
                        ) : (
                            <>
                                <Undo2 className="w-4 h-4" />
                                确认回滚
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

function SnapshotCreatedToast({ snapshotId, onViewSnapshots }) {
    return (
        <div className="flex items-start gap-3 w-full">
            <div className="p-2 rounded-xl bg-emerald-500/20 flex-shrink-0">
                <Check className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-medium text-emerald-100">数据恢复成功！</p>
                <p className="text-xs text-emerald-100/80 mt-0.5">已自动生成回滚快照，如需回滚请前往快照管理</p>
                <div className="flex items-center gap-2 mt-2">
                    <code className="px-2 py-0.5 rounded bg-black/30 text-emerald-200 font-mono text-xs">
                        {snapshotId}
                    </code>
                    <button
                        onClick={onViewSnapshots}
                        className="px-2.5 py-1 rounded-md bg-emerald-500/30 hover:bg-emerald-500/40 border border-emerald-500/40 text-emerald-100 text-xs font-medium transition-colors flex items-center gap-1"
                    >
                        <History className="w-3 h-3" />
                        查看快照 →
                    </button>
                </div>
            </div>
        </div>
    );
}

function BackupScreen() {
    const [activeTab, setActiveTab] = useState('backup');

    const [backups, setBackups] = useState([]);
    const [backupsTotal, setBackupsTotal] = useState(0);
    const [backupsPage, setBackupsPage] = useState(1);

    const [snapshots, setSnapshots] = useState([]);
    const [snapshotsTotal, setSnapshotsTotal] = useState(0);
    const [snapshotsPage, setSnapshotsPage] = useState(1);

    const [pageSize] = useState(10);
    const [loading, setLoading] = useState(false);
    const [snapshotsLoading, setSnapshotsLoading] = useState(false);
    const [creating, setCreating] = useState(false);
    const [backupProgress, setBackupProgress] = useState(0);

    const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, name: '', type: 'backup' });
    const [restoreModal, setRestoreModal] = useState({ isOpen: false, backupId: null, backupName: '' });
    const [rollbackModal, setRollbackModal] = useState({ isOpen: false, snapshotId: '' });
    const [remarks, setRemarks] = useState('');
    const [showRemarksInput, setShowRemarksInput] = useState(false);

    const fetchBackups = useCallback(async () => {
        setLoading(true);
        try {
            const resp = await axios.get(`${API_BASE_URL}/api/backup`, {
                params: { page: backupsPage, page_size: pageSize }
            });
            setBackups(resp.data.records || []);
            setBackupsTotal(resp.data.total || 0);
        } catch (err) {
            toast.error('获取备份列表失败');
        } finally {
            setLoading(false);
        }
    }, [backupsPage, pageSize]);

    const fetchSnapshots = useCallback(async () => {
        setSnapshotsLoading(true);
        try {
            const resp = await axios.get(`${API_BASE_URL}/api/backup/snapshots/list`, {
                params: { page: snapshotsPage, page_size: pageSize }
            });
            setSnapshots(resp.data.records || []);
            setSnapshotsTotal(resp.data.total || 0);
        } catch (err) {
            toast.error('获取快照列表失败');
        } finally {
            setSnapshotsLoading(false);
        }
    }, [snapshotsPage, pageSize]);

    useEffect(() => {
        fetchBackups();
    }, [fetchBackups]);

    useEffect(() => {
        if (activeTab === 'snapshot') {
            fetchSnapshots();
        }
    }, [activeTab, fetchSnapshots]);

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
            await axios.post(`${API_BASE_URL}/api/backup`, {
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

    const handleDownloadBackup = (backup) => {
        const url = `${API_BASE_URL}/api/backup/${backup.id}/download`;
        const a = document.createElement('a');
        a.href = url;
        a.download = backup.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success('开始下载备份文件');
    };

    const handleDownloadSnapshot = (snapshot) => {
        const url = `${API_BASE_URL}/api/backup/snapshots/${snapshot.snapshot_id}/download`;
        const a = document.createElement('a');
        a.href = url;
        a.download = `${snapshot.snapshot_id}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success('开始下载快照文件');
    };

    const handleRestore = async () => {
        const backupId = restoreModal.backupId;
        try {
            const resp = await axios.post(`${API_BASE_URL}/api/backup/${backupId}/restore`, {
                generated_by: 'admin',
                confirm_text: 'RESTORE'
            });
            const snapshotId = resp.data.snapshot_id;
            toast(
                <SnapshotCreatedToast
                    snapshotId={snapshotId}
                    onViewSnapshots={() => {
                        setActiveTab('snapshot');
                        fetchSnapshots();
                        toast.dismiss();
                    }}
                />,
                { type: 'success', autoClose: 8000 }
            );
            setRestoreModal({ isOpen: false, backupId: null, backupName: '' });
            fetchBackups();
        } catch (err) {
            toast.error(err.response?.data?.detail || '恢复失败');
            throw err;
        }
    };

    const handleRollback = async () => {
        const snapshotId = rollbackModal.snapshotId;
        try {
            const resp = await axios.post(
                `${API_BASE_URL}/api/backup/snapshots/${snapshotId}/rollback`,
                {
                    generated_by: 'admin',
                    confirm_text: 'ROLLBACK'
                }
            );
            const rollbackSnapshotId = resp.data.rollback_snapshot_id;
            toast(
                <div className="flex items-start gap-3 w-full">
                    <div className="p-2 rounded-xl bg-purple-500/20 flex-shrink-0">
                        <Check className="w-5 h-5 text-purple-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-medium text-purple-100">回滚成功！</p>
                        <p className="text-xs text-purple-100/80 mt-0.5">已生成回滚前保险快照，可在列表中查看</p>
                        <code className="inline-block mt-2 px-2 py-0.5 rounded bg-black/30 text-purple-200 font-mono text-xs">
                            {rollbackSnapshotId}
                        </code>
                    </div>
                </div>,
                { type: 'success', autoClose: 6000 }
            );
            setRollbackModal({ isOpen: false, snapshotId: '' });
            fetchSnapshots();
        } catch (err) {
            toast.error(err.response?.data?.detail || '回滚失败');
            throw err;
        }
    };

    const handleDeleteBackup = async () => {
        const backupId = deleteModal.id;
        try {
            await axios.delete(`${API_BASE_URL}/api/backup/${backupId}`);
            toast.success('备份已删除');
            setDeleteModal({ isOpen: false, id: null, name: '', type: 'backup' });
            fetchBackups();
        } catch (err) {
            toast.error(err.response?.data?.detail || '删除失败');
        }
    };

    const handleDeleteSnapshot = async () => {
        const snapshotId = deleteModal.id;
        try {
            await axios.delete(`${API_BASE_URL}/api/backup/snapshots/${snapshotId}`);
            toast.success('快照已删除');
            setDeleteModal({ isOpen: false, id: null, name: '', type: 'snapshot' });
            fetchSnapshots();
        } catch (err) {
            toast.error(err.response?.data?.detail || '删除失败');
        }
    };

    const backupsTotalPages = Math.ceil(backupsTotal / pageSize);
    const snapshotsTotalPages = Math.ceil(snapshotsTotal / pageSize);

    const renderBackupTab = () => (
        <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
                <div>
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
                                                onClick={() => handleDownloadBackup(backup)}
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
                                                    id: backup.id,
                                                    name: backup.filename,
                                                    type: 'backup'
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

            {backupsTotalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-panel-border/60">
                    <span className="text-sm text-panel-muted">
                        共 {backupsTotal} 条记录，第 {backupsPage} / {backupsTotalPages} 页
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setBackupsPage(p => Math.max(1, p - 1))}
                            disabled={backupsPage === 1}
                            className="px-3 py-1.5 rounded-lg bg-panel-bg border border-panel-border text-panel-text text-sm hover:bg-panel-border/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            上一页
                        </button>
                        <button
                            onClick={() => setBackupsPage(p => Math.min(backupsTotalPages, p + 1))}
                            disabled={backupsPage === backupsTotalPages}
                            className="px-3 py-1.5 rounded-lg bg-panel-bg border border-panel-border text-panel-text text-sm hover:bg-panel-border/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            下一页
                        </button>
                    </div>
                </div>
            )}
        </div>
    );

    const renderSnapshotTab = () => (
        <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-lg font-semibold text-panel-text flex items-center gap-2">
                        <Camera className="w-5 h-5 text-purple-400" />
                        快照管理
                        {snapshotsTotal > 0 && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-medium">
                                共 {snapshotsTotal} 个快照
                            </span>
                        )}
                    </h2>
                    <p className="text-sm text-panel-muted mt-1">
                        每次恢复/回滚前自动生成快照，确保数据可随时回退到任意时间点
                    </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-panel-muted">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                        可用
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-slate-500"></div>
                        已回滚
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-purple-200 text-sm mb-2">
                        <History className="w-4 h-4" />
                        恢复前快照
                    </div>
                    <p className="text-xs text-purple-200/70 leading-relaxed">
                        恢复备份前自动生成，记录恢复前的数据状态。
                    </p>
                </div>
                <div className="bg-gradient-to-r from-indigo-500/10 to-blue-500/10 border border-indigo-500/20 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-indigo-200 text-sm mb-2">
                        <ShieldCheck className="w-4 h-4" />
                        回滚前快照（保险）
                    </div>
                    <p className="text-xs text-indigo-200/70 leading-relaxed">
                        执行回滚前自动再做一次快照，双层保险，万无一失。
                    </p>
                </div>
                <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-emerald-200 text-sm mb-2">
                        <Undo2 className="w-4 h-4" />
                        一键回滚
                    </div>
                    <p className="text-xs text-emerald-200/70 leading-relaxed">
                        点击任意快照行的「回滚」按钮，确认后即可回到该时间点。
                    </p>
                </div>
            </div>

            <div className="rounded-xl border border-panel-border/60 overflow-hidden bg-panel-bg/30">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-panel-card/50 text-panel-muted text-sm">
                            <th className="px-5 py-3 font-medium">快照 ID</th>
                            <th className="px-5 py-3 font-medium">大小</th>
                            <th className="px-5 py-3 font-medium">类型</th>
                            <th className="px-5 py-3 font-medium">状态</th>
                            <th className="px-5 py-3 font-medium">生成人</th>
                            <th className="px-5 py-3 font-medium">生成时间</th>
                            <th className="px-5 py-3 font-medium">说明</th>
                            <th className="px-5 py-3 font-medium text-right">操作</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-panel-border/60">
                        {snapshotsLoading ? (
                            <tr>
                                <td colSpan="8" className="px-5 py-12 text-center text-panel-muted">
                                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                                    加载中...
                                </td>
                            </tr>
                        ) : snapshots.length === 0 ? (
                            <tr>
                                <td colSpan="8" className="px-5 py-12 text-center text-panel-muted">
                                    <History className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                    <p>暂无快照记录</p>
                                    <p className="text-xs mt-1">当执行「恢复备份」或「回滚快照」操作时自动生成</p>
                                </td>
                            </tr>
                        ) : (
                            snapshots.map(snap => (
                                <tr key={snap.snapshot_id} className="hover:bg-panel-card/30 transition-colors">
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-2">
                                            <Camera className={`w-4 h-4 flex-shrink-0 ${
                                                snap.is_restored === 'yes' ? 'text-slate-500' : 'text-purple-400'
                                            }`} />
                                            <span className={`font-mono text-sm truncate max-w-[160px] ${
                                                snap.is_restored === 'yes' ? 'text-slate-500 line-through' : 'text-panel-text'
                                            }`}>
                                                {snap.snapshot_id}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4 text-sm text-panel-text">
                                        {formatFileSize(snap.file_size)}
                                    </td>
                                    <td className="px-5 py-4">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                            snap.snapshot_type === 'pre_restore'
                                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                                : snap.snapshot_type === 'rollback_safety'
                                                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                                    : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                        }`}>
                                            {snap.snapshot_type_name}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                                            snap.is_restored === 'yes'
                                                ? 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                        }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${
                                                snap.is_restored === 'yes' ? 'bg-slate-500' : 'bg-emerald-400'
                                            }`}></span>
                                            {snap.is_restored_name}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4 text-sm text-panel-text">
                                        <div className="flex items-center gap-1.5">
                                            <User className="w-3.5 h-3.5 text-panel-muted" />
                                            {snap.generated_by}
                                        </div>
                                    </td>
                                    <td className="px-5 py-4 text-sm text-panel-muted">
                                        <div className="flex items-center gap-1.5">
                                            <Clock className="w-3.5 h-3.5" />
                                            {formatDateTime(snap.created_at)}
                                        </div>
                                    </td>
                                    <td className="px-5 py-4 text-sm text-panel-muted max-w-[220px]">
                                        <div className="flex items-center gap-1.5">
                                            <Archive className="w-3.5 h-3.5 flex-shrink-0" />
                                            <span className="truncate" title={snap.remarks || ''}>
                                                {snap.remarks || '-'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="flex items-center justify-end gap-1">
                                            <button
                                                onClick={() => handleDownloadSnapshot(snap)}
                                                className="p-2 rounded-lg text-panel-muted hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
                                                title="下载快照文件"
                                            >
                                                <Download className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => setRollbackModal({
                                                    isOpen: true,
                                                    snapshotId: snap.snapshot_id
                                                })}
                                                disabled={snap.is_restored === 'yes'}
                                                className={`p-2 rounded-lg transition-all ${
                                                    snap.is_restored === 'yes'
                                                        ? 'text-slate-600 cursor-not-allowed'
                                                        : 'text-panel-muted hover:text-purple-400 hover:bg-purple-500/10'
                                                }`}
                                                title={snap.is_restored === 'yes' ? '该快照已被回滚过' : '回滚到此快照'}
                                            >
                                                <Undo2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => setDeleteModal({
                                                    isOpen: true,
                                                    id: snap.snapshot_id,
                                                    name: snap.snapshot_id,
                                                    type: 'snapshot'
                                                })}
                                                className="p-2 rounded-lg text-panel-muted hover:text-red-400 hover:bg-red-500/10 transition-all"
                                                title="删除快照"
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

            {snapshotsTotalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-panel-border/60">
                    <span className="text-sm text-panel-muted">
                        共 {snapshotsTotal} 条记录，第 {snapshotsPage} / {snapshotsTotalPages} 页
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setSnapshotsPage(p => Math.max(1, p - 1))}
                            disabled={snapshotsPage === 1}
                            className="px-3 py-1.5 rounded-lg bg-panel-bg border border-panel-border text-panel-text text-sm hover:bg-panel-border/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            上一页
                        </button>
                        <button
                            onClick={() => setSnapshotsPage(p => Math.min(snapshotsTotalPages, p + 1))}
                            disabled={snapshotsPage === snapshotsTotalPages}
                            className="px-3 py-1.5 rounded-lg bg-panel-bg border border-panel-border text-panel-text text-sm hover:bg-panel-border/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            下一页
                        </button>
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div className="min-h-screen p-6 md:p-8 bg-panel-bg honeycomb-bg">
            <div className="max-w-6xl mx-auto space-y-6">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-honey-500 to-amber-600 rounded-2xl shadow-lg shadow-amber-500/20">
                            <HardDrive className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold gradient-text">数据备份与恢复</h1>
                            <p className="text-panel-muted text-sm mt-1">
                                业务数据库与对象存储的整库备份管理，支持快照回滚
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-honey-500/10 border border-honey-500/30 rounded-full text-xs text-honey-400 font-medium flex items-center gap-1.5">
                            <Database className="w-3.5 h-3.5" />
                            备份 {backupsTotal} 个
                        </span>
                        <span className="px-3 py-1 bg-purple-500/10 border border-purple-500/30 rounded-full text-xs text-purple-300 font-medium flex items-center gap-1.5">
                            <Camera className="w-3.5 h-3.5" />
                            快照 {snapshotsTotal} 个
                        </span>
                    </div>
                </header>

                <div className="dashboard-card overflow-hidden">
                    <div className="flex items-center border-b border-panel-border/60 px-6">
                        <button
                            onClick={() => setActiveTab('backup')}
                            className={`px-5 py-3.5 text-sm font-medium flex items-center gap-2 border-b-2 transition-all ${
                                activeTab === 'backup'
                                    ? 'text-honey-400 border-honey-500 bg-honey-500/5'
                                    : 'text-panel-muted border-transparent hover:text-panel-text'
                            }`}
                        >
                            <FileArchive className="w-4 h-4" />
                            备份列表
                            {backupsTotal > 0 && (
                                <span className="px-1.5 py-0.5 rounded bg-honey-500/20 text-honey-300 text-xs">
                                    {backupsTotal}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('snapshot')}
                            className={`px-5 py-3.5 text-sm font-medium flex items-center gap-2 border-b-2 transition-all ${
                                activeTab === 'snapshot'
                                    ? 'text-purple-400 border-purple-500 bg-purple-500/5'
                                    : 'text-panel-muted border-transparent hover:text-panel-text'
                            }`}
                        >
                            <History className="w-4 h-4" />
                            快照管理
                            {snapshotsTotal > 0 && (
                                <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 text-xs">
                                    {snapshotsTotal}
                                </span>
                            )}
                        </button>
                    </div>

                    <div className="p-6">
                        {activeTab === 'backup' ? renderBackupTab() : renderSnapshotTab()}
                    </div>
                </div>
            </div>

            <DeleteConfirmModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, id: null, name: '', type: 'backup' })}
                onConfirm={deleteModal.type === 'snapshot' ? handleDeleteSnapshot : handleDeleteBackup}
                backupName={deleteModal.name}
                type={deleteModal.type}
            />

            <RestoreConfirmModal
                isOpen={restoreModal.isOpen}
                onClose={() => setRestoreModal({ isOpen: false, backupId: null, backupName: '' })}
                onConfirm={handleRestore}
                backupName={restoreModal.backupName}
            />

            <RollbackConfirmModal
                isOpen={rollbackModal.isOpen}
                onClose={() => setRollbackModal({ isOpen: false, snapshotId: '' })}
                onConfirm={handleRollback}
                snapshotId={rollbackModal.snapshotId}
            />
        </div>
    );
}

export default BackupScreen;
