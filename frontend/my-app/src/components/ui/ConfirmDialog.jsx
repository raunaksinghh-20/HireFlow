import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirm", isDestructive = false }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-canvas w-full max-w-md rounded-2xl shadow-flat border border-primary overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${isDestructive ? 'bg-red-50 text-red-600' : 'bg-deep-green/10 text-deep-green'}`}>
              <AlertTriangle className="w-6 h-6" />
            </div>
            <button onClick={onClose} className="text-neutral-400 hover:text-primary transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <h3 className="text-xl font-bold font-display text-primary mb-2">{title}</h3>
          <p className="text-neutral-500">{message}</p>
        </div>
        
        <div className="bg-canvas-stone px-6 py-4 flex items-center justify-end gap-3 border-t border-neutral-200">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button 
            onClick={() => { onConfirm(); onClose(); }} 
            className={`px-4 py-2 rounded-lg font-bold text-sm text-white ${isDestructive ? 'bg-[#ef4444] hover:bg-[#dc2626]' : 'bg-primary hover:bg-ink'}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
