import { getResendClient } from "@/lib/email/resend";

/**
 * Sends a transactional e-mail via Resend. In development it also prints the
 * actionable link to the server console so the flow can be tested even when
 * Resend can't deliver to the recipient (e.g. the shared `onboarding@resend.dev`
 * sender only delivers to the account owner). Resend delivery errors are logged
 * instead of thrown, so the calling flow still succeeds and the console link
 * stays usable.
 */
export async function deliverEmail(params: {
  to: string;
  subject: string;
  html: string;
  devLink?: { label: string; url: string };
}): Promise<void> {
  const { to, subject, html, devLink } = params;

  if (process.env.NODE_ENV !== "production" && devLink) {
    console.log(
      `\n📧 ${devLink.label} → ${to}\n   ${devLink.url}\n`
    );
  }

  const { error } = await getResendClient().emails.send({
    from: process.env.EMAIL_FROM!,
    to,
    subject,
    html,
  });

  if (error) {
    console.error(`[email] Resend não entregou para ${to}:`, error);
  }
}
