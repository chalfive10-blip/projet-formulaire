import nodemailer from "nodemailer";
import { QUESTIONS, validateValue } from "../../../lib/questions";

export const runtime = "nodejs";

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Requête invalide" }, { status: 400 });
  }

  // Validation côté serveur (ne jamais faire confiance au navigateur)
  const data = {};
  for (const q of QUESTIONS) {
    if (q.type === "multi") {
      const raw = body?.[q.id];
      const list = [...new Set((Array.isArray(raw) ? raw : []).map((x) => String(x).trim().slice(0, 200)))];
      const details = Object.keys(q.details || {});
      // Une option « à compléter » doit arriver sous la forme « Option : texte »
      const valid = (x) =>
        (q.options.includes(x) && !details.includes(x)) ||
        (q.other && x.startsWith(`${q.other} : `) && x.length > q.other.length + 3) ||
        details.some((d) => x.startsWith(`${d} : `) && x.length > d.length + 3);
      const ex = q.exclusive || [];
      const bad =
        list.length > q.options.length + 1 ||
        !list.every(valid) ||
        list.filter((x) => x.startsWith(`${q.other} : `)).length > 1 ||
        details.some((d) => list.filter((x) => x.startsWith(`${d} : `)).length > 1) ||
        (list.length > 1 && list.some((x) => ex.includes(x))) ||
        (q.required && !list.length);
      if (bad) return Response.json({ error: `Réponse invalide : ${q.label}` }, { status: 400 });
      data[q.id] = list.join(", ");
      continue;
    }
    const v = (body?.[q.id] ?? "").toString().trim().slice(0, 200);
    if (q.type === "choice") {
      const ok = q.options.includes(v) || (q.other && v.startsWith(`${q.other} : `) && v.length > q.other.length + 3);
      if (!ok) return Response.json({ error: `Réponse invalide : ${q.label}` }, { status: 400 });
    } else {
      const err = validateValue(q, v);
      if (err) return Response.json({ error: `${q.label} : ${err}` }, { status: 400 });
    }
    data[q.id] = v;
  }

  const rows = QUESTIONS.map((q) => [q.label, data[q.id] || "— non renseigné —"]);
  const text = rows.map(([k, v]) => `${k} : ${v}`).join("\n");
  const html = `
  <div style="font-family:Arial,sans-serif;background:#0D0D0D;padding:24px;color:#F2F0EB">
    <h2 style="margin:0 0 4px;color:#D29D2A;font-style:italic;letter-spacing:1px">NOUVELLE RÉPONSE · CHAL FIVE</h2>
    <p style="margin:0 0 18px;color:#8C8780;font-size:13px">${new Date().toLocaleString("fr-FR", { timeZone: "Africa/Douala" })}</p>
    <table style="border-collapse:collapse;width:100%;max-width:560px">
      ${rows
        .map(
          ([k, v]) => `<tr>
        <td style="padding:10px 12px;border-bottom:1px solid #2a2a2a;color:#8C8780;font-size:13px;width:42%">${esc(k)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #2a2a2a;font-weight:bold">${esc(v)}</td></tr>`
        )
        .join("")}
    </table>
  </div>`;

  const { SMTP_USER, SMTP_PASS, MAIL_TO } = process.env;
  const { EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY, EMAILJS_PRIVATE_KEY } = process.env;
  const to = MAIL_TO || "chalfive237@gmail.com";
  const subject = `Nouvelle réponse — ${data.nom}`;

  // 1) Envoi via EmailJS (prioritaire si configuré : pas besoin de mot de passe Gmail)
  if (EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID && EMAILJS_PUBLIC_KEY && EMAILJS_PRIVATE_KEY) {
    try {
      const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_id: EMAILJS_SERVICE_ID,
          template_id: EMAILJS_TEMPLATE_ID,
          user_id: EMAILJS_PUBLIC_KEY,
          accessToken: EMAILJS_PRIVATE_KEY,
          template_params: {
            subject,
            message_html: html,
            message: text,
            to_email: to,
            reply_to: data.email || to,
            nom: data.nom,
            // Variables du modèle EmailJS par défaut ({{name}}, {{time}})
            name: data.nom,
            time: new Date().toLocaleString("fr-FR", { timeZone: "Africa/Douala" }),
          },
        }),
      });
      if (!res.ok) throw new Error(`EmailJS ${res.status} : ${await res.text()}`);
      return Response.json({ ok: true });
    } catch (e) {
      console.error("Erreur d'envoi EmailJS", e);
      return Response.json({ error: "Échec de l'envoi" }, { status: 500 });
    }
  }

  // 2) Sinon, envoi direct par Gmail (SMTP + mot de passe d'application)
  if (!SMTP_USER || !SMTP_PASS) {
    if (process.env.NODE_ENV !== "production") {
      console.log("\n[DEV] SMTP non configuré — réponse reçue :\n" + text + "\n");
      return Response.json({ ok: true, dev: true });
    }
    console.error("Aucun envoi configuré : variables EMAILJS_* ou SMTP_USER / SMTP_PASS manquantes");
    return Response.json({ error: "Envoi non configuré" }, { status: 500 });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: SMTP_USER, pass: SMTP_PASS.replace(/\s/g, "") },
    });
    await transporter.sendMail({
      from: `"Formulaire Chal Five" <${SMTP_USER}>`,
      to,
      replyTo: data.email || undefined,
      subject,
      text,
      html,
    });
    return Response.json({ ok: true });
  } catch (e) {
    console.error("Erreur d'envoi mail", e);
    return Response.json({ error: "Échec de l'envoi" }, { status: 500 });
  }
}
