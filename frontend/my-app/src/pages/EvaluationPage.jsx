import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
} from 'recharts';
import { Award, AlertTriangle, CheckCircle, XCircle, HelpCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { generateEvaluation } from '../api/interviews';

const DIMENSION_COLORS = {
  Technical: '#003c33',
  Communication: '#1863dc',
  Consistency: '#d97706',
  Depth: '#9b60aa',
  Confidence: '#ff7759',
};

const HIRE_BADGES = {
  strong_yes: { label: 'Strong Yes', cls: 'text-success', bg: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.2)', icon: CheckCircle },
  yes: { label: 'Yes', cls: 'text-success', bg: 'rgba(5,150,105,0.05)', border: '1px solid rgba(5,150,105,0.12)', icon: CheckCircle },
  maybe: { label: 'Maybe', cls: 'text-warning', bg: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.15)', icon: HelpCircle },
  no: { label: 'No', cls: 'text-error', bg: 'rgba(179,0,0,0.08)', border: '1px solid rgba(179,0,0,0.15)', icon: XCircle },
  strong_no: { label: 'Strong No', cls: 'text-error', bg: 'rgba(179,0,0,0.12)', border: '1px solid rgba(179,0,0,0.2)', icon: XCircle },
};

export default function EvaluationPage() {
  const [searchParams] = useSearchParams();
  const interviewId = searchParams.get('interviewId');
  const [evaluation, setEvaluation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (interviewId) {
      generateEvaluation(interviewId)
        .then((r) => setEvaluation(r.data))
        .catch((err) => toast.error(err.response?.data?.detail || 'Failed to generate evaluation'))
        .finally(() => setLoading(false));
    }
  }, [interviewId]);

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-deep-green animate-spin mx-auto mb-4" />
          <p className="text-body text-muted">Generating AI evaluation...</p>
        </div>
      </div>
    );
  }

  if (!evaluation) {
    return (
      <div className="page-container">
        <div className="card empty-state">
          <p className="text-body text-muted">No evaluation available.</p>
        </div>
      </div>
    );
  }

  const radarData = [
    { dimension: 'Technical', score: evaluation.technical_score },
    { dimension: 'Communication', score: evaluation.communication_score },
    { dimension: 'Consistency', score: evaluation.consistency_score },
    { dimension: 'Depth', score: evaluation.depth_score },
    { dimension: 'Confidence', score: evaluation.confidence_score },
  ];

  const barData = radarData.map((d) => ({ ...d, fill: DIMENSION_COLORS[d.dimension] }));

  const hireBadge = HIRE_BADGES[evaluation.hire_recommendation] || HIRE_BADGES.maybe;
  const HireIcon = hireBadge.icon;

  return (
    <div className="page-container animate-fade-in max-w-6xl mx-auto">
      {/* Header */}
      <div className="card mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="mono-label mb-2">Evaluation</p>
          <h1 className="font-display text-card-heading text-primary">{evaluation.candidate_name}</h1>
          <p className="text-caption text-muted mt-1">{evaluation.job_title}</p>
        </div>
        <div className="flex items-center gap-5">
          <div className="text-right">
            <div className="font-display text-section-heading text-primary">
              {evaluation.overall_score}
            </div>
            <div className="text-micro text-muted">Overall Score</div>
          </div>
          <div
            className={`flex items-center gap-2 px-5 py-2.5 rounded-pill ${hireBadge.cls}`}
            style={{ background: hireBadge.bg, border: hireBadge.border }}
          >
            <HireIcon className="w-5 h-5" />
            <span className="font-medium text-btn">{hireBadge.label}</span>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Radar Chart */}
        <div className="card">
          <h2 className="heading-feature mb-5">Skill Dimensions</h2>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#d9d9dd" />
              <PolarAngleAxis dataKey="dimension" tick={{ fill: '#616161', fontSize: 12, fontFamily: 'Inter' }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#93939f', fontSize: 10 }} />
              <Radar dataKey="score" stroke="#003c33" fill="#003c33" fillOpacity={0.12} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Bar Chart */}
        <div className="card">
          <h2 className="heading-feature mb-5">Score Breakdown</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barData} layout="vertical">
              <XAxis type="number" domain={[0, 100]} tick={{ fill: '#93939f', fontSize: 11, fontFamily: 'Inter' }} />
              <YAxis type="category" dataKey="dimension" width={110} tick={{ fill: '#616161', fontSize: 12, fontFamily: 'Inter' }} />
              <Tooltip
                contentStyle={{
                  background: '#ffffff',
                  border: '1px solid #d9d9dd',
                  borderRadius: 8,
                  color: '#212121',
                  fontSize: 13,
                  fontFamily: 'Inter',
                }}
              />
              <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={24}>
                {barData.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Strengths & Red Flags */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="card">
          <h2 className="heading-feature flex items-center gap-2 mb-5">
            <Award className="w-5 h-5 text-success" /> Strengths
          </h2>
          <ul className="space-y-3">
            {(evaluation.strengths || []).map((s, i) => (
              <li key={i} className="flex items-start gap-3 text-body text-ink">
                <CheckCircle className="w-4 h-4 text-success flex-shrink-0 mt-1" />
                {s}
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <h2 className="heading-feature flex items-center gap-2 mb-5">
            <AlertTriangle className="w-5 h-5 text-error" /> Red Flags
          </h2>
          {(evaluation.red_flags || []).length === 0 ? (
            <p className="text-body text-muted">No red flags identified.</p>
          ) : (
            <ul className="space-y-3">
              {evaluation.red_flags.map((f, i) => (
                <li key={i} className="flex items-start gap-3 text-body text-ink">
                  <AlertTriangle className="w-4 h-4 text-error flex-shrink-0 mt-1" />
                  {f}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Skill Gap Confirmation */}
      {Object.keys(evaluation.skill_gap_confirmed || {}).length > 0 && (
        <div className="card mb-8">
          <h2 className="heading-feature mb-5">Skill Gap Verification</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {Object.entries(evaluation.skill_gap_confirmed).map(([skill, status]) => (
              <div key={skill} className="p-4 rounded-sm text-center" style={{
                background: status === 'denied' ? 'rgba(5,150,105,0.03)' : status === 'confirmed' ? 'rgba(179,0,0,0.03)' : '#eeece7',
                border: status === 'denied' ? '1px solid rgba(5,150,105,0.15)' : status === 'confirmed' ? '1px solid rgba(179,0,0,0.15)' : '1px solid #d9d9dd',
              }}>
                <div className="font-medium text-caption text-ink">{skill}</div>
                <div className={`text-micro mt-1 ${
                  status === 'denied' ? 'text-success' : status === 'confirmed' ? 'text-error' : 'text-muted'
                }`}>
                  {status === 'denied' ? '✓ Has skill' : status === 'confirmed' ? '✗ Gap confirmed' : '? Unclear'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Report */}
      <div className="card">
        <h2 className="heading-feature mb-5">Summary Report</h2>
        <p className="text-body leading-relaxed whitespace-pre-line" style={{ color: '#616161' }}>
          {evaluation.summary_report}
        </p>
      </div>
    </div>
  );
}
