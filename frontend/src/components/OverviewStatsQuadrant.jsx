import { Box, Users, ClipboardCheck, Activity, CheckCircle2, Timer, UserCheck, Circle } from 'lucide-react';

function AnimatedNumber({ value, prefix = '', suffix = '', className = '' }) {
    return (
        <span className={`gradient-text font-bold font-mono ${className}`} key={`num-${prefix}-${value}-${suffix}`}>
            {prefix}{Number(value).toLocaleString()}{suffix}
        </span>
    );
}

function OverviewStatsQuadrant({ data }) {
    if (!data) {
        return (
            <div className="dashboard-card h-full flex items-center justify-center">
                <div className="text-panel-muted animate-pulse">加载中...</div>
            </div>
        );
    }

    const hives = data.hives || {};
    const beekeepers = data.beekeepers || {};
    const inspection = data.inspection || {};

    return (
        <div className="dashboard-card h-full flex flex-col scan-overlay">
            <div className="p-4 pb-3 border-b border-panel-border/60 relative z-20">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-honey-500/15 border border-honey-500/30">
                            <Activity className="w-4 h-4 text-honey-400" />
                        </div>
                        <h3 className="text-base font-semibold text-panel-text tracking-wide">核心运营指标</h3>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                        <span className="text-panel-muted">覆盖蜂场</span>
                        <span className="rotating-badge">
                            {data.farm_count} 个场区
                        </span>
                    </div>
                </div>
                <div className="panel-header-line"></div>
            </div>

            <div className="flex-1 p-4 overflow-hidden relative z-20 flex flex-col gap-4">
                <div className="grid grid-cols-3 gap-4 flex-shrink-0">
                    <div className="corner-brackets relative rounded-xl p-4 bg-gradient-to-br from-honey-600/15 via-panel-card/70 to-panel-card/80 border border-honey-500/20 overflow-hidden">
                        <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-honey-500/10 blur-2xl"></div>
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-3">
                                <div className="p-2 rounded-lg bg-honey-500/20 border border-honey-500/30">
                                    <Box className="w-5 h-5 text-honey-400" />
                                </div>
                                <span className="text-[10px] text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                    在线 {Math.round(hives.active_rate * 100)}%
                                </span>
                            </div>
                            <div className="text-xs text-panel-muted mb-1 tracking-wide">在养蜂箱总数</div>
                            <div className="flex items-baseline gap-1 mb-2">
                                <AnimatedNumber value={hives.total || 0} className="text-4xl number-flash tracking-tight" />
                                <span className="text-panel-muted text-sm font-medium">箱</span>
                            </div>
                            <div className="flex items-center justify-between text-xs pt-2 border-t border-panel-border/50">
                                <div className="flex items-center gap-1 text-emerald-400">
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>活跃</span>
                                    <span className="font-mono font-bold ml-0.5">{hives.active?.toLocaleString()}</span>
                                </div>
                                <div className="flex items-center gap-1 text-panel-muted">
                                    <Timer className="w-3 h-3" />
                                    <span>空闲</span>
                                    <span className="font-mono font-bold ml-0.5">{hives.idle?.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="corner-brackets relative rounded-xl p-4 bg-gradient-to-br from-emerald-600/15 via-panel-card/70 to-panel-card/80 border border-emerald-500/20 overflow-hidden">
                        <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-emerald-500/10 blur-2xl"></div>
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-3">
                                <div className="p-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30">
                                    <Users className="w-5 h-5 text-emerald-400" />
                                </div>
                                <span className="text-[10px] text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                    在岗 {Math.round(beekeepers.attendance_rate * 100)}%
                                </span>
                            </div>
                            <div className="text-xs text-panel-muted mb-1 tracking-wide">在岗养蜂员</div>
                            <div className="flex items-baseline gap-1 mb-2">
                                <AnimatedNumber
                                    value={beekeepers.on_duty || 0}
                                    className="text-4xl number-flash tracking-tight"
                                />
                                <span className="text-panel-muted text-sm font-medium">人</span>
                                <span className="text-panel-muted text-xs font-mono ml-2">
                                    / {beekeepers.total || 0} 编制
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-xs pt-2 border-t border-panel-border/50">
                                <div className="flex items-center gap-1 text-emerald-400">
                                    <UserCheck className="w-3 h-3" />
                                    <span>在岗</span>
                                    <span className="font-mono font-bold ml-0.5">{beekeepers.on_duty}</span>
                                </div>
                                <div className="flex items-center gap-1 text-panel-muted">
                                    <Circle className="w-3 h-3" />
                                    <span>离岗</span>
                                    <span className="font-mono font-bold ml-0.5">{beekeepers.off_duty}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="corner-brackets relative rounded-xl p-4 bg-gradient-to-br from-blue-600/15 via-panel-card/70 to-panel-card/80 border border-blue-500/20 overflow-hidden">
                        <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-blue-500/10 blur-2xl"></div>
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-3">
                                <div className="p-2 rounded-lg bg-blue-500/20 border border-blue-500/30">
                                    <ClipboardCheck className="w-5 h-5 text-blue-400" />
                                </div>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                                    inspection.completion_rate >= 0.6
                                        ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                                        : inspection.completion_rate >= 0.3
                                        ? 'text-honey-400 bg-honey-500/10 border-honey-500/20'
                                        : 'text-red-400 bg-red-500/10 border-red-500/20'
                                }`}>
                                    完成 {Math.round(inspection.completion_rate * 100)}%
                                </span>
                            </div>
                            <div className="text-xs text-panel-muted mb-1 tracking-wide">今日待巡检蜂箱</div>
                            <div className="flex items-baseline gap-1 mb-2">
                                <AnimatedNumber
                                    value={inspection.today_remaining || 0}
                                    className="text-4xl number-flash tracking-tight"
                                />
                                <span className="text-panel-muted text-sm font-medium">箱</span>
                            </div>
                            <div className="h-2 bg-panel-bg rounded-full overflow-hidden mb-2 relative">
                                <div
                                    className={`h-full rounded-full transition-all duration-1000 relative overflow-hidden ${
                                        inspection.completion_rate >= 0.6
                                            ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                                            : inspection.completion_rate >= 0.3
                                            ? 'bg-gradient-to-r from-honey-500 to-honey-400'
                                            : 'bg-gradient-to-r from-red-500 to-red-400'
                                    }`}
                                    style={{ width: `${Math.round(inspection.completion_rate * 100)}%` }}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"></div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-1 text-emerald-400">
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>已完成</span>
                                    <span className="font-mono font-bold ml-0.5">{inspection.today_completed?.toLocaleString()}</span>
                                </div>
                                <div className="flex items-center gap-1 text-panel-muted">
                                    <Timer className="w-3 h-3" />
                                    <span>待处理</span>
                                    <span className="font-mono font-bold ml-0.5 text-honey-400">{inspection.today_remaining?.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 bg-panel-card/40 rounded-xl p-3.5 border border-panel-border/40 flex flex-col min-h-0 overflow-hidden">
                    <div className="text-xs text-panel-muted mb-2.5 flex items-center gap-1.5 flex-shrink-0">
                        <Activity className="w-3 h-3" />
                        各蜂场指标明细
                        <div className="flex-1"></div>
                        <div className="flex items-center gap-4 text-[10px] opacity-75">
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-honey-500"></span>蜂箱</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span>养蜂员</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span>巡检</span>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto timeline-scroll space-y-2 pr-1">
                        {(data.farm_stats || []).map((farm, idx) => {
                            const maxRef = 500;
                            const hbW = Math.min(100, (farm.total_hives / maxRef) * 100);
                            const kpW = Math.min(100, (farm.beekeepers_on_duty / 8) * 100);
                            const inspPct = farm.inspection_pending > 0
                                ? (farm.inspection_completed / farm.inspection_pending) * 100 : 100;
                            return (
                                <div
                                    key={farm.farm_id}
                                    className="rounded-lg bg-panel-bg/60 p-2.5 border border-panel-border/40 hover:border-honey-500/20 transition-colors"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="w-5 h-5 rounded-md bg-gradient-to-br from-honey-500/30 to-ambercomb-700/30 flex items-center justify-center text-[10px] font-mono text-honey-400 border border-honey-500/20 flex-shrink-0">
                                                {idx + 1}
                                            </span>
                                            <span className="text-sm font-medium text-panel-text truncate">{farm.farm_name}</span>
                                            <span className="text-[10px] text-panel-muted px-1.5 py-0.5 rounded bg-panel-card/80 border border-panel-border/50 flex-shrink-0">
                                                {farm.region}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs flex-shrink-0 ml-2">
                                            <span className="text-honey-400 font-mono font-bold">
                                                {farm.total_hives}
                                                <span className="text-panel-muted font-normal ml-0.5">箱</span>
                                            </span>
                                            <span className="text-emerald-400 font-mono font-bold">
                                                {farm.beekeepers_on_duty}/{farm.beekeepers_total}
                                                <span className="text-panel-muted font-normal ml-0.5">人</span>
                                            </span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <div className="flex items-center justify-between text-[10px] text-panel-muted mb-1">
                                                <span>活跃率</span>
                                                <span className="font-mono text-honey-400">
                                                    {farm.total_hives > 0 ? Math.round((farm.active_hives / farm.total_hives) * 100) : 0}%
                                                </span>
                                            </div>
                                            <div className="h-1.5 bg-panel-card rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-honey-500 to-ambercomb-400 rounded-full transition-all duration-700"
                                                    style={{ width: `${hbW}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex items-center justify-between text-[10px] text-panel-muted mb-1">
                                                <span>到岗率</span>
                                                <span className="font-mono text-emerald-400">
                                                    {farm.beekeepers_total > 0 ? Math.round((farm.beekeepers_on_duty / farm.beekeepers_total) * 100) : 0}%
                                                </span>
                                            </div>
                                            <div className="h-1.5 bg-panel-card rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-700"
                                                    style={{ width: `${kpW}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex items-center justify-between text-[10px] text-panel-muted mb-1">
                                                <span>巡检完成</span>
                                                <span className={`font-mono ${
                                                    inspPct >= 60 ? 'text-blue-400' : inspPct >= 30 ? 'text-honey-400' : 'text-red-400'
                                                }`}>
                                                    {Math.round(inspPct)}%
                                                </span>
                                            </div>
                                            <div className="h-1.5 bg-panel-card rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-700 ${
                                                        inspPct >= 60 ? 'bg-gradient-to-r from-blue-500 to-blue-400'
                                                            : inspPct >= 30 ? 'bg-gradient-to-r from-honey-500 to-honey-400'
                                                            : 'bg-gradient-to-r from-red-500 to-red-400'
                                                    }`}
                                                    style={{ width: `${Math.min(100, inspPct)}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default OverviewStatsQuadrant;
