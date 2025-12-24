import React from 'react';
import { GradientConfig, ColorStop } from '../types.ts';
import Button from './Button.tsx';

interface ControlsProps {
  config: GradientConfig;
  onChange: (config: GradientConfig) => void;
  onDownload: (format: 'png' | 'css') => void;
  analysisData: { mood: string; suggestedName: string } | null;
}

const Controls: React.FC<ControlsProps> = ({ config, onChange, onDownload, analysisData }) => {
  
  const handleTypeChange = (type: 'linear' | 'radial') => {
    onChange({ ...config, type });
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
    const newStop: ColorStop = { id: newId, color: '#ffffff', position: newPos };
    onChange({ ...config, stops: [...config.stops, newStop] });
  };

  return (
    <div className="flex flex-col h-full bg-dark/50 backdrop-blur-md p-6 rounded-2xl border border-grey/20 animate-slide-up overflow-y-auto">
      
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
        
        {/* Type & Angle */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex bg-grey/10 rounded-lg p-1">
            <button 
              onClick={() => handleTypeChange('linear')}
              className={`flex-1 py-2 text-sm font-mono rounded transition-colors ${config.type === 'linear' ? 'bg-vibrant text-white' : 'text-grey hover:text-white'}`}
            >
              Linear
            </button>
            <button 
              onClick={() => handleTypeChange('radial')}
              className={`flex-1 py-2 text-sm font-mono rounded transition-colors ${config.type === 'radial' ? 'bg-vibrant text-white' : 'text-grey hover:text-white'}`}
            >
              Radial
            </button>
          </div>
          
          {config.type === 'linear' && (
             <div className="flex items-center gap-3">
               <span className="font-mono text-xs text-grey">deg</span>
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
        </div>

        {/* Noise Control */}
        <div>
          <div className="flex justify-between mb-2">
            <label className="font-body text-offwhite text-sm font-bold">Grain / Noise</label>
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
            <label className="font-body text-offwhite text-sm font-bold">Colors & Positions</label>
            <button onClick={addStop} className="text-vibrant text-xs font-mono hover:text-white">+ Add Color</button>
          </div>
          
          <div className="space-y-3">
            {config.stops.map((stop) => (
              <div key={stop.id} className="flex items-center gap-3 group">
                <div className="relative w-8 h-8 rounded-full overflow-hidden border border-grey/50">
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
                  className="text-grey hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  disabled={config.stops.length <= 2}
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