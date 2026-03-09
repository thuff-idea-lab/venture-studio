"use client";

import { useState, useEffect, useCallback } from "react";
import { loadPlan, savePlan } from "@/lib/storage";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Modal } from "@/components/Modal";

const milestoneLabels: Record<string, string> = {
  "6_months": "6 Months Before",
  "3_months": "3 Months Before",
  "1_month": "1 Month Before",
  "1_week": "1 Week Before",
  wedding: "Wedding Day",
};

function labelForIndex(i: number): string {
  const keys = Object.keys(milestoneLabels);
  return milestoneLabels[keys[i]] ?? `Milestone ${i + 1}`;
}

export default function TimelinePage() {
  const [dates, setDates] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [newDate, setNewDate] = useState("");

  useEffect(() => {
    setDates(loadPlan().timeline);
  }, []);

  const persist = useCallback((updated: string[]) => {
    const sorted = [...updated].sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime()
    );
    setDates(sorted);
    const plan = loadPlan();
    plan.timeline = sorted;
    savePlan(plan);
  }, []);

  const handleAdd = () => {
    if (!newDate) return;
    persist([...dates, newDate]);
    setNewDate("");
    setModalOpen(false);
  };

  const handleRemove = (index: number) => {
    persist(dates.filter((_, i) => i !== index));
  };

  const today = new Date();

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-text-primary">
            Wedding Timeline
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Track key milestones from planning to the big day
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>+ Add Date</Button>
      </div>

      {/* Timeline visualization */}
      <div className="mt-12">
        {dates.length === 0 ? (
          <Card className="text-center">
            <p className="text-text-secondary">
              No milestone dates yet. Add your wedding date to get started!
            </p>
            <Button className="mt-4" onClick={() => setModalOpen(true)}>
              Add Your First Milestone
            </Button>
          </Card>
        ) : (
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border sm:left-1/2 sm:-translate-x-px" />

            {dates.map((date, i) => {
              const d = new Date(date);
              const isPast = d < today;
              const isToday = d.toDateString() === today.toDateString();

              return (
                <div
                  key={i}
                  className={`relative mb-10 flex items-start ${
                    i % 2 === 0
                      ? "sm:flex-row"
                      : "sm:flex-row-reverse"
                  }`}
                >
                  {/* Content card */}
                  <div className="ml-14 sm:ml-0 sm:w-[calc(50%-2rem)]">
                    <Card
                      className={`${
                        isToday
                          ? "border-primary ring-2 ring-primary/20"
                          : isPast
                          ? "opacity-60"
                          : ""
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-heading text-base font-semibold text-text-primary">
                            {labelForIndex(i)}
                          </p>
                          <p className="mt-1 text-sm text-text-secondary">
                            {d.toLocaleDateString("en-US", {
                              weekday: "long",
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </p>
                          {isPast && !isToday && (
                            <span className="mt-2 inline-block rounded-full bg-success/30 px-2 py-0.5 text-xs text-text-primary">
                              Passed
                            </span>
                          )}
                          {isToday && (
                            <span className="mt-2 inline-block rounded-full bg-primary/20 px-2 py-0.5 text-xs font-semibold text-primary">
                              Today
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleRemove(i)}
                          className="text-xs text-text-secondary hover:text-error"
                        >
                          Remove
                        </button>
                      </div>
                    </Card>
                  </div>

                  {/* Dot */}
                  <div
                    className={`absolute left-4 flex h-5 w-5 items-center justify-center rounded-full border-2 sm:left-1/2 sm:-translate-x-1/2 ${
                      isToday
                        ? "border-primary bg-primary"
                        : isPast
                        ? "border-success bg-success"
                        : "border-border bg-surface"
                    }`}
                  >
                    {isPast && !isToday && (
                      <span className="text-xs text-white">✓</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Date Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Milestone Date"
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-text-primary">Date</label>
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary outline-none focus:border-primary"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd}>Add Date</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
