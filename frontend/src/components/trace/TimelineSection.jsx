import { useState } from "react";
import {
  ClipboardCheck,
  Droplets,
  FlaskConical,
  Package,
  Truck,
  ChevronDown,
  ChevronUp,
  User,
  MapPin,
  Clock,
} from "lucide-react";

const iconMap = {
  "clipboard-check": ClipboardCheck,
  droplets: Droplets,
  "flask-conical": FlaskConical,
  package: Package,
  truck: Truck,
};

const colorMap = {
  inspection: "text-blue-400 border-blue-400 bg-blue-400/10",
  harvest: "text-amber-400 border-amber-400 bg-amber-400/10",
  testing: "text-purple-400 border-purple-400 bg-purple-400/10",
  bottling: "text-green-400 border-green-400 bg-green-400/10",
  dispatch: "text-cyan-400 border-cyan-400 bg-cyan-400/10",
};

const dotColorMap = {
  inspection: "bg-blue-400",
  harvest: "bg-amber-400",
  testing: "bg-purple-400",
  bottling: "bg-green-400",
  dispatch: "bg-cyan-400",
};

function EventCard({ event, index }) {
  const [expanded, setExpanded] = useState(false);
  const IconComponent = iconMap[event.icon] || ClipboardCheck;
  const nodeColor = colorMap[event.event_type] || colorMap.inspection;
  const dotColor = dotColorMap[event.event_type] || dotColorMap.inspection;

  return (
    <div
      className="relative flex items-start gap-4 pb-8 animate-fade-in"
      style={{ animationDelay: `${index * 100}ms`, animationFillMode: "both" }}
    >
      <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-amber-500/60 via-amber-500/30 to-transparent" />

      <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center border-2 ${nodeColor}`}>
        <IconComponent className="w-4 h-4" />
      </div>

      <div className="dashboard-card p-4 ml-14 flex-1">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-amber-50">{event.title}</h4>
          <div className="flex items-center gap-1.5 text-xs text-amber-400/70">
            <Clock className="w-3 h-3" />
            <span>{event.event_time}</span>
          </div>
        </div>

        {event.description && (
          <p className="text-xs text-amber-200/60 mb-3">{event.description}</p>
        )}

        <div className="flex items-center gap-4 text-xs text-amber-200/50">
          {event.operator && (
            <div className="flex items-center gap-1">
              <User className="w-3 h-3" />
              <span>{event.operator}</span>
            </div>
          )}
          {event.location && (
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              <span>{event.location}</span>
            </div>
          )}
        </div>

        {event.details && (
          <div className="mt-3 border-t border-amber-500/10 pt-3">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-amber-400/70 hover:text-amber-400 transition-colors"
            >
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              <span>{expanded ? "收起详情" : "展开详情"}</span>
            </button>
            {expanded && (
              <div className="mt-2 space-y-1.5">
                {Object.entries(event.details).map(([key, value]) => (
                  <div key={key} className="flex items-start gap-2 text-xs">
                    <span className="text-amber-400/50 shrink-0">{key}:</span>
                    <span className="text-amber-200/70">{String(value)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function TimelineSection({ events }) {
  if (!events || events.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-amber-200/40 text-sm">
        暂无生产记录
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-amber-500/60 via-amber-500/30 to-transparent" />
      {events.map((event, index) => (
        <EventCard key={event.id} event={event} index={index} />
      ))}
    </div>
  );
}
