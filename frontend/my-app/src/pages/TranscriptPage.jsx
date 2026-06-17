import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Bot, User, Clock, Hash, FileText } from 'lucide-react';
import { getTranscript } from '../api/interviews';

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

  if (loading) return <div className="page-container"><div className="glass-card h-96 animate-pulse" /></div>;
  if (!transcript) return <div className="page-container"><div className="glass-card text-center py-16 text-surface-500">Transcript not found</div></div>;

  return (
    <div className="page-container animate-fade-in max-w-4xl mx-auto">
      <div className="glass-card mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">Interview Transcript</h1>
        <div className="flex items-center gap-4 text-sm text-surface-400">
          <span>{transcript.candidate_name}</span>
          <span>{transcript.job_title}</span>
          <span className="flex items-center gap-1"><Hash className="w-3.5 h-3.5" />{transcript.total_turns} turns</span>
          <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" />{transcript.word_count} words</span>
          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{Math.round(transcript.duration_seconds / 60)} min</span>
        </div>
      </div>

      <div className="space-y-4">
        {(transcript.turns || []).map((turn, idx) => (
          <div key={idx} className={`flex gap-3 ${turn.role === 'candidate' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${
              turn.role === 'interviewer' ? 'bg-gradient-to-br from-brand-500 to-brand-600' : 'bg-gradient-to-br from-emerald-500 to-emerald-600'
            }`}>
              {turn.role === 'interviewer' ? <Bot className="w-4 h-4 text-white" /> : <User className="w-4 h-4 text-white" />}
            </div>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
              turn.role === 'interviewer' ? 'bg-surface-800 border border-surface-700' : 'bg-brand-600/20 border border-brand-500/20'
            }`}>
              <p className="text-surface-200 text-sm leading-relaxed">{turn.content}</p>
              <div className="flex items-center gap-3 mt-2">
                {turn.question_type && <span className="text-xs text-surface-500 bg-surface-800/50 rounded-full px-2 py-0.5">{turn.question_type}</span>}
                {turn.answer_score != null && (
                  <span className={`text-xs font-mono ${turn.answer_score >= 70 ? 'text-emerald-400' : turn.answer_score >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
                    Score: {turn.answer_score}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
