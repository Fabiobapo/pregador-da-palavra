import SimpleForm from "@/components/SimpleForm";
import Link from "next/link";

export default function InvitePage() {
  return (
    <main className="mx-auto max-w-lg p-6">
      <h1 className="mb-4 text-2xl font-bold">Aceitar convite</h1>
      <SimpleForm
        endpoint="/api/invites/accept"
        fields={[
          { name: "token", label: "Token do convite", type: "text", required: true },
          { name: "name", label: "Nome", type: "text", required: true },
          { name: "password", label: "Senha", type: "password", required: true },
        ]}
        submitLabel="Criar conta"
      />
      <div className="mt-4 text-sm text-gray-600">
        <Link href="/entrar">Voltar ao login</Link>
      </div>
    </main>
  );
}
