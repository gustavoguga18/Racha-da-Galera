 "use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";

export default function Login() {
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [error,setError]=useState("");
  const router=useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError("");
    const { error } = await createClient().auth.signInWithPassword({email,password});
    if(error) return setError(error.message);
    router.push("/admin");
  }
  return <main className="auth"><form className="card" onSubmit={submit}>
    <h1>Organizador</h1><p>Entre para gerenciar seus rachas.</p>
    <label>E-mail<input value={email} onChange={e=>setEmail(e.target.value)} type="email" required/></label>
    <label>Senha<input value={password} onChange={e=>setPassword(e.target.value)} type="password" required/></label>
    {error && <div className="error">{error}</div>}
    <button className="button">Entrar</button>
  </form></main>;
}