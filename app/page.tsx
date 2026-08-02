"use client";

import { useEffect, useMemo, useState } from "react";

const skills = [
  { n: "01", icon: "✦", title: "Critical Thinking", text: "Question assumptions, interpret evidence, and make sound judgments in uncertain situations.", color: "cyan" },
  { n: "02", icon: "◇", title: "Ethical Decision-Making", text: "Balance competing interests and choose actions grounded in integrity and responsibility.", color: "violet" },
  { n: "03", icon: "✺", title: "Creativity & Foresight", text: "Imagine better possibilities, anticipate change, and turn original ideas into action.", color: "gold" },
  { n: "04", icon: "◎", title: "Empathy & Leadership", text: "Understand different perspectives, build trust, and help teams move forward together.", color: "rose" },
  { n: "05", icon: "◉", title: "Global Citizenship", text: "Connect local choices to global consequences and engage respectfully across cultures.", color: "blue" },
  { n: "06", icon: "⌁", title: "Sustainable Problem-Solving", text: "Design practical solutions that serve people, communities, and the planet over time.", color: "green" },
];

const levels = [
  { id: "explorer", label: "Explorer", ages: "Ages 10–12", kicker: "Build the foundations", title: "Curiosity becomes confident thinking.", text: "Short stories, visual scenarios, and guided reflection introduce the habits behind thoughtful choices.", meta: ["6 guided modules", "20-minute challenge", "Participation certificate"] },
  { id: "pioneer", label: "Pioneer", ages: "Ages 13–15", kicker: "Navigate real choices", title: "Ideas meet real-world complexity.", text: "Students examine competing perspectives, collaborate on dilemmas, and learn to explain the reasoning behind their decisions.", meta: ["8 interactive modules", "30-minute challenge", "Achievement certificate"] },
  { id: "leader", label: "Global Leader", ages: "Ages 16–18", kicker: "Prepare for what comes next", title: "Judgment becomes a visible strength.", text: "Advanced global scenarios assess the capabilities that matter in higher education, work, and responsible leadership.", meta: ["10 advanced modules", "45-minute challenge", "Global distinction eligibility"] },
];

const questions = [
  { area: "Ethical Decision-Making", q: "Your team discovers that its strongest result is based on incomplete data two days before a final presentation. What should you do?", options: ["Present it without mentioning the gap", "Remove the result and say nothing", "Explain the limitation and revise the conclusion", "Ask another team what they would do"], correct: 2 },
  { area: "Global Citizenship", q: "A community project will create jobs, but may reduce access to a shared natural resource. What is the best first step?", options: ["Approve it because jobs are urgent", "Reject every development proposal", "Consult affected groups and assess long-term trade-offs", "Let the largest investor decide"], correct: 2 },
  { area: "Empathy & Leadership", q: "A quiet team member has stopped contributing after being interrupted several times. How should a team leader respond?", options: ["Give them easier work", "Invite their perspective and reset discussion norms", "Ignore it to avoid conflict", "Remove the most vocal team member"], correct: 1 },
];

function ArrowIcon() { return <span aria-hidden="true">↗</span>; }

export default function Home() {
  const [menu, setMenu] = useState(false);
  const [level, setLevel] = useState("leader");
  const [quizOpen, setQuizOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [email, setEmail] = useState("");
  const [notice, setNotice] = useState("");
  const selectedLevel = levels.find((item) => item.id === level) ?? levels[2];
  const finished = step >= questions.length;
  const score = useMemo(() => answers.reduce((sum, answer, i) => sum + (answer === questions[i].correct ? 1 : 0), 0), [answers]);

  useEffect(() => {
    document.body.style.overflow = quizOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [quizOpen]);

  function startQuiz() { setStep(0); setAnswers([]); setQuizOpen(true); }
  function answer(index: number) { setAnswers((old) => [...old, index]); setStep((old) => old + 1); }
  function subscribe(e: React.FormEvent) { e.preventDefault(); setNotice(email ? "You’re on the early-access list." : "Please enter your email address."); }

  return (
    <main>
      <header className="nav-shell">
        <a className="brand" href="#top" aria-label="Future Mind Global home">
          <img src="/logo.jpg" alt="Future Mind Global" />
          <span><b>FUTURE MIND</b><small>GLOBAL</small></span>
        </a>
        <nav className={menu ? "nav-links open" : "nav-links"} aria-label="Main navigation">
          <a href="#skills" onClick={() => setMenu(false)}>Future Skills</a>
          <a href="#pathways" onClick={() => setMenu(false)}>Learning</a>
          <a href="#challenge" onClick={() => setMenu(false)}>Global Challenge</a>
          <a href="#recognition" onClick={() => setMenu(false)}>Recognition</a>
          <a href="#verify" onClick={() => setMenu(false)}>Verify</a>
        </nav>
        <button className="nav-cta" onClick={startQuiz}>Try a scenario <ArrowIcon /></button>
        <button className="menu-btn" onClick={() => setMenu(!menu)} aria-label="Toggle navigation" aria-expanded={menu}>{menu ? "×" : "☰"}</button>
      </header>

      <section className="hero" id="top">
        <div className="orbit orbit-one" /><div className="orbit orbit-two" />
        <div className="hero-glow" />
        <div className="eyebrow"><span /> A global platform for young minds</div>
        <h1>Think beyond borders.<br /><em>Lead what comes next.</em></h1>
        <p className="hero-copy">Build the human capabilities that shape the future—then put them to the test in a global challenge designed for thoughtful young leaders.</p>
        <div className="hero-actions">
          <button className="button primary" onClick={startQuiz}>Experience the challenge <ArrowIcon /></button>
          <a className="button ghost" href="#skills">Explore the six skills <span>↓</span></a>
        </div>
        <div className="hero-proof">
          <div className="faces"><span>AM</span><span>LK</span><span>SA</span><span>+</span></div>
          <p><strong>Built for curious minds everywhere</strong><br />Learning • Assessment • Recognition</p>
        </div>
        <div className="globe-card" aria-hidden="true">
          <div className="globe"><i /><i /><i /><b /></div>
          <span className="pin p1" /><span className="pin p2" /><span className="pin p3" />
          <div className="card-label"><small>THE 2026 CHALLENGE</small><strong>One world.<br />Six human capabilities.</strong></div>
        </div>
        <div className="scroll-note">SCROLL TO DISCOVER <span>↓</span></div>
      </section>

      <section className="statement">
        <p>Beyond grades. Beyond memorization.</p>
        <h2>The future belongs to people who can <span>think clearly</span>, <span>choose wisely</span>, and <span>act together.</span></h2>
      </section>

      <section className="section skills-section" id="skills">
        <div className="section-heading">
          <div><div className="eyebrow dark"><span /> The Future Mind Framework</div><h2>Six capabilities.<br />One complete mind.</h2></div>
          <p>Our framework focuses on the human strengths that traditional examinations rarely measure—but tomorrow’s world will demand.</p>
        </div>
        <div className="skills-grid">
          {skills.map((skill) => <article className={`skill-card ${skill.color}`} key={skill.title}><div className="skill-top"><span className="skill-icon">{skill.icon}</span><small>{skill.n}</small></div><h3>{skill.title}</h3><p>{skill.text}</p><a href="#challenge" aria-label={`Learn about ${skill.title}`}>Explore capability <ArrowIcon /></a></article>)}
        </div>
      </section>

      <section className="section pathway-section" id="pathways">
        <div className="eyebrow"><span /> Learning that grows with you</div>
        <div className="pathway-intro"><h2>One journey.<br /><em>Three stages.</em></h2><p>Age-appropriate pathways turn big ideas into practical habits—from first questions to confident global judgment.</p></div>
        <div className="level-tabs" role="tablist">
          {levels.map((item) => <button key={item.id} className={level === item.id ? "active" : ""} onClick={() => setLevel(item.id)} role="tab" aria-selected={level === item.id}><b>{item.label}</b><small>{item.ages}</small></button>)}
        </div>
        <div className="level-panel">
          <div className="level-visual"><div className="level-number">{level === "explorer" ? "01" : level === "pioneer" ? "02" : "03"}</div><div className="constellation">✦<span>·</span>✧<span>·</span>✦</div></div>
          <div className="level-copy"><small>{selectedLevel.kicker}</small><h3>{selectedLevel.title}</h3><p>{selectedLevel.text}</p><ul>{selectedLevel.meta.map((m) => <li key={m}>✓ {m}</li>)}</ul><button className="text-link" onClick={startQuiz}>Preview this pathway <ArrowIcon /></button></div>
        </div>
      </section>

      <section className="section challenge-section" id="challenge">
        <div className="challenge-copy"><div className="eyebrow dark"><span /> The Global Future Skills Challenge</div><h2>Not what you know.<br /><em>How you think.</em></h2><p>Step into realistic dilemmas without obvious answers. We assess the reasoning behind your choices across all six capabilities.</p><div className="feature-list"><div><b>01</b><span><strong>Scenario-based</strong><small>Choices drawn from real global challenges</small></span></div><div><b>02</b><span><strong>Personal strengths profile</strong><small>Understand how you think and where to grow</small></span></div><div><b>03</b><span><strong>Globally verifiable</strong><small>Recognition backed by a unique credential</small></span></div></div><button className="button dark-button" onClick={startQuiz}>Try a sample scenario <ArrowIcon /></button></div>
        <div className="scenario-card"><div className="scenario-head"><span>LIVE PREVIEW</span><small>01 / 03</small></div><div className="scenario-body"><span className="category">ETHICAL DECISION-MAKING</span><h3>Your team discovers its strongest result is based on incomplete data—two days before the final presentation.</h3><p>What is the most responsible next step?</p><button onClick={startQuiz}>Open scenario <span>→</span></button></div><div className="scenario-foot"><span>◷ Approximately 2 minutes</span><span>There may be more than one reasonable choice.</span></div></div>
      </section>

      <section className="section recognition-section" id="recognition">
        <div className="recognition-card"><div className="cert-mark"><img src="/logo.jpg" alt="" /></div><small>FUTURE MIND GLOBAL</small><p>CERTIFICATE OF</p><h3>GLOBAL<br />DISTINCTION</h3><div className="cert-name">PARTICIPANT NAME</div><div className="cert-meta"><span>2026 GLOBAL LEADER CHALLENGE</span><span>TOP 10%</span></div><div className="qr">▦</div></div>
        <div className="recognition-copy"><div className="eyebrow"><span /> Recognition with meaning</div><h2>Make your strengths<br /><em>visible to the world.</em></h2><p>Every participant receives meaningful feedback. High-performing students earn secure, verifiable recognition they can add to academic applications and personal portfolios.</p><div className="award-list"><div><span>01</span><p><strong>Participation</strong>Complete the full global assessment.</p></div><div><span>02</span><p><strong>Achievement</strong>Meet the international competency standard.</p></div><div className="highlight"><span>03</span><p><strong>Global Distinction</strong>Place in the top 10% of your age group.</p></div></div></div>
      </section>

      <section className="verify-section" id="verify"><div><div className="eyebrow"><span /> Trust built in</div><h2>Every achievement.<br /><em>Instantly verifiable.</em></h2></div><form onSubmit={(e) => { e.preventDefault(); setNotice("Demo credential FMG-2026-1048 is valid."); }}><label htmlFor="certificate">Enter a certificate ID</label><div><input id="certificate" defaultValue="FMG-2026-1048" /><button>Verify credential <ArrowIcon /></button></div><small>{notice || "Try the sample credential to preview verification."}</small></form></section>

      <section className="cta-section"><div className="mini-orbit" /><div className="eyebrow"><span /> The future is already asking</div><h2>How will <em>you</em> answer?</h2><p>Be among the first to experience the Global Future Skills Challenge.</p><form onSubmit={subscribe}><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your email address" aria-label="Email address" /><button>Get early access <ArrowIcon /></button></form><small>{notice}</small></section>

      <footer><div className="footer-brand"><img src="/logo.jpg" alt="Future Mind Global" /><p>Developing the human capabilities<br />that shape a better future.</p></div><div><strong>Explore</strong><a href="#skills">Future Skills</a><a href="#pathways">Learning pathways</a><a href="#challenge">Global Challenge</a></div><div><strong>About</strong><a href="#top">Our mission</a><a href="#recognition">Recognition</a><a href="#verify">Verify certificate</a></div><div className="footer-note"><strong>GLOBAL • INCLUSIVE • FUTURE-READY</strong><p>© 2026 Future Mind Global.<br />All rights reserved.</p></div></footer>

      {quizOpen && <div className="modal" role="dialog" aria-modal="true" aria-label="Sample challenge"><div className="modal-card"><button className="modal-close" onClick={() => setQuizOpen(false)} aria-label="Close">×</button>{!finished ? <><div className="modal-progress"><span style={{ width: `${((step + 1) / questions.length) * 100}%` }} /></div><div className="modal-meta"><span>{questions[step].area}</span><small>{step + 1} of {questions.length}</small></div><h2>{questions[step].q}</h2><div className="options">{questions[step].options.map((option, i) => <button key={option} onClick={() => answer(i)}><span>{String.fromCharCode(65 + i)}</span>{option}</button>)}</div><p className="modal-hint">Choose the response that demonstrates the strongest judgment.</p></> : <div className="result"><span className="result-icon">✦</span><small>SAMPLE COMPLETE</small><h2>Your thinking profile is taking shape.</h2><div className="score-ring"><b>{Math.round((score / questions.length) * 100)}</b><span>sample score</span></div><p>You showed strength in ethical judgment and collaborative leadership. The full challenge creates a profile across all six capabilities.</p><button className="button primary" onClick={() => setQuizOpen(false)}>Return to the experience</button></div>}</div></div>}
    </main>
  );
}
