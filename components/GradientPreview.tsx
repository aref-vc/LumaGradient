import React, { useRef, useEffect } from 'react';
import { GradientConfig } from '../types.ts';

interface GradientPreviewProps {
  config: GradientConfig;
  className?: string;
}

const GradientPreview: React.FC<GradientPreviewProps> = ({ config, className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const generateCSS = () => {
    const sortedStops = [...config.stops].sort((a, b) => a.position - b.position);
    const stopString = sortedStops.map(s => `${s.color} ${s.position}%`).join(', ');
    
    if (config.type === 'linear') {
      return `linear-gradient(${config.angle}deg, ${stopString})`;
    } else {
      return `radial-gradient(circle at center, ${stopString})`;
    }
  };

  // Draw gradient + noise to canvas for high-quality export
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set high resolution
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    // Check if rect is visible to avoid 0x0 size errors
    if (rect.width === 0 || rect.height === 0) return;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Create Gradient
    let gradient;
    if (config.type === 'linear') {
      // Calculate end points based on angle
      const rad = (config.angle - 90) * (Math.PI / 180);
      const x1 = width / 2 + Math.cos(rad) * width; // overflow is fine for gradient calc
      const y1 = height / 2 + Math.sin(rad) * height;
      const x2 = width / 2 - Math.cos(rad) * width;
      const y2 = height / 2 - Math.sin(rad) * height;
      gradient = ctx.createLinearGradient(x2, y2, x1, y1);
    } else {
      gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) / 1.5);
    }

    [...config.stops].sort((a, b) => a.position - b.position).forEach(stop => {
      gradient.addColorStop(stop.position / 100, stop.color);
    });

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Apply Noise using direct pixel manipulation for performance
    if (config.noise > 0) {
      // Get the pixel data from the canvas
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const len = data.length;
      
      // Calculate noise intensity (0 to ~40 maps well to visible grain)
      const intensity = config.noise * 40;

      for (let i = 0; i < len; i += 4) {
        // Generate random noise value between -intensity and +intensity
        const noise = (Math.random() - 0.5) * intensity;
        
        // Add noise to R, G, B channels, clamping between 0 and 255
        data[i] = Math.max(0, Math.min(255, data[i] + noise));     // Red
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise)); // Green
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise)); // Blue
        // Alpha (data[i+3]) remains unchanged
      }

      // Put the modified pixel data back
      ctx.putImageData(imageData, 0, 0);
    }

  }, [config]);

  return (
    <div className={`relative w-full h-full rounded-2xl overflow-hidden shadow-2xl ${className}`}>
      {/* Background Gradient via CSS (smoother than canvas for display) */}
      <div 
        className="absolute inset-0 z-0 transition-all duration-300"
        style={{ background: generateCSS() }}
      />
      
      {/* Noise Overlay (CSS based for preview) */}
      <div 
        className="absolute inset-0 z-10 pointer-events-none opacity-0 mix-blend-overlay transition-opacity duration-300"
        style={{ 
            opacity: config.noise,
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='1'/%3E%3C/svg%3E")`
        }}
      />
      
      {/* Hidden Canvas for Download Generation */}
      <canvas ref={canvasRef} className="hidden" style={{ width: '100%', height: '100%' }} />
    </div>
  );
};

export default GradientPreview;