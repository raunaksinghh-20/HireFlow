export default function ScoreBadge({ score, label }) {
  if (score == null) return <span className="text-xs font-bold text-neutral-400">N/A</span>;
  
  let color = '#ef4444'; // default red
  if (score >= 70) color = '#10b981'; // green
  else if (score >= 40) color = '#f59e0b'; // amber

  return (
    <div className="w-14 h-14 rounded-lg flex flex-col items-center justify-center bg-canvas-stone border border-neutral-200 flex-shrink-0">
      <span className="text-lg font-bold font-mono leading-none" style={{ color }}>
        {score}
      </span>
      {label && (
        <span className="text-[9px] uppercase font-bold text-neutral-400 tracking-wider mt-1">
          {label}
        </span>
      )}
    </div>
  );
}
