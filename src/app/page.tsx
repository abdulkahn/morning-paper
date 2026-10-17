export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-12 sm:px-8">
      <header className="border-rule border-y-4 border-double py-6 text-center">
        <p className="text-ink-muted text-xs tracking-[0.3em] uppercase">
          Your personal edition
        </p>
        <h1 className="font-display mt-2 text-5xl font-bold tracking-tight sm:text-7xl">
          The Morning Paper
        </h1>
      </header>
      <section className="mt-10 text-center">
        <p className="text-xl leading-relaxed">
          A paper that remembers what you already know.
        </p>
        <p className="text-ink-muted mt-3">
          One finite edition each morning. Then you&rsquo;re caught up.
        </p>
      </section>
    </main>
  );
}
