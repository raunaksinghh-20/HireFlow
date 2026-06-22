import { Bot, User } from 'lucide-react';

export default function ChatBubble({ role, content, metadata }) {
  const isInterviewer = role === 'interviewer';

  return (
    <div className={`flex gap-4 ${!isInterviewer ? 'flex-row-reverse' : ''}`}>
      <div className={`w-10 h-10 flex-shrink-0 rounded-lg flex items-center justify-center ${isInterviewer ? 'bg-dark-navy' : 'bg-soft-stone border border-neutral-200'}`}>
        {isInterviewer ? <Bot className="w-5 h-5 text-white" /> : <User className="w-5 h-5 text-primary" />}
      </div>
      <div className={`max-w-[80%] p-4 rounded-2xl shadow-flat-sm ${isInterviewer ? 'bg-neutral-50 border border-neutral-200' : 'bg-deep-green/5 border border-deep-green/20'}`}>
        <p className="text-primary leading-relaxed whitespace-pre-wrap">{content}</p>
        
        {metadata && (
          <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-neutral-100/50">
            {metadata.type && (
              <span className="badge-neutral text-[9px] uppercase tracking-wider bg-white">{metadata.type.replace(/_/g, ' ')}</span>
            )}
            {metadata.score != null && (
              <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded border ${metadata.score >= 70 ? 'text-[#10b981] border-[#10b981]' : metadata.score >= 40 ? 'text-[#f59e0b] border-[#f59e0b]' : 'text-[#ef4444] border-[#ef4444]'}`}>
                Score: {metadata.score}
              </span>
            )}
            {metadata.difficulty && (
              <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-400">Lv {metadata.difficulty}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
