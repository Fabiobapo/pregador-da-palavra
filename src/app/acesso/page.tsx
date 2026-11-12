import AccessForm from "./AccessForm";

export default function AccessPage() {
  return (
    <main className="mx-auto max-w-sm p-6 pt-16">
      <h1 className="font-serif text-3xl">Pregador da Palavra</h1>
      <p className="mt-3 text-sm text-gray-600">Este aplicativo é privado. Informe sua senha de acesso para continuar.</p>
      <AccessForm />
    </main>
  );
}
