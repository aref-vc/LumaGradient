import React from 'react';
import { GradientConfig, ColorStop, GradientType } from '../types.ts';
import Button from './Button.tsx';

interface ControlsProps {
  config: GradientConfig;
  onChange: (config: GradientConfig) => void;
  onDownload: (format: 'png' | 'css') => void;
  analysisData: { mood: string; suggestedName: string } | null;
}

const Controls: React.FC<ControlsProps> = ({ config, onChange, onDownload, analysisData }) => {
  
  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...config, type: e.target.value as GradientType });
  };

  const handleAngleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...config, angle: parseInt(e.target.value) });
  };

  const handleNoiseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...config, noise: parseFloat(e.target.value) });
  };

  const handleColorChange = (id: string, newColor: string) => {
    const newStops = config.stops.map(s => s.id === id ? { ...s, color: newColor } : s);
    onChange({ ...config, stops: newStops });
  };

  const handlePositionChange = (id: string, newPos: number) => {
    const newStops = config.stops.map(s => s.id === id ? { ...s, position: newPos } : s);
    onChange({ ...config, stops: newStops });
  };

  const removeStop = (id: string) => {
    if (config.stops.length <= 2) return;
    onChange({ ...config, stops: config.stops.filter(s => s.id !== id) });
  };

  const addStop = () => {
    const newId = Math.random().toString(36).substr(2, 9);
    // Find a gap or add to end
    const lastPos = config.stops[config.stops.length - 1].position;
    const newPos = Math.min(lastPos + 10, 100);
    
    const newStop: ColorStop = { 
      id: newId, 
      color: '#ffffff', 
      position: newPos,
      // Random position for 2D meshes
      x: 0.2 + Math.random() * 0.6,
      y: 0.2 + Math.random() * 0.6
    };
    onChange({ ...config, stops: [...config.stops, newStop] });
  };

  return (
    <div className="flex flex-col h-full bg-dark/50 backdrop-blur-md p-6 rounded-2xl border border-grey/20 animate-slide-up overflow-y-auto custom-scrollbar">
      
      {/* Header Info */}
      <div className="mb-8 border-b border-grey/30 pb-4">
        <h2 className="font-header text-4xl text-peach mb-1">
          {analysisData?.suggestedName || "Custom Gradient"}
        </h2>
        <p className="font-body text-grey text-sm tracking-widest uppercase">
          {analysisData?.mood || "Create your vibe"}
        </p>
      </div>

      {/* Main Controls */}
      <div className="space-y-8 flex-1">
        
        {/* Type Selection */}
        <div className="space-y-2">
          <label className="font-body text-offwhite text-sm font-bold">Algorithm</label>
          <div className="relative">
            <select
              value={config.type}
              onChange={handleTypeChange}
              className="w-full bg-grey/10 border border-grey/30 rounded-lg p-3 text-offwhite appearance-none focus:border-vibrant outline-none font-body font-bold cursor-pointer hover:bg-grey/20 transition-colors"
            >
              <option value="linear">Linear Gradient</option>
              <option value="radial">Radial Gradient</option>
              <option value="conic">Conic Gradient</option>
              <option value="mesh">Mesh Gradient</option>
              <option value="gaussian">Gaussian Diffusion</option>
              <option value="bezier">Bezier Flow</option>
              <option value="noise">Noise / Cloud</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-peach">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          {(config.type === 'mesh' || config.type === 'gaussian') && (
            <p className="text-xs text-peach font-mono animate-pulse mt-2">
              ✨ Tip: Drag dots on the preview to warp colors!
            </p>
          )}
        </div>

        {/* Angle (Conditional) */}
        {(config.type === 'linear' || config.type === 'conic') && (
           <div className="flex items-center gap-3 bg-grey/10 p-4 rounded-lg">
             <span className="font-mono text-xs text-grey">ANGLE</span>
             <input 
               type="range" 
               min="0" 
               max="360" 
               value={config.angle} 
               onChange={handleAngleChange}
               className="flex-1 h-1 bg-grey/30 rounded-lg appearance-none cursor-pointer accent-vibrant"
             />
             <span className="font-mono text-xs text-peach w-8 text-right">{config.angle}°</span>
           </div>
        )}

        {/* Noise Control */}
        <div>
          <div className="flex justify-between mb-2">
            <label className="font-body text-offwhite text-sm font-bold">Grain / Texture</label>
            <span className="font-mono text-xs text-peach">{(config.noise * 100).toFixed(0)}%</span>
          </div>
          <input 
            type="range" 
            min="0" 
            max="1" 
            step="0.01" 
            value={config.noise} 
            onChange={handleNoiseChange}
            className="w-full h-1 bg-grey/30 rounded-lg appearance-none cursor-pointer accent-vibrant"
          />
        </div>

        {/* Stops */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <label className="font-body text-offwhite text-sm font-bold">Palette Control</label>
            <button onClick={addStop} className="text-vibrant text-xs font-mono hover:text-white transition-colors uppercase tracking-wider">+ Add Color</button>
          </div>
          
          <div className="space-y-3">
            {config.stops.map((stop) => (
              <div key={stop.id} className="flex items-center gap-3 group bg-grey/5 p-2 rounded-lg border border-transparent hover:border-grey/20 transition-all">
                <div className="relative w-8 h-8 rounded-full overflow-hidden border border-grey/50 shadow-sm">
                  <input 
                    type="color" 
                    value={stop.color}
                    onChange={(e) => handleColorChange(stop.id, e.target.value)}
                    className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] cursor-pointer p-0 m-0 border-0"
                  />
                </div>
                <div className="flex-1 flex flex-col">
                   <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={stop.position}
                    onChange={(e) => handlePositionChange(stop.id, parseInt(e.target.value))}
                    className="w-full h-1 bg-grey/30 rounded-lg appearance-none cursor-pointer accent-peach"
                  />
                </div>
                <span className="font-mono text-xs text-grey w-8 text-right">{stop.position}%</span>
                <button 
                  onClick={() => removeStop(stop.id)}
                  className="text-grey hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                  disabled={config.stops.length <= 2}
                  title="Remove color"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-8 pt-6 border-t border-grey/30 grid grid-cols-2 gap-4">
        <Button variant="outline" onClick={() => onDownload('css')}>Copy CSS</Button>
        <Button variant="primary" onClick={() => onDownload('png')}>Download</Button>
      </div>
    </div>
  );
};

export default Controls;