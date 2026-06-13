import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Loader2, AlertTriangle, Hexagon } from 'lucide-react';
import BatchInfoSection from './BatchInfoSection';
import TimelineSection from './TimelineSection';
import QualityReportSection from './QualityReportSection';
import QRCodePanel from './QRCodePanel';

const API_BASE_URL = 'http://localhost:8000';

export default function TracePage() {
    const { batchNo } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!batchNo) return;
        setLoading(true);
        setError(null);
        axios.get(`${API_BASE_URL}/api/trace/${batchNo}`)
            .then(res => {
                setData(res.data);
                setLoading(false);
            })
            .catch(err => {
                setError(err.response?.data?.detail || '查询失败');
                setLoading(false);
            });
    }, [batchNo]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#1C1712' }}>
                <div className="text-center space-y-4">
                    <Loader2 className="w-12 h-12 text-amber-400 animate-spin mx-auto" />
                    <p className="text-amber-200/70 text-lg">正在查询溯源信息...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#1C1712' }}>
                <div className="dashboard-card p-8 text-center max-w-md">
                    <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-red-300 mb-2">查询失败</h2>
                    <p className="text-panel-muted">{error}</p>
                </div>
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="min-h-screen" style={{ backgroundColor: '#1C1712' }}>
            <header className="border-b border-amber-500/15 bg-panel-bg/80 backdrop-blur-md sticky top-0 z-40">
                <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Hexagon className="w-8 h-8 text-amber-400" />
                        <div>
                            <h1 className="text-lg font-bold gradient-text-warm">蜂蜜溯源</h1>
                            <p className="text-panel-muted text-xs">扫码追溯，品质可见</p>
                        </div>
                    </div>
                    <div className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-full">
                        <span className="text-amber-300 text-sm font-mono">{data.batch.batch_no}</span>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 py-6 space-y-6 pb-24">
                <BatchInfoSection batch={data.batch} />
                <TimelineSection events={data.events} />
                <QualityReportSection batch={data.batch} />
            </main>

            <QRCodePanel batchNo={data.batch.batch_no} />
        </div>
    );
}
