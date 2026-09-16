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

type Racha = {
  id: string;
  group_id: string;
  played_on: string;
  status: "open" | "finished";
  players_per_team: number;
  created_at: string;
};

type Game = {
  id: string;
  racha_id: string;
  game_number: number;
  status: "open" | "finished";
  created_at: string;
};

type Team = {
  id: string;
  game_id: string;
  name: string;
  color: string;
};

type GamePlayer = {
  id: string;
  game_id: string;
  team_id: string | null;
  player_id: string;
  role: "field" | "goalkeeper";
  goals: number;
  assists: number;
  goals_conceded: number;
  entered_at: string;
  left_at: string | null;
};

type Attendance = {
  id: string;
  racha_id: string;
  player_id: string;
  present: boolean;
};

type GoalForm = {
  scorer: string;
  assist: string;
};

export default function Admin() {
  const supabase = createClient();

  // =========================================================
  // ESTADO GERAL
  // =========================================================

  const [groups, setGroups] = useState<Group[]>([]);
  const [groupId, setGroupId] = useState("");

  const [players, setPlayers] = useState<Player[]>([]);

  const [newPlayer, setNewPlayer] = useState("");
  const [groupName, setGroupName] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [loadingRacha, setLoadingRacha] = useState(false);

  // =========================================================
  // RACHA
  // =========================================================

  const [racha, setRacha] = useState<Racha | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [currentGame, setCurrentGame] = useState<Game | null>(null);

  const [teams, setTeams] = useState<Team[]>([]);
  const [gamePlayers, setGamePlayers] = useState<GamePlayer[]>([]);

  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [presentPlayers, setPresentPlayers] = useState<string[]>([]);

  const [playersPerTeam, setPlayersPerTeam] = useState(5);

  const [startingRacha, setStartingRacha] = useState(false);
  const [startingGame, setStartingGame] = useState(false);
  const [finishingGame, setFinishingGame] = useState(false);
  const [finishingRacha, setFinishingRacha] = useState(false);

  // =========================================================
  // GOL
  // =========================================================

  const [showGoalForm, setShowGoalForm] = useState(false);

  const [goalForm, setGoalForm] = useState<GoalForm>({
    scorer: "",
    assist: "",
  });

  const [savingGoal, setSavingGoal] = useState(false);

  // =========================================================
  // DATA
  // =========================================================

  function getToday() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  // =========================================================
  // CARREGAR GRUPOS
  // =========================================================

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

  // =========================================================
  // CARREGAR JOGADORES
  // =========================================================

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

  // =========================================================
  // CARREGAR RACHA DE HOJE
  // =========================================================

  async function loadTodayRacha(id: string) {
    if (!id) {
      setRacha(null);
      setGames([]);
      setCurrentGame(null);
      setTeams([]);
      setGamePlayers([]);
      setAttendance([]);
      setPresentPlayers([]);
      return;
    }

    setLoadingRacha(true);

    const today = getToday();

    // -------------------------------------------------------
    // RACHA
    // -------------------------------------------------------

    const { data: existingRacha, error: rachaError } = await supabase
      .from("rachas")
      .select("*")
      .eq("group_id", id)
      .eq("played_on", today)
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (rachaError) {
      console.error("Erro ao carregar racha:", rachaError);
      setLoadingRacha(false);
      return;
    }

    if (!existingRacha) {
      setRacha(null);
      setGames([]);
      setCurrentGame(null);
      setTeams([]);
      setGamePlayers([]);
      setAttendance([]);
      setPresentPlayers([]);
      setLoadingRacha(false);
      return;
    }

    setRacha(existingRacha);
    setPlayersPerTeam(existingRacha.players_per_team);

    // -------------------------------------------------------
    // PRESENÇA
    // -------------------------------------------------------

    const { data: loadedAttendance, error: attendanceError } =
      await supabase
        .from("racha_attendance")
        .select("*")
        .eq("racha_id", existingRacha.id);

    if (attendanceError) {
      console.error("Erro ao carregar presença:", attendanceError);
    }

    const attendanceData = loadedAttendance || [];

    setAttendance(attendanceData);

    setPresentPlayers(
      attendanceData
        .filter((item: Attendance) => item.present)
        .map((item: Attendance) => item.player_id)
    );

    // -------------------------------------------------------
    // JOGOS
    // -------------------------------------------------------

    const { data: loadedGames, error: gamesError } = await supabase
      .from("racha_games")
      .select("*")
      .eq("racha_id", existingRacha.id)
      .order("game_number", { ascending: true });

    if (gamesError) {
      console.error("Erro ao carregar jogos:", gamesError);
      setGames([]);
      setCurrentGame(null);
      setLoadingRacha(false);
      return;
    }

    const gameData = loadedGames || [];

    setGames(gameData);

    // Procura jogo aberto
    const openGame =
      gameData.find((game: Game) => game.status === "open") || null;

    if (!openGame) {
      setCurrentGame(null);
      setTeams([]);
      setGamePlayers([]);
      setLoadingRacha(false);
      return;
    }

    setCurrentGame(openGame);

    // -------------------------------------------------------
    // TIMES
    // -------------------------------------------------------

    const { data: loadedTeams, error: teamsError } = await supabase
      .from("racha_teams")
      .select("*")
      .eq("game_id", openGame.id);

    if (teamsError) {
      console.error("Erro ao carregar times:", teamsError);
    }

    // -------------------------------------------------------
    // JOGADORES DO JOGO
    // -------------------------------------------------------

    const { data: loadedGamePlayers, error: gamePlayersError } =
      await supabase
        .from("racha_game_players")
        .select("*")
        .eq("game_id", openGame.id);

    if (gamePlayersError) {
      console.error(
        "Erro ao carregar jogadores do jogo:",
        gamePlayersError
      );
    }

    setTeams(loadedTeams || []);
    setGamePlayers(loadedGamePlayers || []);

    setLoadingRacha(false);
  }

  // =========================================================
  // LOAD INICIAL
  // =========================================================

  useEffect(() => {
    loadGroups();
  }, []);

  // =========================================================
  // TROCA DE GRUPO
  // =========================================================

  useEffect(() => {
    if (!groupId) return;

    loadPlayers(groupId);
    loadTodayRacha(groupId);
  }, [groupId]);

  // =========================================================
  // CRIAR GRUPO
  // =========================================================

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
      await loadTodayRacha(data.id);
    }
  }

  // =========================================================
  // ADICIONAR JOGADOR
  // =========================================================

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

  // =========================================================
  // SELECIONAR PRESENTE
  // =========================================================

  function togglePresent(playerId: string) {
    if (racha) return;

    setPresentPlayers((current) => {
      if (current.includes(playerId)) {
        return current.filter((id) => id !== playerId);
      }

      return [...current, playerId];
    });
  }

  // =========================================================
  // SORTEAR
  // =========================================================

  function shufflePlayers(list: Player[]) {
    const shuffled = [...list];

    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));

      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
  }

  // =========================================================
  // INICIAR RACHA
  // =========================================================

  async function startRacha() {
    if (!groupId) return;

    if (presentPlayers.length < playersPerTeam * 2) {
      alert(
        `São necessários pelo menos ${
          playersPerTeam * 2
        } jogadores presentes para jogar com ${playersPerTeam} por time.`
      );
      return;
    }

    setStartingRacha(true);

    try {
      // -----------------------------------------------------
      // 1. CRIAR RACHA
      // -----------------------------------------------------

      const { data: newRacha, error: rachaError } = await supabase
        .from("rachas")
        .insert({
          group_id: groupId,
          played_on: getToday(),
          status: "open",
          players_per_team: playersPerTeam,
        })
        .select()
        .single();

      if (rachaError || !newRacha) {
        console.error("Erro ao criar racha:", rachaError);
        alert("Não foi possível criar o racha.");
        return;
      }

      // -----------------------------------------------------
      // 2. REGISTRAR PRESENÇA
      // -----------------------------------------------------

      const attendanceRows = presentPlayers.map((playerId) => ({
        racha_id: newRacha.id,
        player_id: playerId,
        present: true,
      }));

      const { error: attendanceError } = await supabase
        .from("racha_attendance")
        .insert(attendanceRows);

      if (attendanceError) {
        console.error(
          "Erro ao registrar presença:",
          attendanceError
        );

        await supabase
          .from("rachas")
          .delete()
          .eq("id", newRacha.id);

        alert("Não foi possível registrar a presença.");
        return;
      }

      setRacha(newRacha);
      setAttendance(
        attendanceRows.map((item) => ({
          ...item,
          id: "",
        }))
      );

      // -----------------------------------------------------
      // 3. CRIAR PRIMEIRO JOGO
      // -----------------------------------------------------

      await createGame(newRacha.id, 1, presentPlayers);
    } finally {
      setStartingRacha(false);
    }
  }

  // =========================================================
  // CRIAR JOGO
  // =========================================================

  async function createGame(
    rachaId: string,
    gameNumber: number,
    playerIds: string[]
  ) {
    if (playerIds.length < playersPerTeam * 2) {
      alert(
        `Não há jogadores suficientes para criar o jogo. São necessários pelo menos ${
          playersPerTeam * 2
        }.`
      );
      return false;
    }

    setStartingGame(true);

    try {
      // -----------------------------------------------------
      // JOGO
      // -----------------------------------------------------

      const { data: newGame, error: gameError } = await supabase
        .from("racha_games")
        .insert({
          racha_id: rachaId,
          game_number: gameNumber,
          status: "open",
        })
        .select()
        .single();

      if (gameError || !newGame) {
        console.error("Erro ao criar jogo:", gameError);
        alert("Não foi possível criar o jogo.");
        return false;
      }

      // -----------------------------------------------------
      // TIMES
      // -----------------------------------------------------

      const { data: newTeams, error: teamsError } = await supabase
        .from("racha_teams")
        .insert([
          {
            game_id: newGame.id,
            name: "Time Azul",
            color: "#2563eb",
          },
          {
            game_id: newGame.id,
            name: "Time Vermelho",
            color: "#dc2626",
          },
        ])
        .select();

      if (teamsError || !newTeams || newTeams.length !== 2) {
        console.error("Erro ao criar times:", teamsError);

        await supabase
          .from("racha_games")
          .delete()
          .eq("id", newGame.id);

        alert("Não foi possível criar os times.");
        return false;
      }

      const blueTeam = newTeams.find(
        (team: Team) => team.name === "Time Azul"
      );

      const redTeam = newTeams.find(
        (team: Team) => team.name === "Time Vermelho"
      );

      if (!blueTeam || !redTeam) {
        alert("Erro ao identificar os times.");
        return false;
      }

      // -----------------------------------------------------
      // SORTEIO
      // -----------------------------------------------------

      const selectedPlayers = players.filter((player) =>
        playerIds.includes(player.id)
      );

      const shuffled = shufflePlayers(selectedPlayers);

      const totalPlayers = playersPerTeam * 2;

      const playingPlayers = shuffled.slice(0, totalPlayers);

      const bluePlayers = playingPlayers.slice(
        0,
        playersPerTeam
      );

      const redPlayers = playingPlayers.slice(
        playersPerTeam,
        totalPlayers
      );

      // -----------------------------------------------------
      // JOGADORES DO JOGO
      // -----------------------------------------------------

      const gamePlayerRows = [
        ...bluePlayers.map((player) => ({
          game_id: newGame.id,
          team_id: blueTeam.id,
          player_id: player.id,
          role: "field" as const,
        })),

        ...redPlayers.map((player) => ({
          game_id: newGame.id,
          team_id: redTeam.id,
          player_id: player.id,
          role: "field" as const,
        })),
      ];

      const {
        data: createdGamePlayers,
        error: gamePlayersError,
      } = await supabase
        .from("racha_game_players")
        .insert(gamePlayerRows)
        .select();

      if (gamePlayersError) {
        console.error(
          "Erro ao registrar jogadores:",
          gamePlayersError
        );

        await supabase
          .from("racha_games")
          .delete()
          .eq("id", newGame.id);

        alert("Não foi possível montar os times.");
        return false;
      }

      setCurrentGame(newGame);

      setGames((current) => [...current, newGame]);

      setTeams(newTeams);

      setGamePlayers(createdGamePlayers || []);

      return true;
    } finally {
      setStartingGame(false);
    }
  }

  // =========================================================
  // INICIAR PRÓXIMO JOGO
  // =========================================================

  async function startNextGame() {
    if (!racha) return;

    if (presentPlayers.length < playersPerTeam * 2) {
      alert(
        `São necessários pelo menos ${
          playersPerTeam * 2
        } jogadores presentes para iniciar outro jogo.`
      );
      return;
    }

    const nextNumber =
      games.length > 0
        ? Math.max(...games.map((game) => game.game_number)) + 1
        : 1;

    await createGame(
      racha.id,
      nextNumber,
      presentPlayers
    );

    await loadTodayRacha(groupId);
  }

  // =========================================================
  // ENCONTRAR JOGADOR
  // =========================================================

  function getPlayer(playerId: string) {
    return players.find((player) => player.id === playerId);
  }

  // =========================================================
  // ENCONTRAR JOGADOR DO JOGO
  // =========================================================

  function getGamePlayer(playerId: string) {
    return gamePlayers.find(
      (player) => player.player_id === playerId
    );
  }

  // =========================================================
  // TIME DO JOGADOR
  // =========================================================

  function getPlayerTeam(playerId: string) {
    const gp = getGamePlayer(playerId);

    if (!gp) return null;

    return (
      teams.find((team) => team.id === gp.team_id) || null
    );
  }

  // =========================================================
  // PLACAR
  // =========================================================

  function getTeamScore(teamId: string) {
    return gamePlayers
      .filter((player) => player.team_id === teamId)
      .reduce(
        (total, player) => total + player.goals,
        0
      );
  }

  // =========================================================
  // GOLEIRO
  // =========================================================

  function getGoalkeeper(teamId: string) {
    return gamePlayers.find(
      (player) =>
        player.team_id === teamId &&
        player.role === "goalkeeper"
    );
  }

  // =========================================================
  // DEFINIR GOLEIRO
  // =========================================================

  async function setGoalkeeper(
    gamePlayerId: string,
    teamId: string
  ) {
    if (!currentGame) return;

    const currentGoalkeeper = getGoalkeeper(teamId);

    // Remove goleiro anterior
    if (
      currentGoalkeeper &&
      currentGoalkeeper.id !== gamePlayerId
    ) {
      const { error } = await supabase
        .from("racha_game_players")
        .update({
          role: "field",
        })
        .eq("id", currentGoalkeeper.id);

      if (error) {
        console.error(
          "Erro ao remover goleiro:",
          error
        );
        return;
      }

      setGamePlayers((current) =>
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

    const selected = gamePlayers.find(
      (player) => player.id === gamePlayerId
    );

    if (!selected) return;

    // Se clicar no goleiro atual, transforma em jogador de linha
    if (
      selected.role === "goalkeeper" &&
      currentGoalkeeper?.id === gamePlayerId
    ) {
      const { error } = await supabase
        .from("racha_game_players")
        .update({
          role: "field",
        })
        .eq("id", gamePlayerId);

      if (error) {
        console.error(
          "Erro ao remover goleiro:",
          error
        );
        return;
      }

      setGamePlayers((current) =>
        current.map((player) =>
          player.id === gamePlayerId
            ? {
                ...player,
                role: "field",
              }
            : player
        )
      );

      return;
    }

    const { error } = await supabase
      .from("racha_game_players")
      .update({
        role: "goalkeeper",
      })
      .eq("id", gamePlayerId);

    if (error) {
      console.error(
        "Erro ao definir goleiro:",
        error
      );
      return;
    }

    setGamePlayers((current) =>
      current.map((player) =>
        player.id === gamePlayerId
          ? {
              ...player,
              role: "goalkeeper",
            }
          : player
      )
    );
  }

  // =========================================================
  // ABRIR REGISTRO DE GOL
  // =========================================================

  function openGoalForm() {
    setGoalForm({
      scorer: "",
      assist: "",
    });

    setShowGoalForm(true);
  }

  // =========================================================
  // REGISTRAR GOL
  // =========================================================

  async function registerGoal(e: React.FormEvent) {
    e.preventDefault();

    if (!currentGame) return;

    if (!goalForm.scorer) {
      alert("Selecione quem fez o gol.");
      return;
    }

    setSavingGoal(true);

    try {
      const scorer = getGamePlayer(goalForm.scorer);

      if (!scorer || !scorer.team_id) {
        alert("Jogador inválido.");
        return;
      }

      // -----------------------------------------------------
      // GOL
      // -----------------------------------------------------

      const newGoals = scorer.goals + 1;

      const { error: scorerError } = await supabase
        .from("racha_game_players")
        .update({
          goals: newGoals,
        })
        .eq("id", scorer.id);

      if (scorerError) {
        console.error(
          "Erro ao registrar gol:",
          scorerError
        );

        alert("Não foi possível registrar o gol.");
        return;
      }

      // -----------------------------------------------------
      // ASSISTÊNCIA
      // -----------------------------------------------------

      if (goalForm.assist) {
        const assister = getGamePlayer(
          goalForm.assist
        );

        if (assister) {
          const { error: assistError } =
            await supabase
              .from("racha_game_players")
              .update({
                assists: assister.assists + 1,
              })
              .eq("id", assister.id);

          if (assistError) {
            console.error(
              "Erro ao registrar assistência:",
              assistError
            );
          }
        }
      }

      // -----------------------------------------------------
      // GOL SOFRIDO PELO GOLEIRO
      // -----------------------------------------------------

      const opposingTeam = teams.find(
        (team) => team.id !== scorer.team_id
      );

      if (opposingTeam) {
        const goalkeeper = getGoalkeeper(
          opposingTeam.id
        );

        if (goalkeeper) {
          await supabase
            .from("racha_game_players")
            .update({
              goals_conceded:
                goalkeeper.goals_conceded + 1,
            })
            .eq("id", goalkeeper.id);
        }
      }

      // -----------------------------------------------------
      // ATUALIZAR
      // -----------------------------------------------------

      await loadTodayRacha(groupId);

      setShowGoalForm(false);

      setGoalForm({
        scorer: "",
        assist: "",
      });
    } finally {
      setSavingGoal(false);
    }
  }

  // =========================================================
  // FINALIZAR JOGO
  // =========================================================

  async function finishGame() {
    if (!currentGame) return;

    const confirmed = confirm(
      `Deseja finalizar o Jogo ${currentGame.game_number}?`
    );

    if (!confirmed) return;

    setFinishingGame(true);

    try {
      const { error } = await supabase
        .from("racha_games")
        .update({
          status: "finished",
        })
        .eq("id", currentGame.id);

      if (error) {
        console.error(
          "Erro ao finalizar jogo:",
          error
        );

        alert("Não foi possível finalizar o jogo.");
        return;
      }

      setCurrentGame(null);
      setTeams([]);
      setGamePlayers([]);

      await loadPlayers(groupId);
      await loadTodayRacha(groupId);
    } finally {
      setFinishingGame(false);
    }
  }

  // =========================================================
  // ENCERRAR RACHA
  // =========================================================

  async function finishRacha() {
    if (!racha) return;

    const confirmed = confirm(
      "Tem certeza que deseja encerrar o racha de hoje? Depois disso não será possível iniciar outro jogo neste racha."
    );

    if (!confirmed) return;

    setFinishingRacha(true);

    try {
      // Se existir jogo aberto, não permite encerrar
      if (currentGame) {
        alert(
          "Finalize o jogo atual antes de encerrar o racha."
        );
        return;
      }

      const { error } = await supabase
        .from("rachas")
        .update({
          status: "finished",
        })
        .eq("id", racha.id);

      if (error) {
        console.error(
          "Erro ao finalizar racha:",
          error
        );

        alert("Não foi possível encerrar o racha.");
        return;
      }

      setRacha(null);
      setGames([]);
      setCurrentGame(null);
      setTeams([]);
      setGamePlayers([]);
      setAttendance([]);
      setPresentPlayers([]);

      await loadPlayers(groupId);
      await loadTodayRacha(groupId);
    } finally {
      setFinishingRacha(false);
    }
  }

  // =========================================================
  // BANCO
  // =========================================================

  function getBenchPlayers() {
    if (!racha) return [];

    const playingIds = gamePlayers.map(
      (player) => player.player_id
    );

    return players.filter(
      (player) =>
        presentPlayers.includes(player.id) &&
        !playingIds.includes(player.id)
    );
  }

  // =========================================================
  // TOP ARTILHEIRO DO JOGO
  // =========================================================

  function getTopScorer() {
    if (!gamePlayers.length) return null;

    const top = [...gamePlayers].sort(
      (a, b) => b.goals - a.goals
    )[0];

    if (!top || top.goals === 0) return null;

    return top;
  }

  // =========================================================
  // TOP GARÇOM DO JOGO
  // =========================================================

  function getTopAssister() {
    if (!gamePlayers.length) return null;

    const top = [...gamePlayers].sort(
      (a, b) => b.assists - a.assists
    )[0];

    if (!top || top.assists === 0) return null;

    return top;
  }

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <main className="page">
        <div className="card">
          Carregando...
        </div>
      </main>
    );
  }

  // =========================================================
  // INTERFACE
  // =========================================================

  return (
    <main className="page">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="top">
        <div>
          <span className="badge">
            ⚽ Racha FC
          </span>

          <h1>Painel do organizador</h1>
        </div>

        <button
          className="ghost"
          onClick={logout}
        >
          <LogOut size={17} />
          Sair
        </button>
      </header>

      {/* =====================================================
          GRUPO
      ===================================================== */}

      <section className="toolbar">

        <select
          value={groupId}
          onChange={(e) =>
            setGroupId(e.target.value)
          }
        >
          {groups.map((group) => (
            <option
              key={group.id}
              value={group.id}
            >
              {group.name}
            </option>
          ))}
        </select>

        <form
          onSubmit={addGroup}
          className="inline"
        >
          <input
            placeholder="Novo grupo"
            value={groupName}
            onChange={(e) =>
              setGroupName(e.target.value)
            }
          />

          <button
            className="button"
            type="submit"
          >
            Criar grupo
          </button>
        </form>

      </section>

      {/* =====================================================
          MENU
      ===================================================== */}

      <nav className="tabs">
        <a className="active">
          Racha de hoje
        </a>

        <a href="/admin/jogadores">
          Jogadores
        </a>

        <a href="/admin/historico">
          Histórico
        </a>
      </nav>

      {/* =====================================================
          RACHA
      ===================================================== */}

      <section className="racha-area">

        {loadingRacha ? (
          <div className="card">
            <p className="muted">
              Carregando racha de hoje...
            </p>
          </div>
        ) : !racha ? (

          /* ==================================================
             PRÉ-RACHA
          ================================================== */

          <>
            <div className="card">

              <div className="section-title">

                <div>
                  <h2>
                    <CalendarDays />
                    Racha de hoje
                  </h2>

                  <p className="muted">
                    Selecione quem está presente,
                    escolha o tamanho dos times e
                    comece o primeiro jogo.
                  </p>
                </div>

                <span className="present-count">
                  {presentPlayers.length} presentes
                </span>

              </div>

              {/* =================================================
                  TAMANHO DOS TIMES
              ================================================= */}

              <div className="players-per-team-box">

                <div>
                  <b>
                    Jogadores por time
                  </b>

                  <small>
                    {playersPerTeam * 2} jogam por vez
                  </small>
                </div>

                <div className="number-control">

                  <button
                    type="button"
                    onClick={() =>
                      setPlayersPerTeam(
                        (value) =>
                          Math.max(
                            1,
                            value - 1
                          )
                      )
                    }
                    disabled={
                      playersPerTeam <= 1
                    }
                  >
                    <Minus size={17} />
                  </button>

                  <strong>
                    {playersPerTeam}
                  </strong>

                  <button
                    type="button"
                    onClick={() =>
                      setPlayersPerTeam(
                        (value) =>
                          Math.min(
                            15,
                            value + 1
                          )
                      )
                    }
                  >
                    <Plus size={17} />
                  </button>

                </div>

              </div>

              {/* =================================================
                  RESUMO
              ================================================= */}

              <div className="team-size-summary">

                <span>
                  🔵 Azul:{" "}
                  <b>{playersPerTeam}</b>
                </span>

                <span>
                  🔴 Vermelho:{" "}
                  <b>{playersPerTeam}</b>
                </span>

                <span>
                  🪑 Banco:{" "}
                  <b>
                    {Math.max(
                      0,
                      presentPlayers.length -
                        playersPerTeam * 2
                    )}
                  </b>
                </span>

              </div>

              {/* =================================================
                  JOGADORES
              ================================================= */}

              {players.length === 0 ? (

                <div className="empty-box">

                  <Users size={32} />

                  <b>
                    Nenhum jogador cadastrado
                  </b>

                  <span>
                    Adicione os jogadores antes
                    de iniciar o racha.
                  </span>

                </div>

              ) : (

                <>

                  <div className="attendance-list">

                    {players.map((player) => {

                      const selected =
                        presentPlayers.includes(
                          player.id
                        );

                      return (
                        <button
                          key={player.id}
                          type="button"
                          className={`attendance-player ${
                            selected
                              ? "selected"
                              : ""
                          }`}
                          onClick={() =>
                            togglePresent(
                              player.id
                            )
                          }
                        >

                          <div className="avatar">

                            {player.photo_url ? (
                              <img
                                src={
                                  player.photo_url
                                }
                                alt={
                                  player.name
                                }
                              />
                            ) : (
                              player.name[0]?.toUpperCase()
                            )}

                          </div>

                          <div className="attendance-info">

                            <b>
                              {player.name}
                            </b>

                            <small>
                              Overall{" "}
                              {player.overall}
                            </small>

                          </div>

                          <div className="check">
                            {selected
                              ? "✓"
                              : ""}
                          </div>

                        </button>
                      );
                    })}

                  </div>

                  {/* =================================================
                      BOTÃO COMEÇAR
                  ================================================= */}

                  <div className="start-area">

                    <button
                      className="button start-button"
                      type="button"
                      onClick={
                        startRacha
                      }
                      disabled={
                        startingRacha ||
                        presentPlayers.length <
                          playersPerTeam * 2
                      }
                    >

                      <Shuffle size={18} />

                      {startingRacha
                        ? "Sorteando..."
                        : "Sortear times e iniciar"}

                    </button>

                    {presentPlayers.length <
                      playersPerTeam * 2 && (
                      <small className="muted">
                        Selecione pelo menos{" "}
                        {playersPerTeam * 2}{" "}
                        jogadores.
                      </small>
                    )}

                  </div>

                </>
              )}

            </div>

            {/* ==================================================
                CADASTRAR JOGADOR
            ================================================== */}

            <div className="card">

              <h2>
                <Users />
                Jogadores
              </h2>

              <form
                onSubmit={addPlayer}
                className="inline"
              >

                <input
                  placeholder="Nome do jogador"
                  value={newPlayer}
                  onChange={(e) =>
                    setNewPlayer(
                      e.target.value
                    )
                  }
                />

                <button
                  className="button"
                  type="submit"
                >
                  Adicionar
                </button>

              </form>

            </div>
          </>

        ) : (

          /* ==================================================
             RACHA EM ANDAMENTO
          ================================================== */

          <>

            {/* =================================================
                CABEÇALHO DO RACHA
            ================================================= */}

            <div className="card">

              <div className="section-title">

                <div>

                  <div className="live-label">
                    <span className="live-dot" />
                    RACHA EM ANDAMENTO
                  </div>

                  <h2>
                    ⚽ Racha de hoje
                  </h2>

                  <p className="muted">
                    {presentPlayers.length}{" "}
                    jogadores presentes ·{" "}
                    {playersPerTeam} por time
                  </p>

                </div>

                <button
                  className="finish-button"
                  type="button"
                  onClick={
                    finishRacha
                  }
                  disabled={
                    finishingRacha ||
                    !!currentGame
                  }
                >
                  <CheckCircle2 size={17} />

                  {finishingRacha
                    ? "Encerrando..."
                    : "Encerrar racha"}
                </button>

              </div>

              {/* =================================================
                  HISTÓRICO DE JOGOS DO RACHA
              ================================================= */}

              {games.length > 0 && (
                <div className="racha-games-list">

                  {games.map((game) => {

                    const isCurrent =
                      currentGame?.id ===
                      game.id;

                    return (
                      <span
                        key={game.id}
                        className={
                          isCurrent
                            ? "game-pill active"
                            : "game-pill"
                        }
                      >
                        Jogo{" "}
                        {game.game_number}

                        {game.status ===
                          "finished"
                          ? " ✓"
                          : " • ao vivo"}
                      </span>
                    );
                  })}

                </div>
              )}

            </div>

            {/* =================================================
                JOGO ATUAL
            ================================================= */}

            {currentGame ? (

              <>

                {/* =================================================
                    PLACAR
                ================================================= */}

                <div className="score-card">

                  <div className="live-label">
                    <span className="live-dot" />

                    JOGO{" "}
                    {currentGame.game_number}{" "}
                    EM ANDAMENTO
                  </div>

                  <div className="scoreboard">

                    {teams.map((team) => (

                      <div
                        className="score-team"
                        key={team.id}
                      >

                        <span
                          className="team-color"
                          style={{
                            backgroundColor:
                              team.color,
                          }}
                        />

                        <b>
                          {team.name}
                        </b>

                        <strong>
                          {getTeamScore(
                            team.id
                          )}
                        </strong>

                      </div>

                    ))}

                  </div>

                  <div className="score-actions">

                    <button
                      className="button goal-button"
                      type="button"
                      onClick={
                        openGoalForm
                      }
                    >
                      <Plus size={18} />
                      Registrar gol
                    </button>

                    <button
                      className="finish-button"
                      type="button"
                      onClick={
                        finishGame
                      }
                      disabled={
                        finishingGame
                      }
                    >
                      <CheckCircle2
                        size={17}
                      />

                      {finishingGame
                        ? "Finalizando..."
                        : "Finalizar jogo"}
                    </button>

                  </div>

                </div>

                {/* =================================================
                    REGISTRAR GOL
                ================================================= */}

                {showGoalForm && (

                  <div className="card goal-form-card">

                    <div className="section-title">

                      <div>

                        <h2>
                          <Target />
                          Registrar gol
                        </h2>

                        <p className="muted">
                          Informe quem marcou
                          e, se houver, a
                          assistência.
                        </p>

                      </div>

                    </div>

                    <form
                      onSubmit={
                        registerGoal
                      }
                    >

                      <div className="form-grid">

                        <label>

                          <span>
                            Quem fez o gol?
                          </span>

                          <select
                            value={
                              goalForm.scorer
                            }
                            onChange={(e) =>
                              setGoalForm(
                                (current) => ({
                                  ...current,
                                  scorer:
                                    e.target
                                      .value,
                                })
                              )
                            }
                          >

                            <option value="">
                              Selecionar jogador
                            </option>

                            {gamePlayers.map(
                              (gp) => {

                                const player =
                                  getPlayer(
                                    gp.player_id
                                  );

                                if (!player)
                                  return null;

                                const team =
                                  getPlayerTeam(
                                    player.id
                                  );

                                return (
                                  <option
                                    key={gp.id}
                                    value={
                                      player.id
                                    }
                                  >
                                    {player.name}{" "}
                                    —{" "}
                                    {team?.name ||
                                      "Sem time"}
                                  </option>
                                );
                              }
                            )}

                          </select>

                        </label>

                        <label>

                          <span>
                            Assistência
                          </span>

                          <select
                            value={
                              goalForm.assist
                            }
                            onChange={(e) =>
                              setGoalForm(
                                (current) => ({
                                  ...current,
                                  assist:
                                    e.target
                                      .value,
                                })
                              )
                            }
                          >

                            <option value="">
                              Sem assistência
                            </option>

                            {gamePlayers
                              .filter(
                                (gp) =>
                                  gp.player_id !==
                                  goalForm.scorer
                              )
                              .map((gp) => {

                                const player =
                                  getPlayer(
                                    gp.player_id
                                  );

                                if (!player)
                                  return null;

                                return (
                                  <option
                                    key={gp.id}
                                    value={
                                      player.id
                                    }
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
                            setShowGoalForm(
                              false
                            )
                          }
                        >
                          Cancelar
                        </button>

                        <button
                          className="button"
                          type="submit"
                          disabled={
                            savingGoal
                          }
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

                {/* =================================================
                    TIMES
                ================================================= */}

                <div className="teams-grid">

                  {teams.map((team) => {

                    const teamPlayers =
                      gamePlayers.filter(
                        (player) =>
                          player.team_id ===
                          team.id
                      );

                    const goalkeeper =
                      getGoalkeeper(
                        team.id
                      );

                    return (

                      <div
                        className="card team-card"
                        key={team.id}
                      >

                        <div className="team-header">

                          <div>

                            <span
                              className="team-color"
                              style={{
                                backgroundColor:
                                  team.color,
                              }}
                            />

                            <h2>
                              {team.name}
                            </h2>

                          </div>

                          <strong className="team-score">
                            {getTeamScore(
                              team.id
                            )}
                          </strong>

                        </div>

                        <div className="team-players">

                          {teamPlayers.map(
                            (gp) => {

                              const player =
                                getPlayer(
                                  gp.player_id
                                );

                              if (!player)
                                return null;

                              const isGoalkeeper =
                                gp.role ===
                                "goalkeeper";

                              return (

                                <div
                                  className="match-player"
                                  key={gp.id}
                                >

                                  <div className="avatar">

                                    {player.photo_url ? (
                                      <img
                                        src={
                                          player.photo_url
                                        }
                                        alt={
                                          player.name
                                        }
                                      />
                                    ) : (
                                      player.name[0]?.toUpperCase()
                                    )}

                                  </div>

                                  <div className="match-player-info">

                                    <b>
                                      {player.name}
                                    </b>

                                    <small>

                                      {isGoalkeeper
                                        ? "🧤 Goleiro"
                                        : `⚽ ${gp.goals} gols · 🎯 ${gp.assists} assist.`}

                                    </small>

                                    {isGoalkeeper && (
                                      <small>
                                        Sofreu{" "}
                                        {
                                          gp.goals_conceded
                                        }{" "}
                                        gol
                                        {gp.goals_conceded !==
                                        1
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
                                    title={
                                      isGoalkeeper
                                        ? "Remover como goleiro"
                                        : "Definir como goleiro"
                                    }
                                    onClick={() =>
                                      setGoalkeeper(
                                        gp.id,
                                        team.id
                                      )
                                    }
                                  >
                                    <Shield
                                      size={16}
                                    />
                                  </button>

                                </div>
                              );
                            }
                          )}

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

                {/* =================================================
                    BANCO
                ================================================= */}

                {getBenchPlayers().length >
                  0 && (

                  <div className="card bench-card">

                    <div className="section-title">

                      <div>

                        <h2>
                          🪑 Banco
                        </h2>

                        <p className="muted">
                          Jogadores presentes
                          que não estão neste
                          jogo.
                        </p>

                      </div>

                      <span className="present-count">
                        {
                          getBenchPlayers()
                            .length
                        }
                      </span>

                    </div>

                    <div className="attendance-list">

                      {getBenchPlayers().map(
                        (player) => (

                          <div
                            className="attendance-player"
                            key={player.id}
                          >

                            <div className="avatar">

                              {player.photo_url ? (
                                <img
                                  src={
                                    player.photo_url
                                  }
                                  alt={
                                    player.name
                                  }
                                />
                              ) : (
                                player.name[0]?.toUpperCase()
                              )}

                            </div>

                            <div className="attendance-info">

                              <b>
                                {player.name}
                              </b>

                              <small>
                                Overall{" "}
                                {player.overall}
                              </small>

                            </div>

                          </div>
                        )
                      )}

                    </div>

                  </div>
                )}

                {/* =================================================
                    RESUMO DO JOGO
                ================================================= */}

                <div className="stats">

                  <div>

                    <Target />

                    <b>
                      Artilheiro
                    </b>

                    <span>

                      {(() => {

                        const top =
                          getTopScorer();

                        if (!top)
                          return "Nenhum gol";

                        return `${
                          getPlayer(
                            top.player_id
                          )?.name
                        } — ${
                          top.goals
                        } gol${
                          top.goals !== 1
                            ? "s"
                            : ""
                        }`;

                      })()}

                    </span>

                  </div>

                  <div>

                    <Trophy />

                    <b>
                      Garçom
                    </b>

                    <span>

                      {(() => {

                        const top =
                          getTopAssister();

                        if (!top)
                          return "Nenhuma assistência";

                        return `${
                          getPlayer(
                            top.player_id
                          )?.name
                        } — ${
                          top.assists
                        } assist.`;

                      })()}

                    </span>

                  </div>

                </div>

              </>

            ) : (

              /* ==================================================
                 ENTRE JOGOS
              ================================================== */

              <>

                <div className="card">

                  <div className="empty-box">

                    <CheckCircle2 size={38} />

                    <b>
                      Jogo{" "}
                      {games.length > 0
                        ? games.length
                        : 1}{" "}
                      finalizado
                    </b>

                    <span>
                      O resultado foi salvo.
                      Agora você pode iniciar
                      o próximo jogo.
                    </span>

                    <button
                      className="button"
                      type="button"
                      onClick={
                        startNextGame
                      }
                      disabled={
                        startingGame ||
                        presentPlayers.length <
                          playersPerTeam * 2
                      }
                    >

                      <Play size={18} />

                      {startingGame
                        ? "Sorteando..."
                        : `Iniciar jogo ${
                            games.length + 1
                          }`}

                    </button>

                    {presentPlayers.length <
                      playersPerTeam * 2 && (
                      <small className="muted">
                        São necessários pelo
                        menos{" "}
                        {playersPerTeam * 2}{" "}
                        jogadores presentes.
                      </small>
                    )}

                  </div>

                </div>

                {/* =================================================
                    HISTÓRICO DOS JOGOS
                ================================================= */}

                {games.length > 0 && (

                  <div className="card">

                    <h2>
                      <Trophy />
                      Jogos deste racha
                    </h2>

                    <div className="racha-games-list large">

                      {games.map(
                        (game) => (

                          <div
                            className="game-history-item"
                            key={game.id}
                          >

                            <div>
                              <b>
                                Jogo{" "}
                                {
                                  game.game_number
                                }
                              </b>

                              <small>
                                {game.status ===
                                "finished"
                                  ? "Finalizado"
                                  : "Em andamento"}
                              </small>
                            </div>

                            <CheckCircle2
                              size={18}
                            />

                          </div>
                        )
                      )}

                    </div>

                  </div>
                )}

              </>
            )}

          </>
        )}

      </section>
    </main>
  );

  // =========================================================
  // LOGOUT
  // =========================================================

  async function logout() {
    await supabase.auth.signOut();
    location.href = "/admin/login";
  }
}
