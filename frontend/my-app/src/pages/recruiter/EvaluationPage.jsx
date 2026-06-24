import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
} from 'recharts';
import { CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { generateEvaluation } from '../../api/interviews';
import ScrollReveal from '../../components/ui/ScrollReveal';

const DIMENSION_COLORS = {
  Technical: '#003c33', // brand-green
  Communication: '#1863dc', // accent-blue
  Consistency: '#ff7759', // accent-coral
  Depth: '#071829', // brand-dark
  Confidence: '#a1a1aa', // neutral-400
};

const HIRE_BADGES = {
  strong_yes: { label: 'Strong Yes', bg: 'bg-[#000000]', text: 'text-white' },
  yes: { label: 'Yes', bg: 'bg-[#10b981]', text: 'text-white' },
  maybe: { label: 'Maybe', bg: 'bg-[#f59e0b]', text: 'text-white' },
  no: { label: 'No', bg: 'bg-[#ef4444]', text: 'text-white' },
  strong_no: { label: 'Strong No', bg: 'bg-[#7f1d1d]', text: 'text-white' },
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
        <div className="text-center animate-pulse">
          <Loader2 className="w-12 h-12 text-brand-black animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-bold font-display text-brand-black">Synthesizing Data</h2>
          <p className="text-neutral-500 mt-2">Generating comprehensive evaluation report...</p>
        </div>
      </div>
    );
  }

  if (!evaluation) {
    return (
      <div className="page-container">
        <div className="editorial-card text-center py-20 text-neutral-500 font-medium">No evaluation available.</div>
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

  return (
    <div className="page-container">
      <ScrollReveal>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12 pb-8 border-b-4 border-brand-black">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-3">Evaluation Report</div>
            <h1 className="text-product font-black font-display tracking-tight text-brand-black leading-none mb-4">{evaluation.candidate_name}</h1>
            <p className="text-xl text-neutral-500 font-medium">{evaluation.job_title}</p>
          </div>

          <div className="flex items-end gap-8">
            <div className="text-right">
              <div className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider mb-2">Recommendation</div>
              <div className={`inline-block px-6 py-3 text-lg font-bold uppercase tracking-widest ${hireBadge.bg} ${hireBadge.text}`}>
                {hireBadge.label}
              </div>
            </div>
            
            <div className="w-px h-16 bg-neutral-200" />
            
            <div className="text-right">
              <div className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider mb-2">Overall Score</div>
              <div className="text-5xl font-black font-mono leading-none" style={{ color: evaluation.overall_score >= 70 ? '#10b981' : evaluation.overall_score >= 40 ? '#f59e0b' : '#ef4444' }}>
                {Math.round(evaluation.overall_score)}
              </div>
            </div>
          </div>
        </div>
      </ScrollReveal>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <ScrollReveal delay={50}>
          <div className="editorial-card h-full shadow-flat border-brand-black">
            <h2 className="text-lg font-bold font-display uppercase tracking-widest text-brand-black mb-6">Skill Analysis</h2>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e4e4e7" />
                <PolarAngleAxis dataKey="dimension" tick={{ fill: '#000', fontSize: 12, fontWeight: 600, fontFamily: 'Space Grotesk' }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#71717a', fontSize: 10 }} />
                <Radar dataKey="score" stroke="#000" fill="#000" fillOpacity={0.1} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={100}>
          <div className="editorial-card h-full shadow-flat border-brand-black">
            <h2 className="text-lg font-bold font-display uppercase tracking-widest text-brand-black mb-6">Score Breakdown</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData} layout="vertical">
                <XAxis type="number" domain={[0, 100]} tick={{ fill: '#71717a', fontSize: 10 }} axisLine={{ stroke: '#e4e4e7' }} tickLine={false} />
                <YAxis type="category" dataKey="dimension" width={110} tick={{ fill: '#000', fontSize: 12, fontWeight: 600, fontFamily: 'Space Grotesk' }} axisLine={{ stroke: '#e4e4e7' }} tickLine={false} />
                <Tooltip
                  cursor={{ fill: '#f4f4f5' }}
                  contentStyle={{ background: '#fff', border: '2px solid #000', borderRadius: 0, fontWeight: 600 }}
                />
                <Bar dataKey="score" barSize={24}>
                  {barData.map((entry, index) => <Cell key={index} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ScrollReveal>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <ScrollReveal delay={150}>
          <div className="editorial-card h-full border-brand-black shadow-flat">
            <h2 className="text-lg font-bold font-display uppercase tracking-widest text-brand-black mb-6 border-b-2 border-brand-black pb-4">Key Strengths</h2>
            <ul className="space-y-4">
              {(evaluation.strengths || []).map((s, i) => (
                <li key={i} className="flex items-start gap-4 text-brand-black font-medium leading-relaxed">
                  <CheckCircle className="w-5 h-5 text-[#10b981] flex-shrink-0 mt-0.5" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={200}>
          <div className="editorial-card h-full border-brand-black shadow-flat">
            <h2 className="text-lg font-bold font-display uppercase tracking-widest text-brand-black mb-6 border-b-2 border-brand-black pb-4">Areas of Concern</h2>
            {(evaluation.red_flags || []).length === 0 ? (
              <p className="text-neutral-500 font-medium">No red flags identified.</p>
            ) : (
              <ul className="space-y-4">
                {evaluation.red_flags.map((f, i) => (
                  <li key={i} className="flex items-start gap-4 text-brand-black font-medium leading-relaxed">
                    <AlertTriangle className="w-5 h-5 text-[#ef4444] flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </ScrollReveal>
      </div>

      {Object.keys(evaluation.skill_gap_confirmed || {}).length > 0 && (
        <ScrollReveal delay={250}>
          <div className="editorial-card mb-8 border-brand-black shadow-flat">
            <h2 className="text-lg font-bold font-display uppercase tracking-widest text-brand-black mb-6">Skill Gap Verification</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(evaluation.skill_gap_confirmed).map(([skill, status]) => (
                <div key={skill} className={`p-4 border-2 ${status === 'denied' ? 'border-[#10b981] bg-[#edfce9]' : status === 'confirmed' ? 'border-[#ef4444] bg-red-50' : 'border-neutral-200 bg-neutral-50'}`}>
                  <div className="font-bold text-brand-black mb-1">{skill}</div>
                  <div className={`text-xs font-bold uppercase tracking-widest ${status === 'denied' ? 'text-[#10b981]' : status === 'confirmed' ? 'text-[#ef4444]' : 'text-neutral-500'}`}>
                    {status === 'denied' ? 'Skill Verified' : status === 'confirmed' ? 'Gap Confirmed' : 'Inconclusive'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>
      )}

      <ScrollReveal delay={300}>
        <div className="editorial-card bg-canvas-stone border-none shadow-none">
          <h2 className="text-lg font-bold font-display uppercase tracking-widest text-brand-black mb-6 border-b border-neutral-300 pb-4">Executive Summary</h2>
          <div className="prose prose-neutral max-w-none text-brand-black">
            <p className="text-lg leading-relaxed whitespace-pre-line font-medium">{evaluation.summary_report}</p>
          </div>
        </div>
      </ScrollReveal>
    </div>
  );
}
