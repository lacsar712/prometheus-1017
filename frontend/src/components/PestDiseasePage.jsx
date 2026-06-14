import { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import {
    Bug, Search, TreePine, ShieldAlert, Skull, ChevronRight,
    ChevronDown, AlertTriangle, CheckCircle2, Info, X,
    Stethoscope, Tag, BookOpen, Image, ArrowRight, Zap
} from 'lucide-react';
import { toast } from 'react-toastify';

const API_BASE_URL = 'http://localhost:8000';

const CATEGORY_META = {
    disease: {
        label: '病害',
        icon: ShieldAlert,
        bg: 'from-red-500/15 to-red-400/5',
        border: 'border-red-500/30',
        text: 'text-red-300',
        accent: 'bg-red-500/20',
        accentBorder: 'border-red-500/40',
        dot: 'bg-red-400',
        tag: 'bg-red-500/20 border-red-500/40 text-red-300',
    },
    pest: {
        label: '虫害',
        icon: Bug,
        bg: 'from-amber-500/15 to-amber-400/5',
        border: 'border-amber-500/30',
        text: 'text-amber-300',
        accent: 'bg-amber-500/20',
        accentBorder: 'border-amber-500/40',
        dot: 'bg-amber-400',
        tag: 'bg-amber-500/20 border-amber-500/40 text-amber-300',
    },
    poisoning: {
        label: '中毒',
        icon: Skull,
        bg: 'from-purple-500/15 to-purple-400/5',
        border: 'border-purple-500/30',
        text: 'text-purple-300',
        accent: 'bg-purple-500/20',
        accentBorder: 'border-purple-500/40',
        dot: 'bg-purple-400',
        tag: 'bg-purple-500/20 border-purple-500/40 text-purple-300',
    },
};

const SEVERITY_COLORS = {
    critical: '#f87171',
    high: '#fb923c',
    medium: '#fbbf24',
    low: '#4ade80',
};

const SEVERITY_META = {
    critical: { label: '极危', color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/50', icon: AlertTriangle },
    high: { label: '高危', color: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-500/50', icon: AlertTriangle },
    medium: { label: '中等', color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/50', icon: Info },
    low: { label: '轻微', color: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/50', icon: CheckCircle2 },
};

function SeverityBadge({ severity }) {
    const meta = SEVERITY_META[severity] || SEVERITY_META.medium;
    const Icon = meta.icon;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${meta.bg} ${meta.border} border ${meta.color}`}>
            <Icon className="w-3 h-3" />
            {meta.label}
        </span>
    );
}

function CategoryBadge({ category }) {
    const meta = CATEGORY_META[category];
    if (!meta) return null;
    const Icon = meta.icon;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${meta.tag} border`}>
            <Icon className="w-3 h-3" />
            {meta.label}
        </span>
    );
}

function SymptomTag({ tag, selected, onToggle }) {
    return (
        <button
            onClick={() => onToggle(tag)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                selected
                    ? 'bg-amber-500/30 border-amber-400/60 text-amber-200 shadow-sm shadow-amber-500/20'
                    : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-amber-500/40 hover:text-slate-300'
            }`}
        >
            {tag}
        </button>
    );
}

function DetailCard({ item }) {
    if (!item) {
        return (
            <div className="flex-1 flex items-center justify-center text-slate-500 dashboard-card p-12">
                <div className="text-center">
                    <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg">请从左侧选择一种病虫害</p>
                    <p className="text-sm mt-2 text-slate-600">或切换到"症状诊断"标签进行智能诊断</p>
                </div>
            </div>
        );
    }

    const catMeta = CATEGORY_META[item.category] || CATEGORY_META.disease;
    const symptoms = item.symptom_tags ? item.symptom_tags.split(',').map(s => s.trim()).filter(Boolean) : [];
    const aliases = item.aliases ? item.aliases.split(',').map(s => s.trim()).filter(Boolean) : [];
    const preventionLines = item.prevention ? item.prevention.split('\n').filter(l => l.trim()) : [];

    return (
        <div className="flex-1 dashboard-card p-0 overflow-hidden">
            {item.image_url && (
                <div className="relative w-full h-56 overflow-hidden">
                    <img
                        src={item.image_url}
                        alt={item.name_cn}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#2a2219] via-transparent to-transparent" />
                    <div className="absolute bottom-4 left-5 right-5 flex items-end gap-3">
                        <div className="flex-1">
                            <h2 className="text-2xl font-bold text-white drop-shadow-lg">{item.name_cn}</h2>
                            {item.name_en && (
                                <p className="text-sm text-slate-300/80 mt-0.5">{item.name_en}</p>
                            )}
                        </div>
                        <SeverityBadge severity={item.severity} />
                    </div>
                </div>
            )}

            <div className="p-5 space-y-5">
                {!item.image_url && (
                    <div>
                        <h2 className="text-2xl font-bold gradient-text">{item.name_cn}</h2>
                        {item.name_en && (
                            <p className="text-sm text-slate-400 mt-0.5">{item.name_en}</p>
                        )}
                        <div className="mt-2"><SeverityBadge severity={item.severity} /></div>
                    </div>
                )}

                <div className="flex flex-wrap items-center gap-2">
                    <CategoryBadge category={item.category} />
                    {aliases.map((a, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-md text-xs bg-slate-700/50 text-slate-400 border border-slate-600/50">
                            {a}
                        </span>
                    ))}
                </div>

                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Tag className="w-4 h-4 text-amber-400" />
                        <h3 className="text-sm font-semibold text-amber-300">症状标签</h3>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {symptoms.map((s, i) => (
                            <span key={i} className={`px-2 py-0.5 rounded-md text-xs font-medium border ${catMeta.tag}`}>
                                {s}
                            </span>
                        ))}
                    </div>
                </div>

                {item.causes && (
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Info className="w-4 h-4 text-sky-400" />
                            <h3 className="text-sm font-semibold text-sky-300">成因</h3>
                        </div>
                        <p className="text-sm text-slate-300 leading-relaxed bg-slate-800/40 rounded-xl p-4 border border-slate-700/50">
                            {item.causes}
                        </p>
                    </div>
                )}

                {preventionLines.length > 0 && (
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <h3 className="text-sm font-semibold text-emerald-300">防治方案</h3>
                        </div>
                        <div className="space-y-1.5">
                            {preventionLines.map((line, i) => (
                                <div key={i} className="flex items-start gap-2 text-sm text-slate-300 bg-emerald-500/5 rounded-lg p-2.5 border border-emerald-500/10">
                                    <span className="text-emerald-400 font-medium flex-shrink-0 w-5 text-center">{i + 1}</span>
                                    <span className="leading-relaxed">{line.replace(/^\d+\.\s*/, '')}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function DiagnosisResultCard({ result, rank, onSelect }) {
    const { pest_disease, similarity, matched_symptoms } = result;
    const catMeta = CATEGORY_META[pest_disease.category] || CATEGORY_META.disease;
    const pct = Math.round(similarity * 100);

    return (
        <div
            onClick={() => onSelect(pest_disease)}
            className="dashboard-card p-4 cursor-pointer hover:scale-[1.01] transition-all group"
        >
            <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                    <span className="text-sm font-bold text-amber-400">#{rank}</span>
                </div>
                {pest_disease.image_url ? (
                    <img
                        src={pest_disease.image_url}
                        alt={pest_disease.name_cn}
                        className="w-16 h-16 rounded-xl object-cover border border-slate-700 flex-shrink-0"
                        onError={(e) => { e.target.style.display = 'none'; }}
                    />
                ) : (
                    <div className={`w-16 h-16 rounded-xl ${catMeta.accent} ${catMeta.accentBorder} border flex items-center justify-center flex-shrink-0`}>
                        {(() => { const I = catMeta.icon; return <I className={`w-7 h-7 ${catMeta.text}`} />; })()}
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-panel-text truncate text-sm">{pest_disease.name_cn}</h4>
                        <SeverityBadge severity={pest_disease.severity} />
                        <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-amber-400 transition-colors ml-auto flex-shrink-0" />
                    </div>
                    <p className="text-xs text-slate-500 mb-2 truncate">{pest_disease.name_en}</p>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                    width: `${pct}%`,
                                    background: pct >= 80 ? 'linear-gradient(90deg, #f59e0b, #ef4444)' : pct >= 50 ? 'linear-gradient(90deg, #f59e0b, #fb923c)' : '#fbbf24',
                                }}
                            />
                        </div>
                        <span className="text-xs font-mono font-bold text-amber-400">{pct}%</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                        {matched_symptoms.map((s, i) => (
                            <span key={i} className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/20 border border-amber-500/30 text-amber-300">
                                {s}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function PestDiseasePage() {
    const [activeTab, setActiveTab] = useState('knowledge');
    const [items, setItems] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [keyword, setKeyword] = useState('');
    const [expandedCategories, setExpandedCategories] = useState({ disease: true, pest: true, poisoning: true });

    const [allSymptoms, setAllSymptoms] = useState([]);
    const [selectedSymptoms, setSelectedSymptoms] = useState([]);
    const [extraText, setExtraText] = useState('');
    const [diagnosisResults, setDiagnosisResults] = useState([]);
    const [diagnosing, setDiagnosing] = useState(false);

    const fetchList = useCallback(async () => {
        try {
            const params = {};
            if (keyword) params.keyword = keyword;
            const res = await axios.get(`${API_BASE_URL}/api/pest-disease/list`, { params });
            setItems(res.data);
        } catch {
            toast.error('获取知识库列表失败');
        }
    }, [keyword]);

    const fetchSymptoms = useCallback(async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/pest-disease/symptoms/all`);
            setAllSymptoms(res.data.symptoms);
        } catch {
            toast.error('获取症状标签失败');
        }
    }, []);

    useEffect(() => {
        fetchList();
    }, [fetchList]);

    useEffect(() => {
        if (keyword.trim()) {
            setExpandedCategories(prev => {
                const next = { ...prev };
                Object.entries(grouped).forEach(([cat, list]) => {
                    if (list && list.length > 0) {
                        next[cat] = true;
                    }
                });
                return next;
            });
        }
    }, [keyword, grouped]);

    useEffect(() => {
        if (activeTab === 'diagnosis' && allSymptoms.length === 0) {
            fetchSymptoms();
        }
    }, [activeTab, allSymptoms.length, fetchSymptoms]);

    const grouped = useMemo(() => {
        const map = { disease: [], pest: [], poisoning: [] };
        items.forEach(item => {
            if (map[item.category]) {
                map[item.category].push(item);
            }
        });
        return map;
    }, [items]);

    const selectedItem = useMemo(() => {
        return items.find(i => i.id === selectedId) || null;
    }, [items, selectedId]);

    const toggleCategory = (cat) => {
        setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
    };

    const toggleSymptom = (tag) => {
        setSelectedSymptoms(prev =>
            prev.includes(tag) ? prev.filter(s => s !== tag) : [...prev, tag]
        );
    };

    const handleDiagnose = async () => {
        if (selectedSymptoms.length === 0 && !extraText.trim()) {
            toast.warning('请至少选择一个症状标签或输入描述');
            return;
        }
        setDiagnosing(true);
        try {
            const res = await axios.post(`${API_BASE_URL}/api/pest-disease/diagnose`, {
                symptoms: selectedSymptoms,
                extra_text: extraText.trim() || null,
            });
            setDiagnosisResults(res.data.results);
            if (res.data.results.length === 0) {
                toast.info('未找到匹配的病虫害条目');
            }
        } catch {
            toast.error('诊断请求失败');
        } finally {
            setDiagnosing(false);
        }
    };

    const handleDiagnosisSelect = (pd) => {
        setSelectedId(pd.id);
        setActiveTab('knowledge');
    };

    return (
        <div className="min-h-screen bg-[#1C1712] text-slate-100">
            <div className="h-screen flex flex-col">
                <header className="flex-shrink-0 border-b border-amber-500/20 bg-gradient-to-r from-[#2a2219] to-[#1f1a12] px-6 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-500/15 rounded-xl border border-amber-500/30">
                                <Bug className="w-5 h-5 text-amber-400" />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold gradient-text">病虫害知识库与诊断助手</h1>
                                <p className="text-xs text-slate-500">蜂场病虫害经验沉淀 · 智能症状诊断</p>
                            </div>
                        </div>
                        <div className="flex items-center bg-slate-900/50 rounded-xl border border-slate-700/50 p-0.5">
                            <button
                                onClick={() => setActiveTab('knowledge')}
                                className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                                    activeTab === 'knowledge'
                                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                        : 'text-slate-400 hover:text-slate-300'
                                }`}
                            >
                                <BookOpen className="w-3.5 h-3.5" />
                                知识库
                            </button>
                            <button
                                onClick={() => setActiveTab('diagnosis')}
                                className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                                    activeTab === 'diagnosis'
                                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                        : 'text-slate-400 hover:text-slate-300'
                                }`}
                            >
                                <Stethoscope className="w-3.5 h-3.5" />
                                症状诊断
                            </button>
                        </div>
                    </div>
                </header>

                {activeTab === 'knowledge' ? (
                    <div className="flex-1 flex overflow-hidden">
                        <aside className="w-72 flex-shrink-0 border-r border-amber-500/15 bg-[#221c14]/80 flex flex-col">
                            <div className="p-3 border-b border-slate-800/50">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input
                                        type="text"
                                        placeholder="搜索病虫害名称..."
                                        value={keyword}
                                        onChange={e => setKeyword(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2 bg-slate-900/60 border border-slate-700/50 rounded-xl text-sm text-slate-200 placeholder:text-slate-600 focus:border-amber-500/50 focus:outline-none transition-all"
                                    />
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2 space-y-1 timeline-scroll">
                                {['disease', 'pest', 'poisoning'].map(cat => {
                                    const catItems = grouped[cat] || [];
                                    const meta = CATEGORY_META[cat];
                                    const CatIcon = meta.icon;
                                    const expanded = expandedCategories[cat];
                                    return (
                                        <div key={cat}>
                                            <button
                                                onClick={() => toggleCategory(cat)}
                                                className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all hover:bg-slate-800/40 ${meta.text}`}
                                            >
                                                {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                                <CatIcon className="w-4 h-4" />
                                                <span>{meta.label}</span>
                                                <span className="ml-auto text-xs text-slate-600">{catItems.length}</span>
                                            </button>
                                            {expanded && (
                                                <div className="ml-2 space-y-0.5 mt-0.5">
                                                    {catItems.map(item => (
                                                        <button
                                                            key={item.id}
                                                            onClick={() => setSelectedId(item.id)}
                                                            className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-all ${
                                                                selectedId === item.id
                                                                    ? 'bg-amber-500/15 text-amber-200 border border-amber-500/30'
                                                                    : 'text-slate-400 hover:bg-slate-800/30 hover:text-slate-300'
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: SEVERITY_COLORS[item.severity] || '#fbbf24' }} />
                                                                <span className="truncate">{item.name_cn}</span>
                                                            </div>
                                                        </button>
                                                    ))}
                                                    {catItems.length === 0 && (
                                                        <p className="text-xs text-slate-600 px-3 py-2">暂无数据</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </aside>

                        <main className="flex-1 overflow-y-auto p-5 timeline-scroll">
                            <DetailCard item={selectedItem} />
                        </main>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto p-6 timeline-scroll">
                        <div className="max-w-4xl mx-auto space-y-6">
                            <div className="dashboard-card p-5">
                                <div className="flex items-center gap-2 mb-4">
                                    <Zap className="w-5 h-5 text-amber-400" />
                                    <h2 className="text-base font-semibold text-amber-300">选择观察到的症状</h2>
                                    <span className="text-xs text-slate-500 ml-2">已选 {selectedSymptoms.length} 项</span>
                                </div>
                                <div className="flex flex-wrap gap-1.5 mb-4">
                                    {allSymptoms.map(tag => (
                                        <SymptomTag
                                            key={tag}
                                            tag={tag}
                                            selected={selectedSymptoms.includes(tag)}
                                            onToggle={toggleSymptom}
                                        />
                                    ))}
                                </div>
                                <div className="flex gap-3">
                                    <input
                                        type="text"
                                        placeholder="补充描述其他症状（可选，逗号分隔）"
                                        value={extraText}
                                        onChange={e => setExtraText(e.target.value)}
                                        className="flex-1 px-4 py-2.5 bg-slate-900/60 border border-slate-700/50 rounded-xl text-sm text-slate-200 placeholder:text-slate-600 focus:border-amber-500/50 focus:outline-none transition-all"
                                    />
                                    <button
                                        onClick={handleDiagnose}
                                        disabled={diagnosing || (selectedSymptoms.length === 0 && !extraText.trim())}
                                        className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-sm font-semibold text-white flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all"
                                    >
                                        <Stethoscope className="w-4 h-4" />
                                        {diagnosing ? '诊断中...' : '开始诊断'}
                                    </button>
                                    {(selectedSymptoms.length > 0 || extraText) && (
                                        <button
                                            onClick={() => { setSelectedSymptoms([]); setExtraText(''); setDiagnosisResults([]); }}
                                            className="px-3 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 text-sm transition-all"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {diagnosisResults.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                                        <h3 className="text-sm font-semibold text-amber-300">诊断结果（按相似度排序）</h3>
                                        <span className="text-xs text-slate-500">共 {diagnosisResults.length} 条匹配</span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {diagnosisResults.map((r, i) => (
                                            <DiagnosisResultCard
                                                key={r.pest_disease.id}
                                                result={r}
                                                rank={i + 1}
                                                onSelect={handleDiagnosisSelect}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
