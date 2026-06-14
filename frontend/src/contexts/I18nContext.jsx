import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'

const API_BASE_URL = 'http://localhost:8000'
const WS_BASE_URL = 'ws://localhost:8000'

const I18nContext = createContext(null)

export function I18nProvider({ children }) {
    const [currentLanguage, setCurrentLanguage] = useState('zh-CN')
    const [translations, setTranslations] = useState({})
    const [version, setVersion] = useState('')
    const [isLoading, setIsLoading] = useState(true)
    const [wsConnected, setWsConnected] = useState(false)
    const [languages, setLanguages] = useState([])
    const [namespaces, setNamespaces] = useState([])

    const loadTranslations = useCallback(async (lang) => {
        try {
            setIsLoading(true)
            const response = await axios.get(`${API_BASE_URL}/api/i18n/bundle`, {
                params: { language: lang }
            })
            setTranslations(response.data.resources || {})
            setVersion(response.data.version)
        } catch (error) {
            console.error('Failed to load translations:', error)
        } finally {
            setIsLoading(false)
        }
    }, [])

    const loadLanguages = useCallback(async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/i18n/languages`)
            setLanguages(response.data.languages || [])
        } catch (error) {
            console.error('Failed to load languages:', error)
        }
    }, [])

    const loadNamespaces = useCallback(async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/i18n/namespaces`)
            setNamespaces(response.data.namespaces || [])
        } catch (error) {
            console.error('Failed to load namespaces:', error)
        }
    }, [])

    const t = useCallback((key, defaultValue) => {
        if (!key) return defaultValue || key
        const value = translations[key]
        if (value === undefined || value === null || value === '') {
            return defaultValue || key
        }
        return value
    }, [translations])

    const changeLanguage = useCallback(async (lang) => {
        setCurrentLanguage(lang)
        await loadTranslations(lang)
    }, [loadTranslations])

    useEffect(() => {
        loadLanguages()
        loadNamespaces()
        loadTranslations(currentLanguage)
    }, [currentLanguage, loadLanguages, loadNamespaces, loadTranslations])

    useEffect(() => {
        let ws = null
        let reconnectTimer = null

        const connectWebSocket = () => {
            try {
                const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                ws = new WebSocket(`${WS_BASE_URL}/api/i18n/ws?client_id=${clientId}`)

                ws.onopen = () => {
                    console.log('WebSocket connected for hot updates')
                    setWsConnected(true)
                    ws.send(JSON.stringify({ type: 'subscribe' }))
                }

                ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data)
                        if (data.type === 'hot_update') {
                            console.log('Received hot update:', data)
                            if (data.language === currentLanguage) {
                                setTranslations(prev => ({
                                    ...prev,
                                    [data.key]: data.value
                                }))
                                setVersion(data.timestamp)
                                toast.info(`翻译已更新: ${data.key}`, { autoClose: 2000 })
                            }
                        }
                    } catch (e) {
                        console.error('Failed to parse WebSocket message:', e)
                    }
                }

                ws.onclose = () => {
                    console.log('WebSocket disconnected, will reconnect in 5s')
                    setWsConnected(false)
                    reconnectTimer = setTimeout(connectWebSocket, 5000)
                }

                ws.onerror = (error) => {
                    console.error('WebSocket error:', error)
                    setWsConnected(false)
                }
            } catch (e) {
                console.error('Failed to connect WebSocket:', e)
            }
        }

        connectWebSocket()

        return () => {
            if (ws) {
                ws.close()
            }
            if (reconnectTimer) {
                clearTimeout(reconnectTimer)
            }
        }
    }, [currentLanguage])

    const value = {
        currentLanguage,
        translations,
        version,
        isLoading,
        wsConnected,
        languages,
        namespaces,
        t,
        changeLanguage,
        loadTranslations,
        API_BASE_URL,
    }

    return (
        <I18nContext.Provider value={value}>
            {children}
        </I18nContext.Provider>
    )
}

export function useI18n() {
    const context = useContext(I18nContext)
    if (!context) {
        throw new Error('useI18n must be used within an I18nProvider')
    }
    return context
}

export default I18nContext
