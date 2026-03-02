interface LiveIndicatorProps {
  lastUpdated: Date | null;
}

export function LiveIndicator({ lastUpdated }: LiveIndicatorProps) {
  const timeStr = lastUpdated
    ? lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null;

  return (
    <div className="flex items-center gap-2 text-xs text-gray-400">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>
      <span className="text-emerald-400 font-medium">Live</span>
      {timeStr && <span>&middot; {timeStr}</span>}
    </div>
  );
}
