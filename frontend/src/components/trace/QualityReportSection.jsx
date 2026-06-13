import { Shield, TreePine, Award, MapPin, Droplets } from 'lucide-react'

const farmDescriptions = {
  '秦岭一号蜂场': '坐落于秦岭太白山脚下的原生态蜂场，海拔1200-1800米，周边无工业污染，蜜源植物以洋槐、山花为主。蜂群采用传统木桶养殖与现代活框结合方式，确保蜂蜜天然纯粹。',
  '长白山蜜源基地': '位于长白山自然保护区缓冲带，原始森林覆盖率95%以上，以椴树蜜为核心产品。冬季漫长严寒，蜂群越冬期长，产蜜期集中，蜜质浓稠，香气独特。',
  '云贵高原蜂场': '地处云南罗平万亩油菜花海核心区，春季油菜花盛开时是主要采蜜期。高原日照充足、昼夜温差大，有利于花蜜糖分积累，蜂蜜口感醇厚。',
  '江南水乡蜂场': '坐落于太湖之滨德清县，水网密布、花木繁盛。蜂场以百花蜜为主，四季蜜源不断，春有油菜紫云英、夏有乌桕荷花、秋有桂花荞麦。',
  '黄土高原蜂场': '位于山西忻州静乐县黄土高原沟壑区，枣花蜜为核心产品。黄土高原日照时间长、昼夜温差大，枣花蜜色泽深沉、矿物质含量丰富。',
  '闽南荔枝蜜场': '地处福建漳州诏安县，南亚热带气候温暖湿润，荔枝花开时节为主要采蜜期。荔枝蜜色泽琥珀、香气馥郁，是珍贵的单花蜜品种。',
}

const gradeLabels = { '特级': '特级', '一级': '一级', '二级': '二级' }

export default function QualityReportSection({ batch }) {
  const score = batch?.quality_score ?? 0
  const scoreColor = score >= 90 ? 'text-green-400' : score >= 80 ? 'text-amber-400' : 'text-orange-400'
  const ringColor = score >= 90 ? '#4ade80' : score >= 80 ? '#fbbf24' : '#fb923c'
  const grade = batch?.grade ?? ''
  const apiaryName = batch?.apiary_name ?? ''
  const description = farmDescriptions[apiaryName] ?? '生态蜂场，远离城市污染，蜜源丰富，蜂蜜品质优良。'

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="dashboard-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-amber-400" />
          <h3 className="text-lg font-semibold text-white">质检报告</h3>
        </div>

        <div className="flex items-center gap-6 mb-4">
          <div
            className="relative w-28 h-28 rounded-full flex items-center justify-center shrink-0"
            style={{
              background: `conic-gradient(${ringColor} ${score * 3.6}deg, rgba(255,255,255,0.08) ${score * 3.6}deg)`,
            }}
          >
            <div className="absolute inset-2 rounded-full bg-gray-900 flex items-center justify-center">
              <span className={`text-3xl font-bold ${scoreColor}`}>{score}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {grade && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/20 border border-green-500/40 text-green-300 text-xs font-medium rounded-full w-fit">
                <Award className="w-3 h-3" />
                {gradeLabels[grade] ?? grade}
              </span>
            )}
            <span className="text-sm text-gray-400">质量评分</span>
          </div>
        </div>

        {batch?.quality_report && (
          <p className="text-sm text-gray-300 leading-relaxed">{batch.quality_report}</p>
        )}
      </div>

      <div className="dashboard-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <TreePine className="w-5 h-5 text-green-400" />
          <h3 className="text-lg font-semibold text-white">蜂场介绍</h3>
        </div>

        <div className="mb-3">
          <h4 className="text-base font-medium text-white mb-1">{apiaryName}</h4>
          {batch?.apiary_location && (
            <div className="flex items-center gap-1 text-sm text-gray-400">
              <MapPin className="w-3.5 h-3.5" />
              <span>{batch.apiary_location}</span>
            </div>
          )}
        </div>

        <p className="text-sm text-gray-300 leading-relaxed mb-4">{description}</p>

        {batch?.honey_type && (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-medium rounded-full">
            <Droplets className="w-3 h-3" />
            {batch.honey_type}
          </span>
        )}
      </div>
    </div>
  )
}
