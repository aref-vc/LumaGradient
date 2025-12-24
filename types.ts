export interface ColorStop {
  id: string;
  color: string;
  position: number;
}

export interface GradientConfig {
  type: 'linear' | 'radial';
  angle: number; // For linear
  stops: ColorStop[];
  noise: number; // 0 to 1
}

export interface GeminiAnalysisResult {
  colors: string[];
  mood: string;
  suggestedName: string;
}

export enum AppState {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  EDITING = 'EDITING',
}