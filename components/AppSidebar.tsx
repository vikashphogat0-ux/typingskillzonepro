"use client";
import { usePathname } from "next/navigation";
import AuthLink from "@/components/AuthLink";

const groups = [
  { title: "WORKSPACE", links: [
    { href: "/", icon: "⌂", label: "Dashboard" },
    { href: "/simulators", icon: "▦", label: "Explore Exams" },
    { href: "/test", icon: "⌨", label: "Practice" },
    { href: "/library", icon: "▤", label: "Passage Library" },
    { href: "/learn", icon: "✦", label: "Learn Typing" },
  ]},
  { title: "INSTITUTE", links: [{ href: "/institution", icon: "▥", label: "Institute Panel" }] },
  { title: "ACCOUNT", links: [
    { href: "/dashboard", icon: "◷", label: "Results & Analytics" },
    { href: "/pricing", icon: "✧", label: "Plans & Billing" },
    { href: "/login", icon: "◎", label: "Account / Sign in" },
  ]},
];

export default function AppSidebar() {
  const pathname = usePathname();
  return <aside className="tsz-sidebar">
    <a href="/" className="tsz-brand" aria-label="Typing Skill Zone dashboard">
      <span className="tsz-brand-mark">T</span>
      <span className="tsz-brand-copy"><strong>TypingSkillZone</strong><small>PRACTICE · PREPARE · EXCEL</small></span>
    </a>
    {groups.map(group => <section className="tsz-sidebar-group" key={group.title}>
      <div className="sidebar-group-label">{group.title}</div>
      <nav className="sidebar-nav" aria-label={group.title.toLowerCase() + " navigation"}>
        {group.links.map(item => {
          const active = item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(item.href + "/");
          return <a href={item.href} className={"sidebar-link" + (active ? " is-active" : "")} aria-current={active ? "page" : undefined} key={item.href}>
            <span className="sidebar-icon" aria-hidden="true">{item.icon}</span><span>{item.label}</span>
          </a>;
        })}
      </nav>
      {group.title === "ACCOUNT" && <div className="sidebar-auth-action"><span className="sidebar-icon" aria-hidden="true">◎</span><AuthLink variant="sidebar" /></div>}
    </section>)}
    <a className="sidebar-upgrade" href="/pricing">
      <span className="upgrade-icon">✦</span><strong>Student Pro</strong>
      <span>More practice. Deeper insights. Better preparation.</span>
      <b>View plans <span aria-hidden="true">↗</span></b>
    </a>
    <div className="sidebar-foot"><span className="status-dot" /> All systems ready <span>v2.0</span></div>
  </aside>;
}
