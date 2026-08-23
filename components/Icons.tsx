/** Inline stroke icons matching the design canvas. No icon library — keeps the
 *  bundle small so the app loads fast on a clinic connection. */

interface P {
  size?: number;
}

const base = (size: number, w = 1.9) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: w,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export const IconGrid = ({ size = 19 }: P) => (
  <svg {...base(size)}>
    <rect x="3" y="3" width="7" height="7" rx="2" />
    <rect x="14" y="3" width="7" height="7" rx="2" />
    <rect x="3" y="14" width="7" height="7" rx="2" />
    <rect x="14" y="14" width="7" height="7" rx="2" />
  </svg>
);

export const IconUser = ({ size = 19 }: P) => (
  <svg {...base(size, 1.8)}>
    <circle cx="12" cy="8" r="3.4" />
    <path d="M5 20c0-3.6 3.1-5.6 7-5.6s7 2 7 5.6" />
  </svg>
);

export const IconFlask = ({ size = 19 }: P) => (
  <svg {...base(size)}>
    <path d="M9 3v6.2L5.2 17A2.6 2.6 0 0 0 7.5 21h9a2.6 2.6 0 0 0 2.3-4L15 9.2V3" />
    <path d="M8 3h8M7.4 15h9.2" />
  </svg>
);

export const IconList = ({ size = 19 }: P) => (
  <svg {...base(size)}>
    <rect x="4" y="4" width="16" height="16" rx="3" />
    <path d="M8 9h8M8 13h8M8 17h5" />
  </svg>
);

export const IconExport = ({ size = 15 }: P) => (
  <svg {...base(size, 1.8)}>
    <path d="M12 15V3M8 7l4-4 4 4" />
    <path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" />
  </svg>
);

export const IconGear = ({ size = 19 }: P) => (
  <svg {...base(size)}>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M12 2.6v3M12 18.4v3M21.4 12h-3M5.6 12h-3M18.6 5.4l-2.1 2.1M7.5 16.5l-2.1 2.1M18.6 18.6l-2.1-2.1M7.5 7.5 5.4 5.4" />
  </svg>
);

export const IconLogout = ({ size = 19 }: P) => (
  <svg {...base(size)}>
    <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
    <path d="M10 8 6 12l4 4M6 12h9" />
  </svg>
);

export const IconSearch = ({ size = 16 }: P) => (
  <svg {...base(size, 2)}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.2-3.2" />
  </svg>
);

export const IconBell = ({ size = 17 }: P) => (
  <svg {...base(size, 1.8)}>
    <path d="M18 9a6 6 0 1 0-12 0c0 6-2 7-2 7h16s-2-1-2-7" />
    <path d="M10.5 20a2 2 0 0 0 3 0" />
  </svg>
);

export const IconFile = ({ size = 17 }: P) => (
  <svg {...base(size, 1.8)}>
    <path d="M6 3h8l4 4v14H6z" />
    <path d="M14 3v4h4" />
  </svg>
);

export const IconAlert = ({ size = 17 }: P) => (
  <svg {...base(size, 1.8)}>
    <path d="M12 4 3 19h18L12 4Z" />
    <path d="M12 10v4M12 17h.01" />
  </svg>
);

export const IconCheck = ({ size = 17 }: P) => (
  <svg {...base(size, 1.8)}>
    <path d="m4 12.5 5 5L20 6.5" />
  </svg>
);

export const IconChevronDown = ({ size = 13 }: P) => (
  <svg {...base(size, 2.2)}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const IconPrint = ({ size = 16 }: P) => (
  <svg {...base(size, 1.8)}>
    <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <path d="M6 14h12v8H6z" />
  </svg>
);

export const IconMoon = ({ size = 17 }: P) => (
  <svg {...base(size, 1.8)}>
    <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
  </svg>
);

export const IconSun = ({ size = 17 }: P) => (
  <svg {...base(size, 1.8)}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);

export const IconEdit = ({ size = 15 }: P) => (
  <svg {...base(size, 1.8)}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);

/** Two-letter initials from a name. Generated, never uploaded. */
export function initialsOf(name: string): string {
  // Only word-like parts count, so "Ram (deceased)" does not yield "R(".
  const parts = name
    .trim()
    .split(/[\s._-]+/)
    .map((w) => w.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter((w) => w.length > 0);

  if (parts.length === 0) return "?";
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}
