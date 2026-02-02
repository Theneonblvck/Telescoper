import React, { useState } from 'react';
import { X, Send, Copy, Check, MessageSquare, Zap, Coffee, ExternalLink, Terminal } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

const CRYPTO_ADDRESSES = [
  { 
    symbol: 'BTC', 
    name: 'Bitcoin', 
    address: 'bc1qzk69y90a74ccys4e04mjr93y5nslsh00geppef',
    color: 'text-orange-500',
    type: 'crypto'
  },
  { 
    symbol: 'LN', 
    name: 'Bitcoin Lightning', 
    address: 'lnbc1p5hmzawdqdgdshx6pqg9c8qpp56fk70mlu4zqwmzfnqvgak3kdjcznq3l7n58qmsvxllrtph5sxz7qsp5n3kklvwvmtxquyx3gwvhg52hcktkjqam2a6jlyv0s3yz34kpwwfq9qrsgqcqpcxqy8ayqrzjqtsjy9p55gdceevp36fvdmrkxqvzfhy8ak2tgc5zgtjtra9xlaz97r9hl5qqw0cqqgqqqqqqqqqqqqqq9grzjqfrjnu747au57n0sn07m0j3r5na7dsufjlxayy7xjj3vegwz0ja3wpamk5qq0uqqquqqqqqqqqqq9gz8698e7umzds5vpu4a7659wl72l8p4vvfty839wjjxz2kepq4qzynqxe5e8evrwukysk4gqtedqm0re2a7m89azcf4wazs07qx0gp5gpwgsze2',
    color: 'text-yellow-400',
    type: 'crypto'
  },
  { 
    symbol: '$', 
    name: 'Cash App', 
    address: '$Ruffclub',
    color: 'text-green-500',
    type: 'link',
    url: 'https://cash.app/$Ruffclub'
  }
];

const SuggestionBox: React.FC = () => {
  const { setSuggestionBoxOpen } = useAppStore();
  const [type, setType] = useState('feature');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setStatus('sending');

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, message }),
      });

      if (response.ok) {
        setStatus('success');
        setMessage('');
        setTimeout(() => {
            if (status !== 'idle') setStatus('idle');
            setSuggestionBoxOpen(false);
        }, 3000); // 3s delay to read message
      } else {
        setStatus('error');
      }
    } catch (error) {
      console.error('Feedback error:', error);
      setStatus('error');
    }
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const formatAddress = (addr: string) => {
    if (addr.length > 16) {
        return `${addr.slice(0, 8)}...${addr.slice(-8)}`;
    }
    return addr;
  };

  const handleRowClick = (item: typeof CRYPTO_ADDRESSES[0], index: number) => {
    if (item.type === 'link' && item.url) {
        window.open(item.url, '_blank');
    } else {
        copyToClipboard(item.address, index);
    }
  };

  const handleCopyBtnClick = (e: React.MouseEvent, text: string, index: number) => {
    e.stopPropagation();
    copyToClipboard(text, index);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/90 backdrop-blur-sm transition-opacity"
        onClick={() => setSuggestionBoxOpen(false)}
      ></div>

      {/* Modal Content */}
      <div className="relative w-full max-w-2xl bg-[#0A0A0A] border border-gray-800 shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-[#111]">
          <div className="flex items-center gap-3">
             <MessageSquare className="w-5 h-5 text-telegram" />
             <h2 className="text-white font-mono font-bold uppercase tracking-widest text-sm">Comms // Feedback</h2>
          </div>
          <button 
            onClick={() => setSuggestionBoxOpen(false)}
            className="text-gray-500 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-10">
          
          {/* Feedback Form */}
          <section>
            <div className="mb-6">
                <h3 className="text-yellow-400 font-mono font-bold uppercase tracking-widest text-xs mb-2">
                    // Transmit Signal
                </h3>
                <p className="text-gray-500 text-xs font-mono">
                    Report glitches, request modules, or establish contact.
                </p>
            </div>

            {status === 'success' ? (
                <div className="relative overflow-hidden border border-green-500/30 bg-green-500/5 p-6 animate-in fade-in zoom-in duration-300">
                    <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>
                    <div className="flex flex-col gap-3 font-mono text-xs relative z-10">
                        <div className="text-green-500 font-bold uppercase tracking-widest flex items-center gap-2 mb-2">
                            <Check className="w-5 h-5" /> Transmission Established
                        </div>
                        <div className="text-gray-300 space-y-1">
                            <p><span className="text-green-500 font-bold">>></span> Packet successfully routed to core.</p>
                            <p><span className="text-green-500 font-bold">>></span> Payload size: {message.length} bytes.</p>
                            <p><span className="text-green-500 font-bold">>></span> Status: <span className="text-white bg-green-900/50 px-1">ACKNOWLEDGED</span></p>
                        </div>
                        <div className="mt-4 text-white font-bold tracking-tight">
                            Thank you for your contribution.
                        </div>
                    </div>
                    {/* Background Tech Decor */}
                    <div className="absolute -right-4 -bottom-4 opacity-10">
                        <Terminal className="w-24 h-24 text-green-500" />
                    </div>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-1">
                            <label className="block text-gray-500 text-[10px] uppercase font-bold tracking-widest mb-1">Signal Type</label>
                            <select 
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                                className="w-full bg-[#050505] border border-gray-700 text-white text-sm p-3 focus:border-telegram focus:outline-none rounded-none font-mono uppercase transition-colors"
                            >
                                <option value="feature">Request Module</option>
                                <option value="bug">Report Glitch</option>
                                <option value="general">General Comms</option>
                            </select>
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-gray-500 text-[10px] uppercase font-bold tracking-widest mb-1">Payload Message</label>
                        <textarea 
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            rows={4}
                            className="w-full bg-[#050505] border border-gray-700 text-white text-sm p-3 focus:border-telegram focus:outline-none rounded-none font-mono placeholder-gray-800 transition-colors"
                            placeholder="Enter your message sequence here..."
                        ></textarea>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                        {status === 'error' && (
                            <span className="text-red-500 text-xs font-bold uppercase bg-red-900/10 px-2 py-1 border border-red-900/50">
                                ⚠ Connection Lost
                            </span>
                        )}
                        <div className="flex-grow"></div>
                        <button 
                            type="submit"
                            disabled={status === 'sending' || !message.trim()}
                            className={`flex items-center gap-2 px-6 py-2.5 font-bold uppercase tracking-widest text-xs transition-all duration-200 border ${
                                status === 'sending' || !message.trim() 
                                ? 'bg-gray-800 text-gray-500 border-transparent cursor-not-allowed' 
                                : 'bg-telegram text-white border-transparent hover:bg-white hover:text-black hover:border-white'
                            }`}
                        >
                            {status === 'sending' ? (
                                <>
                                    <div className="w-3 h-3 border-2 border-gray-500 border-t-white rounded-full animate-spin"></div>
                                    Transmitting...
                                </>
                            ) : (
                                <>
                                    <Send className="w-3 h-3" /> Transmit
                                </>
                            )}
                        </button>
                    </div>
                </form>
            )}
          </section>

          <div className="w-full h-px bg-gray-800"></div>

          {/* Donation / Support */}
          <section>
            <div className="mb-6 flex items-start justify-between">
                <div>
                    <h3 className="text-yellow-400 font-mono font-bold uppercase tracking-widest text-xs mb-2 flex items-center gap-2">
                        <Zap className="w-3 h-3" /> // Fuel The System
                    </h3>
                    <p className="text-gray-500 text-xs font-mono max-w-md">
                        This system operates on voluntary contributions. Support server costs and development cycles via the following secure channels.
                    </p>
                </div>
                <div className="hidden sm:block opacity-20">
                    <Coffee className="w-12 h-12 text-yellow-400" />
                </div>
            </div>

            <div className="grid gap-2">
                {CRYPTO_ADDRESSES.map((crypto, idx) => (
                    <div 
                        key={idx} 
                        onClick={() => handleRowClick(crypto, idx)}
                        className={`bg-[#050505] border border-gray-800 p-2.5 flex items-center justify-between group hover:border-gray-600 transition-all cursor-pointer hover:bg-[#0A0A0A]`}
                        title={crypto.type === 'link' ? "Click to Launch" : "Click to Copy Address"}
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <span className={`text-[10px] font-black uppercase tracking-widest whitespace-nowrap flex-shrink-0 ${crypto.color}`}>
                                {crypto.name} <span className="text-gray-600">[{crypto.symbol}]</span>
                            </span>
                            <code className="text-[10px] text-gray-500 font-mono truncate hidden sm:block">
                                {formatAddress(crypto.address)}
                            </code>
                        </div>
                        
                        <div className="flex items-center">
                            {crypto.type === 'link' && (
                                <span className="mr-3 hidden group-hover:block text-[10px] font-bold text-gray-500 uppercase tracking-widest animate-in fade-in duration-200">
                                    Launch
                                </span>
                            )}
                            <button 
                                onClick={(e) => handleCopyBtnClick(e, crypto.address, idx)}
                                className="ml-3 p-1.5 text-gray-500 hover:text-white hover:bg-white/10 border border-transparent hover:border-gray-700 transition-all"
                                title="Copy Address"
                            >
                                {copiedIndex === idx ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
          </section>

        </div>
      </div>
    </div>
  );
};

export default SuggestionBox;