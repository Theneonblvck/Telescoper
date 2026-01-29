import React, { useRef, useEffect } from 'react';

const DynamicLogo: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Configuration
    const text = "[ TELESCOPE ]";
    const font = '800 24px "JetBrains Mono", monospace';
    
    let animationFrameId: number;
    let frame = 0;
    let isHovering = false;

    // Set canvas size
    const setSize = () => {
      canvas.width = 300;
      canvas.height = 60;
    };
    setSize();

    const render = () => {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

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

        // 3. Main White Text (sometimes drop it for a flicker effect)
        if (Math.random() > 0.1) {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillText(text, centerX + shakeX, centerY + shakeY);
        }

        // 4. Horizontal Slice/Tear
        // Occasionally slice a portion of the canvas and shift it horizontally
        if (Math.random() > 0.3) {
            const sliceHeight = Math.random() * 20 + 2;
            const sliceY = Math.random() * (canvas.height - sliceHeight);
            const sliceOffset = (Math.random() - 0.5) * 15;
            
            try {
                const imageData = ctx.getImageData(0, sliceY, canvas.width, sliceHeight);
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
        ctx.fillStyle = '#FFFFFF';
        // Very slow vertical drift for "suspended" feel
        const floatY = Math.sin(frame * 0.02) * 1.5;
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
  }, []);

  return (
    <div className="relative group cursor-pointer flex items-center justify-center select-none">
       {/* Ambient Glow backing */}
       <div className="absolute inset-0 bg-telegram/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-full scale-x-150"></div>
       <canvas ref={canvasRef} className="relative z-10" />
    </div>
  );
};

export default DynamicLogo;