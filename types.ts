export interface ColorStop {
  id: string;
  color: string;
  position: number;
}

export type GradientType = 'linear' | 'radial' | 'conic' | 'mesh' | 'gaussian' | 'bezier' | 'noise';

export interface GradientConfig {
  type: GradientType;
  angle: number; // For linear/conic
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