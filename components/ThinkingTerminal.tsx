import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, Loader2, Terminal, Cpu, Network } from 'lucide-react';

const LOG_MESSAGES = [
  "Initializing neural handshake...",
  "Parsing query semantics...",
  "Authenticating with search nodes...",
  "Deploying autonomous agents...",
  "Scanning public telegram indices...",
  "Filtering for active signal patterns...",
  "Analysing channel metadata...",
  "Verifying member count integrity...",
  "Cross-referencing ban lists...",
  "Formatting intelligence report...",
  "Finalizing data stream..."
];

const ThinkingTerminal: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs, isExpanded]);

  // Simulate log progression
  useEffect(() => {
    // Add first message immediately
    if (logs.length === 0) {
        setLogs([`> ${LOG_MESSAGES[0]}`]);
    }

    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < LOG_MESSAGES.length - 1) {
          const nextStep = prev + 1;
          const timestamp = new Date().toISOString().split('T')[1].slice(0, 8);
          setLogs(prevLogs => [...prevLogs, `[${timestamp}] ${LOG_MESSAGES[nextStep]}`]);
          return nextStep;
        }
        return prev;
      });
    }, 1800); // Add a new line every 1.8 seconds

    return () => clearInterval(interval);
  }, [logs.length]);

  return (
    <div className="w-full max-w-2xl mx-auto my-12 animate-in fade-in zoom-in duration-500">
      <div className="bg-[#0A0A0A] border border-gray-800 shadow-[0_0_30px_rgba(34,158,217,0.1)] overflow-hidden flex flex-col">
        
        {/* Header Bar */}
        <div 
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between px-4 py-3 bg-[#111] border-b border-gray-800 cursor-pointer hover:bg-[#161616] transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="relative">
                <Loader2 className="w-5 h-5 text-telegram animate-spin" />
                <div className="absolute inset-0 bg-telegram/20 blur-lg animate-pulse"></div>
            </div>
            <div className="flex flex-col">
                <span className="text-white text-xs font-bold uppercase tracking-widest font-mono">
                    AI Agent Active
                </span>
                <span className="text-[10px] text-gray-500 font-mono">
                    Processing Request...
                </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-gray-500 group-hover:text-white transition-colors">
            <span className="text-[10px] uppercase font-bold tracking-wider hidden sm:block">
                {isExpanded ? 'Hide Logs' : 'View Logs'}
            </span>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>

        {/* Terminal Body */}
        {isExpanded && (
            <div className="bg-black/50 p-4 font-mono text-xs h-64 overflow-y-auto custom-scrollbar relative">
                {/* Background Decor */}
                <div className="absolute top-4 right-4 opacity-10 pointer-events-none">
                    <Cpu className="w-24 h-24 text-telegram" />
                </div>

                <div className="space-y-1.5 relative z-10">
                    {logs.map((log, index) => (
                        <div key={index} className="flex items-start gap-2 text-gray-400">
                            <span className="text-telegram font-bold">
                                {index === logs.length - 1 ? '>' : '$'}
                            </span>
                            <span className={index === logs.length - 1 ? 'text-yellow-400 animate-pulse' : 'text-gray-300'}>
                                {log}
                            </span>
                        </div>
                    ))}
                    <div ref={logsEndRef} />
                </div>
            </div>
        )}

        {/* Footer Status */}
        <div className="bg-[#050505] px-4 py-2 border-t border-gray-800 flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-gray-600">
            <div className="flex items-center gap-2">
                <Network className="w-3 h-3" />
                <span>Gemini-3-Flash-Preview</span>
            </div>
            <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></div>
                <span className="text-green-500">Live</span>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ThinkingTerminal;