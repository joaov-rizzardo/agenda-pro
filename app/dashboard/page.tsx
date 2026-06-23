import { auth } from "@/auth";

export default async function DashboardPage() {
  const session = await auth();

  return (
    <main className="flex flex-1 flex-col gap-2 p-8">
      <h1 className="font-display text-2xl font-semibold text-foreground">
        Bem-vindo(a), {session?.user?.email}
      </h1>
      <p className="text-sm text-muted-foreground">
        Seu painel está a caminho.
      </p>
    </main>
  );
}
