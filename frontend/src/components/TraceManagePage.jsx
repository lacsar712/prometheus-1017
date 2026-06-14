import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
    Search, QrCode, Download, Filter, Package,
    ChevronLeft, ChevronRight, MapPin, Calendar,
    Star, FileText, ExternalLink
} from 'lucide-react';
import { toast } from 'react-toastify';

const API_BASE_URL = 'http://localhost:8000';

const GRADE_COLORS = {
    '特级': 'from-amber-500 to-orange-500',
    '一级': 'from-emerald-500 to-teal-500',
    '二级': 'from-sky-500 to-blue-500',
};

function BatchCard({ batch, onViewDetail, onDownloadQR, onDownloadLabel }) {
    const gradeColor = GRADE_COLORS[batch.grade] || GRADE_COLORS['二级'];

    return (
        <div className="dashboard-card p-4 hover:scale-[1.01] transition-all cursor-pointer">
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`w-1.5 h-full min-h-[60px] rounded-full bg-gradient-to-b ${gradeColor} flex-shrink-0`} />
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono font-semibold text-panel-text">
                                {batch.batch_no}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium bg-gradient-to-r ${gradeColor} text-white`}>
                                {batch.grade}
                            </span>
                        </div>
                        <div className="text-amber-400 font-medium text-sm mb-2">
                            {batch.honey_type}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-panel-muted">
                            <div className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                <span className="truncate">{batch.farm_name}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                <span>{batch.harvest_date}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Package className="w-3 h-3" />
                                <span>{batch.net_weight} kg</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className={`px-2 py-0.5 rounded text-[10px] ${
                                    batch.status === '已出库' ? 'bg-emerald-500/20 text-emerald-400' :
                                    batch.status === '已灌装' ? 'bg-blue-500/20 text-blue-400' :
                                    batch.status === '已检测' ? 'bg-amber-500/20 text-amber-400' :
                                    'bg-slate-500/20 text-slate-400'
                                }`}>
                                    {batch.status}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0">
                    <button
                        onClick={(e) => { e.stopPropagation(); onViewDetail(batch.batch_no); }}
                        className="px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-medium hover:bg-amber-500/30 transition-all flex items-center gap-1.5"
                    >
                        <ExternalLink className="w-3.5 h-3.5" />
                        溯源页
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDownloadQR(batch.batch_no); }}
                        className="px-3 py-1.5 rounded-lg bg-sky-500/20 border border-sky-500/40 text-sky-300 text-xs font-medium hover:bg-sky-500/30 transition-all flex items-center gap-1.5"
                    >
                        <QrCode className="w-3.5 h-3.5" />
                        二维码
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDownloadLabel(batch.batch_no); }}
                        className="px-3 py-1.5 rounded-lg bg-violet-500/20 border border-violet-500/40 text-violet-300 text-xs font-medium hover:bg-violet-500/30 transition-all flex items-center gap-1.5"
                    >
                        <FileText className="w-3.5 h-3.5" />
                        瓶贴
                    </button>
                </div>
            </div>
        </div>
    );
}

function TraceManagePage() {
    const [batches, setBatches] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);

    const [searchText, setSearchText] = useState('');
    const [filterHoneyType, setFilterHoneyType] = useState('');
    const [filterGrade, setFilterGrade] = useState('');
    const [page, setPage] = useState(1);
    const pageSize = 10;

    const [honeyTypes, setHoneyTypes] = useState([]);
    const [grades, setGrades] = useState([]);

    useEffect(() => {
        fetchMeta();
    }, []);

    useEffect(() => {
        fetchBatches();
    }, [searchText, filterHoneyType, filterGrade, page]);

    const fetchMeta = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/trace/meta/honey-types`);
            setHoneyTypes(res.data.honey_types || []);
            setGrades(res.data.grades || []);
        } catch (err) {
            console.error('Failed to fetch meta:', err);
        }
    };

    const fetchBatches = async () => {
        setLoading(true);
        try {
            const params = { page, page_size: pageSize };
            if (filterHoneyType) params.honey_type = filterHoneyType;
            if (filterGrade) params.grade = filterGrade;

            const res = await axios.get(`${API_BASE_URL}/api/trace/batches`, { params });
            let batches = res.data.batches || [];

            if (searchText) {
                batches = batches.filter(b =>
                    b.batch_no.toLowerCase().includes(searchText.toLowerCase()) ||
                    b.farm_name.includes(searchText) ||
                    b.honey_type.includes(searchText)
                );
            }

            setBatches(batches);
            setTotal(res.data.total || 0);
        } catch (err) {
            toast.error('获取批次列表失败');
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetail = (batchNo) => {
        window.open(`/trace/${batchNo}`, '_blank');
    };

    const handleDownloadQR = async (batchNo) => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/trace/${batchNo}/qrcode`, {
                responseType: 'blob',
                params: { size: 400 },
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.download = `qrcode_${batchNo}.png`;
            link.click();
            window.URL.revokeObjectURL(url);
            toast.success('二维码下载成功');
        } catch (err) {
            toast.error('二维码下载失败');
        }
    };

    const handleDownloadLabel = async (batchNo) => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/trace/${batchNo}/label-pdf`, {
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = url;
            link.download = `label_${batchNo}.pdf`;
            link.click();
            window.URL.revokeObjectURL(url);
            toast.success('瓶贴PDF下载成功');
        } catch (err) {
            toast.error('瓶贴PDF下载失败');
        }
    };

    const totalPages = Math.ceil(total / pageSize);

    return (
        <div className="min-h-screen p-4 md:p-6 text-panel-text">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl shadow-lg shadow-amber-500/20">
                            <QrCode className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold gradient-text">蜂蜜溯源管理</h1>
                            <p className="text-sm text-panel-muted">批次溯源、二维码生成、瓶贴导出</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="dashboard-card p-4">
                        <div className="text-panel-muted text-sm mb-1">总批次</div>
                        <div className="text-2xl font-bold gradient-text">{total}</div>
                    </div>
                    <div className="dashboard-card p-4">
                        <div className="text-panel-muted text-sm mb-1">已出库</div>
                        <div className="text-2xl font-bold text-emerald-400">
                            {batches.filter(b => b.status === '已出库').length}
                        </div>
                    </div>
                    <div className="dashboard-card p-4">
                        <div className="text-panel-muted text-sm mb-1">特级品</div>
                        <div className="text-2xl font-bold text-amber-400">
                            {batches.filter(b => b.grade === '特级').length}
                        </div>
                    </div>
                    <div className="dashboard-card p-4">
                        <div className="text-panel-muted text-sm mb-1">蜜种数</div>
                        <div className="text-2xl font-bold text-sky-400">
                            {new Set(batches.map(b => b.honey_type)).size}
                        </div>
                    </div>
                </div>

                <div className="dashboard-card p-4 mb-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-panel-muted" />
                            <input
                                type="text"
                                placeholder="搜索批次号、蜂场、蜜种..."
                                value={searchText}
                                onChange={(e) => { setSearchText(e.target.value); setPage(1); }}
                                className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-900/50 border border-panel-border focus:border-amber-500/50 outline-none transition-all text-sm"
                            />
                        </div>
                        <select
                            value={filterHoneyType}
                            onChange={(e) => { setFilterHoneyType(e.target.value); setPage(1); }}
                            className="px-3 py-2 rounded-lg bg-slate-900/50 border border-panel-border focus:border-amber-500/50 outline-none transition-all text-sm"
                        >
                            <option value="">全部蜜种</option>
                            {honeyTypes.map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                        <select
                            value={filterGrade}
                            onChange={(e) => { setFilterGrade(e.target.value); setPage(1); }}
                            className="px-3 py-2 rounded-lg bg-slate-900/50 border border-panel-border focus:border-amber-500/50 outline-none transition-all text-sm"
                        >
                            <option value="">全部品级</option>
                            {grades.map(g => (
                                <option key={g} value={g}>{g}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="space-y-3 mb-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
                        </div>
                    ) : batches.length > 0 ? (
                        batches.map(batch => (
                            <BatchCard
                                key={batch.batch_no}
                                batch={batch}
                                onViewDetail={handleViewDetail}
                                onDownloadQR={handleDownloadQR}
                                onDownloadLabel={handleDownloadLabel}
                            />
                        ))
                    ) : (
                        <div className="text-center py-12 text-panel-muted">
                            暂无批次数据
                        </div>
                    )}
                </div>

                {total > 0 && (
                    <div className="flex items-center justify-center gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page <= 1}
                            className="px-3 py-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 text-sm disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            上一页
                        </button>
                        <span className="text-sm text-panel-muted px-4">
                            第 {page} / {totalPages || 1} 页，共 {total} 条
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages}
                            className="px-3 py-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 text-sm disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                        >
                            下一页
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default TraceManagePage;
