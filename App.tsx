import React, { useState, useCallback } from 'react';
import { AppState, GradientConfig, ColorStop, GeminiAnalysisResult } from './types.ts';
import { analyzeImageColors } from './services/geminiService.ts';
import GradientPreview from './components/GradientPreview.tsx';
import Controls from './components/Controls.tsx';
import Button from './components/Button.tsx';

// Default initial state
const INITIAL_CONFIG: GradientConfig = {
  type: 'linear',
  angle: 135,
  noise: 0.1,
  stops: [
    { id: '1', color: '#111111', position: 0 },
    { id: '2', color: '#FF5A19', position: 100 },
  ]
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(AppState.IDLE);
  const [gradientConfig, setGradientConfig] = useState<GradientConfig>(INITIAL_CONFIG);
  const [analysisData, setAnalysisData] = useState<GeminiAnalysisResult | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (e) => setUploadedImage(e.target?.result as string);
    reader.readAsDataURL(file);

    setState(AppState.ANALYZING);

    try {
      const result = await analyzeImageColors(file);
      setAnalysisData(result);
      
      // Convert result colors to stops
      const newStops: ColorStop[] = result.colors.map((color, index) => ({
        id: `gen-${index}`,
        color: color,
        position: Math.round((index / (result.colors.length - 1)) * 100)
      }));

      setGradientConfig(prev => ({
        ...prev,
        stops: newStops
      }));

      setState(AppState.EDITING);
    } catch (error) {
      console.error("Failed to analyze", error);
      setState(AppState.EDITING); // Fallback to editing manually
    }
  };

  const handleDownload = (format: 'png' | 'css') => {
    if (format === 'css') {
      const stops = [...gradientConfig.stops].sort((a,b) => a.position - b.position)
        .map(s => `${s.color} ${s.position}%`).join(', ');
      
      let css = '';
      if (gradientConfig.type === 'linear') {
        css = `background: linear-gradient(${gradientConfig.angle}deg, ${stops});`;
      } else if (gradientConfig.type === 'radial') {
        css = `background: radial-gradient(circle, ${stops});`;
      } else if (gradientConfig.type === 'conic') {
        css = `background: conic-gradient(from ${gradientConfig.angle}deg, ${stops});`;
      } else {
        alert("This complex gradient type (Mesh/Bezier/Noise) cannot be exported as simple CSS. Please download the PNG instead.");
        return;
      }
      
      navigator.clipboard.writeText(css);
      alert('CSS copied to clipboard!'); 
    } else {
      // For PNG, we need to grab the canvas from the Preview component. 
      const canvas = document.querySelector('canvas');
      if (canvas) {
        const link = document.createElement('a');
        link.download = `luma-gradient-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png', 1.0); // High quality
        link.click();
      }
    }
  };

  return (
    <div className="min-h-screen bg-dark text-offwhite overflow-hidden flex flex-col font-body">
      
      {/* Header */}
      <header className="p-6 flex justify-between items-center z-50">
        <h1 className="font-header text-3xl italic tracking-wide text-white">
          Luma<span className="text-vibrant">Gradient</span>
        </h1>
        {state !== AppState.IDLE && (
          <button 
            onClick={() => { setState(AppState.IDLE); setUploadedImage(null); }}
            className="text-grey hover:text-peach font-mono text-sm underline decoration-1 underline-offset-4"
          >
            Start Over
          </button>
        )}
      </header>

      <main className="flex-1 relative flex flex-col items-center justify-center p-4 md:p-8">
        
        {/* State: IDLE */}
        {state === AppState.IDLE && (
          <div className="text-center max-w-2xl animate-fade-in z-10">
            <h2 className="font-header text-6xl md:text-8xl mb-6 leading-[0.9]">
              Transform Memories <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-peach to-vibrant">
                Into Colors
              </span>
            </h2>
            <p className="font-body text-xl text-grey mb-12 max-w-md mx-auto">
              Upload an image. Gemini AI extracts the soul of your photo and creates a stunning, exportable gradient.
            </p>
            
            <div className="relative inline-block group">
              <Button variant="primary" className="text-xl px-10 py-5 shadow-2xl shadow-vibrant/30">
                Upload Image
              </Button>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* State: ANALYZING */}
        {state === AppState.ANALYZING && (
          <div className="text-center z-10 animate-fade-in">
             <div className="relative w-24 h-24 mx-auto mb-8">
               <div className="absolute inset-0 border-4 border-grey/20 rounded-full"></div>
               <div className="absolute inset-0 border-4 border-t-vibrant border-r-peach border-b-transparent border-l-transparent rounded-full animate-spin"></div>
             </div>
             <h3 className="font-header text-4xl mb-2">Analyzing Harmony</h3>
             <p className="font-mono text-grey text-sm">Gemini is extracting your palette...</p>
             
             {uploadedImage && (
               <div className="mt-8 w-32 h-32 mx-auto rounded-lg overflow-hidden opacity-50 grayscale mix-blend-luminosity">
                 <img src={uploadedImage} alt="Analysis Source" className="w-full h-full object-cover" />
               </div>
             )}
          </div>
        )}

        {/* State: EDITING */}
        {state === AppState.EDITING && (
          <div className="w-full h-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-6 animate-slide-up">
            
            {/* Left: Preview Area - Adjusted from col-span-8 to col-span-7 */}
            <div className="lg:col-span-7 relative rounded-3xl overflow-hidden border border-grey/10 shadow-2xl bg-[#000]">
              <div className="absolute top-4 left-4 z-20 bg-black/40 backdrop-blur px-3 py-1 rounded-full border border-white/10">
                <span className="font-mono text-xs text-white/70">Preview Mode</span>
              </div>
              <GradientPreview config={gradientConfig} className="w-full h-[60vh] lg:h-full" />
              
              {uploadedImage && (
                 <div className="absolute bottom-6 left-6 w-16 h-16 rounded-lg overflow-hidden border-2 border-white/20 hover:scale-150 transition-transform origin-bottom-left z-20">
                   <img src={uploadedImage} alt="Source" className="w-full h-full object-cover" />
                 </div>
              )}
            </div>

            {/* Right: Controls - Adjusted from col-span-4 to col-span-5 for wider area */}
            <div className="lg:col-span-5 h-full">
              <Controls 
                config={gradientConfig} 
                onChange={setGradientConfig}
                onDownload={handleDownload}
                analysisData={analysisData}
              />
            </div>
          </div>
        )}

        {/* Background Ambient Glows */}
        {state === AppState.IDLE && (
           <>
             <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-vibrant/20 rounded-full blur-[120px] pointer-events-none -z-0"></div>
             <div className="fixed bottom-1/4 right-1/4 w-[500px] h-[500px] bg-peach/10 rounded-full blur-[150px] pointer-events-none -z-0"></div>
           </>
        )}

      </main>
    </div>
  );
};

export default App;