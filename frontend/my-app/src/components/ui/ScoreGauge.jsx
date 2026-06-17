import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from 'recharts';

export default function ScoreGauge({ score, label }) {
  let fill = '#ef4444';
  if (score >= 70) fill = '#10b981';
  else if (score >= 40) fill = '#f59e0b';

  const data = [{ name: 'Score', value: score || 0, fill }];

  return (
    <div className="relative w-32 h-32 flex flex-col items-center justify-center">
      <div className="absolute inset-0">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%" cy="50%" innerRadius="70%" outerRadius="100%"
            barSize={10} data={data} startAngle={180} endAngle={0}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
            <RadialBar background clockWise dataKey="value" cornerRadius={10} />
          </RadialBarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-col items-center justify-center mt-4">
        <span className="text-2xl font-black font-mono leading-none" style={{ color: fill }}>
          {score || 0}
        </span>
        {label && <span className="text-[10px] font-bold uppercase text-neutral-400 mt-1">{label}</span>}
      </div>
    </div>
  );
}
