import { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import { Search, Filter, Globe, Edit, ChevronLeft, ChevronRight, BookOpen, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import { toast } from 'react-toastify'
import { useI18n } from '../contexts/I18nContext'

const API_BASE_URL = 'http://localhost:8000'

export default function LanguageResourcePage() {
    const { wsConnected, languages, namespaces, API_BASE_URL: ctxApiBase, isAdmin, currentUser, getAxiosConfig, setUserRole, loadUserInfo } = useI18n()
    const [translationData, setTranslationData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [checkingPermission, setCheckingPermission] = useState(true)
    const [selectedNamespace, setSelectedNamespace] = useState('')
    const [searchKey, setSearchKey] = useState('')
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(50)
    const [showEditor, setShowEditor] = useState(false)
    const [editingRow, setEditingRow] = useState(null)
    const [editingLanguage, setEditingLanguage] = useState('zh-CN')
    const [showRoleDebug, setShowRoleDebug] = useState(false)

    useEffect(() => {
        const checkPermission = async () => {
            try {
                setCheckingPermission(true)
                await loadUserInfo()
            } finally {
                setCheckingPermission(false)
            }
        }
        checkPermission()
    }, [loadUserInfo])

    const fetchTranslations = async () => {
        if (!isAdmin) return
        try {
            setLoading(true)
            const params = {
                page,
                page_size: pageSize,
            }
            if (selectedNamespace) params.namespace = selectedNamespace
            if (searchKey) params.key_search = searchKey

            const response = await axios.get(`${ctxApiBase || API_BASE_URL}/api/i18n/translations`, {
                params,
                ...getAxiosConfig(),
            })
            setTranslationData(response.data)
        } catch (error) {
            console.error('Failed to fetch translations:', error)
            if (error.response?.status === 403) {
                toast.error('无权限访问翻译管理功能')
            } else {
                toast.error('获取翻译数据失败')
            }
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (isAdmin) {
            fetchTranslations()
        }
    }, [page, pageSize, selectedNamespace, searchKey, isAdmin])

    const handleRowClick = (row, lang) => {
        setEditingRow(row)
        setEditingLanguage(lang)
        setShowEditor(true)
    }

    const handleEditorClose = () => {
        setShowEditor(false)
        setEditingRow(null)
        fetchTranslations()
    }

    const totalPages = useMemo(() => {
        if (!translationData) return 1
        return Math.ceil(translationData.total / pageSize)
    }, [translationData, pageSize])

    const getLanguageName = (code) => {
        const lang = languages.find(l => l.code === code)
        return lang ? lang.name : code
    }

    if (checkingPermission) {
        return (
            <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
                <div className="text-center p-8">
                    <div className="animate-spin w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-slate-400">权限校验中...</p>
                </div>
            </div>
        )
    }

    if (!isAdmin) {
        return (
            <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
                <div className="text-center p-8 max-w-md">
                    <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center">
                        <span className="text-5xl">🔒</span>
                    </div>
                    <h1 className="text-2xl font-bold mb-3 text-red-400">无访问权限</h1>
                    <p className="text-slate-400 mb-6">该页面仅管理员可见</p>

                    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 mb-6 text-left">
                        <h3 className="text-sm font-medium text-slate-300 mb-2">当前用户信息</h3>
                        <div className="space-y-1 text-sm">
                            <p className="text-slate-400">
                                用户角色: <span className="text-slate-200 font-mono">{currentUser?.role || 'guest'}</span>
                            </p>
                            <p className="text-slate-400">
                                用户名称: <span className="text-slate-200">{currentUser?.name || '访客'}</span>
                            </p>
                            <p className="text-slate-400">
                                管理员权限: <span className={isAdmin ? 'text-green-400' : 'text-red-400'}>{isAdmin ? '✓ 已授予' : '✗ 未授予'}</span>
                            </p>
                        </div>
                    </div>

                    <div className="text-xs text-slate-500">
                        <p>如需访问请联系系统管理员分配权限</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 p-6">
            <div className="max-w-7xl mx-auto">
                <header className="mb-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl shadow-lg">
                                <Globe className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight">语言资源管理</h1>
                                <p className="text-slate-400 text-sm mt-1">管理蜂业术语多语言翻译，支持热更新</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${wsConnected ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                                {wsConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                                {wsConnected ? '实时连接' : '断开连接'}
                            </div>
                            <button
                                onClick={fetchTranslations}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors border border-slate-700"
                            >
                                <RefreshCw className="w-4 h-4" />
                                刷新
                            </button>
                        </div>
                    </div>
                </header>

                <div className="bg-slate-800/50 rounded-2xl p-6 mb-6 border border-slate-700">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Filter className="w-5 h-5 text-slate-400" />
                            <select
                                value={selectedNamespace}
                                onChange={(e) => { setSelectedNamespace(e.target.value); setPage(1) }}
                                className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 focus:border-amber-500 outline-none transition-colors min-w-[180px]"
                            >
                                <option value="">全部命名空间</option>
                                {namespaces.map(ns => (
                                    <option key={ns} value={ns}>{ns}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex-1 max-w-md relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="搜索 key..."
                                value={searchKey}
                                onChange={(e) => { setSearchKey(e.target.value); setPage(1) }}
                                className="w-full pl-12 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:border-amber-500 outline-none transition-colors"
                            />
                        </div>

                        <div className="text-sm text-slate-400">
                            {translationData && `共 ${translationData.total} 条记录`}
                        </div>
                    </div>
                </div>

                <div className="bg-slate-800/50 rounded-2xl border border-slate-700 overflow-hidden">
                    {loading ? (
                        <div className="p-12 text-center">
                            <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                            <p className="text-slate-400">加载中...</p>
                        </div>
                    ) : translationData && translationData.rows.length > 0 ? (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-800 text-slate-400 text-sm sticky top-0">
                                            <th className="px-6 py-4 font-medium">Key</th>
                                            <th className="px-6 py-4 font-medium">命名空间</th>
                                            {translationData.languages.map(lang => (
                                                <th key={lang} className="px-6 py-4 font-medium whitespace-nowrap">
                                                    {getLanguageName(lang)}
                                                </th>
                                            ))}
                                            <th className="px-6 py-4 font-medium text-center">操作</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-700">
                                        {translationData.rows.map((row, idx) => (
                                            <tr key={`${row.namespace}-${row.key}-${idx}`} className="hover:bg-slate-700/30 transition-colors">
                                                <td className="px-6 py-4 font-mono text-sm text-amber-300">{row.key}</td>
                                                <td className="px-6 py-4">
                                                    <span className="px-2 py-1 bg-slate-700 rounded text-xs text-slate-300">{row.namespace}</span>
                                                </td>
                                                {translationData.languages.map(lang => (
                                                    <td key={lang} className="px-6 py-4 text-sm">
                                                        <div className="max-w-xs truncate text-slate-300" title={row.translations[lang] || ''}>
                                                            {row.translations[lang] || (
                                                                <span className="text-slate-600 italic">未翻译</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                ))}
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center justify-center gap-2">
                                                        {translationData.languages.map(lang => (
                                                            <button
                                                                key={lang}
                                                                onClick={() => handleRowClick(row, lang)}
                                                                className="p-1.5 hover:bg-amber-500/20 rounded-lg text-amber-400 hover:text-amber-300 transition-colors"
                                                                title={`编辑 ${getLanguageName(lang)} 翻译`}
                                                            >
                                                                <Edit className="w-4 h-4" />
                                                            </button>
                                                        ))}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="px-6 py-4 border-t border-slate-700 flex items-center justify-between">
                                <div className="flex items-center gap-4 text-sm text-slate-400">
                                    <span>第 {page} / {totalPages} 页</span>
                                    <select
                                        value={pageSize}
                                        onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }}
                                        className="px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-slate-300"
                                    >
                                        <option value={20}>20条/页</option>
                                        <option value={50}>50条/页</option>
                                        <option value={100}>100条/页</option>
                                        <option value={200}>200条/页</option>
                                    </select>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="p-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages}
                                        className="p-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="p-12 text-center">
                            <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                            <p className="text-slate-400">暂无翻译数据</p>
                        </div>
                    )}
                </div>
            </div>

            {showEditor && editingRow && (
                <TranslationEditor
                    row={editingRow}
                    language={editingLanguage}
                    languages={translationData?.languages || []}
                    onClose={handleEditorClose}
                />
            )}
        </div>
    )
}

function TranslationEditor({ row, language, languages, onClose }) {
    const { API_BASE_URL: ctxApiBase, getAxiosConfig, currentUser } = useI18n()
    const [translation, setTranslation] = useState(row.translations[language] || '')
    const [referenceLang, setReferenceLang] = useState(language === 'zh-CN' ? 'en-US' : 'zh-CN')
    const [saving, setSaving] = useState(false)
    const [terms, setTerms] = useState([])
    const [termSearch, setTermSearch] = useState('')
    const [termCategories, setTermCategories] = useState([])
    const [selectedCategory, setSelectedCategory] = useState('')

    useEffect(() => {
        const fetchTerms = async () => {
            try {
                const params = {}
                if (termSearch) params.search_term = termSearch
                if (selectedCategory) params.category = selectedCategory
                const response = await axios.get(`${ctxApiBase || API_BASE_URL}/api/i18n/terms`, { params })
                setTerms(response.data.terms || [])
            } catch (error) {
                console.error('Failed to fetch terms:', error)
            }
        }

        const fetchCategories = async () => {
            try {
                const response = await axios.get(`${ctxApiBase || API_BASE_URL}/api/i18n/terms/categories`)
                setTermCategories(response.data.categories || [])
            } catch (error) {
                console.error('Failed to fetch categories:', error)
            }
        }

        fetchTerms()
        fetchCategories()
    }, [termSearch, selectedCategory])

    useEffect(() => {
        setTranslation(row.translations[language] || '')
    }, [row, language])

    const handleSave = async () => {
        try {
            setSaving(true)
            await axios.put(
                `${ctxApiBase || API_BASE_URL}/api/i18n/resource?language=${language}&namespace=${row.namespace}&key=${row.key}`,
                { value: translation, updated_by: currentUser?.username || 'admin' },
                getAxiosConfig()
            )
            toast.success('翻译已保存并推送至所有在线用户')
            onClose()
        } catch (error) {
            console.error('Failed to save translation:', error)
            if (error.response?.status === 403) {
                toast.error('无权限执行此操作')
            } else {
                toast.error('保存失败')
            }
        } finally {
            setSaving(false)
        }
    }

    const getLanguageName = (code) => {
        const langNames = { 'zh-CN': '简体中文', 'en-US': 'English', 'zh-TW': '繁體中文', 'ja-JP': '日本語', 'ko-KR': '한국어' }
        return langNames[code] || code
    }

    const insertTerm = (term) => {
        setTranslation(prev => prev + term.term)
    }

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden border border-slate-700 flex flex-col">
                <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold">编辑翻译</h2>
                        <div className="flex items-center gap-3 mt-1 text-sm text-slate-400">
                            <span className="font-mono text-amber-300">{row.key}</span>
                            <span className="text-slate-600">|</span>
                            <span className="px-2 py-0.5 bg-slate-700 rounded text-xs">{row.namespace}</span>
                            <span className="text-slate-600">|</span>
                            <span>{getLanguageName(language)}</span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white transition-colors"
                    >
                        ✕
                    </button>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    <div className="flex-1 p-6 overflow-y-auto">
                        <div className="grid grid-cols-2 gap-6 h-full">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                        参考原文 ({getLanguageName(referenceLang)})
                                    </label>
                                    <select
                                        value={referenceLang}
                                        onChange={(e) => setReferenceLang(e.target.value)}
                                        className="px-3 py-1 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-300 focus:border-amber-500 outline-none"
                                    >
                                        {languages.filter(l => l !== language).map(lang => (
                                            <option key={lang} value={lang}>{getLanguageName(lang)}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="h-full bg-slate-900 rounded-xl p-4 border border-slate-700">
                                    <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">
                                        {row.translations[referenceLang] || (
                                            <span className="text-slate-600 italic">暂无原文</span>
                                        )}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                                    <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                                    译文 ({getLanguageName(language)})
                                </label>
                                <textarea
                                    value={translation}
                                    onChange={(e) => setTranslation(e.target.value)}
                                    placeholder="请输入译文..."
                                    className="w-full h-full bg-slate-900 rounded-xl p-4 border border-slate-700 text-slate-100 placeholder-slate-600 focus:border-amber-500 outline-none resize-none transition-colors"
                                    autoFocus
                                />
                            </div>
                        </div>
                    </div>

                    <div className="w-80 border-l border-slate-700 flex flex-col bg-slate-900/50">
                        <div className="px-4 py-3 border-b border-slate-700">
                            <h3 className="font-medium text-amber-300 flex items-center gap-2">
                                <BookOpen className="w-4 h-4" />
                                蜂业术语词典
                            </h3>
                        </div>

                        <div className="p-3 border-b border-slate-700 space-y-2">
                            <input
                                type="text"
                                placeholder="搜索术语..."
                                value={termSearch}
                                onChange={(e) => setTermSearch(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:border-amber-500 outline-none"
                            />
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100 focus:border-amber-500 outline-none"
                            >
                                <option value="">全部分类</option>
                                {termCategories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex-1 overflow-y-auto p-3 space-y-2">
                            {terms.map(term => (
                                <div
                                    key={term.id}
                                    className="p-3 bg-slate-800 rounded-xl border border-slate-700 hover:border-amber-500/50 transition-colors cursor-pointer group"
                                    onClick={() => insertTerm(term)}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-medium text-amber-300">{term.term}</span>
                                        <span className="text-xs px-2 py-0.5 bg-slate-700 rounded text-slate-400">{term.category}</span>
                                    </div>
                                    <p className="text-xs text-slate-400 leading-relaxed mb-1">{term.definition}</p>
                                    {term.synonyms && (
                                        <p className="text-xs text-slate-500">同义词: {term.synonyms}</p>
                                    )}
                                    {term.examples && (
                                        <p className="text-xs text-slate-500 italic mt-1">例: {term.examples}</p>
                                    )}
                                    <div className="mt-2 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-xs text-amber-400">点击插入</span>
                                    </div>
                                </div>
                            ))}
                            {terms.length === 0 && (
                                <div className="text-center py-8 text-slate-500 text-sm">
                                    未找到相关术语
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-slate-700 flex items-center justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl transition-colors"
                    >
                        取消
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 disabled:opacity-50 rounded-xl font-medium transition-all flex items-center gap-2"
                    >
                        {saving ? (
                            <>
                                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                                保存中...
                            </>
                        ) : (
                            '保存并推送'
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
