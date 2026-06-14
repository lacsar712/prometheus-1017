import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import {
    Cloud, Sun, CloudRain, CloudSnow, CloudLightning, CloudFog, Wind,
    ThermometerSun, ThermometerSnowflake, Droplets, AlertTriangle,
    MapPin, RefreshCw, Check, ChevronRight, Clock, AlertCircle,
    CalendarDays, CloudSun, Thermometer, Umbrella
} from 'lucide-react';
import { toast } from 'react-toastify';

const API_BASE_URL = 'http://localhost:8000';

const WEATHER_ICONS = {
    'sun': Sun,
    'cloud-sun': CloudSun,
    'cloud': Cloud,
    'cloud-rain': CloudRain,
    'cloud-showers-heavy': CloudRain,
    'cloud-lightning': CloudLightning,
    'snowflake': CloudSnow,
    'cloud-fog': CloudFog,
    'wind': Wind,
};

const WEATHER_ICON_COLORS = {
    'sun': 'text-yellow-400',
    'cloud-sun': 'text-amber-300',
    'cloud': 'text-slate-400',
    'cloud-rain': 'text-blue-400',
    'cloud-showers-heavy': 'text-blue-500',
    'cloud-lightning': 'text-purple-400',
    'snowflake': 'text-cyan-300',
    'cloud-fog': 'text-slate-500',
    'wind': 'text-sky-400',
};

const SEVERITY_STYLES = {
    critical: {
        bg: 'bg-red-500/15',
        border: 'border-red-500/40',
        text: 'text-red-400',
        badge: 'bg-red-500/20 text-red-300 border-red-500/40',
        dot: 'bg-red-500',
    },
    warning: {
        bg: 'bg-amber-500/15',
        border: 'border-amber-500/40',
        text: 'text-amber-400',
        badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        dot: 'bg-amber-500',
    },
    info: {
        bg: 'bg-blue-500/15',
        border: 'border-blue-500/40',
        text: 'text-blue-400',
        badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
        dot: 'bg-blue-500',
    },
};

const ALERT_TYPE_ICONS = {
    'HEAT_WAVE': ThermometerSun,
    'CONTINUOUS_RAIN': CloudRain,
    'COLD_WAVE': ThermometerSnowflake,
    'STRONG_WIND': Wind,
};

const PRIORITY_STYLES = {
    critical: 'text-red-400 bg-red-500/10 border-red-500/30',
    high: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    medium: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    normal: 'text-slate-400 bg-slate-500/10 border-slate-500/30',
};

const PRIORITY_NAMES = {
    critical: '紧急',
    high: '高',
    medium: '中',
    normal: '一般',
};

function WeatherIcon({ type, className = 'w-5 h-5' }) {
    const Icon = WEATHER_ICONS[type] || Cloud;
    const colorClass = WEATHER_ICON_COLORS[type] || 'text-slate-400';
    return <Icon className={`${className} ${colorClass}`} />;
}

function AlertTypeIcon({ type, className = 'w-5 h-5' }) {
    const Icon = ALERT_TYPE_ICONS[type] || AlertTriangle;
    return <Icon className={className} />;
}

function FarmListItem({ farm, isSelected, onClick }) {
    const severity = farm.alerts_summary?.highest_severity;
    const sevStyle = severity ? SEVERITY_STYLES[severity] : null;

    return (
        <div
            onClick={onClick}
            className={`dashboard-card p-4 cursor-pointer transition-all hover:scale-[1.01] ${
                isSelected ? 'ring-2 ring-honey-500/60 bg-honey-500/5' : ''
            }`}
        >
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-honey-500/20 to-amber-500/10 border border-honey-500/30 flex-shrink-0">
                        <MapPin className="w-5 h-5 text-honey-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-panel-text truncate">{farm.name}</h3>
                        <p className="text-xs text-panel-muted truncate mt-0.5">{farm.location}</p>
                    </div>
                </div>
                {farm.alerts_summary?.total > 0 && (
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${sevStyle?.badge}`}>
                        <AlertTriangle className="w-3 h-3" />
                        {farm.alerts_summary.total}
                    </div>
                )}
            </div>

            <div className="flex items-center gap-3 mb-3">
                <WeatherIcon type={farm.current.weather_icon} className="w-8 h-8" />
                <div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold gradient-text">{farm.current.temperature.toFixed(0)}</span>
                        <span className="text-panel-muted text-sm">°C</span>
                    </div>
                    <p className="text-xs text-panel-muted">
                        {farm.current.weather_desc} · {farm.current.temp_min.toFixed(0)}°~{farm.current.temp_max.toFixed(0)}°
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-1">
                {farm.daily_forecast?.slice(0, 7).map((day, idx) => (
                    <div
                        key={idx}
                        className="flex-1 flex flex-col items-center py-1.5 px-1 rounded-lg bg-panel-card/40 border border-panel-border/30"
                        title={`${day.date}: ${day.weather_desc}, ${day.temp_min.toFixed(0)}°~${day.temp_max.toFixed(0)}°C`}
                    >
                        <span className="text-[10px] text-panel-muted mb-0.5">
                            {idx === 0 ? '今' : new Date(day.date).getDate() + '日'}
                        </span>
                        <WeatherIcon type={day.weather_icon} className="w-4 h-4" />
                        <span className="text-[10px] text-panel-text mt-0.5">
                            {day.temp_max.toFixed(0)}°
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function WeatherChart({ hourlyData, metricKey, label, unit, color, yMin, yMax }) {
    const data = hourlyData || [];
    const width = 800;
    const height = 160;
    const padding = { top: 20, right: 20, bottom: 30, left: 40 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const values = data.map(d => d[metricKey] || 0);
    const actualMin = yMin !== undefined ? yMin : Math.min(...values, 0);
    const actualMax = yMax !== undefined ? yMax : Math.max(...values, 1);
    const range = actualMax - actualMin || 1;

    const points = data.map((d, i) => {
        const x = padding.left + (i / Math.max(data.length - 1, 1)) * chartWidth;
        const y = padding.top + chartHeight - ((d[metricKey] - actualMin) / range) * chartHeight;
        return { x, y, value: d[metricKey], time: d.forecast_time, hour: d.hour };
    });

    const pathD = points.length > 1
        ? `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`
        : '';

    const areaD = points.length > 1
        ? `M ${points[0].x},${padding.top + chartHeight} L ${points.map(p => `${p.x},${p.y}`).join(' L ')} L ${points[points.length - 1].x},${padding.top + chartHeight} Z`
        : '';

    const yTicks = 4;
    const tickValues = [];
    for (let i = 0; i <= yTicks; i++) {
        tickValues.push(actualMin + (range * i) / yTicks);
    }

    const xTickInterval = Math.max(1, Math.floor(data.length / 8));

    return (
        <div className="w-full overflow-hidden">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: color }} />
                    <span className="text-sm font-medium text-panel-text">{label}</span>
                    <span className="text-xs text-panel-muted">({unit})</span>
                </div>
                <span className="text-xs text-panel-muted">
                    {values.length > 0 ? `最高 ${Math.max(...values).toFixed(1)}${unit} · 最低 ${Math.min(...values).toFixed(1)}${unit}` : ''}
                </span>
            </div>
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
                <defs>
                    <linearGradient id={`grad-${metricKey}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                        <stop offset="100%" stopColor={color} stopOpacity="0" />
                    </linearGradient>
                </defs>

                {tickValues.map((val, i) => {
                    const y = padding.top + chartHeight - (i / yTicks) * chartHeight;
                    return (
                        <g key={i}>
                            <line
                                x1={padding.left}
                                y1={y}
                                x2={width - padding.right}
                                y2={y}
                                stroke="rgba(251, 191, 36, 0.08)"
                                strokeDasharray="2,4"
                            />
                            <text
                                x={padding.left - 6}
                                y={y + 4}
                                textAnchor="end"
                                fill="rgba(184, 168, 138, 0.6)"
                                fontSize="10"
                            >
                                {val.toFixed(0)}
                            </text>
                        </g>
                    );
                })}

                {points.filter((_, i) => i % xTickInterval === 0).map((p, i) => (
                    <text
                        key={i}
                        x={p.x}
                        y={height - padding.bottom + 16}
                        textAnchor="middle"
                        fill="rgba(184, 168, 138, 0.6)"
                        fontSize="10"
                    >
                        {`${p.hour}:00`}
                    </text>
                ))}

                {areaD && <path d={areaD} fill={`url(#grad-${metricKey})`} />}

                {pathD && (
                    <path
                        d={pathD}
                        fill="none"
                        stroke={color}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                )}

                {points.filter((_, i) => i % xTickInterval === 0).map((p, i) => (
                    <circle
                        key={i}
                        cx={p.x}
                        cy={p.y}
                        r="3"
                        fill={color}
                        stroke="#1C1712"
                        strokeWidth="1.5"
                    />
                ))}
            </svg>
        </div>
    );
}

function PrecipitationChart({ hourlyData }) {
    const data = hourlyData || [];
    const width = 800;
    const height = 120;
    const padding = { top: 20, right: 20, bottom: 30, left: 40 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const maxPrecip = Math.max(...data.map(d => d.precipitation || 0), 5);
    const barWidth = Math.max(2, (chartWidth / data.length) * 0.6);

    const xTickInterval = Math.max(1, Math.floor(data.length / 8));

    return (
        <div className="w-full overflow-hidden">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-400" />
                    <span className="text-sm font-medium text-panel-text">降水量</span>
                    <span className="text-xs text-panel-muted">(mm)</span>
                </div>
                <span className="text-xs text-panel-muted">
                    {data.length > 0 ? `累计 ${data.reduce((s, d) => s + (d.precipitation || 0), 0).toFixed(1)}mm` : ''}
                </span>
            </div>
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                    const y = padding.top + chartHeight - ratio * chartHeight;
                    const val = maxPrecip * ratio;
                    return (
                        <g key={i}>
                            <line
                                x1={padding.left}
                                y1={y}
                                x2={width - padding.right}
                                y2={y}
                                stroke="rgba(251, 191, 36, 0.08)"
                                strokeDasharray="2,4"
                            />
                            <text
                                x={padding.left - 6}
                                y={y + 4}
                                textAnchor="end"
                                fill="rgba(184, 168, 138, 0.6)"
                                fontSize="10"
                            >
                                {val.toFixed(0)}
                            </text>
                        </g>
                    );
                })}

                {data.map((d, i) => {
                    const x = padding.left + (i / Math.max(data.length - 1, 1)) * chartWidth;
                    const barHeight = maxPrecip > 0 ? ((d.precipitation || 0) / maxPrecip) * chartHeight : 0;
                    const y = padding.top + chartHeight - barHeight;

                    const hasAlert = d.alerts && d.alerts.length > 0;
                    const barColor = hasAlert
                        ? 'rgba(239, 68, 68, 0.7)'
                        : (d.precipitation > 10 ? 'rgba(59, 130, 246, 0.8)' : 'rgba(96, 165, 250, 0.6)');

                    return (
                        <g key={i}>
                            <rect
                                x={x - barWidth / 2}
                                y={y}
                                width={barWidth}
                                height={barHeight}
                                fill={barColor}
                                rx="1"
                            />
                            {i % xTickInterval === 0 && (
                                <text
                                    x={x}
                                    y={height - padding.bottom + 16}
                                    textAnchor="middle"
                                    fill="rgba(184, 168, 138, 0.6)"
                                    fontSize="10"
                                >
                                    {`${d.hour}:00`}
                                </text>
                            )}
                        </g>
                    );
                })}
            </svg>
        </div>
    );
}

function AlertTimelineCard({ alert, onToggleAction, farmId }) {
    const sevStyle = SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.info;

    const formatTime = (iso) => {
        const d = new Date(iso);
        const pad = n => n.toString().padStart(2, '0');
        return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:00`;
    };

    const completedCount = alert.actions?.filter(a => a.is_completed).length || 0;
    const totalCount = alert.actions?.length || 0;
    const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

    return (
        <div className={`rounded-2xl border ${sevStyle.border} ${sevStyle.bg} p-4 mb-3`}>
            <div className="flex items-start gap-3 mb-3">
                <div className={`p-2 rounded-xl border ${sevStyle.border} bg-panel-bg/40 flex-shrink-0`}>
                    <AlertTypeIcon type={alert.alert_type} className={`w-5 h-5 ${sevStyle.text}`} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <div>
                            <h4 className={`font-semibold ${sevStyle.text}`}>{alert.title}</h4>
                            <div className="flex items-center gap-2 mt-1 text-xs text-panel-muted">
                                <Clock className="w-3 h-3" />
                                <span>{formatTime(alert.start_time)} ~ {formatTime(alert.end_time)}</span>
                                <span>·</span>
                                <span>持续 {alert.duration_hours} 小时</span>
                                <span>·</span>
                                <span>峰值 {alert.peak_value}{alert.alert_type === 'HEAT_WAVE' || alert.alert_type === 'COLD_WAVE' ? '°C' : alert.alert_type === 'CONTINUOUS_RAIN' ? 'mm' : 'm/s'}</span>
                            </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${sevStyle.badge} flex-shrink-0`}>
                            {alert.level_label}
                        </span>
                    </div>
                    <p className="text-sm text-panel-muted mt-2 leading-relaxed">{alert.description}</p>
                </div>
            </div>

            <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 h-1.5 bg-panel-border/50 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-500 ${
                            progressPercent >= 100 ? 'bg-gradient-to-r from-green-500 to-emerald-400' :
                            `bg-gradient-to-r from-honey-500 to-amber-400`
                        }`}
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
                <span className="text-xs text-panel-muted font-mono flex-shrink-0">
                    {completedCount}/{totalCount} 已处置
                </span>
            </div>

            <div className="space-y-2">
                {alert.actions?.map((action) => (
                    <div
                        key={action.id}
                        className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                            action.is_completed
                                ? 'bg-emerald-500/10 border-emerald-500/30'
                                : 'bg-panel-card/40 border-panel-border/40 hover:border-panel-border'
                        }`}
                    >
                        <button
                            onClick={() => onToggleAction(alert, action)}
                            className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                                action.is_completed
                                    ? 'bg-emerald-500 border-emerald-500 text-white'
                                    : 'border-panel-border hover:border-honey-500 text-transparent'
                            }`}
                        >
                            <Check className="w-3 h-3" />
                        </button>
                        <div className="flex-1 min-w-0">
                            <p className={`text-sm ${action.is_completed ? 'text-emerald-400/80 line-through' : 'text-panel-text'}`}>
                                {action.action_text}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5">
                                {action.action_category && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-panel-border/40 text-panel-muted">
                                        {action.action_category}
                                    </span>
                                )}
                                <span className={`px-1.5 py-0.5 rounded text-[10px] border ${PRIORITY_STYLES[action.priority] || PRIORITY_STYLES.normal}`}>
                                    {PRIORITY_NAMES[action.priority] || '一般'}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function WeatherScreen() {
    const [farmsData, setFarmsData] = useState(null);
    const [detailData, setDetailData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [detailLoading, setDetailLoading] = useState(false);
    const [selectedFarmId, setSelectedFarmId] = useState(null);
    const [lastUpdate, setLastUpdate] = useState(null);

    const fetchFarms = useCallback(async () => {
        try {
            setLoading(true);
            const resp = await axios.get(`${API_BASE_URL}/api/weather/farms`, { timeout: 10000 });
            setFarmsData(resp.data);
            setLastUpdate(new Date());
            if (!selectedFarmId && resp.data.farms?.length > 0) {
                setSelectedFarmId(resp.data.farms[0].id);
            }
        } catch (err) {
            console.error('加载蜂场天气失败:', err);
            toast.error('加载蜂场天气数据失败');
        } finally {
            setLoading(false);
        }
    }, [selectedFarmId]);

    const fetchFarmDetail = useCallback(async (farmId) => {
        if (!farmId) return;
        try {
            setDetailLoading(true);
            const resp = await axios.get(`${API_BASE_URL}/api/weather/farm/${farmId}/alerts`, { timeout: 10000 });
            setDetailData(resp.data);
        } catch (err) {
            console.error('加载蜂场详情失败:', err);
            toast.error('加载天气详情失败');
        } finally {
            setDetailLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchFarms();
    }, [fetchFarms]);

    useEffect(() => {
        if (selectedFarmId) {
            fetchFarmDetail(selectedFarmId);
        }
    }, [selectedFarmId, fetchFarmDetail]);

    const handleToggleAction = async (alert, action) => {
        const newCompleted = !action.is_completed;

        setDetailData(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                alerts: prev.alerts.map(a => {
                    if (a.alert_type !== alert.alert_type || a.start_time !== alert.start_time) return a;
                    return {
                        ...a,
                        actions: a.actions.map(ac => {
                            if (ac.id !== action.id) return ac;
                            return { ...ac, is_completed: newCompleted };
                        }),
                    };
                }),
            };
        });

        try {
            await axios.put(
                `${API_BASE_URL}/api/weather/alerts/${alert.alert_type}/actions/${action.id}?farm_id=${encodeURIComponent(selectedFarmId)}&alert_start_time=${encodeURIComponent(alert.start_time)}`,
                { is_completed: newCompleted, completed_by: '当前用户' }
            );
            toast.success(newCompleted ? '已标记为完成' : '已取消完成');
        } catch (err) {
            console.error('更新状态失败:', err);
            setDetailData(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    alerts: prev.alerts.map(a => {
                        if (a.alert_type !== alert.alert_type || a.start_time !== alert.start_time) return a;
                        return {
                            ...a,
                            actions: a.actions.map(ac => {
                                if (ac.id !== action.id) return ac;
                                return { ...ac, is_completed: !newCompleted };
                            }),
                        };
                    }),
                };
            });
            toast.error('更新状态失败，请重试');
        }
    };

    const totalAlertsSummary = useMemo(() => {
        if (!farmsData?.farms) return { total: 0, critical: 0, warning: 0, info: 0 };
        return farmsData.farms.reduce(
            (acc, f) => ({
                total: acc.total + (f.alerts_summary?.total || 0),
                critical: acc.critical + (f.alerts_summary?.critical || 0),
                warning: acc.warning + (f.alerts_summary?.warning || 0),
                info: acc.info + (f.alerts_summary?.info || 0),
            }),
            { total: 0, critical: 0, warning: 0, info: 0 }
        );
    }, [farmsData]);

    const currentFarm = farmsData?.farms?.find(f => f.id === selectedFarmId);
    const hourlyData = detailData?.timeline || [];

    return (
        <div className="min-h-screen text-panel-text" style={{ background: '#1C1712' }}>
            <div
                className="absolute inset-0 pointer-events-none opacity-60"
                style={{
                    background: `
                        radial-gradient(ellipse 80% 50% at 50% -20%, rgba(251, 191, 36, 0.08) 0%, transparent 70%),
                        radial-gradient(ellipse 60% 40% at 0% 100%, rgba(232, 150, 31, 0.05) 0%, transparent 60%),
                        radial-gradient(ellipse 60% 40% at 100% 100%, rgba(217, 119, 6, 0.05) 0%, transparent 60%)
                    `,
                }}
            />

            <div className="relative z-10">
                <header className="border-b border-panel-border/60 px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-2xl bg-gradient-to-br from-sky-500/20 to-blue-600/20 border border-sky-500/30">
                                <CloudSun className="w-6 h-6 text-sky-400" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold gradient-text">蜂场气象联动与极端天气预警</h1>
                                <p className="text-sm text-panel-muted mt-0.5">
                                    实时监控蜂场天气 · 智能识别极端天气 · 自动生成处置建议
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-4 px-4 py-2 rounded-xl bg-panel-card/60 border border-panel-border/60">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                    <span className="text-xs text-panel-muted">紧急</span>
                                    <span className="text-lg font-bold text-red-400">{totalAlertsSummary.critical}</span>
                                </div>
                                <div className="w-px h-6 bg-panel-border/60" />
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                                    <span className="text-xs text-panel-muted">警告</span>
                                    <span className="text-lg font-bold text-amber-400">{totalAlertsSummary.warning}</span>
                                </div>
                                <div className="w-px h-6 bg-panel-border/60" />
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                                    <span className="text-xs text-panel-muted">提示</span>
                                    <span className="text-lg font-bold text-blue-400">{totalAlertsSummary.info}</span>
                                </div>
                            </div>
                            <button
                                onClick={fetchFarms}
                                className="p-2.5 rounded-xl bg-panel-card/60 border border-panel-border/60 text-panel-muted hover:text-honey-400 hover:border-honey-500/40 transition-all"
                                title="刷新数据"
                            >
                                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                            {lastUpdate && (
                                <span className="text-xs text-panel-muted">
                                    更新于 {lastUpdate.toLocaleTimeString('zh-CN', { hour12: false })}
                                </span>
                            )}
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-12 gap-4 p-4" style={{ height: 'calc(100vh - 88px)' }}>
                    <div className="col-span-4 overflow-y-auto pr-2 timeline-scroll">
                        <div className="flex items-center justify-between mb-3 px-1">
                            <h2 className="text-sm font-semibold text-panel-muted flex items-center gap-2">
                                <MapPin className="w-4 h-4" />
                                蜂场列表
                            </h2>
                            <span className="text-xs text-panel-muted">
                                共 {farmsData?.farms?.length || 0} 个蜂场
                            </span>
                        </div>
                        <div className="space-y-3">
                            {loading ? (
                                <div className="text-center py-12 text-panel-muted">
                                    <RefreshCw className="w-8 h-8 mx-auto animate-spin mb-3" />
                                    加载中...
                                </div>
                            ) : (
                                farmsData?.farms?.map(farm => (
                                    <FarmListItem
                                        key={farm.id}
                                        farm={farm}
                                        isSelected={farm.id === selectedFarmId}
                                        onClick={() => setSelectedFarmId(farm.id)}
                                    />
                                ))
                            )}
                        </div>
                    </div>

                    <div className="col-span-8 overflow-y-auto pl-2 timeline-scroll">
                        {!currentFarm ? (
                            <div className="h-full flex items-center justify-center text-panel-muted">
                                请选择一个蜂场查看详情
                            </div>
                        ) : detailLoading ? (
                            <div className="h-full flex items-center justify-center text-panel-muted">
                                <RefreshCw className="w-8 h-8 animate-spin mr-3" />
                                加载天气详情...
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="dashboard-card p-5">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-start gap-4">
                                            <div className="p-4 rounded-2xl bg-gradient-to-br from-sky-500/20 to-blue-600/10 border border-sky-500/30">
                                                <WeatherIcon type={currentFarm.current.weather_icon} className="w-10 h-10" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h2 className="text-xl font-bold text-panel-text">{currentFarm.name}</h2>
                                                    <span className="px-2 py-0.5 rounded-full text-xs bg-panel-border/40 text-panel-muted">
                                                        {currentFarm.region}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-panel-muted flex items-center gap-1 mt-1">
                                                    <MapPin className="w-3.5 h-3.5" />
                                                    {currentFarm.location}
                                                    <span className="mx-1">·</span>
                                                    经度 {currentFarm.lng}°, 纬度 {currentFarm.lat}°
                                                </p>
                                                <div className="flex items-baseline gap-3 mt-3">
                                                    <span className="text-5xl font-bold gradient-text">{currentFarm.current.temperature.toFixed(1)}</span>
                                                    <span className="text-xl text-panel-muted">°C</span>
                                                    <div className="ml-4">
                                                        <p className="text-sm text-panel-text">{currentFarm.current.weather_desc}</p>
                                                        <p className="text-xs text-panel-muted mt-0.5">
                                                            {currentFarm.current.temp_min.toFixed(0)}° ~ {currentFarm.current.temp_max.toFixed(0)}°C
                                                            <span className="mx-2">·</span>
                                                            湿度 {currentFarm.current.humidity.toFixed(0)}%
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        {currentFarm.alerts_summary?.total > 0 && (
                                            <div className="text-right">
                                                <p className="text-xs text-panel-muted mb-2">未来7天预警</p>
                                                <div className="flex items-center gap-2">
                                                    {currentFarm.alerts_summary.critical > 0 && (
                                                        <span className="px-2 py-1 rounded-lg text-sm font-medium bg-red-500/20 text-red-300 border border-red-500/40">
                                                            {currentFarm.alerts_summary.critical} 紧急
                                                        </span>
                                                    )}
                                                    {currentFarm.alerts_summary.warning > 0 && (
                                                        <span className="px-2 py-1 rounded-lg text-sm font-medium bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                                            {currentFarm.alerts_summary.warning} 警告
                                                        </span>
                                                    )}
                                                    {currentFarm.alerts_summary.info > 0 && (
                                                        <span className="px-2 py-1 rounded-lg text-sm font-medium bg-blue-500/20 text-blue-300 border border-blue-500/40">
                                                            {currentFarm.alerts_summary.info} 提示
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="panel-header-line" />

                                    <div className="grid grid-cols-4 gap-3 mt-4 mb-2">
                                        {currentFarm.daily_forecast?.slice(0, 7).map((day, idx) => (
                                            <div
                                                key={idx}
                                                className="p-3 rounded-xl bg-panel-card/50 border border-panel-border/40 text-center"
                                            >
                                                <p className="text-xs text-panel-muted mb-1">
                                                    {idx === 0 ? '今天' : idx === 1 ? '明天' : new Date(day.date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                                                </p>
                                                <WeatherIcon type={day.weather_icon} className="w-6 h-6 mx-auto" />
                                                <p className="text-xs text-panel-text mt-1">{day.weather_desc}</p>
                                                <p className="text-sm font-medium mt-1">
                                                    <span className="text-red-400/80">{day.temp_max.toFixed(0)}°</span>
                                                    <span className="text-panel-muted mx-1">/</span>
                                                    <span className="text-blue-400/80">{day.temp_min.toFixed(0)}°</span>
                                                </p>
                                                {day.precipitation_total > 0 && (
                                                    <p className="text-[10px] text-blue-400 mt-0.5 flex items-center justify-center gap-1">
                                                        <Umbrella className="w-3 h-3" />
                                                        {day.precipitation_total.toFixed(0)}mm
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="dashboard-card p-5">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="font-semibold text-panel-text flex items-center gap-2">
                                            <CalendarDays className="w-4 h-4 text-honey-400" />
                                            逐时天气趋势（未来7天）
                                        </h3>
                                    </div>
                                    <div className="panel-header-line mb-4" />

                                    <div className="space-y-6">
                                        <WeatherChart
                                            hourlyData={hourlyData}
                                            metricKey="temperature"
                                            label="温度"
                                            unit="°C"
                                            color="#F59E0B"
                                        />
                                        <WeatherChart
                                            hourlyData={hourlyData}
                                            metricKey="humidity"
                                            label="相对湿度"
                                            unit="%"
                                            color="#60A5FA"
                                            yMin={0}
                                            yMax={100}
                                        />
                                        <WeatherChart
                                            hourlyData={hourlyData}
                                            metricKey="wind_speed"
                                            label="风速"
                                            unit="m/s"
                                            color="#A78BFA"
                                            yMin={0}
                                        />
                                        <PrecipitationChart hourlyData={hourlyData} />
                                    </div>
                                </div>

                                <div className="dashboard-card p-5">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="font-semibold text-panel-text flex items-center gap-2">
                                            <AlertCircle className="w-4 h-4 text-amber-400" />
                                            预警时间轴与处置建议
                                        </h3>
                                        {detailData?.alerts?.length > 0 && (
                                            <span className="text-xs text-panel-muted">
                                                共 {detailData.alerts.length} 条预警
                                            </span>
                                        )}
                                    </div>
                                    <div className="panel-header-line mb-4" />

                                    {detailData?.alerts?.length === 0 ? (
                                        <div className="text-center py-12 text-panel-muted">
                                            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                                                <Check className="w-8 h-8 text-emerald-400" />
                                            </div>
                                            <p className="text-emerald-300 font-medium">未来7天无极端天气预警</p>
                                            <p className="text-xs text-panel-muted mt-1">蜂场气象条件良好，可正常开展生产活动</p>
                                        </div>
                                    ) : (
                                        detailData?.alerts?.map((alert, idx) => (
                                            <AlertTimelineCard
                                                key={`${alert.alert_type}_${alert.start_time}_${idx}`}
                                                alert={alert}
                                                farmId={selectedFarmId}
                                                onToggleAction={handleToggleAction}
                                            />
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default WeatherScreen;
