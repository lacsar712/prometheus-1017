import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import 'react-toastify/dist/ReactToastify.css'
import { ToastContainer } from 'react-toastify'
import { I18nProvider } from './contexts/I18nContext'

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <I18nProvider>
            <App />
            <ToastContainer position="top-right" theme="dark" />
        </I18nProvider>
    </React.StrictMode>,
)
