import SimpleForm from "@/components/SimpleForm";
import Link from "next/link";

export default function ResetPage() {
  return (
    <main className="mx-auto max-w-lg p-6">
      <h1 className="mb-4 text-2xl font-bold">Redefinir senha</h1>
      <SimpleForm
        endpoint="/api/auth/reset"
        fields={[
          { name: "token", label: "Token", type: "text", required: true },
          { name: "password", label: "Nova senha", type: "password", required: true },
        ]}
        submitLabel="Salvar senha"
      />
      <div className="mt-4 text-sm text-gray-600">
        <Link href="/entrar">Voltar ao login</Link>
      </div>
    </main>
  );
}
