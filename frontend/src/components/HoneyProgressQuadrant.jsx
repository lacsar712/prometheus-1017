import { Droplets, Target, BarChart3, History } from 'lucide-react';

function HoneyProgressQuadrant({ data }) {
    if (!data) {
        return (
            <div className="dashboard-card h-full flex items-center justify-center">
                <div className="text-panel-muted animate-pulse">加载中...</div>
            </div>
        );
    }

    const completionPct = Math.round(data.completion_rate * 100);
    const radius = 52;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (data.completion_rate * circumference);

    const cumulativeData = data.farm_details.length > 0
        ? data.farm_details.reduce((acc, farm) => {
            farm.hourly_data.forEach((h, i) => {
                if (!acc[i]) acc[i] = { hour: h.hour, amount: 0, cumulative: 0 };
                acc[i].amount += h.amount;
            });
            return acc;
        }, [])
        : [];

    if (cumulativeData.length > 0) {
        let running = 0;
        cumulativeData.forEach(d => {
            running += d.amount;
            d.cumulative = running;
        });
    }

    const maxAmount = Math.max(...(cumulativeData.map(d => d.amount).concat([1])));
    const maxCumulative = Math.max(...(cumulativeData.map(d => d.cumulative).concat([1])));

    return (
        <div className="dashboard-card h-full flex flex-col scan-overlay">
            <div className="p-4 pb-3 border-b border-panel-border/60 relative z-20">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-honey-500/15 border border-honey-500/30">
                            <Droplets className="w-4 h-4 text-honey-400" />
                        </div>
                        <h3 className="text-base font-semibold text-panel-text tracking-wide">当日采蜜进度 & 累计采蜜量</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="rotating-badge">
                            {data.today_date}
                        </span>
                    </div>
                </div>
                <div className="panel-header-line"></div>
            </div>

            <div className="flex-1 p-4 overflow-hidden relative z-20 grid grid-cols-12 gap-4">
                <div className="col-span-4 flex flex-col gap-3">
                    <div className="corner-brackets bg-panel-card/60 rounded-lg p-4 flex flex-col items-center justify-center flex-1 relative overflow-hidden">
                        <svg width="150" height="150" viewBox="0 0 140 140" className="transform -rotate-90">
                            <defs>
                                <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#FFD666" />
                                    <stop offset="40%" stopColor="#FFB21A" />
                                    <stop offset="100%" stopColor="#D97706" />
                                </linearGradient>
                                <filter id="progressGlow">
                                    <feGaussianBlur stdDeviation="2" result="blur" />
                                    <feMerge>
                                        <feMergeNode in="blur" />
                                        <feMergeNode in="SourceGraphic" />
                                    </feMerge>
                                </filter>
                            </defs>
                            <circle
                                cx="70" cy="70" r={radius}
                                fill="none"
                                stroke="rgba(61, 50, 36, 0.8)"
                                strokeWidth="10"
                            />
                            <circle
                                cx="70" cy="70" r={radius}
                                fill="none"
                                stroke="url(#progressGradient)"
                                strokeWidth="10"
                                strokeLinecap="round"
                                strokeDasharray={circumference}
                                strokeDashoffset={offset}
                                filter="url(#progressGlow)"
                                style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <div
                                className="text-4xl font-bold gradient-text data-glow number-flash font-mono"
                                key={`hp-pct-${completionPct}`}
                            >
                                {completionPct}%
                            </div>
                            <div className="text-xs text-panel-muted mt-1">今日完成率</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="corner-brackets bg-panel-card/60 rounded-lg p-3">
                            <div className="flex items-center gap-1.5 text-xs text-panel-muted mb-1.5">
                                <Target className="w-3 h-3" />
                                今日目标
                            </div>
                            <div
                                className="text-xl font-bold gradient-text-warm number-flash font-mono"
                                key={`hp-tg-${data.today_target}`}
                            >
                                {data.today_target.toLocaleString()}
                                <span className="text-sm text-panel-muted ml-1 font-normal">{data.unit}</span>
                            </div>
                        </div>
                        <div className="corner-brackets bg-panel-card/60 rounded-lg p-3">
                            <div className="flex items-center gap-1.5 text-xs text-panel-muted mb-1.5">
                                <Droplets className="w-3 h-3" />
                                已采蜜
                            </div>
                            <div
                                className="text-xl font-bold gradient-text-warm number-flash font-mono"
                                key={`hp-th-${data.today_harvested}`}
                            >
                                {data.today_harvested.toLocaleString()}
                                <span className="text-sm text-panel-muted ml-1 font-normal">{data.unit}</span>
                            </div>
                        </div>
                    </div>

                    <div className="corner-brackets bg-gradient-to-br from-honey-600/20 to-ambercomb-700/20 rounded-lg p-3 border border-honey-500/20">
                        <div className="flex items-center gap-1.5 text-xs text-panel-muted mb-1.5">
                            <History className="w-3 h-3" />
                            累计采蜜总量
                        </div>
                        <div
                            className="text-2xl font-bold gradient-text number-flash font-mono flex items-baseline"
                            key={`hp-ct-${data.cumulative_total}`}
                        >
                            {data.cumulative_total.toLocaleString()}
                            <span className="text-sm text-panel-muted ml-1.5 font-normal">{data.unit}</span>
                        </div>
                    </div>
                </div>

                <div className="col-span-8 flex flex-col gap-3">
                    <div className="flex-1 bg-panel-card/40 rounded-lg p-3 border border-panel-border/40 flex flex-col overflow-hidden">
                        <div className="text-xs text-panel-muted mb-2 flex items-center gap-2">
                            <BarChart3 className="w-3 h-3" />
                            逐小时采蜜曲线
                            <div className="flex-1"></div>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1">
                                    <span className="w-3 h-3 rounded-sm bg-honey-400/70 inline-block"></span>
                                    <span>单小时</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className="w-3 h-0.5 bg-ambercomb-400 inline-block"></span>
                                    <span>累计</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 relative">
                            <svg viewBox="0 0 500 180" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                                <defs>
                                    <linearGradient id="barGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                                        <stop offset="0%" stopColor="#FBBF24" stopOpacity="0.9" />
                                        <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.5" />
                                    </linearGradient>
                                    <linearGradient id="areaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                                        <stop offset="0%" stopColor="#FBBF24" stopOpacity="0.2" />
                                        <stop offset="100%" stopColor="#FBBF24" stopOpacity="0" />
                                    </linearGradient>
                                </defs>

                                {[0, 1, 2, 3, 4].map(i => (
                                    <line
                                        key={i}
                                        x1="30" y1={15 + i * 36}
                                        x2="490" y2={15 + i * 36}
                                        stroke="rgba(61, 50, 36, 0.5)"
                                        strokeWidth="1"
                                        strokeDasharray="3 3"
                                    />
                                ))}

                                {[0, 1, 2, 3, 4].map(i => (
                                    <text
                                        key={i}
                                        x="26"
                                        y={18 + i * 36}
                                        textAnchor="end"
                                        fontSize="9"
                                        fill="#B8A88A"
                                    >
                                        {((maxCumulative / 4) * (4 - i)).toFixed(0)}
                                    </text>
                                ))}

                                {cumulativeData.length > 0 && (() => {
                                    const barW = 440 / cumulativeData.length - 4;
                                    const points = cumulativeData.map((d, i) => {
                                        const x = 36 + i * (440 / cumulativeData.length) + barW / 2;
                                        const y = 159 - (d.cumulative / maxCumulative) * 144;
                                        return `${x},${y}`;
                                    }).join(' ');
                                    const areaPoints = `36,159 ${points} ${36 + (cumulativeData.length - 1) * (440 / cumulativeData.length) + barW / 2},159`;
                                    return (
                                        <>
                                            <polygon points={areaPoints} fill="url(#areaGrad)" />
                                            <polyline
                                                points={points}
                                                fill="none"
                                                stroke="#FBBF24"
                                                strokeWidth="2"
                                                strokeLinejoin="round"
                                                strokeLinecap="round"
                                                style={{
                                                    strokeDasharray: 2000,
                                                    strokeDashoffset: 0,
                                                    animation: 'drawLine 2s ease-out forwards',
                                                }}
                                            />
                                            {cumulativeData.map((d, i) => {
                                                const cx = 36 + i * (440 / cumulativeData.length) + barW / 2;
                                                const cy = 159 - (d.cumulative / maxCumulative) * 144;
                                                return (
                                                    <circle
                                                        key={`p-${i}`}
                                                        cx={cx} cy={cy} r="2.5"
                                                        fill="#FBBF24"
                                                        stroke="#1C1712"
                                                        strokeWidth="1.5"
                                                    />
                                                );
                                            })}
                                            {cumulativeData.map((d, i) => {
                                                const barH = (d.amount / maxAmount) * 70;
                                                const x = 36 + i * (440 / cumulativeData.length);
                                                const y = 159 - barH;
                                                return (
                                                    <g key={`b-${i}`}>
                                                        <rect
                                                            x={x} y={y}
                                                            width={barW} height={barH}
                                                            fill="url(#barGrad)"
                                                            rx="2"
                                                            style={{
                                                                animation: `barGrow 0.8s ease-out ${i * 0.05}s both`
                                                            }}
                                                        />
                                                        {i % 2 === 0 && (
                                                            <text
                                                                x={x + barW / 2}
                                                                y="172"
                                                                textAnchor="middle"
                                                                fontSize="9"
                                                                fill="#B8A88A"
                                                            >
                                                                {d.hour.split(':')[0]}
                                                            </text>
                                                        )}
                                                    </g>
                                                );
                                            })}
                                        </>
                                    );
                                })()}
                            </svg>
                        </div>
                    </div>

                    <div className="bg-panel-card/40 rounded-lg p-2.5 border border-panel-border/40">
                        <div className="text-xs text-panel-muted mb-2 px-1">各蜂场采蜜进度</div>
                        <div className="grid grid-cols-2 gap-2">
                            {data.farm_details.map(farm => (
                                <div key={farm.farm_id} className="flex items-center gap-2">
                                    <div className="text-xs text-panel-text truncate flex-shrink-0 w-24" title={farm.farm_name}>
                                        {farm.farm_name.slice(0, 6)}
                                    </div>
                                    <div className="flex-1 h-3 bg-panel-bg rounded-full overflow-hidden relative">
                                        <div
                                            className="h-full bg-gradient-to-r from-honey-500 via-ambercomb-400 to-honey-400 rounded-full transition-all duration-1000 relative overflow-hidden"
                                            style={{ width: `${Math.min(100, farm.completion_rate * 100)}%` }}
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-scan" style={{ animationDuration: '2s' }}></div>
                                        </div>
                                    </div>
                                    <div className="text-xs font-mono text-honey-400 w-12 text-right flex-shrink-0">
                                        {farm.today_harvested.toFixed(0)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            <style>{`
                @keyframes barGrow {
                    from { transform: scaleY(0); transform-origin: bottom; }
                    to { transform: scaleY(1); transform-origin: bottom; }
                }
                @keyframes drawLine {
                    from { strokeDashoffset: 2000; }
                    to { strokeDashoffset: 0; }
                }
            `}</style>
        </div>
    );
}

export default HoneyProgressQuadrant;
