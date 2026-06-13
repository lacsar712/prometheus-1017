import { AlertTriangle, AlertCircle, Info, Clock, AlertOctagon, ChevronRight } from 'lucide-react';

function AlertsQuadrant({ data }) {
    if (!data) {
        return (
            <div className="dashboard-card h-full flex items-center justify-center">
                <div className="text-panel-muted animate-pulse">加载中...</div>
            </div>
        );
    }

    const levelBadge = (level) => {
        const map = {
            critical: {
                bg: 'bg-red-500/15 border-red-500/40 text-red-400',
                dot: 'bg-red-500',
                label: '严重',
            },
            warning: {
                bg: 'bg-honey-500/15 border-honey-500/40 text-honey-400',
                dot: 'bg-honey-500',
                label: '警告',
            },
            info: {
                bg: 'bg-blue-500/15 border-blue-500/40 text-blue-400',
                dot: 'bg-blue-500',
                label: '提示',
            },
        };
        return map[level] || map.info;
    };

    const levelIcon = (level) => {
        const cls = "w-4 h-4";
        switch (level) {
            case 'critical': return <AlertOctagon className={`${cls} text-red-400`} />;
            case 'warning': return <AlertTriangle className={`${cls} text-honey-400`} />;
            default: return <Info className={`${cls} text-blue-400`} />;
        }
    };

    const now = new Date();
    const timelineHours = [];
    for (let i = 24; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 60 * 60 * 1000);
        timelineHours.push({
            label: `${d.getHours().toString().padStart(2, '0')}`,
            hour: d.getHours(),
            dateKey: `${d.getMonth() + 1}/${d.getDate()}`,
        });
    }

    const maxTimelineCount = Math.max(...(data.timeline?.map(t => t.total || 0).concat([1])));

    return (
        <div className="dashboard-card h-full flex flex-col scan-overlay">
            <div className="p-4 pb-3 border-b border-panel-border/60 relative z-20">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-red-500/15 border border-red-500/30">
                            <AlertTriangle className="w-4 h-4 text-red-400" />
                        </div>
                        <h3 className="text-base font-semibold text-panel-text tracking-wide">异常告警 Top5 & 24h 时间轴</h3>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-panel-card/80 border border-panel-border/60">
                            <span className="blink-dot" style={{ backgroundColor: '#EF4444' }}></span>
                            <span className="text-panel-muted">24h 总计</span>
                            <span className="font-bold font-mono text-honey-400 number-flash" key={`al-total-${data.total_alerts_24h}`}>
                                {data.total_alerts_24h}
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-red-500"></span>
                            <span className="text-panel-muted">严重</span>
                            <span className="font-mono text-red-400 ml-0.5">{data.level_counts?.critical || 0}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-honey-500"></span>
                            <span className="text-panel-muted">警告</span>
                            <span className="font-mono text-honey-400 ml-0.5">{data.level_counts?.warning || 0}</span>
                        </div>
                    </div>
                </div>
                <div className="panel-header-line"></div>
            </div>

            <div className="flex-1 p-4 overflow-hidden relative z-20 grid grid-cols-12 gap-4">
                <div className="col-span-5 flex flex-col gap-2 overflow-hidden">
                    <div className="text-xs text-panel-muted flex items-center gap-1 px-1 pb-1">
                        <AlertCircle className="w-3 h-3" />
                        告警 Top 5
                    </div>
                    <div className="flex-1 space-y-2 overflow-y-auto timeline-scroll pr-1">
                        {(data.top_alerts && data.top_alerts.length > 0) ? data.top_alerts.map((alert, idx) => {
                            const badge = levelBadge(alert.level);
                            return (
                                <div
                                    key={`${alert.farm_id}-${alert.alert_code}-${idx}`}
                                    className={`corner-brackets rounded-lg p-3 border border-panel-border/40 transition-all hover:border-honey-500/30 ${
                                        alert.level === 'critical' ? 'bg-gradient-to-r from-red-950/40 to-panel-card/60' : 'bg-panel-card/60'
                                    }`}
                                >
                                    <div className="flex items-start gap-2.5">
                                        <div className="w-6 h-6 rounded-lg bg-panel-bg/80 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <span className="text-xs font-bold font-mono text-honey-400">
                                                {idx + 1}
                                            </span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                {levelIcon(alert.level)}
                                                <span className="text-sm font-semibold text-panel-text truncate">
                                                    {alert.alert_name}
                                                </span>
                                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border flex-shrink-0 ${badge.bg}`}>
                                                    {badge.label}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-panel-muted mb-1.5">
                                                <ChevronRight className="w-3 h-3" />
                                                <span className="truncate">{alert.farm_name}</span>
                                                <span className="flex-shrink-0 opacity-60">· {alert.region}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-xs">
                                                <div className="flex items-center gap-1 text-panel-muted">
                                                    <Clock className="w-3 h-3" />
                                                    <span>
                                                        {new Date(alert.first_seen).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <span className="text-panel-muted">触发</span>
                                                    <span
                                                        className={`font-mono font-bold number-flash ${alert.level === 'critical' ? 'text-red-400' : 'text-honey-400'}`}
                                                        key={`al-count-${alert.count}`}
                                                    >
                                                        {alert.count}
                                                    </span>
                                                    <span className="text-panel-muted">次</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        }) : (
                            <div className="flex flex-col items-center justify-center h-40 text-panel-muted">
                                <AlertCircle className="w-10 h-10 mb-2 opacity-30" />
                                <div className="text-sm">暂无告警数据</div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="col-span-7 flex flex-col gap-2 overflow-hidden">
                    <div className="text-xs text-panel-muted flex items-center justify-between px-1 pb-1">
                        <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            最近 24 小时告警分布
                        </div>
                        <div className="text-[10px] opacity-70">
                            {timelineHours[0]?.dateKey} {timelineHours[0]?.label}:00
                            <span className="mx-1.5 opacity-50">~</span>
                            {timelineHours[timelineHours.length - 1]?.label}:00
                        </div>
                    </div>

                    <div className="flex-1 rounded-lg bg-panel-card/40 border border-panel-border/40 p-3 relative overflow-hidden">
                        <svg viewBox="0 0 600 160" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                            <defs>
                                <linearGradient id="critBar" x1="0%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" stopColor="#EF4444" stopOpacity="0.95" />
                                    <stop offset="100%" stopColor="#DC2626" stopOpacity="0.6" />
                                </linearGradient>
                                <linearGradient id="warnBar" x1="0%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" stopColor="#FBBF24" stopOpacity="0.95" />
                                    <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.6" />
                                </linearGradient>
                                <linearGradient id="infoBar" x1="0%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.95" />
                                    <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.6" />
                                </linearGradient>
                            </defs>

                            {[0, 1, 2, 3].map(i => (
                                <line
                                    key={i}
                                    x1="30" y1={15 + i * 38}
                                    x2="590" y2={15 + i * 38}
                                    stroke="rgba(61, 50, 36, 0.4)"
                                    strokeWidth="1"
                                    strokeDasharray="3 3"
                                />
                            ))}

                            {[0, 1, 2, 3].map(i => (
                                <text
                                    key={i}
                                    x="26"
                                    y={19 + i * 38}
                                    textAnchor="end"
                                    fontSize="8"
                                    fill="#B8A88A"
                                >
                                    {Math.round((maxTimelineCount / 3) * (3 - i))}
                                </text>
                            ))}

                            {(() => {
                                const bucketCount = 48;
                                const buckets = new Array(bucketCount).fill(null).map(() => ({ c: 0, w: 0, i: 0 }));
                                const startOfWindow = now.getTime() - 24 * 60 * 60 * 1000;
                                (data.timeline || []).forEach(t => {
                                    const tTime = new Date(t.time).getTime();
                                    const idx = Math.min(
                                        bucketCount - 1,
                                        Math.max(0, Math.floor(((tTime - startOfWindow) / (24 * 60 * 60 * 1000)) * bucketCount))
                                    );
                                    buckets[idx].c += t.critical || 0;
                                    buckets[idx].w += t.warning || 0;
                                    buckets[idx].i += t.info || 0;
                                });
                                const barW = 540 / bucketCount - 1.5;
                                const maxPerBucket = Math.max(...buckets.map(b => b.c + b.w + b.i).concat([1]));

                                return buckets.map((b, idx) => {
                                    const x = 36 + idx * (540 / bucketCount);
                                    const totalH = ((b.c + b.w + b.i) / maxPerBucket) * 140;
                                    const hC = (b.c / maxPerBucket) * 140;
                                    const hW = (b.w / maxPerBucket) * 140;
                                    const hI = (b.i / maxPerBucket) * 140;
                                    const baseY = 155;
                                    return (
                                        <g key={idx} opacity={totalH > 0 ? 1 : 0.25}>
                                            {hI > 0 && (
                                                <rect
                                                    x={x} y={baseY - totalH}
                                                    width={barW} height={hI}
                                                    fill="url(#infoBar)" rx="1"
                                                />
                                            )}
                                            {hW > 0 && (
                                                <rect
                                                    x={x} y={baseY - totalH + hI}
                                                    width={barW} height={hW}
                                                    fill="url(#warnBar)" rx="1"
                                                />
                                            )}
                                            {hC > 0 && (
                                                <rect
                                                    x={x} y={baseY - totalH + hI + hW}
                                                    width={barW} height={hC}
                                                    fill="url(#critBar)" rx="1"
                                                />
                                            )}
                                        </g>
                                    );
                                });
                            })()}

                            {timelineHours.filter((_, i) => i % 6 === 0).map((h, i) => {
                                const ratio = i / ((timelineHours.filter((_, x) => x % 6 === 0).length) - 1 || 1);
                                const x = 36 + ratio * 540;
                                return (
                                    <g key={`h-${i}`}>
                                        <line x1={x} y1="155" x2={x} y2="159" stroke="#6B5A43" strokeWidth="1" />
                                        <text x={x} y="169" textAnchor="middle" fontSize="9" fill="#B8A88A">
                                            {h.label}
                                        </text>
                                    </g>
                                );
                            })}
                        </svg>

                        <div className="absolute bottom-2 right-3 flex items-center gap-3 text-[10px]">
                            <div className="flex items-center gap-1">
                                <span className="w-3 h-2 rounded-sm bg-gradient-to-b from-red-500 to-red-700 inline-block"></span>
                                <span className="text-panel-muted">严重</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="w-3 h-2 rounded-sm bg-gradient-to-b from-honey-500 to-honey-700 inline-block"></span>
                                <span className="text-panel-muted">警告</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="w-3 h-2 rounded-sm bg-gradient-to-b from-blue-400 to-blue-600 inline-block"></span>
                                <span className="text-panel-muted">提示</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        <div className="rounded-lg bg-red-500/8 border border-red-500/20 p-2.5">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-[11px] text-red-400/90">严重告警</span>
                                <AlertOctagon className="w-3.5 h-3.5 text-red-400" />
                            </div>
                            <div
                                className="text-xl font-bold font-mono text-red-400 number-flash"
                                key={`al-c-${data.level_counts?.critical || 0}`}
                            >
                                {data.level_counts?.critical || 0}
                            </div>
                        </div>
                        <div className="rounded-lg bg-honey-500/8 border border-honey-500/20 p-2.5">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-[11px] text-honey-400/90">警告事件</span>
                                <AlertTriangle className="w-3.5 h-3.5 text-honey-400" />
                            </div>
                            <div
                                className="text-xl font-bold font-mono text-honey-400 number-flash"
                                key={`al-w-${data.level_counts?.warning || 0}`}
                            >
                                {data.level_counts?.warning || 0}
                            </div>
                        </div>
                        <div className="rounded-lg bg-blue-500/8 border border-blue-500/20 p-2.5">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-[11px] text-blue-400/90">提示信息</span>
                                <Info className="w-3.5 h-3.5 text-blue-400" />
                            </div>
                            <div
                                className="text-xl font-bold font-mono text-blue-400 number-flash"
                                key={`al-i-${data.level_counts?.info || 0}`}
                            >
                                {data.level_counts?.info || 0}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AlertsQuadrant;
