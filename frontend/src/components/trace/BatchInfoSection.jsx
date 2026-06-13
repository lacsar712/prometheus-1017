import { MapPin, Droplets, Scale, Calendar, Award, Tag, Hash } from 'lucide-react'

const STATUS_STYLES = {
  '生产中': 'px-2 py-1 bg-blue-500/20 border border-blue-500/40 text-blue-300 text-xs font-medium rounded-full',
  '已检测': 'px-2 py-1 bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-medium rounded-full',
  '已灌装': 'px-2 py-1 bg-green-500/20 border border-green-500/40 text-green-300 text-xs font-medium rounded-full',
  '已出库': 'px-2 py-1 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-medium rounded-full',
}

const DEFAULT_STATUS_STYLE = 'px-2 py-1 bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-medium rounded-full'

function GradeIndicator({ grade }) {
  const gradeMap = { '特级': 5, '一级': 4, '二级': 3, '三级': 2 }
  const level = gradeMap[grade] || 3

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-panel-text font-semibold">{grade}</span>
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="w-4 h-1.5 rounded-full"
            style={{
              background: i < level
                ? 'linear-gradient(90deg, #FBBF24, #F59E0B)'
                : 'rgba(251, 191, 36, 0.15)',
            }}
          />
        ))}
      </div>
    </div>
  )
}

function InfoRow({ icon: Icon, label, children }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-amber-400" />
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-panel-muted text-xs">{label}</span>
        <div className="text-panel-text font-semibold text-sm truncate">{children}</div>
      </div>
    </div>
  )
}

export default function BatchInfoSection({ batch }) {
  if (!batch) return null

  return (
    <div className="flex flex-col gap-4">
      <div className="dashboard-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="gradient-text font-bold text-base">批次信息</h3>
          <span className={STATUS_STYLES[batch.status] || DEFAULT_STATUS_STYLE}>
            {batch.status}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <InfoRow icon={Hash} label="批次号">
            {batch.batch_no}
          </InfoRow>
          <InfoRow icon={Droplets} label="蜂蜜类型">
            {batch.honey_type}
          </InfoRow>
          <InfoRow icon={Award} label="等级">
            <GradeIndicator grade={batch.grade} />
          </InfoRow>
          <InfoRow icon={Scale} label="净重">
            {batch.net_weight}
          </InfoRow>
          <InfoRow icon={Calendar} label="采收日期">
            {batch.harvest_date}
          </InfoRow>
          <InfoRow icon={Tag} label="状态">
            <span className={STATUS_STYLES[batch.status] || DEFAULT_STATUS_STYLE}>
              {batch.status}
            </span>
          </InfoRow>
        </div>
      </div>

      <div className="dashboard-card p-5">
        <h3 className="gradient-text font-bold text-base mb-3">蜂场位置</h3>
        <div className="relative rounded-xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #1a1510 0%, #0f0d09 100%)' }}>
          <div className="absolute inset-0 honeycomb-bg opacity-40" />
          <div className="relative flex flex-col items-center justify-center py-8 gap-3">
            <div className="w-12 h-12 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center">
              <MapPin className="w-6 h-6 text-red-400" />
            </div>
            <div className="text-center">
              <div className="text-panel-text font-semibold text-sm">{batch.apiary_name || batch.farm_name}</div>
              <div className="text-panel-muted text-xs mt-1">{batch.apiary_location}</div>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono text-amber-400/70">
              <span>LAT {batch.apiary_lat}</span>
              <span className="w-px h-3 bg-amber-500/20" />
              <span>LNG {batch.apiary_lng}</span>
            </div>
          </div>
          <div className="absolute inset-0 pointer-events-none border border-amber-500/10 rounded-xl" />
        </div>
      </div>
    </div>
  )
}
