import { WeddingPlan } from "@/types";
import { getDefaultWeddingPlan } from "./seed-data";

const STORAGE_KEY = "cultural-wedding-planner";

export function loadPlan(): WeddingPlan {
  if (typeof window === "undefined") return getDefaultWeddingPlan();
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const plan = getDefaultWeddingPlan();
    savePlan(plan);
    return plan;
  }
  return JSON.parse(raw) as WeddingPlan;
}

export function savePlan(plan: WeddingPlan): void {
  if (typeof window === "undefined") return;
  plan.updatedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
}
