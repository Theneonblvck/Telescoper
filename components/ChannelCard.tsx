import React from 'react';
import { Channel } from '../types';
import { Users, Clock, Check, ExternalLink, Activity } from 'lucide-react';

interface ChannelCardProps {
  channel: Channel;
}

const ChannelCard: React.FC<ChannelCardProps> = ({ channel }) => {
  const formatMembers = (num: number) => {
    if (num <= 0) return 'N/A';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  return (
    <div className="bg-[#0A0A0A] border border-gray-800 hover:border-telegram group transition-all duration-300 flex flex-col h-full relative overflow-hidden">
      {/* Hover Effect Line */}
      <div className="absolute top-0 left-0 w-full h-0.5 bg-telegram transform -translate-x-full group-hover:translate-x-0 transition-transform duration-500"></div>

      <div className="p-6 flex-1">
        <div className="flex items-start gap-4">
          <div className="relative flex-shrink-0">
            {/* Square Avatar as per severe aesthetic */}
            <img 
              src={channel.avatarUrl} 
              alt={channel.name} 
              className="w-16 h-16 object-cover border border-gray-700 bg-gray-900 filter grayscale group-hover:grayscale-0 transition-all duration-300"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(channel.name)}&background=0A0A0A&color=fff&font-size=0.33`;
              }}
            />
            {channel.verified && (
              <div className="absolute -bottom-1 -right-1 bg-yellow-400 p-0.5 border border-[#0A0A0A]">
                <Check className="w-3 h-3 text-black stroke-[3]" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 pt-1">
            <h3 className="text-lg font-bold text-white truncate pr-1 group-hover:text-telegram transition-colors font-mono tracking-tight" title={channel.name}>
              {channel.name}
            </h3>
            <p className="text-xs text-gray-500 truncate font-mono">@{channel.username}</p>
          </div>
        </div>
        
        <div className="mt-5 border-l-2 border-gray-800 pl-3 group-hover:border-telegram/50 transition-colors">
          <p className="text-sm text-gray-400 line-clamp-2 leading-relaxed h-10 font-mono">
            {channel.description || 'No description provided.'}
          </p>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
           <span className="inline-flex items-center px-2 py-1 border border-gray-800 text-[10px] font-bold uppercase tracking-wider text-gray-500 bg-[#050505]">
             {channel.category}
           </span>
           <span className="inline-flex items-center px-2 py-1 border border-gray-800 text-[10px] font-bold uppercase tracking-wider text-gray-500 bg-[#050505]">
             {channel.language}
           </span>
        </div>
      </div>

      <div className="px-6 py-4 bg-[#080808] border-t border-gray-800 flex items-center justify-between">
        <div className="flex flex-col gap-1">
          {channel.members > 0 && (
            <div className="flex items-center gap-2 text-xs text-gray-500" title="Subscribers">
              <Users className="w-3.5 h-3.5 text-telegram" />
              <span className="font-bold text-gray-300">{formatMembers(channel.members)}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-[10px] text-gray-600 uppercase tracking-wide" title="Last Active">
            <Activity className="w-3.5 h-3.5" />
            <span>{channel.lastActive}</span>
          </div>
        </div>
        <a 
          href={`https://t.me/${channel.username}`}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-white hover:bg-yellow-400 text-black text-xs font-bold py-2 px-4 uppercase tracking-widest transition-all hover:scale-105 active:scale-95 flex items-center gap-2 rounded-none"
        >
          Join <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
};

export default ChannelCard;