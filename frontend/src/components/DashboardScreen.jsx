import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import {
    Monitor, RefreshCw, Zap, Radio, Maximize2,
    ChevronLeft, ChevronRight, Settings2, CalendarDays,
    MapPin, Play, Pause
} from 'lucide-react';

import GeoColonyQuadrant from './GeoColonyQuadrant';
import HoneyProgressQuadrant from './HoneyProgressQuadrant';
import AlertsQuadrant from './AlertsQuadrant';
import OverviewStatsQuadrant from './OverviewStatsQuadrant';

const API_BASE_URL = 'http://localhost:8000';
const REFRESH_INTERVAL = 5000;

function DashboardScreen() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [now, setNow] = useState(new Date());

    const [farms, setFarms] = useState([]);
    const [farmListLoaded, setFarmListLoaded] = useState(false);

    const params = useMemo(() => new URLSearchParams(window.location.search), []);
    const urlFarmId = params.get('farm');
    const urlCarousel = params.get('carousel') === 'true' || params.get('carousel') === '1';
    const urlInterval = parseInt(params.get('interval') || params.get('rotation') || '30', 10);

    const [selectedFarmId, setSelectedFarmId] = useState(urlFarmId || null);
    const [carouselEnabled, setCarouselEnabled] = useState(urlCarousel && !urlFarmId);
    const [carouselInterval, setCarouselInterval] = useState(Math.max(5, urlInterval));
    const [carouselIndex, setCarouselIndex] = useState(0);
    const [refreshTick, setRefreshTick] = useState(0);

    const [isFullscreen, setIsFullscreen] = useState(false);

    const fetchFarmsList = useCallback(async () => {
        try {
            const resp = await axios.get(`${API_BASE_URL}/api/dashboard/farms`, { timeout: 8000 });
            setFarms(resp.data.farms || []);
            setFarmListLoaded(true);
        } catch (err) {
            console.warn('获取蜂场列表失败:', err.message);
            setFarms([]);
            setFarmListLoaded(true);
        }
    }, []);

    const fetchDashboardData = useCallback(async () => {
        const currentFarmId = carouselEnabled && farms.length > 0
            ? farms[carouselIndex % farms.length]?.id
            : selectedFarmId;

        try {
            setLoading(true);
            const resp = await axios.get(`${API_BASE_URL}/api/dashboard/all`, {
                params: currentFarmId ? { farm_id: currentFarmId } : {},
                timeout: 10000,
            });
            setData(resp.data);
            setError(null);
            setLastUpdate(new Date());
            setRefreshTick(t => t + 1);
        } catch (err) {
            console.error('加载大屏数据失败:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [selectedFarmId, carouselEnabled, farms, carouselIndex]);

    useEffect(() => {
        fetchFarmsList();
    }, [fetchFarmsList]);

    useEffect(() => {
        if (farmListLoaded) {
            fetchDashboardData();
        }
    }, [farmListLoaded, fetchDashboardData]);

    useEffect(() => {
        const timer = setInterval(fetchDashboardData, REFRESH_INTERVAL);
        return () => clearInterval(timer);
    }, [fetchDashboardData]);

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (!carouselEnabled || farms.length <= 1) return;
        const timer = setInterval(() => {
            setCarouselIndex(idx => (idx + 1) % farms.length);
        }, carouselInterval * 1000);
        return () => clearInterval(timer);
    }, [carouselEnabled, farms.length, carouselInterval]);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen?.();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen?.();
            setIsFullscreen(false);
        }
    };

    const currentFarmName = useMemo(() => {
        const fid = carouselEnabled && farms.length > 0
            ? farms[carouselIndex % farms.length]?.id
            : selectedFarmId;
        if (!fid) return '全国蜂场 · 集团全局视图';
        const farm = farms.find(f => f.id === fid);
        return farm ? `${farm.name} · 单蜂场视图` : '全国蜂场 · 集团全局视图';
    }, [selectedFarmId, carouselEnabled, farms, carouselIndex]);

    const progressCountdown = useMemo(() => {
        if (!carouselEnabled || farms.length <= 1) return null;
        return {
            current: carouselIndex + 1,
            total: farms.length,
        };
    }, [carouselEnabled, farms.length, carouselIndex]);

    const formatDateTime = (d) => {
        const pad = n => n.toString().padStart(2, '0');
        return {
            date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
            time: `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`,
            weekday: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()],
        };
    };

    const dt = formatDateTime(now);
    const lut = lastUpdate ? formatDateTime(lastUpdate) : null;

    const handlePrevFarm = () => {
        if (farms.length === 0) return;
        if (carouselEnabled) {
            setCarouselIndex(idx => (idx - 1 + farms.length) % farms.length);
        } else {
            const currentIdx = selectedFarmId
                ? farms.findIndex(f => f.id === selectedFarmId)
                : -1;
            const nextIdx = currentIdx <= 0 ? farms.length - 1 : currentIdx - 1;
            setSelectedFarmId(farms[nextIdx]?.id || null);
        }
    };

    const handleNextFarm = () => {
        if (farms.length === 0) return;
        if (carouselEnabled) {
            setCarouselIndex(idx => (idx + 1) % farms.length);
        } else {
            const currentIdx = selectedFarmId
                ? farms.findIndex(f => f.id === selectedFarmId)
                : -1;
            const nextIdx = (currentIdx + 1) % (farms.length + 1);
            setSelectedFarmId(nextIdx >= farms.length ? null : farms[nextIdx]?.id);
        }
    };

    const handleToggleCarousel = () => {
        setCarouselEnabled(v => !v);
        if (!carouselEnabled) {
            const currentIdx = selectedFarmId
                ? farms.findIndex(f => f.id === selectedFarmId)
                : 0;
            setCarouselIndex(currentIdx < 0 ? 0 : currentIdx);
        }
    };

    return (
        <div
            className="w-full min-h-screen relative overflow-hidden hex-pattern"
            style={{ background: '#1C1712' }}
            key={`tick-${refreshTick}`}
        >
            <div
                className="absolute inset-0 pointer-events-none opacity-60"
                style={{
                    background: `
                        radial-gradient(ellipse 80% 50% at 50% -20%, rgba(251, 191, 36, 0.08) 0%, transparent 70%),
                        radial-gradient(ellipse 60% 40% at 0% 100%, rgba(232, 150, 31, 0.05) 0%, transparent 60%),
                        radial-gradient(ellipse 60% 40% at 100% 100%, rgba(217, 119, 6, 0.05) 0%, transparent 60%)
                    `,
                }}
            ></div>

            <div className="relative z-10 w-full min-h-screen flex flex-col" style={{ aspectRatio: '16/9' }}>
                <header className="flex items-center justify-between px-8 py-4 border-b border-panel-border/60 relative">
                    <div className="absolute left-0 top-0 w-40 h-1 bg-gradient-to-r from-honey-500/80 via-honey-400/40 to-transparent"></div>
                    <div className="absolute right-0 top-0 w-40 h-1 bg-gradient-to-l from-honey-500/80 via-honey-400/40 to-transparent"></div>

                    <div className="flex items-center gap-5 min-w-0">
                        <div className="relative">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-honey-400 via-ambercomb-400 to-honey-600 flex items-center justify-center shadow-lg shadow-honey-500/30 animate-glow">
                                <Monitor className="w-6 h-6 text-panel-bg" strokeWidth={2.5} />
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-panel-bg flex items-center justify-center">
                                <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
                            </div>
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-2xl font-bold gradient-text tracking-wider truncate" style={{ fontSize: 'clamp(18px, 1.4vw, 28px)' }}>
                                蜂场实时监控指挥中心
                            </h1>
                            <div className="flex items-center gap-2 text-xs mt-0.5">
                                <span className="text-panel-muted">{currentFarmName}</span>
                                {progressCountdown && (
                                    <span className="rotating-badge" style={{ animationDuration: `${carouselInterval}s`, padding: '2px 8px' }}>
                                        <Radio className="w-3 h-3 mr-1" />
                                        轮播中 {progressCountdown.current}/{progressCountdown.total} · {carouselInterval}s
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-6 flex-shrink-0">
                        <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-panel-card/60 border border-panel-border/60">
                            <CalendarDays className="w-4 h-4 text-honey-400" />
                            <div className="text-right leading-tight">
                                <div className="text-sm text-panel-text font-mono font-medium">{dt.date}</div>
                                <div className="text-[10px] text-panel-muted">{dt.weekday}</div>
                            </div>
                            <div className="w-px h-8 bg-panel-border/60 mx-1"></div>
                            <div className="text-right leading-tight">
                                <div
                                    className="text-xl font-mono font-bold gradient-text-warm tracking-wider"
                                    style={{ fontSize: 'clamp(16px, 1.1vw, 22px)' }}
                                >
                                    {dt.time}
                                </div>
                                <div className="text-[10px] text-panel-muted">系统时间</div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={handlePrevFarm}
                                disabled={farms.length === 0}
                                className="w-9 h-9 rounded-lg bg-panel-card/60 border border-panel-border/60 flex items-center justify-center text-panel-muted hover:text-honey-400 hover:border-honey-500/40 transition-all disabled:opacity-40"
                                title="上一蜂场"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                onClick={handleToggleCarousel}
                                className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-all ${
                                    carouselEnabled
                                        ? 'bg-honey-500/20 border-honey-500/50 text-honey-400'
                                        : 'bg-panel-card/60 border-panel-border/60 text-panel-muted hover:text-honey-400 hover:border-honey-500/40'
                                }`}
                                title={carouselEnabled ? '暂停轮播' : '开启轮播'}
                            >
                                {carouselEnabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            </button>
                            <button
                                onClick={handleNextFarm}
                                disabled={farms.length === 0}
                                className="w-9 h-9 rounded-lg bg-panel-card/60 border border-panel-border/60 flex items-center justify-center text-panel-muted hover:text-honey-400 hover:border-honey-500/40 transition-all disabled:opacity-40"
                                title="下一蜂场"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                            <div className="w-px h-6 bg-panel-border/40 mx-1"></div>
                            <button
                                onClick={fetchDashboardData}
                                className="w-9 h-9 rounded-lg bg-panel-card/60 border border-panel-border/60 flex items-center justify-center text-panel-muted hover:text-honey-400 hover:border-honey-500/40 transition-all"
                                title="立即刷新"
                            >
                                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                            <button
                                onClick={toggleFullscreen}
                                className="w-9 h-9 rounded-lg bg-panel-card/60 border border-panel-border/60 flex items-center justify-center text-panel-muted hover:text-honey-400 hover:border-honey-500/40 transition-all"
                                title="全屏"
                            >
                                <Maximize2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </header>

                <div className="flex items-center justify-between px-8 py-2 text-[10px] border-b border-panel-border/30 bg-panel-card/20">
                    <div className="flex items-center gap-5 text-panel-muted">
                        <div className="flex items-center gap-1.5">
                            <Zap className="w-3 h-3 text-honey-400" />
                            <span>数据刷新间隔：<span className="text-honey-400 font-mono">5s</span></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Radio className={`w-3 h-3 text-emerald-400 ${loading ? 'animate-pulse' : ''}`} />
                            <span>服务端缓存 TTL：<span className="text-emerald-400 font-mono">{data?.cache_ttl_seconds || 5}s</span></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Settings2 className="w-3 h-3 text-blue-400" />
                            <span>
                                Prometheus 代理：
                                <code className="ml-1 px-1.5 py-0.5 rounded bg-panel-card/80 text-blue-400">/api/prometheus/*</code>
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 text-panel-muted">
                        {lut ? (
                            <div className="flex items-center gap-1.5">
                                <span>最近更新：</span>
                                <span className="text-honey-400 font-mono">{lut.time}</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5 animate-pulse">
                                <span>正在连接数据源...</span>
                            </div>
                        )}
                        {error && (
                            <div className="text-red-400 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                                <span>连接异常: {error}</span>
                            </div>
                        )}
                    </div>
                </div>

                <main className="flex-1 p-6 grid grid-cols-2 grid-rows-2 gap-6 min-h-0" style={{ minHeight: 0 }}>
                    <div className="min-h-0 min-w-0 overflow-hidden">
                        <GeoColonyQuadrant data={data?.geo_colony} />
                    </div>
                    <div className="min-h-0 min-w-0 overflow-hidden">
                        <HoneyProgressQuadrant data={data?.honey_progress} />
                    </div>
                    <div className="min-h-0 min-w-0 overflow-hidden">
                        <AlertsQuadrant data={data?.alerts} />
                    </div>
                    <div className="flex min-h-0 min-w-0 overflow-hidden">
                        <OverviewStatsQuadrant data={data?.overview_stats} />
                    </div>
                </main>

                <footer className="px-8 py-2 border-t border-panel-border/30 flex items-center justify-between text-[10px] text-panel-muted/80 bg-panel-card/30">
                    <div className="flex items-center gap-4">
                        <span>© 蜂场智能运营平台 · BeeField Intelligent Ops</span>
                        <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            支持 <code className="px-1 rounded bg-panel-bg/60 text-honey-400/90">?farm=farm_001</code> 单蜂场，
                            <code className="px-1 rounded bg-panel-bg/60 text-honey-400/90 ml-1">?carousel=true&interval=30</code> 轮播
                        </span>
                    </div>
                    <div className="flex items-center gap-4">
                        <span>分辨率基准：<span className="text-honey-400/90 font-mono">1920 × 1080 · 16:9</span></span>
                        <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            System Online
                        </span>
                    </div>
                </footer>
            </div>

            {loading && !data && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-panel-bg/90 backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-4">
                        <div className="relative w-16 h-16">
                            <div className="absolute inset-0 rounded-full border-4 border-panel-border/60"></div>
                            <div className="absolute inset-0 rounded-full border-4 border-t-honey-500 border-r-honey-400 border-b-transparent border-l-transparent animate-spin"></div>
                            <Monitor className="absolute inset-0 m-auto w-7 h-7 text-honey-400" />
                        </div>
                        <div className="text-sm text-panel-muted">正在加载大屏数据...</div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default DashboardScreen;
