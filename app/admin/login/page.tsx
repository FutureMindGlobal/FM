"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import styles from "./Login.module.css";

export default function AdminLogin() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => { supabase.auth.getSession().then(({ data }) => { if (data.session) window.location.href = "/admin"; }); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMessage("");
    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName }, emailRedirectTo: `${window.location.origin}/admin` } });
      if (error) setMessage(error.message);
      else if (data.session) window.location.href = "/admin";
      else setMessage("Account created. Check your email and confirm the address, then sign in.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage(error.message); else window.location.href = "/admin";
    }
    setBusy(false);
  }

  async function resetPassword() {
    if (!email) { setMessage("Enter your email address first."); return; }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/admin/login` });
    setMessage(error ? error.message : "Password reset instructions have been sent."); setBusy(false);
  }

  return <main className={styles.page}>
    <section className={styles.brandPanel}><div className={styles.orbit}/><a href="/" className={styles.brand}><img src="/logo.jpg" alt="Future Mind Global"/><span><b>FUTURE MIND</b><small>GLOBAL</small></span></a><div className={styles.statement}><small>SECURE PLATFORM ADMINISTRATION</small><h1>Shape the platform.<br/><em>Protect its purpose.</em></h1><p>Manage challenges, participants, credentials, and the Future Mind experience from one secure workspace.</p></div><div className={styles.security}>◈ Protected by Supabase authentication and row-level security</div></section>
    <section className={styles.formPanel}><div className={styles.formBox}><div className={styles.mobileBrand}><img src="/logo.jpg" alt=""/> Future Mind Global</div><small>ADMIN CONSOLE</small><h2>{mode === "login" ? "Welcome back" : "Create your account"}</h2><p>{mode === "login" ? "Sign in with an authorized administrator account." : "Create the first account, verify your email, then request administrator access."}</p><div className={styles.tabs}><button className={mode === "login" ? styles.active : ""} onClick={()=>{setMode("login");setMessage("")}}>Sign in</button><button className={mode === "signup" ? styles.active : ""} onClick={()=>{setMode("signup");setMessage("")}}>Create account</button></div><form onSubmit={submit}>{mode === "signup" && <label>Full name<input required value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Your full name" autoComplete="name"/></label>}<label>Email address<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@example.com" autoComplete="email"/></label><label>Password<input required minLength={8} type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Minimum 8 characters" autoComplete={mode === "login" ? "current-password" : "new-password"}/></label>{message && <div className={styles.message}>{message}</div>}<button className={styles.submit} disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Sign in securely →" : "Create account →"}</button></form>{mode === "login" && <button className={styles.reset} onClick={resetPassword} disabled={busy}>Forgot your password?</button>}<div className={styles.return}><a href="/">← Return to public website</a></div></div></section>
  </main>;
}
