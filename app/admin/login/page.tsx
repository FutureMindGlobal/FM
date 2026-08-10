"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import styles from "./Login.module.css";

export default function AdminLogin() {
  const [mode, setMode] = useState<"login" | "signup" | "recovery">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function openWorkspace(userId: string) {
    const requested = new URLSearchParams(window.location.search).get("next");
    const { data } = await supabase.from("profiles").select("role").eq("id", userId).single();
    const safeNext = requested && requested.startsWith("/") && !requested.startsWith("//") ? requested : null;
    window.location.href = safeNext || (data?.role === "participant" ? "/dashboard" : "/admin");
  }

  useEffect(() => {
    const recoveryLink = window.location.hash.includes("type=recovery");
    if (recoveryLink) setMode("recovery");

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setMode("recovery");
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session && !recoveryLink) openWorkspace(data.session.user.id);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMessage("");
    if (mode === "signup") {
      const next = new URLSearchParams(window.location.search).get("next") || "/dashboard";
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName }, emailRedirectTo: `${window.location.origin}${next}` } });
      if (error) setMessage(error.message);
      else if (data.session) openWorkspace(data.session.user.id);
      else setMessage("Account created. Check your email and confirm the address, then sign in.");
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage(error.message); else if (data.user) openWorkspace(data.user.id);
    }
    setBusy(false);
  }

  async function resetPassword() {
    if (!email) { setMessage("Enter your email address first."); return; }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/admin/login` });
    setMessage(error ? error.message : "Password reset instructions have been sent."); setBusy(false);
  }

  async function updatePassword(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMessage("");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) setMessage(error.message);
    else {
      setMessage("Password updated. Opening the admin panel…");
      window.setTimeout(() => { window.location.href = "/admin"; }, 900);
    }
    setBusy(false);
  }

  return <main className={styles.page}>
    <section className={styles.brandPanel}><div className={styles.orbit}/><a href="/" className={styles.brand}><img src="/logo.jpg" alt="Future Mind Global"/><span><b>FUTURE MIND</b><small>GLOBAL</small></span></a><div className={styles.statement}><small>SECURE PLATFORM ADMINISTRATION</small><h1>Shape the platform.<br/><em>Protect its purpose.</em></h1><p>Manage challenges, participants, credentials, and the Future Mind experience from one secure workspace.</p></div><div className={styles.security}>◈ Protected by Supabase authentication and row-level security</div></section>
    <section className={styles.formPanel}><div className={styles.formBox}><div className={styles.mobileBrand}><img src="/logo.jpg" alt=""/> Future Mind Global</div><small>ADMIN CONSOLE</small><h2>{mode === "login" ? "Welcome back" : mode === "signup" ? "Create your account" : "Choose a new password"}</h2><p>{mode === "login" ? "Sign in with an authorized administrator account." : mode === "signup" ? "Create the first account, verify your email, then request administrator access." : "Enter a secure new password for your administrator account."}</p>{mode !== "recovery" && <div className={styles.tabs}><button className={mode === "login" ? styles.active : ""} onClick={()=>{setMode("login");setMessage("")}}>Sign in</button><button className={mode === "signup" ? styles.active : ""} onClick={()=>{setMode("signup");setMessage("")}}>Create account</button></div>}{mode === "recovery" ? <form onSubmit={updatePassword}><label>New password<input required minLength={8} type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Minimum 8 characters" autoComplete="new-password"/></label>{message && <div className={styles.message}>{message}</div>}<button className={styles.submit} disabled={busy}>{busy ? "Updating…" : "Update password →"}</button></form> : <form onSubmit={submit}>{mode === "signup" && <label>Full name<input required value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Your full name" autoComplete="name"/></label>}<label>Email address<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@example.com" autoComplete="email"/></label><label>Password<input required minLength={8} type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Minimum 8 characters" autoComplete={mode === "login" ? "current-password" : "new-password"}/></label>{message && <div className={styles.message}>{message}</div>}<button className={styles.submit} disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Sign in securely →" : "Create account →"}</button></form>}{mode === "login" && <button className={styles.reset} onClick={resetPassword} disabled={busy}>Forgot your password?</button>}<div className={styles.return}><a href="/">← Return to public website</a></div></div></section>
  </main>;
}
