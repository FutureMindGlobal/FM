"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import styles from "./Dashboard.module.css";

type Participant={id:string;full_name:string;date_of_birth:string;city:string|null;school_name:string|null;competition_levels?:{name:string;color:string}|null};
type Registration={id:string;registration_type:string;status:string;payment_status:string;amount_minor:number|null;currency_code:string|null;checkout_url:string|null;created_at:string;participants?:{full_name:string}|null;competitions?:{name:string;event_date:string|null}|null};
type Result={id:string;overall_score:number|null;global_rank:number|null;country_rank:number|null;level_rank:number|null;recognition_level:string|null;status:string;participants?:{full_name:string}|null;competitions?:{name:string;competition_year:number}|null};
type Organization={id:string;name:string;status:string;email:string;expected_students:number};

export default function Dashboard(){
 const [loading,setLoading]=useState(true);const [name,setName]=useState("Participant");const [participants,setParticipants]=useState<Participant[]>([]);const [registrations,setRegistrations]=useState<Registration[]>([]);const [results,setResults]=useState<Result[]>([]);const [organizations,setOrganizations]=useState<Organization[]>([]);
 useEffect(()=>{(async()=>{const {data:{user}}=await supabase.auth.getUser();if(!user){window.location.href="/admin/login?next=/dashboard";return}setName(user.user_metadata?.full_name||user.email||"Participant");const [p,r,a,o]=await Promise.all([
  supabase.from("participants").select("id,full_name,date_of_birth,city,school_name,competition_levels(name,color)").order("created_at"),
  supabase.from("competition_registrations").select("id,registration_type,status,payment_status,amount_minor,currency_code,checkout_url,created_at,participants(full_name),competitions(name,event_date)").order("created_at",{ascending:false}),
  supabase.from("annual_results").select("id,overall_score,global_rank,country_rank,level_rank,recognition_level,status,participants(full_name),competitions(name,competition_year)").eq("status","published").order("created_at",{ascending:false}),
  supabase.from("organizations").select("id,name,status,email,expected_students").order("created_at",{ascending:false})
 ]);setParticipants((p.data||[]) as unknown as Participant[]);setRegistrations((r.data||[]) as unknown as Registration[]);setResults((a.data||[]) as unknown as Result[]);setOrganizations((o.data||[]) as Organization[]);setLoading(false)})()},[]);
 async function signOut(){await supabase.auth.signOut();window.location.href="/"}
 if(loading)return <main className={styles.loading}>Opening your Future Mind dashboard?</main>;
 return <main className={styles.page}>
  <header className={styles.header}><a href="/" className={styles.brand}><img src="/logo.jpg" alt=""/><span>FUTURE MIND <b>GLOBAL</b></span></a><nav><a href="/register">Register</a><a href="/exams">Exam area</a><button onClick={signOut}>Sign out</button></nav></header>
  <section className={styles.hero}><div><small>PARTICIPANT & SCHOOL DASHBOARD</small><h1>Welcome, {name}.</h1><p>Track registrations, payments, competition access and published results from one place.</p></div><a href="/register">Add a registration ?</a></section>
  <section className={styles.stats}><article><b>{participants.length}</b><span>Participants</span></article><article><b>{registrations.length}</b><span>Registrations</span></article><article><b>{registrations.filter(x=>x.payment_status==="paid").length}</b><span>Paid</span></article><article><b>{results.length}</b><span>Published results</span></article></section>
  <section className={styles.grid}>
   <article className={styles.card}><header><div><small>YOUR ENTRIES</small><h2>Competition registrations</h2></div><a href="/register">New</a></header>{registrations.length===0?<Empty text="You have no competition registrations yet."/>:<div className={styles.list}>{registrations.map(r=><div className={styles.item} key={r.id}><div><b>{r.participants?.full_name||(r.registration_type==="school"?"School registration":"Competition registration")}</b><span>{r.competitions?.name||"Annual competition"}{r.competitions?.event_date?` - ${new Date(r.competitions.event_date).toLocaleDateString()}`:""}</span></div><div className={styles.actions}><Status text={r.status}/><Status text={r.payment_status}/>{r.payment_status!=="paid"&&r.checkout_url&&<a href={r.checkout_url} target="_blank" rel="noreferrer">Pay now</a>}</div></div>)}</div>}</article>
   <article className={styles.card}><header><div><small>STUDENT PROFILES</small><h2>Participants</h2></div></header>{participants.length===0?<Empty text="Create your first student registration to add a participant."/>:<div className={styles.list}>{participants.map(p=><div className={styles.item} key={p.id}><div><b>{p.full_name}</b><span>{p.school_name||p.city||"Independent participant"}</span></div><i style={{borderColor:p.competition_levels?.color||"#00c9d8"}}>{p.competition_levels?.name||"Level pending"}</i></div>)}</div>}</article>
   <article className={`${styles.card} ${styles.wide}`}><header><div><small>OFFICIAL OUTCOMES</small><h2>Results and recognition</h2></div></header>{results.length===0?<Empty text="Official scores and rankings will appear here after the administrator publishes them."/>:<div className={styles.results}>{results.map(r=><div key={r.id}><small>{r.competitions?.competition_year} - {r.competitions?.name}</small><h3>{r.participants?.full_name}</h3><b>{r.overall_score??"-"}<em> score</em></b><span>Global rank {r.global_rank??"-"} - Country rank {r.country_rank??"-"} - Level rank {r.level_rank??"-"}</span>{r.recognition_level&&<strong>{r.recognition_level}</strong>}</div>)}</div>}</article>
   {organizations.length>0&&<article className={`${styles.card} ${styles.wide}`}><header><div><small>SCHOOL ACCOUNT</small><h2>Organizations</h2></div></header><div className={styles.list}>{organizations.map(o=><div className={styles.item} key={o.id}><div><b>{o.name}</b><span>{o.email} - Expected students: {o.expected_students}</span></div><Status text={o.status}/></div>)}</div></article>}
  </section>
  <footer>Future Mind Global - Secure annual competition platform</footer>
 </main>
}
function Status({text}:{text:string}){return <span className={styles.status}>{text.replaceAll("_"," ")}</span>}
function Empty({text}:{text:string}){return <div className={styles.empty}>{text}</div>}
