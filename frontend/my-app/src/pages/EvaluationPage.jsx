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
  Technical: '#6366f1',
  Communication: '#10b981',
  Consistency: '#f59e0b',
  Depth: '#8b5cf6',
  Confidence: '#ef4444',
};

const HIRE_BADGES = {
  strong_yes: { label: 'Strong Yes', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: CheckCircle },
  yes: { label: 'Yes', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: CheckCircle },
  maybe: { label: 'Maybe', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: HelpCircle },
  no: { label: 'No', color: 'bg-red-500/10 text-red-400 border-red-500/20', icon: XCircle },
  strong_no: { label: 'Strong No', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: XCircle },
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
          <Loader2 className="w-12 h-12 text-brand-400 animate-spin mx-auto mb-4" />
          <p className="text-surface-400">Generating AI evaluation...</p>
        </div>
      </div>
    );
  }

  if (!evaluation) {
    return <div className="page-container"><div className="glass-card text-center py-16 text-surface-500">No evaluation available</div></div>;
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
      <div className="glass-card mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{evaluation.candidate_name}</h1>
          <p className="text-surface-400">{evaluation.job_title}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-3xl font-bold bg-gradient-to-r from-brand-400 to-brand-300 bg-clip-text text-transparent">
              {evaluation.overall_score}
            </div>
            <div className="text-xs text-surface-500">Overall Score</div>
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${hireBadge.color}`}>
            <HireIcon className="w-5 h-5" />
            <span className="font-semibold">{hireBadge.label}</span>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Radar Chart */}
        <div className="glass-card">
          <h2 className="text-lg font-semibold text-white mb-4">Skill Dimensions</h2>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#334155" />
              <PolarAngleAxis dataKey="dimension" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} />
              <Radar dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Bar Chart */}
        <div className="glass-card">
          <h2 className="text-lg font-semibold text-white mb-4">Score Breakdown</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barData} layout="vertical">
              <XAxis type="number" domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis type="category" dataKey="dimension" width={110} tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, color: '#e2e8f0' }}
              />
              <Bar dataKey="score" radius={[0, 6, 6, 0]} barSize={24}>
                {barData.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Strengths & Red Flags */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="glass-card">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-emerald-400" /> Strengths
          </h2>
          <ul className="space-y-2">
            {(evaluation.strengths || []).map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-surface-300">
                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                {s}
              </li>
            ))}
          </ul>
        </div>

        <div className="glass-card">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400" /> Red Flags
          </h2>
          {(evaluation.red_flags || []).length === 0 ? (
            <p className="text-surface-500 text-sm">No red flags identified.</p>
          ) : (
            <ul className="space-y-2">
              {evaluation.red_flags.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-surface-300">
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Skill Gap Confirmation */}
      {Object.keys(evaluation.skill_gap_confirmed || {}).length > 0 && (
        <div className="glass-card mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Skill Gap Verification</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {Object.entries(evaluation.skill_gap_confirmed).map(([skill, status]) => (
              <div key={skill} className={`p-3 rounded-xl border text-center ${
                status === 'denied' ? 'bg-emerald-500/5 border-emerald-500/20' :
                status === 'confirmed' ? 'bg-red-500/5 border-red-500/20' :
                'bg-surface-800/50 border-surface-700'
              }`}>
                <div className="font-medium text-sm text-surface-200">{skill}</div>
                <div className={`text-xs mt-1 ${
                  status === 'denied' ? 'text-emerald-400' : status === 'confirmed' ? 'text-red-400' : 'text-surface-500'
                }`}>
                  {status === 'denied' ? '✓ Has skill' : status === 'confirmed' ? '✗ Gap confirmed' : '? Unclear'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Report */}
      <div className="glass-card">
        <h2 className="text-lg font-semibold text-white mb-4">Summary Report</h2>
        <p className="text-surface-300 leading-relaxed whitespace-pre-line">{evaluation.summary_report}</p>
      </div>
    </div>
  );
}
