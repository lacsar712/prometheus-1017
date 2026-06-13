import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import {
    Droplets, Package, AlertTriangle, Plus, Search, Filter,
    Calendar, ChevronLeft, ChevronRight, Check, X, Sparkles,
    TrendingDown, TrendingUp, Clock, MapPin, Bug, Scale,
    Thermometer, Sun, Wind
} from 'lucide-react';
import { toast } from 'react-toastify';

const API_BASE_URL = 'http://localhost:8000';

const PERIOD_NAMES = {
    spring_breeding: '春繁期',
    autumn_breeding: '秋繁期',
    wintering: '越冬期',
    normal: '常规期'
};

const FEED_ICONS = {
    sugar_syrup: Droplets,
    pollen_cake: Package,
    compound_feed: Package,
    mineral_salt_water: Droplets
};

const FEED_COLORS = {
    sugar_syrup: 'from-amber-500 to-orange-500',
    pollen_cake: 'from-yellow-500 to-amber-500',
    compound_feed: 'from-green-500 to-emerald-500',
    mineral_salt_water: 'from-blue-500 to-cyan-500'
};

function StockCard({ stock }) {
    const Icon = FEED_ICONS[stock.feed_type] || Package;
    const percentage = (stock.current_stock / stock.safety_stock) * 100;
    const isLow = stock.is_below_safety;

    return (
        <div className={`dashboard-card p-5 relative overflow-hidden transition-all hover:scale-[1.02] ${isLow ? 'ring-2 ring-red-500/50' : ''}`}>
            {isLow && (
                <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1 bg-red-500/20 border border-red-500/40 rounded-full text-red-400 text-xs font-medium animate-pulse">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    库存预警
                </div>
            )}
            <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${FEED_COLORS[stock.feed_type]} shadow-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-panel-text mb-1">{stock.feed_name}</h3>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold gradient-text">{stock.current_stock.toLocaleString()}</span>
                        <span className="text-panel-muted text-sm">{stock.unit}</span>
                    </div>
                </div>
            </div>
            
            <div className="mt-4 space-y-3">
                <div className="h-2 bg-panel-border/50 rounded-full overflow-hidden">
                    <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                            isLow ? 'bg-gradient-to-r from-red-500 to-red-400' : 
                            percentage < 120 ? 'bg-gradient-to-r from-yellow-500 to-amber-400' : 
                            'bg-gradient-to-r from-green-500 to-emerald-400'
                        }`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                        <TrendingDown className="w-4 h-4 text-orange-400" />
                        <span className="text-panel-muted">本月用量</span>
                        <span className="text-panel-text font-medium ml-auto">{stock.monthly_usage} {stock.unit}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Scale className="w-4 h-4 text-blue-400" />
                        <span className="text-panel-muted">安全库存</span>
                        <span className="text-panel-text font-medium ml-auto">{stock.safety_stock} {stock.unit}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function RatioRecommendationTool({ onApplyRatio, onApplyAmount }) {
    const [solarTerm, setSolarTerm] = useState('');
    const [temperature, setTemperature] = useState('20');
    const [colonyStrength, setColonyStrength] = useState('medium');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

    const getRecommendation = useCallback(async () => {
        if (!solarTerm) {
            toast.warning('请选择节气');
            return;
        }
        setLoading(true);
        try {
            const resp = await axios.post(`${API_BASE_URL}/api/feeding/ratio-recommendation`, {
                solar_term: solarTerm,
                temperature: parseFloat(temperature) || 0,
                colony_strength: colonyStrength
            });
            setResult(resp.data);
            toast.success('已获取配比建议');
        } catch (err) {
            toast.error('获取配比建议失败');
        } finally {
            setLoading(false);
        }
    }, [solarTerm, temperature, colonyStrength]);

    const handleApplyRatio = () => {
        if (result?.recommended_ratio) {
            onApplyRatio(result.recommended_ratio);
            toast.success('已应用推荐配比');
        }
    };

    const handleApplyAmount = () => {
        if (result?.amount_suggestion) {
            onApplyAmount(result.amount_suggestion.per_hive_kg);
            toast.success('已应用推荐用量');
        }
    };

    return (
        <div className="dashboard-card p-5">
            <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
                    <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-panel-text">配比建议小工具</h3>
                    <p className="text-xs text-panel-muted">输入条件获取智能饲喂建议</p>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
                <div>
                    <label className="block text-xs text-panel-muted mb-1.5">节气</label>
                    <select
                        value={solarTerm}
                        onChange={e => setSolarTerm(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-panel-bg border border-panel-border text-panel-text text-sm focus:border-honey-500 outline-none"
                    >
                        <option value="">选择节气</option>
                        {['立春', '雨水', '惊蛰', '春分', '清明', '谷雨',
                          '立夏', '小满', '芒种', '夏至', '小暑', '大暑',
                          '立秋', '处暑', '白露', '秋分', '寒露', '霜降',
                          '立冬', '小雪', '大雪', '冬至', '小寒', '大寒'].map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-xs text-panel-muted mb-1.5">气温 (°C)</label>
                    <div className="relative">
                        <Thermometer className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-panel-muted" />
                        <input
                            type="number"
                            value={temperature}
                            onChange={e => setTemperature(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 rounded-lg bg-panel-bg border border-panel-border text-panel-text text-sm focus:border-honey-500 outline-none"
                            placeholder="20"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-xs text-panel-muted mb-1.5">目标群势</label>
                    <select
                        value={colonyStrength}
                        onChange={e => setColonyStrength(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-panel-bg border border-panel-border text-panel-text text-sm focus:border-honey-500 outline-none"
                    >
                        <option value="weak">弱群</option>
                        <option value="medium">中等群</option>
                        <option value="strong">强群</option>
                    </select>
                </div>
            </div>

            <button
                onClick={getRecommendation}
                disabled={loading || !solarTerm}
                className="w-full py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? (
                    <><Clock className="w-4 h-4 animate-spin" /> 计算中...</>
                ) : (
                    <><Sparkles className="w-4 h-4" /> 获取配比建议</>
                )}
            </button>

            {result && (
                <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <span className="text-sm text-panel-muted">{result.period_name} · {result.strength_name}</span>
                            <div className="text-2xl font-bold gradient-text mt-1">
                                {result.recommended_ratio}
                                <span className="text-sm font-normal text-panel-muted ml-2">白糖:水</span>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleApplyRatio}
                                className="px-3 py-1.5 rounded-lg bg-honey-500/20 border border-honey-500/40 text-honey-400 text-xs font-medium hover:bg-honey-500/30 transition-all flex items-center gap-1"
                            >
                                <Check className="w-3.5 h-3.5" />
                                应用配比
                            </button>
                            <button
                                onClick={handleApplyAmount}
                                className="px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-medium hover:bg-emerald-500/30 transition-all flex items-center gap-1"
                            >
                                <Check className="w-3.5 h-3.5" />
                                应用用量
                            </button>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                        <div className="flex items-center gap-2">
                            <Sun className="w-4 h-4 text-orange-400" />
                            <span className="text-panel-muted">建议用量</span>
                            <span className="text-panel-text font-medium ml-auto">{result.amount_suggestion.per_hive_kg} kg/箱</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-blue-400" />
                            <span className="text-panel-muted">饲喂频率</span>
                            <span className="text-panel-text font-medium ml-auto">每 {result.amount_suggestion.frequency_days} 天</span>
                        </div>
                    </div>

                    <div className="text-xs text-panel-muted whitespace-pre-line leading-relaxed bg-panel-bg/50 p-3 rounded-lg">
                        {result.explanation}
                    </div>
                </div>
            )}
        </div>
    );
}

function AddFeedingModal({ isOpen, onClose, onSuccess, farms, hives, feedTypes }) {
    const [farmId, setFarmId] = useState('');
    const [selectedHives, setSelectedHives] = useState([]);
    const [feedType, setFeedType] = useState('sugar_syrup');
    const [ratio, setRatio] = useState('1:1');
    const [amountPerHive, setAmountPerHive] = useState('1');
    const [feeder, setFeeder] = useState('');
    const [feedingTime, setFeedingTime] = useState(new Date().toISOString().slice(0, 16));
    const [colonyStatus, setColonyStatus] = useState('');
    const [notes, setNotes] = useState('');
    const [period, setPeriod] = useState('spring_breeding');
    const [loading, setLoading] = useState(false);
    const [hiveSearch, setHiveSearch] = useState('');
    const [selectAll, setSelectAll] = useState(false);

    const filteredHives = useMemo(() => {
        return hives.filter(h => {
            const matchesFarm = !farmId || h.farm_id === farmId;
            const matchesSearch = !hiveSearch || 
                h.hive_number.toLowerCase().includes(hiveSearch.toLowerCase()) ||
                h.location.toLowerCase().includes(hiveSearch.toLowerCase());
            return matchesFarm && matchesSearch;
        });
    }, [hives, farmId, hiveSearch]);

    useEffect(() => {
        if (!isOpen) {
            setFarmId('');
            setSelectedHives([]);
            setFeedType('sugar_syrup');
            setRatio('1:1');
            setAmountPerHive('1');
            setFeeder('');
            setFeedingTime(new Date().toISOString().slice(0, 16));
            setColonyStatus('');
            setNotes('');
            setPeriod('spring_breeding');
            setHiveSearch('');
            setSelectAll(false);
        }
    }, [isOpen]);

    useEffect(() => {
        setSelectedHives([]);
        setSelectAll(false);
    }, [farmId]);

    const toggleHive = (hiveId) => {
        setSelectedHives(prev => 
            prev.includes(hiveId) 
                ? prev.filter(id => id !== hiveId)
                : [...prev, hiveId]
        );
    };

    const toggleSelectAll = () => {
        if (selectAll) {
            setSelectedHives([]);
            setSelectAll(false);
        } else {
            setSelectedHives(filteredHives.map(h => h.id));
            setSelectAll(true);
        }
    };

    const handleSubmit = async () => {
        if (!farmId) {
            toast.warning('请选择蜂场');
            return;
        }
        if (selectedHives.length === 0) {
            toast.warning('请至少选择一个蜂箱');
            return;
        }
        if (!feeder.trim()) {
            toast.warning('请填写饲喂人');
            return;
        }
        if (!amountPerHive || parseFloat(amountPerHive) <= 0) {
            toast.warning('请填写有效的每箱用量');
            return;
        }

        setLoading(true);
        try {
            await axios.post(`${API_BASE_URL}/api/feeding/records`, {
                farm_id: farmId,
                hive_ids: selectedHives,
                feed_type: feedType,
                ratio: ratio || null,
                amount_per_hive: parseFloat(amountPerHive),
                feeder: feeder.trim(),
                feeding_time: feedingTime,
                colony_status: colonyStatus.trim() || null,
                notes: notes.trim() || null,
                period: period
            });
            toast.success(`成功为 ${selectedHives.length} 个蜂箱登记饲喂记录`);
            onSuccess();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.detail || '提交失败');
        } finally {
            setLoading(false);
        }
    };

    const totalAmount = useMemo(() => {
        const amt = parseFloat(amountPerHive) || 0;
        return (amt * selectedHives.length).toFixed(2);
    }, [amountPerHive, selectedHives.length]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-5xl max-h-[90vh] bg-panel-card border border-panel-border rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-panel-border/60">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-honey-500 to-amber-500">
                            <Droplets className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-panel-text">新增饲喂记录</h2>
                            <p className="text-xs text-panel-muted">支持批量选择多个蜂箱登记相同饲喂</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-panel-border/30 text-panel-muted hover:text-panel-text transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    <div className="grid grid-cols-12 gap-6">
                        <div className="col-span-5 space-y-4">
                            <div>
                                <label className="block text-sm text-panel-muted mb-1.5">选择蜂场 <span className="text-red-400">*</span></label>
                                <select
                                    value={farmId}
                                    onChange={e => setFarmId(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl bg-panel-bg border border-panel-border text-panel-text focus:border-honey-500 outline-none"
                                >
                                    <option value="">请选择蜂场</option>
                                    {farms.map(f => (
                                        <option key={f.id} value={f.id}>{f.name}</option>
                                    ))}
                                </select>
                            </div>

                            {farmId && (
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="text-sm text-panel-muted">选择蜂箱 <span className="text-red-400">*</span></label>
                                        <span className="text-xs text-honey-400">
                                            已选 {selectedHives.length} / {filteredHives.length} 个
                                        </span>
                                    </div>
                                    <div className="relative mb-2">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-panel-muted" />
                                        <input
                                            type="text"
                                            value={hiveSearch}
                                            onChange={e => setHiveSearch(e.target.value)}
                                            placeholder="搜索蜂箱编号或位置..."
                                            className="w-full pl-9 pr-4 py-2 rounded-lg bg-panel-bg border border-panel-border text-panel-text text-sm focus:border-honey-500 outline-none"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between px-3 py-2 bg-panel-bg/50 rounded-lg mb-2">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={selectAll && filteredHives.length > 0}
                                                onChange={toggleSelectAll}
                                                className="w-4 h-4 rounded text-honey-500 border-panel-border focus:ring-honey-500 bg-panel-bg"
                                            />
                                            <span className="text-sm text-panel-text">全选当前筛选结果</span>
                                        </label>
                                    </div>
                                    <div className="h-64 overflow-y-auto rounded-xl border border-panel-border/60 bg-panel-bg/30 timeline-scroll">
                                        {filteredHives.length > 0 ? (
                                            <div className="p-2 space-y-1">
                                                {filteredHives.map(hive => (
                                                    <label
                                                        key={hive.id}
                                                        className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all ${
                                                            selectedHives.includes(hive.id) 
                                                                ? 'bg-honey-500/15 border border-honey-500/40' 
                                                                : 'hover:bg-panel-border/20 border border-transparent'
                                                        }`}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedHives.includes(hive.id)}
                                                            onChange={() => toggleHive(hive.id)}
                                                            className="w-4 h-4 rounded text-honey-500 border-panel-border focus:ring-honey-500 bg-panel-bg"
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                            <div className="font-medium text-panel-text text-sm">{hive.hive_number}</div>
                                                            <div className="text-xs text-panel-muted flex items-center gap-1">
                                                                <MapPin className="w-3 h-3" />
                                                                {hive.location}
                                                            </div>
                                                        </div>
                                                    </label>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="h-full flex items-center justify-center text-panel-muted text-sm">
                                                {farmId ? '未找到匹配的蜂箱' : '请先选择蜂场'}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="col-span-7 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-panel-muted mb-1.5">饲喂物 <span className="text-red-400">*</span></label>
                                    <select
                                        value={feedType}
                                        onChange={e => setFeedType(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl bg-panel-bg border border-panel-border text-panel-text focus:border-honey-500 outline-none"
                                    >
                                        {feedTypes.map(ft => (
                                            <option key={ft.code} value={ft.code}>{ft.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-panel-muted mb-1.5">饲喂时期 <span className="text-red-400">*</span></label>
                                    <select
                                        value={period}
                                        onChange={e => setPeriod(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl bg-panel-bg border border-panel-border text-panel-text focus:border-honey-500 outline-none"
                                    >
                                        <option value="spring_breeding">春繁期</option>
                                        <option value="autumn_breeding">秋繁期</option>
                                        <option value="wintering">越冬期</option>
                                        <option value="normal">常规期</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-panel-muted mb-1.5">配比 (白糖:水)</label>
                                    <input
                                        type="text"
                                        value={ratio}
                                        onChange={e => setRatio(e.target.value)}
                                        placeholder="如 1:1"
                                        className="w-full px-4 py-2.5 rounded-xl bg-panel-bg border border-panel-border text-panel-text focus:border-honey-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-panel-muted mb-1.5">每箱用量 (kg) <span className="text-red-400">*</span></label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        value={amountPerHive}
                                        onChange={e => setAmountPerHive(e.target.value)}
                                        placeholder="1.0"
                                        className="w-full px-4 py-2.5 rounded-xl bg-panel-bg border border-panel-border text-panel-text focus:border-honey-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="p-4 rounded-xl bg-gradient-to-r from-honey-500/10 to-amber-500/10 border border-honey-500/20">
                                <div className="flex items-center justify-between">
                                    <span className="text-panel-muted text-sm">本次总用量</span>
                                    <div className="text-right">
                                        <span className="text-2xl font-bold gradient-text">{totalAmount}</span>
                                        <span className="text-panel-muted text-sm ml-1">kg</span>
                                    </div>
                                </div>
                                <div className="text-xs text-panel-muted mt-1">
                                    {selectedHives.length} 个蜂箱 × {amountPerHive || 0} kg/箱
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-panel-muted mb-1.5">饲喂人 <span className="text-red-400">*</span></label>
                                    <input
                                        type="text"
                                        value={feeder}
                                        onChange={e => setFeeder(e.target.value)}
                                        placeholder="请输入饲喂人姓名"
                                        className="w-full px-4 py-2.5 rounded-xl bg-panel-bg border border-panel-border text-panel-text focus:border-honey-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-panel-muted mb-1.5">饲喂时间 <span className="text-red-400">*</span></label>
                                    <input
                                        type="datetime-local"
                                        value={feedingTime}
                                        onChange={e => setFeedingTime(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl bg-panel-bg border border-panel-border text-panel-text focus:border-honey-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm text-panel-muted mb-1.5">当时蜂群状态</label>
                                <textarea
                                    value={colonyStatus}
                                    onChange={e => setColonyStatus(e.target.value)}
                                    placeholder="记录饲喂时的蜂群状态，如：蜂数约5脾，子脾整齐..."
                                    rows={2}
                                    className="w-full px-4 py-2.5 rounded-xl bg-panel-bg border border-panel-border text-panel-text focus:border-honey-500 outline-none resize-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-panel-muted mb-1.5">备注</label>
                                <textarea
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    placeholder="其他需要记录的信息..."
                                    rows={2}
                                    className="w-full px-4 py-2.5 rounded-xl bg-panel-bg border border-panel-border text-panel-text focus:border-honey-500 outline-none resize-none"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between px-6 py-4 border-t border-panel-border/60 bg-panel-bg/30">
                    <div className="text-sm text-panel-muted">
                        <span className="text-red-400">*</span> 标记为必填项
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 rounded-xl border border-panel-border text-panel-text hover:bg-panel-border/30 transition-colors"
                        >
                            取消
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="px-8 py-2.5 rounded-xl bg-gradient-to-r from-honey-500 to-amber-500 hover:from-honey-600 hover:to-amber-600 text-white font-medium flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-honey-500/20"
                        >
                            {loading ? (
                                <><Clock className="w-4 h-4 animate-spin" /> 提交中...</>
                            ) : (
                                <><Check className="w-4 h-4" /> 提交记录</>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function FeedingScreen() {
    const [stocks, setStocks] = useState([]);
    const [records, setRecords] = useState([]);
    const [recordsTotal, setRecordsTotal] = useState(0);
    const [farms, setFarms] = useState([]);
    const [hives, setHives] = useState([]);
    const [feedTypes, setFeedTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [recordsLoading, setRecordsLoading] = useState(false);
    const [unreadMessages, setUnreadMessages] = useState(0);

    const [filters, setFilters] = useState({
        farm_id: '',
        feed_type: '',
        start_time: '',
        end_time: ''
    });
    const [page, setPage] = useState(1);
    const [pageSize] = useState(20);

    const [showAddModal, setShowAddModal] = useState(false);

    const fetchStocks = useCallback(async () => {
        try {
            const resp = await axios.get(`${API_BASE_URL}/api/stocks`);
            setStocks(resp.data.stocks);
        } catch (err) {
            console.error('获取库存失败:', err);
        }
    }, []);

    const fetchRecords = useCallback(async () => {
        setRecordsLoading(true);
        try {
            const params = { page, page_size: pageSize };
            if (filters.farm_id) params.farm_id = filters.farm_id;
            if (filters.feed_type) params.feed_type = filters.feed_type;
            if (filters.start_time) params.start_time = filters.start_time;
            if (filters.end_time) params.end_time = filters.end_time;
            
            const resp = await axios.get(`${API_BASE_URL}/api/feeding/records`, { params });
            setRecords(resp.data.records);
            setRecordsTotal(resp.data.total);
        } catch (err) {
            console.error('获取记录失败:', err);
        } finally {
            setRecordsLoading(false);
        }
    }, [page, pageSize, filters]);

    const fetchMessages = useCallback(async () => {
        try {
            const resp = await axios.get(`${API_BASE_URL}/api/messages`, { params: { unread_only: true } });
            setUnreadMessages(resp.data.unread_count);
        } catch (err) {
            console.error('获取消息失败:', err);
        }
    }, []);

    const fetchFarmsAndHives = useCallback(async () => {
        try {
            const [farmsResp, hivesResp, typesResp] = await Promise.all([
                axios.get(`${API_BASE_URL}/api/dashboard/farms`),
                axios.get(`${API_BASE_URL}/api/feeding/hives`),
                axios.get(`${API_BASE_URL}/api/feeding/feed-types`)
            ]);
            setFarms(farmsResp.data.farms);
            setHives(hivesResp.data.hives);
            setFeedTypes(typesResp.data.feed_types);
        } catch (err) {
            console.error('获取基础数据失败:', err);
        }
    }, []);

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            await Promise.all([fetchFarmsAndHives(), fetchStocks(), fetchRecords(), fetchMessages()]);
            setLoading(false);
        };
        init();
    }, [fetchFarmsAndHives, fetchStocks, fetchRecords, fetchMessages]);

    useEffect(() => {
        fetchRecords();
    }, [page, filters]);

    const handleRefresh = () => {
        fetchStocks();
        fetchRecords();
        fetchMessages();
    };

    const handleApplyRatio = (ratioValue) => {
        const input = document.querySelector('input[placeholder="如 1:1"]');
        if (input) {
            const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            nativeSetter.call(input, ratioValue);
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }
    };

    const handleApplyAmount = (amount) => {
        const input = document.querySelector('input[placeholder="1.0"]');
        if (input) {
            const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            nativeSetter.call(input, amount.toString());
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }
    };

    const totalPages = Math.ceil(recordsTotal / pageSize);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-panel-bg">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 relative">
                        <div className="absolute inset-0 rounded-full border-4 border-panel-border"></div>
                        <div className="absolute inset-0 rounded-full border-4 border-t-honey-500 border-r-honey-400 border-b-transparent border-l-transparent animate-spin"></div>
                    </div>
                    <div className="text-panel-muted">加载中...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-6 bg-panel-bg honeycomb-bg">
            <div className="max-w-7xl mx-auto space-y-6">
                <header className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-honey-500 to-amber-500 rounded-2xl shadow-lg shadow-honey-500/20">
                            <Droplets className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold gradient-text">蜂群饲喂台账</h1>
                            <p className="text-sm text-panel-muted">春繁 · 秋繁 · 越冬期 全周期饲喂管理</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {unreadMessages > 0 && (
                            <div className="relative px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4" />
                                <span>库存预警</span>
                                <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                                    {unreadMessages}
                                </span>
                            </div>
                        )}
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-honey-500 to-amber-500 hover:from-honey-600 hover:to-amber-600 text-white font-medium flex items-center gap-2 transition-all shadow-lg shadow-honey-500/20"
                        >
                            <Plus className="w-4 h-4" />
                            新增饲喂记录
                        </button>
                    </div>
                </header>

                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <Package className="w-5 h-5 text-honey-400" />
                        <h2 className="text-lg font-semibold text-panel-text">物资库存看板</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {stocks.map(stock => (
                            <StockCard key={stock.feed_type} stock={stock} />
                        ))}
                    </div>
                </section>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1">
                        <RatioRecommendationTool 
                            onApplyRatio={handleApplyRatio}
                            onApplyAmount={handleApplyAmount}
                        />
                    </div>

                    <div className="lg:col-span-2">
                        <section className="dashboard-card p-5">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <Filter className="w-5 h-5 text-honey-400" />
                                    <h2 className="text-lg font-semibold text-panel-text">饲喂记录筛选</h2>
                                </div>
                                <button
                                    onClick={handleRefresh}
                                    className="text-sm text-honey-400 hover:text-honey-300 flex items-center gap-1"
                                >
                                    <Clock className="w-4 h-4" />
                                    刷新数据
                                </button>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div>
                                    <label className="block text-xs text-panel-muted mb-1">蜂场</label>
                                    <select
                                        value={filters.farm_id}
                                        onChange={e => {
                                            setFilters(prev => ({ ...prev, farm_id: e.target.value }));
                                            setPage(1);
                                        }}
                                        className="w-full px-3 py-2 rounded-lg bg-panel-bg border border-panel-border text-panel-text text-sm focus:border-honey-500 outline-none"
                                    >
                                        <option value="">全部蜂场</option>
                                        {farms.map(f => (
                                            <option key={f.id} value={f.id}>{f.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-panel-muted mb-1">饲喂物</label>
                                    <select
                                        value={filters.feed_type}
                                        onChange={e => {
                                            setFilters(prev => ({ ...prev, feed_type: e.target.value }));
                                            setPage(1);
                                        }}
                                        className="w-full px-3 py-2 rounded-lg bg-panel-bg border border-panel-border text-panel-text text-sm focus:border-honey-500 outline-none"
                                    >
                                        <option value="">全部饲喂物</option>
                                        {feedTypes.map(ft => (
                                            <option key={ft.code} value={ft.code}>{ft.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-panel-muted mb-1">开始时间</label>
                                    <input
                                        type="date"
                                        value={filters.start_time}
                                        onChange={e => {
                                            setFilters(prev => ({ ...prev, start_time: e.target.value }));
                                            setPage(1);
                                        }}
                                        className="w-full px-3 py-2 rounded-lg bg-panel-bg border border-panel-border text-panel-text text-sm focus:border-honey-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-panel-muted mb-1">结束时间</label>
                                    <input
                                        type="date"
                                        value={filters.end_time}
                                        onChange={e => {
                                            setFilters(prev => ({ ...prev, end_time: e.target.value }));
                                            setPage(1);
                                        }}
                                        className="w-full px-3 py-2 rounded-lg bg-panel-bg border border-panel-border text-panel-text text-sm focus:border-honey-500 outline-none"
                                    />
                                </div>
                            </div>
                        </section>
                    </div>
                </div>

                <section className="dashboard-card p-5">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-honey-400" />
                            <h2 className="text-lg font-semibold text-panel-text">饲喂记录</h2>
                            <span className="text-sm text-panel-muted">共 {recordsTotal} 条</span>
                        </div>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-panel-border/40">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-panel-bg/60 text-panel-muted">
                                    <th className="px-4 py-3 text-left font-medium">蜂场</th>
                                    <th className="px-4 py-3 text-left font-medium">蜂箱</th>
                                    <th className="px-4 py-3 text-left font-medium">饲喂物</th>
                                    <th className="px-4 py-3 text-left font-medium">配比</th>
                                    <th className="px-4 py-3 text-left font-medium">用量</th>
                                    <th className="px-4 py-3 text-left font-medium">饲喂人</th>
                                    <th className="px-4 py-3 text-left font-medium">饲喂时间</th>
                                    <th className="px-4 py-3 text-left font-medium">时期</th>
                                    <th className="px-4 py-3 text-left font-medium">蜂群状态</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-panel-border/40">
                                {recordsLoading ? (
                                    <tr>
                                        <td colSpan="9" className="px-4 py-12 text-center text-panel-muted">
                                            <Clock className="w-5 h-5 animate-spin mx-auto mb-2" />
                                            加载中...
                                        </td>
                                    </tr>
                                ) : records.length > 0 ? (
                                    records.map(record => (
                                        <tr key={record.id} className="hover:bg-panel-border/10 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <MapPin className="w-3.5 h-3.5 text-honey-400" />
                                                    <span className="text-panel-text">{record.farm_name}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 font-mono text-panel-muted">{record.hive_id.split('_').slice(-2).join('-').toUpperCase()}</td>
                                            <td className="px-4 py-3">
                                                <span className="px-2 py-1 rounded-md bg-honey-500/15 text-honey-400 text-xs font-medium">
                                                    {record.feed_name}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 font-mono text-panel-text">{record.ratio || '-'}</td>
                                            <td className="px-4 py-3">
                                                <span className="text-panel-text font-medium">{record.amount}</span>
                                                <span className="text-panel-muted text-xs ml-1">{record.unit}</span>
                                            </td>
                                            <td className="px-4 py-3 text-panel-text">{record.feeder}</td>
                                            <td className="px-4 py-3 text-panel-muted whitespace-nowrap">
                                                {new Date(record.feeding_time).toLocaleString('zh-CN')}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="px-2 py-1 rounded-md bg-purple-500/15 text-purple-400 text-xs font-medium">
                                                    {PERIOD_NAMES[record.period] || record.period}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-panel-muted max-w-[200px] truncate">
                                                {record.colony_status || '-'}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="9" className="px-4 py-12 text-center text-panel-muted">
                                            <Bug className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                            暂无饲喂记录
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-panel-border/40">
                            <div className="text-sm text-panel-muted">
                                第 {page} / {totalPages} 页，共 {recordsTotal} 条记录
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="p-2 rounded-lg border border-panel-border text-panel-muted hover:text-panel-text hover:border-honey-500/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    let pageNum;
                                    if (totalPages <= 5) {
                                        pageNum = i + 1;
                                    } else if (page <= 3) {
                                        pageNum = i + 1;
                                    } else if (page >= totalPages - 2) {
                                        pageNum = totalPages - 4 + i;
                                    } else {
                                        pageNum = page - 2 + i;
                                    }
                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => setPage(pageNum)}
                                            className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                                                page === pageNum
                                                    ? 'bg-gradient-to-r from-honey-500 to-amber-500 text-white shadow-lg shadow-honey-500/20'
                                                    : 'border border-panel-border text-panel-muted hover:text-panel-text hover:border-honey-500/40'
                                            }`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="p-2 rounded-lg border border-panel-border text-panel-muted hover:text-panel-text hover:border-honey-500/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </section>
            </div>

            <AddFeedingModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                onSuccess={handleRefresh}
                farms={farms}
                hives={hives}
                feedTypes={feedTypes}
            />
        </div>
    );
}
