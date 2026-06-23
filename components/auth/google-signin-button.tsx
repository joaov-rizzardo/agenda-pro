import { signInWithGoogle } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

export function GoogleSignInButton() {
  return (
    <form action={signInWithGoogle}>
      <Button type="submit" variant="outline" className="w-full">
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
          <path
            fill="#4285F4"
            d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47c-.29 1.49-1.13 2.75-2.41 3.6v2.99h3.86c2.26-2.08 3.57-5.17 3.57-8.83z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.24 0 5.95-1.07 7.93-2.9l-3.86-2.99c-1.07.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
          />
          <path
            fill="#FBBC05"
            d="M5.27 14.31a7.2 7.2 0 0 1 0-4.62V6.6H1.29a11.98 11.98 0 0 0 0 10.8z"
          />
          <path
            fill="#EA4335"
            d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.94 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.6l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"
          />
        </svg>
        Continuar com Google
      </Button>
    </form>
  );
}
