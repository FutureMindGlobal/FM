import { createClient } from "npm:@supabase/supabase-js@2.111.0";

const allowedOrigins = new Set([
  "https://futuremindglobal.org",
  "https://www.futuremindglobal.org",
]);

function responseHeaders(request: Request) {
  const origin = request.headers.get("origin") ?? "";
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": allowedOrigins.has(origin)
      ? origin
      : "https://www.futuremindglobal.org",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character] ?? character);
}

function emailContent(name: string, templateKey: string) {
  const displayName = escapeHtml(name.trim() || "Student");
  const isInterest = templateKey === "interest_confirmation";
  const subject = isInterest
    ? "Registration interest received – Future Mind Global"
    : "Registration received – Future Mind Global";
  const statusText = isInterest
    ? "We have received your registration interest. Our team will contact you when full registration is available."
    : "We have received your registration. It is now pending administrator review.";

  return {
    subject,
    html: `<!doctype html><html><body style="margin:0;background:#f5f1e9;font-family:Arial,sans-serif;color:#10223b"><div style="max-width:620px;margin:0 auto;padding:32px 18px"><div style="background:#071a34;padding:26px 30px;color:#fff;border-top:5px solid #19d9ec"><div style="font-size:12px;letter-spacing:2px;color:#19d9ec">FUTURE MIND GLOBAL</div><h1 style="margin:12px 0 0;font-size:28px">Registration received</h1></div><div style="background:#fff;padding:30px;border:1px solid #dfe5ec"><p style="font-size:17px">Dear ${displayName},</p><p style="font-size:16px;line-height:1.7">${statusText}</p><div style="margin:24px 0;padding:18px;background:#f3fbfd;border-left:4px solid #19d9ec"><strong>What happens next?</strong><p style="margin:8px 0 0;line-height:1.6">You will receive another update if the administrator needs additional information or changes the registration status.</p></div><a href="https://www.futuremindglobal.org/dashboard" style="display:inline-block;background:#071a34;color:#fff;text-decoration:none;padding:13px 20px">Open student dashboard</a><p style="margin-top:28px;font-size:14px;line-height:1.6;color:#5f6f86">Need help? Reply to this email or contact <a href="mailto:info@futuremindglobal.org" style="color:#087f8c">info@futuremindglobal.org</a>.</p></div><div style="padding:18px 8px;color:#748198;font-size:12px;text-align:center">This is an essential registration message, not a marketing email.<br>Future Mind Global · futuremindglobal.org</div></div></body></html>`,
    text: `Dear ${name.trim() || "Student"},\n\n${statusText}\n\nOpen your dashboard: https://www.futuremindglobal.org/dashboard\n\nNeed help? Contact info@futuremindglobal.org.\n\nThis is an essential registration message, not a marketing email.`,
  };
}

Deno.serve(async (request: Request) => {
  const jsonHeaders = responseHeaders(request);
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: jsonHeaders });
  }
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: jsonHeaders });
  }

  const resendKey = Deno.env.get("RESEND_API_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!resendKey || !supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Email service is not configured" }), { status: 503, headers: jsonHeaders });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const body = await request.json().catch(() => ({}));
  const registrationId = typeof body.registration_id === "string" ? body.registration_id : null;
  const interestId = typeof body.registration_interest_id === "string" ? body.registration_interest_id : null;
  if (!registrationId && !interestId) {
    return new Response(JSON.stringify({ error: "A registration identifier is required" }), { status: 400, headers: jsonHeaders });
  }
  let queueQuery = supabase
    .from("registration_email_queue")
    .select("id,recipient_email,recipient_name,template_key,attempts")
    .eq("status", "pending")
    .lte("scheduled_for", new Date().toISOString())
    .in("template_key", ["interest_confirmation", "registration_confirmation"]);
  queueQuery = registrationId
    ? queueQuery.eq("competition_registration_id", registrationId)
    : queueQuery.eq("registration_interest_id", interestId);
  const { data: jobs, error: queueError } = await queueQuery
    .order("created_at")
    .limit(1);

  if (queueError) {
    return new Response(JSON.stringify({ error: queueError.message }), { status: 500, headers: jsonHeaders });
  }

  let sent = 0;
  let failed = 0;
  for (const job of jobs ?? []) {
    const { data: claimed } = await supabase
      .from("registration_email_queue")
      .update({ status: "processing", attempts: job.attempts + 1, updated_at: new Date().toISOString() })
      .eq("id", job.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();
    if (!claimed) continue;

    const content = emailContent(job.recipient_name, job.template_key);
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `registration-${job.id}`,
        },
        body: JSON.stringify({
          from: "Future Mind Global <info@futuremindglobal.org>",
          reply_to: "info@futuremindglobal.org",
          to: [job.recipient_email],
          subject: content.subject,
          html: content.html,
          text: content.text,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.message || `Resend returned ${response.status}`);
      await supabase.from("registration_email_queue").update({ status: "sent", sent_at: new Date().toISOString(), last_error: null, updated_at: new Date().toISOString() }).eq("id", job.id);
      sent++;
    } catch (error) {
      await supabase.from("registration_email_queue").update({ status: "failed", last_error: error instanceof Error ? error.message.slice(0, 500) : "Unknown email error", updated_at: new Date().toISOString() }).eq("id", job.id);
      failed++;
    }
  }

  return new Response(JSON.stringify({ processed: (jobs ?? []).length, sent, failed }), { status: 200, headers: jsonHeaders });
});
