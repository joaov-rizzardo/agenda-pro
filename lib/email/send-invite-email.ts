import type { WorkspaceRole } from "@/generated/prisma/client";
import { deliverEmail } from "@/lib/email/deliver";

const ROLE_LABELS: Record<WorkspaceRole, string> = {
  OWNER: "Proprietário",
  ADMIN: "Administrador",
  MEMBER: "Membro",
};

export async function sendInviteEmail(params: {
  email: string;
  workspaceName: string;
  role: WorkspaceRole;
  jobTitle: string | null;
  token: string;
}): Promise<void> {
  const { email, workspaceName, role, jobTitle, token } = params;
  const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";
  const inviteUrl = `${baseUrl}/convite/${encodeURIComponent(token)}`;

  const cargoLine = jobTitle
    ? `<p>Cargo: <strong>${jobTitle}</strong></p>`
    : "";

  await deliverEmail({
    to: email,
    subject: `Convite para participar de ${workspaceName} no Agenda Pro`,
    html: `<p>Você foi convidado para participar do workspace <strong>${workspaceName}</strong> no Agenda Pro.</p><p>Nível de acesso: <strong>${ROLE_LABELS[role]}</strong></p>${cargoLine}<p>Clique no link abaixo para aceitar o convite:</p><p><a href="${inviteUrl}">Aceitar convite</a></p><p>Este convite expira em 7 dias.</p>`,
    devLink: { label: "Convite", url: inviteUrl },
  });
}
