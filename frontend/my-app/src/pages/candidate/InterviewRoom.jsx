import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Send, Bot, CheckCircle, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import { quitInterview, startInterview, submitAnswer, submitVoiceAnswer } from '../../api/interviews';
import useInterviewStore from '../../store/interviewStore';
import ChatBubble from '../../components/ui/ChatBubble';
import AudioRecorderButton from '../../components/ui/AudioRecorderButton';

export default function InterviewRoom() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const chatEndRef = useRef(null);
  
  const [answer, setAnswer] = useState('');
  const [turnCount, setTurnCount] = useState(1);
  const [starting, setStarting] = useState(false);
  
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const audioRef = useRef(new Audio());
  const [isPlaying, setIsPlaying] = useState(false);

  const {
    sessionToken, interviewId, candidateName, jobTitle, turns,
    difficultyLevel, isComplete, questionsRemaining,
    isLoading, startSession, addAnswer, updateLastCandidateAnswer, processResponse, setLoading, completeInterview,
  } = useInterviewStore();

  const resumeId = searchParams.get('resumeId');
  const jobId = searchParams.get('jobId');
  const mode = searchParams.get('mode') || 'text';

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns]);

  useEffect(() => {
    const audio = audioRef.current;
    const onEnded = () => setIsPlaying(false);
    const onPlay = () => setIsPlaying(true);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('play', onPlay);
    return () => {
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('play', onPlay);
      audio.pause();
    };
  }, []);

  const playAudioBase64 = (base64String) => {
    if (!base64String) return;
    const audioUrl = `data:audio/mp3;base64,${base64String}`;
    audioRef.current.src = audioUrl;
    audioRef.current.play().catch(err => {
      console.error('Audio playback failed:', err);
    });
  };

  const handleStart = async () => {
    if (!resumeId || !jobId) return toast.error('Missing IDs');
    setStarting(true);
    try {
      const { data } = await startInterview({ resume_id: resumeId, job_id: jobId, mode: mode, max_questions: 8 });
      startSession(data);
      setTurnCount(1);
      if (mode === 'voice' && data.audio_base64) playAudioBase64(data.audio_base64);
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (detail && detail.includes('INTERVIEW_ALREADY_COMPLETED')) {
        const msg = detail.split('|')[1] || 'You have already completed the interview for this position.';
        toast.error(msg);
        navigate('/candidate/interviews');
      } else {
        toast.error('Failed to start');
      }
    } finally {
      setStarting(false);
    }
  };

  const handleSubmitText = async (e) => {
    if (e) e.preventDefault();
    if (!answer.trim() || isLoading) return;

    const currentAnswer = answer.trim();
    setAnswer('');
    addAnswer(currentAnswer);
    setLoading(true);

    try {
      const { data } = await submitAnswer({ session_token: sessionToken, answer: currentAnswer, turn: turnCount });
      processResponse(data);
      setTurnCount((prev) => prev + 1);

      if (data.interview_complete) toast.success('Complete!');
      else if (data.audio_base64) playAudioBase64(data.audio_base64);
    } catch {
      toast.error('Failed to submit');
    } finally {
      setLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(t => t.stop());
        await submitVoiceData(audioBlob);
      };
      mediaRecorder.start();
      setIsRecording(true);
    } catch { toast.error('Mic access denied'); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const submitVoiceData = async (audioBlob) => {
    setLoading(true);
    const formData = new FormData();
    formData.append('session_token', sessionToken);
    formData.append('turn', turnCount);
    formData.append('audio_file', audioBlob, 'answer.webm');

    try {
      addAnswer("(Voice answer submitted...)");
      const { data } = await submitVoiceAnswer(formData);
      
      if (data.transcribed_text) {
        updateLastCandidateAnswer(data.transcribed_text);
      }
      
      processResponse(data);
      setTurnCount((prev) => prev + 1);
      if (data.interview_complete) toast.success('Complete!');
      else if (data.audio_base64) playAudioBase64(data.audio_base64);
    } catch { toast.error('Failed'); } finally { setLoading(false); }
  };

  const handleQuit = async () => {
    if (!sessionToken || isLoading) return;
    const shouldQuit = window.confirm('Quit this interview and evaluate based on your progress so far?');
    if (!shouldQuit) return;

    if (isRecording && mediaRecorderRef.current) {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream?.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
    }
    audioRef.current.pause();
    setIsPlaying(false);
    setLoading(true);

    try {
      const { data } = await quitInterview({ session_token: sessionToken });
      completeInterview();
      toast.success('Interview ended. Generating evaluation...');
      navigate(`/evaluation?interviewId=${data.interview_id || interviewId}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to quit interview');
      setLoading(false);
    }
  };

  if (!sessionToken) {
    return (
      <div className="page-container">
        <div className="editorial-card text-center py-20 max-w-lg mx-auto shadow-flat border-primary">
          <div className="w-20 h-20 bg-deep-green flex items-center justify-center rounded-xl mx-auto mb-6">
            <Bot className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-display font-bold font-display text-primary mb-4">AI Interview</h1>
          <p className="text-neutral-500 mb-8">
            {resumeId && jobId ? 'Ready to begin the adaptive evaluation.' : 'Select a candidate from jobs to start.'}
          </p>
          
          {resumeId && jobId && (
            <div className="space-y-6">
              <button onClick={handleStart} disabled={starting} className="btn-primary w-full py-4 text-base">
                {starting ? 'Initializing...' : 'Begin Interview'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="page-container max-w-4xl mx-auto flex flex-col h-[calc(100vh-8rem)] px-0 lg:px-0 py-0 lg:py-4">
      {/* Header */}
      <div className="bg-dark-navy text-white p-6 rounded-t-3xl flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold font-display">{candidateName}</h1>
          <p className="text-sm text-neutral-400 mt-1">{jobTitle}</p>
        </div>
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={handleQuit}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <LogOut className="w-4 h-4" />
            Quit Interview
          </button>
          <div className="text-right">
            <div className="text-sm font-mono font-bold text-coral">Lv {difficultyLevel}/5</div>
            <div className="text-xs text-neutral-400 uppercase tracking-wider">Difficulty</div>
          </div>
          <div className="w-px h-8 bg-neutral-700" />
          <div className="text-right">
            <div className="text-sm font-mono font-bold">{questionsRemaining}</div>
            <div className="text-xs text-neutral-400 uppercase tracking-wider">Q's Left</div>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 bg-canvas-white border-x border-neutral-200 overflow-y-auto p-6 space-y-6">
        {turns.map((turn, idx) => (
          <ChatBubble key={idx} role={turn.role} content={turn.content} metadata={{ type: turn.type }} />
        ))}

        {isLoading && (
          <div className="flex gap-4 animate-pulse">
            <div className="w-10 h-10 rounded-lg bg-dark-navy flex items-center justify-center"><Bot className="w-5 h-5 text-white" /></div>
            <div className="bg-neutral-50 border border-neutral-200 p-4 rounded-2xl">
              <span className="text-neutral-500 text-sm font-mono tracking-widest">Generating...</span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white border border-neutral-200 rounded-b-3xl p-6 shrink-0 shadow-flat-sm">
        {isComplete ? (
          <div className="text-center py-4">
            <CheckCircle className="w-12 h-12 text-success mx-auto mb-4" />
            <h3 className="text-xl font-bold text-primary mb-6">Interview Complete</h3>
            <button onClick={() => navigate('/candidate/interviews/done')} className="btn-primary">
              Finish
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            {mode === 'voice' && (
              <AudioRecorderButton 
                isRecording={isRecording} 
                isProcessing={isLoading || isPlaying} 
                onStart={startRecording} 
                onStop={stopRecording} 
                disabled={isLoading || isPlaying} 
              />
            )}
            <form onSubmit={handleSubmitText} className="flex-1 flex gap-4">
              <input
                className="w-full bg-neutral-100 border-none rounded-xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-primary font-medium"
                placeholder={isRecording ? 'Listening to voice...' : mode === 'voice' ? 'Or type a response...' : 'Type your answer here...'}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                disabled={isLoading || isRecording || isPlaying}
              />
              <button type="submit" disabled={isLoading || isRecording || !answer.trim()} className="btn-primary px-8">
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
