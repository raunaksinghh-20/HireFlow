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

  const getScoreClass = (score) => {
    if (score >= 70) return 'score-high';
    if (score >= 40) return 'score-mid';
    return 'score-low';
  };

  if (loading) return <div className="page-container"><div className="skeleton h-96" /></div>;
  if (!transcript) return (
    <div className="page-container">
      <div className="card empty-state">
        <FileText className="empty-state-icon" />
        <p className="text-body text-muted">Transcript not found.</p>
      </div>
    </div>
  );

  return (
    <div className="page-container animate-fade-in">
      {/* Header */}
      <div className="card mb-8">
        <p className="mono-label mb-2">Transcript</p>
        <h1 className="font-display text-card-heading text-primary mb-3">Interview Transcript</h1>
        <div className="flex flex-wrap items-center gap-4 text-caption text-muted">
          <span className="font-medium text-ink">{transcript.candidate_name}</span>
          <span>{transcript.job_title}</span>
          <span className="flex items-center gap-1">
            <Hash className="w-3.5 h-3.5" />{transcript.total_turns} turns
          </span>
          <span className="flex items-center gap-1">
            <FileText className="w-3.5 h-3.5" />{transcript.word_count} words
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />{Math.round(transcript.duration_seconds / 60)} min
          </span>
        </div>
      </div>

      {/* Conversation */}
      <div className="space-y-5">
        {(transcript.turns || []).map((turn, idx) => (
          <div key={idx} className={`flex gap-3 ${turn.role === 'candidate' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${
              turn.role === 'interviewer' ? 'bg-deep-green' : 'bg-action-blue'
            }`}>
              {turn.role === 'interviewer'
                ? <Bot className="w-4 h-4 text-on-dark" />
                : <User className="w-4 h-4 text-on-dark" />
              }
            </div>
            <div className={`max-w-[80%] rounded-lg px-5 py-3.5 ${
              turn.role === 'interviewer'
                ? 'bg-soft-stone border border-hairline'
                : 'bg-pale-blue border border-action-blue/10'
            }`}>
              <p className="text-body text-ink leading-relaxed">{turn.content}</p>
              <div className="flex items-center gap-3 mt-2">
                {turn.question_type && (
                  <span className="text-micro text-muted bg-canvas rounded-full px-2.5 py-0.5 border border-hairline">
                    {turn.question_type}
                  </span>
                )}
                {turn.answer_score != null && (
                  <span className={`text-micro font-mono font-medium ${getScoreClass(turn.answer_score)}`}>
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
