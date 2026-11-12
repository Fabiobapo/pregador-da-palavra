import { describe, expect, it } from "vitest";
import { InvalidJsonResponseError, parseJsonResponse } from "@/lib/response";

describe("parseJsonResponse", () => {
  it("parses a JSON response", async () => {
    const response = new Response(JSON.stringify({ ok: true }));

    await expect(parseJsonResponse<{ ok: boolean }>(response)).resolves.toEqual({ ok: true });
  });

  it("reports an empty response", async () => {
    await expect(parseJsonResponse(new Response("")))
      .rejects.toMatchObject({
        name: InvalidJsonResponseError.name,
        message: "O servidor retornou uma resposta vazia. Tente novamente.",
      });
  });

  it("reports malformed JSON", async () => {
    await expect(parseJsonResponse(new Response("{")))
      .rejects.toMatchObject({
        name: InvalidJsonResponseError.name,
        message: "O servidor retornou uma resposta inválida. Tente novamente.",
      });
  });
});
