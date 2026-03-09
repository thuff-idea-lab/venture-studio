"use client";

import { useState, useEffect, useCallback } from "react";
import { Task, CulturalContext } from "@/types";
import { loadPlan, savePlan } from "@/lib/storage";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Modal } from "@/components/Modal";

const culturalOptions: CulturalContext[] = [
  "Hindu",
  "Christian",
  "Jewish",
  "Muslim",
  "Buddhist",
  "Shinto",
  "Multi-faith",
  "Other",
];

const emptyTask: Omit<Task, "id"> = {
  title: "",
  description: "",
  dueDate: "",
  completed: false,
  culturalContext: "Multi-faith",
};

export default function ChecklistPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<string>("All");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [form, setForm] = useState(emptyTask);

  useEffect(() => {
    setTasks(loadPlan().tasks);
  }, []);

  const persist = useCallback((updated: Task[]) => {
    setTasks(updated);
    const plan = loadPlan();
    plan.tasks = updated;
    savePlan(plan);
  }, []);

  const toggleComplete = (id: string) => {
    persist(tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
  };

  const openAdd = () => {
    setEditing(null);
    setForm(emptyTask);
    setModalOpen(true);
  };

  const openEdit = (task: Task) => {
    setEditing(task);
    setForm({ ...task });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.title.trim()) return;
    if (editing) {
      persist(tasks.map((t) => (t.id === editing.id ? { ...editing, ...form } : t)));
    } else {
      persist([...tasks, { ...form, id: crypto.randomUUID() }]);
    }
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    persist(tasks.filter((t) => t.id !== id));
  };

  const filtered = filter === "All" ? tasks : tasks.filter((t) => t.culturalContext === filter);
  const completedCount = tasks.filter((t) => t.completed).length;
  const progress = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-text-primary">
            Wedding Checklist
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {completedCount} of {tasks.length} tasks completed
          </p>
        </div>
        <Button onClick={openAdd}>+ Add Task</Button>
      </div>

      {/* Progress bar */}
      <div className="mt-6">
        <div className="h-3 w-full rounded-full bg-border">
          <div
            className="h-3 rounded-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-1 text-right text-xs text-text-secondary">{progress}%</p>
      </div>

      {/* Filter */}
      <div className="mt-6 flex flex-wrap gap-2">
        {["All", ...culturalOptions].map((opt) => (
          <button
            key={opt}
            onClick={() => setFilter(opt)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filter === opt
                ? "bg-primary text-white"
                : "bg-surface border border-border text-text-secondary hover:border-primary"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>

      {/* Task list */}
      <div className="mt-8 space-y-3">
        {filtered.length === 0 && (
          <Card className="text-center">
            <p className="text-text-secondary">
              {tasks.length === 0
                ? "No tasks yet. Create your first task to get started!"
                : "No tasks match this filter."}
            </p>
            {tasks.length === 0 && (
              <Button className="mt-4" onClick={openAdd}>
                Create Your First Task
              </Button>
            )}
          </Card>
        )}
        {filtered.map((task) => (
          <Card
            key={task.id}
            className={`flex items-start gap-4 ${task.completed ? "opacity-60" : ""}`}
          >
            <input
              type="checkbox"
              checked={task.completed}
              onChange={() => toggleComplete(task.id)}
              className="mt-1 h-5 w-5 rounded border-border accent-primary"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3
                  className={`font-heading text-base font-semibold ${
                    task.completed ? "line-through text-text-secondary" : "text-text-primary"
                  }`}
                >
                  {task.title}
                </h3>
                <span className="rounded-full bg-secondary/40 px-2 py-0.5 text-xs text-text-secondary">
                  {task.culturalContext}
                </span>
              </div>
              <p className="mt-1 text-sm text-text-secondary">{task.description}</p>
              {task.dueDate && (
                <p className="mt-1 text-xs text-text-secondary">
                  Due: {new Date(task.dueDate).toLocaleDateString()}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => openEdit(task)}
                className="text-xs text-text-secondary hover:text-primary"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(task.id)}
                className="text-xs text-text-secondary hover:text-error"
              >
                Delete
              </button>
            </div>
          </Card>
        ))}
      </div>

      {/* Add / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit Task" : "Add Task"}
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-text-primary">Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary outline-none focus:border-primary"
              placeholder="e.g., Book Venue"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-text-primary">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary outline-none focus:border-primary"
              placeholder="Details about this task…"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-text-primary">Due Date</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-text-primary">
                Cultural Context
              </label>
              <select
                value={form.culturalContext}
                onChange={(e) =>
                  setForm({ ...form, culturalContext: e.target.value })
                }
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary outline-none focus:border-primary"
              >
                {culturalOptions.map((opt) => (
                  <option key={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editing ? "Save Changes" : "Add Task"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
