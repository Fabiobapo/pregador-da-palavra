export class InvalidJsonResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidJsonResponseError";
  }
}

export async function parseJsonResponse<T>(response: Response): Promise<T> {
  const body = await response.text();
  if (!body.trim()) {
    throw new InvalidJsonResponseError("O servidor retornou uma resposta vazia. Tente novamente.");
  }

  try {
    return JSON.parse(body) as T;
  } catch {
    throw new InvalidJsonResponseError("O servidor retornou uma resposta inválida. Tente novamente.");
  }
}
