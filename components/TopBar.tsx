"use client";

import { useEffect, useRef, useState } from "react";
import type { Profile } from "@/lib/db";
import {
  IconGear,
  IconLogout,
  IconMoon,
  IconSearch,
  IconSun,
  IconUser,
  initialsOf,
} from "./Icons";

interface Props {
  profile: Profile;
  query: string;
  onQuery: (q: string) => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onNewPatient: () => void;
  onNewOrder: () => void;
  onSettings: () => void;
  onSignOut: () => void;
}

export function TopBar({
  profile,
  query,
  onQuery,
  theme,
  onToggleTheme,
  onNewPatient,
  onNewOrder,
  onSettings,
  onSignOut,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const anchor = useRef<HTMLDivElement>(null);

  /* Close on outside click or Escape — a menu that traps you is worse than none. */
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!anchor.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <header className="topbar no-print">
      <div className="brand-chip">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/trp-logo.png" alt="" className="brand-logo" />
        <div>
          <div className="brand-name">TRP POLYCLINIC</div>
          <div className="brand-sub">Tandi Ratnanagar · Pathology</div>
        </div>
      </div>

      <div className="searchbar">
        <IconSearch />
        <input
          placeholder="Search patients, MRN or report ID"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          aria-label="Search patients"
        />
      </div>

      <div className="topbar-right">
        <button onClick={onNewPatient}>+ Patient</button>
        <button onClick={onNewOrder}>+ Lab order</button>
        <button disabled title="Billing is not built yet">
          + Invoice
        </button>

        <button
          className="icon-btn"
          onClick={onToggleTheme}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          aria-pressed={theme === "dark"}
        >
          {theme === "dark" ? <IconSun size={17} /> : <IconMoon size={17} />}
        </button>

        <button
          className="icon-btn"
          onClick={onSettings}
          title="Settings"
          aria-label="Settings"
        >
          <IconGear size={17} />
        </button>

        <div className="menu-anchor" ref={anchor}>
          <button
            className="avatar"
            onClick={() => setMenuOpen((v) => !v)}
            title={profile.full_name}
            aria-label={`Account menu for ${profile.full_name}`}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            {initialsOf(profile.full_name)}
          </button>

          {menuOpen && (
            <div className="menu" role="menu">
              <div className="menu-head">
                <div className="menu-name">{profile.full_name}</div>
                <div className="menu-role">
                  {profile.role === "admin" ? "Administrator" : "Lab technician"}
                  {profile.can_release ? " · can release" : ""}
                </div>
              </div>

              <button
                className="menu-item"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onSettings();
                }}
              >
                <IconUser size={16} /> My details
              </button>

              <button
                className="menu-item"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onToggleTheme();
                }}
              >
                {theme === "dark" ? <IconSun size={16} /> : <IconMoon size={16} />}
                {theme === "dark" ? "Light mode" : "Dark mode"}
              </button>

              <button
                className="menu-item danger"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onSignOut();
                }}
              >
                <IconLogout size={16} /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
