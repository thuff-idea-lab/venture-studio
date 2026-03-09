export interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  completed: boolean;
  culturalContext: string;
}

export interface BudgetItem {
  id: string;
  name: string;
  amount: number;
  category: string;
}

export interface WeddingPlan {
  id: string;
  tasks: Task[];
  budget: BudgetItem[];
  timeline: string[];
  createdAt: string;
  updatedAt: string;
}

export type BudgetCategory =
  | "Venue"
  | "Catering"
  | "Attire"
  | "Decorations"
  | "Entertainment";

export type CulturalContext =
  | "Hindu"
  | "Christian"
  | "Jewish"
  | "Muslim"
  | "Buddhist"
  | "Shinto"
  | "Multi-faith"
  | "Other";
