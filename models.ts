/ARTech/server / models.ts;
// TypeScript interfaces for server-side models matching Flutter/Dart models

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string; // 'student' | 'teacher'
  avatarUrl: string;
}

export interface AuthResult {
  token: string;
  profile: UserProfile;
}

export interface ClassroomModel {
  id: string;
  name: string;
  description: string;
  teacherName: string;
  studentsCount: number;
}

export interface TaskModel {
  id: string;
  classroomId: string;
  title: string;
  description: string;
  type: string; // 'assignment' | 'quiz' | 'announcement' | etc.
  quizId?: string | null;
  dueDate?: string | null; // ISO string
  isCompleted: boolean;
}

export interface QuizModel {
  question: string;
  options: string[];
  correctOption: number;
}
