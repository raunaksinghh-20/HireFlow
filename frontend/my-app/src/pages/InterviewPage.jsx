import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Send, Bot, User, Loader2, CheckCircle, Mic, Square, Volume2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { startInterview, submitAnswer, submitVoiceAnswer } from '../api/interviews';
import useInterviewStore from '../store/interviewStore';

export default function InterviewPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const chatEndRef = useRef(null);
  
  // UI States
  const [answer, setAnswer] = useState('');
  const [turnCount, setTurnCount] = useState(1);
  const [starting, setStarting] = useState(false);
  const [mode, setMode] = useState('text'); // 'text' | 'voice'
  
  // Audio Recording States
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Audio Playback
  const audioRef = useRef(new Audio());
  const [isPlaying, setIsPlaying] = useState(false);

  const {
    sessionToken, interviewId, candidateName, jobTitle, turns,
    currentQuestion, difficultyLevel, isComplete, questionsRemaining,
    isLoading, startSession, addAnswer, processResponse, setLoading,
  } = useInterviewStore();

  const resumeId = searchParams.get('resumeId');
  const jobId = searchParams.get('jobId');

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns]);

  // Audio Playback Events
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
      toast.error('Autoplay blocked. Please interact with the page first.');
    });
  };

  const handleStart = async () => {
    if (!resumeId || !jobId) {
      toast.error('Missing resume or job ID');
      return;
    }
    setStarting(true);
    try {
      const { data } = await startInterview({
        resume_id: resumeId,
        job_id: jobId,
        mode: mode,
        max_questions: 8,
      });
      startSession(data);
      setTurnCount(1);
      toast.success('Interview started!');
      
      if (mode === 'voice' && data.audio_base64) {
        playAudioBase64(data.audio_base64);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to start interview');
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
      const { data } = await submitAnswer({
        session_token: sessionToken,
        answer: currentAnswer,
        turn: turnCount,
      });
      processResponse(data);
      setTurnCount((prev) => prev + 1);

      if (data.interview_complete) {
        toast.success('Interview complete! Generating evaluation...');
      } else if (data.audio_base64) {
        playAudioBase64(data.audio_base64);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to submit answer');
    } finally {
      setLoading(false);
    }
  };

  // ----- Voice Recording Logic -----
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop()); // stop mic
        await submitVoiceData(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Mic access error:', err);
      toast.error('Could not access microphone.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const submitVoiceData = async (audioBlob) => {
    if (isLoading) return;
    setLoading(true);

    const formData = new FormData();
    formData.append('session_token', sessionToken);
    formData.append('turn', turnCount);
    // Give a dummy filename, fastapi backend just reads bytes
    formData.append('audio_file', audioBlob, 'answer.webm');

    try {
      // Add a dummy answer to the UI immediately
      addAnswer("(Voice answer submitted...)");

      const { data } = await submitVoiceAnswer(formData);
      
      // Update the dummy answer with transcribed text (not perfectly supported by current store, but processResponse handles the rest)
      // Since processResponse doesn't update candidate answers, we just rely on the history
      processResponse(data);
      setTurnCount((prev) => prev + 1);

      if (data.interview_complete) {
        toast.success('Interview complete! Generating evaluation...');
      } else if (data.audio_base64) {
        playAudioBase64(data.audio_base64);
      }

      if (data.transcribed_text) {
        toast.success(`Transcribed: "${data.transcribed_text.substring(0, 30)}..."`);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to submit voice answer');
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = () => {
    if (difficultyLevel <= 2) return 'text-emerald-400';
    if (difficultyLevel <= 3) return 'text-amber-400';
    return 'text-red-400';
  };

  // No session yet
  if (!sessionToken) {
    return (
      <div className="page-container animate-fade-in">
        <div className="glass-card text-center py-16 max-w-lg mx-auto">
          <Bot className="w-16 h-16 mx-auto text-brand-400 mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">AI Interview</h1>
          <p className="text-surface-400 mb-6">
            {resumeId && jobId
              ? 'Ready to start the adaptive AI interview.'
              : 'Select a candidate from a job page to start an interview.'}
          </p>
          
          {resumeId && jobId && (
            <div className="space-y-6">
              <div className="flex justify-center gap-4 bg-surface-800 p-2 rounded-xl border border-surface-700 w-fit mx-auto">
                <button
                  onClick={() => setMode('text')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    mode === 'text' ? 'bg-surface-700 text-white' : 'text-surface-400 hover:text-surface-200'
                  }`}
                >
                  Text Mode
                </button>
                <button
                  onClick={() => setMode('voice')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    mode === 'voice' ? 'bg-brand-600 text-white' : 'text-surface-400 hover:text-surface-200'
                  }`}
                >
                  Voice Mode
                </button>
              </div>

              <button onClick={handleStart} disabled={starting} className="btn-primary w-full max-w-xs">
                {starting ? 'Starting...' : `Start ${mode === 'voice' ? 'Voice' : ''} Interview`}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="page-container animate-fade-in max-w-4xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="glass-card mb-4 flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-white">{candidateName}</h1>
            {mode === 'voice' && (
              <span className="badge-primary flex items-center gap-1 bg-brand-500/20 text-brand-400 border-brand-500/30">
                <Mic className="w-3 h-3" /> Voice Mode
              </span>
            )}
            {isPlaying && (
              <span className="flex items-center gap-1 text-xs text-brand-400 animate-pulse">
                <Volume2 className="w-4 h-4" /> Speaking...
              </span>
            )}
          </div>
          <p className="text-sm text-surface-400">{jobTitle}</p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className={`font-mono font-bold ${getDifficultyColor()}`}>
            Level {difficultyLevel}/5
          </span>
          <span className="text-surface-500">{questionsRemaining} Qs left</span>
          {isComplete && <span className="badge-success">Complete</span>}
        </div>
      </div>

      {/* Chat */}
      <div className="glass-card mb-4 flex-1 overflow-y-auto">
        <div className="space-y-4">
          {turns.map((turn, idx) => (
            <div key={idx} className={`flex gap-3 ${turn.role === 'candidate' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${
                turn.role === 'interviewer'
                  ? 'bg-gradient-to-br from-brand-500 to-brand-600'
                  : 'bg-gradient-to-br from-emerald-500 to-emerald-600'
              }`}>
                {turn.role === 'interviewer' ? <Bot className="w-4 h-4 text-white" /> : <User className="w-4 h-4 text-white" />}
              </div>
              <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                turn.role === 'interviewer'
                  ? 'bg-surface-800 border border-surface-700'
                  : 'bg-brand-600/20 border border-brand-500/20'
              }`}>
                <p className={`text-sm leading-relaxed ${turn.content === '(Voice answer submitted...)' ? 'text-surface-500 italic' : 'text-surface-200'}`}>
                  {turn.content}
                </p>
                {turn.type && (
                  <span className="inline-block mt-2 text-xs text-surface-500 bg-surface-800/50 rounded-full px-2 py-0.5">
                    {turn.type.replace('_', ' ')}
                  </span>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-surface-800 border border-surface-700 rounded-2xl px-4 py-3 flex items-center gap-2 text-surface-400 text-sm">
                <Loader2 className="w-4 h-4 text-brand-400 animate-spin" />
                {mode === 'voice' ? 'Processing audio...' : 'Thinking...'}
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Input */}
      {isComplete ? (
        <div className="glass-card text-center shrink-0">
          <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
          <p className="text-surface-300 mb-4">Interview complete!</p>
          <button onClick={() => navigate(`/evaluation?interviewId=${interviewId}`)} className="btn-primary">
            View Evaluation
          </button>
        </div>
      ) : (
        <div className="glass-card shrink-0 flex items-center gap-3">
          {mode === 'voice' && (
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isLoading || isPlaying}
              className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                isRecording 
                  ? 'bg-red-500 hover:bg-red-600 animate-pulse text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]' 
                  : 'bg-surface-800 border border-surface-600 text-surface-300 hover:text-white hover:border-brand-500'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isRecording ? <Square className="w-5 h-5 fill-current" /> : <Mic className="w-5 h-5" />}
            </button>
          )}

          <form onSubmit={handleSubmitText} className="flex gap-3 flex-1">
            <input
              className="input-field flex-1"
              placeholder={isRecording ? 'Listening...' : mode === 'voice' ? 'Or type your answer here...' : 'Type your answer...'}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              disabled={isLoading || isRecording || isPlaying}
              autoFocus
            />
            <button 
              type="submit" 
              disabled={isLoading || isRecording || isPlaying || !answer.trim()} 
              className="btn-primary px-4"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
