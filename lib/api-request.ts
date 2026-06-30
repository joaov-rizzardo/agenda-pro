/**
 * Client-side fetch helper for the workspace JSON APIs. Throws an Error whose
 * message is the server's pt-BR `{ error }` string so React Query mutations can
 * surface it directly in a toast.
 */
export async function apiRequest<T>(
  input: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(input, init);

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    // no JSON body
  }

  if (!response.ok) {
    const message =
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      typeof (payload as { error: unknown }).error === "string"
        ? (payload as { error: string }).error
        : "Algo deu errado. Tente novamente.";
    throw new Error(message);
  }

  return payload as T;
}
