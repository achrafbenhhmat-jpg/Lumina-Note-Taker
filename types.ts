
export interface QuizItem {
  question: string;
  options: string[];
  correctAnswer: number;
}

export interface FlashCard {
  front: string;
  back: string;
}

export interface ChatMessage {
  role: 'user' | 'buddy';
  text: string;
}

export interface LessonNote {
  id: string;
  title: string;
  timestamp: number;
  duration: string;
  transcript: string;
  summary: string;
  quizzes: QuizItem[];
  flashcards: FlashCard[];
  chatHistory?: ChatMessage[];
}

export type ViewState = 'list' | 'recording' | 'detail' | 'settings';
export type DetailTab = 'summary' | 'quiz' | 'flashcards' | 'buddy';
