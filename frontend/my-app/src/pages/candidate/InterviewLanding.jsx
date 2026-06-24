import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Mic, Type, ArrowRight, ShieldCheck, Clock } from 'lucide-react';

export default function InterviewLanding() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [mode, setMode] = useState('text');

  const resumeId = searchParams.get('resumeId');
  const jobId = searchParams.get('jobId');

  const handleContinue = () => {
    navigate(`/candidate/interviews/room?resumeId=${resumeId}&jobId=${jobId}&mode=${mode}`);
  };

  return (
    <div className="page-container max-w-3xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-display font-bold font-display tracking-tight text-primary mb-4">Interview Setup</h1>
        <p className="text-neutral-500 text-lg">Please review the instructions and select your preferred interview mode.</p>
      </div>

      <div className="editorial-card shadow-flat mb-8">
        <h3 className="font-bold font-display text-xl mb-6">Before you begin</h3>
        
        <div className="space-y-6">
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-deep-green/10 text-deep-green flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-primary">Time Commitment</h4>
              <p className="text-sm text-neutral-500 mt-1">This interview consists of 8 questions and will take approximately 15-20 minutes.</p>
            </div>
          </div>
          
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-deep-green/10 text-deep-green flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-primary">Data Privacy</h4>
              <p className="text-sm text-neutral-500 mt-1">Your responses will be recorded and analyzed by AI to provide an objective evaluation to the recruitment team.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="editorial-card shadow-flat mb-8">
        <h3 className="font-bold font-display text-xl mb-6">Select Interview Mode</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => setMode('text')}
            className={`p-6 rounded-xl border-2 text-left transition-all ${
              mode === 'text' 
                ? 'border-primary bg-neutral-50 shadow-sm' 
                : 'border-neutral-200 hover:border-neutral-300 bg-white'
            }`}
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${mode === 'text' ? 'bg-primary text-white' : 'bg-neutral-100 text-neutral-500'}`}>
              <Type className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-primary mb-2">Text Chat</h4>
            <p className="text-sm text-neutral-500">Read questions and type your answers at your own pace.</p>
          </button>

          <button
            onClick={() => setMode('voice')}
            className={`p-6 rounded-xl border-2 text-left transition-all ${
              mode === 'voice' 
                ? 'border-primary bg-neutral-50 shadow-sm' 
                : 'border-neutral-200 hover:border-neutral-300 bg-white'
            }`}
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${mode === 'voice' ? 'bg-primary text-white' : 'bg-neutral-100 text-neutral-500'}`}>
              <Mic className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-primary mb-2">Voice Chat</h4>
            <p className="text-sm text-neutral-500">Listen to questions and speak your answers. Requires microphone access.</p>
          </button>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={handleContinue} className="btn-primary px-8 py-4">
          Continue to Room <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
