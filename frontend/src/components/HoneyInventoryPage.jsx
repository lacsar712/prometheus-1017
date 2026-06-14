import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
    Package, Warehouse, ArrowDownCircle, ArrowUpCircle,
    Plus, Search, X, ChevronLeft, ChevronRight, Clock,
    AlertTriangle, TrendingUp, TrendingDown, DollarSign,
    Filter, ArrowRightLeft, ClipboardCheck, Loader2,
    MapPin, Calendar, User
} from 'lucide-react';
import { toast } from 'react-toastify';

const API_BASE_URL = 'http://localhost:8000';

const FLOW_TYPE_CONFIG = {
    inbound: { label: '入库', color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', icon: ArrowDownCircle, iconColor: 'text-emerald-400' },
    outbound: { label: '出库', color: 'text-rose-400', bg: 'bg-rose-500/15', border: 'border-rose-500/30', icon: ArrowUpCircle, iconColor: 'text-rose-400' },
    transfer: { label: '调拨', color: 'text-blue-400', bg: 'bg-blue-500/15', border: 'border-blue-500/30', icon: ArrowRightLeft, iconColor: 'text-blue-400' },
    stocktake_gain: { label: '盘盈', color: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/30', icon: TrendingUp, iconColor: 'text-amber-400' },
    stocktake_loss: { label: '盘亏', color: 'text-red-400', bg: 'bg-red-500/15', border: 'border-red-500/30', icon: TrendingDown, iconColor: 'text-red-400' },
};

const SPEC_LABELS = { '250g': '250g/瓶', '500g': '500g/瓶', '1kg': '1kg/罐' };

function StatCard({ icon: Icon, label, value, unit, gradient, iconBg }) {
    return (
        <div className="dashboard-card p-5 relative overflow-hidden">
            <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl ${iconBg} shadow-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-panel-muted text-sm mb-1">{label}</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold gradient-text">{value.toLocaleString()}</span>
                        {unit && <span className="text-panel-muted text-sm">{unit}</span>}
                    </div>
                </div>
            </div>
        </div>
    );
}

function StockFlowForm({ meta, onClose, onSuccess }) {
    const [form, setForm] = useState({
        batch_no: '',
        warehouse: meta?.warehouses?.[0] || '',
        spec: meta?.specs?.[0] || '',
        flow_type: 'inbound',
        change_quantity: 1,
        operator: '',
        reason: '',
    });
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.batch_no || !form.operator) {
            toast.warning('请填写批次号和操作人');
            return;
        }
        setSubmitting(true);
        try {
            await axios.post(`${API_BASE_URL}/api/honey-inventory/flows`, form);
            toast.success('出入库录入成功');
            onSuccess();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.detail || '录入失败');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-slate-900 border border-amber-500/20 rounded-2xl p-6 w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold text-amber-200">录入出入库</h3>
                    <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-lg transition-colors">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">批次号 *</label>
                            <input type="text" value={form.batch_no} onChange={e => setForm({ ...form, batch_no: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 focus:border-amber-500 outline-none text-sm" placeholder="如 B20250601001" />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">流水类型 *</label>
                            <select value={form.flow_type} onChange={e => setForm({ ...form, flow_type: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 focus:border-amber-500 outline-none text-sm">
                                {meta?.flow_types?.map(ft => (
                                    <option key={ft.code} value={ft.code}>{ft.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">仓库 *</label>
                            <select value={form.warehouse} onChange={e => setForm({ ...form, warehouse: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 focus:border-amber-500 outline-none text-sm">
                                {meta?.warehouses?.map(wh => (
                                    <option key={wh} value={wh}>{wh}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">规格 *</label>
                            <select value={form.spec} onChange={e => setForm({ ...form, spec: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 focus:border-amber-500 outline-none text-sm">
                                {meta?.specs?.map(sp => (
                                    <option key={sp} value={sp}>{SPEC_LABELS[sp] || sp}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">操作数量 *</label>
                            <input type="number" min="1" value={form.change_quantity}
                                onChange={e => setForm({ ...form, change_quantity: parseInt(e.target.value) || 1 })}
                                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 focus:border-amber-500 outline-none text-sm" />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">操作人 *</label>
                            <input type="text" value={form.operator} onChange={e => setForm({ ...form, operator: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 focus:border-amber-500 outline-none text-sm" placeholder="姓名" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm text-slate-400 mb-1">原因/备注</label>
                        <input type="text" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 focus:border-amber-500 outline-none text-sm" placeholder="如：销售出库、采蜜入库" />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-2.5 rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 transition-colors text-sm font-medium">
                            取消
                        </button>
                        <button type="submit" disabled={submitting}
                            className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700 transition-all text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50">
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            {submitting ? '提交中...' : '确认录入'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function FlowTimeline({ flows, inventory, onClose }) {
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-slate-900 border border-amber-500/20 rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-xl font-semibold text-amber-200">出入库流水</h3>
                        <p className="text-slate-400 text-sm mt-1">
                            {inventory?.batch_no} · {inventory?.warehouse} · {SPEC_LABELS[inventory?.spec] || inventory?.spec}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-lg transition-colors">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {flows.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">暂无流水记录</div>
                ) : (
                    <div className="relative">
                        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-amber-500/40 via-amber-500/20 to-transparent" />
                        <div className="space-y-4">
                            {flows.map((flow, idx) => {
                                const cfg = FLOW_TYPE_CONFIG[flow.flow_type] || FLOW_TYPE_CONFIG.inbound;
                                const FlowIcon = cfg.icon;
                                return (
                                    <div key={flow.id} className="relative pl-12">
                                        <div className={`absolute left-3 top-1.5 w-5 h-5 rounded-full ${cfg.bg} border ${cfg.border} flex items-center justify-center`}>
                                            <FlowIcon className={`w-3 h-3 ${cfg.iconColor}`} />
                                        </div>
                                        <div className="dashboard-card p-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
                                                        {cfg.label}
                                                    </span>
                                                    <span className="text-slate-300 text-sm font-medium">
                                                        {flow.change_quantity > 0 ? '+' : ''}{flow.change_quantity}
                                                    </span>
                                                </div>
                                                <span className="text-slate-500 text-xs">
                                                    {flow.created_at ? new Date(flow.created_at).toLocaleString('zh-CN') : ''}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-3 text-xs text-slate-400">
                                                <div className="flex items-center gap-1">
                                                    <span>变更前: {flow.quantity_before}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <span>变更后: {flow.quantity_after}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <User className="w-3 h-3" />
                                                    <span>{flow.operator}</span>
                                                </div>
                                            </div>
                                            {flow.reason && (
                                                <p className="mt-2 text-xs text-slate-500 border-t border-slate-800 pt-2">{flow.reason}</p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function HoneyInventoryPage() {
    const [stats, setStats] = useState({ total_quantity: 0, total_value: 0, monthly_inbound: 0, monthly_outbound: 0 });
    const [inventories, setInventories] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(15);
    const [meta, setMeta] = useState({ warehouses: [], specs: [], flow_types: [] });
    const [loading, setLoading] = useState(false);

    const [filters, setFilters] = useState({ batch_no: '', warehouse: '', spec: '' });
    const [showForm, setShowForm] = useState(false);
    const [selectedInventory, setSelectedInventory] = useState(null);
    const [inventoryFlows, setInventoryFlows] = useState([]);
    const [batches, setBatches] = useState([]);

    const fetchStats = useCallback(async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/honey-inventory/stats`);
            setStats(res.data);
        } catch { }
    }, []);

    const fetchMeta = useCallback(async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/honey-inventory/meta`);
            setMeta(res.data);
        } catch { }
    }, []);

    const fetchInventories = useCallback(async () => {
        setLoading(true);
        try {
            const params = { page, page_size: pageSize };
            if (filters.batch_no) params.batch_no = filters.batch_no;
            if (filters.warehouse) params.warehouse = filters.warehouse;
            if (filters.spec) params.spec = filters.spec;
            const res = await axios.get(`${API_BASE_URL}/api/honey-inventory/inventories`, { params });
            setInventories(res.data.items || []);
            setTotal(res.data.total || 0);
        } catch { }
        finally { setLoading(false); }
    }, [page, pageSize, filters]);

    const fetchBatches = useCallback(async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/trace/batches`, { params: { page_size: 100 } });
            setBatches(res.data.batches || []);
        } catch { }
    }, []);

    useEffect(() => { fetchMeta(); fetchBatches(); }, [fetchMeta, fetchBatches]);
    useEffect(() => { fetchStats(); fetchInventories(); }, [fetchStats, fetchInventories]);

    const handleRowClick = async (inv) => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/honey-inventory/inventories/${inv.id}/flows`, { params: { page_size: 50 } });
            setInventoryFlows(res.data.flows || []);
            setSelectedInventory(inv);
        } catch {
            toast.error('获取流水失败');
        }
    };

    const totalPages = Math.ceil(total / pageSize);

    const getRowStyle = (inv) => {
        if (inv.is_low_stock) return 'bg-red-500/5 border-l-2 border-l-red-500';
        return 'hover:bg-amber-500/5';
    };

    const isRecentHarvest = (inv) => {
        if (!batches.length) return false;
        const batch = batches.find(b => b.batch_no === inv.batch_no);
        if (!batch || !batch.harvest_date) return false;
        const harvestDate = new Date(batch.harvest_date);
        const diffDays = (Date.now() - harvestDate.getTime()) / (1000 * 60 * 60 * 24);
        return diffDays <= 30;
    };

    return (
        <div className="min-h-screen p-4 md:p-6 hex-pattern">
            <div className="max-w-7xl mx-auto space-y-6">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-amber-500/20 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl shadow-lg shadow-amber-500/20">
                            <Package className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold gradient-text-warm">蜂蜜库存</h1>
                            <p className="text-slate-400 text-sm">成品出入库与库存追踪</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowForm(true)}
                        className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl font-medium flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        录入出入库
                    </button>
                </header>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard icon={Package} label="库存总量" value={stats.total_quantity} unit="件"
                        gradient="from-amber-500 to-orange-500" iconBg="bg-gradient-to-br from-amber-500 to-orange-500" />
                    <StatCard icon={DollarSign} label="库存价值" value={stats.total_value.toLocaleString()} unit="元"
                        gradient="from-emerald-500 to-teal-500" iconBg="bg-gradient-to-br from-emerald-500 to-teal-500" />
                    <StatCard icon={TrendingUp} label="本月入库" value={stats.monthly_inbound} unit="件"
                        gradient="from-sky-500 to-blue-500" iconBg="bg-gradient-to-br from-sky-500 to-blue-500" />
                    <StatCard icon={TrendingDown} label="本月出库" value={stats.monthly_outbound} unit="件"
                        gradient="from-rose-500 to-pink-500" iconBg="bg-gradient-to-br from-rose-500 to-pink-500" />
                </div>

                <div className="dashboard-card p-4">
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                        <div className="flex items-center gap-2 text-slate-400">
                            <Filter className="w-4 h-4" />
                            <span className="text-sm">筛选</span>
                        </div>
                        <input
                            type="text" placeholder="批次号搜索..." value={filters.batch_no}
                            onChange={e => { setFilters({ ...filters, batch_no: e.target.value }); setPage(1); }}
                            className="px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700 focus:border-amber-500 outline-none text-sm w-40"
                        />
                        <select value={filters.warehouse} onChange={e => { setFilters({ ...filters, warehouse: e.target.value }); setPage(1); }}
                            className="px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700 focus:border-amber-500 outline-none text-sm">
                            <option value="">全部仓库</option>
                            {meta.warehouses.map(wh => <option key={wh} value={wh}>{wh}</option>)}
                        </select>
                        <select value={filters.spec} onChange={e => { setFilters({ ...filters, spec: e.target.value }); setPage(1); }}
                            className="px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700 focus:border-amber-500 outline-none text-sm">
                            <option value="">全部规格</option>
                            {meta.specs.map(sp => <option key={sp} value={sp}>{SPEC_LABELS[sp] || sp}</option>)}
                        </select>
                        {(filters.batch_no || filters.warehouse || filters.spec) && (
                            <button onClick={() => { setFilters({ batch_no: '', warehouse: '', spec: '' }); setPage(1); }}
                                className="px-2 py-1 text-xs text-slate-400 hover:text-amber-400 flex items-center gap-1 transition-colors">
                                <X className="w-3 h-3" />清除筛选
                            </button>
                        )}
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-800/50 text-slate-400 text-sm">
                                    <th className="px-4 py-3 font-medium">批次号</th>
                                    <th className="px-4 py-3 font-medium">蜜种</th>
                                    <th className="px-4 py-3 font-medium">等级</th>
                                    <th className="px-4 py-3 font-medium">仓库</th>
                                    <th className="px-4 py-3 font-medium">规格</th>
                                    <th className="px-4 py-3 font-medium text-right">数量</th>
                                    <th className="px-4 py-3 font-medium text-right">单价(元)</th>
                                    <th className="px-4 py-3 font-medium text-right">价值(元)</th>
                                    <th className="px-4 py-3 font-medium">状态</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {loading ? (
                                    <tr><td colSpan="9" className="px-4 py-12 text-center text-slate-500">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />加载中...
                                    </td></tr>
                                ) : inventories.length === 0 ? (
                                    <tr><td colSpan="9" className="px-4 py-12 text-center text-slate-500 italic">暂无库存数据</td></tr>
                                ) : inventories.map(inv => (
                                    <tr key={inv.id}
                                        className={`cursor-pointer transition-colors ${getRowStyle(inv)}`}
                                        onClick={() => handleRowClick(inv)}
                                    >
                                        <td className="px-4 py-3">
                                            <span className="text-amber-300 font-mono text-sm">{inv.batch_no}</span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-300">{inv.honey_type || '-'}</td>
                                        <td className="px-4 py-3 text-sm">
                                            <span className={`px-1.5 py-0.5 rounded text-xs ${
                                                inv.grade === '特级' ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' :
                                                inv.grade === '一级' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' :
                                                'bg-slate-500/15 text-slate-300 border border-slate-500/30'
                                            }`}>
                                                {inv.grade || '-'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-300">
                                            <span className="flex items-center gap-1">
                                                <Warehouse className="w-3.5 h-3.5 text-slate-500" />
                                                {inv.warehouse}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-300">{SPEC_LABELS[inv.spec] || inv.spec}</td>
                                        <td className="px-4 py-3 text-sm text-right font-medium text-slate-200">{inv.quantity}</td>
                                        <td className="px-4 py-3 text-sm text-right text-slate-400">{inv.unit_price.toFixed(2)}</td>
                                        <td className="px-4 py-3 text-sm text-right text-slate-300">{inv.total_value.toLocaleString()}</td>
                                        <td className="px-4 py-3 text-sm">
                                            <div className="flex items-center gap-1.5">
                                                {inv.is_low_stock && (
                                                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-red-500/15 text-red-400 border border-red-500/30">
                                                        <AlertTriangle className="w-3 h-3" />低库存
                                                    </span>
                                                )}
                                                {isRecentHarvest(inv) && !inv.is_low_stock && (
                                                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                                        近期采蜜
                                                    </span>
                                                )}
                                                {!inv.is_low_stock && !isRecentHarvest(inv) && (
                                                    <span className="px-1.5 py-0.5 rounded text-xs bg-slate-500/15 text-slate-400 border border-slate-500/30">正常</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-800/50">
                            <span className="text-sm text-slate-500">
                                共 {total} 条 · 第 {page}/{totalPages} 页
                            </span>
                            <div className="flex items-center gap-2">
                                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                                    className="p-1.5 rounded-lg bg-slate-800/50 border border-slate-700 disabled:opacity-30 hover:border-amber-500/40 transition-colors">
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                                    className="p-1.5 rounded-lg bg-slate-800/50 border border-slate-700 disabled:opacity-30 hover:border-amber-500/40 transition-colors">
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {showForm && (
                <StockFlowForm meta={meta} onClose={() => setShowForm(false)}
                    onSuccess={() => { fetchStats(); fetchInventories(); }} />
            )}

            {selectedInventory && (
                <FlowTimeline
                    flows={inventoryFlows}
                    inventory={selectedInventory}
                    onClose={() => { setSelectedInventory(null); setInventoryFlows([]); }}
                />
            )}
        </div>
    );
}
