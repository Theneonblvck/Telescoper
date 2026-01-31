import React from 'react';

const DynamicLogo: React.FC = () => {
  return (
    <div className="flex items-center justify-center cursor-pointer select-none group">
       <div className="font-display font-bold text-2xl tracking-tighter text-white group-hover:text-telegram transition-colors duration-300">
         [t E l e s C O p e ]
       </div>
    </div>
  );
};

export default DynamicLogo;