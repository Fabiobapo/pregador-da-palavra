export default function Home() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-20">
      <h1 className="font-serif text-5xl leading-tight">Pregador da Palavra</h1>
      <p className="mt-4 max-w-prose text-lg">Estude o texto, monte o esboço e leve a mensagem à projeção, tudo no mesmo lugar.</p>
      <a href="/entrar" className="mt-8 inline-block rounded bg-accent px-5 py-3 font-medium text-white">Entrar ou criar conta</a>
    </main>
  );
}
