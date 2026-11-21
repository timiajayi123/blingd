import React, { memo } from 'react';
import { getPublicMediaUrl } from '@/lib/publicMedia';

export const LogoSVG = memo(({ color = "white", size = 40, className = "" }: { color?: string, size?: number, className?: string }) => (
  <div 
    className={`relative flex items-center justify-center ${className}`} 
    style={{ width: size, height: 'auto', minHeight: size }}
  >
    <img 
      src={getPublicMediaUrl("/placeholder.svg")}
      alt="BLING’D Logo" 
      style={{ 
        width: '100%', 
        height: 'auto', 
        filter: color === "black" ? "brightness(0)" : "brightness(0) invert(1) contrast(200%)",
        opacity: color !== "black" && color !== "white" ? 0.1 : 1
      }} 
    />
  </div>
));

LogoSVG.displayName = "LogoSVG";
