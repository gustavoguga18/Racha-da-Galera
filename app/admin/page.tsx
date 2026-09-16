 "use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { LogOut, Trophy, Users, CalendarDays, Target } from "lucide-react";

type Group={id:string;name:string};
type Player={id:string;name:string;photo_url:string|null;overall:number;attendance:number;goals:number;assists:number;conceded:number};

export default function Admin() {
  const supabase=createClient();
  const [groups,setGroups]=useState<Group[]>([]);
  const [groupId,setGroupId]=useState("");
  const [players,setPlayers]=useState<Player[]>([]);
  const [newPlayer,setNewPlayer]=useState("");
  const [groupName,setGroupName]=useState("");
  const [loading,setLoading]=useState(true);

  async function load() {
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){location.href="/admin/login";return}
    const {data:g}=await supabase.from("groups").select("id,name").order("created_at");
    setGroups(g||[]);
    const id=groupId || g?.[0]?.id || "";
    if(id){setGroupId(id); const {data:p}=await supabase.from("player_overalls").select("*").eq("group_id",id).order("overall",{ascending:false}); setPlayers(p||[]);}
    setLoading(false);
  }
  useEffect(()=>{load()},[groupId]);

  async function addGroup(e:React.FormEvent){e.preventDefault(); const {data:{user}}=await supabase.auth.getUser(); if(!user)return; const {data}=await supabase.from("groups").insert({name:groupName,owner_id:user.id}).select().single(); if(data){setGroupName("");setGroupId(data.id);load();}}
  async function addPlayer(e:React.FormEvent){e.preventDefault(); if(!newPlayer||!groupId)return; await supabase.from("players").insert({group_id:groupId,name:newPlayer});setNewPlayer("");load();}
  async function logout(){await supabase.auth.signOut();location.href="/admin/login"}

  if(loading)return <main className="page"><div className="card">Carregando...</div></main>;
  return <main className="page">
    <header className="top"><div><span className="badge">⚽ Racha FC</span><h1>Painel do organizador</h1></div><button className="ghost" onClick={logout}><LogOut size={17}/> Sair</button></header>
    <section className="toolbar">
      <select value={groupId} onChange={e=>setGroupId(e.target.value)}>{groups.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select>
      <form onSubmit={addGroup} className="inline"><input placeholder="Novo grupo" value={groupName} onChange={e=>setGroupName(e.target.value)}/><button className="button">Criar grupo</button></form>
    </section>
    <nav className="tabs"><a className="active">Racha de hoje</a><a href="/admin/jogadores">Jogadores</a><a href="/admin/historico">Histórico</a></nav>
    <section className="grid">
      <div className="card"><h2><Users/> Jogadores</h2><form onSubmit={addPlayer} className="inline"><input placeholder="Nome do jogador" value={newPlayer} onChange={e=>setNewPlayer(e.target.value)}/><button className="button">Adicionar</button></form><div className="list">{players.map(p=><div className="player" key={p.id}><div className="avatar">{p.photo_url?<img src={p.photo_url}/>:p.name[0]}</div><div><b>{p.name}</b><small>Overall {p.overall} · {p.goals} gols · {p.assists} assist.</small></div><strong>{p.overall}</strong></div>)}</div></div>
      <div className="card"><h2><CalendarDays/> Racha de hoje</h2><p className="muted">A estrutura do banco já suporta partidas, times, gols, assistências, goleiros rotativos e substituições.</p><div className="stats"><div><Target/><b>Artilheiro</b><span>Calculado pela partida</span></div><div><Trophy/><b>Garçom</b><span>Calculado pela partida</span></div></div></div>
    </section>
  </main>;
}