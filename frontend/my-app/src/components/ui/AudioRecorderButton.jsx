import { Mic, Square, Loader2 } from 'lucide-react';

export default function AudioRecorderButton({ isRecording, isProcessing, onStart, onStop, disabled }) {
  if (isProcessing) {
    return (
      <button disabled className="w-14 h-14 rounded-full flex items-center justify-center bg-neutral-100 text-primary flex-shrink-0 cursor-not-allowed">
        <Loader2 className="w-6 h-6 animate-spin" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={isRecording ? onStop : onStart}
      disabled={disabled}
      className={`w-14 h-14 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
        disabled 
          ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed' 
          : isRecording 
            ? 'bg-coral text-white animate-pulse shadow-[0_0_15px_rgba(255,119,89,0.5)]' 
            : 'bg-primary text-white hover:bg-ink hover:scale-105 active:scale-95'
      }`}
    >
      {isRecording ? <Square className="w-5 h-5 fill-current" /> : <Mic className="w-6 h-6" />}
    </button>
  );
}
