import { useNavigate } from 'react-router-dom';
import { CheckCircle, ArrowRight } from 'lucide-react';
import ScrollReveal from '../../components/ui/ScrollReveal';

export default function InterviewDone() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-6">
      <ScrollReveal>
        <div className="editorial-card text-center py-20 px-8 max-w-lg mx-auto shadow-flat border-primary">
          <div className="w-20 h-20 bg-deep-green flex items-center justify-center rounded-xl mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-emerald-500" />
          </div>
          
          <h1 className="text-display font-bold font-display tracking-tight text-primary mb-4">Interview Complete</h1>
          
          <p className="text-neutral-500 text-lg mb-8">
            Thank you for completing the AI interview. Your responses have been successfully recorded and submitted to the recruitment team.
          </p>
          
          <button onClick={() => navigate('/candidate/dashboard')} className="btn-primary w-full py-4 text-base flex justify-center">
            Return to Dashboard <ArrowRight className="w-5 h-5 ml-2" />
          </button>
        </div>
      </ScrollReveal>
    </div>
  );
}
