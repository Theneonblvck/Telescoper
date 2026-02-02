import React, { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

const Toast: React.FC = () => {
  const { error, setError } = useAppStore();

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, setError]);

  if (!error) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[200] max-w-sm w-full animate-in slide-in-from-bottom-5 fade-in duration-300 pointer-events-auto">
      <div className="bg-[#0A0A0A] border border-red-900/50 shadow-[0_0_40px_rgba(220,38,38,0.25)] p-4 flex items-start gap-4 relative overflow-hidden group rounded-sm backdrop-blur-md">
        {/* Animated Bar */}
        <div className="absolute top-0 left-0 w-1 h-full bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.5)]"></div>
        
        <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5 animate-pulse" />
        
        <div className="flex-1">
          <h4 className="text-red-500 font-bold text-xs uppercase tracking-widest mb-1.5 flex items-center gap-2">
            System Alert
          </h4>
          <p className="text-gray-300 text-xs font-mono leading-relaxed">{error}</p>
        </div>
        
        <button 
          onClick={() => setError(null)}
          className="text-gray-500 hover:text-white transition-colors p-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Toast;