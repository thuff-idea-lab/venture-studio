import { Task, BudgetItem, WeddingPlan } from "@/types";

export const sampleTasks: Task[] = [
  {
    id: "1",
    title: "Book Venue",
    description: "Find and book the wedding venue that accommodates both ceremony styles.",
    dueDate: "2026-07-01",
    completed: false,
    culturalContext: "Hindu",
  },
  {
    id: "2",
    title: "Send Invitations",
    description: "Design and send out bilingual wedding invitations.",
    dueDate: "2026-08-01",
    completed: false,
    culturalContext: "Christian",
  },
  {
    id: "3",
    title: "Hire Caterer",
    description: "Find a caterer experienced with both cultural cuisines.",
    dueDate: "2026-07-15",
    completed: false,
    culturalContext: "Multi-faith",
  },
  {
    id: "4",
    title: "Select Attire",
    description: "Choose traditional attire for each ceremony (e.g., lehenga and white gown).",
    dueDate: "2026-06-15",
    completed: false,
    culturalContext: "Hindu",
  },
  {
    id: "5",
    title: "Arrange Cultural Rituals",
    description: "Coordinate the Sangeet, Haldi, and rehearsal dinner schedules.",
    dueDate: "2026-08-15",
    completed: false,
    culturalContext: "Multi-faith",
  },
  {
    id: "6",
    title: "Book Photographer",
    description: "Find a photographer experienced with multicultural ceremonies.",
    dueDate: "2026-07-01",
    completed: false,
    culturalContext: "Multi-faith",
  },
  {
    id: "7",
    title: "Arrange Entertainment",
    description: "Book DJ and live musicians for both ceremony receptions.",
    dueDate: "2026-08-01",
    completed: false,
    culturalContext: "Multi-faith",
  },
];

export const sampleBudgetItems: BudgetItem[] = [
  { id: "1", name: "Venue Rental", amount: 5000, category: "Venue" },
  { id: "2", name: "Catering (Indian Menu)", amount: 3000, category: "Catering" },
  { id: "3", name: "Catering (Western Menu)", amount: 2500, category: "Catering" },
  { id: "4", name: "Bridal Lehenga", amount: 1200, category: "Attire" },
  { id: "5", name: "Wedding Gown", amount: 1500, category: "Attire" },
  { id: "6", name: "Floral Decorations", amount: 2000, category: "Decorations" },
  { id: "7", name: "Mandap Setup", amount: 800, category: "Decorations" },
  { id: "8", name: "DJ & Sound System", amount: 1000, category: "Entertainment" },
  { id: "9", name: "Live Band", amount: 1500, category: "Entertainment" },
];

export const sampleTimeline: string[] = [
  "2026-03-09", // 6 months before
  "2026-06-09", // 3 months before
  "2026-08-09", // 1 month before
  "2026-09-02", // 1 week before
  "2026-09-09", // Wedding day
];

export function getDefaultWeddingPlan(): WeddingPlan {
  return {
    id: "default",
    tasks: sampleTasks,
    budget: sampleBudgetItems,
    timeline: sampleTimeline,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
