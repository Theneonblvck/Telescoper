import React from 'react';
import { Channel } from '../types';
import { Users, Clock, CheckCircle, ExternalLink } from 'lucide-react';

interface ChannelCardProps {
  channel: Channel;
}

const ChannelCard: React.FC<ChannelCardProps> = ({ channel }) => {
  const formatMembers = (num: number) => {
    if (num <= 0) return 'Unknown';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-md transition-all duration-300 flex flex-col h-full group">
      <div className="p-5 flex-1">
        <div className="flex items-start gap-4">
          <div className="relative flex-shrink-0">
            <img 
              src={channel.avatarUrl} 
              alt={channel.name} 
              className="w-14 h-14 rounded-full object-cover border border-gray-100 dark:border-gray-700 bg-gray-100 dark:bg-gray-700"
              onError={(e) => {
                // Fallback if image fails (common with dynamic UI avatars)
                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(channel.name)}&background=229ED9&color=fff`;
              }}
            />
            {channel.verified && (
              <div className="absolute -bottom-1 -right-1 bg-white dark:bg-gray-800 rounded-full p-0.5">
                <CheckCircle className="w-5 h-5 text-blue-500 fill-current" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate pr-1 group-hover:text-telegram transition-colors" title={channel.name}>
              {channel.name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">@{channel.username}</p>
          </div>
        </div>
        
        <div className="mt-4">
          <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed h-10">
            {channel.description || 'No description provided.'}
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
           <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
             {channel.category}
           </span>
           <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
             {channel.language}
           </span>
        </div>
      </div>

      <div className="px-5 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <div className="flex flex-col gap-1">
          {channel.members > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400" title="Subscribers">
              <Users className="w-3.5 h-3.5" />
              <span className="font-semibold text-gray-700 dark:text-gray-300">{formatMembers(channel.members)}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500" title="Last Active">
            <Clock className="w-3.5 h-3.5" />
            <span>{channel.lastActive}</span>
          </div>
        </div>
        <a 
          href={`https://t.me/${channel.username}`}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-telegram hover:bg-telegram-dark text-white text-sm font-semibold py-2 px-4 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-telegram flex items-center gap-1"
        >
          Join <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
};

export default ChannelCard;