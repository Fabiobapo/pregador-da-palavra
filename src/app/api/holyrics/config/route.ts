import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireCtx, fail } from "@/lib/auth";
import { encrypt } from "@/lib/crypto";

const schema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("direct"),
    host: z.string().trim().min(1).max(255),
    port: z.coerce.number().int().min(1).max(65535),
    pathPrefix: z.string().trim().startsWith("/").max(200),
    secret: z.string().min(1).max(500).optional(),
    enabled: z.boolean(),
  }),
  z.object({
    mode: z.literal("connector"),
    connectorUrl: z.string().url().max(500),
    secret: z.string().min(16).max(500).optional(),
    enabled: z.boolean(),
  }),
]);

export async function GET() {
  try {
    const { churchId } = await requireCtx();
    const config = await db.holyricsConfig.findUnique({ where: { churchId } });
    if (!config) return NextResponse.json({ config: null });
    return NextResponse.json({
      config: {
        mode: config.connectorUrl ? "connector" : "direct",
        host: config.host,
        port: config.port,
        pathPrefix: config.pathPrefix,
        connectorUrl: config.connectorUrl,
        enabled: config.enabled,
        hasSecret: Boolean(config.secretEnc),
      },
    });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(req: Request) {
  try {
    const { churchId, userId } = await requireCtx(["ADMIN", "PASTOR", "EDITOR"]);
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Configuração inválida." }, { status: 400 });

    const data = parsed.data;
    const current = await db.holyricsConfig.findUnique({
      where: { churchId },
      select: { connectorUrl: true, secretEnc: true },
    });
    const secretEnc = data.secret ? encrypt(data.secret) : undefined;
    const common = {
      enabled: data.enabled,
      updatedById: userId,
      secret: null,
      ...(secretEnc ? { secretEnc } : {}),
    };
    const connection = data.mode === "direct"
      ? {
          host: data.host,
          port: data.port,
          pathPrefix: data.pathPrefix,
          connectorUrl: null,
          connectorKey: null,
        }
      : {
          connectorUrl: data.connectorUrl.replace(/\/$/, ""),
          connectorKey: null,
        };

    const switchingMode = current && Boolean(current.connectorUrl) !== (data.mode === "connector");
    if (!secretEnc && (!current?.secretEnc || switchingMode)) {
      return NextResponse.json({
        error: data.mode === "connector" ? "Informe a chave do conector." : "Informe o token do Holyrics.",
      }, { status: 400 });
    }

    const config = await db.holyricsConfig.upsert({
      where: { churchId },
      update: { ...common, ...connection },
      create: {
        churchId,
        ...common,
        ...connection,
        secretEnc: secretEnc ?? "",
      },
    });

    return NextResponse.json({
      ok: true,
      config: {
        mode: config.connectorUrl ? "connector" : "direct",
        host: config.host,
        port: config.port,
        pathPrefix: config.pathPrefix,
        connectorUrl: config.connectorUrl,
        enabled: config.enabled,
        hasSecret: Boolean(config.secretEnc),
      },
    });
  } catch (error) {
    return fail(error);
  }
}
