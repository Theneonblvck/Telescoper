import React from 'react';
import { Channel, ChannelStatus } from '../types';
import { Users, Clock, Check, ExternalLink, Activity, AlertOctagon, Ban } from 'lucide-react';

interface ChannelCardProps {
  channel: Channel;
}

const ChannelCard: React.FC<ChannelCardProps> = ({ channel }) => {
  const isBanned = channel.status === ChannelStatus.BANNED;
  const isDeleted = channel.status === ChannelStatus.DELETED;
  const isUnavailable = isBanned || isDeleted;

  const formatMembers = (num: number) => {
    if (num <= 0) return 'N/A';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  // Determine styling based on status
  const cardBorderClass = isBanned 
    ? 'border-red-900/50 hover:border-red-500 bg-[#0A0505]' 
    : isDeleted 
        ? 'border-gray-800 opacity-60 bg-[#050505]' 
        : 'border-gray-800 hover:border-yellow-400 bg-[#0A0A0A]';

  const hoverLineColor = isBanned ? 'bg-red-500' : isDeleted ? 'bg-gray-600' : 'bg-yellow-400';

  return (
    <div className={`${cardBorderClass} border group transition-all duration-300 flex flex-col h-full relative overflow-hidden`}>
      {/* Hover Effect Line */}
      <div className={`absolute top-0 left-0 w-full h-0.5 ${hoverLineColor} transform -translate-x-full group-hover:translate-x-0 transition-transform duration-500`}></div>

      {/* Status Overlay Badge if Banned/Deleted */}
      {isBanned && (
        <div className="absolute top-0 right-0 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest px-2 py-1 z-10">
            SUSPENDED
        </div>
      )}
      {isDeleted && (
        <div className="absolute top-0 right-0 bg-gray-700 text-white text-[10px] font-black uppercase tracking-widest px-2 py-1 z-10">
            DELETED
        </div>
      )}

      <div className={`p-6 flex-1 ${isUnavailable ? 'opacity-80' : ''}`}>
        <div className="flex items-start gap-4">
          <div className="relative flex-shrink-0">
            <img 
              src={channel.avatarUrl} 
              alt={channel.name} 
              className={`w-16 h-16 object-cover border border-gray-700 bg-gray-900 transition-all duration-300 ${isUnavailable ? 'grayscale' : 'filter grayscale group-hover:grayscale-0'}`}
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(channel.name)}&background=0A0A0A&color=fff&font-size=0.33`;
              }}
            />
            {channel.verified && !isUnavailable && (
              <div className="absolute -bottom-1 -right-1 bg-yellow-400 p-0.5 border border-[#0A0A0A]">
                <Check className="w-3 h-3 text-black stroke-[3]" />
              </div>
            )}
            {isBanned && (
                <div className="absolute -bottom-1 -right-1 bg-red-600 p-0.5 border border-[#0A0A0A]">
                    <AlertOctagon className="w-3 h-3 text-white stroke-[3]" />
                </div>
            )}
          </div>
          <div className="flex-1 min-w-0 pt-1">
            <h3 className={`text-lg font-bold truncate pr-1 transition-colors font-mono tracking-tight ${isBanned ? 'text-red-500' : isDeleted ? 'text-gray-500 line-through' : 'text-white group-hover:text-yellow-400'}`} title={channel.name}>
              {channel.name}
            </h3>
            <p className="text-xs text-gray-500 truncate font-mono">@{channel.username}</p>
          </div>
        </div>
        
        <div className="mt-5 border-l-2 border-gray-800 pl-3 group-hover:border-opacity-50 transition-colors" style={{ borderColor: isBanned ? '#7f1d1d' : undefined }}>
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

      <div className={`px-6 py-4 border-t flex items-center justify-between ${isBanned ? 'bg-red-950/20 border-red-900/30' : 'bg-[#080808] border-gray-800'}`}>
        <div className="flex flex-col gap-1">
          {channel.members > 0 && !isUnavailable && (
            <div className="flex items-center gap-2 text-xs text-gray-500" title="Subscribers">
              <Users className="w-3.5 h-3.5 text-telegram" />
              <span className="font-bold text-gray-300">{formatMembers(channel.members)}</span>
            </div>
          )}
          {isUnavailable && (
             <div className="flex items-center gap-2 text-xs text-gray-500">
                <Ban className="w-3.5 h-3.5 text-gray-600" />
                <span className="font-bold text-gray-600">INACTIVE</span>
             </div>
          )}
          <div className="flex items-center gap-2 text-[10px] text-gray-600 uppercase tracking-wide" title="Last Active">
            <Activity className="w-3.5 h-3.5" />
            <span>{channel.lastActive}</span>
          </div>
        </div>
        
        {isUnavailable ? (
             <span className="text-xs font-bold text-gray-600 uppercase tracking-widest py-2 px-4 border border-transparent cursor-not-allowed">
                Unreachable
             </span>
        ) : (
            <a 
            href={`https://t.me/${channel.username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white hover:bg-yellow-400 text-black text-xs font-bold py-2 px-4 uppercase tracking-widest transition-all hover:scale-105 active:scale-95 flex items-center gap-2 rounded-none border border-transparent"
            >
            Join <ExternalLink className="w-3 h-3" />
            </a>
        )}
      </div>
    </div>
  );
};

export default ChannelCard;