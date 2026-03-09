"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/checklist", label: "Checklist" },
  { href: "/timeline", label: "Timeline" },
  { href: "/budget", label: "Budget" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="bg-surface border-b border-border sticky top-0 z-50">
      <nav className="mx-auto flex max-w-[1200px] items-center justify-between px-4 py-3 sm:px-8">
        <Link href="/" className="font-heading text-xl font-bold text-primary">
          Cultural Wedding Planner
        </Link>

        <ul className="flex items-center gap-6">
          {links.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  pathname === href
                    ? "text-primary"
                    : "text-text-secondary"
                }`}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
