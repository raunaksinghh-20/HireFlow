export default function StatusPill({ status }) {
  const normalized = (status || '').toLowerCase();
  
  let styles = 'bg-neutral-100 text-neutral-500 border-neutral-200';
  if (['active', 'in progress', 'open'].includes(normalized)) {
    styles = 'bg-blue-50 text-action-blue border-blue-200';
  } else if (['completed', 'done', 'closed'].includes(normalized)) {
    styles = 'bg-[#edfce9] text-[#10b981] border-[#10b981]';
  } else if (['failed', 'abandoned', 'rejected'].includes(normalized)) {
    styles = 'bg-red-50 text-[#ef4444] border-[#ef4444]';
  }

  return (
    <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded border ${styles}`}>
      {status || 'Unknown'}
    </span>
  );
}
