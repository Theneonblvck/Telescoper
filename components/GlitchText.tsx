import React, { useRef, useEffect } from 'react';

interface GlitchTextProps {
  text?: string;
  width?: number;
  height?: number;
  font?: string;
  className?: string;
  baseColor?: string;
}

const GlitchText: React.FC<GlitchTextProps> = ({ 
  text = "SIGNALS", 
  width = 120, 
  height = 40, 
  font = '800 20px "JetBrains Mono", monospace',
  className = '',
  baseColor = '#FFFFFF'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let frame = 0;
    let isHovering = false;

    // Initialize dimensions
    canvas.width = width;
    canvas.height = height;

    const render = () => {
      frame++;
      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;

      ctx.font = font;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Probabilities
      // Base static twitch: 0.5% chance per frame
      // Hover glitch: 15% chance per frame to be in glitch state
      const isGlitching = isHovering ? Math.random() < 0.15 : Math.random() < 0.005;

      if (isGlitching) {
        // --- Glitch Render ---
        
        // 1. Calculate erratic offsets
        const shakeX = (Math.random() - 0.5) * 6;
        const shakeY = (Math.random() - 0.5) * 2;
        
        // 2. Chromatic Aberration Layers (Red / Cyan split)
        // Red Channel (Left shift)
        ctx.fillStyle = 'rgba(255, 0, 60, 0.8)';
        ctx.fillText(text, centerX + shakeX - 2, centerY + shakeY);
        
        // Cyan Channel (Right shift)
        ctx.fillStyle = 'rgba(0, 230, 255, 0.8)';
        ctx.fillText(text, centerX + shakeX + 2, centerY + shakeY);

        // 3. Main Text (sometimes drop it for a flicker effect)
        if (Math.random() > 0.1) {
            ctx.fillStyle = baseColor;
            ctx.fillText(text, centerX + shakeX, centerY + shakeY);
        }

        // 4. Horizontal Slice/Tear
        // Occasionally slice a portion of the canvas and shift it horizontally
        if (Math.random() > 0.3) {
            const sliceHeight = Math.random() * 20 + 2;
            const sliceY = Math.random() * (height - sliceHeight);
            const sliceOffset = (Math.random() - 0.5) * 15;
            
            try {
                const imageData = ctx.getImageData(0, sliceY, width, sliceHeight);
                ctx.putImageData(imageData, sliceOffset, sliceY);
            } catch (e) {
                // Ignore context errors
            }
        }

      } else {
        // --- Stable Render ---
        
        // Subtle hover state: slight permanent aberration
        if (isHovering) {
             const breathe = Math.sin(frame * 0.1) * 1;
             
             ctx.fillStyle = 'rgba(255, 0, 60, 0.3)';
             ctx.fillText(text, centerX - 1 + breathe, centerY);
             
             ctx.fillStyle = 'rgba(0, 230, 255, 0.3)';
             ctx.fillText(text, centerX + 1 - breathe, centerY);
        }

        // Main Text
        ctx.fillStyle = baseColor;
        // Very slow vertical drift for "suspended" feel
        const floatY = Math.sin(frame * 0.02) * 1.0;
        ctx.fillText(text, centerX, centerY + floatY);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    const handleMouseEnter = () => { isHovering = true; };
    const handleMouseLeave = () => { isHovering = false; };

    canvas.addEventListener('mouseenter', handleMouseEnter);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      canvas.removeEventListener('mouseenter', handleMouseEnter);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [text, font, width, height, baseColor]);

  return (
    <div className={`relative group cursor-pointer select-none ${className}`}>
       <canvas ref={canvasRef} width={width} height={height} className="relative z-10" />
    </div>
  );
};

export default GlitchText;