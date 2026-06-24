"use server";

import { redirect } from "next/navigation";
import { CredentialsSignin } from "next-auth";

import { signIn, signOut } from "@/auth";
import { Prisma } from "@/generated/prisma/client";
import { hashPassword } from "@/lib/auth/password";
import { createVerificationToken } from "@/lib/auth/verification-token";
import { sendVerificationEmail } from "@/lib/email/send-verification-email";
import { prisma } from "@/lib/prisma";
import { LoginSchema, SignUpSchema } from "@/lib/validation/auth";

export type SignUpState =
  | undefined
  | {
      errors: Partial<
        Record<"firstName" | "lastName" | "email" | "password", string[]>
      >;
    }
  | { success: true };

const EMAIL_IN_USE_ERROR = "Já existe uma conta com esse e-mail.";

export async function signUp(
  _state: SignUpState,
  formData: FormData
): Promise<SignUpState> {
  const validatedFields = SignUpSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  const { firstName, lastName, email, password } = validatedFields.data;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return { errors: { email: [EMAIL_IN_USE_ERROR] } };
  }

  const passwordHash = await hashPassword(password);

  try {
    await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        passwordHash,
        emailVerified: null,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { errors: { email: [EMAIL_IN_USE_ERROR] } };
    }
    throw error;
  }

  const token = await createVerificationToken(email);
  await sendVerificationEmail(email, token);

  return { success: true };
}

export type LoginState = undefined | { error: string };

const GENERIC_LOGIN_ERROR =
  "E-mail ou senha inválidos. Se você acabou de se cadastrar, verifique seu e-mail antes de entrar.";

export async function logIn(
  _state: LoginState,
  formData: FormData
): Promise<LoginState> {
  const validatedFields = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validatedFields.success) {
    return { error: GENERIC_LOGIN_ERROR };
  }

  const { email, password } = validatedFields.data;

  try {
    await signIn("credentials", { email, password, redirect: false });
  } catch (error) {
    if (error instanceof CredentialsSignin) {
      return { error: GENERIC_LOGIN_ERROR };
    }
    throw error;
  }

  redirect("/dashboard");
}

export async function signInWithGoogle(): Promise<void> {
  await signIn("google", { redirectTo: "/dashboard" });
}

export async function logOut(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}
