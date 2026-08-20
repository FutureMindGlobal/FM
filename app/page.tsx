"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type SiteNav = { id: string; label: string; href: string };
type FooterSettings = {
  tagline: string;
  copyright_text: string;
  contact_email: string | null;
  is_visible: boolean;
};
type PopupMedia = {
  kind: "image" | "video" | "audio";
  public_url: string | null;
  alt_text: string;
  caption: string | null;
};
type SitePopup = {
  id: string;
  title: string;
  body_text: string | null;
  button_text: string | null;
  button_url: string | null;
  youtube_url?: string | null;
  open_new_tab?: boolean;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
  frequency: string;
  delay_seconds: number;
  position: string;
  audience: string;
  allow_close: boolean;
  is_mobile_enabled: boolean;
  is_desktop_enabled: boolean;
  media_assets: PopupMedia | null;
};
type ContentMap = Record<string, any>;

function safeLink(value: string) {
  const clean = value.trim().replace(/^["']+|["']+$/g, "");
  if (!clean) return "#";
  if (
    clean.startsWith("#") ||
    clean.startsWith("/") ||
    clean.startsWith("mailto:") ||
    clean.startsWith("tel:")
  )
    return clean;
  try {
    const url = new URL(
      /^https?:\/\//i.test(clean) ? clean : `https://${clean}`,
    );
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : "#";
  } catch {
    return "#";
  }
}
function youtubeEmbed(value: string) {
  try {
    const url = new URL(
      /^https?:\/\//i.test(value) ? value : `https://${value}`,
    );
    let id = "";
    if (url.hostname.includes("youtu.be")) id = url.pathname.slice(1);
    else if (url.pathname.startsWith("/shorts/"))
      id = url.pathname.split("/")[2];
    else if (url.pathname.startsWith("/embed/"))
      id = url.pathname.split("/")[2];
    else id = url.searchParams.get("v") || "";
    return /^[\w-]{6,15}$/.test(id)
      ? `https://www.youtube-nocookie.com/embed/${id}`
      : "";
  } catch {
    return "";
  }
}

const skills = [
  {
    n: "01",
    icon: "✦",
    title: "Critical Thinking",
    text: "Question assumptions, interpret evidence, and make sound judgments in uncertain situations.",
    color: "cyan",
  },
  {
    n: "02",
    icon: "◇",
    title: "Ethical Decision-Making",
    text: "Balance competing interests and choose actions grounded in integrity and responsibility.",
    color: "violet",
  },
  {
    n: "03",
    icon: "✺",
    title: "Creativity & Foresight",
    text: "Imagine better possibilities, anticipate change, and turn original ideas into action.",
    color: "gold",
  },
  {
    n: "04",
    icon: "◎",
    title: "Empathy & Leadership",
    text: "Understand different perspectives, build trust, and help teams move forward together.",
    color: "rose",
  },
  {
    n: "05",
    icon: "◉",
    title: "Global Citizenship",
    text: "Connect local choices to global consequences and engage respectfully across cultures.",
    color: "blue",
  },
  {
    n: "06",
    icon: "⌁",
    title: "Sustainable Problem-Solving",
    text: "Design practical solutions that serve people, communities, and the planet over time.",
    color: "green",
  },
];

const levels = [
  {
    id: "explorer",
    label: "Explorer",
    ages: "Ages 8-9",
    kicker: "Begin with curiosity",
    title: "Questions become confident thinking.",
    text: "Visual stories and guided choices introduce careful observation, empathy and reasoning.",
    meta: [
      "Age-appropriate scenarios",
      "Annual challenge",
      "Participation recognition",
    ],
  },
  {
    id: "discoverer",
    label: "Discoverer",
    ages: "Ages 10-11",
    kicker: "Connect ideas",
    title: "Curiosity grows into explanation.",
    text: "Students compare viewpoints, find evidence and explain why a choice is responsible.",
    meta: ["Interactive practice", "Annual challenge", "Achievement pathway"],
  },
  {
    id: "pioneer",
    label: "Pioneer",
    ages: "Ages 12-13",
    kicker: "Navigate real choices",
    title: "Ideas meet real-world complexity.",
    text: "Students examine competing perspectives and learn to defend thoughtful decisions.",
    meta: ["Global scenarios", "Annual challenge", "Achievement recognition"],
  },
  {
    id: "innovator",
    label: "Innovator",
    ages: "Ages 14-15",
    kicker: "Design better possibilities",
    title: "Insight becomes practical action.",
    text: "Complex challenges reward creative, ethical and sustainable problem-solving.",
    meta: ["Advanced scenarios", "Annual challenge", "Distinction pathway"],
  },
  {
    id: "global-leader",
    label: "Global Leader",
    ages: "Ages 16-18",
    kicker: "Prepare for what comes next",
    title: "Judgment becomes a visible strength.",
    text: "Advanced global scenarios assess capabilities for education, work and responsible leadership.",
    meta: [
      "Global assessment",
      "Annual challenge",
      "Global distinction eligibility",
    ],
  },
];

const questions = [
  {
    area: "Ethical Decision-Making",
    q: "Your team discovers that its strongest result is based on incomplete data two days before a final presentation. What should you do?",
    options: [
      "Present it without mentioning the gap",
      "Remove the result and say nothing",
      "Explain the limitation and revise the conclusion",
      "Ask another team what they would do",
    ],
    correct: 2,
  },
  {
    area: "Global Citizenship",
    q: "A community project will create jobs, but may reduce access to a shared natural resource. What is the best first step?",
    options: [
      "Approve it because jobs are urgent",
      "Reject every development proposal",
      "Consult affected groups and assess long-term trade-offs",
      "Let the largest investor decide",
    ],
    correct: 2,
  },
  {
    area: "Empathy & Leadership",
    q: "A quiet team member has stopped contributing after being interrupted several times. How should a team leader respond?",
    options: [
      "Give them easier work",
      "Invite their perspective and reset discussion norms",
      "Ignore it to avoid conflict",
      "Remove the most vocal team member",
    ],
    correct: 1,
  },
];

function ArrowIcon() {
  return <span aria-hidden="true">↗</span>;
}

export default function Home() {
  const [menu, setMenu] = useState(false);
  const [level, setLevel] = useState("global-leader");
  const [quizOpen, setQuizOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [email, setEmail] = useState("");
  const [notice, setNotice] = useState("");
  const [heroSlide, setHeroSlide] = useState(0);
  const [siteNav, setSiteNav] = useState<SiteNav[]>([]);
  const [footerSettings, setFooterSettings] = useState<
    FooterSettings | null | undefined
  >(undefined);
  const [popup, setPopup] = useState<SitePopup | null>(null);
  const [content, setContent] = useState<ContentMap>({});
  const c = (section: string, fallback: Record<string, any>) => ({
    ...fallback,
    ...(content[section] || {}),
  });
  const selectedLevel = levels.find((item) => item.id === level) ?? levels[2];
  const finished = step >= questions.length;
  const score = useMemo(
    () =>
      answers.reduce(
        (sum, answer, i) => sum + (answer === questions[i].correct ? 1 : 0),
        0,
      ),
    [answers],
  );

  useEffect(() => {
    document.body.style.overflow = quizOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [quizOpen]);

  useEffect(() => {
    const timer = window.setInterval(
      () => setHeroSlide((current) => (current + 1) % 3),
      6500,
    );
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let alive = true;
    let popupTimer: ReturnType<typeof setTimeout> | undefined;
    (async () => {
      const now = new Date();
      const [
        { data: theme },
        { data: navigation },
        { data: footer },
        { data: sections },
        { data: popups },
        {
          data: { user },
        },
      ] = await Promise.all([
        supabase.from("site_theme").select("*").single(),
        supabase
          .from("navigation_items")
          .select("*")
          .eq("location", "header")
          .order("display_order"),
        supabase.from("footer_settings").select("*").maybeSingle(),
        supabase
          .from("page_sections")
          .select("*")
          .eq("page_path", "/")
          .order("display_order"),
        supabase
          .from("popups")
          .select("*,media_assets(kind,public_url,alt_text,caption)")
          .eq("status", "published")
          .contains("pages", ["/"])
          .order("priority", { ascending: false }),
        supabase.auth.getUser(),
      ]);
      if (!alive) return;
      if (theme) {
        const vars: Record<string, string> = {
          "--navy": theme.primary_color,
          "--navy-2": theme.secondary_color,
          "--cyan": theme.accent_color,
          "--cream": theme.background_color,
          "--surface": theme.surface_color,
          "--ink": theme.text_color,
          "--muted": theme.muted_text_color,
          "--menu-text": theme.menu_text_color,
          "--heading-font": theme.heading_font,
          "--body-font": theme.body_font,
          "--base-size": `${theme.base_font_size}px`,
          "--heading-scale": String(theme.heading_scale),
          "--line-height": String(theme.line_height),
          "--letter-spacing": `${theme.letter_spacing}px`,
          "--content-width": `${theme.content_width}px`,
          "--section-space": `${theme.section_spacing}px`,
          "--button-radius": `${theme.button_radius}px`,
          "--card-radius": `${theme.card_radius}px`,
        };
        Object.entries(vars).forEach(([k, v]) =>
          document.documentElement.style.setProperty(k, v),
        );
      }
      setSiteNav((navigation || []) as SiteNav[]);
      setFooterSettings((footer as FooterSettings) || null);
      setContent(
        Object.fromEntries(
          (sections || []).map((s: any) => [s.section_key, s.content || {}]),
        ),
      );
      (sections || []).forEach((s: any) => {
        const el = document.getElementById(s.section_key);
        if (!el) return;
        el.hidden = !s.is_visible;
        el.style.order = String(s.display_order);
        if (s.background_color) el.style.background = s.background_color;
      });
      let role = "visitor";
      if (user) {
        const { data: p } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();
        role = p?.role === "participant" ? "students" : "staff";
      }
      const isMobile = window.matchMedia("(max-width: 720px)").matches;
      const candidate = (popups || []).find(
        (p: any) =>
          p.status === "published" &&
          (!p.starts_at || new Date(p.starts_at) <= now) &&
          (!p.ends_at || new Date(p.ends_at) >= now) &&
          (isMobile ? p.is_mobile_enabled : p.is_desktop_enabled) &&
          (p.audience === "everyone" ||
            (p.audience === "visitors" && role === "visitor") ||
            p.audience === role),
      ) as SitePopup | undefined;
      if (candidate) {
        const key = `fmg-popup-${candidate.id}`;
        const seen =
          candidate.frequency === "once_day"
            ? localStorage.getItem(key) ===
              new Date().toISOString().slice(0, 10)
            : candidate.frequency === "once_session"
              ? sessionStorage.getItem(key) === "1"
              : false;
        if (!seen)
          popupTimer = setTimeout(
            () => alive && setPopup(candidate),
            Math.max(0, candidate.delay_seconds || 0) * 1000,
          );
      }
    })();
    return () => {
      alive = false;
      if (popupTimer) clearTimeout(popupTimer);
    };
  }, []);
  useEffect(() => {
    if (!popup) return;
    let checking = false;
    const checkVisibility = async () => {
      if (checking) return;
      checking = true;
      const { data, error } = await supabase
        .from("popups")
        .select("status,starts_at,ends_at")
        .eq("id", popup.id)
        .maybeSingle();
      checking = false;
      if (error) return;
      const now = Date.now();
      if (
        !data ||
        data.status !== "published" ||
        (data.starts_at && new Date(data.starts_at).getTime() > now) ||
        (data.ends_at && new Date(data.ends_at).getTime() < now)
      )
        setPopup(null);
    };
    const onFocus = () => {
      void checkVisibility();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") void checkVisibility();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    const interval = window.setInterval(() => void checkVisibility(), 10000);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(interval);
    };
  }, [popup?.id]);
  function closePopup() {
    if (!popup) return;
    const key = `fmg-popup-${popup.id}`;
    if (popup.frequency === "once_day")
      localStorage.setItem(key, new Date().toISOString().slice(0, 10));
    if (popup.frequency === "once_session") sessionStorage.setItem(key, "1");
    setPopup(null);
  }

  function startQuiz() {
    setStep(0);
    setAnswers([]);
    setQuizOpen(true);
  }
  function answer(index: number) {
    setAnswers((old) => [...old, index]);
    setStep((old) => old + 1);
  }
  function subscribe(e: React.FormEvent) {
    e.preventDefault();
    setNotice(
      email
        ? "You’re on the early-access list."
        : "Please enter your email address.",
    );
  }

  const top = c("top", {
    eyebrow: "A global platform for young minds",
    title: "Think beyond borders.",
    accent_title: "Lead what comes next.",
    description:
      "Build the human capabilities that shape the future—then put them to the test in a global challenge designed for thoughtful young leaders.",
    primary_button: "Experience the challenge",
    secondary_button: "Explore the six skills",
    proof_title: "Built for curious minds everywhere",
    proof_text: "Learning • Assessment • Recognition",
    card_label: "THE 2026 CHALLENGE",
    card_title: "One world. Six human capabilities.",
  });
  const heroSlides = (
    Array.isArray(top.slides) && top.slides.length
      ? top.slides
      : [
          {
            image: "/future-lab-global.png",
            eyebrow: top.eyebrow,
            title: top.title,
            accent_title: top.accent_title,
            description: top.description,
          },
          {
            image: "/future-lab-sustainability.png",
            eyebrow: "Learn by solving what matters",
            title: "Ideas become action.",
            accent_title: "Build a better future.",
            description:
              "Explore sustainability, creativity and responsible problem-solving through challenges made for curious young minds.",
          },
          {
            image: "/future-lab-leadership.png",
            eyebrow: "The global stage is yours",
            title: "Find your strengths.",
            accent_title: "Share them with the world.",
            description:
              "Practice, compete and earn meaningful recognition for the human capabilities that shape tomorrow.",
          },
        ]
  ).slice(0, 6);
  const activeHero = heroSlides[heroSlide % heroSlides.length];
  const statement = c("statement", {
    eyebrow: "Beyond grades. Beyond memorization.",
    title:
      "The future belongs to people who can think clearly, choose wisely, and act together.",
  });
  const skillsContent = c("skills", {
    eyebrow: "The Future Mind Framework",
    title: "Six capabilities. One complete mind.",
    description:
      "Our framework focuses on the human strengths that traditional examinations rarely measure—but tomorrow’s world will demand.",
    items: skills,
  });
  const skillItems = (skillsContent.items || skills).map(
    (x: any, i: number) => ({
      ...skills[i % skills.length],
      ...x,
      n: x.number || x.n || String(i + 1).padStart(2, "0"),
    }),
  );
  const pathways = c("pathways", {
    eyebrow: "Learning that grows with you",
    title: "One journey.",
    accent_title: "Three stages.",
    description:
      "Age-appropriate pathways turn big ideas into practical habits—from first questions to confident global judgment.",
    items: levels,
  });
  const levelItems = (pathways.items || levels).map((x: any, i: number) => ({
    ...levels[i % levels.length],
    ...x,
    id: levels[i % levels.length]?.id || `level-${i}`,
    meta: Array.isArray(x.meta)
      ? x.meta
      : String(x.features || "")
          .split("|")
          .filter(Boolean),
  }));
  const currentLevel =
    levelItems.find((x: any) => x.id === level) ||
    levelItems[0] ||
    selectedLevel;
  const challenge = c("challenge", {
    eyebrow: "The Global Future Skills Challenge",
    title: "Not what you know.",
    accent_title: "How you think.",
    description:
      "Step into realistic dilemmas without obvious answers. We assess the reasoning behind your choices across all six capabilities.",
    features: [
      {
        title: "Scenario-based",
        text: "Choices drawn from real global challenges",
      },
      {
        title: "Personal strengths profile",
        text: "Understand how you think and where to grow",
      },
      {
        title: "Globally verifiable",
        text: "Recognition backed by a unique credential",
      },
    ],
    button: "Try a sample scenario",
    scenario_category: "ETHICAL DECISION-MAKING",
    scenario_question:
      "Your team discovers its strongest result is based on incomplete data—two days before the final presentation.",
    scenario_prompt: "What is the most responsible next step?",
    scenario_button: "Open scenario",
  });
  const recognition = c("recognition", {
    eyebrow: "Recognition with meaning",
    title: "Make your strengths visible to the world.",
    description:
      "Every participant receives meaningful feedback. High-performing students earn secure, verifiable recognition they can add to academic applications and personal portfolios.",
    items: [
      { title: "Participation", text: "Complete the full global assessment." },
      {
        title: "Achievement",
        text: "Meet the international competency standard.",
      },
      {
        title: "Global Distinction",
        text: "Place in the top 10% of your age group.",
      },
    ],
  });
  const verify = c("verify", {
    eyebrow: "Trust built in",
    title: "Every achievement. Instantly verifiable.",
    label: "Enter a certificate ID",
    button: "Verify credential",
    hint: "Enter a credential to check its validity.",
  });
  const cta = c("cta", {
    eyebrow: "The future is already asking",
    title: "How will you answer?",
    description:
      "Be among the first to experience the Global Future Skills Challenge.",
    placeholder: "Your email address",
    button: "Get early access",
  });

  return (
    <main className="site-root">
      <header className="nav-shell">
        <a className="brand" href="#top" aria-label="Future Mind Global home">
          <img src="/logo.jpg" alt="Future Mind Global" />
          <span>
            <b>FUTURE MIND</b>
            <small>GLOBAL</small>
          </span>
        </a>
        <nav
          className={menu ? "nav-links open" : "nav-links"}
          aria-label="Main navigation"
        >
          {siteNav.map((item) => (
            <a key={item.id} href={item.href} onClick={() => setMenu(false)}>
              {item.label}
            </a>
          ))}
        </nav>
        <a className="nav-cta" href="/register">
          Register interest <ArrowIcon />
        </a>
        <button
          className="menu-btn"
          onClick={() => setMenu(!menu)}
          aria-label="Toggle navigation"
          aria-expanded={menu}
        >
          {menu ? "×" : "☰"}
        </button>
      </header>

      <section className="hero future-lab-hero" id="top">
        <div className="future-lab-slides" aria-hidden="true">
          {heroSlides.map((slide: any, index: number) => (
            <img
              key={`${slide.image}-${index}`}
              className={
                index === heroSlide % heroSlides.length ? "active" : ""
              }
              src={slide.image}
              alt=""
            />
          ))}
        </div>
        <div className="future-lab-shade" />
        <div className="future-lab-content" aria-live="polite">
          <div className="eyebrow">
            <span /> {activeHero.eyebrow}
          </div>
          <h1>
            {activeHero.title}
            <br />
            <em>{activeHero.accent_title}</em>
          </h1>
          <p className="hero-copy">{activeHero.description}</p>
          <div className="hero-actions">
            <a className="button primary" href="/register">
              {top.primary_button} <ArrowIcon />
            </a>
            <button className="button ghost" onClick={startQuiz}>
              {top.secondary_button} <ArrowIcon />
            </button>
          </div>
          <div className="hero-proof">
            <div className="faces">
              <span>AM</span>
              <span>LK</span>
              <span>SA</span>
              <span>+</span>
            </div>
            <p>
              <strong>{top.proof_title}</strong>
              <br />
              {top.proof_text}
            </p>
          </div>
          <div className="future-lab-dots" aria-label="Featured stories">
            {heroSlides.map((slide: any, index: number) => (
              <button
                key={index}
                className={
                  index === heroSlide % heroSlides.length ? "active" : ""
                }
                onClick={() => setHeroSlide(index)}
                aria-label={`Show story ${index + 1}: ${slide.title}`}
              />
            ))}
          </div>
        </div>
        <div className="future-lab-badge">
          <small>{top.card_label}</small>
          <strong>{top.card_title}</strong>
        </div>
        <div className="scroll-note">
          SCROLL TO DISCOVER <span>↓</span>
        </div>
      </section>

      <section className="statement" id="statement">
        <p>{statement.eyebrow}</p>
        <h2>{statement.title}</h2>
      </section>

      <section className="section skills-section" id="skills">
        <div className="section-heading">
          <div>
            <div className="eyebrow dark">
              <span /> {skillsContent.eyebrow}
            </div>
            <h2>{skillsContent.title}</h2>
          </div>
          <p>{skillsContent.description}</p>
        </div>
        <div className="skills-grid">
          {skillItems.map((skill: any) => (
            <article
              className={`skill-card ${skill.color}`}
              key={`${skill.n}-${skill.title}`}
            >
              <div className="skill-top">
                <span className="skill-icon">{skill.icon}</span>
                <small>{skill.n}</small>
              </div>
              <h3>{skill.title}</h3>
              <p>{skill.text}</p>
              <a href="#challenge" aria-label={`Learn about ${skill.title}`}>
                Explore capability <ArrowIcon />
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className="section pathway-section" id="pathways">
        <div className="eyebrow">
          <span /> {pathways.eyebrow}
        </div>
        <div className="pathway-intro">
          <h2>
            {pathways.title}
            <br />
            <em>{pathways.accent_title}</em>
          </h2>
          <p>{pathways.description}</p>
        </div>
        <div className="level-tabs" role="tablist">
          {levelItems.map((item: any) => (
            <button
              key={item.id}
              className={level === item.id ? "active" : ""}
              onClick={() => setLevel(item.id)}
              role="tab"
              aria-selected={level === item.id}
            >
              <b>{item.label}</b>
              <small>{item.ages}</small>
            </button>
          ))}
        </div>
        <div className="level-panel">
          <div className="level-visual">
            <div className="level-number">
              {String(
                Math.max(
                  1,
                  levelItems.findIndex((x: any) => x.id === level) + 1,
                ),
              ).padStart(2, "0")}
            </div>
            <div className="constellation">
              ✦<span>·</span>✧<span>·</span>✦
            </div>
          </div>
          <div className="level-copy">
            <small>{currentLevel.kicker}</small>
            <h3>{currentLevel.title}</h3>
            <p>{currentLevel.text}</p>
            <ul>
              {currentLevel.meta.map((m: string) => (
                <li key={m}>✓ {m}</li>
              ))}
            </ul>
            <button className="text-link" onClick={startQuiz}>
              Preview this pathway <ArrowIcon />
            </button>
          </div>
        </div>
      </section>

      <section className="section challenge-section" id="challenge">
        <div className="challenge-copy">
          <div className="eyebrow dark">
            <span /> {challenge.eyebrow}
          </div>
          <h2>
            {challenge.title}
            <br />
            <em>{challenge.accent_title}</em>
          </h2>
          <p>{challenge.description}</p>
          <div className="feature-list">
            {(challenge.features || []).map((x: any, i: number) => (
              <div key={x.title}>
                <b>{String(i + 1).padStart(2, "0")}</b>
                <span>
                  <strong>{x.title}</strong>
                  <small>{x.text}</small>
                </span>
              </div>
            ))}
          </div>
          <button className="button dark-button" onClick={startQuiz}>
            {challenge.button} <ArrowIcon />
          </button>
        </div>
        <div className="scenario-card">
          <div className="scenario-head">
            <span>LIVE PREVIEW</span>
            <small>01 / 03</small>
          </div>
          <div className="scenario-body">
            <span className="category">{challenge.scenario_category}</span>
            <h3>{challenge.scenario_question}</h3>
            <p>{challenge.scenario_prompt}</p>
            <button onClick={startQuiz}>
              {challenge.scenario_button} <span>→</span>
            </button>
          </div>
          <div className="scenario-foot">
            <span>◷ Approximately 2 minutes</span>
            <span>There may be more than one reasonable choice.</span>
          </div>
        </div>
      </section>

      <section className="section recognition-section" id="recognition">
        <div className="recognition-card">
          <div className="cert-mark">
            <img src="/logo.jpg" alt="" />
          </div>
          <small>FUTURE MIND GLOBAL</small>
          <p>CERTIFICATE OF</p>
          <h3>
            GLOBAL
            <br />
            DISTINCTION
          </h3>
          <div className="cert-name">PARTICIPANT NAME</div>
          <div className="cert-meta">
            <span>2026 GLOBAL LEADER CHALLENGE</span>
            <span>TOP 10%</span>
          </div>
          <div className="qr">▦</div>
        </div>
        <div className="recognition-copy">
          <div className="eyebrow">
            <span /> {recognition.eyebrow}
          </div>
          <h2>{recognition.title}</h2>
          <p>{recognition.description}</p>
          <div className="award-list">
            {(recognition.items || []).map((x: any, i: number) => (
              <div className={i === 2 ? "highlight" : ""} key={x.title}>
                <span>{String(i + 1).padStart(2, "0")}</span>
                <p>
                  <strong>{x.title}</strong>
                  {x.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="verify-section" id="verify">
        <div>
          <div className="eyebrow">
            <span /> {verify.eyebrow}
          </div>
          <h2>{verify.title}</h2>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setNotice("Demo credential FMG-2026-1048 is valid.");
          }}
        >
          <label htmlFor="certificate">{verify.label}</label>
          <div>
            <input id="certificate" defaultValue="FMG-2026-1048" />
            <button>
              {verify.button} <ArrowIcon />
            </button>
          </div>
          <small>{notice || verify.hint}</small>
        </form>
      </section>

      <section className="cta-section" id="cta">
        <div className="mini-orbit" />
        <div className="eyebrow">
          <span /> {cta.eyebrow}
        </div>
        <h2>{cta.title}</h2>
        <p>{cta.description}</p>
        <form onSubmit={subscribe}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={cta.placeholder}
            aria-label="Email address"
          />
          <button>
            {cta.button} <ArrowIcon />
          </button>
        </form>
        <small>{notice}</small>
      </section>

      {footerSettings !== null && (
        <footer id="footer">
          <div className="footer-brand">
            <img src="/logo.jpg" alt="Future Mind Global" />
            <p>
              {footerSettings?.tagline ||
                "Developing the human capabilities that shape a better future."}
            </p>
          </div>
          <div>
            <strong>Explore</strong>
            {siteNav.slice(0, 3).map((item) => (
              <a key={item.id} href={item.href}>
                {item.label}
              </a>
            ))}
          </div>
          <div>
            <strong>Connect</strong>
            {footerSettings?.contact_email && (
              <a href={`mailto:${footerSettings.contact_email}`}>
                {footerSettings.contact_email}
              </a>
            )}
            <a href="/exams">Student exams</a>
          </div>
          <div className="footer-note">
            <strong>GLOBAL • INCLUSIVE • FUTURE-READY</strong>
            <p>
              {footerSettings?.copyright_text ||
                "© 2026 Future Mind Global. All rights reserved."}
            </p>
          </div>
        </footer>
      )}

      {popup && (
        <div
          className={`site-popup ${popup.position}`}
          role="dialog"
          aria-modal="true"
          aria-label={popup.title}
        >
          <div className="site-popup-card">
            {popup.allow_close && (
              <button
                className="site-popup-close"
                onClick={closePopup}
                aria-label="Close announcement"
              >
                ×
              </button>
            )}
            {popup.youtube_url && youtubeEmbed(popup.youtube_url) ? (
              <iframe
                className="popup-youtube"
                src={youtubeEmbed(popup.youtube_url)}
                title={popup.title}
                allow="accelerometer; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            ) : (
              popup.media_assets?.public_url &&
              (popup.media_assets.kind === "image" ? (
                <img
                  src={popup.media_assets.public_url}
                  alt={popup.media_assets.alt_text}
                />
              ) : popup.media_assets.kind === "video" ? (
                <video
                  src={popup.media_assets.public_url}
                  controls
                  playsInline
                  aria-label={popup.media_assets.alt_text}
                />
              ) : (
                <audio
                  src={popup.media_assets.public_url}
                  controls
                  aria-label={popup.media_assets.alt_text}
                />
              ))
            )}
            <div className="site-popup-copy">
              <h2>{popup.title}</h2>
              {popup.body_text && <p>{popup.body_text}</p>}
              {popup.button_text && popup.button_url && (
                <a
                  className="button primary"
                  href={safeLink(popup.button_url)}
                  target={popup.open_new_tab ? "_blank" : undefined}
                  rel={popup.open_new_tab ? "noopener noreferrer" : undefined}
                >
                  {popup.button_text}
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {quizOpen && (
        <div
          className="modal"
          role="dialog"
          aria-modal="true"
          aria-label="Sample challenge"
        >
          <div className="modal-card">
            <button
              className="modal-close"
              onClick={() => setQuizOpen(false)}
              aria-label="Close"
            >
              ×
            </button>
            {!finished ? (
              <>
                <div className="modal-progress">
                  <span
                    style={{
                      width: `${((step + 1) / questions.length) * 100}%`,
                    }}
                  />
                </div>
                <div className="modal-meta">
                  <span>{questions[step].area}</span>
                  <small>
                    {step + 1} of {questions.length}
                  </small>
                </div>
                <h2>{questions[step].q}</h2>
                <div className="options">
                  {questions[step].options.map((option, i) => (
                    <button key={option} onClick={() => answer(i)}>
                      <span>{String.fromCharCode(65 + i)}</span>
                      {option}
                    </button>
                  ))}
                </div>
                <p className="modal-hint">
                  Choose the response that demonstrates the strongest judgment.
                </p>
              </>
            ) : (
              <div className="result">
                <span className="result-icon">✦</span>
                <small>SAMPLE COMPLETE</small>
                <h2>Your thinking profile is taking shape.</h2>
                <div className="score-ring">
                  <b>{Math.round((score / questions.length) * 100)}</b>
                  <span>sample score</span>
                </div>
                <p>
                  You showed strength in ethical judgment and collaborative
                  leadership. The full challenge creates a profile across all
                  six capabilities.
                </p>
                <button
                  className="button primary"
                  onClick={() => setQuizOpen(false)}
                >
                  Return to the experience
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
