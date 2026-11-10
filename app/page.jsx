"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { QUESTIONS, REDIRECT_URL, validateValue } from "../lib/questions";

const OTHER = "__other__";
const TOTAL = QUESTIONS.length;

const Arrow = ({ flip }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
    strokeLinecap="round" strokeLinejoin="round" style={flip ? { transform: "scaleX(-1)" } : null} aria-hidden>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

const Roof = () => (
  <svg className="roof" width="22" height="14" viewBox="0 0 22 14" fill="none" stroke="currentColor"
    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M2 12 11 3l9 9" />
  </svg>
);

const Check = ({ on }) => (
  <span className="check" aria-hidden>
    {on && (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"
        strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 12.5 9.5 18 20 6.5" />
      </svg>
    )}
  </span>
);

const Ball = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
    <circle cx="12" cy="12" r="10" fill="#0D0D0D" stroke="#D29D2A" strokeWidth="2" />
    <path d="M12 7.2 16.2 10.2 14.6 15.1H9.4L7.8 10.2Z" fill="#D29D2A" />
    <path d="M12 7.2V2.6M16.2 10.2l4.3-1.4M14.6 15.1l2.7 3.7M9.4 15.1l-2.7 3.7M7.8 10.2 3.5 8.8"
      stroke="#D29D2A" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

function Title({ q }) {
  return (
    <h2 className="q-title">
      {q.title.map((part, i) => {
        if (part === "?") return null;
        const withQ = q.title[i + 1] === "?";
        const last = i === q.title.length - 1 || (withQ && i === q.title.length - 2);
        return (
          <span key={i} className={i === q.hl ? "gold" : undefined}>
            {part}
            {/* « ? » collé au mot précédent (espace insécable) : jamais seul sur une ligne */}
            {withQ && <span className="qm">{"\u00a0?"}</span>}
            {!last ? " " : ""}
          </span>
        );
      })}
    </h2>
  );
}

export default function Page() {
  const [step, setStep] = useState(-1); // -1 = accueil (mobile)
  const [dir, setDir] = useState("fwd");
  const [values, setValues] = useState({});
  const [others, setOthers] = useState({});
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | sending | done
  const [serverError, setServerError] = useState("");
  const [count, setCount] = useState(5);
  const [honey, setHoney] = useState("");
  const stepRef = useRef(null);
  const timer = useRef(null);

  const detailKey = (q, opt) => `${q.id}|${opt}`;
  const detailOf = (q, opt) => (others[detailKey(q, opt)] || "").trim();
  const missingDetail = (q, selected) =>
    selected.find((o) => q.details?.[o] && !detailOf(q, o));
  // Sous-choix (ex. Réservation d'un terrain : Séance de futsal, Évènementiel)
  const [subs, setSubs] = useState({});
  const subOf = (q, opt) => (q.sub?.[opt] || []).filter((s) => (subs[detailKey(q, opt)] || []).includes(s));
  const missingSub = (q, selected) => selected.find((o) => q.sub?.[o] && !subOf(q, o).length);
  const toggleSub = (q, opt, s) => {
    const k = detailKey(q, opt);
    setSubs((cur) => {
      const list = cur[k] || [];
      return { ...cur, [k]: list.includes(s) ? list.filter((x) => x !== s) : [...list, s] };
    });
    setErrors((e) => ({ ...e, [q.id]: null }));
  };

  // ───────── Brouillon : les réponses en cours survivent à une actualisation ─────────
  // Stockées uniquement dans le navigateur de la personne, effacées après l'envoi ou au bout de 7 jours.
  const DRAFT_KEY = "chalfive-formulaire-brouillon";
  const DRAFT_TTL = 7 * 24 * 3600 * 1000;
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    try {
      const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
      if (d && Date.now() - d.savedAt < DRAFT_TTL) {
        setValues(d.values || {});
        setOthers(d.others || {});
        setSubs(d.subs || {});
        if (Number.isInteger(d.step) && d.step >= 0 && d.step < TOTAL) setStep(d.step);
      } else if (d) localStorage.removeItem(DRAFT_KEY);
    } catch {}
    setRestored(true);
  }, []);

  useEffect(() => {
    if (!restored || status === "done") return;
    try {
      const empty = !Object.keys(values).length && !Object.keys(others).length && !Object.keys(subs).length;
      if (empty && step < 0) localStorage.removeItem(DRAFT_KEY);
      else localStorage.setItem(DRAFT_KEY, JSON.stringify({ values, others, subs, step, savedAt: Date.now() }));
    } catch {}
  }, [restored, values, others, subs, step, status]);

  const answerOf = (q) => {
    const v = values[q.id];
    if (q.type === "multi")
      return (v || []).map((o) =>
        o === OTHER
          ? `${q.other} : ${(others[q.id] || "").trim()}`
          : q.details?.[o]
          ? `${o} : ${detailOf(q, o)}`
          : q.sub?.[o]
          ? `${o} : ${subOf(q, o).join(" et ")}`
          : o
      );
    if (v === OTHER) return `Autre : ${(others[q.id] || "").trim()}`;
    if (q.details?.[v]) return `${v} : ${detailOf(q, v)}`;
    return (v ?? "").toString().trim();
  };

  const errorOf = (q) => {
    if (q.type === "multi") {
      const v = values[q.id] || [];
      if (!v.length) return q.required ? "Choisissez au moins une réponse." : null;
      if (v.includes(OTHER) && !(others[q.id] || "").trim()) return "Précisez en quelques mots.";
      if (missingDetail(q, v)) return `Indiquez le ${q.details[missingDetail(q, v)].toLowerCase()}.`;
      if (missingSub(q, v)) return `Précisez : ${q.sub[missingSub(q, v)].join(" ou ").toLowerCase()}.`;
      return null;
    }
    if (q.type === "choice") {
      const v = values[q.id];
      if (!v) return "Choisissez une réponse.";
      if (v === OTHER && !(others[q.id] || "").trim()) return "Précisez en quelques mots.";
      if (missingDetail(q, [v])) return `Indiquez le ${q.details[v].toLowerCase()}.`;
      return null;
    }
    return validateValue(q, values[q.id]);
  };

  const setVal = (id, v) => {
    setValues((s) => ({ ...s, [id]: v }));
    setErrors((e) => ({ ...e, [id]: null }));
  };

  const goTo = (n, d) => {
    clearTimeout(timer.current);
    setDir(d);
    setStep(n);
  };

  const next = () => {
    if (step >= 0) {
      const err = errorOf(QUESTIONS[step]);
      if (err) return setErrors((e) => ({ ...e, [QUESTIONS[step].id]: err }));
    }
    if (step < TOTAL - 1) goTo(step + 1, "fwd");
  };
  const back = () => step >= 0 && goTo(step - 1, "back");

  // Chaque question s'affiche depuis le haut (mobile : la zone défilante est partagée entre les questions)
  useEffect(() => {
    if (step < 0 || !window.matchMedia("(max-width: 899px)").matches) return;
    stepRef.current?.closest(".steps")?.scrollTo(0, 0);
  }, [step]);

  // Focus du champ à chaque nouvelle question (mobile)
  useEffect(() => {
    if (step < 0 || !window.matchMedia("(max-width: 899px)").matches) return;
    const t = setTimeout(() => {
      stepRef.current?.querySelector("input[type=text],input[type=tel],input[type=email],input[type=number]")?.focus({ preventScroll: true });
    }, 320);
    return () => clearTimeout(t);
  }, [step]);

  const pick = (q, idx, opt) => {
    setVal(q.id, opt);
    // Avance seule après un choix simple (mobile), sauf "Autre" et dernière question
    if (opt !== OTHER && !q.details?.[opt] && !q.final && window.matchMedia("(max-width: 899px)").matches) {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => goTo(idx + 1, "fwd"), 320);
    }
  };

  const toggle = (q, opt) => {
    const cur = values[q.id] || [];
    const ex = q.exclusive || [];
    let nextVal;
    if (cur.includes(opt)) nextVal = cur.filter((o) => o !== opt);
    else if (ex.includes(opt)) nextVal = [opt];
    else nextVal = [...cur.filter((o) => !ex.includes(o)), opt];
    setVal(q.id, nextVal);
  };

  async function submit(e) {
    e?.preventDefault();
    if (honey) return;
    const errs = {};
    let first = -1;
    QUESTIONS.forEach((q, i) => {
      const err = errorOf(q);
      if (err) {
        errs[q.id] = err;
        if (first < 0) first = i;
      }
    });
    setErrors(errs);
    if (first >= 0) {
      const isMobile = window.matchMedia("(max-width: 899px)").matches;
      if (isMobile) goTo(first, "back");
      else document.getElementById(`q-${QUESTIONS[first].id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setStatus("sending");
    setServerError("");
    try {
      const payload = Object.fromEntries(QUESTIONS.map((q) => [q.id, answerOf(q)]));
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Erreur");
      try { localStorage.removeItem(DRAFT_KEY); } catch {}
      setStatus("done");
    } catch (err) {
      setStatus("idle");
      setServerError("L'envoi n'a pas abouti. Vérifiez votre connexion et réessayez.");
    }
  }

  // Compte à rebours puis redirection
  useEffect(() => {
    if (status !== "done") return;
    if (count <= 0) {
      window.location.href = REDIRECT_URL;
      return;
    }
    const t = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [status, count]);

  const progress = useMemo(() => (step < 0 ? 0 : (step + 1) / TOTAL), [step]);

  if (status === "done") {
    return (
      <main className="shell thanks">
        <div className="net" aria-hidden />
        <img src="/logo.png" alt="Chal Five" className="thanks-logo" />
        <div className="thanks-body">
          <p className="kicker">Réponse bien reçue</p>
          <h1 className="q-title big">
            Merci, <span className="gold">à très vite</span> sur le terrain !
          </h1>
          <p className="lead">
            Notre équipe vous recontactera très bientôt. Redirection vers chalfive.com dans {count} s.
          </p>
          <a className="btn gold-btn" href={REDIRECT_URL}>
            Visiter chalfive.com <Arrow />
          </a>
        </div>
      </main>
    );
  }

  const q = step >= 0 ? QUESTIONS[step] : null;

  return (
    <main className="shell" data-step={step}>
      <div className="net" aria-hidden />
      <div className="grain" aria-hidden />

      {/* ───────── Accueil / panneau de marque ───────── */}
      <section className="intro" data-active={step === -1}>
        <div className="intro-inner">
          <img src="/logo.png" alt="Chal Five" className="intro-logo" width="280" />
          <p className="kicker">Futsal, terrasse et salon de thé</p>
          <h1 className="intro-title">
            Prenez votre <span className="gold">mi&#8209;temps&nbsp;!</span>
          </h1>
          <p className="lead">
            Futsal, sport, bien-être et loisirs à Bonamoussadi. Quelques questions rapides pour mieux
            vous connaître. Moins d'une minute.
          </p>
          <button type="button" className="btn gold-btn only-mobile" onClick={() => goTo(0, "fwd")}>
            Commencer <Arrow />
          </button>
          <p className="legal">chalfive10@gmail.com</p>
        </div>
      </section>

      {/* ───────── Formulaire ───────── */}
      <form className="flow" onSubmit={submit} noValidate data-started={step >= 0}>
        <header className="topbar only-mobile">
          <img src="/symbole.png" alt="" className="mini" />
          <div className="pitch" role="progressbar" aria-valuemin={0} aria-valuemax={TOTAL} aria-valuenow={Math.max(step + 1, 0)}>
            <i style={{ width: `${progress * 100}%` }} />
            <span className="ball" style={{ left: `${progress * 100}%` }}><Ball /></span>
          </div>
          <b className="count">{String(step + 1).padStart(2, "0")}<small>/{String(TOTAL).padStart(2, "0")}</small></b>
        </header>

        <div className="steps">
          {QUESTIONS.map((qq, i) => {
            const err = errors[qq.id];
            return (
              <section
                key={qq.id}
                id={`q-${qq.id}`}
                ref={i === step ? stepRef : null}
                className={`step ${dir}`}
                data-active={i === step}
                aria-hidden={step !== i ? undefined : false}
              >
                <p className="kicker">
                  <span className="num">{String(i + 1).padStart(2, "0")}</span>
                  {qq.kicker}
                </p>
                <Title q={qq} />
                {qq.hint && <p className="hint">{qq.hint}</p>}

                {qq.type === "multi" && <p className="multi-tag">Plusieurs réponses possibles</p>}

                {qq.type === "choice" || qq.type === "multi" ? (
                  <div
                    className="choices"
                    role={qq.type === "multi" ? "group" : "radiogroup"}
                    aria-label={qq.label}
                  >
                    {[...qq.options, ...(qq.other ? [OTHER] : [])].map((opt) => {
                      const multi = qq.type === "multi";
                      const on = multi ? (values[qq.id] || []).includes(opt) : values[qq.id] === opt;
                      const detail = opt !== OTHER && qq.details?.[opt];
                      const subList = opt !== OTHER && qq.sub?.[opt];
                      return (
                        <Fragment key={opt}>
                        <label className={`choice${multi ? " multi" : ""}${on ? " on" : ""}`}>
                          <input
                            type={multi ? "checkbox" : "radio"}
                            name={qq.id}
                            checked={on}
                            onChange={() => (multi ? toggle(qq, opt) : pick(qq, i, opt))}
                          />
                          {multi ? <Check on={on} /> : <Roof />}
                          <span>{opt === OTHER ? qq.other : opt}</span>
                        </label>
                        {on && detail && (
                          <input
                            type="text"
                            className="field other detail"
                            placeholder={detail}
                            aria-label={detail}
                            maxLength={120}
                            value={others[detailKey(qq, opt)] || ""}
                            onChange={(e) => {
                              setOthers((s) => ({ ...s, [detailKey(qq, opt)]: e.target.value }));
                              setErrors((s) => ({ ...s, [qq.id]: null }));
                            }}
                            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), qq.final ? submit() : next())}
                            autoFocus
                          />
                        )}
                        {on && subList && (
                          <div className="subchoices" role="group" aria-label={`Précisez : ${opt}`}>
                            {subList.map((s) => {
                              const sOn = subOf(qq, opt).includes(s);
                              return (
                                <label key={s} className={`subchoice${sOn ? " on" : ""}`}>
                                  <input type="checkbox" checked={sOn} onChange={() => toggleSub(qq, opt, s)} />
                                  <Check on={sOn} />
                                  <span>{s}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                        </Fragment>
                      );
                    })}
                    {(qq.type === "multi" ? (values[qq.id] || []).includes(OTHER) : values[qq.id] === OTHER) && (
                      <input
                        type="text"
                        className="field other"
                        placeholder="Précisez ici"
                        maxLength={120}
                        value={others[qq.id] || ""}
                        onChange={(e) => {
                          setOthers((s) => ({ ...s, [qq.id]: e.target.value }));
                          setErrors((s) => ({ ...s, [qq.id]: null }));
                        }}
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), qq.final ? submit() : next())}
                        autoFocus
                      />
                    )}
                  </div>
                ) : (
                  <input
                    className="field"
                    type={qq.type === "number" ? "text" : qq.type}
                    inputMode={qq.type === "number" ? "numeric" : qq.type === "tel" ? "tel" : qq.type === "email" ? "email" : "text"}
                    autoComplete={qq.autoComplete}
                    placeholder={qq.placeholder}
                    maxLength={qq.type === "number" ? 2 : 120}
                    aria-label={qq.label}
                    aria-invalid={!!err}
                    value={values[qq.id] || ""}
                    onChange={(e) => setVal(qq.id, qq.type === "number" ? e.target.value.replace(/\D/g, "") : e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (window.matchMedia("(max-width: 899px)").matches) next();
                      }
                    }}
                  />
                )}

                {err && <p className="err" role="alert">{err}</p>}

                {qq.final && (
                  <div className="final">
                    {/* piège à robots, invisible */}
                    <input
                      tabIndex={-1}
                      autoComplete="off"
                      aria-hidden
                      className="honey"
                      name="website"
                      value={honey}
                      onChange={(e) => setHoney(e.target.value)}
                    />
                    {serverError && <p className="err" role="alert">{serverError}</p>}
                    <button type="submit" className="btn gold-btn big" disabled={status === "sending"}>
                      {status === "sending" ? "Envoi en cours" : "Envoyer"} <Arrow />
                    </button>
                    <p className="legal">Vos informations ne servent qu'à vous répondre. Merci pour votre confiance.</p>
                  </div>
                )}
              </section>
            );
          })}
        </div>

        {step >= 0 && (
          <nav className="nav only-mobile">
            <button type="button" className="btn ghost labeled" onClick={back} aria-label="Question précédente">
              <Arrow flip /> <span className="label">Précédent</span>
            </button>
            {q && !q.final && (
              <button type="button" className="btn gold-btn grow" onClick={next}>
                {!q.required && !(Array.isArray(values[q.id]) ? values[q.id].length : values[q.id]) ? "Passer" : "Continuer"} <Arrow />
              </button>
            )}
          </nav>
        )}
      </form>
    </main>
  );
}
