import { useState, useEffect, useMemo, useRef } from 'react'
import axios from 'axios'
import {
    Mail, FileText, Plus, Trash2, Save, Send, Eye, Code,
    ChevronRight, RefreshCw, Search, Filter, AlertCircle,
    CheckCircle, XCircle, Clock, Variable, ExternalLink,
    LayoutTemplate, Users, MapPin, Edit3, X, UserPlus
} from 'lucide-react'
import { toast } from 'react-toastify'

const API_BASE_URL = 'http://localhost:8000'

const CATEGORY_LABELS = {
    report: { label: '经营报表', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    alert: { label: '告警通知', color: 'bg-rose-500/20 text-rose-400 border-rose-500/30' },
    general: { label: '通用通知', color: 'bg-sky-500/20 text-sky-400 border-sky-500/30' },
}

const STATUS_LABELS = {
    success: { label: '成功', color: 'text-green-400', icon: CheckCircle },
    failed: { label: '失败', color: 'text-red-400', icon: XCircle },
    pending: { label: '待发送', color: 'text-yellow-400', icon: Clock },
}

export default function EmailCenterPage() {
    const [templates, setTemplates] = useState([])
    const [selectedTemplate, setSelectedTemplate] = useState(null)
    const [editData, setEditData] = useState(null)
    const [showPreview, setShowPreview] = useState(true)
    const [previewHtml, setPreviewHtml] = useState('')
    const [logs, setLogs] = useState([])
    const [logsTotal, setLogsTotal] = useState(0)
    const [logsPage, setLogsPage] = useState(1)
    const [logsPageSize] = useState(20)
    const [logsStatusFilter, setLogsStatusFilter] = useState('')
    const [categoryFilter, setCategoryFilter] = useState('')
    const [searchQuery, setSearchQuery] = useState('')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [sending, setSending] = useState(false)
    const [showVariablePanel, setShowVariablePanel] = useState(false)
    const [showTestEmailModal, setShowTestEmailModal] = useState(false)
    const [testEmail, setTestEmail] = useState('test@apiary.local')
    const [logsLoading, setLogsLoading] = useState(false)
    const [activeTab, setActiveTab] = useState('templates')
    const [recipients, setRecipients] = useState([])
    const [recipientsLoading, setRecipientsLoading] = useState(false)
    const [recipientFarmFilter, setRecipientFarmFilter] = useState('')
    const [showAddRecipientModal, setShowAddRecipientModal] = useState(false)
    const [newRecipient, setNewRecipient] = useState({ farm_id: 'farm_001', farm_name: '秦岭一号蜂场', recipient_name: '', recipient_email: '', role: 'owner' })
    const [editingRecipientId, setEditingRecipientId] = useState(null)
    const editorRef = useRef(null)

    const fetchTemplates = async () => {
        try {
            setLoading(true)
            const params = {}
            if (categoryFilter) params.category = categoryFilter
            const response = await axios.get(`${API_BASE_URL}/api/email/templates`, { params })
            let list = response.data.templates || []
            if (searchQuery) {
                const q = searchQuery.toLowerCase()
                list = list.filter(t =>
                    t.template_name.toLowerCase().includes(q) ||
                    t.template_code.toLowerCase().includes(q)
                )
            }
            setTemplates(list)
            if (!selectedTemplate && list.length > 0) {
                await selectTemplate(list[0].id)
            }
        } catch (error) {
            console.error('Failed to fetch templates:', error)
            toast.error('加载模板列表失败')
        } finally {
            setLoading(false)
        }
    }

    const selectTemplate = async (templateId) => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/email/templates/${templateId}`)
            const tpl = response.data
            setSelectedTemplate(tpl)
            setEditData({
                template_name: tpl.template_name,
                description: tpl.description || '',
                subject: tpl.subject,
                html_content: tpl.html_content,
                variables: tpl.variables || [],
                category: tpl.category,
                is_active: tpl.is_active,
            })
            await updatePreview(tpl.html_content, tpl.subject, tpl.variables || [])
        } catch (error) {
            console.error('Failed to load template:', error)
            toast.error('加载模板详情失败')
        }
    }

    const updatePreview = async (html, subject, variables) => {
        try {
            const vars = {}
            variables.forEach(v => {
                const name = v.name || v
                const nameLower = name.toLowerCase()
                if (nameLower.includes('top_honey_types')) vars[name] = [
                    { honey_type: '洋槐蜜', weight: 850.5, percent: '56.7%', grade: '特级' },
                    { honey_type: '百花蜜', weight: 650.0, percent: '43.3%', grade: '一级' },
                ]
                else if (nameLower.includes('alerts_summary')) vars[name] = [
                    { name: '蜂箱温度过高', count: 3, level: 'critical', level_label: '严重' },
                    { name: '蜂螨检测超标', count: 5, level: 'warning', level_label: '警告' },
                ]
                else if (nameLower.includes('report_generated')) vars[name] = '2024-01-15 10:30:00'
                else if (nameLower.includes('last_queen')) vars[name] = '3天前'
                else if (nameLower.includes('egg_pattern')) vars[name] = '未见正常产卵模式'
                else if (nameLower.includes('batch_no')) vars[name] = 'B20240115001'
                else if (nameLower.includes('alert_type')) vars[name] = '过高'
                else if (nameLower.includes('farm_name')) vars[name] = '秦岭一号蜂场'
                else if (nameLower.includes('farm')) vars[name] = '秦岭一号蜂场'
                else if (nameLower.includes('month')) vars[name] = '2024年01月'
                else if (nameLower.includes('temperature') || nameLower.includes('temp')) vars[name] = 36.5
                else if (nameLower.includes('hive')) vars[name] = 'QL-0001'
                else if (nameLower.includes('threshold')) vars[name] = 35
                else if (nameLower.includes('confidence')) vars[name] = 85
                else if (nameLower.includes('operator')) vars[name] = '张建国'
                else if (nameLower.includes('location')) vars[name] = 'A区-12'
                else if (nameLower.includes('quality_grade') || nameLower.includes('grade')) vars[name] = '特级'
                else if (nameLower.includes('weight') || nameLower.includes('honey') || nameLower.includes('harvest')) vars[name] = 1500
                else if (nameLower.includes('count') || nameLower.includes('batches') || nameLower.includes('batch') || nameLower.includes('alerts_count')) vars[name] = 25
                else if (nameLower.includes('time') || nameLower.includes('date')) vars[name] = '2024-01-15 10:30:00'
                else if (nameLower.includes('suggestion')) vars[name] = '建议立即检查蜂箱情况'
                else if (nameLower.includes('name')) vars[name] = '秦岭一号蜂场'
                else vars[name] = `示例值_${name}`
            })
            const response = await axios.post(`${API_BASE_URL}/api/email/preview`, {
                html_content: html,
                subject: subject,
                variables: vars,
            })
            setPreviewHtml(response.data.rendered_html)
        } catch (error) {
            setPreviewHtml(`<div style="padding:20px;color:#ef4444;font-family:sans-serif;"><h3>预览渲染失败</h3><p>${error.response?.data?.detail || error.message}</p></div>`)
        }
    }

    const fetchLogs = async () => {
        try {
            setLogsLoading(true)
            const params = { page: logsPage, page_size: logsPageSize }
            if (logsStatusFilter) params.status = logsStatusFilter
            const response = await axios.get(`${API_BASE_URL}/api/email/logs`, { params })
            setLogs(response.data.logs || [])
            setLogsTotal(response.data.total || 0)
        } catch (error) {
            console.error('Failed to fetch logs:', error)
        } finally {
            setLogsLoading(false)
        }
    }

    useEffect(() => {
        fetchTemplates()
    }, [categoryFilter, searchQuery])

    useEffect(() => {
        fetchLogs()
    }, [logsPage, logsStatusFilter])

    const fetchRecipients = async () => {
        try {
            setRecipientsLoading(true)
            const params = {}
            if (recipientFarmFilter) params.farm_id = recipientFarmFilter
            const response = await axios.get(`${API_BASE_URL}/api/email/recipients`, { params })
            setRecipients(response.data.recipients || [])
        } catch (error) {
            console.error('Failed to fetch recipients:', error)
            toast.error('加载收件人列表失败')
        } finally {
            setRecipientsLoading(false)
        }
    }

    useEffect(() => {
        if (activeTab === 'recipients') fetchRecipients()
    }, [activeTab, recipientFarmFilter])

    const handleAddRecipient = async () => {
        try {
            await axios.post(`${API_BASE_URL}/api/email/recipients`, newRecipient)
            toast.success('收件人添加成功')
            setShowAddRecipientModal(false)
            setNewRecipient({ farm_id: 'farm_001', farm_name: '秦岭一号蜂场', recipient_name: '', recipient_email: '', role: 'owner' })
            await fetchRecipients()
        } catch (error) {
            toast.error(`添加失败：${error.response?.data?.detail || error.message}`)
        }
    }

    const handleUpdateRecipient = async (id, data) => {
        try {
            await axios.put(`${API_BASE_URL}/api/email/recipients/${id}`, data)
            toast.success('收件人更新成功')
            setEditingRecipientId(null)
            await fetchRecipients()
        } catch (error) {
            toast.error(`更新失败：${error.response?.data?.detail || error.message}`)
        }
    }

    const handleDeleteRecipient = async (id, name) => {
        if (!confirm(`确定删除收件人「${name}」吗？`)) return
        try {
            await axios.delete(`${API_BASE_URL}/api/email/recipients/${id}`)
            toast.success('收件人已删除')
            await fetchRecipients()
        } catch (error) {
            toast.error(`删除失败：${error.response?.data?.detail || error.message}`)
        }
    }

    const handleToggleRecipientActive = async (recipient) => {
        await handleUpdateRecipient(recipient.id, { is_active: !recipient.is_active })
    }

    const BEE_FARM_OPTIONS = [
        { id: 'farm_001', name: '秦岭一号蜂场' },
        { id: 'farm_002', name: '长白山蜜源基地' },
        { id: 'farm_003', name: '云贵高原蜂场' },
        { id: 'farm_004', name: '江南水乡蜂场' },
        { id: 'farm_005', name: '黄土高原蜂场' },
        { id: 'farm_006', name: '闽南荔枝蜜场' },
    ]

    const ROLE_LABELS = {
        owner: { label: '场主', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
        manager: { label: '经理', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
        staff: { label: '员工', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
    }

    const groupedRecipients = useMemo(() => {
        const groups = {}
        recipients.forEach(r => {
            const key = r.farm_id
            if (!groups[key]) groups[key] = { farm_id: r.farm_id, farm_name: r.farm_name, recipients: [] }
            groups[key].recipients.push(r)
        })
        return Object.values(groups)
    }, [recipients])

    const handleEditorChange = (field, value) => {
        const newData = { ...editData, [field]: value }
        setEditData(newData)
        if (field === 'html_content' || field === 'subject') {
            const debounce = setTimeout(() => {
                updatePreview(
                    field === 'html_content' ? value : newData.html_content,
                    field === 'subject' ? value : newData.subject,
                    newData.variables || []
                )
            }, 400)
            return () => clearTimeout(debounce)
        }
    }

    const handleSave = async () => {
        if (!selectedTemplate || !editData) return
        try {
            setSaving(true)
            await axios.put(`${API_BASE_URL}/api/email/templates/${selectedTemplate.id}`, editData)
            toast.success('模板保存成功')
            await fetchTemplates()
        } catch (error) {
            toast.error(`保存失败：${error.response?.data?.detail || error.message}`)
        } finally {
            setSaving(false)
        }
    }

    const handleCreateTemplate = () => {
        const code = `custom_${Date.now()}`
        setSelectedTemplate({ id: null, template_code: code, is_system: false })
        setEditData({
            template_name: '新模板',
            description: '',
            subject: '邮件主题',
            html_content: '<div style="padding:20px;font-family:sans-serif;"><h2>邮件标题</h2><p>邮件内容...</p></div>',
            variables: [],
            category: 'general',
            is_active: true,
            created_by: 'admin',
        })
        setPreviewHtml('<div style="padding:20px;font-family:sans-serif;"><h2>邮件标题</h2><p>邮件内容...</p></div>')
    }

    const handleDeleteTemplate = async () => {
        if (!selectedTemplate || selectedTemplate.is_system) {
            toast.warning('系统模板不可删除')
            return
        }
        if (!confirm(`确定删除模板「${selectedTemplate.template_name}」吗？`)) return
        try {
            await axios.delete(`${API_BASE_URL}/api/email/templates/${selectedTemplate.id}`)
            toast.success('模板已删除')
            setSelectedTemplate(null)
            setEditData(null)
            await fetchTemplates()
        } catch (error) {
            toast.error(`删除失败：${error.response?.data?.detail || error.message}`)
        }
    }

    const handleInsertVariable = (varName) => {
        if (editorRef.current) {
            const textarea = editorRef.current
            const start = textarea.selectionStart
            const end = textarea.selectionEnd
            const before = editData.html_content.substring(0, start)
            const after = editData.html_content.substring(end)
            const inserted = `{{ ${varName} }}`
            const newContent = before + inserted + after
            handleEditorChange('html_content', newContent)
            setTimeout(() => {
                textarea.focus()
                textarea.setSelectionRange(start + inserted.length, start + inserted.length)
            }, 10)
        }
    }

    const handleSendTestEmail = async () => {
        if (!selectedTemplate) return
        try {
            setSending(true)
            const params = { to_email: testEmail }
            if (selectedTemplate.id) params.template_id = selectedTemplate.id
            else params.template_code = selectedTemplate.template_code
            await axios.post(`${API_BASE_URL}/api/email/send-test`, null, { params })
            toast.success(`测试邮件已发送至 ${testEmail}`)
            setShowTestEmailModal(false)
            await fetchLogs()
        } catch (error) {
            toast.error(`发送失败：${error.response?.data?.detail || error.message}`)
        } finally {
            setSending(false)
        }
    }

    const handleSaveAsNew = async () => {
        if (!editData) return
        try {
            setSaving(true)
            const payload = {
                ...editData,
                template_code: editData.template_code || `custom_${Date.now()}`,
                is_system: false,
            }
            await axios.post(`${API_BASE_URL}/api/email/templates`, payload)
            toast.success('新模板已创建')
            await fetchTemplates()
        } catch (error) {
            toast.error(`创建失败：${error.response?.data?.detail || error.message}`)
        } finally {
            setSaving(false)
        }
    }

    const openMailHog = () => {
        window.open('http://localhost:8025', '_blank')
    }

    const filteredTemplates = templates

    const logsTotalPages = Math.ceil(logsTotal / logsPageSize)

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
            <header className="px-6 py-4 border-b border-slate-700 bg-slate-900/80 backdrop-blur sticky top-0 z-20">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
                            <Mail className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight">邮件中心</h1>
                            <p className="text-slate-400 text-xs">模板管理 · 收件人配置 · 邮件发送 · 发送日志</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={openMailHog}
                            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm border border-slate-700 transition-colors"
                        >
                            <ExternalLink className="w-4 h-4" />
                            收件箱 (MailHog)
                        </button>
                    </div>
                </div>
                <div className="flex items-center gap-1 mt-3 -mb-1">
                    <button
                        onClick={() => setActiveTab('templates')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
                            activeTab === 'templates'
                                ? 'bg-slate-800 text-white border border-slate-700 border-b-slate-800'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                        }`}
                    >
                        <LayoutTemplate className="w-4 h-4" />
                        模板管理
                    </button>
                    <button
                        onClick={() => setActiveTab('recipients')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
                            activeTab === 'recipients'
                                ? 'bg-slate-800 text-white border border-slate-700 border-b-slate-800'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                        }`}
                    >
                        <Users className="w-4 h-4" />
                        场主邮箱配置
                    </button>
                </div>
            </header>

            {activeTab === 'recipients' ? (
                <div className="flex-1 overflow-y-auto bg-slate-900 p-6">
                    <div className="max-w-5xl mx-auto">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-lg font-semibold flex items-center gap-2">
                                    <Users className="w-5 h-5 text-indigo-400" />
                                    场主邮箱配置
                                </h2>
                                <p className="text-xs text-slate-400 mt-1">
                                    管理各蜂场的月度报表收件人。每月1日系统将自动向各场主邮箱发送经营报表。
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <select
                                    value={recipientFarmFilter}
                                    onChange={(e) => setRecipientFarmFilter(e.target.value)}
                                    className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm focus:border-indigo-500 outline-none"
                                >
                                    <option value="">全部蜂场</option>
                                    {BEE_FARM_OPTIONS.map(f => (
                                        <option key={f.id} value={f.id}>{f.name}</option>
                                    ))}
                                </select>
                                <button
                                    onClick={() => setShowAddRecipientModal(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 rounded-lg text-sm font-medium transition-all shadow-lg shadow-indigo-500/20"
                                >
                                    <UserPlus className="w-4 h-4" />
                                    添加收件人
                                </button>
                            </div>
                        </div>

                        {recipientsLoading ? (
                            <div className="text-center py-12">
                                <div className="animate-spin w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto"></div>
                                <p className="text-slate-400 text-sm mt-3">加载中...</p>
                            </div>
                        ) : recipients.length === 0 ? (
                            <div className="text-center py-12">
                                <Users className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                                <p className="text-slate-400">暂无收件人配置</p>
                                <p className="text-xs text-slate-500 mt-1">点击「添加收件人」为蜂场配置邮箱</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {groupedRecipients.map(group => (
                                    <div key={group.farm_id} className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
                                        <div className="px-5 py-3 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <MapPin className="w-4 h-4 text-amber-400" />
                                                <span className="font-semibold text-sm">{group.farm_name}</span>
                                                <span className="text-xs text-slate-500 font-mono">{group.farm_id}</span>
                                            </div>
                                            <span className="text-xs text-slate-500">{group.recipients.length} 位收件人</span>
                                        </div>
                                        <div className="divide-y divide-slate-700/50">
                                            {group.recipients.map(r => {
                                                const roleInfo = ROLE_LABELS[r.role] || ROLE_LABELS.staff
                                                return (
                                                    <div key={r.id} className="px-5 py-3 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
                                                        <div className="flex items-center gap-4 flex-1 min-w-0">
                                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                                                r.role === 'owner' ? 'bg-amber-500/20 text-amber-400' :
                                                                r.role === 'manager' ? 'bg-blue-500/20 text-blue-400' :
                                                                'bg-slate-600/30 text-slate-400'
                                                            }`}>
                                                                {r.recipient_name.charAt(0)}
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <div className="flex items-center gap-2">
                                                                    <span className={`text-sm font-medium ${r.is_active ? 'text-slate-200' : 'text-slate-500 line-through'}`}>
                                                                        {r.recipient_name}
                                                                    </span>
                                                                    <span className={`text-[10px] px-2 py-0.5 rounded border ${roleInfo.color}`}>
                                                                        {roleInfo.label}
                                                                    </span>
                                                                    {!r.is_active && (
                                                                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-700 text-slate-500">已停用</span>
                                                                    )}
                                                                </div>
                                                                <span className={`text-xs font-mono ${r.is_active ? 'text-slate-400' : 'text-slate-600'}`}>
                                                                    {r.recipient_email}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => handleToggleRecipientActive(r)}
                                                                className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                                                                    r.is_active
                                                                        ? 'border-slate-600 text-slate-400 hover:bg-slate-700'
                                                                        : 'border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10'
                                                                }`}
                                                            >
                                                                {r.is_active ? '停用' : '启用'}
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteRecipient(r.id, r.recipient_name)}
                                                                className="p-1.5 hover:bg-rose-500/10 rounded-lg text-rose-400 transition-colors"
                                                                title="删除"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {showAddRecipientModal && (
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowAddRecipientModal(false)}>
                            <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-700" onClick={e => e.stopPropagation()}>
                                <div className="flex items-center justify-between mb-5">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 bg-indigo-500/20 rounded-xl">
                                            <UserPlus className="w-5 h-5 text-indigo-400" />
                                        </div>
                                        <h3 className="text-lg font-semibold">添加收件人</h3>
                                    </div>
                                    <button onClick={() => setShowAddRecipientModal(false)} className="p-1.5 hover:bg-slate-700 rounded-lg">
                                        <X className="w-4 h-4 text-slate-400" />
                                    </button>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm text-slate-300 mb-1.5">所属蜂场</label>
                                        <select
                                            value={newRecipient.farm_id}
                                            onChange={(e) => {
                                                const farm = BEE_FARM_OPTIONS.find(f => f.id === e.target.value)
                                                setNewRecipient({ ...newRecipient, farm_id: e.target.value, farm_name: farm?.name || '' })
                                            }}
                                            className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg focus:border-indigo-500 outline-none"
                                        >
                                            {BEE_FARM_OPTIONS.map(f => (
                                                <option key={f.id} value={f.id}>{f.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-slate-300 mb-1.5">姓名</label>
                                        <input
                                            type="text"
                                            value={newRecipient.recipient_name}
                                            onChange={(e) => setNewRecipient({ ...newRecipient, recipient_name: e.target.value })}
                                            placeholder="如：张场主"
                                            className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg focus:border-indigo-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-slate-300 mb-1.5">邮箱</label>
                                        <input
                                            type="email"
                                            value={newRecipient.recipient_email}
                                            onChange={(e) => setNewRecipient({ ...newRecipient, recipient_email: e.target.value })}
                                            placeholder="owner@apiary.local"
                                            className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg focus:border-indigo-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-slate-300 mb-1.5">角色</label>
                                        <select
                                            value={newRecipient.role}
                                            onChange={(e) => setNewRecipient({ ...newRecipient, role: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg focus:border-indigo-500 outline-none"
                                        >
                                            <option value="owner">场主</option>
                                            <option value="manager">经理</option>
                                            <option value="staff">员工</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2 mt-6">
                                    <button
                                        onClick={() => setShowAddRecipientModal(false)}
                                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition-colors"
                                    >
                                        取消
                                    </button>
                                    <button
                                        onClick={handleAddRecipient}
                                        disabled={!newRecipient.recipient_name || !newRecipient.recipient_email}
                                        className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:opacity-60 rounded-lg text-sm font-medium transition-all"
                                    >
                                        添加
                                        <UserPlus className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
            <div className="flex-1 flex overflow-hidden">
                <aside className="w-72 border-r border-slate-700 bg-slate-900/50 flex flex-col">
                    <div className="p-4 border-b border-slate-700 space-y-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                type="text"
                                placeholder="搜索模板..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm focus:border-indigo-500 outline-none transition-colors"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-slate-500" />
                            <select
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                                className="flex-1 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm focus:border-indigo-500 outline-none"
                            >
                                <option value="">全部分类</option>
                                <option value="report">经营报表</option>
                                <option value="alert">告警通知</option>
                                <option value="general">通用通知</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {loading ? (
                            <div className="p-8 text-center">
                                <div className="animate-spin w-6 h-6 border-3 border-indigo-500 border-t-transparent rounded-full mx-auto"></div>
                            </div>
                        ) : filteredTemplates.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 text-sm">暂无模板</div>
                        ) : (
                            <div className="p-2 space-y-1">
                                {filteredTemplates.map(tpl => {
                                    const cat = CATEGORY_LABELS[tpl.category] || CATEGORY_LABELS.general
                                    const isActive = selectedTemplate?.id === tpl.id || (selectedTemplate?.template_code === tpl.template_code)
                                    return (
                                        <button
                                            key={tpl.id}
                                            onClick={() => selectTemplate(tpl.id)}
                                            className={`w-full text-left p-3 rounded-lg transition-all ${
                                                isActive
                                                    ? 'bg-indigo-500/15 border border-indigo-500/40'
                                                    : 'hover:bg-slate-800/70 border border-transparent'
                                            }`}
                                        >
                                            <div className="flex items-start gap-2.5">
                                                <LayoutTemplate className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className={`text-sm font-medium truncate ${isActive ? 'text-indigo-300' : 'text-slate-200'}`}>
                                                            {tpl.template_name}
                                                        </span>
                                                        {tpl.is_system && (
                                                            <span className="text-[10px] px-1.5 py-0.5 bg-slate-700 text-slate-400 rounded">系统</span>
                                                        )}
                                                        {!tpl.is_active && (
                                                            <span className="text-[10px] px-1.5 py-0.5 bg-slate-700 text-slate-500 rounded">已停用</span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-[10px] px-2 py-0.5 rounded border ${cat.color}`}>
                                                            {cat.label}
                                                        </span>
                                                        <span className="text-[10px] text-slate-500 truncate font-mono">{tpl.template_code}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    <div className="p-3 border-t border-slate-700 flex items-center justify-between">
                        <span className="text-xs text-slate-500">共 {templates.length} 个模板</span>
                        <button
                            onClick={handleCreateTemplate}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 rounded-lg text-xs font-medium transition-all"
                        >
                            <Plus className="w-3 h-3" />
                            新建
                        </button>
                    </div>
                </aside>

                <main className="flex-1 flex flex-col overflow-hidden">
                    {!selectedTemplate ? (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="text-center">
                                <Mail className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                                <p className="text-slate-400">请从左侧选择模板或新建模板</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="px-5 py-3 border-b border-slate-700 bg-slate-800/30 flex items-center justify-between">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                        <span className="text-sm text-slate-400">名称</span>
                                        <input
                                            value={editData?.template_name || ''}
                                            onChange={(e) => handleEditorChange('template_name', e.target.value)}
                                            className="bg-transparent border-b border-transparent hover:border-slate-600 focus:border-indigo-500 px-1 py-0.5 text-sm font-semibold outline-none min-w-0 flex-1"
                                        />
                                    </div>
                                    <select
                                        value={editData?.category || 'general'}
                                        onChange={(e) => handleEditorChange('category', e.target.value)}
                                        className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs"
                                    >
                                        <option value="report">经营报表</option>
                                        <option value="alert">告警通知</option>
                                        <option value="general">通用通知</option>
                                    </select>
                                    <label className="flex items-center gap-1.5 text-xs text-slate-400">
                                        <input
                                            type="checkbox"
                                            checked={editData?.is_active ?? true}
                                            onChange={(e) => handleEditorChange('is_active', e.target.checked)}
                                            className="rounded border-slate-600 bg-slate-800"
                                        />
                                        启用
                                    </label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
                                        <button
                                            onClick={() => setShowPreview(false)}
                                            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                                                !showPreview ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
                                            }`}
                                        >
                                            <Code className="w-3.5 h-3.5" />
                                            代码
                                        </button>
                                        <button
                                            onClick={() => setShowPreview(true)}
                                            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                                                showPreview ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
                                            }`}
                                        >
                                            <Eye className="w-3.5 h-3.5" />
                                            预览
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => setShowVariablePanel(!showVariablePanel)}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs border border-slate-700 transition-colors"
                                    >
                                        <Variable className="w-3.5 h-3.5" />
                                        变量
                                    </button>
                                    {selectedTemplate.id ? (
                                        <button
                                            onClick={handleSave}
                                            disabled={saving}
                                            className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:opacity-60 rounded-lg text-xs font-medium transition-all shadow shadow-blue-500/20"
                                        >
                                            <Save className="w-3.5 h-3.5" />
                                            {saving ? '保存中...' : '保存'}
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleSaveAsNew}
                                            disabled={saving}
                                            className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-60 rounded-lg text-xs font-medium transition-all shadow shadow-emerald-500/20"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            {saving ? '创建中...' : '创建模板'}
                                        </button>
                                    )}
                                    {!selectedTemplate.is_system && selectedTemplate.id && (
                                        <button
                                            onClick={handleDeleteTemplate}
                                            className="flex items-center gap-1 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg text-xs border border-rose-500/30 transition-colors"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            删除
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setShowTestEmailModal(true)}
                                        disabled={!selectedTemplate}
                                        className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-xs font-medium transition-all shadow shadow-emerald-500/20"
                                    >
                                        <Send className="w-3.5 h-3.5" />
                                        测试邮件
                                    </button>
                                </div>
                            </div>

                            <div className="px-5 py-2.5 border-b border-slate-700/50 bg-slate-800/20 flex items-center gap-3">
                                <span className="text-xs text-slate-400 flex-shrink-0">邮件主题</span>
                                <input
                                    value={editData?.subject || ''}
                                    onChange={(e) => handleEditorChange('subject', e.target.value)}
                                    placeholder="支持变量，如：{{farm_name}} - 月度报表"
                                    className="flex-1 px-3 py-1.5 bg-slate-900/60 border border-slate-700 rounded-lg text-sm focus:border-indigo-500 outline-none font-mono"
                                />
                            </div>

                            {showVariablePanel && editData?.variables && editData.variables.length > 0 && (
                                <div className="px-5 py-3 border-b border-slate-700/50 bg-slate-800/40">
                                    <div className="text-xs text-slate-400 mb-2">点击变量插入到编辑器光标位置</div>
                                    <div className="flex flex-wrap gap-2">
                                        {editData.variables.map((v, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => handleInsertVariable(v.name || v)}
                                                className="px-2.5 py-1 bg-slate-700/60 hover:bg-indigo-500/20 hover:border-indigo-500/40 text-slate-300 hover:text-indigo-300 rounded-md text-xs font-mono border border-slate-600 transition-all flex items-center gap-1"
                                            >
                                                <Variable className="w-3 h-3 opacity-60" />
                                                {v.label || v.name || v}
                                                <span className="text-slate-500">{`{{${v.name || v}}}`}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex-1 flex overflow-hidden">
                                {!showPreview ? (
                                    <div className="flex-1 flex flex-col">
                                        <div className="px-4 py-2 bg-slate-800/50 border-b border-slate-700/50 text-xs text-slate-400 flex items-center gap-2">
                                            <Code className="w-3.5 h-3.5" />
                                            HTML 编辑器
                                        </div>
                                        <textarea
                                            ref={editorRef}
                                            value={editData?.html_content || ''}
                                            onChange={(e) => handleEditorChange('html_content', e.target.value)}
                                            className="flex-1 bg-slate-950 text-slate-200 font-mono text-xs p-4 outline-none resize-none leading-relaxed"
                                            spellCheck={false}
                                        />
                                    </div>
                                ) : (
                                    <div className="flex-1 flex overflow-hidden">
                                        <div className="w-1/2 flex flex-col border-r border-slate-700">
                                            <div className="px-4 py-2 bg-slate-800/50 border-b border-slate-700/50 text-xs text-slate-400 flex items-center gap-2">
                                                <Code className="w-3.5 h-3.5" />
                                                HTML 编辑器
                                            </div>
                                            <textarea
                                                ref={editorRef}
                                                value={editData?.html_content || ''}
                                                onChange={(e) => handleEditorChange('html_content', e.target.value)}
                                                className="flex-1 bg-slate-950 text-slate-200 font-mono text-xs p-4 outline-none resize-none leading-relaxed"
                                                spellCheck={false}
                                            />
                                        </div>
                                        <div className="w-1/2 flex flex-col bg-white">
                                            <div className="px-4 py-2 bg-slate-800/50 border-b border-slate-700/50 text-xs text-slate-400 flex items-center gap-2">
                                                <Eye className="w-3.5 h-3.5" />
                                                实时预览
                                            </div>
                                            <iframe
                                                srcDoc={previewHtml}
                                                className="flex-1 w-full border-0 bg-white"
                                                title="email preview"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    <div className="h-80 border-t border-slate-700 bg-slate-900/80 flex flex-col">
                        <div className="px-5 py-3 border-b border-slate-700/50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <FileText className="w-4 h-4 text-slate-400" />
                                <span className="text-sm font-semibold">发送日志</span>
                                <span className="text-xs text-slate-500">共 {logsTotal} 条</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <select
                                    value={logsStatusFilter}
                                    onChange={(e) => { setLogsStatusFilter(e.target.value); setLogsPage(1) }}
                                    className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs focus:border-indigo-500 outline-none"
                                >
                                    <option value="">全部状态</option>
                                    <option value="success">成功</option>
                                    <option value="failed">失败</option>
                                    <option value="pending">待发送</option>
                                </select>
                                <button
                                    onClick={fetchLogs}
                                    className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors"
                                >
                                    <RefreshCw className="w-4 h-4 text-slate-400" />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-auto">
                            {logsLoading ? (
                                <div className="p-8 text-center">
                                    <div className="animate-spin w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto"></div>
                                </div>
                            ) : logs.length === 0 ? (
                                <div className="p-8 text-center text-slate-500 text-sm">暂无发送记录</div>
                            ) : (
                                <table className="w-full text-xs">
                                    <thead className="bg-slate-800/50 text-slate-400 sticky top-0">
                                        <tr>
                                            <th className="text-left px-4 py-2 font-medium">ID</th>
                                            <th className="text-left px-4 py-2 font-medium">模板</th>
                                            <th className="text-left px-4 py-2 font-medium">主题</th>
                                            <th className="text-left px-4 py-2 font-medium">收件人</th>
                                            <th className="text-left px-4 py-2 font-medium">状态</th>
                                            <th className="text-left px-4 py-2 font-medium">类型</th>
                                            <th className="text-left px-4 py-2 font-medium">发送时间</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800">
                                        {logs.map(log => {
                                            const status = STATUS_LABELS[log.status] || STATUS_LABELS.pending
                                            const StatusIcon = status.icon
                                            return (
                                                <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                                                    <td className="px-4 py-2 text-slate-500 font-mono">#{log.id}</td>
                                                    <td className="px-4 py-2">
                                                        <span className="font-mono text-slate-400">{log.template_code || '-'}</span>
                                                    </td>
                                                    <td className="px-4 py-2 text-slate-200 max-w-xs truncate" title={log.subject}>
                                                        {log.subject}
                                                    </td>
                                                    <td className="px-4 py-2 text-slate-400 max-w-[180px] truncate" title={(log.recipients || []).join(', ')}>
                                                        {(log.recipients || []).slice(0, 2).join(', ')}
                                                        {(log.recipients || []).length > 2 && ` +${(log.recipients || []).length - 2}`}
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        <span className={`inline-flex items-center gap-1 ${status.color}`}>
                                                            <StatusIcon className="w-3.5 h-3.5" />
                                                            {status.label}
                                                        </span>
                                                        {log.status === 'failed' && log.error_message && (
                                                            <span className="ml-1 text-red-400/70" title={log.error_message}>
                                                                <AlertCircle className="w-3 h-3 inline" />
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        <span className={`px-2 py-0.5 rounded text-[10px] ${
                                                            log.send_type === 'scheduled' ? 'bg-amber-500/20 text-amber-400' :
                                                            log.send_type === 'test' ? 'bg-sky-500/20 text-sky-400' :
                                                            'bg-slate-700 text-slate-300'
                                                        }`}>
                                                            {log.send_type === 'scheduled' ? '定时' : log.send_type === 'test' ? '测试' : '手动'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-2 text-slate-500 whitespace-nowrap">
                                                        {log.sent_at ? new Date(log.sent_at).toLocaleString('zh-CN') : log.created_at ? new Date(log.created_at).toLocaleString('zh-CN') : '-'}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                        {logsTotalPages > 1 && (
                            <div className="px-5 py-2 border-t border-slate-700/50 flex items-center justify-between text-xs">
                                <span className="text-slate-500">
                                    第 {logsPage} / {logsTotalPages} 页
                                </span>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setLogsPage(p => Math.max(1, p - 1))}
                                        disabled={logsPage === 1}
                                        className="p-1.5 hover:bg-slate-800 disabled:opacity-40 rounded transition-colors"
                                    >
                                        <ChevronRight className="w-4 h-4 rotate-180 text-slate-400" />
                                    </button>
                                    <span className="px-2 text-slate-400">{logsPage}</span>
                                    <button
                                        onClick={() => setLogsPage(p => Math.min(logsTotalPages, p + 1))}
                                        disabled={logsPage === logsTotalPages}
                                        className="p-1.5 hover:bg-slate-800 disabled:opacity-40 rounded transition-colors"
                                    >
                                        <ChevronRight className="w-4 h-4 text-slate-400" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>
            )}

            {showTestEmailModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowTestEmailModal(false)}>
                    <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-700" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-5">
                            <div className="p-2.5 bg-emerald-500/20 rounded-xl">
                                <Send className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold">发送测试邮件</h3>
                                <p className="text-xs text-slate-400">模板：{selectedTemplate?.template_name}</p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-slate-300 mb-1.5">收件人邮箱</label>
                                <input
                                    type="email"
                                    value={testEmail}
                                    onChange={(e) => setTestEmail(e.target.value)}
                                    placeholder="your@email.com"
                                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg focus:border-emerald-500 outline-none transition-colors"
                                />
                                <p className="mt-1.5 text-xs text-slate-500">
                                    系统将使用预设示例变量填充模板，发送后可在
                                    <button onClick={openMailHog} className="text-emerald-400 hover:underline mx-1">MailHog</button>
                                    查看收件箱
                                </p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <button
                                onClick={() => setShowTestEmailModal(false)}
                                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition-colors"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleSendTestEmail}
                                disabled={sending || !testEmail}
                                className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-60 rounded-lg text-sm font-medium transition-all"
                            >
                                {sending ? '发送中...' : '立即发送'}
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
