"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  Dumbbell,
  UtensilsCrossed,
  Trophy,
  MessageSquare,
  Siren,
  LogOut,
  Activity,
} from "lucide-react";
import { api, getToken, setToken } from "../lib/api";

const NAV = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/users", label: "Users", Icon: Users },
  { href: "/workouts", label: "Workout Plans", Icon: Dumbbell },
  { href: "/meals", label: "Meals", Icon: UtensilsCrossed },
  { href: "/challenges", label: "Challenges", Icon: Trophy },
  { href: "/posts", label: "Social Moderation", Icon: MessageSquare },
  { href: "/sos", label: "SOS Log", Icon: Siren },
];

// Cache the admin auth check for the session so it runs once — not on every
// tab switch. This is what eliminates the blank-flash ("sparking") on nav.
let authVerified = false;

function ContentSkeleton() {
  return (
    <div className="card">
      <div className="skeleton skel-row w40" />
      <div className="skeleton skel-row" />
      <div className="skeleton skel-row w60" />
      <div className="skeleton skel-row" />
    </div>
  );
}

export default function Shell({ children, title }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(authVerified);

  useEffect(() => {
    if (authVerified) return; // already verified this session — no re-check, no flash

    if (!getToken()) {
      router.replace("/login");
      return;
    }
    // Verify the token belongs to an admin (once).
    api("/admin/analytics")
      .then(() => {
        authVerified = true;
        setReady(true);
      })
      .catch(() => {
        setToken(null);
        router.replace("/login");
      });
  }, [router]);

  function logout() {
    authVerified = false;
    setToken(null);
    router.replace("/login");
  }

  // Sidebar stays mounted at all times; only the content area swaps to a
  // skeleton during the first auth check, so navigation never blanks the page.
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark"><Activity size={20} strokeWidth={2.5} /></span>
          FitVerse
        </div>
        <nav className="nav">
          {NAV.map((n) => {
            const active = pathname === n.href;
            return (
              <Link
                key={n.href}
                href={n.href}
                prefetch
                className={`nav-link ${active ? "active" : ""}`}
              >
                <span className="nav-ico"><n.Icon size={18} strokeWidth={2} /></span>
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="nav-spacer" />
        <div className="nav-divider" />
        <div className="nav-link logout" onClick={logout}>
          <span className="nav-ico"><LogOut size={18} strokeWidth={2} /></span>
          Log out
        </div>
      </aside>
      <main className="main">
        <div className="main-inner">
          <h1 className="page-title">{title}</h1>
          {ready ? children : <ContentSkeleton />}
        </div>
      </main>
    </div>
  );
}
