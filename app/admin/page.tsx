"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase, type PlatformRole } from "../../lib/supabase";
import styles from "./Admin.module.css";

const navigation = [
  ["Overview", "⌂"], ["Challenges", "◫"], ["Question Bank", "?"],
  ["Participants", "◎"], ["Results", "↗"], ["Certificates", "◇"],
  ["Website Content", "▤"], ["Appearance", "✦"], ["Administrators", "♙"], ["Audit Log", "≡"],
];

const participants = [
  ["Maya Chen", "Global Leader", "92%", "Distinction", "2 min ago"],
  ["Omar Al-Hassan", "Pioneer", "84%", "Achievement", "18 min ago"],
  ["Sofia Martinez", "Global Leader", "79%", "Achievement", "41 min ago"],
  ["Daniel Okafor", "Explorer", "—", "In progress", "1 hr ago"],
  ["Leila Rahman", "Pioneer", "94%", "Distinction", "2 hrs ago"],
];

const panels: Record<string, { title: string; copy: string; items: string[] }> = {
  Challenges: { title: "Challenge management", copy: "Create, schedule, and publish age-appropriate global assessments.", items: ["2026 Global Leader Challenge · Published", "Pioneer Spring Challenge · Draft", "Explorer Foundations · Published"] },
  "Question Bank": { title: "Question bank", copy: "Organize scenario questions across the six Future Mind capabilities.", items: ["Critical Thinking · 48 questions", "Ethical Decision-Making · 42 questions", "Global Citizenship · 36 questions"] },
  Participants: { title: "Participants", copy: "Review registrations, consent status, and assessment progress.", items: ["1,284 total registrations", "1,106 consent records complete", "47 currently taking a challenge"] },
  Results: { title: "Results & insights", copy: "Explore performance by pathway, capability, country, and challenge cycle.", items: ["Average assessment score · 78%", "Strongest capability · Creativity & Foresight", "Growth opportunity · Ethical Decision-Making"] },
  Certificates: { title: "Certificate center", copy: "Manage templates, issued credentials, and verification status.", items: ["836 credentials issued", "128 Global Distinctions", "0 verification alerts"] },
  "Website Content": { title: "Website content", copy: "Edit homepage messages, pathways, focus areas, and calls to action.", items: ["Homepage · Published", "Six capabilities · Published", "Recognition page · Published"] },
  Appearance: { title: "Brand appearance", copy: "Control approved colors, typography, imagery, logo, and social preview.", items: ["Theme · Midnight & Cyan", "Typography · Geist + Georgia", "Logo · Future Mind Global"] },
  Administrators: { title: "Administrators", copy: "Assign secure roles and manage access to sensitive platform functions.", items: ["Owner · Full access", "Assessment editor · Content only", "Results reviewer · Read only"] },
  "Audit Log": { title: "Audit log", copy: "See every important administrative change across the platform.", items: ["Challenge published · Today 09:42", "Homepage updated · Yesterday 16:18", "Certificate template approved · Jul 30"] },
};

export default function AdminPage() {
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<PlatformRole | null>(null);
  const [section, setSection] = useState("Overview");
  const [menu, setMenu] = useState(false);
  const [toast, setToast] = useState("");
  const panel = panels[section];
  function notify(message: string) { setToast(message); window.setTimeout(() => setToast(""), 2600); }

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { window.location.replace("/admin/login"); return; }
      setUser(data.user);
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
      setRole((profile?.role as PlatformRole) ?? "participant"); setAuthLoading(false);
    });
  }, []);

  async function signOut() { await supabase.auth.signOut(); window.location.href = "/admin/login"; }

  if (authLoading) return <main className={styles.authState}><img src="/logo.jpg" alt=""/><span>Verifying secure access…</span></main>;
  if (!role || !["admin","editor","reviewer"].includes(role)) return <main className={styles.authState}><img src="/logo.jpg" alt=""/><small>ACCESS PENDING</small><h1>Your account is verified.</h1><p>{user?.email}<br/>An administrator must assign your platform role before you can enter the console.</p><button onClick={signOut}>Sign out</button><a href="/">Return to website</a></main>;

  return <main className={styles.shell}>
    <aside className={`${styles.sidebar} ${menu ? styles.open : ""}`}>
      <a href="/" className={styles.brand}><img src="/logo.jpg" alt="Future Mind Global" /><span><b>FUTURE MIND</b><small>ADMIN CONSOLE</small></span></a>
      <nav aria-label="Admin navigation">{navigation.map(([label, icon]) => <button key={label} className={section === label ? styles.active : ""} onClick={() => { setSection(label); setMenu(false); }}><i>{icon}</i>{label}{label === "Participants" && <em>1,284</em>}</button>)}</nav>
      <div className={styles.sidebarFoot}><span className={styles.avatar}>FM</span><span><b>{user?.user_metadata?.full_name || "Platform Owner"}</b><small>{role}</small></span><button onClick={signOut} aria-label="Sign out">↪</button></div>
    </aside>

    <section className={styles.main}>
      <header className={styles.topbar}><button className={styles.mobileMenu} onClick={() => setMenu(!menu)}>☰</button><div><span>ADMINISTRATION</span><b>{section}</b></div><div className={styles.topActions}><a href="/">View website ↗</a><button onClick={() => notify("No new alerts")}>♢<i /></button><span>FM</span></div></header>

      {section === "Overview" ? <div className={styles.content}>
        <div className={styles.welcome}><div><small>SUNDAY, 2 AUGUST 2026</small><h1>Good afternoon.</h1><p>Here is what is happening across Future Mind Global today.</p></div><button onClick={() => notify("Challenge creation will connect to the assessment database.")}>＋ Create challenge</button></div>

        <div className={styles.stats}>
          <article><div><span>◎</span><small>+12.4%</small></div><b>1,284</b><p>Total participants</p><em>Across 38 countries</em></article>
          <article><div><span>◫</span><small>+8.1%</small></div><b>1,067</b><p>Completed assessments</p><em>83% completion rate</em></article>
          <article><div><span>◇</span><small>+16.8%</small></div><b>836</b><p>Certificates issued</p><em>128 global distinctions</em></article>
          <article><div><span>◷</span><small className={styles.live}>● LIVE</small></div><b>47</b><p>Taking a challenge</p><em>Current active sessions</em></article>
        </div>

        <div className={styles.grid}>
          <article className={styles.performance}><div className={styles.cardHead}><div><small>PERFORMANCE</small><h2>Participation overview</h2></div><select aria-label="Period"><option>Last 6 months</option><option>Last 12 months</option></select></div><div className={styles.chart}><div className={styles.yaxis}><span>300</span><span>200</span><span>100</span><span>0</span></div><div className={styles.bars}>{[[38,52],[47,63],[44,71],[58,78],[66,87],[76,96]].map((v,i)=><div key={i}><span style={{height:`${v[0]}%`}}/><b style={{height:`${v[1]}%`}}/><small>{["Mar","Apr","May","Jun","Jul","Aug"][i]}</small></div>)}</div></div><div className={styles.legend}><span><i /> Registrations</span><span><i /> Completions</span></div></article>
          <article className={styles.capabilities}><div className={styles.cardHead}><div><small>CAPABILITY INSIGHTS</small><h2>Average strengths</h2></div><button>•••</button></div>{[["Creativity & Foresight",88],["Critical Thinking",84],["Global Citizenship",81],["Empathy & Leadership",79],["Sustainable Problem-Solving",76],["Ethical Decision-Making",72]].map(([name,value])=><div className={styles.skillRow} key={name}><span>{name}</span><div><i style={{width:`${value}%`}}/></div><b>{value}%</b></div>)}</article>
        </div>

        <article className={styles.tableCard}><div className={styles.cardHead}><div><small>LIVE ACTIVITY</small><h2>Recent participants</h2></div><button onClick={() => setSection("Participants")}>View all participants →</button></div><div className={styles.tableWrap}><table><thead><tr><th>Participant</th><th>Pathway</th><th>Score</th><th>Recognition</th><th>Activity</th><th /></tr></thead><tbody>{participants.map((p,i)=><tr key={p[0]}><td><span className={styles.person}>{p[0].split(" ").map(x=>x[0]).join("")}</span><b>{p[0]}</b></td><td>{p[1]}</td><td><b>{p[2]}</b></td><td><span className={`${styles.badge} ${p[3] === "Distinction" ? styles.gold : p[3] === "In progress" ? styles.progress : ""}`}>{p[3]}</span></td><td>{p[4]}</td><td><button>•••</button></td></tr>)}</tbody></table></div></article>
      </div> : <div className={styles.content}><div className={styles.welcome}><div><small>PLATFORM MANAGEMENT</small><h1>{panel.title}</h1><p>{panel.copy}</p></div><button onClick={() => notify(`${section} editor is ready for database connection.`)}>＋ Add new</button></div><article className={styles.manager}><div className={styles.managerVisual}><span>{navigation.find(n=>n[0]===section)?.[1]}</span></div><div><small>DEMONSTRATION VIEW</small><h2>{panel.title}</h2><p>{panel.copy}</p><ul>{panel.items.map(item=><li key={item}><span>✓</span>{item}<button onClick={() => notify("Editing will be enabled after secure database connection.")}>Edit</button></li>)}</ul></div></article></div>}
    </section>
    {toast && <div className={styles.toast}>✓ {toast}</div>}
  </main>;
}
