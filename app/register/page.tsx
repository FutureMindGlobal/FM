"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import styles from "./Register.module.css";

type Competition = {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  status: string;
  event_date: string | null;
  eligibility_date: string;
  interest_enabled: boolean;
  registration_enabled: boolean;
  individual_payment_enabled: boolean;
  school_payment_enabled: boolean;
};
type Level = {
  id: string;
  name: string;
  min_age: number;
  max_age: number;
  description: string;
  color: string;
};
type Country = {
  country_code: string;
  country_name: string;
  currency_code: string;
  tier_id: string | null;
};
type Price = {
  id: string;
  country_code: string | null;
  tier_id: string | null;
  registration_type: string;
  min_quantity: number;
  max_quantity: number | null;
  amount_minor: number;
  currency_code: string;
  checkout_url: string | null;
  label: string;
};

const emptyInterest = {
  contact_name: "",
  email: "",
  country_code: "",
  whatsapp_number: "",
  organization_name: "",
  estimated_students: 1,
  message: "",
};
const emptyIndividual = {
  full_name: "",
  date_of_birth: "",
  country_code: "",
  city: "",
  school_name: "",
  guardian_name: "",
  guardian_email: "",
  guardian_phone: "",
  whatsapp_number: "",
  consent: false,
};
const emptySchool = {
  name: "",
  country_code: "",
  city: "",
  contact_name: "",
  email: "",
  phone: "",
  whatsapp_number: "",
  expected_students: 20,
};

export default function RegisterPage() {
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [levels, setLevels] = useState<Level[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [prices, setPrices] = useState<Price[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [type, setType] = useState<"individual" | "school">("individual");
  const [interest, setInterest] = useState(emptyInterest);
  const [individual, setIndividual] = useState(emptyIndividual);
  const [school, setSchool] = useState(emptySchool);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    (async () => {
      const [c, l, co, p, u] = await Promise.all([
        supabase
          .from("competitions")
          .select("*")
          .eq("homepage_enabled", true)
          .order("competition_year", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("competition_levels")
          .select("*")
          .eq("is_active", true)
          .order("display_order"),
        supabase
          .from("country_pricing")
          .select("*")
          .eq("is_active", true)
          .order("country_name"),
        supabase.from("competition_prices").select("*").eq("is_active", true),
        supabase.auth.getUser(),
      ]);
      setCompetition(c.data as Competition);
      setLevels((l.data || []) as Level[]);
      setCountries((co.data || []) as Country[]);
      setPrices((p.data || []) as Price[]);
      setUserId(u.data.user?.id || null);
    })();
  }, []);
  function ageAt(dob: string, date: string) {
    const d = new Date(dob),
      cut = new Date(date);
    let age = cut.getUTCFullYear() - d.getUTCFullYear();
    if (
      cut.getUTCMonth() < d.getUTCMonth() ||
      (cut.getUTCMonth() === d.getUTCMonth() &&
        cut.getUTCDate() < d.getUTCDate())
    )
      age--;
    return age;
  }
  function validWhatsApp(value: string) {
    return /^\+[1-9]\d{7,14}$/.test(value.replace(/[\s()-]/g, ""));
  }
  async function processRegistrationEmails() {
    const { error } = await supabase.functions.invoke(
      "process-registration-emails",
      { body: {} },
    );
    if (error) console.warn("Registration email remains queued", error.message);
  }
  const assignedLevel = useMemo(() => {
    if (!individual.date_of_birth || !competition) return null;
    const age = ageAt(individual.date_of_birth, competition.eligibility_date);
    return levels.find((x) => age >= x.min_age && age <= x.max_age) || null;
  }, [individual.date_of_birth, competition, levels]);
  const selectedCountry = countries.find(
    (x) =>
      x.country_code ===
      (type === "individual" ? individual.country_code : school.country_code),
  );
  const quantity = type === "school" ? school.expected_students : 1;
  const selectedPrice = prices
    .filter(
      (x) =>
        x.registration_type === type &&
        (x.country_code === selectedCountry?.country_code ||
          (!x.country_code && x.tier_id === selectedCountry?.tier_id)) &&
        quantity >= x.min_quantity &&
        (x.max_quantity == null || quantity <= x.max_quantity),
    )
    .sort(
      (a, b) =>
        (b.country_code ? 1 : 0) - (a.country_code ? 1 : 0) ||
        b.min_quantity - a.min_quantity,
    )[0];
  const priceText = selectedPrice
    ? new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: selectedPrice.currency_code,
      }).format(selectedPrice.amount_minor / 100)
    : "Price will be confirmed";
  async function submitInterest(e: React.FormEvent) {
    e.preventDefault();
    if (!competition) return;
    if (!validWhatsApp(interest.whatsapp_number))
      return setNotice(
        "Enter the WhatsApp number with country code, for example +966501234567.",
      );
    setBusy(true);
    const { error } = await supabase
      .from("registration_interests")
      .insert({
        ...interest,
        whatsapp_number: interest.whatsapp_number.replace(/[\s()-]/g, ""),
        competition_id: competition.id,
        registration_type: type,
        organization_name:
          type === "school" ? interest.organization_name : null,
        estimated_students:
          type === "school" ? interest.estimated_students : null,
      });
    setBusy(false);
    if (error) return setNotice(error.message);
    void processRegistrationEmails();
    setNotice(
      "Thank you. Your interest has been registered. A confirmation email is on its way.",
    );
    setInterest(emptyInterest);
  }
  async function submitRegistration(e: React.FormEvent) {
    e.preventDefault();
    if (!competition || !userId) return;
    if (type === "individual" && !assignedLevel)
      return setNotice(
        "The participant must be aged 8–18 on the competition eligibility date.",
      );
    const whatsapp =
      type === "individual"
        ? individual.whatsapp_number
        : school.whatsapp_number;
    if (!validWhatsApp(whatsapp))
      return setNotice(
        "Enter the WhatsApp number with country code, for example +966501234567.",
      );
    setBusy(true);
    if (type === "individual") {
      const { data: participant, error } = await supabase
        .from("participants")
        .insert({
          ...individual,
          whatsapp_number: individual.whatsapp_number.replace(/[\s()-]/g, ""),
          consent: undefined,
          account_id: userId,
          level_id: assignedLevel?.id,
        })
        .select()
        .single();
      if (error) {
        setBusy(false);
        return setNotice(error.message);
      }
      await supabase.from("consent_records").insert([
        {
          participant_id: participant.id,
          account_id: userId,
          consent_type: "guardian",
          consent_version: "2026.1",
          granted: individual.consent,
        },
        {
          participant_id: participant.id,
          account_id: userId,
          consent_type: "privacy",
          consent_version: "2026.1",
          granted: individual.consent,
        },
      ]);
      const { error: rError } = await supabase
        .from("competition_registrations")
        .insert({
          competition_id: competition.id,
          participant_id: participant.id,
          registration_type: "individual",
          level_id: assignedLevel?.id,
          amount_minor: selectedPrice?.amount_minor || 0,
          currency_code:
            selectedPrice?.currency_code || selectedCountry?.currency_code,
          price_label: selectedPrice?.label || priceText,
          checkout_url: selectedPrice?.checkout_url,
          payment_status: selectedPrice?.amount_minor
            ? "pending"
            : "not_required",
          consent_complete: individual.consent,
        });
      if (rError) {
        setBusy(false);
        return setNotice(rError.message);
      }
    } else {
      const { data: org, error } = await supabase
        .from("organizations")
        .insert({
          ...school,
          whatsapp_number: school.whatsapp_number.replace(/[\s()-]/g, ""),
          owner_id: userId,
        })
        .select()
        .single();
      if (error) {
        setBusy(false);
        return setNotice(error.message);
      }
      const { error: rError } = await supabase
        .from("competition_registrations")
        .insert({
          competition_id: competition.id,
          organization_id: org.id,
          registration_type: "school",
          amount_minor:
            (selectedPrice?.amount_minor || 0) * school.expected_students,
          currency_code:
            selectedPrice?.currency_code || selectedCountry?.currency_code,
          price_label: selectedPrice?.label || priceText,
          checkout_url: selectedPrice?.checkout_url,
          payment_status: selectedPrice?.amount_minor ? "pending" : "invoiced",
          consent_complete: false,
        });
      if (rError) {
        setBusy(false);
        return setNotice(rError.message);
      }
    }
    setBusy(false);
    void processRegistrationEmails();
    setNotice(
      "Registration submitted. A confirmation email is on its way, and you can follow the status in your dashboard.",
    );
  }
  const interestOnly = !competition?.registration_enabled;
  return (
    <main className={styles.page}>
      <header>
        <a href="/">← Future Mind Global</a>
        <a href="/dashboard">My dashboard</a>
      </header>
      <section className={styles.hero}>
        <small>GLOBAL FUTURE SKILLS CHALLENGE</small>
        <h1>{competition?.name || "Annual competition"}</h1>
        <p>{competition?.subtitle}</p>
        <div className={styles.progress}>
          <span>Participate</span>
          <b>•</b>
          <span>Discover strengths</span>
          <b>•</b>
          <span>Improve</span>
          <b>•</b>
          <span>Return stronger</span>
        </div>
      </section>
      <section className={styles.panel}>
        <div className={styles.typeTabs}>
          <button
            className={type === "individual" ? styles.active : ""}
            onClick={() => setType("individual")}
          >
            Individual / Parent
          </button>
          <button
            className={type === "school" ? styles.active : ""}
            onClick={() => setType("school")}
          >
            School / Organisation
          </button>
        </div>
        {interestOnly ? (
          <form onSubmit={submitInterest} className={styles.form}>
            <div className={styles.callout}>
              <b>Register your interest</b>
              <p>
                Full registration and payment are not public yet. Submit your
                details and the administrator will contact you when registration
                opens.
              </p>
            </div>
            <label>
              Contact name
              <input
                required
                value={interest.contact_name}
                onChange={(e) =>
                  setInterest({ ...interest, contact_name: e.target.value })
                }
              />
            </label>
            <label>
              Email
              <input
                required
                type="email"
                value={interest.email}
                onChange={(e) =>
                  setInterest({ ...interest, email: e.target.value })
                }
              />
            </label>
            <label>
              Country
              <select
                required
                value={interest.country_code}
                onChange={(e) =>
                  setInterest({ ...interest, country_code: e.target.value })
                }
              >
                <option value="">Select country</option>
                {countries.map((x) => (
                  <option key={x.country_code} value={x.country_code}>
                    {x.country_name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              WhatsApp number
              <input
                required
                type="tel"
                placeholder="+966501234567"
                pattern="\+[1-9][0-9 ()-]{7,18}"
                value={interest.whatsapp_number}
                onChange={(e) =>
                  setInterest({ ...interest, whatsapp_number: e.target.value })
                }
              />
            </label>
            {type === "school" && (
              <>
                <label>
                  School / organisation
                  <input
                    required
                    value={interest.organization_name}
                    onChange={(e) =>
                      setInterest({
                        ...interest,
                        organization_name: e.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  Estimated students
                  <input
                    type="number"
                    min="1"
                    value={interest.estimated_students}
                    onChange={(e) =>
                      setInterest({
                        ...interest,
                        estimated_students: +e.target.value,
                      })
                    }
                  />
                </label>
              </>
            )}
            <label className={styles.full}>
              Message
              <textarea
                value={interest.message}
                onChange={(e) =>
                  setInterest({ ...interest, message: e.target.value })
                }
              />
            </label>
            <button disabled={busy}>
              {busy ? "Submitting…" : "Register interest"}
            </button>
          </form>
        ) : !userId ? (
          <div className={styles.login}>
            <h2>Sign in to register</h2>
            <p>
              A secure account is required for participant information, consent,
              payment status and annual results.
            </p>
            <a href="/admin/login?next=/register">Sign in or create account</a>
          </div>
        ) : (
          <form onSubmit={submitRegistration} className={styles.form}>
            {type === "individual" ? (
              <>
                <label>
                  Student name
                  <input
                    required
                    value={individual.full_name}
                    onChange={(e) =>
                      setIndividual({
                        ...individual,
                        full_name: e.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  Date of birth
                  <input
                    required
                    type="date"
                    value={individual.date_of_birth}
                    onChange={(e) =>
                      setIndividual({
                        ...individual,
                        date_of_birth: e.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  Country
                  <select
                    required
                    value={individual.country_code}
                    onChange={(e) =>
                      setIndividual({
                        ...individual,
                        country_code: e.target.value,
                      })
                    }
                  >
                    <option value="">Select country</option>
                    {countries.map((x) => (
                      <option key={x.country_code} value={x.country_code}>
                        {x.country_name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  City
                  <input
                    value={individual.city}
                    onChange={(e) =>
                      setIndividual({ ...individual, city: e.target.value })
                    }
                  />
                </label>
                <label>
                  School name
                  <input
                    value={individual.school_name}
                    onChange={(e) =>
                      setIndividual({
                        ...individual,
                        school_name: e.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  Parent / guardian name
                  <input
                    required
                    value={individual.guardian_name}
                    onChange={(e) =>
                      setIndividual({
                        ...individual,
                        guardian_name: e.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  Parent / guardian email
                  <input
                    required
                    type="email"
                    value={individual.guardian_email}
                    onChange={(e) =>
                      setIndividual({
                        ...individual,
                        guardian_email: e.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  Guardian phone
                  <input
                    value={individual.guardian_phone}
                    onChange={(e) =>
                      setIndividual({
                        ...individual,
                        guardian_phone: e.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  WhatsApp number
                  <input
                    required
                    type="tel"
                    placeholder="+966501234567"
                    pattern="\+[1-9][0-9 ()-]{7,18}"
                    value={individual.whatsapp_number}
                    onChange={(e) =>
                      setIndividual({
                        ...individual,
                        whatsapp_number: e.target.value,
                      })
                    }
                  />
                </label>
                <div className={styles.assignment}>
                  <small>Automatic level</small>
                  <strong>
                    {assignedLevel
                      ? `${assignedLevel.name} · Ages ${assignedLevel.min_age}–${assignedLevel.max_age}`
                      : "Enter date of birth"}
                  </strong>
                </div>
                <label className={styles.consent}>
                  <input
                    required
                    type="checkbox"
                    checked={individual.consent}
                    onChange={(e) =>
                      setIndividual({
                        ...individual,
                        consent: e.target.checked,
                      })
                    }
                  />{" "}
                  I am the parent/guardian or authorised adult and consent to
                  this registration and the privacy terms.
                </label>
              </>
            ) : (
              <>
                <label>
                  School / organisation
                  <input
                    required
                    value={school.name}
                    onChange={(e) =>
                      setSchool({ ...school, name: e.target.value })
                    }
                  />
                </label>
                <label>
                  Country
                  <select
                    required
                    value={school.country_code}
                    onChange={(e) =>
                      setSchool({ ...school, country_code: e.target.value })
                    }
                  >
                    <option value="">Select country</option>
                    {countries.map((x) => (
                      <option key={x.country_code} value={x.country_code}>
                        {x.country_name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  City
                  <input
                    value={school.city}
                    onChange={(e) =>
                      setSchool({ ...school, city: e.target.value })
                    }
                  />
                </label>
                <label>
                  Contact person
                  <input
                    required
                    value={school.contact_name}
                    onChange={(e) =>
                      setSchool({ ...school, contact_name: e.target.value })
                    }
                  />
                </label>
                <label>
                  Email
                  <input
                    required
                    type="email"
                    value={school.email}
                    onChange={(e) =>
                      setSchool({ ...school, email: e.target.value })
                    }
                  />
                </label>
                <label>
                  Phone
                  <input
                    value={school.phone}
                    onChange={(e) =>
                      setSchool({ ...school, phone: e.target.value })
                    }
                  />
                </label>
                <label>
                  WhatsApp number
                  <input
                    required
                    type="tel"
                    placeholder="+966501234567"
                    pattern="\+[1-9][0-9 ()-]{7,18}"
                    value={school.whatsapp_number}
                    onChange={(e) =>
                      setSchool({
                        ...school,
                        whatsapp_number: e.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  Number of students
                  <input
                    required
                    type="number"
                    min="1"
                    value={school.expected_students}
                    onChange={(e) =>
                      setSchool({
                        ...school,
                        expected_students: +e.target.value,
                      })
                    }
                  />
                </label>
              </>
            )}
            <div className={styles.price}>
              <small>Applicable fee</small>
              <strong>
                {priceText}
                {type === "school" && selectedPrice ? " per student" : ""}
              </strong>
              <span>
                {selectedPrice?.label ||
                  "The administrator can configure country and quantity pricing."}
              </span>
            </div>
            <button disabled={busy}>
              {busy ? "Submitting…" : "Submit registration"}
            </button>
          </form>
        )}
        {notice && <p className={styles.notice}>{notice}</p>}
      </section>
      <section className={styles.levels}>
        <small>FIVE ANNUAL LEVELS</small>
        <h2>Designed to grow with every student.</h2>
        <div>
          {levels.map((x) => (
            <article key={x.id} style={{ borderColor: x.color }}>
              <span>
                {x.min_age}–{x.max_age}
              </span>
              <h3>{x.name}</h3>
              <p>{x.description}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
