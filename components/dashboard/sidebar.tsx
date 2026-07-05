"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/inbox", label: "Lead Inbox" },
  { href: "/pipeline", label: "CRM Pipeline" },
  { href: "/booking", label: "Booking Panel" },
  { href: "/logs", label: "Automation Logs" },
  { href: "/intake", label: "Quick Intake" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-[170px] flex-shrink-0 flex-col border-r border-gray-100 bg-gray-50/50 px-3 py-4">
      <div className="mb-4 px-2 text-sm font-bold text-gray-900">Lead Control</div>
      <nav className="flex flex-col gap-0.5" aria-label="Dashboard sections">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors ${
                isActive ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
