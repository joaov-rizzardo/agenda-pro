"use server";

import { redirect } from "next/navigation";

import { auth, unstable_update } from "@/auth";
import { WorkspaceAuthError } from "@/lib/workspace/authorization";
import { acceptInvite as acceptInviteForUser } from "@/lib/workspace/invite-service";

/**
 * Server Action invoked from the public accept screen (and the invite-aware
 * signup flow). Re-validates the token server-side, creates/activates the
 * membership, activates the workspace in the session, and lands the user on the
 * dashboard (contracts/invite-accept.md, SC-002).
 */
export async function acceptInvite(token: string): Promise<void> {
  const session = await auth();
  if (!session) {
    redirect(`/login?callbackUrl=/convite/${encodeURIComponent(token)}`);
  }

  let workspaceId: string;
  try {
    ({ workspaceId } = await acceptInviteForUser({
      userId: session.user.id,
      rawToken: token,
    }));
  } catch (error) {
    if (error instanceof WorkspaceAuthError) {
      // Re-render the accept page in its invalid / wrong-account state.
      redirect(`/convite/${encodeURIComponent(token)}`);
    }
    throw error;
  }

  await unstable_update({ user: { activeWorkspaceId: workspaceId } });
  redirect("/dashboard");
}
