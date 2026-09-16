"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import {
  LogOut,
  Trophy,
  Users,
  CalendarDays,
  Target,
} from "lucide-react";

type Group = {
  id: string;
  name: string;
};

type Player = {
  id: string;
  name: string;
  photo_url: string | null;
  overall: number;
  attendance: number;
  goals: number;
  assists: number;
  conceded: number;
};

export default function Admin() {
  const supabase = createClient();

  const [groups, setGroups] = useState<Group[]>([]);
  const [groupId, setGroupId] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);

  const [newPlayer, setNewPlayer] = useState("");
  const [groupName, setGroupName] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadingPlayers, setLoadingPlayers] = useState(false);

  // =========================
  // CARREGAR GRUPOS
  // =========================

  async function loadGroups() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      location.href = "/admin/login";
      return;
    }

    const { data, error } = await supabase
      .from("groups")
      .select("id,name")
      .order("created_at");

    if (error) {
      console.error("Erro ao carregar grupos:", error);
      setGroups([]);
      setLoading(false);
      return;
    }

    const loadedGroups = data || [];

    setGroups(loadedGroups);

    // Só define o primeiro grupo se ainda não houver um selecionado.
    if (!groupId && loadedGroups.length > 0) {
      setGroupId(loadedGroups[0].id);
    }

    setLoading(false);
  }

  // =========================
  // CARREGAR JOGADORES
  // =========================

  async function loadPlayers(id: string) {
    if (!id) {
      setPlayers([]);
      return;
    }

    setLoadingPlayers(true);

    const { data, error } = await supabase
      .from("player_overalls")
      .select("*")
      .eq("group_id", id)
      .order("overall", { ascending: false });

    if (error) {
      console.error("Erro ao carregar jogadores:", error);
      setPlayers([]);
    } else {
      setPlayers(data || []);
    }

    setLoadingPlayers(false);
  }

  // =========================
  // CARREGAR INICIALMENTE
  // =========================

  useEffect(() => {
    loadGroups();
  }, []);

  // =========================
  // QUANDO TROCAR DE GRUPO
  // =========================

  useEffect(() => {
    if (groupId) {
      loadPlayers(groupId);
    }
  }, [groupId]);

  // =========================
  // CRIAR GRUPO
  // =========================

  async function addGroup(e: React.FormEvent) {
    e.preventDefault();

    const name = groupName.trim();

    if (!name) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data, error } = await supabase
      .from("groups")
      .insert({
        name,
        owner_id: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Erro ao criar grupo:", error);
      return;
    }

    if (data) {
      setGroupName("");

      // Atualiza somente os grupos.
      await loadGroups();

      // Seleciona o grupo recém-criado.
      setGroupId(data.id);

      // Carrega os jogadores desse grupo.
      await loadPlayers(data.id);
    }
  }

  // =========================
  // ADICIONAR JOGADOR
  // =========================

  async function addPlayer(e: React.FormEvent) {
    e.preventDefault();

    const name = newPlayer.trim();

    if (!name || !groupId) return;

    const { error } = await supabase.from("players").insert({
      group_id: groupId,
      name,
    });

    if (error) {
      console.error("Erro ao adicionar jogador:", error);
      return;
    }

    setNewPlayer("");

    // Atualiza somente a lista de jogadores.
    await loadPlayers(groupId);
  }

  // =========================
  // LOGOUT
  // =========================

  async function logout() {
    await supabase.auth.signOut();
    location.href = "/admin/login";
  }

  // =========================
  // LOADING INICIAL
  // =========================

  if (loading) {
    return (
      <main className="page">
        <div className="card">Carregando...</div>
      </main>
    );
  }

  // =========================
  // INTERFACE
  // =========================

  return (
    <main className="page">
      <header className="top">
        <div>
          <span className="badge">⚽ Racha FC</span>
          <h1>Painel do organizador</h1>
        </div>

        <button className="ghost" onClick={logout}>
          <LogOut size={17} />
          Sair
        </button>
      </header>

      <section className="toolbar">
        <select
          value={groupId}
          onChange={(e) => setGroupId(e.target.value)}
        >
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>

        <form onSubmit={addGroup} className="inline">
          <input
            placeholder="Novo grupo"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
          />

          <button className="button" type="submit">
            Criar grupo
          </button>
        </form>
      </section>

      <nav className="tabs">
        <a className="active">Racha de hoje</a>
        <a href="/admin/jogadores">Jogadores</a>
        <a href="/admin/historico">Histórico</a>
      </nav>

      <section className="grid">
        {/* =========================
            JOGADORES
        ========================= */}

        <div className="card">
          <h2>
            <Users /> Jogadores
          </h2>

          <form onSubmit={addPlayer} className="inline">
            <input
              placeholder="Nome do jogador"
              value={newPlayer}
              onChange={(e) => setNewPlayer(e.target.value)}
            />

            <button className="button" type="submit">
              Adicionar
            </button>
          </form>

          <div className="list">
            {loadingPlayers ? (
              <div className="muted">Carregando jogadores...</div>
            ) : players.length === 0 ? (
              <div className="muted">
                Nenhum jogador cadastrado neste grupo.
              </div>
            ) : (
              players.map((p) => (
                <div className="player" key={p.id}>
                  <div className="avatar">
                    {p.photo_url ? (
                      <img src={p.photo_url} alt={p.name} />
                    ) : (
                      p.name[0]?.toUpperCase()
                    )}
                  </div>

                  <div>
                    <b>{p.name}</b>

                    <small>
                      Overall {p.overall} · {p.goals} gols ·{" "}
                      {p.assists} assist.
                    </small>
                  </div>

                  <strong>{p.overall}</strong>
                </div>
              ))
            )}
          </div>
        </div>

        {/* =========================
            RACHA DE HOJE
        ========================= */}

        <div className="card">
          <h2>
            <CalendarDays /> Racha de hoje
          </h2>

          <p className="muted">
            A estrutura do banco já suporta partidas, times, gols,
            assistências, goleiros rotativos e substituições.
          </p>

          <div className="stats">
            <div>
              <Target />
              <b>Artilheiro</b>
              <span>Calculado pela partida</span>
            </div>

            <div>
              <Trophy />
              <b>Garçom</b>
              <span>Calculado pela partida</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
