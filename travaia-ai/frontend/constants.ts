import {
  InterviewType,
  InterviewMode,
  InterviewDifficulty,
  AIVoiceStyle,
} from './types';

export const GEMINI_TEXT_MODEL = 'gemini-2.5-flash-preview-04-17';
export const GEMINI_LIVE_MODEL_ID = 'gemini-2.0-flash-live-001'; // Added for Live API

export const INTERVIEW_TYPES = Object.values(InterviewType);
export const INTERVIEW_MODES = Object.values(InterviewMode);
export const INTERVIEW_DIFFICULTIES = Object.values(InterviewDifficulty);
export const AI_VOICE_STYLES = Object.values(AIVoiceStyle);
