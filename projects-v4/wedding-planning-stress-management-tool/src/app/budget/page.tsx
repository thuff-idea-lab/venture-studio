"use client";

import { useState, useEffect, useCallback } from "react";
import { BudgetItem, BudgetCategory } from "@/types";
import { loadPlan, savePlan } from "@/lib/storage";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Modal } from "@/components/Modal";

const categories: BudgetCategory[] = [
  "Venue",
  "Catering",
  "Attire",
  "Decorations",
  "Entertainment",
];

const categoryColors: Record<BudgetCategory, string> = {
  Venue: "#FF6F61",
  Catering: "#B2D8C8",
  Attire: "#FFB74D",
  Decorations: "#A8E6CE",
  Entertainment: "#FF8A80",
};

const emptyItem: Omit<BudgetItem, "id"> = {
  name: "",
  amount: 0,
  category: "Venue",
};

export default function BudgetPage() {
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<BudgetItem | null>(null);
  const [form, setForm] = useState(emptyItem);

  useEffect(() => {
    setItems(loadPlan().budget);
  }, []);

  const persist = useCallback((updated: BudgetItem[]) => {
    setItems(updated);
    const plan = loadPlan();
    plan.budget = updated;
    savePlan(plan);
  }, []);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyItem);
    setModalOpen(true);
  };

  const openEdit = (item: BudgetItem) => {
    setEditing(item);
    setForm({ name: item.name, amount: item.amount, category: item.category });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim() || form.amount <= 0) return;
    if (editing) {
      persist(
        items.map((i) =>
          i.id === editing.id ? { ...editing, ...form } : i
        )
      );
    } else {
      persist([...items, { ...form, id: crypto.randomUUID() }]);
    }
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    persist(items.filter((i) => i.id !== id));
  };

  const total = items.reduce((s, i) => s + i.amount, 0);

  const categoryTotals = categories.map((cat) => ({
    category: cat,
    total: items.filter((i) => i.category === cat).reduce((s, i) => s + i.amount, 0),
  }));

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-text-primary">
            Wedding Budget
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Track and manage your wedding expenses
          </p>
        </div>
        <Button onClick={openAdd}>+ Add Expense</Button>
      </div>

      {/* Budget overview */}
      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        {/* Total card */}
        <Card>
          <p className="text-sm font-medium text-text-secondary">Total Budget</p>
          <p className="mt-2 font-heading text-4xl font-bold text-text-primary">
            ${total.toLocaleString()}
          </p>
        </Card>

        {/* Category breakdown */}
        <Card>
          <p className="text-sm font-medium text-text-secondary">
            Budget by Category
          </p>
          <div className="mt-4 space-y-3">
            {categoryTotals.map(({ category, total: catTotal }) => {
              const pct = total > 0 ? Math.round((catTotal / total) * 100) : 0;
              return (
                <div key={category}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-primary">{category}</span>
                    <span className="text-text-secondary">
                      ${catTotal.toLocaleString()} ({pct}%)
                    </span>
                  </div>
                  <div className="mt-1 h-2 w-full rounded-full bg-border">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        backgroundColor:
                          categoryColors[category as BudgetCategory],
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Expense list */}
      <h2 className="mt-10 font-heading text-xl font-semibold text-text-primary">
        All Expenses
      </h2>
      <div className="mt-4 space-y-3">
        {items.length === 0 && (
          <Card className="text-center">
            <p className="text-text-secondary">
              No expenses yet. Add your first expense to start tracking.
            </p>
            <Button className="mt-4" onClick={openAdd}>
              Add Expense
            </Button>
          </Card>
        )}
        {items.map((item) => (
          <Card key={item.id} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span
                className="h-3 w-3 rounded-full"
                style={{
                  backgroundColor:
                    categoryColors[item.category as BudgetCategory] ?? "#E0E0E0",
                }}
              />
              <div>
                <p className="font-medium text-text-primary">{item.name}</p>
                <p className="text-xs text-text-secondary">{item.category}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <p className="font-semibold text-text-primary">
                ${item.amount.toLocaleString()}
              </p>
              <button
                onClick={() => openEdit(item)}
                className="text-xs text-text-secondary hover:text-primary"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(item.id)}
                className="text-xs text-text-secondary hover:text-error"
              >
                Delete
              </button>
            </div>
          </Card>
        ))}
      </div>

      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit Expense" : "Add Expense"}
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-text-primary">Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary outline-none focus:border-primary"
              placeholder="e.g., Venue Rental"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-text-primary">
                Amount ($)
              </label>
              <input
                type="number"
                min={0}
                value={form.amount || ""}
                onChange={(e) =>
                  setForm({ ...form, amount: parseFloat(e.target.value) || 0 })
                }
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-text-primary">
                Category
              </label>
              <select
                value={form.category}
                onChange={(e) =>
                  setForm({ ...form, category: e.target.value })
                }
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary outline-none focus:border-primary"
              >
                {categories.map((cat) => (
                  <option key={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editing ? "Save Changes" : "Add Expense"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
