"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import {
  LogOut,
  Trophy,
  Users,
  CalendarDays,
  Target,
  Shuffle,
  Play,
  CheckCircle2,
  Plus,
  Minus,
  Shield,
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

type Match = {
  id: string;
  group_id: string;
  played_on: string;
  status: "open" | "finished";
};

type Team = {
  id: string;
  match_id: string;
  name: string;
  color: string;
};

type MatchPlayer = {
  id: string;
  match_id: string;
  team_id: string | null;
  player_id: string;
  role: "field" | "goalkeeper";
  goals: number;
  assists: number;
  goals_conceded: number;
  entered_at: string;
  left_at: string | null;
};

type GoalForm = {
  scorer: string;
  assist: string;
};

export default function Admin() {
  const supabase = createClient();

  // =========================
  // ESTADO GERAL
  // =========================

  const [groups, setGroups] = useState<Group[]>([]);
  const [groupId, setGroupId] = useState("");

  const [players, setPlayers] = useState<Player[]>([]);

  const [newPlayer, setNewPlayer] = useState("");
  const [groupName, setGroupName] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadingPlayers, setLoadingPlayers] = useState(false);

  // =========================
  // RACHA
  // =========================

  const [match, setMatch] = useState<Match | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matchPlayers, setMatchPlayers] = useState<MatchPlayer[]>([]);

  const [presentPlayers, setPresentPlayers] = useState<string[]>([]);

  const [loadingMatch, setLoadingMatch] = useState(false);
  const [startingMatch, setStartingMatch] = useState(false);

  // =========================
  // GOL
  // =========================

  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalForm, setGoalForm] = useState<GoalForm>({
    scorer: "",
    assist: "",
  });

  const [savingGoal, setSavingGoal] = useState(false);

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
  // DATA LOCAL
  // =========================

  function getToday() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  // =========================
  // CARREGAR RACHA DE HOJE
  // =========================

  async function loadTodayMatch(id: string) {
    if (!id) {
      setMatch(null);
      setTeams([]);
      setMatchPlayers([]);
      return;
    }

    setLoadingMatch(true);

    const today = getToday();

    const { data: existingMatch, error: matchError } = await supabase
      .from("matches")
      .select("*")
      .eq("group_id", id)
      .eq("played_on", today)
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (matchError) {
      console.error("Erro ao carregar racha:", matchError);
      setLoadingMatch(false);
      return;
    }

    if (!existingMatch) {
      setMatch(null);
      setTeams([]);
      setMatchPlayers([]);
      setLoadingMatch(false);
      return;
    }

    setMatch(existingMatch);

    const { data: loadedTeams, error: teamsError } = await supabase
      .from("teams")
      .select("*")
      .eq("match_id", existingMatch.id);

    if (teamsError) {
      console.error("Erro ao carregar times:", teamsError);
    }

    const { data: loadedMatchPlayers, error: playersError } =
      await supabase
        .from("match_players")
        .select("*")
        .eq("match_id", existingMatch.id);

    if (playersError) {
      console.error("Erro ao carregar jogadores do racha:", playersError);
    }

    setTeams(loadedTeams || []);
    setMatchPlayers(loadedMatchPlayers || []);

    setPresentPlayers(
      (loadedMatchPlayers || []).map(
        (player: MatchPlayer) => player.player_id
      )
    );

    setLoadingMatch(false);
  }

  // =========================
  // LOAD INICIAL
  // =========================

  useEffect(() => {
    loadGroups();
  }, []);

  // =========================
  // TROCA DE GRUPO
  // =========================

  useEffect(() => {
    if (!groupId) return;

    loadPlayers(groupId);
    loadTodayMatch(groupId);
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
      alert("Não foi possível criar o grupo.");
      return;
    }

    if (data) {
      setGroupName("");

      await loadGroups();

      setGroupId(data.id);

      await loadPlayers(data.id);
      await loadTodayMatch(data.id);
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
      alert("Não foi possível adicionar o jogador.");
      return;
    }

    setNewPlayer("");

    await loadPlayers(groupId);
  }

  // =========================
  // SELECIONAR PRESENTE
  // =========================

  function togglePresent(playerId: string) {
    if (match) return;

    setPresentPlayers((current) => {
      if (current.includes(playerId)) {
        return current.filter((id) => id !== playerId);
      }

      return [...current, playerId];
    });
  }

  // =========================
  // SORTEAR TIMES
  // =========================

  function shufflePlayers(list: Player[]) {
    const shuffled = [...list];

    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));

      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
  }

  // =========================
  // INICIAR RACHA
  // =========================

  async function startMatch() {
    if (!groupId) return;

    if (presentPlayers.length < 2) {
      alert("Selecione pelo menos 2 jogadores.");
      return;
    }

    setStartingMatch(true);

    try {
      // --------------------------------
      // 1. CRIAR PARTIDA
      // --------------------------------

      const { data: newMatch, error: matchError } = await supabase
        .from("matches")
        .insert({
          group_id: groupId,
          played_on: getToday(),
          status: "open",
        })
        .select()
        .single();

      if (matchError || !newMatch) {
        console.error("Erro ao criar partida:", matchError);
        alert("Não foi possível criar o racha.");
        return;
      }

      // --------------------------------
      // 2. CRIAR TIMES
      // --------------------------------

      const { data: newTeams, error: teamsError } = await supabase
        .from("teams")
        .insert([
          {
            match_id: newMatch.id,
            name: "Time Azul",
            color: "#2563eb",
          },
          {
            match_id: newMatch.id,
            name: "Time Vermelho",
            color: "#dc2626",
          },
        ])
        .select();

      if (teamsError || !newTeams || newTeams.length !== 2) {
        console.error("Erro ao criar times:", teamsError);

        await supabase.from("matches").delete().eq("id", newMatch.id);

        alert("Não foi possível criar os times.");
        return;
      }

      const blueTeam = newTeams.find(
        (team: Team) => team.name === "Time Azul"
      );

      const redTeam = newTeams.find(
        (team: Team) => team.name === "Time Vermelho"
      );

      if (!blueTeam || !redTeam) {
        alert("Erro ao identificar os times.");
        return;
      }

      // --------------------------------
      // 3. SORTEAR JOGADORES
      // --------------------------------

      const selectedPlayers = players.filter((player) =>
        presentPlayers.includes(player.id)
      );

      const shuffled = shufflePlayers(selectedPlayers);

      const half = Math.ceil(shuffled.length / 2);

      const bluePlayers = shuffled.slice(0, half);
      const redPlayers = shuffled.slice(half);

      // --------------------------------
      // 4. REGISTRAR PRESENÇA
      // --------------------------------

      const attendanceRows = selectedPlayers.map((player) => ({
        match_id: newMatch.id,
        player_id: player.id,
        present: true,
      }));

      const { error: attendanceError } = await supabase
        .from("player_attendance")
        .insert(attendanceRows);

      if (attendanceError) {
        console.error("Erro ao registrar presença:", attendanceError);
      }

      // --------------------------------
      // 5. REGISTRAR JOGADORES DOS TIMES
      // --------------------------------

      const matchPlayerRows = [
        ...bluePlayers.map((player) => ({
          match_id: newMatch.id,
          team_id: blueTeam.id,
          player_id: player.id,
          role: "field" as const,
        })),

        ...redPlayers.map((player) => ({
          match_id: newMatch.id,
          team_id: redTeam.id,
          player_id: player.id,
          role: "field" as const,
        })),
      ];

      const { data: createdMatchPlayers, error: matchPlayersError } =
        await supabase
          .from("match_players")
          .insert(matchPlayerRows)
          .select();

      if (matchPlayersError) {
        console.error(
          "Erro ao registrar jogadores:",
          matchPlayersError
        );

        await supabase.from("matches").delete().eq("id", newMatch.id);

        alert("Não foi possível montar os times.");
        return;
      }

      setMatch(newMatch);
      setTeams(newTeams);
      setMatchPlayers(createdMatchPlayers || []);
    } finally {
      setStartingMatch(false);
    }
  }

  // =========================
  // ENCONTRAR JOGADOR
  // =========================

  function getPlayer(playerId: string) {
    return players.find((player) => player.id === playerId);
  }

  // =========================
  // ENCONTRAR JOGADOR DA PARTIDA
  // =========================

  function getMatchPlayer(playerId: string) {
    return matchPlayers.find(
      (player) => player.player_id === playerId
    );
  }

  // =========================
  // TIME DO JOGADOR
  // =========================

  function getPlayerTeam(playerId: string) {
    const mp = getMatchPlayer(playerId);

    if (!mp) return null;

    return teams.find((team) => team.id === mp.team_id) || null;
  }

  // =========================
  // PLACAR
  // =========================

  function getTeamScore(teamId: string) {
    return matchPlayers
      .filter((player) => player.team_id === teamId)
      .reduce((total, player) => total + player.goals, 0);
  }

  // =========================
  // GOLEIRO
  // =========================

  function getGoalkeeper(teamId: string) {
    return matchPlayers.find(
      (player) =>
        player.team_id === teamId &&
        player.role === "goalkeeper"
    );
  }

  // =========================
  // DEFINIR GOLEIRO
  // =========================

  async function setGoalkeeper(
    matchPlayerId: string,
    teamId: string
  ) {
    if (!match) return;

    const currentGoalkeeper = getGoalkeeper(teamId);

    // Se já existe goleiro, volta para jogador de linha.
    if (currentGoalkeeper && currentGoalkeeper.id !== matchPlayerId) {
      await supabase
        .from("match_players")
        .update({
          role: "field",
        })
        .eq("id", currentGoalkeeper.id);

      setMatchPlayers((current) =>
        current.map((player) =>
          player.id === currentGoalkeeper.id
            ? {
                ...player,
                role: "field",
              }
            : player
        )
      );
    }

    const { error } = await supabase
      .from("match_players")
      .update({
        role: "goalkeeper",
      })
      .eq("id", matchPlayerId);

    if (error) {
      console.error("Erro ao definir goleiro:", error);
      return;
    }

    setMatchPlayers((current) =>
      current.map((player) =>
        player.id === matchPlayerId
          ? {
              ...player,
              role: "goalkeeper",
            }
          : player
      )
    );
  }

  // =========================
  // ABRIR REGISTRO DE GOL
  // =========================

  function openGoalForm() {
    setGoalForm({
      scorer: "",
      assist: "",
    });

    setShowGoalForm(true);
  }

  // =========================
  // REGISTRAR GOL
  // =========================

  async function registerGoal(e: React.FormEvent) {
    e.preventDefault();

    if (!match) return;

    if (!goalForm.scorer) {
      alert("Selecione quem fez o gol.");
      return;
    }

    setSavingGoal(true);

    try {
      const scorer = getMatchPlayer(goalForm.scorer);

      if (!scorer || !scorer.team_id) {
        alert("Jogador inválido.");
        return;
      }

      // --------------------------------
      // 1. INCREMENTAR GOL DO JOGADOR
      // --------------------------------

      const newGoals = scorer.goals + 1;

      const { error: scorerError } = await supabase
        .from("match_players")
        .update({
          goals: newGoals,
        })
        .eq("id", scorer.id);

      if (scorerError) {
        console.error("Erro ao registrar gol:", scorerError);
        alert("Não foi possível registrar o gol.");
        return;
      }

      // --------------------------------
      // 2. INCREMENTAR ASSISTÊNCIA
      // --------------------------------

      if (goalForm.assist) {
        const assister = getMatchPlayer(goalForm.assist);

        if (assister) {
          await supabase
            .from("match_players")
            .update({
              assists: assister.assists + 1,
            })
            .eq("id", assister.id);
        }
      }

      // --------------------------------
      // 3. GOLS SOFRIDOS PELO GOLEIRO
      // --------------------------------

      const opposingTeam = teams.find(
        (team) => team.id !== scorer.team_id
      );

      if (opposingTeam) {
        const goalkeeper = getGoalkeeper(opposingTeam.id);

        if (goalkeeper) {
          await supabase
            .from("match_players")
            .update({
              goals_conceded: goalkeeper.goals_conceded + 1,
            })
            .eq("id", goalkeeper.id);
        }
      }

      // --------------------------------
      // 4. ATUALIZAR TELA
      // --------------------------------

      await loadTodayMatch(groupId);

      setShowGoalForm(false);

      setGoalForm({
        scorer: "",
        assist: "",
      });
    } finally {
      setSavingGoal(false);
    }
  }

  // =========================
  // FINALIZAR RACHA
  // =========================

  async function finishMatch() {
    if (!match) return;

    const confirmFinish = confirm(
      "Tem certeza que deseja finalizar este racha?"
    );

    if (!confirmFinish) return;

    const { error } = await supabase
      .from("matches")
      .update({
        status: "finished",
      })
      .eq("id", match.id);

    if (error) {
      console.error("Erro ao finalizar racha:", error);
      alert("Não foi possível finalizar o racha.");
      return;
    }

    setMatch(null);
    setTeams([]);
    setMatchPlayers([]);
    setPresentPlayers([]);

    await loadPlayers(groupId);
    await loadTodayMatch(groupId);
  }

  // =========================
  // LOGOUT
  // =========================

  async function logout() {
    await supabase.auth.signOut();
    location.href = "/admin/login";
  }

  // =========================
  // LOADING
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
      {/* =========================
          HEADER
      ========================= */}

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

      {/* =========================
          GRUPO
      ========================= */}

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

      {/* =========================
          MENU
      ========================= */}

      <nav className="tabs">
        <a className="active">Racha de hoje</a>
        <a href="/admin/jogadores">Jogadores</a>
        <a href="/admin/historico">Histórico</a>
      </nav>

      {/* =========================
          RACHA
      ========================= */}

      <section className="racha-area">
        {loadingMatch ? (
          <div className="card">
            <p className="muted">Carregando racha de hoje...</p>
          </div>
        ) : !match ? (
          <>
            {/* =========================
                PRÉ-RACHA
            ========================= */}

            <div className="card">
              <div className="section-title">
                <div>
                  <h2>
                    <CalendarDays /> Racha de hoje
                  </h2>

                  <p className="muted">
                    Selecione quem está presente e depois sorteie os
                    times.
                  </p>
                </div>

                <span className="present-count">
                  {presentPlayers.length} presentes
                </span>
              </div>

              {players.length === 0 ? (
                <div className="empty-box">
                  <Users size={32} />

                  <b>Nenhum jogador cadastrado</b>

                  <span>
                    Adicione os jogadores antes de iniciar o racha.
                  </span>
                </div>
              ) : (
                <>
                  <div className="attendance-list">
                    {players.map((player) => {
                      const selected = presentPlayers.includes(
                        player.id
                      );

                      return (
                        <button
                          key={player.id}
                          type="button"
                          className={`attendance-player ${
                            selected ? "selected" : ""
                          }`}
                          onClick={() =>
                            togglePresent(player.id)
                          }
                        >
                          <div className="avatar">
                            {player.photo_url ? (
                              <img
                                src={player.photo_url}
                                alt={player.name}
                              />
                            ) : (
                              player.name[0]?.toUpperCase()
                            )}
                          </div>

                          <div className="attendance-info">
                            <b>{player.name}</b>

                            <small>
                              Overall {player.overall}
                            </small>
                          </div>

                          <div className="check">
                            {selected ? "✓" : ""}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="start-area">
                    <button
                      className="button start-button"
                      type="button"
                      onClick={startMatch}
                      disabled={
                        startingMatch ||
                        presentPlayers.length < 2
                      }
                    >
                      <Shuffle size={18} />

                      {startingMatch
                        ? "Sorteando..."
                        : "Sortear times e iniciar"}
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* =========================
                CADASTRAR JOGADOR
            ========================= */}

            <div className="card">
              <h2>
                <Users /> Jogadores
              </h2>

              <form onSubmit={addPlayer} className="inline">
                <input
                  placeholder="Nome do jogador"
                  value={newPlayer}
                  onChange={(e) =>
                    setNewPlayer(e.target.value)
                  }
                />

                <button className="button" type="submit">
                  Adicionar
                </button>
              </form>
            </div>
          </>
        ) : (
          <>
            {/* =========================
                PLACAR
            ========================= */}

            <div className="score-card">
              <div className="live-label">
                <span className="live-dot" />
                RACHA EM ANDAMENTO
              </div>

              <div className="scoreboard">
                {teams.map((team) => (
                  <div className="score-team" key={team.id}>
                    <span
                      className="team-color"
                      style={{
                        backgroundColor: team.color,
                      }}
                    />

                    <b>{team.name}</b>

                    <strong>
                      {getTeamScore(team.id)}
                    </strong>
                  </div>
                ))}
              </div>

              <div className="score-actions">
                <button
                  className="button goal-button"
                  type="button"
                  onClick={openGoalForm}
                >
                  <Plus size={18} />
                  Registrar gol
                </button>

                <button
                  className="finish-button"
                  type="button"
                  onClick={finishMatch}
                >
                  <CheckCircle2 size={17} />
                  Finalizar racha
                </button>
              </div>
            </div>

            {/* =========================
                REGISTRAR GOL
            ========================= */}

            {showGoalForm && (
              <div className="card goal-form-card">
                <div className="section-title">
                  <div>
                    <h2>
                      <Target /> Registrar gol
                    </h2>

                    <p className="muted">
                      Informe quem marcou e, se houver, quem deu
                      a assistência.
                    </p>
                  </div>
                </div>

                <form onSubmit={registerGoal}>
                  <div className="form-grid">
                    <label>
                      <span>Quem fez o gol?</span>

                      <select
                        value={goalForm.scorer}
                        onChange={(e) =>
                          setGoalForm((current) => ({
                            ...current,
                            scorer: e.target.value,
                          }))
                        }
                      >
                        <option value="">
                          Selecionar jogador
                        </option>

                        {matchPlayers.map((mp) => {
                          const player = getPlayer(
                            mp.player_id
                          );

                          if (!player) return null;

                          const team = getPlayerTeam(
                            player.id
                          );

                          return (
                            <option
                              key={mp.id}
                              value={player.id}
                            >
                              {player.name} —{" "}
                              {team?.name || "Sem time"}
                            </option>
                          );
                        })}
                      </select>
                    </label>

                    <label>
                      <span>Assistência</span>

                      <select
                        value={goalForm.assist}
                        onChange={(e) =>
                          setGoalForm((current) => ({
                            ...current,
                            assist: e.target.value,
                          }))
                        }
                      >
                        <option value="">
                          Sem assistência
                        </option>

                        {matchPlayers
                          .filter(
                            (mp) =>
                              mp.player_id !==
                              goalForm.scorer
                          )
                          .map((mp) => {
                            const player = getPlayer(
                              mp.player_id
                            );

                            if (!player) return null;

                            return (
                              <option
                                key={mp.id}
                                value={player.id}
                              >
                                {player.name}
                              </option>
                            );
                          })}
                      </select>
                    </label>
                  </div>

                  <div className="form-actions">
                    <button
                      type="button"
                      className="ghost"
                      onClick={() =>
                        setShowGoalForm(false)
                      }
                    >
                      Cancelar
                    </button>

                    <button
                      className="button"
                      type="submit"
                      disabled={savingGoal}
                    >
                      <Target size={17} />

                      {savingGoal
                        ? "Salvando..."
                        : "Confirmar gol"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* =========================
                TIMES
            ========================= */}

            <div className="teams-grid">
              {teams.map((team) => {
                const teamPlayers = matchPlayers.filter(
                  (player) => player.team_id === team.id
                );

                const goalkeeper = getGoalkeeper(team.id);

                return (
                  <div className="card team-card" key={team.id}>
                    <div className="team-header">
                      <div>
                        <span
                          className="team-color"
                          style={{
                            backgroundColor: team.color,
                          }}
                        />

                        <h2>{team.name}</h2>
                      </div>

                      <strong className="team-score">
                        {getTeamScore(team.id)}
                      </strong>
                    </div>

                    <div className="team-players">
                      {teamPlayers.map((mp) => {
                        const player = getPlayer(
                          mp.player_id
                        );

                        if (!player) return null;

                        const isGoalkeeper =
                          mp.role === "goalkeeper";

                        return (
                          <div
                            className="match-player"
                            key={mp.id}
                          >
                            <div className="avatar">
                              {player.photo_url ? (
                                <img
                                  src={player.photo_url}
                                  alt={player.name}
                                />
                              ) : (
                                player.name[0]?.toUpperCase()
                              )}
                            </div>

                            <div className="match-player-info">
                              <b>{player.name}</b>

                              <small>
                                {isGoalkeeper
                                  ? "🧤 Goleiro"
                                  : `⚽ ${mp.goals} gols · 🎯 ${mp.assists} assist.`}
                              </small>

                              {isGoalkeeper && (
                                <small>
                                  Sofreu{" "}
                                  {mp.goals_conceded} gol
                                  {mp.goals_conceded !== 1
                                    ? "s"
                                    : ""}
                                </small>
                              )}
                            </div>

                            <button
                              type="button"
                              className={`goalkeeper-button ${
                                isGoalkeeper
                                  ? "active"
                                  : ""
                              }`}
                              title="Definir como goleiro"
                              onClick={() =>
                                setGoalkeeper(
                                  mp.id,
                                  team.id
                                )
                              }
                            >
                              <Shield size={16} />
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    {goalkeeper && (
                      <div className="goalkeeper-label">
                        🧤 Goleiro atual:{" "}
                        <b>
                          {
                            getPlayer(
                              goalkeeper.player_id
                            )?.name
                          }
                        </b>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* =========================
                RESUMO
            ========================= */}

            <div className="stats">
              <div>
                <Target />
                <b>Artilheiro</b>

                <span>
                  {(() => {
                    if (!matchPlayers.length)
                      return "Nenhum gol";

                    const top = [...matchPlayers].sort(
                      (a, b) => b.goals - a.goals
                    )[0];

                    if (!top || top.goals === 0)
                      return "Nenhum gol";

                    return `${getPlayer(top.player_id)?.name} — ${top.goals} gol${
                      top.goals !== 1 ? "s" : ""
                    }`;
                  })()}
                </span>
              </div>

              <div>
                <Trophy />

                <b>Garçom</b>

                <span>
                  {(() => {
                    if (!matchPlayers.length)
                      return "Nenhuma assistência";

                    const top = [...matchPlayers].sort(
                      (a, b) => b.assists - a.assists
                    )[0];

                    if (!top || top.assists === 0)
                      return "Nenhuma assistência";

                    return `${getPlayer(top.player_id)?.name} — ${top.assists} assist.`;
                  })()}
                </span>
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
