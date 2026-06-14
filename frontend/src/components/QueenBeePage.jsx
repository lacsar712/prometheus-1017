import { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import {
    Crown, Search, Filter, Plus, X, ChevronUp, ChevronDown,
    Egg, Heart, MapPin, Calendar, AlertCircle, Check,
    ArrowUp, Star, Zap, Users
} from 'lucide-react';
import { toast } from 'react-toastify';

const API_BASE_URL = 'http://localhost:8000';

const SPECIES_COLORS = {
    '意大利蜂': { bg: 'from-amber-500 to-orange-500', border: 'border-amber-400', text: 'text-amber-300', hex: '#f59e0b' },
    '中华蜜蜂': { bg: 'from-emerald-500 to-teal-500', border: 'border-emerald-400', text: 'text-emerald-300', hex: '#10b981' },
    '卡尼鄂拉蜂': { bg: 'from-sky-500 to-blue-500', border: 'border-sky-400', text: 'text-sky-300', hex: '#0ea5e9' },
    '高加索蜂': { bg: 'from-violet-500 to-purple-500', border: 'border-violet-400', text: 'text-violet-300', hex: '#8b5cf6' },
    '东北黑蜂': { bg: 'from-slate-500 to-gray-600', border: 'border-slate-400', text: 'text-slate-300', hex: '#64748b' },
    '新疆黑蜂': { bg: 'from-rose-500 to-pink-500', border: 'border-rose-400', text: 'text-rose-300', hex: '#f43f5e' },
};

const getSpeciesColor = (species) => SPECIES_COLORS[species] || SPECIES_COLORS['意大利蜂'];

const ScoreStars = ({ score, maxScore = 5 }) => {
    return (
        <div className="flex gap-0.5">
            {Array.from({ length: maxScore }).map((_, i) => (
                <Star
                    key={i}
                    className={`w-3 h-3 ${i < score ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}`}
                />
            ))}
        </div>
    );
};

function QueenCard({ queen, isSelected, onClick }) {
    const colors = getSpeciesColor(queen.bee_species);
    const isRetired = queen.is_retired === 1;

    return (
        <div
            onClick={onClick}
            className={`dashboard-card p-3 cursor-pointer transition-all hover:scale-[1.02] ${
                isSelected ? 'ring-2 ring-amber-400/70 shadow-lg shadow-amber-500/20' : ''
            } ${isRetired ? 'opacity-60' : ''}`}
        >
            <div className="flex items-start gap-3">
                <div className={`w-1.5 h-12 rounded-full bg-gradient-to-b ${colors.bg} flex-shrink-0`} />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <Crown className={`w-4 h-4 ${colors.text}`} />
                        <span className="font-semibold text-panel-text truncate text-sm">
                            {queen.queen_no}
                        </span>
                        {isRetired && (
                            <span className="px-1.5 py-0.5 bg-slate-700/50 rounded text-[10px] text-slate-400 flex-shrink-0">
                                已退役
                            </span>
                        )}
                    </div>
                    <div className={`text-xs ${colors.text} font-medium mb-2`}>
                        {queen.bee_species}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-panel-muted">
                        <div className="flex items-center gap-1">
                            <Egg className="w-3 h-3" />
                            <span>{queen.egg_quality_score}分</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Heart className="w-3 h-3" />
                            <span>{queen.temperament_score}分</span>
                        </div>
                        {queen.current_hive && (
                            <div className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                <span className="truncate">{queen.current_hive}</span>
                            </div>
                        )}
                    </div>
                    {queen.age_days !== undefined && (
                        <div className="mt-2 text-[10px] text-panel-muted">
                            {queen.age_days} 日龄
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function FamilyTreeNodeSVG({ node, x, y, width, height, isCenter, onClick, colors }) {
    const [hovered, setHovered] = useState(false);

    return (
        <g
            transform={`translate(${x}, ${y})`}
            onClick={() => onClick(node)}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{ cursor: 'pointer' }}
        >
            <rect
                x="0"
                y="0"
                width={width}
                height={height}
                rx="10"
                fill={isCenter ? 'rgba(251, 191, 36, 0.15)' : 'rgba(42, 34, 25, 0.9)'}
                stroke={isCenter ? 'rgba(251, 191, 36, 0.7)' : 'rgba(251, 191, 36, 0.2)'}
                strokeWidth={isCenter ? 2 : 1}
                style={{
                    filter: hovered ? 'drop-shadow(0 0 8px rgba(251, 191, 36, 0.5))' : 'none',
                    transition: 'all 0.2s ease',
                }}
            />
            <rect
                x="0"
                y="0"
                width="4"
                height={height}
                rx="2"
                fill={colors.hex}
            />
            <text
                x="14"
                y="22"
                fill="#F5E6D3"
                fontSize="12"
                fontWeight="600"
            >
                {node.queen_no}
            </text>
            <text
                x="14"
                y="40"
                fill={colors.hex}
                fontSize="10"
                fontWeight="500"
            >
                {node.bee_species}
            </text>
            <text
                x="14"
                y="56"
                fill="#94a3b8"
                fontSize="9"
            >
                {node.birth_date}
            </text>
            {node.is_retired === 1 && (
                <text
                    x={width - 50}
                    y="22"
                    fill="#64748b"
                    fontSize="9"
                    textAnchor="end"
                >
                    已退役
                </text>
            )}

            {hovered && (
                <g transform={`translate(${width / 2}, ${-8})`}>
                    <rect
                        x="-70"
                        y="-50"
                        width="140"
                        height="40"
                        rx="6"
                        fill="rgba(15, 23, 42, 0.95)"
                        stroke="rgba(251, 191, 36, 0.4)"
                        strokeWidth="1"
                    />
                    <text x="0" y="-32" textAnchor="middle" fill="#FCD34D" fontSize="10" fontWeight="600">
                        产卵质量 {node.egg_quality_score} 分
                    </text>
                    <text x="0" y="-16" textAnchor="middle" fill="#FCD34D" fontSize="10" fontWeight="600">
                        性情评分 {node.temperament_score} 分
                    </text>
                </g>
            )}
        </g>
    );
}

function FamilyTreeSVG({ nodes, centerId, onNodeClick, generations }) {
    const nodeWidth = 180;
    const nodeHeight = 80;
    const vGap = 50;
    const padding = 60;

    const treeData = useMemo(() => {
        const nodeMap = new Map();
        nodes.forEach(n => nodeMap.set(n.id, n));

        const byGen = {};
        nodes.forEach(n => {
            if (!byGen[n.generation]) byGen[n.generation] = [];
            byGen[n.generation].push(n);
        });

        const genKeys = Object.keys(byGen).map(Number).sort((a, b) => a - b);
        const maxGen = genKeys.length > 0 ? genKeys[genKeys.length - 1] : 0;
        const genCount = maxGen + 1;

        const positions = new Map();

        const totalHeight = genCount * nodeHeight + (genCount - 1) * vGap + padding * 2;
        const totalWidth = nodeWidth + padding * 2;

        genKeys.forEach(gen => {
            const genNodes = byGen[gen];
            const y = padding + (maxGen - gen) * (nodeHeight + vGap);
            const x = padding;
            genNodes.forEach(node => {
                positions.set(node.id, { x, y });
            });
        });

        return {
            positions,
            width: Math.max(totalWidth, 500),
            height: Math.max(totalHeight, 400),
            nodeMap,
        };
    }, [nodes, centerId]);

    const { positions, width, height, nodeMap } = treeData;

    const renderConnections = () => {
        const lines = [];
        positions.forEach((pos, id) => {
            const node = nodeMap.get(id);
            if (!node || !node.mother_id) return;

            const motherPos = positions.get(node.mother_id);
            if (!motherPos) return;

            const startX = pos.x + nodeWidth / 2;
            const startY = pos.y;
            const endX = motherPos.x + nodeWidth / 2;
            const endY = motherPos.y + nodeHeight;

            const midY = (startY + endY) / 2;

            lines.push(
                <path
                    key={`line-${id}`}
                    d={`M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`}
                    fill="none"
                    stroke="rgba(251, 191, 36, 0.4)"
                    strokeWidth="2"
                />
            );
        });
        return lines;
    };

    const genLabels = useMemo(() => {
        const labels = [];
        const byGen = {};
        nodes.forEach(n => {
            if (!byGen[n.generation]) byGen[n.generation] = n;
        });

        const maxGen = nodes.length > 0 ? Math.max(...nodes.map(n => n.generation)) : 0;

        Object.keys(byGen).forEach(genStr => {
            const gen = parseInt(genStr);
            const y = padding + (maxGen - gen) * (nodeHeight + vGap) + nodeHeight / 2;
            labels.push({ gen, y });
        });

        return labels.sort((a, b) => b.gen - a.gen);
    }, [nodes]);

    return (
        <div className="w-full h-full overflow-auto honeycomb-bg">
            <svg
                width={width}
                height={height}
                viewBox={`0 0 ${width} ${height}`}
                style={{ minWidth: '100%' }}
            >
                <defs>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {genLabels.map(({ gen, y }) => (
                    <text
                        key={`gen-${gen}`}
                        x="10"
                        y={y + 4}
                        fill="rgba(184, 168, 138, 0.6)"
                        fontSize="11"
                        textAnchor="start"
                        className="select-none"
                    >
                        {gen === 0 ? '当代' : `上${gen}代`}
                    </text>
                ))}

                {renderConnections()}
                {Array.from(positions.entries()).map(([id, pos]) => {
                    const node = nodeMap.get(id);
                    if (!node) return null;
                    const colors = getSpeciesColor(node.bee_species);
                    return (
                        <FamilyTreeNodeSVG
                            key={id}
                            node={node}
                            x={pos.x}
                            y={pos.y}
                            width={nodeWidth}
                            height={nodeHeight}
                            isCenter={id === centerId}
                            onClick={onNodeClick}
                            colors={colors}
                        />
                    );
                })}
            </svg>
        </div>
    );
}

function AddQueenModal({ isOpen, onClose, onSuccess, speciesList }) {
    const [formData, setFormData] = useState({
        queen_no: '',
        bee_species: speciesList[0] || '意大利蜂',
        mother_id: '',
        birth_date: new Date().toISOString().split('T')[0],
        egg_quality_score: 3,
        temperament_score: 3,
        current_hive: '',
        farm_id: 'farm_001',
        notes: '',
    });
    const [selectableQueens, setSelectableQueens] = useState([]);
    const [loading, setLoading] = useState(false);
    const [validationError, setValidationError] = useState('');
    const [validating, setValidating] = useState(false);

    useEffect(() => {
        if (isOpen && formData.bee_species) {
            fetchSelectableQueens();
        }
    }, [isOpen, formData.bee_species]);

    const fetchSelectableQueens = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/queen-bee/selectable`, {
                params: { bee_species: formData.bee_species },
            });
            setSelectableQueens(res.data.queens || []);
        } catch (err) {
            console.error('Failed to fetch selectable queens:', err);
        }
    };

    const validateMother = useCallback(async () => {
        if (!formData.mother_id) {
            setValidationError('');
            return true;
        }
        setValidating(true);
        try {
            await axios.post(`${API_BASE_URL}/api/queen-bee/validate/mother`, null, {
                params: {
                    mother_id: formData.mother_id,
                    bee_species: formData.bee_species,
                },
            });
            setValidationError('');
            return true;
        } catch (err) {
            setValidationError(err.response?.data?.detail || '父代设置不合法');
            return false;
        } finally {
            setValidating(false);
        }
    }, [formData.mother_id, formData.bee_species]);

    useEffect(() => {
        if (formData.mother_id) {
            const timer = setTimeout(validateMother, 300);
            return () => clearTimeout(timer);
        } else {
            setValidationError('');
        }
    }, [formData.mother_id, formData.bee_species]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.queen_no.trim()) {
            toast.warning('请输入女王蜂编号');
            return;
        }

        const isValid = await validateMother();
        if (!isValid) {
            toast.error(validationError);
            return;
        }

        setLoading(true);
        try {
            const payload = {
                ...formData,
                mother_id: formData.mother_id ? parseInt(formData.mother_id) : null,
                birth_date: new Date(formData.birth_date).toISOString(),
            };

            await axios.post(`${API_BASE_URL}/api/queen-bee`, payload);
            toast.success('女王蜂登记成功');
            onSuccess?.();
            onClose();
            setFormData({
                queen_no: '',
                bee_species: speciesList[0] || '意大利蜂',
                mother_id: '',
                birth_date: new Date().toISOString().split('T')[0],
                egg_quality_score: 3,
                temperament_score: 3,
                current_hive: '',
                farm_id: 'farm_001',
                notes: '',
            });
        } catch (err) {
            toast.error(err.response?.data?.detail || '登记失败');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="dashboard-card p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500">
                            <Crown className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold gradient-text">登记女王蜂</h3>
                            <p className="text-sm text-panel-muted">建立新的女王蜂档案</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-panel-border/30 transition-colors"
                    >
                        <X className="w-5 h-5 text-panel-muted" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-panel-text mb-1.5 font-medium">
                                女王蜂编号 <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.queen_no}
                                onChange={(e) => handleChange('queen_no', e.target.value)}
                                placeholder="如：意蜂-001-001"
                                className="w-full px-3 py-2.5 rounded-xl bg-slate-900/50 border border-panel-border focus:border-amber-500/50 outline-none transition-all text-panel-text"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-panel-text mb-1.5 font-medium">
                                蜂种 <span className="text-red-400">*</span>
                            </label>
                            <select
                                value={formData.bee_species}
                                onChange={(e) => handleChange('bee_species', e.target.value)}
                                className="w-full px-3 py-2.5 rounded-xl bg-slate-900/50 border border-panel-border focus:border-amber-500/50 outline-none transition-all text-panel-text"
                            >
                                {speciesList.map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm text-panel-text mb-1.5 font-medium">
                            父代女王蜂
                        </label>
                        <div className="relative">
                            <select
                                value={formData.mother_id}
                                onChange={(e) => handleChange('mother_id', e.target.value)}
                                className={`w-full px-3 py-2.5 rounded-xl bg-slate-900/50 border focus:border-amber-500/50 outline-none transition-all text-panel-text ${
                                    validationError ? 'border-red-500/60' : 'border-panel-border'
                                }`}
                            >
                                <option value="">— 无（初代蜂王）—</option>
                                {selectableQueens.map(q => (
                                    <option key={q.id} value={q.id}>
                                        {q.queen_no} ({q.bee_species})
                                    </option>
                                ))}
                            </select>
                            {validating && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <div className="w-4 h-4 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
                                </div>
                            )}
                        </div>
                        {validationError && (
                            <div className="mt-1.5 flex items-start gap-1.5 text-red-400 text-xs">
                                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                                <span>{validationError}</span>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-panel-text mb-1.5 font-medium">
                                出生日期 <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="date"
                                value={formData.birth_date}
                                onChange={(e) => handleChange('birth_date', e.target.value)}
                                className="w-full px-3 py-2.5 rounded-xl bg-slate-900/50 border border-panel-border focus:border-amber-500/50 outline-none transition-all text-panel-text"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-panel-text mb-1.5 font-medium">
                                所属蜂箱
                            </label>
                            <input
                                type="text"
                                value={formData.current_hive}
                                onChange={(e) => handleChange('current_hive', e.target.value)}
                                placeholder="如：A-0001"
                                className="w-full px-3 py-2.5 rounded-xl bg-slate-900/50 border border-panel-border focus:border-amber-500/50 outline-none transition-all text-panel-text"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-panel-text mb-1.5 font-medium">
                                产卵质量 (1-5分)
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="range"
                                    min="1"
                                    max="5"
                                    value={formData.egg_quality_score}
                                    onChange={(e) => handleChange('egg_quality_score', parseInt(e.target.value))}
                                    className="flex-1 accent-amber-500"
                                />
                                <span className="w-8 text-center text-amber-400 font-bold">
                                    {formData.egg_quality_score}
                                </span>
                            </div>
                            <div className="mt-1 flex justify-center">
                                <ScoreStars score={formData.egg_quality_score} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm text-panel-text mb-1.5 font-medium">
                                性情评分 (1-5分)
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="range"
                                    min="1"
                                    max="5"
                                    value={formData.temperament_score}
                                    onChange={(e) => handleChange('temperament_score', parseInt(e.target.value))}
                                    className="flex-1 accent-amber-500"
                                />
                                <span className="w-8 text-center text-amber-400 font-bold">
                                    {formData.temperament_score}
                                </span>
                            </div>
                            <div className="mt-1 flex justify-center">
                                <ScoreStars score={formData.temperament_score} />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm text-panel-text mb-1.5 font-medium">
                            所属蜂场
                        </label>
                        <select
                            value={formData.farm_id}
                            onChange={(e) => handleChange('farm_id', e.target.value)}
                            className="w-full px-3 py-2.5 rounded-xl bg-slate-900/50 border border-panel-border focus:border-amber-500/50 outline-none transition-all text-panel-text"
                        >
                            <option value="farm_001">秦岭一号蜂场</option>
                            <option value="farm_002">长白山蜜源基地</option>
                            <option value="farm_003">云贵高原蜂场</option>
                            <option value="farm_004">江南水乡蜂场</option>
                            <option value="farm_005">黄土高原蜂场</option>
                            <option value="farm_006">闽南荔枝蜜场</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm text-panel-text mb-1.5 font-medium">
                            备注
                        </label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => handleChange('notes', e.target.value)}
                            rows={3}
                            placeholder="记录女王蜂的特点、来源等信息..."
                            className="w-full px-3 py-2.5 rounded-xl bg-slate-900/50 border border-panel-border focus:border-amber-500/50 outline-none transition-all text-panel-text resize-none"
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-700/50 text-panel-text font-medium transition-colors border border-panel-border"
                        >
                            取消
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-medium transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Plus className="w-4 h-4" />
                                    确认登记
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function QueenBeePage() {
    const [queens, setQueens] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [selectedQueen, setSelectedQueen] = useState(null);
    const [familyTree, setFamilyTree] = useState(null);
    const [generations, setGenerations] = useState(5);
    const [speciesList, setSpeciesList] = useState([]);

    const [searchText, setSearchText] = useState('');
    const [filterSpecies, setFilterSpecies] = useState('');
    const [filterRetired, setFilterRetired] = useState('');
    const [page, setPage] = useState(1);
    const pageSize = 15;

    const [showAddModal, setShowAddModal] = useState(false);

    useEffect(() => {
        fetchSpecies();
    }, []);

    useEffect(() => {
        fetchQueens();
    }, [searchText, filterSpecies, filterRetired, page]);

    useEffect(() => {
        if (queens.length > 0 && !selectedQueen) {
            handleSelectQueen(queens[0]);
        }
    }, [queens]);

    const fetchSpecies = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/queen-bee/species`);
            setSpeciesList(res.data.species || []);
        } catch (err) {
            console.error('Failed to fetch species:', err);
        }
    };

    const fetchQueens = async () => {
        setLoading(true);
        try {
            const params = { page, page_size: pageSize };
            if (searchText) params.search = searchText;
            if (filterSpecies) params.bee_species = filterSpecies;
            if (filterRetired !== '') params.is_retired = parseInt(filterRetired);

            const res = await axios.get(`${API_BASE_URL}/api/queen-bee`, { params });
            setQueens(res.data.queens || []);
            setTotal(res.data.total || 0);
        } catch (err) {
            toast.error('获取女王蜂列表失败');
        } finally {
            setLoading(false);
        }
    };

    const fetchFamilyTree = async (queenId, gens = generations) => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/queen-bee/${queenId}/family-tree`, {
                params: { generations: gens },
            });
            setFamilyTree(res.data);
        } catch (err) {
            console.error('Failed to fetch family tree:', err);
        }
    };

    const handleSelectQueen = (queen) => {
        setSelectedQueen(queen);
        fetchFamilyTree(queen.id);
    };

    const handleNodeClick = (node) => {
        const queen = queens.find(q => q.id === node.id);
        if (queen) {
            setSelectedQueen(queen);
        }
        fetchFamilyTree(node.id);
    };

    const handleGenerationsChange = (delta) => {
        const newGens = Math.max(1, Math.min(15, generations + delta));
        setGenerations(newGens);
        if (selectedQueen) {
            fetchFamilyTree(selectedQueen.id, newGens);
        }
    };

    const totalPages = Math.ceil(total / pageSize);

    return (
        <div className="min-h-screen p-4 md:p-6 text-panel-text">
            <div className="max-w-[1800px] mx-auto h-full">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl shadow-lg shadow-amber-500/20">
                            <Crown className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold gradient-text">女王蜂家谱</h1>
                            <p className="text-sm text-panel-muted">优质女王蜂血统传承与产卵质量演变记录</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl font-medium flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        登记女王蜂
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4 h-[calc(100vh-140px)]">
                    <div className="dashboard-card p-4 flex flex-col overflow-hidden">
                        <div className="space-y-3 mb-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-panel-muted" />
                                <input
                                    type="text"
                                    placeholder="搜索编号或蜂箱..."
                                    value={searchText}
                                    onChange={(e) => { setSearchText(e.target.value); setPage(1); }}
                                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-900/50 border border-panel-border focus:border-amber-500/50 outline-none transition-all text-sm"
                                />
                            </div>
                            <div className="flex gap-2">
                                <select
                                    value={filterSpecies}
                                    onChange={(e) => { setFilterSpecies(e.target.value); setPage(1); }}
                                    className="flex-1 px-3 py-2 rounded-lg bg-slate-900/50 border border-panel-border focus:border-amber-500/50 outline-none transition-all text-xs"
                                >
                                    <option value="">全部蜂种</option>
                                    {speciesList.map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                                <select
                                    value={filterRetired}
                                    onChange={(e) => { setFilterRetired(e.target.value); setPage(1); }}
                                    className="flex-1 px-3 py-2 rounded-lg bg-slate-900/50 border border-panel-border focus:border-amber-500/50 outline-none transition-all text-xs"
                                >
                                    <option value="">全部状态</option>
                                    <option value="0">现役</option>
                                    <option value="1">已退役</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-panel-muted">
                                共 {total} 只
                            </span>
                            <span className="text-xs text-panel-muted">
                                第 {page} / {totalPages || 1} 页
                            </span>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-2 timeline-scroll pr-1">
                            {loading ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
                                </div>
                            ) : queens.length > 0 ? (
                                queens.map(queen => (
                                    <QueenCard
                                        key={queen.id}
                                        queen={queen}
                                        isSelected={selectedQueen?.id === queen.id}
                                        onClick={() => handleSelectQueen(queen)}
                                    />
                                ))
                            ) : (
                                <div className="text-center py-12 text-panel-muted text-sm">
                                    暂无女王蜂数据
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t border-panel-border/30">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page <= 1}
                                className="px-3 py-1 rounded-md bg-slate-800/50 hover:bg-slate-700/50 text-xs disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                上一页
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page >= totalPages}
                                className="px-3 py-1 rounded-md bg-slate-800/50 hover:bg-slate-700/50 text-xs disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                下一页
                            </button>
                        </div>
                    </div>

                    <div className="dashboard-card p-4 flex flex-col overflow-hidden">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <h2 className="text-lg font-semibold text-panel-text">
                                    家谱树
                                </h2>
                                {selectedQueen && (
                                    <span className="text-sm text-panel-muted">
                                        中心：<span className="text-amber-400 font-medium">{selectedQueen.queen_no}</span>
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-panel-muted">代数：{generations}</span>
                                <div className="flex flex-col gap-0.5">
                                    <button
                                        onClick={() => handleGenerationsChange(1)}
                                        className="p-0.5 rounded bg-slate-800/50 hover:bg-slate-700/50 transition-colors"
                                    >
                                        <ChevronUp className="w-3.5 h-3.5 text-panel-muted" />
                                    </button>
                                    <button
                                        onClick={() => handleGenerationsChange(-1)}
                                        className="p-0.5 rounded bg-slate-800/50 hover:bg-slate-700/50 transition-colors"
                                    >
                                        <ChevronDown className="w-3.5 h-3.5 text-panel-muted" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {selectedQueen && (
                            <div className="mb-4 p-3 rounded-xl bg-slate-900/30 border border-panel-border/50">
                                <div className="flex items-center gap-4 flex-wrap">
                                    <div className="flex items-center gap-2">
                                        <Egg className="w-4 h-4 text-amber-400" />
                                        <span className="text-sm text-panel-muted">产卵质量：</span>
                                        <ScoreStars score={selectedQueen.egg_quality_score} />
                                        <span className="text-amber-400 font-semibold text-sm">
                                            {selectedQueen.egg_quality_score}分
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Heart className="w-4 h-4 text-rose-400" />
                                        <span className="text-sm text-panel-muted">性情：</span>
                                        <ScoreStars score={selectedQueen.temperament_score} />
                                        <span className="text-rose-400 font-semibold text-sm">
                                            {selectedQueen.temperament_score}分
                                        </span>
                                    </div>
                                    {selectedQueen.current_hive && (
                                        <div className="flex items-center gap-2">
                                            <MapPin className="w-4 h-4 text-emerald-400" />
                                            <span className="text-sm text-panel-muted">蜂箱：</span>
                                            <span className="text-emerald-400 font-medium text-sm">
                                                {selectedQueen.current_hive}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-sky-400" />
                                        <span className="text-sm text-panel-muted">日龄：</span>
                                        <span className="text-sky-400 font-medium text-sm">
                                            {selectedQueen.age_days} 天
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex-1 overflow-hidden rounded-xl border border-panel-border/30 bg-slate-950/30">
                            {familyTree && familyTree.nodes && familyTree.nodes.length > 0 ? (
                                <FamilyTreeSVG
                                    nodes={familyTree.nodes}
                                    centerId={familyTree.center_queen.id}
                                    onNodeClick={handleNodeClick}
                                    generations={generations}
                                />
                            ) : (
                                <div className="h-full flex items-center justify-center text-panel-muted">
                                    <div className="text-center">
                                        <Crown className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                        <p>选择一只女王蜂查看家谱</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {familyTree?.has_more_ancestors && (
                            <div className="mt-3 text-center text-xs text-amber-400/70">
                                <ArrowUp className="w-3 h-3 inline mr-1" />
                                上方还有更多代祖先，增加代数以查看更多
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <AddQueenModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                onSuccess={() => { fetchQueens(); }}
                speciesList={speciesList}
            />
        </div>
    );
}

export default QueenBeePage;
