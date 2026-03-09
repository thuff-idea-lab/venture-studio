export function Footer() {
  return (
    <footer className="border-t border-border bg-surface py-8">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="font-heading text-sm font-semibold text-text-primary">
            Cultural Wedding Planner
          </p>
          <p className="text-xs text-text-secondary">
            Simplifying Your Multicultural Wedding Journey
          </p>
          <div className="flex gap-4 text-xs text-text-secondary">
            <a href="mailto:support@culturalweddingplanner.com" className="hover:text-primary transition-colors">
              Contact Support
            </a>
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-text-secondary">
          &copy; {new Date().getFullYear()} Cultural Wedding Planner. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
