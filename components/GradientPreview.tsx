import React, { useRef, useEffect, useState } from 'react';
import { GradientConfig, ColorStop } from '../types.ts';

interface GradientPreviewProps {
  config: GradientConfig;
  className?: string;
  onUpdate?: (newConfig: GradientConfig) => void;
}

const GradientPreview: React.FC<GradientPreviewProps> = ({ config, className = '', onUpdate }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Helper: Get X/Y for a stop, defaulting to a grid if undefined
  const getStopCoords = (stop: ColorStop, index: number, total: number, width: number, height: number) => {
    if (stop.x !== undefined && stop.y !== undefined) {
      return { x: stop.x * width, y: stop.y * height };
    }
    
    // Fallback defaults for Mesh/Gaussian if x/y not yet set
    const isMesh = config.type === 'mesh';
    if (isMesh) {
      const cols = 2; 
      const row = Math.floor(index / cols);
      const col = index % cols;
      // Add visual offset logic same as previous renderer
      let x = (col === 0 ? 0.2 : 0.8) * width;
      if (index >= 4) x = 0.5 * width;
      let y = (0.2 + (row * 0.4)) * height;
      return { x, y };
    } else {
      // Gaussian fallback
      const angle = (index / total) * Math.PI * 2;
      const dist = width * 0.2;
      return {
        x: width/2 + Math.cos(angle) * dist,
        y: height/2 + Math.sin(angle) * dist
      };
    }
  };

  // --- INTERACTION HANDLERS ---
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Only allow dragging for 2D types
    if (config.type !== 'mesh' && config.type !== 'gaussian') return;

    const canvas = canvasRef.current;
    if (!canvas || !onUpdate) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Find clicked stop (within 20px radius)
    // We need to calculate actual positions based on current canvas size
    const reversedStops = [...config.stops].reverse(); // Check top layers first
    
    for (const stop of reversedStops) {
      const idx = config.stops.indexOf(stop);
      const coords = getStopCoords(stop, idx, config.stops.length, rect.width, rect.height);
      const dist = Math.sqrt(Math.pow(x - coords.x, 2) + Math.pow(y - coords.y, 2));
      
      if (dist < 30) { // Hit radius
        setDraggingId(stop.id);
        return;
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (config.type !== 'mesh' && config.type !== 'gaussian') return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Handle Hover State
    if (!draggingId) {
      let found = false;
      const reversedStops = [...config.stops].reverse();
      for (const stop of reversedStops) {
        const idx = config.stops.indexOf(stop);
        const coords = getStopCoords(stop, idx, config.stops.length, rect.width, rect.height);
        const dist = Math.sqrt(Math.pow(x - coords.x, 2) + Math.pow(y - coords.y, 2));
        if (dist < 30) {
          setHoveredId(stop.id);
          found = true;
          break;
        }
      }
      if (!found) setHoveredId(null);
    }

    // Handle Dragging State
    if (draggingId && onUpdate) {
      // Normalize to 0-1
      const normalizedX = Math.max(0, Math.min(1, x / rect.width));
      const normalizedY = Math.max(0, Math.min(1, y / rect.height));

      const newStops = config.stops.map(s => {
        if (s.id === draggingId) {
          return { ...s, x: normalizedX, y: normalizedY };
        }
        return s;
      });

      // We call onUpdate. Note: This might cause rapid re-renders. 
      // React 18 / 19 handles batching well, but for heavy canvas apps 
      // usually we'd use a ref for the render loop and state only for the save.
      // Given the simple complexity here, state update is fine.
      onUpdate({ ...config, stops: newStops });
    }
  };

  const handleMouseUp = () => {
    setDraggingId(null);
  };

  const handleMouseLeave = () => {
    setDraggingId(null);
    setHoveredId(null);
  };

  // --- RENDERING ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // Set high resolution
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    // Check if canvas size actually changed to avoid unnecessary clears if not needed
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
    } else {
        // Reset transform for clearing
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    const width = rect.width;
    const height = rect.height;

    // Clear
    ctx.clearRect(0, 0, width, height);
    
    // Sort stops for linear/radial/conic logic (timeline based)
    const sortedStops = [...config.stops].sort((a, b) => a.position - b.position);

    // --- ALGORITHM RENDERERS ---

    if (config.type === 'linear') {
      const rad = (config.angle - 90) * (Math.PI / 180);
      const x1 = width / 2 + Math.cos(rad) * width;
      const y1 = height / 2 + Math.sin(rad) * height;
      const x2 = width / 2 - Math.cos(rad) * width;
      const y2 = height / 2 - Math.sin(rad) * height;
      
      const gradient = ctx.createLinearGradient(x2, y2, x1, y1);
      sortedStops.forEach(stop => gradient.addColorStop(stop.position / 100, stop.color));
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    } 
    else if (config.type === 'radial') {
      const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) / 1.5);
      sortedStops.forEach(stop => gradient.addColorStop(stop.position / 100, stop.color));
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }
    else if (config.type === 'conic') {
      const rad = (config.angle - 90) * (Math.PI / 180);
      const gradient = ctx.createConicGradient(rad, width / 2, height / 2);
      sortedStops.forEach(stop => gradient.addColorStop(stop.position / 100, stop.color));
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }
    else if (config.type === 'mesh' || config.type === 'gaussian') {
      // Background base
      ctx.fillStyle = sortedStops[0].color;
      ctx.fillRect(0, 0, width, height);

      config.stops.forEach((stop, i) => {
        // Calculate dynamic position
        const coords = getStopCoords(stop, i, config.stops.length, width, height);
        
        // Dynamic radius based on viewport
        const radius = width * (config.type === 'mesh' ? 0.8 : 0.6);

        const grad = ctx.createRadialGradient(coords.x, coords.y, 0, coords.x, coords.y, radius);
        grad.addColorStop(0, stop.color);
        grad.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.fillStyle = grad;
        ctx.globalCompositeOperation = i === 0 ? 'source-over' : 'screen'; // Or 'overlay'
        ctx.fillRect(0, 0, width, height);
      });
      
      ctx.globalCompositeOperation = 'source-over';
    }
    else if (config.type === 'bezier') {
      ctx.fillStyle = sortedStops[0].color;
      ctx.fillRect(0, 0, width, height);
      
      sortedStops.forEach((stop, i) => {
          if (i === 0) return;
          
          ctx.beginPath();
          const yStart = (i / sortedStops.length) * height;
          
          ctx.moveTo(0, yStart);
          ctx.bezierCurveTo(
              width * 0.33, yStart - 200 + (Math.random() * 400), 
              width * 0.66, yStart + 200 - (Math.random() * 400), 
              width, yStart
          );
          ctx.lineTo(width, height);
          ctx.lineTo(0, height);
          ctx.closePath();
          
          const waveGrad = ctx.createLinearGradient(0, 0, 0, height);
          waveGrad.addColorStop(0, stop.color);
          waveGrad.addColorStop(1, sortedStops[Math.min(i+1, sortedStops.length-1)].color);
          ctx.fillStyle = waveGrad;
          
          ctx.globalAlpha = 0.8;
          ctx.fill();
          ctx.globalAlpha = 1.0;
      });
    }
    else if (config.type === 'noise') {
        const linear = ctx.createLinearGradient(0, 0, width, height);
        sortedStops.forEach(s => linear.addColorStop(s.position/100, s.color));
        ctx.fillStyle = linear;
        ctx.fillRect(0, 0, width, height);

        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        const noiseIntensity = 40;
        
        for (let i = 0; i < data.length; i += 4) {
            const x = (i / 4) % width;
            const y = Math.floor((i / 4) / width);
            const nx = x * 0.01;
            const ny = y * 0.01;
            const val = Math.sin(nx * 10 + ny * 5) * Math.cos(nx * 5 - ny * 10);
            const n = (Math.random() - 0.5) * noiseIntensity + (val * 20);
            
            data[i] = Math.max(0, Math.min(255, data[i] + n));
            data[i+1] = Math.max(0, Math.min(255, data[i+1] + n));
            data[i+2] = Math.max(0, Math.min(255, data[i+2] + n));
        }
        ctx.putImageData(imageData, 0, 0);
    }

    // --- GLOBAL NOISE (GRAIN) ---
    if (config.noise > 0 && config.type !== 'noise') {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const intensity = config.noise * 40;

      for (let i = 0; i < data.length; i += 4) {
        const n = (Math.random() - 0.5) * intensity;
        data[i] = Math.max(0, Math.min(255, data[i] + n));
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + n));
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + n));
      }
      ctx.putImageData(imageData, 0, 0);
    }

    // --- UI OVERLAY (HANDLES) ---
    // Only draw handles if we are in a warping mode
    if (config.type === 'mesh' || config.type === 'gaussian') {
        config.stops.forEach((stop, i) => {
            const coords = getStopCoords(stop, i, config.stops.length, width, height);
            
            ctx.beginPath();
            ctx.arc(coords.x, coords.y, 12, 0, Math.PI * 2);
            ctx.fillStyle = stop.color;
            ctx.fill();
            
            // Inner Ring
            ctx.beginPath();
            ctx.arc(coords.x, coords.y, 12, 0, Math.PI * 2);
            ctx.lineWidth = 3;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.stroke();

            // Outer Glow if hovered/dragged
            if (stop.id === hoveredId || stop.id === draggingId) {
                ctx.beginPath();
                ctx.arc(coords.x, coords.y, 16, 0, Math.PI * 2);
                ctx.lineWidth = 2;
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.stroke();
            }
        });
    }

  }, [config, draggingId, hoveredId]);

  return (
    <div className={`relative w-full h-full rounded-2xl overflow-hidden shadow-2xl bg-black ${className}`}>
      <canvas 
        ref={canvasRef} 
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        className={`w-full h-full object-cover touch-none ${
            (config.type === 'mesh' || config.type === 'gaussian') ? 'cursor-move' : 'cursor-default'
        }`}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};

export default GradientPreview;