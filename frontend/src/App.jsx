import { useState, useEffect, useMemo } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import axios from 'axios'
import {
    Activity, BarChart3, Clock, AlertCircle, Plus, Database,
    Terminal, Server, Layout, Monitor, ChevronRight, Droplets,
    CloudSun, Crown, Globe, Languages, Bug, Package
} from 'lucide-react'
import { toast } from 'react-toastify'

import DashboardScreen from './components/DashboardScreen'
import FeedingScreen from './components/FeedingScreen'
import WeatherScreen from './components/WeatherScreen'
import TracePage from './components/trace/TracePage'
import BackupScreen from './components/BackupScreen'
import QueenBeePage from './components/QueenBeePage'
import LanguageResourcePage from './components/LanguageResourcePage'
import PestDiseasePage from './components/PestDiseasePage'
import HoneyInventoryPage from './components/HoneyInventoryPage'
import { useI18n } from './contexts/I18nContext'

const API_BASE_URL = 'http://localhost:8000';

function ConsoleApp() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [newItem, setNewItem] = useState({ name: '', description: '' });
    const [lastResponse, setLastResponse] = useState(null);

    const params = useMemo(() => new URLSearchParams(window.location.search), []);
    const openDashboard = () => {
        const url = new URL(window.location.href);
        url.searchParams.set('screen', 'dashboard');
        window.open(url.toString(), '_blank');
    };

    const fetchItems = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/items`);
            setItems(response.data);
        } catch (error) {
            toast.error('获取列表失败');
        }
    };

    useEffect(() => {
        fetchItems();
    }, []);

    const handleApiCall = async (type) => {
        setLoading(true);
        try {
            let response;
            const startTime = performance.now();

            switch (type) {
                case 'success':
                    response = await axios.get(`${API_BASE_URL}/api/success`);
                    toast.success('请求成功');
                    break;
                case 'slow':
                    response = await axios.get(`${API_BASE_URL}/api/slow`);
                    toast.info('慢请求完成');
                    break;
                case 'error':
                    response = await axios.get(`${API_BASE_URL}/api/error`);
                    break;
                default:
                    break;
            }

            const endTime = performance.now();
            setLastResponse({
                type,
                status: response.status,
                latency: (endTime - startTime).toFixed(0),
                data: response.data
            });
        } catch (error) {
            const endTime = performance.now();
            toast.error('请求失败');
            setLastResponse({
                type,
                status: error.response?.status || 500,
                latency: (endTime - startTime).toFixed(0),
                data: error.response?.data || 'Unknown error'
            });
        } finally {
            setLoading(false);
        }
    };

    const addItem = async (e) => {
        e.preventDefault();
        if (!newItem.name || !newItem.description) {
            toast.warning('请填写完整信息');
            return;
        }

        try {
            await axios.post(`${API_BASE_URL}/api/items?name=${newItem.name}&description=${newItem.description}`);
            toast.success('添加成功');
            setNewItem({ name: '', description: '' });
            fetchItems();
        } catch (error) {
            toast.error('添加失败');
        }
    };

    return (
        <div className="min-h-screen p-6 md:p-12 text-slate-100">
            <div className="max-w-6xl mx-auto space-y-8">

                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-700 pb-8">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20">
                            <Activity className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Prometheus 监控实战</h1>
                            <p className="text-slate-400">React + FastAPI + Prometheus + Grafana 示例工程</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <span className="px-3 py-1 bg-slate-800 rounded-full text-xs font-mono text-blue-400 border border-slate-700 flex items-center gap-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            Backend Online
                        </span>
                        <button
                            onClick={openDashboard}
                            className="px-4 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition-all"
                        >
                            <Monitor className="w-3.5 h-3.5" />
                            打开大屏监控
                            <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="rounded-3xl p-6 bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent border border-amber-500/20">
                        <div className="flex items-start gap-4">
                            <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex-shrink-0">
                                <Monitor className="w-6 h-6 text-amber-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-semibold text-amber-200 mb-1">蜂场实时监控大屏 · 已上线</h3>
                                <p className="text-sm text-amber-200/70 leading-relaxed mb-3">
                                    面向中大型蜂场办公室电视墙展示场景。四象限布局：地理分布与群势、采蜜进度、异常告警时间轴、核心运营指标。
                                    每 5 秒自动刷新，服务端 5 秒级缓存，支持单蜂场视角与多蜂场轮播。
                                </p>
                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        onClick={() => {
                                            const url = new URL(window.location.href);
                                            url.searchParams.set('screen', 'dashboard');
                                            window.open(url.toString(), '_blank');
                                        }}
                                        className="px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-medium hover:bg-amber-500/30 transition-all flex items-center gap-1.5"
                                    >
                                        <Monitor className="w-3.5 h-3.5" />
                                        打开大屏
                                    </button>
                                    <code className="px-2 py-1 rounded-md bg-slate-900/60 text-amber-300/90 text-xs border border-amber-500/20 font-mono">
                                        ?screen=dashboard
                                    </code>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-3xl p-6 bg-gradient-to-r from-emerald-500/10 via-teal-400/5 to-transparent border border-emerald-500/20">
                        <div className="flex items-start gap-4">
                            <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex-shrink-0">
                                <Droplets className="w-6 h-6 text-emerald-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-semibold text-emerald-200 mb-1">蜂群饲喂台账 · 已上线</h3>
                                <p className="text-sm text-emerald-200/70 leading-relaxed mb-3">
                                    覆盖春繁、秋繁、越冬期蜂群的人工饲喂全过程。包含物资库存看板、饲喂记录、批量登记、配比推荐智能工具。
                                    库存低于安全线自动推送站内消息预警。
                                </p>
                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        onClick={() => {
                                            const url = new URL(window.location.href);
                                            url.searchParams.set('screen', 'feeding');
                                            window.open(url.toString(), '_blank');
                                        }}
                                        className="px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-medium hover:bg-emerald-500/30 transition-all flex items-center gap-1.5"
                                    >
                                        <Droplets className="w-3.5 h-3.5" />
                                        进入饲喂台账
                                    </button>
                                    <code className="px-2 py-1 rounded-md bg-slate-900/60 text-emerald-300/90 text-xs border border-emerald-500/20 font-mono">
                                        ?screen=feeding
                                    </code>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-3xl p-6 bg-gradient-to-r from-sky-500/10 via-blue-400/5 to-transparent border border-sky-500/20">
                        <div className="flex items-start gap-4">
                            <div className="p-3 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex-shrink-0">
                                <CloudSun className="w-6 h-6 text-sky-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-semibold text-sky-200 mb-1">蜂场气象联动与极端天气预警 · 已上线</h3>
                                <p className="text-sm text-sky-200/70 leading-relaxed mb-3">
                                    对接外部气象服务，按蜂场经纬度每小时拉取未来7天逐时预报。智能识别持续高温、连阴雨、寒潮、大风四类极端天气，
                                    自动生成预警与针对性处置建议（遮阴、补饲、保温、关巢门等）。
                                </p>
                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        onClick={() => {
                                            const url = new URL(window.location.href);
                                            url.searchParams.set('screen', 'weather');
                                            window.open(url.toString(), '_blank');
                                        }}
                                        className="px-3 py-1.5 rounded-lg bg-sky-500/20 border border-sky-500/40 text-sky-300 text-xs font-medium hover:bg-sky-500/30 transition-all flex items-center gap-1.5"
                                    >
                                        <CloudSun className="w-3.5 h-3.5" />
                                        进入气象预警
                                    </button>
                                    <code className="px-2 py-1 rounded-md bg-slate-900/60 text-sky-300/90 text-xs border border-sky-500/20 font-mono">
                                        ?screen=weather
                                    </code>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-3xl p-6 bg-gradient-to-r from-violet-500/10 via-purple-400/5 to-transparent border border-violet-500/20">
                        <div className="flex items-start gap-4">
                            <div className="p-3 rounded-2xl bg-violet-500/15 border border-violet-500/30 flex-shrink-0">
                                <Crown className="w-6 h-6 text-violet-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-semibold text-violet-200 mb-1">女王蜂血统家谱树 · 已上线</h3>
                                <p className="text-sm text-violet-200/70 leading-relaxed mb-3">
                                    记录优质女王蜂的血统传承与产卵质量演变。支持多代家谱向上追溯、蜂种过滤与编号搜索，
                                    内置循环引用检测与父代蜂种合法性校验。
                                </p>
                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        onClick={() => {
                                            const url = new URL(window.location.href);
                                            url.searchParams.set('screen', 'queen-bee');
                                            window.open(url.toString(), '_blank');
                                        }}
                                        className="px-3 py-1.5 rounded-lg bg-violet-500/20 border border-violet-500/40 text-violet-300 text-xs font-medium hover:bg-violet-500/30 transition-all flex items-center gap-1.5"
                                    >
                                        <Crown className="w-3.5 h-3.5" />
                                        查看家谱
                                    </button>
                                    <code className="px-2 py-1 rounded-md bg-slate-900/60 text-violet-300/90 text-xs border border-violet-500/20 font-mono">
                                        ?screen=queen-bee
                                    </code>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-3xl p-6 bg-gradient-to-r from-amber-500/10 via-yellow-400/5 to-transparent border border-amber-500/20">
                        <div className="flex items-start gap-4">
                            <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex-shrink-0">
                                <Languages className="w-6 h-6 text-amber-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-semibold text-amber-200 mb-1">蜂业术语多语言资源管理 · 已上线</h3>
                                <p className="text-sm text-amber-200/70 leading-relaxed mb-3">
                                    面向蜂业方言差异提供前端文案在线运维。支持按命名空间过滤、按 key 搜索，
                                    双栏编辑附蜂业术语词典提示，保存后实时热更新至所有在线用户。
                                </p>
                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        onClick={() => {
                                            const url = new URL(window.location.href);
                                            url.searchParams.set('screen', 'language-resource');
                                            window.open(url.toString(), '_blank');
                                        }}
                                        className="px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-medium hover:bg-amber-500/30 transition-all flex items-center gap-1.5"
                                    >
                                        <Globe className="w-3.5 h-3.5" />
                                        进入管理
                                    </button>
                                    <code className="px-2 py-1 rounded-md bg-slate-900/60 text-amber-300/90 text-xs border border-amber-500/20 font-mono">
                                        ?screen=language-resource
                                    </code>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-3xl p-6 bg-gradient-to-r from-rose-500/10 via-red-400/5 to-transparent border border-rose-500/20">
                        <div className="flex items-start gap-4">
                            <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex-shrink-0">
                                <Bug className="w-6 h-6 text-rose-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-semibold text-rose-200 mb-1">病虫害知识库与诊断助手 · 已上线</h3>
                                <p className="text-sm text-rose-200/70 leading-relaxed mb-3">
                                    沉淀蜂场病虫害经验，涵盖病害、虫害、中毒三大分类。提供症状标签智能诊断，输入观察症状即可获取可能病害排行与防治方案。
                                </p>
                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        onClick={() => {
                                            const url = new URL(window.location.href);
                                            url.searchParams.set('screen', 'pest-disease');
                                            window.open(url.toString(), '_blank');
                                        }}
                                        className="px-3 py-1.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-medium hover:bg-rose-500/30 transition-all flex items-center gap-1.5"
                                    >
                                        <Bug className="w-3.5 h-3.5" />
                                        进入知识库
                                    </button>
                                    <code className="px-2 py-1 rounded-md bg-slate-900/60 text-rose-300/90 text-xs border border-rose-500/20 font-mono">
                                        ?screen=pest-disease
                                    </code>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-3xl p-6 bg-gradient-to-r from-amber-500/10 via-orange-400/5 to-transparent border border-amber-500/20">
                        <div className="flex items-start gap-4">
                            <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex-shrink-0">
                                <Package className="w-6 h-6 text-amber-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-semibold text-amber-200 mb-1">蜂蜜成品库存 · 已上线</h3>
                                <p className="text-sm text-amber-200/70 leading-relaxed mb-3">
                                    覆盖蜂蜜从蜂场到仓库、灌装、出货的全流程库存追踪。按批次+仓库维度展示库存，支持出入库、调拨、盘点流水记录，低库存预警与近期采蜜标识。
                                </p>
                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        onClick={() => {
                                            const url = new URL(window.location.href);
                                            url.searchParams.set('screen', 'honey-inventory');
                                            window.open(url.toString(), '_blank');
                                        }}
                                        className="px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-medium hover:bg-amber-500/30 transition-all flex items-center gap-1.5"
                                    >
                                        <Package className="w-3.5 h-3.5" />
                                        进入库存
                                    </button>
                                    <code className="px-2 py-1 rounded-md bg-slate-900/60 text-amber-300/90 text-xs border border-amber-500/20 font-mono">
                                        ?screen=honey-inventory
                                    </code>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <section className="md:col-span-2 glass-card rounded-3xl p-6 space-y-6">
                        <div className="flex items-center gap-2 mb-2">
                            <BarChart3 className="w-5 h-5 text-blue-400" />
                            <h2 className="text-xl font-semibold">请求模拟器 (Trigger Metrics)</h2>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <button
                                onClick={() => handleApiCall('success')}
                                disabled={loading}
                                className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl bg-slate-800/50 hover:bg-green-500/10 border border-slate-700 hover:border-green-500/30 transition-all group"
                            >
                                <div className="p-2 bg-green-500/20 rounded-lg group-hover:scale-110 transition-transform">
                                    <Activity className="w-6 h-6 text-green-400" />
                                </div>
                                <span className="font-medium text-green-400">成功请求</span>
                                <span className="text-xs text-slate-500">HTTP 200</span>
                            </button>

                            <button
                                onClick={() => handleApiCall('slow')}
                                disabled={loading}
                                className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl bg-slate-800/50 hover:bg-yellow-500/10 border border-slate-700 hover:border-yellow-500/30 transition-all group"
                            >
                                <div className="p-2 bg-yellow-500/20 rounded-lg group-hover:scale-110 transition-transform">
                                    <Clock className="w-6 h-6 text-yellow-400" />
                                </div>
                                <span className="font-medium text-yellow-400">延迟请求</span>
                                <span className="text-xs text-slate-500">Delay 1-2s</span>
                            </button>

                            <button
                                onClick={() => handleApiCall('error')}
                                disabled={loading}
                                className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl bg-slate-800/50 hover:bg-red-500/10 border border-slate-700 hover:border-red-500/30 transition-all group"
                            >
                                <div className="p-2 bg-red-500/20 rounded-lg group-hover:scale-110 transition-transform">
                                    <AlertCircle className="w-6 h-6 text-red-400" />
                                </div>
                                <span className="font-medium text-red-400">错误请求</span>
                                <span className="text-xs text-slate-500">HTTP 500</span>
                            </button>
                        </div>

                        <div className="rounded-2xl bg-slate-900/50 border border-slate-800 p-4 font-mono text-sm">
                            <div className="flex items-center gap-2 mb-2 text-slate-500">
                                <Terminal className="w-4 h-4" />
                                <span>Last Response</span>
                            </div>
                            {lastResponse ? (
                                <div className="space-y-1">
                                    <p><span className="text-blue-400">Status:</span> {lastResponse.status}</p>
                                    <p><span className="text-blue-400">Latency:</span> {lastResponse.latency}ms</p>
                                    <pre className="text-slate-400 overflow-x-auto text-xs mt-2">
                                        {JSON.stringify(lastResponse.data, null, 2)}
                                    </pre>
                                </div>
                            ) : (
                                <p className="text-slate-600 italic">等待操作...</p>
                            )}
                        </div>
                    </section>

                    <section className="glass-card rounded-3xl p-6 flex flex-col justify-between space-y-4">
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <Server className="w-5 h-5 text-purple-400" />
                                <h2 className="text-xl font-semibold">指标说明</h2>
                            </div>
                            <ul className="space-y-4 text-sm text-slate-400">
                                <li className="flex gap-3">
                                    <div className="mt-1 w-1.5 h-1.5 bg-blue-500 rounded-full shrink-0"></div>
                                    <div>
                                        <strong className="text-slate-200 block mb-1">QPS (Queries Per Second)</strong>
                                        统计每秒请求数。Prometheus 通过 counter 指标 `http_requests_total` 计算获得。
                                    </div>
                                </li>
                                <li className="flex gap-3">
                                    <div className="mt-1 w-1.5 h-1.5 bg-yellow-500 rounded-full shrink-0"></div>
                                    <div>
                                        <strong className="text-slate-200 block mb-1">P99 Latency (耗时)</strong>
                                        表示 99% 的请求都在此耗时内。通过 histogram 指标 `http_request_duration_seconds_bucket` 计算。
                                    </div>
                                </li>
                                <li className="flex gap-3">
                                    <div className="mt-1 w-1.5 h-1.5 bg-red-500 rounded-full shrink-0"></div>
                                    <div>
                                        <strong className="text-slate-200 block mb-1">Error Rate (错误率)</strong>
                                        统计非 2xx/3xx 响应的占比。
                                    </div>
                                </li>
                            </ul>
                        </div>
                        <a
                            href="http://localhost:9090"
                            target="_blank"
                            rel="noreferrer"
                            className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-center font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            <Layout className="w-4 h-4" />
                            查看 Prometheus 面板
                        </a>
                    </section>

                    <section className="md:col-span-3 glass-card rounded-3xl p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <Database className="w-5 h-5 text-emerald-400" />
                                <h2 className="text-xl font-semibold">数据库读写测试</h2>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-1 space-y-4">
                                <form onSubmit={addItem} className="space-y-4">
                                    <input
                                        type="text"
                                        placeholder="名称"
                                        value={newItem.name}
                                        onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 focus:border-blue-500 outline-none transition-all"
                                    />
                                    <textarea
                                        placeholder="描述"
                                        value={newItem.description}
                                        onChange={e => setNewItem({ ...newItem, description: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 focus:border-blue-500 outline-none transition-all h-24"
                                    />
                                    <button className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors">
                                        <Plus className="w-4 h-4" />
                                        添加记录
                                    </button>
                                </form>
                            </div>

                            <div className="lg:col-span-2 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-800/50 text-slate-400 text-sm">
                                            <th className="px-6 py-4 font-medium">ID</th>
                                            <th className="px-6 py-4 font-medium">名称</th>
                                            <th className="px-6 py-4 font-medium">描述</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800">
                                        {items.length > 0 ? items.map(item => (
                                            <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                                                <td className="px-6 py-4 text-slate-500">{item.id}</td>
                                                <td className="px-6 py-4 font-medium">{item.name}</td>
                                                <td className="px-6 py-4 text-slate-400">{item.description}</td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan="3" className="px-6 py-12 text-center text-slate-600 italic">暂无数据</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </section>
                </div>

                <footer className="text-center text-slate-500 text-sm py-8 border-t border-slate-800">
                    <p>© 2024 Prometheus Monitoring Fullstack Demo. Powered by FastAPI & React.</p>
                </footer>
            </div>
        </div>
    )
}

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/trace/:batchNo" element={<TracePage />} />
                <Route path="*" element={<ScreenRouter />} />
            </Routes>
        </BrowserRouter>
    )
}

function ScreenRouter() {
    const params = useMemo(() => new URLSearchParams(window.location.search), []);
    const screen = params.get('screen');

    if (screen === 'dashboard') {
        return <DashboardScreen />;
    }

    if (screen === 'feeding') {
        return <FeedingScreen />;
    }

    if (screen === 'weather') {
        return <WeatherScreen />;
    }

    if (screen === 'backup') {
        return <BackupScreen />;
    }

    if (screen === 'queen-bee') {
        return <QueenBeePage />;
    }

    if (screen === 'language-resource') {
        return <LanguageResourcePage />;
    }

    if (screen === 'pest-disease') {
        return <PestDiseasePage />;
    }

    if (screen === 'honey-inventory') {
        return <HoneyInventoryPage />;
    }

    return <ConsoleApp />;
}

export default App
