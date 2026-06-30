import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AcceptInviteCard } from "@/components/invite/accept-invite-card";
import { prisma } from "@/lib/prisma";
import { getInviteByToken } from "@/lib/workspace/invite-service";

export default async function ConvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invite = await getInviteByToken(token);
  const session = await auth();

  let content: React.ReactNode;

  if (!invite || !invite.isValid) {
    const reason =
      invite?.status === "EXPIRED"
        ? "expired"
        : invite?.status === "CANCELLED"
          ? "cancelled"
          : invite?.status === "ACCEPTED"
            ? "accepted"
            : "invalid";
    content = <AcceptInviteCard state={{ kind: reason }} />;
  } else if (session) {
    if (session.user.email === invite.email) {
      content = (
        <AcceptInviteCard
          state={{
            kind: "valid",
            token,
            workspaceName: invite.workspaceName,
            role: invite.role,
            jobTitle: invite.jobTitle,
          }}
        />
      );
    } else {
      content = (
        <AcceptInviteCard
          state={{ kind: "wrong-account", email: invite.email }}
        />
      );
    }
  } else {
    const existingUser = await prisma.user.findUnique({
      where: { email: invite.email },
      select: { id: true },
    });

    if (existingUser) {
      redirect(`/login?callbackUrl=/convite/${encodeURIComponent(token)}`);
    } else {
      redirect(`/signup?invite=${encodeURIComponent(token)}`);
    }
  }

  return (
    <main className="relative flex flex-1 flex-col items-center justify-center gap-6 overflow-hidden p-6 py-12">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-48 bg-[image:var(--gradient-primary)]"
      />
      <div className="relative z-10 w-full max-w-md">{content}</div>
    </main>
  );
}
