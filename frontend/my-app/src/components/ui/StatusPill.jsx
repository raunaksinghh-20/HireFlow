export default function StatusPill({ status }) {
  const normalized = (status || '').toLowerCase();

  const statusMap = {
    // Interview statuses
    active: 'bg-blue-50 text-action-blue border-blue-200',
    'in progress': 'bg-blue-50 text-action-blue border-blue-200',
    open: 'bg-blue-50 text-action-blue border-blue-200',
    completed: 'bg-[#edfce9] text-[#10b981] border-[#10b981]',
    done: 'bg-[#edfce9] text-[#10b981] border-[#10b981]',
    closed: 'bg-[#edfce9] text-[#10b981] border-[#10b981]',
    failed: 'bg-red-50 text-[#ef4444] border-[#ef4444]',
    abandoned: 'bg-red-50 text-[#ef4444] border-[#ef4444]',

    // Application workflow statuses
    applied: 'bg-blue-50 text-action-blue border-blue-200',
    screening: 'bg-amber-50 text-amber-600 border-amber-300',
    approved: 'bg-[#edfce9] text-[#10b981] border-[#10b981]/30',
    rejected: 'bg-red-50 text-[#ef4444] border-[#ef4444]',
    interview_scheduled: 'bg-purple-50 text-purple-600 border-purple-300',
    interviewed: 'bg-indigo-50 text-indigo-600 border-indigo-300',
    selected: 'bg-[#edfce9] text-[#059669] border-[#059669]',
  };

  const styles = statusMap[normalized] || 'bg-neutral-100 text-neutral-500 border-neutral-200';

  const labelMap = {
    interview_scheduled: 'Interview Scheduled',
  };

  const displayLabel = labelMap[normalized] || status || 'Unknown';

  return (
    <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded border ${styles}`}>
      {displayLabel}
    </span>
  );
}
