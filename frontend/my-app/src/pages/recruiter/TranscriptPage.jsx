import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Bot, User, Clock, Hash, FileText } from 'lucide-react';
import { getTranscript } from '../../api/interviews';
import ScrollReveal from '../../components/ui/ScrollReveal';
import SkeletonLoader from '../../components/ui/SkeletonLoader';

export default function TranscriptPage() {
  const { interviewId } = useParams();
  const [transcript, setTranscript] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (interviewId) {
      getTranscript(interviewId)
        .then((r) => setTranscript(r.data))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [interviewId]);

  if (loading) return (
    <div className="page-container">
      <SkeletonLoader variant="text" count={6} />
    </div>
  );

  if (!transcript) return (
    <div className="page-container">
      <div className="editorial-card text-center py-20 text-neutral-500 font-medium">Transcript unavailable.</div>
    </div>
  );

  return (
    <div className="page-container">
      <ScrollReveal>
        <div className="border-b-4 border-brand-black pb-8 mb-12">
          <div className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-4">Official Record</div>
          <h1 className="text-product font-black font-display tracking-tight text-brand-black leading-none mb-6">Transcript</h1>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 bg-canvas-stone p-6 rounded-2xl">
            <div>
              <div className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider mb-1">Candidate</div>
              <div className="font-bold text-brand-black truncate">{transcript.candidate_name}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider mb-1">Role</div>
              <div className="font-bold text-brand-black truncate">{transcript.job_title}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider mb-1">Duration</div>
              <div className="font-bold text-brand-black">{Math.round(transcript.duration_seconds / 60)} min</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider mb-1">Length</div>
              <div className="font-bold text-brand-black">{transcript.total_turns} turns</div>
            </div>
          </div>
        </div>
      </ScrollReveal>

      <div className="space-y-8">
        {(transcript.turns || []).map((turn, idx) => (
          <ScrollReveal key={idx} delay={idx * 30}>
            <div className={`flex gap-6 ${turn.role === 'candidate' ? 'flex-row-reverse' : ''}`}>
              <div className="w-12 flex-shrink-0 flex flex-col items-center">
                <div className={`w-12 h-12 flex items-center justify-center rounded-xl ${turn.role === 'interviewer' ? 'bg-brand-dark text-white' : 'bg-canvas-stone border border-neutral-300 text-brand-black'}`}>
                  {turn.role === 'interviewer' ? <Bot className="w-6 h-6" /> : <User className="w-6 h-6" />}
                </div>
              </div>
              
              <div className="flex-1 bg-white border border-neutral-200 p-6 rounded-2xl shadow-flat-sm">
                <p className="text-brand-black text-lg leading-relaxed">{turn.content}</p>
                
                <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-neutral-100">
                  {turn.question_type && (
                    <span className="badge-neutral text-[10px] uppercase tracking-wider">{turn.question_type.replace(/_/g, ' ')}</span>
                  )}
                  {turn.answer_score != null && (
                    <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded border ${turn.answer_score >= 70 ? 'bg-[#edfce9] text-[#10b981] border-[#10b981]' : turn.answer_score >= 40 ? 'bg-orange-50 text-orange-600 border-orange-400' : 'bg-red-50 text-red-600 border-red-400'}`}>
                      Score: {turn.answer_score}
                    </span>
                  )}
                  {turn.difficulty && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Lv {turn.difficulty}</span>
                  )}
                </div>
              </div>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </div>
  );
}
