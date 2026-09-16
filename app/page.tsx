import Link from "next/link";

export default function Home() {
  return (
    <main className="landing">
      <section className="hero">
        <span className="badge">⚽ Racha FC</span>
        <h1>Organize o racha sem perder nenhum detalhe.</h1>
        <p>Jogadores, times, gols, assistências, goleiros rotativos, substituições, histórico e overall em um só lugar.</p>
        <Link className="button" href="/admin/login">Entrar como organizador</Link>
      </section>
    </main>
  );
}