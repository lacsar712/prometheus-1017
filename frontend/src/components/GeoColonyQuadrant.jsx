import { MapPin, ThermometerSun, Shield, TrendingUp } from 'lucide-react';

function GeoColonyQuadrant({ data }) {
    if (!data) {
        return (
            <div className="dashboard-card h-full flex items-center justify-center">
                <div className="text-panel-muted animate-pulse">加载中...</div>
            </div>
        );
    }

    const maxHives = Math.max(...data.farms.map(f => f.hive_count));
    const regions = Object.entries(data.region_summary || {});

    const getStrengthColor = (level) => {
        switch (level) {
            case 'strong': return 'bg-emerald-500/80 border-emerald-400';
            case 'medium': return 'bg-honey-400/80 border-honey-300';
            case 'weak': return 'bg-red-500/80 border-red-400';
            default: return 'bg-panel-muted border-panel-muted';
        }
    };

    const getStrengthTextColor = (level) => {
        switch (level) {
            case 'strong': return 'text-emerald-400';
            case 'medium': return 'text-honey-400';
            case 'weak': return 'text-red-400';
            default: return 'text-panel-muted';
        }
    };

    return (
        <div className="dashboard-card h-full flex flex-col scan-overlay">
            <div className="p-4 pb-3 border-b border-panel-border/60 relative z-20">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-honey-500/15 border border-honey-500/30">
                            <MapPin className="w-4 h-4 text-honey-400" />
                        </div>
                        <h3 className="text-base font-semibold text-panel-text tracking-wide">蜂场地理分布 & 群势分布</h3>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                        <div className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            <span className="text-panel-muted">强群</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-honey-400"></span>
                            <span className="text-panel-muted">中等</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-red-500"></span>
                            <span className="text-panel-muted">弱群</span>
                        </div>
                    </div>
                </div>
                <div className="panel-header-line"></div>
            </div>

            <div className="flex-1 p-4 overflow-hidden relative z-20 grid grid-cols-5 gap-4">
                <div className="col-span-3 flex flex-col gap-3">
                    <div className="grid grid-cols-3 gap-3 mb-1">
                        <div className="corner-brackets bg-panel-card/60 rounded-lg p-3">
                            <div className="text-xs text-panel-muted mb-1">蜂场总数</div>
                            <div className="text-2xl font-bold gradient-text number-flash" key={`gc-fc-${data.farm_count}`}>
                                {data.farm_count}
                            </div>
                        </div>
                        <div className="corner-brackets bg-panel-card/60 rounded-lg p-3">
                            <div className="text-xs text-panel-muted mb-1">在养蜂箱</div>
                            <div className="text-2xl font-bold gradient-text number-flash" key={`gc-th-${data.total_hives}`}>
                                {data.total_hives.toLocaleString()}
                            </div>
                        </div>
                        <div className="corner-brackets bg-panel-card/60 rounded-lg p-3">
                            <div className="text-xs text-panel-muted mb-1">平均群势</div>
                            <div className="text-2xl font-bold gradient-text number-flash" key={`gc-as-${data.avg_strength}`}>
                                {(data.avg_strength * 100).toFixed(1)}%
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 bg-panel-card/40 rounded-lg p-3 border border-panel-border/40 overflow-hidden">
                        <div className="text-xs text-panel-muted mb-2 flex items-center gap-1">
                            <ThermometerSun className="w-3 h-3" />
                            各蜂场群势详情
                        </div>
                        <div className="space-y-2 h-[calc(100%-24px)] overflow-y-auto timeline-scroll pr-1">
                            {data.farms.map((farm) => (
                                <div
                                    key={farm.id}
                                    className="bg-panel-bg/60 rounded-lg p-2.5 hover:bg-panel-card transition-colors border border-panel-border/30"
                                >
                                    <div className="flex items-center justify-between mb-1.5">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className={`w-2 h-2 rounded-full ${getStrengthColor(farm.strength_level)} border`}></span>
                                            <span className="text-sm font-medium text-panel-text truncate">{farm.name}</span>
                                        </div>
                                        <span className={`text-sm font-mono font-bold ${getStrengthTextColor(farm.strength_level)}`}>
                                            {(farm.avg_strength * 100).toFixed(1)}%
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-panel-muted">
                                        <span className="flex items-center gap-1">
                                            <Shield className="w-3 h-3" />
                                            {farm.hive_count} 箱
                                        </span>
                                        <span>{farm.region}</span>
                                    </div>
                                    <div className="mt-2 h-1.5 bg-panel-bg rounded-full overflow-hidden flex">
                                        <div
                                            className="bg-emerald-500 transition-all duration-700"
                                            style={{ width: `${(farm.hive_distribution.strong / farm.hive_count) * 100}%` }}
                                        ></div>
                                        <div
                                            className="bg-honey-400 transition-all duration-700"
                                            style={{ width: `${(farm.hive_distribution.medium / farm.hive_count) * 100}%` }}
                                        ></div>
                                        <div
                                            className="bg-red-500 transition-all duration-700"
                                            style={{ width: `${(farm.hive_distribution.weak / farm.hive_count) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="col-span-2 flex flex-col gap-3">
                    <div className="bg-panel-card/40 rounded-lg p-3 border border-panel-border/40">
                        <div className="text-xs text-panel-muted mb-3 flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            区域汇总
                        </div>
                        <div className="space-y-3">
                            {regions.length > 0 ? regions.map(([region, info]) => (
                                <div key={region}>
                                    <div className="flex items-center justify-between text-xs mb-1">
                                        <span className="text-panel-text font-medium">{region}</span>
                                        <span className="text-honey-400 font-mono">{info.hives} 箱</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 h-2 bg-panel-bg rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-honey-500 to-ambercomb-400 rounded-full transition-all duration-700"
                                                style={{ width: `${(info.hives / maxHives) * (100 / Math.ceil(regions.length / 2))}%` }}
                                            ></div>
                                        </div>
                                        <span className="text-xs text-emerald-400 font-mono w-12 text-right">
                                            {(info.avg_strength * 100).toFixed(0)}%
                                        </span>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center text-panel-muted text-sm py-4">暂无区域数据</div>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 rounded-lg p-3 border border-panel-border/40 relative overflow-hidden hex-pattern bg-gradient-to-br from-panel-card/40 to-panel-card/20">
                        <div className="text-xs text-panel-muted mb-2">地理分布示意</div>
                        <div className="relative w-full h-[calc(100%-24px)]">
                            <svg viewBox="0 0 300 200" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                                <defs>
                                    <radialGradient id="mapGlow" cx="50%" cy="50%" r="50%">
                                        <stop offset="0%" stopColor="#FBBF24" stopOpacity="0.08" />
                                        <stop offset="100%" stopColor="#FBBF24" stopOpacity="0" />
                                    </radialGradient>
                                    <filter id="pointGlow">
                                        <feGaussianBlur stdDeviation="2" result="blur" />
                                        <feMerge>
                                            <feMergeNode in="blur" />
                                            <feMergeNode in="SourceGraphic" />
                                        </feMerge>
                                    </filter>
                                </defs>
                                <ellipse cx="150" cy="100" rx="140" ry="90" fill="url(#mapGlow)" />

                                <path
                                    d="M 60 60 Q 80 40 120 50 Q 160 45 180 65 Q 220 55 250 75 Q 270 100 250 130 Q 220 155 180 145 Q 140 165 100 150 Q 60 135 55 100 Q 50 75 60 60 Z"
                                    fill="rgba(251, 191, 36, 0.03)"
                                    stroke="rgba(251, 191, 36, 0.15)"
                                    strokeWidth="1"
                                    strokeDasharray="4 3"
                                />

                                {data.farms.map((farm, i) => {
                                    const x = 30 + ((farm.lng - 100) / 40) * 240;
                                    const y = 180 - ((farm.lat - 20) / 30) * 160;
                                    const size = 4 + (farm.hive_count / maxHives) * 8;
                                    const pulseDelay = i * 0.3;
                                    return (
                                        <g key={farm.id} style={{ animation: `float 6s ease-in-out infinite`, animationDelay: `${pulseDelay}s` }}>
                                            <circle cx={x} cy={y} r={size + 6} fill="rgba(251, 191, 36, 0.1)" className="animate-ping" style={{ animationDuration: '3s', animationDelay: `${pulseDelay}s` }} />
                                            <circle cx={x} cy={y} r={size + 3} fill="rgba(251, 191, 36, 0.15)" />
                                            <circle cx={x} cy={y} r={size} filter="url(#pointGlow)" fill={
                                                farm.strength_level === 'strong' ? '#10B981' :
                                                farm.strength_level === 'medium' ? '#FBBF24' : '#EF4444'
                                            } />
                                            <text x={x} y={y + size + 12} textAnchor="middle" fontSize="9" fill="#B8A88A" fontWeight="500">
                                                {farm.name.slice(0, 4)}
                                            </text>
                                        </g>
                                    );
                                })}
                            </svg>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default GeoColonyQuadrant;
