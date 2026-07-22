export interface Problem {
  id: string;
  name: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  description: string;
  constraints: string;
  starterCode: string;
  testCases: Array<{
    input: string;
    output: string;
    isHidden: boolean;
  }>;
}

export interface Chapter {
  id: number;
  title: string;
  description: string;
  problems: Problem[];
}

export interface ProblemsData {
  chapters: Chapter[];
}
