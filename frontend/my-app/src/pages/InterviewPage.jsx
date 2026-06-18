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
  const [mode, setMode] = useState('text');

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

  // Voice Recording Logic
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
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
    formData.append('audio_file', audioBlob, 'answer.webm');

    try {
      addAnswer('(Voice answer submitted...)');
      const { data } = await submitVoiceAnswer(formData);
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

  const getDifficultyLabel = () => {
    const labels = ['', 'Easy', 'Medium', 'Challenging', 'Hard', 'Expert'];
    return labels[difficultyLevel] || `Level ${difficultyLevel}`;
  };

  const getDifficultyColor = () => {
    if (difficultyLevel <= 2) return 'text-success';
    if (difficultyLevel <= 3) return 'text-warning';
    return 'text-error';
  };

  // No session yet — start screen
  if (!sessionToken) {
    return (
      <div className="page-container animate-fade-in">
        <div className="max-w-lg mx-auto text-center pt-12">
          <div className="w-16 h-16 bg-deep-green rounded-lg mx-auto mb-6 flex items-center justify-center">
            <Bot className="w-8 h-8 text-on-dark" />
          </div>
          <h1 className="font-display text-card-heading text-primary mb-3">AI Interview</h1>
          <p className="text-body text-muted mb-8">
            {resumeId && jobId
              ? 'Start an adaptive AI interview that adjusts question difficulty based on candidate responses.'
              : 'Select a candidate from a job page to start an interview.'}
          </p>

          {resumeId && jobId && (
            <div className="space-y-6">
              {/* Mode Toggle */}
              <div className="inline-flex p-1 bg-soft-stone rounded-sm">
                <button
                  onClick={() => setMode('text')}
                  className={`px-5 py-2.5 rounded-xs text-btn font-medium transition-colors ${
                    mode === 'text' ? 'bg-canvas text-primary shadow-sm' : 'text-muted hover:text-ink'
                  }`}
                >
                  Text Mode
                </button>
                <button
                  onClick={() => setMode('voice')}
                  className={`px-5 py-2.5 rounded-xs text-btn font-medium transition-colors ${
                    mode === 'voice' ? 'bg-canvas text-primary shadow-sm' : 'text-muted hover:text-ink'
                  }`}
                >
                  Voice Mode
                </button>
              </div>

              <div>
                <button onClick={handleStart} disabled={starting} className="btn-primary">
                  {starting ? 'Starting...' : `Start ${mode === 'voice' ? 'Voice ' : ''}Interview`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Active interview
  return (
    <div className="page-container animate-fade-in max-w-4xl mx-auto flex flex-col" style={{ height: 'calc(100vh - 10rem)' }}>
      {/* Interview Header */}
      <div className="card mb-4 shrink-0 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="heading-feature">{candidateName}</h1>
            {mode === 'voice' && (
              <span className="badge-coral flex items-center gap-1">
                <Mic className="w-3 h-3" /> Voice
              </span>
            )}
            {isPlaying && (
              <span className="flex items-center gap-1 text-micro text-action-blue animate-pulse">
                <Volume2 className="w-4 h-4" /> Speaking...
              </span>
            )}
          </div>
          <p className="text-caption text-muted mt-0.5">{jobTitle}</p>
        </div>
        <div className="flex items-center gap-5 text-caption">
          <div className="text-right">
            <span className={`font-mono font-semibold ${getDifficultyColor()}`}>
              {getDifficultyLabel()}
            </span>
            <div className="text-micro text-muted">Difficulty</div>
          </div>
          <div className="text-right">
            <span className="font-mono font-semibold text-ink">{questionsRemaining}</span>
            <div className="text-micro text-muted">Remaining</div>
          </div>
          {isComplete && <span className="badge-success">Complete</span>}
        </div>
      </div>

      {/* Chat Area */}
      <div className="card mb-4 flex-1 overflow-y-auto p-6">
        <div className="space-y-5">
          {turns.map((turn, idx) => (
            <div key={idx} className={`flex gap-3 ${turn.role === 'candidate' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${
                turn.role === 'interviewer'
                  ? 'bg-deep-green'
                  : 'bg-action-blue'
              }`}>
                {turn.role === 'interviewer'
                  ? <Bot className="w-4 h-4 text-on-dark" />
                  : <User className="w-4 h-4 text-on-dark" />
                }
              </div>
              <div className={`max-w-[75%] rounded-lg px-5 py-3.5 ${
                turn.role === 'interviewer'
                  ? 'bg-soft-stone border border-hairline'
                  : 'bg-pale-blue border border-action-blue/10'
              }`}>
                <p className={`text-body leading-relaxed ${
                  turn.content === '(Voice answer submitted...)' ? 'text-muted italic' : 'text-ink'
                }`}>
                  {turn.content}
                </p>
                {turn.type && (
                  <span className="inline-block mt-2 text-micro text-muted bg-canvas rounded-full px-2.5 py-0.5 border border-hairline">
                    {turn.type.replace('_', ' ')}
                  </span>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-deep-green flex items-center justify-center">
                <Bot className="w-4 h-4 text-on-dark" />
              </div>
              <div className="bg-soft-stone border border-hairline rounded-lg px-5 py-3.5 flex items-center gap-2 text-muted text-body">
                <Loader2 className="w-4 h-4 text-deep-green animate-spin" />
                {mode === 'voice' ? 'Processing audio...' : 'Thinking...'}
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Input Area */}
      {isComplete ? (
        <div className="card text-center shrink-0">
          <CheckCircle className="w-10 h-10 text-success mx-auto mb-3" />
          <p className="text-body text-muted mb-4">Interview complete!</p>
          <button onClick={() => navigate(`/evaluation?interviewId=${interviewId}`)} className="btn-primary">
            View Evaluation
          </button>
        </div>
      ) : (
        <div className="card shrink-0 flex items-center gap-3">
          {mode === 'voice' && (
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isLoading || isPlaying}
              className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                isRecording
                  ? 'bg-error hover:bg-error/90 text-white shadow-[0_0_15px_rgba(179,0,0,0.3)]'
                  : 'bg-soft-stone border border-hairline text-muted hover:text-ink hover:border-primary'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
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
