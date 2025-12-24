import React, { useRef, useEffect } from 'react';
import { GradientConfig } from '../types.ts';

interface GradientPreviewProps {
  config: GradientConfig;
  className?: string;
}

const GradientPreview: React.FC<GradientPreviewProps> = ({ config, className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // Set high resolution
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Clear
    ctx.clearRect(0, 0, width, height);
    
    // Sort stops for linear/radial/conic logic
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
      // Offset by -90deg so 0 is top
      const rad = (config.angle - 90) * (Math.PI / 180);
      const gradient = ctx.createConicGradient(rad, width / 2, height / 2);
      sortedStops.forEach(stop => gradient.addColorStop(stop.position / 100, stop.color));
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }
    else if (config.type === 'mesh' || config.type === 'gaussian') {
      // Mesh/Gaussian Simulation: Draw large soft overlapping circles based on stop colors
      // Gaussian is just Mesh but more centered and random
      const isMesh = config.type === 'mesh';
      
      // Fill background with first color to avoid transparency
      ctx.fillStyle = sortedStops[0].color;
      ctx.fillRect(0, 0, width, height);

      // Use 'screen' or 'overlay' for better blending of lights
      ctx.globalCompositeOperation = 'source-over'; 

      sortedStops.forEach((stop, i) => {
        const percent = stop.position / 100;
        
        // Determine position based on index & type
        let x, y, radius;
        if (isMesh) {
            // Grid-like distribution based on index
            const cols = 2; 
            const row = Math.floor(i / cols);
            const col = i % cols;
            // Add some noise to position based on percent to make it organic
            x = (col === 0 ? 0.2 : 0.8) * width; 
            if (i >= 4) x = 0.5 * width; // Center overflow
            y = (0.2 + (row * 0.4)) * height;
            radius = width * 0.8;
        } else {
            // Gaussian: More random/central
            const angle = (i / sortedStops.length) * Math.PI * 2;
            const dist = width * 0.2;
            x = width/2 + Math.cos(angle) * dist;
            y = height/2 + Math.sin(angle) * dist;
            radius = width * 0.6;
        }

        const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
        grad.addColorStop(0, stop.color);
        grad.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.fillStyle = grad;
        // Blend modes make it look "modern"
        ctx.globalCompositeOperation = i === 0 ? 'source-over' : 'screen'; 
        ctx.fillRect(0, 0, width, height);
      });
      
      // Reset composite
      ctx.globalCompositeOperation = 'source-over';
    }
    else if (config.type === 'bezier') {
      // Draw wavy flow lines
      ctx.fillStyle = sortedStops[0].color;
      ctx.fillRect(0, 0, width, height);
      
      sortedStops.forEach((stop, i) => {
          if (i === 0) return; // Background already filled
          
          ctx.beginPath();
          const yStart = (i / sortedStops.length) * height;
          
          ctx.moveTo(0, yStart);
          // Draw a bezier curve across width
          ctx.bezierCurveTo(
              width * 0.33, yStart - 200 + (Math.random() * 400), 
              width * 0.66, yStart + 200 - (Math.random() * 400), 
              width, yStart
          );
          ctx.lineTo(width, height);
          ctx.lineTo(0, height);
          ctx.closePath();
          
          ctx.fillStyle = stop.color;
          // Apply a slight fade gradient to the wave itself for smoothness
          const waveGrad = ctx.createLinearGradient(0, 0, 0, height);
          waveGrad.addColorStop(0, stop.color);
          waveGrad.addColorStop(1, sortedStops[Math.min(i+1, sortedStops.length-1)].color);
          ctx.fillStyle = waveGrad;
          
          // Smooth blend
          ctx.globalAlpha = 0.8;
          ctx.fill();
          ctx.globalAlpha = 1.0;
      });
    }
    else if (config.type === 'noise') {
        // Draw a base gradient first
        const linear = ctx.createLinearGradient(0, 0, width, height);
        sortedStops.forEach(s => linear.addColorStop(s.position/100, s.color));
        ctx.fillStyle = linear;
        ctx.fillRect(0, 0, width, height);

        // We will do pixel manipulation for noise cloud effect
        // NOTE: This is heavy, so we do it on a smaller buffer if needed, but for now direct.
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        
        // Simple pseudo-noise function
        for (let i = 0; i < data.length; i += 4) {
            const x = (i / 4) % width;
            const y = Math.floor((i / 4) / width);
            
            // Generate simple noise
            // Scale coords
            const nx = x * 0.01;
            const ny = y * 0.01;
            const val = Math.sin(nx * 10 + ny * 5) * Math.cos(nx * 5 - ny * 10);
            
            // Apply contrast
            const factor = (val + 1) / 2; // 0 to 1
            
            // Tint based on stop colors? 
            // Actually, usually "Noise Gradient" means the colors are distributed by noise.
            // Let's interpolate between the first and last color based on noise value.
            
            // For performance and visual, let's just use the existing gradient pixel (data[i])
            // and perturb it heavily with the noise value to create "clouds"
            
            const noiseIntensity = 40;
            const n = (Math.random() - 0.5) * noiseIntensity + (val * 20);
            
            data[i] = Math.max(0, Math.min(255, data[i] + n));
            data[i+1] = Math.max(0, Math.min(255, data[i+1] + n));
            data[i+2] = Math.max(0, Math.min(255, data[i+2] + n));
        }
        ctx.putImageData(imageData, 0, 0);
    }

    // --- GLOBAL NOISE OVERLAY (GRAIN) ---
    // Applies on top of everything including the generated algorithms
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

  }, [config]);

  return (
    <div className={`relative w-full h-full rounded-2xl overflow-hidden shadow-2xl bg-black ${className}`}>
      {/* Canvas for rendering everything */}
      <canvas 
        ref={canvasRef} 
        className="w-full h-full object-cover"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};

export default GradientPreview;