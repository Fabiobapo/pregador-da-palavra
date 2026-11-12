import SimpleForm from "@/components/SimpleForm";
import Link from "next/link";

export default function RecoverPage() {
  return (
    <main className="mx-auto max-w-lg p-6">
      <h1 className="mb-4 text-2xl font-bold">Recuperar senha</h1>
      <SimpleForm
        endpoint="/api/auth/forgot"
        fields={[{ name: "email", label: "E-mail", type: "email", required: true }]}
        submitLabel="Enviar link"
      />
      <div className="mt-4 text-sm text-gray-600">
        <Link href="/entrar">Voltar ao login</Link>
      </div>
    </main>
  );
}
