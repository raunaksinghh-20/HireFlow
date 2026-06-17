import { X } from 'lucide-react';

export default function SkillTag({ skill, variant = 'default', onRemove }) {
  const styles = {
    default: 'badge-neutral',
    success: 'bg-[#edfce9] text-[#10b981] border border-[#10b981]',
    error: 'bg-red-50 text-[#ef4444] border border-[#ef4444]',
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-sm font-medium rounded-full ${styles[variant]}`}>
      {skill}
      {onRemove && (
        <button type="button" onClick={() => onRemove(skill)} className="hover:opacity-70 focus:outline-none ml-1">
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
}
