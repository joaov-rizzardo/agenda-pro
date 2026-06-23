import { NextRequest, NextResponse } from "next/server";
import * as z from "zod";

import { consumeVerificationToken } from "@/lib/auth/verification-token";
import { prisma } from "@/lib/prisma";

const VerifyEmailQuerySchema = z.object({
  token: z.string().min(1),
  email: z.email(),
});

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const validatedParams = VerifyEmailQuerySchema.safeParse({
    token: searchParams.get("token"),
    email: searchParams.get("email"),
  });

  if (!validatedParams.success) {
    return NextResponse.redirect(
      new URL("/login?verified=error", request.url)
    );
  }

  const { token, email } = validatedParams.data;

  const isValid = await consumeVerificationToken(email, token);
  if (!isValid) {
    return NextResponse.redirect(
      new URL("/login?verified=error", request.url)
    );
  }

  await prisma.user.update({
    where: { email },
    data: { emailVerified: new Date() },
  });

  return NextResponse.redirect(
    new URL("/login?verified=success", request.url)
  );
}
