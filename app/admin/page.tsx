"use client";

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import { createClient } from "@/lib/supabase-browser";

import {
  LogOut,
  Trophy,
  Users,
  CalendarDays,
  Target,
  Shuffle,
  Play,
  Pause,
  CheckCircle2,
  Plus,
  Shield,
  Clock,
  RotateCcw,
  ArrowRight,
  Crown,
  BarChart3,
} from "lucide-react";

/* =========================================================
   TIPOS
========================================================= */

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
  next_team_number: number;
  created_at: string;
};

type PoolTeam = {
  id: string;
  racha_id: string;
  team_number: number;
  name: string;
  color: string;
};

type PoolTeamPlayer = {
  id: string;
  racha_id: string;
  team_id: string;
  player_id: string;
};

type Game = {
  id: string;
  racha_id: string;
  game_number: number;
  status: "open" | "finished";
  created_at: string;
};

type GameTeam = {
  id: string;
  game_id: string;
  team_id: string;
};

type GamePlayer = {
  id: string;
  game_id: string;
  team_id: string | null;
  pool_team_id: string | null;
  player_id: string;
  role: "field" | "goalkeeper";
  goals: number;
  assists: number;
  goals_conceded: number;
  own_goals: number;
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
  concededTeam: string;
};

type TimerStatus =
  | "idle"
  | "running"
  | "paused"
  | "finished";

type TeamSummary = {
  team: PoolTeam;
  goals: number;
  conceded: number;
};

type PlayerRanking = {
  player: Player | undefined;
  goals: number;
  assists: number;
  conceded: number;
  ownGoals: number;
  overall: number;
};

/* =========================================================
   CONSTANTES
========================================================= */

const TEAM_COLORS = [
  "#2563eb",
  "#dc2626",
  "#16a34a",
  "#9333ea",
  "#ea580c",
  "#0891b2",
  "#db2777",
  "#ca8a04",
  "#475569",
  "#059669",
];

const DEFAULT_GAME_MINUTES = 7;

/* =========================================================
   COMPONENTE
========================================================= */

export default function Admin() {
  const supabase = createClient();

  /* =======================================================
     GERAL
  ======================================================= */

  const [groups, setGroups] = useState<Group[]>([]);
  const [groupId, setGroupId] = useState("");

  const [players, setPlayers] = useState<Player[]>([]);

  const [newPlayer, setNewPlayer] = useState("");
  const [groupName, setGroupName] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadingRacha, setLoadingRacha] = useState(false);

  /* =======================================================
     RACHA
  ======================================================= */

  const [racha, setRacha] = useState<Racha | null>(null);

  const [poolTeams, setPoolTeams] = useState<PoolTeam[]>([]);
  const [poolTeamPlayers, setPoolTeamPlayers] = useState<
    PoolTeamPlayer[]
  >([]);

  const [games, setGames] = useState<Game[]>([]);
  const [currentGame, setCurrentGame] = useState<Game | null>(
    null
  );

  const [gameTeams, setGameTeams] = useState<GameTeam[]>([]);
  const [gamePlayers, setGamePlayers] = useState<GamePlayer[]>(
    []
  );

  const [attendance, setAttendance] = useState<Attendance[]>(
    []
  );

  const [presentPlayers, setPresentPlayers] = useState<string[]>(
    []
  );
const [showImportWhatsApp, setShowImportWhatsApp] =
  useState(false);

const [whatsappText, setWhatsappText] =
  useState("");

const [importedNames, setImportedNames] =
  useState<string[]>([]);
  const [playersPerTeam, setPlayersPerTeam] = useState("5");

  const [startingRacha, setStartingRacha] = useState(false);
  const [startingNextGame, setStartingNextGame] =
    useState(false);
  const [finishingGame, setFinishingGame] = useState(false);
  const [finishingRacha, setFinishingRacha] = useState(false);

  /* =======================================================
     PRÓXIMO JOGO
  ======================================================= */

  const [nextGameTeams, setNextGameTeams] = useState<
    PoolTeam[]
  >([]);

  /* =======================================================
     GOL
  ======================================================= */

  const [showGoalForm, setShowGoalForm] = useState(false);
  const [savingGoal, setSavingGoal] = useState(false);

  const [goalForm, setGoalForm] = useState<GoalForm>({
    scorer: "",
    assist: "",
    concededTeam: "",
  });

  /* =======================================================
     TIMER
  ======================================================= */

  const [durationMinutes, setDurationMinutes] = useState(
    DEFAULT_GAME_MINUTES
  );

  const [timerSeconds, setTimerSeconds] = useState(
    DEFAULT_GAME_MINUTES * 60
  );

  const [timerStatus, setTimerStatus] =
    useState<TimerStatus>("idle");

  /* =======================================================
     CARREGAR GRUPOS
  ======================================================= */

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

    const loaded = (data || []) as Group[];

    setGroups(loaded);

    if (!groupId && loaded.length > 0) {
      setGroupId(loaded[0].id);
    }

    setLoading(false);
  }

  /* =======================================================
     CARREGAR JOGADORES
  ======================================================= */

  async function loadPlayers(id: string) {
    if (!id) {
      setPlayers([]);
      return;
    }

    const { data, error } = await supabase
      .from("player_overalls")
      .select("*")
      .eq("group_id", id)
      .order("overall", {
        ascending: false,
      });

    if (error) {
      console.error("Erro ao carregar jogadores:", error);
      setPlayers([]);
      return;
    }

    setPlayers((data || []) as Player[]);
  }

  /* =======================================================
     DATA
  ======================================================= */

  function getToday() {
    const now = new Date();

    const year = now.getFullYear();

    const month = String(now.getMonth() + 1).padStart(
      2,
      "0"
    );

    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }
function parseWhatsAppList(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const ignored = [
    "racha",
    "lista",
    "jogadores",
    "confirmados",
    "presentes",
  ];

  const names: string[] = [];

  for (const line of lines) {
    let name = line;

    // Remove numeração:
    // 1. Gustavo
    // 1) Gustavo
    // 1- Gustavo
    // 1: Gustavo
    // 1 Gustavo
    name = name.replace(
      /^\s*\d+\s*[\.\)\-:]?\s*/,
      ""
    );

    // Remove marcadores comuns do WhatsApp
    name = name
      .replace(/^[•\-–—]+\s*/, "")
      .replace(/^[*_~]+|[*_~]+$/g, "")
      .replace(/✅|❌|☑️|✔️|❎/g, "")
      .trim();

    if (!name) continue;

    // Ignora títulos/cabeçalhos
    if (ignored.includes(name.toLowerCase())) {
      continue;
    }

    names.push(name);
  }

  // Remove duplicados ignorando maiúsculas/minúsculas
  const uniqueNames: string[] = [];
  const seen = new Set<string>();

  for (const name of names) {
    const normalized = name
      .trim()
      .toLowerCase();

    if (seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    uniqueNames.push(name.trim());
  }

  return uniqueNames;
}
  async function importWhatsAppPlayers() {
  if (!groupId || importedNames.length === 0) {
    return;
  }

  try {
    const selectedIds: string[] = [];

    for (const importedName of importedNames) {
      const cleanName = importedName.trim();

      if (!cleanName) continue;

      const existing = players.find(
        (player) =>
          player.name.trim().toLowerCase() ===
          cleanName.toLowerCase()
      );

      if (existing) {
        selectedIds.push(existing.id);
        continue;
      }

      const { data: created, error } =
        await supabase
          .from("players")
          .insert({
            group_id: groupId,
            name: cleanName,
          })
          .select()
          .single();

      if (error) {
        console.error(
          "Erro ao criar jogador importado:",
          error
        );

        continue;
      }

      if (created) {
        selectedIds.push(created.id);
      }
    }

    await loadPlayers(groupId);

    if (racha && racha.status === "open") {
      const attendanceRows = selectedIds.map(
        (playerId) => ({
          racha_id: racha.id,
          player_id: playerId,
          present: true,
        })
      );

      if (attendanceRows.length > 0) {
        const { error: attendanceError } =
          await supabase
            .from("racha_attendance")
            .upsert(
              attendanceRows,
              {
                onConflict:
                  "racha_id,player_id",
              }
            );

        if (attendanceError) {
          throw attendanceError;
        }

        await loadAttendance(racha.id);
      }
    } else {
      setPresentPlayers(selectedIds);
    }

    setWhatsappText("");
    setImportedNames([]);
    setShowImportWhatsApp(false);

    alert(
      `${selectedIds.length} jogador${
        selectedIds.length !== 1 ? "es" : ""
      } importado${
        selectedIds.length !== 1 ? "s" : ""
      } com sucesso!`
    );
  } catch (error) {
    console.error(
      "Erro ao importar jogadores do WhatsApp:",
      error
    );

    alert(
      "Não foi possível importar a lista."
    );
  }
}
  /* =======================================================
     PRESENÇA
  ======================================================= */

  async function loadAttendance(rachaId: string) {
    const { data, error } = await supabase
      .from("racha_attendance")
      .select("*")
      .eq("racha_id", rachaId);

    if (error) {
      console.error("Erro ao carregar presença:", error);

      setAttendance([]);
      setPresentPlayers([]);

      return;
    }

    const rows = (data || []) as Attendance[];

    setAttendance(rows);

    setPresentPlayers(
      rows
        .filter((row) => row.present)
        .map((row) => row.player_id)
    );
  }

  /* =======================================================
     TIMES FIXOS
  ======================================================= */

  async function loadPoolTeams(rachaId: string) {
    const { data, error } = await supabase
      .from("racha_pool_teams")
      .select("*")
      .eq("racha_id", rachaId)
      .order("team_number");

    if (error) {
      console.error("Erro ao carregar times:", error);
      setPoolTeams([]);
      return [];
    }

    const rows = (data || []) as PoolTeam[];

    setPoolTeams(rows);

    return rows;
  }

  /* =======================================================
     JOGADORES DOS TIMES FIXOS
  ======================================================= */

  async function loadPoolTeamPlayers(rachaId: string) {
    const { data, error } = await supabase
      .from("racha_pool_team_players")
      .select("*")
      .eq("racha_id", rachaId);

    if (error) {
      console.error(
        "Erro ao carregar jogadores dos times:",
        error
      );

      setPoolTeamPlayers([]);

      return [];
    }

    const rows = (data || []) as PoolTeamPlayer[];

    setPoolTeamPlayers(rows);

    return rows;
  }

  /* =======================================================
     JOGOS
  ======================================================= */

  async function loadGames(rachaId: string) {
    const { data, error } = await supabase
      .from("racha_games")
      .select("*")
      .eq("racha_id", rachaId)
      .order("game_number");

    if (error) {
      console.error("Erro ao carregar jogos:", error);
      setGames([]);
      return [];
    }

    const rows = (data || []) as Game[];

    setGames(rows);

    return rows;
  }

  /* =======================================================
     CARREGAR JOGO
  ======================================================= */

  async function loadGame(game: Game | null) {
    if (!game) {
      setCurrentGame(null);
      setGameTeams([]);
      setGamePlayers([]);

      return;
    }

    setCurrentGame(game);

    const { data: loadedGameTeams, error: teamsError } =
      await supabase
        .from("racha_game_teams")
        .select("*")
        .eq("game_id", game.id);

    if (teamsError) {
      console.error(
        "Erro ao carregar times do jogo:",
        teamsError
      );
    }

    const { data: loadedPlayers, error: playersError } =
      await supabase
        .from("racha_game_players")
        .select("*")
        .eq("game_id", game.id);

    if (playersError) {
      console.error(
        "Erro ao carregar jogadores do jogo:",
        playersError
      );
    }

    setGameTeams(
      (loadedGameTeams || []) as GameTeam[]
    );

    setGamePlayers(
      (loadedPlayers || []) as GamePlayer[]
    );

    resetTimer(game.id);
  }

  /* =======================================================
     CARREGAR RACHA DE HOJE
  ======================================================= */

  async function loadTodayRacha(id: string) {
    if (!id) {
      setRacha(null);
      setPoolTeams([]);
      setPoolTeamPlayers([]);
      setGames([]);
      setCurrentGame(null);
      setGameTeams([]);
      setGamePlayers([]);
      setAttendance([]);
      setPresentPlayers([]);
      setNextGameTeams([]);

      return;
    }

    setLoadingRacha(true);

    const today = getToday();

    /*
      IMPORTANTE:

      Aqui buscamos o racha independentemente de estar
      aberto ou finalizado.

      Assim, quando o organizador finalizar o racha,
      as estatísticas continuam aparecendo.
    */

    const { data: loadedRacha, error } = await supabase
      .from("rachas")
      .select("*")
      .eq("group_id", id)
      .eq("played_on", today)
      .order("created_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Erro ao carregar racha:", error);

      setLoadingRacha(false);

      return;
    }

    if (!loadedRacha) {
      setRacha(null);
      setPoolTeams([]);
      setPoolTeamPlayers([]);
      setGames([]);
      setCurrentGame(null);
      setGameTeams([]);
      setGamePlayers([]);
      setAttendance([]);
      setPresentPlayers([]);
      setNextGameTeams([]);

      setLoadingRacha(false);

      return;
    }

    const loaded = loadedRacha as Racha;

    setRacha(loaded);

    setPlayersPerTeam(
      String(loaded.players_per_team)
    );

    await loadAttendance(loaded.id);

    const teams = await loadPoolTeams(loaded.id);

    await loadPoolTeamPlayers(loaded.id);

    const loadedGames = await loadGames(loaded.id);

    /*
      Se existir jogo aberto, ele é o jogo atual.

      Caso todos estejam finalizados, mostramos o último jogo
      e calculamos o próximo confronto.
    */

    const openGame =
      loadedGames.find(
        (game) => game.status === "open"
      ) || null;

    if (openGame) {
      await loadGame(openGame);
    } else if (loadedGames.length > 0) {
      const lastGame =
        loadedGames[loadedGames.length - 1];

      await loadGame(lastGame);

      if (loaded.status === "open") {
        await calculateNextGameFromFinished(
          loaded,
          teams,
          loadedGames,
          lastGame
        );
      } else {
        setNextGameTeams([]);
      }
    }

    setLoadingRacha(false);
  }

  /* =======================================================
     LOAD INICIAL
  ======================================================= */

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    if (!groupId) return;

    loadPlayers(groupId);
    loadTodayRacha(groupId);
  }, [groupId]);

  /* =======================================================
     CRIAR GRUPO
  ======================================================= */

  async function addGroup(e: FormEvent) {
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

    setGroupName("");

    await loadGroups();

    if (data) {
      setGroupId(data.id);

      await loadPlayers(data.id);
      await loadTodayRacha(data.id);
    }
  }

  /* =======================================================
     ADICIONAR JOGADOR
  ======================================================= */

  async function addPlayer(e: FormEvent) {
    e.preventDefault();

    const name = newPlayer.trim();

    if (!name || !groupId) return;

    const { data: created, error } = await supabase
      .from("players")
      .insert({
        group_id: groupId,
        name,
      })
      .select()
      .single();

    if (error) {
      console.error(
        "Erro ao adicionar jogador:",
        error
      );

      alert(
        "Não foi possível adicionar o jogador."
      );

      return;
    }

    setNewPlayer("");

    await loadPlayers(groupId);

    /*
      Se o racha já começou, adicionamos o jogador
      automaticamente à presença.
    */

    if (racha && racha.status === "open" && created) {
      await supabase
        .from("racha_attendance")
        .upsert(
          {
            racha_id: racha.id,
            player_id: created.id,
            present: true,
          },
          {
            onConflict: "racha_id,player_id",
          }
        );

      /*
        Também colocamos o novo jogador no time que
        possui menos jogadores.
      */

      const { data: currentMemberships } =
        await supabase
          .from("racha_pool_team_players")
          .select("*")
          .eq("racha_id", racha.id);

      const memberships =
        (currentMemberships || []) as PoolTeamPlayer[];

      if (poolTeams.length > 0) {
        const counts = poolTeams.map((team) => ({
          team,
          count: memberships.filter(
            (membership) =>
              membership.team_id === team.id
          ).length,
        }));

        counts.sort(
          (a, b) => a.count - b.count
        );

        const targetTeam = counts[0]?.team;

        if (targetTeam) {
          await supabase
            .from("racha_pool_team_players")
            .insert({
              racha_id: racha.id,
              team_id: targetTeam.id,
              player_id: created.id,
            });
        }
      }

      await loadAttendance(racha.id);
      await loadPoolTeamPlayers(racha.id);
    }
  }

  /* =======================================================
     PRESENÇA
  ======================================================= */

  async function togglePresent(playerId: string) {
    if (!racha) {
      setPresentPlayers((current) =>
        current.includes(playerId)
          ? current.filter(
              (id) => id !== playerId
            )
          : [...current, playerId]
      );

      return;
    }

    if (racha.status !== "open") return;

    const isPresent =
      presentPlayers.includes(playerId);

    const { error } = await supabase
      .from("racha_attendance")
      .upsert(
        {
          racha_id: racha.id,
          player_id: playerId,
          present: !isPresent,
        },
        {
          onConflict: "racha_id,player_id",
        }
      );

    if (error) {
      console.error(
        "Erro ao alterar presença:",
        error
      );

      return;
    }

    await loadAttendance(racha.id);
  }

  /* =======================================================
     SORTEIO
  ======================================================= */

  function shuffle<T>(array: T[]) {
    const result = [...array];

    for (
      let i = result.length - 1;
      i > 0;
      i--
    ) {
      const j = Math.floor(
        Math.random() * (i + 1)
      );

      [result[i], result[j]] = [
        result[j],
        result[i],
      ];
    }

    return result;
  }

  /* =======================================================
     CRIAR TIMES FIXOS
  ======================================================= */

  async function createPoolTeams(
    rachaData: Racha
  ) {
    const selectedPlayers =
      players.filter((player) =>
        presentPlayers.includes(player.id)
      );

    const perTeam =
      Number(rachaData.players_per_team);

    const numberOfTeams = Math.ceil(
      selectedPlayers.length / perTeam
    );

    const shuffledPlayers =
      shuffle(selectedPlayers);

    const createdTeams: PoolTeam[] = [];

    /*
      Criamos todos os times.
    */

    for (
      let i = 0;
      i < numberOfTeams;
      i++
    ) {
      const { data, error } =
        await supabase
          .from("racha_pool_teams")
          .insert({
            racha_id: rachaData.id,
            team_number: i + 1,
            name: `Time ${i + 1}`,
            color:
              TEAM_COLORS[
                i % TEAM_COLORS.length
              ],
          })
          .select()
          .single();

      if (error || !data) {
        console.error(
          "Erro ao criar time:",
          error
        );

        throw new Error(
          "Não foi possível criar os times."
        );
      }

      createdTeams.push(
        data as PoolTeam
      );
    }

    /*
      Agora salvamos permanentemente quem pertence
      a cada time.

      Exemplo:

      Time 1 -> João, Pedro, Carlos...
      Time 2 -> Lucas, André...
    */

    const membershipRows: {
      racha_id: string;
      team_id: string;
      player_id: string;
    }[] = [];

    for (
      let i = 0;
      i < createdTeams.length;
      i++
    ) {
      const teamPlayers =
        shuffledPlayers.slice(
          i * perTeam,
          (i + 1) * perTeam
        );

      for (const player of teamPlayers) {
        membershipRows.push({
          racha_id: rachaData.id,
          team_id:
            createdTeams[i].id,
          player_id: player.id,
        });
      }
    }

    if (membershipRows.length > 0) {
      const { error } =
        await supabase
          .from("racha_pool_team_players")
          .insert(membershipRows);

      if (error) {
        console.error(
          "Erro ao salvar jogadores dos times:",
          error
        );

        throw new Error(
          "Não foi possível salvar os jogadores dos times."
        );
      }
    }

    return createdTeams;
  }

  /* =======================================================
     CRIAR JOGO
  ======================================================= */

  async function createGame(
    rachaData: Racha,
    gameNumber: number,
    teamA: PoolTeam,
    teamB: PoolTeam
  ) {
    const {
      data: game,
      error: gameError,
    } = await supabase
      .from("racha_games")
      .insert({
        racha_id: rachaData.id,
        game_number: gameNumber,
        status: "open",
      })
      .select()
      .single();

    if (gameError || !game) {
      console.error(
        "Erro ao criar jogo:",
        gameError
      );

      throw new Error(
        "Não foi possível criar o jogo."
      );
    }

    const gameData = game as Game;

    /*
      Somente os DOIS times ativos entram no jogo.
    */

    const {
      data: gameTeamRows,
      error: gameTeamsError,
    } = await supabase
      .from("racha_game_teams")
      .insert([
        {
          game_id: gameData.id,
          team_id: teamA.id,
        },
        {
          game_id: gameData.id,
          team_id: teamB.id,
        },
      ])
      .select();

    if (
      gameTeamsError ||
      !gameTeamRows
    ) {
      await supabase
        .from("racha_games")
        .delete()
        .eq("id", gameData.id);

      throw new Error(
        "Não foi possível preparar os times."
      );
    }

    /*
      Descobrimos quem está presente.
    */

    const { data: attendanceRows } =
      await supabase
        .from("racha_attendance")
        .select("player_id,present")
        .eq(
          "racha_id",
          rachaData.id
        )
        .eq("present", true);

    const presentSet =
      new Set(
        (attendanceRows || []).map(
          (row) => row.player_id
        )
      );

    /*
      Buscamos a formação fixa.
    */

    const { data: memberships } =
      await supabase
        .from("racha_pool_team_players")
        .select("*")
        .eq(
          "racha_id",
          rachaData.id
        );

    const allMemberships =
      (memberships || []) as PoolTeamPlayer[];

    const gamePlayerRows: {
      game_id: string;
      pool_team_id: string;
      player_id: string;
      role: "field";
      own_goals: number;
    }[] = [];

    for (const team of [
      teamA,
      teamB,
    ]) {
      const teamMemberships =
        allMemberships.filter(
          (membership) =>
            membership.team_id ===
            team.id
        );

      for (const membership of teamMemberships) {
        /*
          Se o jogador estiver presente,
          ele entra no jogo.
        */

        if (
          presentSet.has(
            membership.player_id
          )
        ) {
          gamePlayerRows.push({
            game_id:
              gameData.id,
            pool_team_id:
              team.id,
            player_id:
              membership.player_id,
            role: "field",
            own_goals: 0,
          });
        }
      }
    }

    if (gamePlayerRows.length > 0) {
      const { error } =
        await supabase
          .from("racha_game_players")
          .insert(gamePlayerRows);

      if (error) {
        console.error(
          "Erro ao criar jogadores do jogo:",
          error
        );

        await supabase
          .from("racha_games")
          .delete()
          .eq(
            "id",
            gameData.id
          );

        throw new Error(
          "Não foi possível montar os jogadores do jogo."
        );
      }
    }

    setCurrentGame(gameData);

    setGameTeams(
      gameTeamRows as GameTeam[]
    );

    await loadGame(gameData);

    return gameData;
  }

  /* =======================================================
     INICIAR RACHA
  ======================================================= */

  async function startRacha() {
    if (!groupId) return;

    if (presentPlayers.length < 2) {
      alert(
        "Selecione pelo menos 2 jogadores."
      );

      return;
    }

    const perTeam =
      Number(playersPerTeam);

    if (
      !Number.isFinite(perTeam) ||
      perTeam < 1
    ) {
      alert(
        "Informe uma quantidade válida de jogadores por time."
      );

      return;
    }

    const numberOfTeams =
      Math.ceil(
        presentPlayers.length /
          perTeam
      );

    if (numberOfTeams < 2) {
      alert(
        "É necessário ter jogadores suficientes para formar pelo menos 2 times."
      );

      return;
    }

    setStartingRacha(true);

    try {
      /*
        Criar racha.
      */

      const {
        data: newRacha,
        error: rachaError,
      } = await supabase
        .from("rachas")
        .insert({
          group_id: groupId,
          played_on: getToday(),
          status: "open",
          players_per_team:
            perTeam,

          /*
            O primeiro time que poderá
            entrar depois do jogo 1
            será o Time 3.
          */
          next_team_number: 3,
        })
        .select()
        .single();

      if (
        rachaError ||
        !newRacha
      ) {
        console.error(
          "Erro ao criar racha:",
          rachaError
        );

        alert(
          "Não foi possível criar o racha."
        );

        return;
      }

      const rachaData =
        newRacha as Racha;

      /*
        Presença.
      */

      const attendanceRows =
        presentPlayers.map(
          (playerId) => ({
            racha_id:
              rachaData.id,
            player_id:
              playerId,
            present: true,
          })
        );

      const {
        error: attendanceError,
      } = await supabase
        .from("racha_attendance")
        .insert(
          attendanceRows
        );

      if (attendanceError) {
        throw attendanceError;
      }

      /*
        Criar os times fixos.
      */

      const teams =
        await createPoolTeams(
          rachaData
        );

      setRacha(rachaData);
      setPoolTeams(teams);

      await loadPoolTeamPlayers(
        rachaData.id
      );

      /*
        JOGO 1:

        Time 1 x Time 2
      */

      await createGame(
        rachaData,
        1,
        teams[0],
        teams[1]
      );

      await loadAttendance(
        rachaData.id
      );

      await loadGames(
        rachaData.id
      );

      await loadPlayers(
        groupId
      );
    } catch (error) {
      console.error(
        "Erro ao iniciar racha:",
        error
      );

      alert(
        "Ocorreu um erro ao iniciar o racha."
      );
    } finally {
      setStartingRacha(false);
    }
  }

  /* =======================================================
     JOGO ATUAL
  ======================================================= */

  const activeTeams = useMemo(() => {
    return gameTeams
      .map((gameTeam) =>
        poolTeams.find(
          (team) =>
            team.id ===
            gameTeam.team_id
        )
      )
      .filter(Boolean) as PoolTeam[];
  }, [
    gameTeams,
    poolTeams,
  ]);

  /* =======================================================
     PLACAR
  ======================================================= */

  function getTeamScore(teamId: string) {
    const regularGoals = gamePlayers
      .filter(
        (player) =>
          player.pool_team_id === teamId
      )
      .reduce(
        (total, player) =>
          total + (player.goals || 0),
        0
      );

    const ownGoals = gamePlayers
      .filter(
        (player) =>
          player.pool_team_id !== teamId
      )
      .reduce(
        (total, player) =>
          total + (player.own_goals || 0),
        0
      );

    return regularGoals + ownGoals;
  }

  /* =======================================================
     JOGADOR
  ======================================================= */

  function getPlayer(
    playerId: string
  ) {
    return players.find(
      (player) =>
        player.id ===
        playerId
    );
  }

  function getGamePlayer(
    playerId: string
  ) {
    return gamePlayers.find(
      (player) =>
        player.player_id ===
        playerId
    );
  }

  /* =======================================================
     GOLEIRO
  ======================================================= */

  function getGoalkeeper(
    teamId: string
  ) {
    return gamePlayers.find(
      (player) =>
        player.pool_team_id ===
          teamId &&
        player.role ===
          "goalkeeper"
    );
  }

  async function setGoalkeeper(
    gamePlayerId: string,
    teamId: string
  ) {
    const current =
      getGoalkeeper(teamId);

    if (
      current &&
      current.id !==
        gamePlayerId
    ) {
      await supabase
        .from("racha_game_players")
        .update({
          role: "field",
        })
        .eq(
          "id",
          current.id
        );
    }

    const { error } =
      await supabase
        .from("racha_game_players")
        .update({
          role: "goalkeeper",
        })
        .eq(
          "id",
          gamePlayerId
        );

    if (error) {
      console.error(
        "Erro ao definir goleiro:",
        error
      );

      return;
    }

    setGamePlayers(
      (currentPlayers) =>
        currentPlayers.map(
          (player) => {
            if (
              player.id ===
              gamePlayerId
            ) {
              return {
                ...player,
                role: "goalkeeper",
              };
            }

            if (
              current &&
              player.id ===
                current.id
            ) {
              return {
                ...player,
                role: "field",
              };
            }

            return player;
          }
        )
    );
  }

  /* =======================================================
     REGISTRAR GOL
  ======================================================= */

  function openGoalForm() {
    setGoalForm({
      scorer: "",
      assist: "",
      concededTeam:
        "",
    });

    setShowGoalForm(true);
  }

  async function registerGoal(
    e: FormEvent
  ) {
    e.preventDefault();

    if (!currentGame) return;

    if (!goalForm.scorer) {
      alert("Selecione quem fez o gol.");
      return;
    }

    const scorer = getGamePlayer(goalForm.scorer);

    if (!scorer || !scorer.pool_team_id) {
      alert("Jogador inválido.");
      return;
    }

    const isOwnGoal =
      goalForm.concededTeam === scorer.pool_team_id;

    if (!goalForm.concededTeam) {
      alert("Selecione o time que sofreu o gol.");
      return;
    }

    if (!isOwnGoal && goalForm.assist === goalForm.scorer) {
      alert("O jogador não pode dar assistência para o próprio gol.");
      return;
    }

    if (goalForm.assist) {
      const assister = getGamePlayer(goalForm.assist);

      if (
        !assister ||
        assister.pool_team_id !== scorer.pool_team_id ||
        isOwnGoal
      ) {
        alert(
          "A assistência deve ser de um jogador do mesmo time e não existe em gol contra."
        );
        return;
      }
    }

    setSavingGoal(true);

    try {
      /*
        Gol normal:
        - soma gol ao jogador
        - soma assistência ao companheiro, se houver
        - soma 1 gol sofrido ao goleiro do time adversário

        Gol contra:
        - NÃO soma gol ao jogador
        - soma 1 gol contra ao jogador
        - soma 1 gol sofrido ao goleiro do próprio time
        - o placar do adversário será calculado a partir do own_goals
      */
      if (isOwnGoal) {
        const { error: ownGoalError } = await supabase
          .from("racha_game_players")
          .update({
            own_goals: (scorer.own_goals || 0) + 1,
          })
          .eq("id", scorer.id);

        if (ownGoalError) throw ownGoalError;

        const goalkeeper = getGoalkeeper(scorer.pool_team_id);

        if (goalkeeper) {
          const { error: keeperError } = await supabase
            .from("racha_game_players")
            .update({
              goals_conceded:
                goalkeeper.goals_conceded + 1,
            })
            .eq("id", goalkeeper.id);

          if (keeperError) throw keeperError;
        }
      } else {
        const { error: goalError } = await supabase
          .from("racha_game_players")
          .update({
            goals: scorer.goals + 1,
          })
          .eq("id", scorer.id);

        if (goalError) throw goalError;

        if (goalForm.assist) {
          const assister = getGamePlayer(goalForm.assist);

          if (assister) {
            const { error: assistError } = await supabase
              .from("racha_game_players")
              .update({
                assists: assister.assists + 1,
              })
              .eq("id", assister.id);

            if (assistError) throw assistError;
          }
        }

        const goalkeeper = getGoalkeeper(goalForm.concededTeam);

        if (goalkeeper) {
          const { error: keeperError } = await supabase
            .from("racha_game_players")
            .update({
              goals_conceded:
                goalkeeper.goals_conceded + 1,
            })
            .eq("id", goalkeeper.id);

          if (keeperError) throw keeperError;
        }
      }

      await loadGame(currentGame);
      await loadPlayers(groupId);

      setGoalForm({
        scorer: "",
        assist: "",
        concededTeam: "",
      });
      setShowGoalForm(false);
    } catch (error) {
      console.error("Erro ao registrar gol:", error);
      alert("Não foi possível registrar o gol.");
    } finally {
      setSavingGoal(false);
    }
  }


  /* =======================================================
     TIMER
  ======================================================= */

  function timerKey(
    gameId: string
  ) {
    return `racha-timer-${gameId}`;
  }

  function saveTimer(
    gameId: string,
    status: TimerStatus,
    seconds: number,
    minutes: number
  ) {
    localStorage.setItem(
      timerKey(gameId),
      JSON.stringify({
        status,
        seconds,
        minutes,
      })
    );
  }

  function resetTimer(
    gameId: string
  ) {
    try {
      const saved =
        localStorage.getItem(
          timerKey(gameId)
        );

      if (saved) {
        const parsed =
          JSON.parse(saved);

        setDurationMinutes(
          Number(
            parsed.minutes
          ) ||
            DEFAULT_GAME_MINUTES
        );

        setTimerSeconds(
          Number(
            parsed.seconds
          ) ||
            DEFAULT_GAME_MINUTES *
              60
        );

        setTimerStatus(
          parsed.status ||
            "idle"
        );

        return;
      }
    } catch {}

    setDurationMinutes(
      DEFAULT_GAME_MINUTES
    );

    setTimerSeconds(
      DEFAULT_GAME_MINUTES *
        60
    );

    setTimerStatus("idle");
  }

  function formatTimer(
    seconds: number
  ) {
    const min =
      Math.floor(
        seconds / 60
      );

    const sec =
      seconds % 60;

    return `${String(min).padStart(
      2,
      "0"
    )}:${String(sec).padStart(
      2,
      "0"
    )}`;
  }

  function changeDuration(
    value: number
  ) {
    if (
      timerStatus ===
      "running"
    ) {
      return;
    }

    const minutes =
      Math.max(
        1,
        Math.min(
          180,
          value ||
            DEFAULT_GAME_MINUTES
        )
      );

    setDurationMinutes(
      minutes
    );

    const seconds =
      minutes * 60;

    setTimerSeconds(
      seconds
    );

    setTimerStatus("idle");

    if (currentGame) {
      saveTimer(
        currentGame.id,
        "idle",
        seconds,
        minutes
      );
    }
  }

  function startTimer() {
    if (!currentGame) return;

    let seconds =
      timerSeconds;

    if (
      timerStatus ===
        "finished" ||
      seconds <= 0
    ) {
      seconds =
        durationMinutes *
        60;

      setTimerSeconds(
        seconds
      );
    }

    setTimerStatus(
      "running"
    );

    saveTimer(
      currentGame.id,
      "running",
      seconds,
      durationMinutes
    );
  }

  function pauseTimer() {
    if (!currentGame) return;

    setTimerStatus(
      "paused"
    );

    saveTimer(
      currentGame.id,
      "paused",
      timerSeconds,
      durationMinutes
    );
  }

  function resumeTimer() {
    if (!currentGame) return;

    setTimerStatus(
      "running"
    );

    saveTimer(
      currentGame.id,
      "running",
      timerSeconds,
      durationMinutes
    );
  }

  function finishTimer() {
    if (!currentGame) return;

    setTimerSeconds(0);

    setTimerStatus(
      "finished"
    );

    saveTimer(
      currentGame.id,
      "finished",
      0,
      durationMinutes
    );
  }

  function restartTimer() {
    if (!currentGame) return;

    const seconds =
      durationMinutes *
      60;

    setTimerSeconds(
      seconds
    );

    setTimerStatus("idle");

    saveTimer(
      currentGame.id,
      "idle",
      seconds,
      durationMinutes
    );
  }

  useEffect(() => {
    if (
      timerStatus !==
      "running"
    ) {
      return;
    }

    const interval =
      setInterval(() => {
        setTimerSeconds(
          (current) => {
            if (
              current <= 1
            ) {
              if (
                currentGame
              ) {
                saveTimer(
                  currentGame.id,
                  "finished",
                  0,
                  durationMinutes
                );
              }

              setTimerStatus(
                "finished"
              );

              return 0;
            }

            const next =
              current - 1;

            if (
              currentGame
            ) {
              saveTimer(
                currentGame.id,
                "running",
                next,
                durationMinutes
              );
            }

            return next;
          }
        );
      }, 1000);

    return () =>
      clearInterval(
        interval
      );
  }, [
    timerStatus,
    currentGame,
    durationMinutes,
  ]);

  /* =======================================================
     PRÓXIMO TIME DA FILA
  ======================================================= */

  function getNextTeamNumber(
    startNumber: number,
    totalTeams: number,
    excluded: number[] = []
  ) {
    if (totalTeams < 1) {
      return null;
    }

    let candidate =
      startNumber;

    if (
      candidate >
      totalTeams
    ) {
      candidate = 1;
    }

    for (
      let i = 0;
      i < totalTeams;
      i++
    ) {
      if (
        !excluded.includes(
          candidate
        )
      ) {
        return candidate;
      }

      candidate++;

      if (
        candidate >
        totalTeams
      ) {
        candidate = 1;
      }
    }

    return null;
  }

  /* =======================================================
     CALCULAR PRÓXIMO JOGO
  ======================================================= */

  async function calculateNextGameFromFinished(
    rachaData: Racha,
    teams: PoolTeam[],
    gameList: Game[],
    lastGame: Game
  ) {
    if (
      teams.length < 2
    ) {
      setNextGameTeams([]);

      return;
    }

    const {
      data: currentGameTeamsData,
    } = await supabase
      .from("racha_game_teams")
      .select("*")
      .eq(
        "game_id",
        lastGame.id
      );

    const currentGameTeams =
      (currentGameTeamsData ||
        []) as GameTeam[];

    if (
      currentGameTeams.length !==
      2
    ) {
      setNextGameTeams([]);

      return;
    }

    const teamA =
      teams.find(
        (team) =>
          team.id ===
          currentGameTeams[0]
            .team_id
      );

    const teamB =
      teams.find(
        (team) =>
          team.id ===
          currentGameTeams[1]
            .team_id
      );

    if (
      !teamA ||
      !teamB
    ) {
      setNextGameTeams([]);

      return;
    }

    const {
      data: currentPlayersData,
    } = await supabase
      .from("racha_game_players")
      .select("*")
      .eq(
        "game_id",
        lastGame.id
      );

    const currentPlayers =
      (currentPlayersData ||
        []) as GamePlayer[];

    const regularScoreA =
      currentPlayers
        .filter(
          (player) =>
            player.pool_team_id ===
            teamA.id
        )
        .reduce(
          (
            total,
            player
          ) =>
            total +
            (player.goals || 0),
          0
        );

    const regularScoreB =
      currentPlayers
        .filter(
          (player) =>
            player.pool_team_id ===
            teamB.id
        )
        .reduce(
          (
            total,
            player
          ) =>
            total +
            (player.goals || 0),
          0
        );

    const ownGoalsA =
      currentPlayers
        .filter(
          (player) =>
            player.pool_team_id ===
            teamA.id
        )
        .reduce(
          (
            total,
            player
          ) =>
            total +
            (player.own_goals || 0),
          0
        );

    const ownGoalsB =
      currentPlayers
        .filter(
          (player) =>
            player.pool_team_id ===
            teamB.id
        )
        .reduce(
          (
            total,
            player
          ) =>
            total +
            (player.own_goals || 0),
          0
        );

    const scoreA =
      regularScoreA + ownGoalsB;

    const scoreB =
      regularScoreB + ownGoalsA;

    const totalTeams =
      teams.length;

    let nextNumber =
      Number(
        rachaData.next_team_number
      ) || 3;

    /*
      EMPATE

      Os dois saem.

      Entram dois times consecutivos
      da fila.

      Quando chegar ao último,
      volta para o Time 1.
    */

    if (
      scoreA ===
      scoreB
    ) {
      const firstNumber =
        getNextTeamNumber(
          nextNumber,
          totalTeams
        );

      if (
        firstNumber ===
        null
      ) {
        setNextGameTeams([]);

        return;
      }

      let secondStart =
        firstNumber + 1;

      if (
        secondStart >
        totalTeams
      ) {
        secondStart = 1;
      }

      const secondNumber =
        getNextTeamNumber(
          secondStart,
          totalTeams,
          [firstNumber]
        );

      if (
        secondNumber ===
        null
      ) {
        setNextGameTeams([
          teamA,
          teamB,
        ]);

        return;
      }

      const nextA =
        teams.find(
          (team) =>
            team.team_number ===
            firstNumber
        );

      const nextB =
        teams.find(
          (team) =>
            team.team_number ===
            secondNumber
        );

      if (
        nextA &&
        nextB
      ) {
        setNextGameTeams([
          nextA,
          nextB,
        ]);

        /*
          O ponteiro passa para o
          time seguinte ao segundo.
        */

        let afterSecond =
          secondNumber + 1;

        if (
          afterSecond >
          totalTeams
        ) {
          afterSecond = 1;
        }

        await supabase
          .from("rachas")
          .update({
            next_team_number:
              afterSecond,
          })
          .eq(
            "id",
            rachaData.id
          );
      }

      return;
    }

    /*
      VITÓRIA

      O vencedor permanece.

      O próximo time da fila entra.
    */

    const winner =
      scoreA >
      scoreB
        ? teamA
        : teamB;

    const opponentNumber =
      getNextTeamNumber(
        nextNumber,
        totalTeams,
        [winner.team_number]
      );

    if (
      opponentNumber ===
      null
    ) {
      setNextGameTeams([]);

      return;
    }

    const opponent =
      teams.find(
        (team) =>
          team.team_number ===
          opponentNumber
      );

    if (!opponent) {
      setNextGameTeams([]);

      return;
    }

    setNextGameTeams([
      winner,
      opponent,
    ]);

    /*
      Ponteiro passa para o time
      depois do desafiante.
    */

    let afterOpponent =
      opponentNumber + 1;

    if (
      afterOpponent >
      totalTeams
    ) {
      afterOpponent = 1;
    }

    await supabase
      .from("rachas")
      .update({
        next_team_number:
          afterOpponent,
      })
      .eq(
        "id",
        rachaData.id
      );

    setRacha(
      (current) =>
        current
          ? {
              ...current,
              next_team_number:
                afterOpponent,
            }
          : current
    );
  }

  /* =======================================================
     FINALIZAR JOGO
  ======================================================= */

  async function finishGame() {
    if (!currentGame) return;

    const confirmed =
      confirm(
        `Finalizar o Jogo ${currentGame.game_number}?`
      );

    if (!confirmed) return;

    setFinishingGame(true);

    try {
      const {
        error,
      } = await supabase
        .from("racha_games")
        .update({
          status:
            "finished",
        })
        .eq(
          "id",
          currentGame.id
        );

      if (error) {
        throw error;
      }

      const finishedGame = {
        ...currentGame,
        status:
          "finished" as const,
      };

      setCurrentGame(
        finishedGame
      );

      setGames(
        (current) =>
          current.map(
            (game) =>
              game.id ===
              currentGame.id
                ? finishedGame
                : game
          )
      );

      setTimerStatus(
        "finished"
      );

      /*
        Atualiza estatísticas
        do jogador.
      */

      await loadPlayers(
        groupId
      );

      /*
        Calcula o próximo jogo
        com base no resultado.
      */

      if (racha) {
        await calculateNextGameFromFinished(
          racha,
          poolTeams,
          games.map(
            (game) =>
              game.id ===
              currentGame.id
                ? finishedGame
                : game
          ),
          finishedGame
        );
      }
    } catch (error) {
      console.error(
        "Erro ao finalizar jogo:",
        error
      );

      alert(
        "Não foi possível finalizar o jogo."
      );
    } finally {
      setFinishingGame(false);
    }
  }

  /* =======================================================
     INICIAR PRÓXIMO JOGO
  ======================================================= */

  async function startNextGame() {
    if (
      !racha ||
      nextGameTeams.length !==
        2
    ) {
      return;
    }

    setStartingNextGame(true);

    try {
      const nextNumber =
        games.length + 1;

      await createGame(
        racha,
        nextNumber,
        nextGameTeams[0],
        nextGameTeams[1]
      );

      setNextGameTeams([]);

      await loadGames(
        racha.id
      );

      await loadPoolTeamPlayers(
        racha.id
      );
    } catch (error) {
      console.error(
        "Erro ao iniciar próximo jogo:",
        error
      );

      alert(
        "Não foi possível iniciar o próximo jogo."
      );
    } finally {
      setStartingNextGame(
        false
      );
    }
  }

  /* =======================================================
     FINALIZAR RACHA
  ======================================================= */

  async function finishRacha() {
    if (!racha) return;

    if (
      racha.status ===
      "finished"
    ) {
      return;
    }

    const confirmed =
      confirm(
        "Tem certeza que deseja finalizar o racha de hoje?"
      );

    if (!confirmed) return;

    setFinishingRacha(true);

    try {
      /*
        Se ainda houver jogo aberto,
        finalizamos primeiro.
      */

      if (
        currentGame &&
        currentGame.status ===
          "open"
      ) {
        await supabase
          .from("racha_games")
          .update({
            status:
              "finished",
          })
          .eq(
            "id",
            currentGame.id
          );
      }

      const {
        error,
      } = await supabase
        .from("rachas")
        .update({
          status:
            "finished",
        })
        .eq(
          "id",
          racha.id
        );

      if (error) {
        throw error;
      }

      /*
        IMPORTANTE:

        Não fazemos setRacha(null).

        O racha continua na tela para
        mostrar as estatísticas finais.
      */

      setRacha(
        (current) =>
          current
            ? {
                ...current,
                status:
                  "finished",
              }
            : current
      );

      if (
        currentGame
      ) {
        setCurrentGame(
          (current) =>
            current
              ? {
                  ...current,
                  status:
                    "finished",
                }
              : current
        );
      }

      setNextGameTeams([]);

      const refreshedGames =
        await loadGames(racha.id);

      await loadPlayers(groupId);

      if (poolTeams.length > 0) {
        await loadFinalStats(
          racha.id,
          poolTeams,
          refreshedGames
        );
      }
    } catch (error) {
      console.error(
        "Erro ao finalizar racha:",
        error
      );

      alert(
        "Não foi possível finalizar o racha."
      );
    } finally {
      setFinishingRacha(false);
    }
  }

  function calculateRachaRating(
    goals: number,
    assists: number,
    conceded: number,
    ownGoals: number,
    present: boolean
  ) {
    /*
      Nota inspirada em sistemas de rating de partidas:
      - começa em 6.0
      - gols têm maior impacto
      - assistência ajuda
      - gols sofridos como goleiro reduzem
      - gol contra tem penalização maior
      - presença no racha dá pequeno bônus
      - sempre entre 0.0 e 10.0
    */
    const rating =
      6 +
      goals * 0.65 +
      assists * 0.35 +
      (present ? 0.15 : 0) -
      conceded * 0.45 -
      ownGoals * 1.25;

    return Math.max(
      0,
      Math.min(10, Number(rating.toFixed(1)))
    );
  }

  /* =======================================================
     ESTATÍSTICAS FINAIS
  ======================================================= */

  const [
    finalTeamStats,
    setFinalTeamStats,
  ] = useState<
    TeamSummary[]
  >([]);

  const [
    finalPlayerStats,
    setFinalPlayerStats,
  ] = useState<
    PlayerRanking[]
  >([]);

  /* =======================================================
     CARREGAR ESTATÍSTICAS COMPLETAS
  ======================================================= */

  async function loadFinalStats(
    rachaId: string,
    teams: PoolTeam[],
    gameList: Game[]
  ) {
    if (!rachaId || teams.length === 0) {
      setFinalTeamStats([]);
      setFinalPlayerStats([]);
      return;
    }

    const gameIds = gameList.map((game) => game.id);

    if (gameIds.length === 0) {
      setFinalTeamStats([]);
      setFinalPlayerStats([]);
      return;
    }

    const [
      { data: allGamePlayersData, error: gamePlayersError },
      { data: attendanceData },
    ] = await Promise.all([
      supabase
        .from("racha_game_players")
        .select("*")
        .in("game_id", gameIds),
      supabase
        .from("racha_attendance")
        .select("player_id,present")
        .eq("racha_id", rachaId)
        .eq("present", true),
    ]);

    if (gamePlayersError) {
      console.error(
        "Erro ao carregar estatísticas dos jogadores:",
        gamePlayersError
      );
    }

    const allGamePlayers =
      (allGamePlayersData || []) as GamePlayer[];

    const presentSet = new Set(
      (attendanceData || []).map((row) => row.player_id)
    );

    const playerMap = new Map<
      string,
      {
        goals: number;
        assists: number;
        conceded: number;
        ownGoals: number;
      }
    >();

    for (const gp of allGamePlayers) {
      const current =
        playerMap.get(gp.player_id) || {
          goals: 0,
          assists: 0,
          conceded: 0,
          ownGoals: 0,
        };

      current.goals += gp.goals || 0;
      current.assists += gp.assists || 0;
      current.conceded += gp.goals_conceded || 0;
      current.ownGoals += gp.own_goals || 0;

      playerMap.set(gp.player_id, current);
    }

    const playerRanking: PlayerRanking[] = Array.from(
      playerMap.entries()
    )
      .map(([playerId, stats]) => {
        const player = getPlayer(playerId);

        return {
          player,
          goals: stats.goals,
          assists: stats.assists,
          conceded: stats.conceded,
          ownGoals: stats.ownGoals,
          overall: calculateRachaRating(
            stats.goals,
            stats.assists,
            stats.conceded,
            stats.ownGoals,
            presentSet.has(playerId)
          ),
        };
      })
      .filter((item) => item.player)
      .sort((a, b) => {
        if (b.overall !== a.overall) {
          return b.overall - a.overall;
        }

        if (b.goals !== a.goals) {
          return b.goals - a.goals;
        }

        if (b.assists !== a.assists) {
          return b.assists - a.assists;
        }

        return a.player!.name.localeCompare(b.player!.name);
      });

    setFinalPlayerStats(playerRanking);

    /*
      Estatísticas dos times.
      Gol normal = gol do jogador.
      Gol contra = gol para o adversário.
    */
    const teamMap = new Map<
      string,
      {
        goals: number;
        conceded: number;
      }
    >();

    for (const team of teams) {
      teamMap.set(team.id, {
        goals: 0,
        conceded: 0,
      });
    }

    for (const game of gameList) {
      const { data: gameTeamsData } = await supabase
        .from("racha_game_teams")
        .select("*")
        .eq("game_id", game.id);

      const currentGameTeams =
        (gameTeamsData || []) as GameTeam[];

      if (currentGameTeams.length !== 2) {
        continue;
      }

      const teamA = currentGameTeams[0].team_id;
      const teamB = currentGameTeams[1].team_id;

      const gamePlayersForGame = allGamePlayers.filter(
        (gp) => gp.game_id === game.id
      );

      const regularGoalsA = gamePlayersForGame
        .filter((gp) => gp.pool_team_id === teamA)
        .reduce((total, gp) => total + (gp.goals || 0), 0);

      const regularGoalsB = gamePlayersForGame
        .filter((gp) => gp.pool_team_id === teamB)
        .reduce((total, gp) => total + (gp.goals || 0), 0);

      const ownGoalsA = gamePlayersForGame
        .filter((gp) => gp.pool_team_id === teamA)
        .reduce((total, gp) => total + (gp.own_goals || 0), 0);

      const ownGoalsB = gamePlayersForGame
        .filter((gp) => gp.pool_team_id === teamB)
        .reduce((total, gp) => total + (gp.own_goals || 0), 0);

      const scoreA = regularGoalsA + ownGoalsB;
      const scoreB = regularGoalsB + ownGoalsA;

      const statsA = teamMap.get(teamA);
      const statsB = teamMap.get(teamB);

      if (statsA) {
        statsA.goals += scoreA;
        statsA.conceded += scoreB;
      }

      if (statsB) {
        statsB.goals += scoreB;
        statsB.conceded += scoreA;
      }
    }

    const teamRanking = teams
      .map((team) => {
        const stats = teamMap.get(team.id) || {
          goals: 0,
          conceded: 0,
        };

        return {
          team,
          goals: stats.goals,
          conceded: stats.conceded,
        };
      })
      .sort((a, b) => {
        if (b.goals !== a.goals) {
          return b.goals - a.goals;
        }

        return a.team.team_number - b.team.team_number;
      });

    setFinalTeamStats(teamRanking);
  }

  useEffect(() => {
    if (
      racha &&
      racha.status ===
        "finished" &&
      games.length > 0 &&
      poolTeams.length > 0
    ) {
      loadFinalStats(
        racha.id,
        poolTeams,
        games
      );
    }
  }, [
    racha?.status,
    games,
    poolTeams,
  ]);

  /* =======================================================
     LOGOUT
  ======================================================= */

  async function logout() {
    await supabase.auth.signOut();

    location.href =
      "/admin/login";
  }

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <main className="page">
        <div className="card">
          Carregando...
        </div>
      </main>
    );
  }

  /* =======================================================
     INTERFACE
  ======================================================= */

  return (
    <main className="page">

      {/* ===================================================
          HEADER
      =================================================== */}

      <header className="top">
        <div>
          <span className="badge">
            ⚽ Racha FC
          </span>

          <h1>
            Painel do organizador
          </h1>
        </div>

        <button
          className="ghost"
          onClick={logout}
        >
          <LogOut size={17} />
          Sair
        </button>
      </header>

      {/* ===================================================
          GRUPO
      =================================================== */}

      <section className="toolbar">
        <select
          value={groupId}
          onChange={(e) =>
            setGroupId(
              e.target.value
            )
          }
        >
          {groups.map(
            (group) => (
              <option
                key={
                  group.id
                }
                value={
                  group.id
                }
              >
                {group.name}
              </option>
            )
          )}
        </select>

        <form
          onSubmit={addGroup}
          className="inline"
        >
          <input
            placeholder="Novo grupo"
            value={
              groupName
            }
            onChange={(e) =>
              setGroupName(
                e.target.value
              )
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

      {/* ===================================================
          MENU
      =================================================== */}

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

      {/* ===================================================
          ADICIONAR JOGADOR
      =================================================== */}

      <div className="card">
        <h2>
          <Users />
          Adicionar jogador
        </h2>

        <form
          onSubmit={addPlayer}
          className="inline"
        >
          <input
            type="text"
            placeholder="Nome do jogador"
            value={
              newPlayer
            }
            onChange={(e) =>
              setNewPlayer(
                e.target.value
              )
            }
          />

          <button
            className="button"
            type="submit"
            disabled={
              !newPlayer.trim()
            }
          >
            <Plus size={17} />
            Adicionar jogador
          </button>
        </form>

        {racha &&
          racha.status ===
            "open" && (
            <p className="muted">
              O jogador será
              adicionado como
              presente no racha
              e colocado no time
              com menos jogadores.
            </p>
          )}
      </div>

      {/* ===================================================
          CARREGANDO RACHA
      =================================================== */}

      {loadingRacha ? (
        <div className="card">
          Carregando racha...
        </div>
      ) : !racha ? (

        /* =================================================
           PRÉ-RACHA
        ================================================= */

        <div className="card">

          <div className="section-title">
            <div>
              <h2>
                <CalendarDays />
                Racha de hoje
              </h2>

              <p className="muted">
                Selecione os jogadores
                presentes e defina
                quantos jogadores haverá
                em cada time.
              </p>
              <div
  style={{
    marginTop: "16px",
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  }}
>
  <button
    type="button"
    className="button"
    onClick={() =>
      setShowImportWhatsApp(
        (current) => !current
      )
    }
  >
    📋 Importar lista do WhatsApp
  </button>
</div>

{showImportWhatsApp && (
  <div
    className="card"
    style={{
      marginTop: "16px",
    }}
  >
    <h3>
      📋 Importar lista do WhatsApp
    </h3>

    <p className="muted">
      Copie a lista do WhatsApp e
      cole abaixo.
    </p>

    <textarea
      value={whatsappText}
      onChange={(e) =>
        setWhatsappText(
          e.target.value
        )
      }
      placeholder={`Exemplo:

1. Gustavo
2. João
3. Pedro
4. Lucas
5. Carlos`}
      rows={8}
      style={{
        width: "100%",
        marginTop: "12px",
        resize: "vertical",
      }}
    />

    <div
      style={{
        marginTop: "12px",
        display: "flex",
        gap: "10px",
        flexWrap: "wrap",
      }}
    >
      <button
        type="button"
        className="button"
        onClick={() => {
          const names =
            parseWhatsAppList(
              whatsappText
            );

          setImportedNames(
            names
          );
        }}
      >
        Encontrar jogadores
      </button>
      {importedNames.length > 0 && (
  <button
    type="button"
    className="button"
    onClick={importWhatsAppPlayers}
  >
    ⚽ Importar para a racha
  </button>
)}
      <button
        type="button"
        className="button secondary"
        onClick={() => {
          setWhatsappText("");
          setImportedNames([]);
        }}
      >
        Limpar
      </button>
    </div>

    {importedNames.length >
      0 && (
      <div
        style={{
          marginTop: "20px",
        }}
      >
        <b>
          Jogadores encontrados:
        </b>

        <div
          style={{
            marginTop: "10px",
            display: "flex",
            flexDirection:
              "column",
            gap: "8px",
          }}
        >
          {importedNames.map(
            (name) => {
              const existing =
                players.find(
                  (player) =>
                    player.name
                      .trim()
                      .toLowerCase() ===
                    name
                      .trim()
                      .toLowerCase()
                );

              return (
                <div
                  key={name}
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    alignItems:
                      "center",
                    gap: "10px",
                  }}
                >
                  <span>
                    {existing
                      ? "✓"
                      : "＋"}{" "}
                    {name}
                  </span>

                  <small>
                    {existing
                      ? "Já cadastrado"
                      : "Novo jogador"}
                  </small>
                </div>
              );
            }
          )}
        </div>
      </div>
    )}
  </div>
)}
            </div>

            <span className="present-count">
              {
                presentPlayers.length
              }{" "}
              presentes
            </span>
          </div>

          <div className="form-grid">
            <label>
              <span>
                Jogadores por time
              </span>

              <select
                value={
                  playersPerTeam
                }
                onChange={(e) =>
                  setPlayersPerTeam(
                    e.target.value
                  )
                }
              >
                {Array.from(
                  {
                    length: 11,
                  },
                  (_, index) => (
                    <option
                      key={
                        index + 1
                      }
                      value={
                        index + 1
                      }
                    >
                      {index + 1} jogador
                      {index + 1 !==
                      1
                        ? "es"
                        : ""}
                    </option>
                  )
                )}
              </select>
            </label>
          </div>

          {presentPlayers.length >
            0 && (
            <p className="muted">
              Com{" "}
              <b>
                {
                  presentPlayers.length
                }
              </b>{" "}
              jogadores e{" "}
              <b>
                {
                  Number(
                    playersPerTeam
                  )
                }
              </b>{" "}
              por time, serão
              criados{" "}
              <b>
                {Math.ceil(
                  presentPlayers.length /
                    Number(
                      playersPerTeam
                    )
                )}
              </b>{" "}
              times.
            </p>
          )}

          {players.length ===
          0 ? (
            <div className="empty-box">
              <Users size={32} />

              <b>
                Nenhum jogador
                cadastrado
              </b>

              <span>
                Adicione os jogadores
                acima.
              </span>
            </div>
          ) : (
            <>
              <div className="attendance-list">
                {players.map(
                  (player) => {
                    const selected =
                      presentPlayers.includes(
                        player.id
                      );

                    return (
                      <button
                        key={
                          player.id
                        }
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
                            {
                              player.name
                            }
                          </b>

                          <small>
                            Overall{" "}
                            {
                              player.overall
                            }
                          </small>
                        </div>

                        <div className="check">
                          {selected
                            ? "✓"
                            : ""}
                        </div>
                      </button>
                    );
                  }
                )}
              </div>

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
                      2
                  }
                >
                  <Shuffle
                    size={18}
                  />

                  {startingRacha
                    ? "Sorteando..."
                    : "Sortear times e iniciar"}
                </button>
              </div>
            </>
          )}
        </div>

      ) : (
        <>
          {/* ===============================================
              CABEÇALHO DO RACHA
          =============================================== */}

          <div className="card">
            <div className="section-title">
              <div>
                <span className="badge">
                  ⚽ RACHA DE HOJE
                </span>

                <h2>
                  {racha.played_on}
                </h2>

                <p className="muted">
                  {
                    presentPlayers.length
                  }{" "}
                  jogadores presentes
                  ·{" "}
                  {
                    poolTeams.length
                  }{" "}
                  times
                  ·{" "}
                  {
                    games.length
                  }{" "}
                  jogos
                </p>
              </div>

              {racha.status ===
                "open" && (
                <button
                  className="finish-button"
                  type="button"
                  onClick={
                    finishRacha
                  }
                  disabled={
                    finishingRacha
                  }
                >
                  <CheckCircle2
                    size={17}
                  />

                  {finishingRacha
                    ? "Finalizando..."
                    : "Finalizar racha"}
                </button>
              )}
            </div>
          </div>

          {/* ===============================================
              RACHA FINALIZADO
          =============================================== */}

          {racha.status ===
          "finished" ? (
            <>
              <div className="card">
                <div className="section-title">
                  <div>
                    <span className="badge">
                      RACHA FINALIZADO
                    </span>

                    <h2>
                      <Trophy />
                      Estatísticas do racha
                    </h2>

                    <p className="muted">
                      Resultado geral de
                      todos os jogos
                      realizados.
                    </p>
                  </div>

                  <span className="present-count">
                    {games.length}{" "}
                    jogos realizados
                  </span>
                </div>
              </div>

              {/* =========================================
                  TIMES
              ========================================= */}

              <div className="card">
                <div className="section-title">
                  <div>
                    <h2>
                      <BarChart3 />
                      Estatísticas dos times
                    </h2>
                  </div>
                </div>

                <div className="teams-grid">
                  {finalTeamStats.map(
                    (
                      item,
                      index
                    ) => (
                      <div
                        className="card team-card"
                        key={
                          item.team.id
                        }
                      >
                        <div className="team-header">
                          <div>
                            <span
                              className="team-color"
                              style={{
                                backgroundColor:
                                  item.team
                                    .color,
                              }}
                            />

                            <h2>
                              {
                                item.team
                                  .name
                              }
                            </h2>
                          </div>

                          {index ===
                            0 && (
                            <Crown
                              size={
                                22
                              }
                            />
                          )}
                        </div>

                        <div className="stats">
                          <div>
                            <Target />

                            <b>
                              Gols feitos
                            </b>

                            <span>
                              {
                                item.goals
                              }
                            </span>
                          </div>

                          <div>
                            <Shield />

                            <b>
                              Gols sofridos
                            </b>

                            <span>
                              {
                                item.conceded
                              }
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>

                {finalTeamStats.length >
                  0 && (
                  <div className="stats">
                    <div>
                      <Trophy />

                      <b>
                        Time que mais fez gols
                      </b>

                      <span>
                        {
                          finalTeamStats[0]
                            .team
                            .name
                        }{" "}
                        —{" "}
                        {
                          finalTeamStats[0]
                            .goals
                        }{" "}
                        gols
                      </span>
                    </div>

                    <div>
                      <Shield />

                      <b>
                        Time que mais sofreu gols
                      </b>

                      <span>
                        {
                          [...finalTeamStats]
                            .sort(
                              (
                                a,
                                b
                              ) =>
                                b.conceded -
                                a.conceded
                            )[0]
                            ?.team
                            .name
                        }{" "}
                        —{" "}
                        {
                          [...finalTeamStats]
                            .sort(
                              (
                                a,
                                b
                              ) =>
                                b.conceded -
                                a.conceded
                            )[0]
                            ?.conceded
                        }{" "}
                        gols
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* =========================================
                  RANKING DE JOGADORES
              ========================================= */}

              <div className="card">
                <div className="section-title">
                  <div>
                    <h2>
                      <Trophy />
                      Ranking de jogadores
                    </h2>

                    <p className="muted">
                      Estatísticas somadas
                      de todos os jogos
                      do racha.
                    </p>
                  </div>
                </div>

                <div className="team-players">
                  {finalPlayerStats.map(
                    (
                      item,
                      index
                    ) => (
                      <div
                        className="match-player"
                        key={
                          item.player
                            ?.id
                        }
                      >
                        <div className="avatar">
                          {item.player
                            ?.photo_url ? (
                            <img
                              src={
                                item
                                  .player
                                  .photo_url
                              }
                              alt={
                                item
                                  .player
                                  .name
                              }
                            />
                          ) : (
                            item.player
                              ?.name?.[0]
                              ?.toUpperCase()
                          )}
                        </div>

                        <div className="match-player-info">
                          <b>
                            {index +
                              1}
                            .{" "}
                            {
                              item
                                .player
                                ?.name
                            }
                          </b>

                          <small>
                            ⚽ {item.goals} · 🎯 {item.assists}
                            {item.conceded > 0 &&
                              ` · 🧤 ${item.conceded}`}
                            {item.ownGoals > 0 &&
                              ` · ❌ ${item.ownGoals} gol contra`}
                          </small>
                        </div>

                        <strong
                          title="Nota do racha"
                          style={{
                            minWidth: "42px",
                            height: "42px",
                            borderRadius: "12px",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "1.05rem",
                            fontWeight: 800,
                            background:
                              item.overall >= 8
                                ? "#16a34a"
                                : item.overall >= 7
                                  ? "#2563eb"
                                  : item.overall >= 6
                                    ? "#ca8a04"
                                    : "#dc2626",
                            color: "#fff",
                          }}
                        >
                          {item.overall.toFixed(1)}
                        </strong>

                        {index ===
                          0 && (
                          <Crown
                            size={22}
                          />
                        )}
                      </div>
                    )
                  )}
                </div>
              </div>

              {
            </>

          ) : (
            <>
              {/* =========================================
                  TIMES FIXOS
              ========================================= */}

              <div className="card">
                <div className="section-title">
                  <div>
                    <h2>
                      <Trophy />
                      Times do racha
                    </h2>

                    <p className="muted">
                      Os times ficam fixos
                      durante todo o racha.
                    </p>
                  </div>
                </div>

                <div className="teams-grid">
                  {poolTeams.map(
                    (team) => {
                      const teamPlayers =
                        poolTeamPlayers
                          .filter(
                            (
                              membership
                            ) =>
                              membership.team_id ===
                              team.id
                          )
                          .map(
                            (
                              membership
                            ) =>
                              getPlayer(
                                membership.player_id
                              )
                          )
                          .filter(
                            Boolean
                          ) as Player[];

                      return (
                        <div
                          className="card team-card"
                          key={
                            team.id
                          }
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
                                {
                                  team.name
                                }
                              </h2>
                            </div>
                          </div>

                          <div className="team-players">
                            {teamPlayers.map(
                              (
                                player
                              ) => (
                                <div
                                  className="match-player"
                                  key={
                                    player.id
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

                                  <div className="match-player-info">
                                    <b>
                                      {
                                        player.name
                                      }
                                    </b>

                                    <small>
                                      Overall{" "}
                                      {
                                        player.overall
                                      }
                                    </small>
                                  </div>
                                </div>
                              )
                            )}
                          </div>

                          <div className="muted">
                            {
                              teamPlayers.length
                            }{" "}
                            jogadores
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>

              {/* =========================================
                  JOGO ATUAL
              ========================================= */}

              {currentGame && (
                <>
                  <div className="card">
                    <div className="section-title">
                      <div>
                        <span className="badge">
                          JOGO{" "}
                          {
                            currentGame.game_number
                          }
                        </span>

                        <h2>
                          Confronto
                        </h2>
                      </div>

                      <span className="present-count">
                        {currentGame.status ===
                        "open"
                          ? "Em andamento"
                          : "Finalizado"}
                      </span>
                    </div>

                    <div className="match-versus">
                      {activeTeams.map(
                        (
                          team,
                          index
                        ) => (
                          <div
                            className="versus-team"
                            key={
                              team.id
                            }
                          >
                            <span
                              className="team-color"
                              style={{
                                backgroundColor:
                                  team.color,
                              }}
                            />

                            <b>
                              {
                                team.name
                              }
                            </b>

                            <strong>
                              {
                                getTeamScore(
                                  team.id
                                )
                              }
                            </strong>

                            {index ===
                              0 &&
                              activeTeams.length ===
                                2 && (
                                <span className="versus">
                                  ×
                                </span>
                              )}
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  {/* =======================================
                      TIMER
                  ======================================= */}

                  <div className="card">
                    <div className="section-title">
                      <div>
                        <h2>
                          <Clock />
                          Cronômetro
                        </h2>

                        <p className="muted">
                          O cronômetro é
                          independente da
                          finalização do jogo.
                        </p>
                      </div>

                      <strong
                        style={{
                          fontSize:
                            "2.8rem",
                          fontVariantNumeric:
                            "tabular-nums",
                        }}
                      >
                        {formatTimer(
                          timerSeconds
                        )}
                      </strong>
                    </div>

                    <div className="form-grid">
                      <label>
                        <span>
                          Duração em minutos
                        </span>

                        <input
                          type="number"
                          min="1"
                          max="180"
                          value={
                            durationMinutes
                          }
                          disabled={
                            timerStatus ===
                            "running"
                          }
                          onChange={(e) =>
                            changeDuration(
                              Number(
                                e.target.value
                              )
                            )
                          }
                        />
                      </label>
                    </div>

                    <div className="score-actions">
                      {timerStatus ===
                        "idle" && (
                        <button
                          className="button"
                          type="button"
                          onClick={
                            startTimer
                          }
                        >
                          <Play
                            size={17}
                          />
                          Iniciar tempo
                        </button>
                      )}

                      {timerStatus ===
                        "running" && (
                        <button
                          className="button"
                          type="button"
                          onClick={
                            pauseTimer
                          }
                        >
                          <Pause
                            size={17}
                          />
                          Pausar
                        </button>
                      )}

                      {timerStatus ===
                        "paused" && (
                        <button
                          className="button"
                          type="button"
                          onClick={
                            resumeTimer
                          }
                        >
                          <Play
                            size={17}
                          />
                          Continuar
                        </button>
                      )}

                      <button
                        className="ghost"
                        type="button"
                        onClick={
                          restartTimer
                        }
                      >
                        <RotateCcw
                          size={17}
                        />
                        Reiniciar
                      </button>

                      {timerStatus !==
                        "finished" && (
                        <button
                          className="finish-button"
                          type="button"
                          onClick={
                            finishTimer
                          }
                        >
                          <CheckCircle2
                            size={17}
                          />
                          Encerrar tempo
                        </button>
                      )}
                    </div>

                    {timerStatus ===
                      "finished" && (
                      <p className="muted">
                        ⏱️ O tempo terminou.
                        Finalize o jogo para
                        definir o vencedor ou
                        empate.
                      </p>
                    )}
                  </div>

                  {/* =======================================
                      AÇÕES DO JOGO
                  ======================================= */}

                  {currentGame.status ===
                    "open" && (
                    <div className="score-card">
                      <div className="live-label">
                        <span className="live-dot" />
                        JOGO EM ANDAMENTO
                      </div>

                      <div className="scoreboard">
                        {activeTeams.map(
                          (team) => (
                            <div
                              className="score-team"
                              key={
                                team.id
                              }
                            >
                              <span
                                className="team-color"
                                style={{
                                  backgroundColor:
                                    team.color,
                                }}
                              />

                              <b>
                                {
                                  team.name
                                }
                              </b>

                              <strong>
                                {
                                  getTeamScore(
                                    team.id
                                  )
                                }
                              </strong>
                            </div>
                          )
                        )}
                      </div>

                      <div className="score-actions">
                        <button
                          className="button"
                          type="button"
                          onClick={
                            openGoalForm
                          }
                        >
                          <Target
                            size={18}
                          />
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
                  )}

                  {/* =======================================
                      FORMULÁRIO GOL
                  ======================================= */}

                  {showGoalForm && (
                    <div className="card">
                      <div className="section-title">
                        <div>
                          <h2>
                            <Target />
                            Registrar gol
                          </h2>
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
                              onChange={(
                                e
                              ) => {
                                const scorer =
                                  e.target.value;

                                const scorerPlayer =
                                  getGamePlayer(
                                    scorer
                                  );

                                const opponent =
                                  activeTeams.find(
                                    (
                                      team
                                    ) =>
                                      team.id !==
                                      scorerPlayer?.pool_team_id
                                  );

                                setGoalForm(
                                  (
                                    current
                                  ) => ({
                                    ...current,
                                    scorer,
                                    assist: "",
                                    concededTeam:
                                      opponent?.id ||
                                      "",
                                  })
                                );
                              }}
                            >
                              <option value="">
                                Selecionar
                              </option>

                              {gamePlayers.map(
                                (
                                  gp
                                ) => (
                                  <option
                                    key={
                                      gp.id
                                    }
                                    value={
                                      gp.player_id
                                    }
                                  >
                                    {
                                      getPlayer(
                                        gp.player_id
                                      )
                                        ?.name
                                    }
                                  </option>
                                )
                              )}
                            </select>
                          </label>

                          <label>
                            <span>
                              Assistência{" "}
                              {goalForm.scorer &&
                                goalForm.concededTeam ===
                                  getGamePlayer(
                                    goalForm.scorer
                                  )?.pool_team_id
                                ? "(gol contra — sem assistência)"
                                : ""}
                            </span>

                            <select
                              value={
                                goalForm.assist
                              }
                              onChange={(
                                e
                              ) =>
                                setGoalForm(
                                  (
                                    current
                                  ) => ({
                                    ...current,
                                    assist:
                                      e.target.value,
                                  })
                                )
                              }
                            >
                              <option value="">
                                Sem assistência
                              </option>

                              {gamePlayers
                                .filter(
                                  (
                                    gp
                                  ) =>
                                    gp.player_id !==
                                      goalForm.scorer &&
                                    gp.pool_team_id ===
                                      getGamePlayer(
                                        goalForm.scorer
                                      )?.pool_team_id &&
                                    !!goalForm.scorer &&
                                    goalForm.concededTeam !==
                                      getGamePlayer(
                                        goalForm.scorer
                                      )?.pool_team_id
                                )
                                .map(
                                  (
                                    gp
                                  ) => (
                                    <option
                                      key={
                                        gp.id
                                      }
                                      value={
                                        gp.player_id
                                      }
                                    >
                                      {
                                        getPlayer(
                                          gp.player_id
                                        )
                                          ?.name
                                      }
                                    </option>
                                  )
                                )}
                            </select>
                          </label>

                          <label>
                            <span>
                              Time que sofreu
                              o gol
                            </span>
                            {goalForm.scorer &&
                              goalForm.concededTeam ===
                                getGamePlayer(
                                  goalForm.scorer
                                )?.pool_team_id && (
                              <small className="muted">
                                ⚠️ Gol contra
                              </small>
                            )}

                            <select
                              value={
                                goalForm.concededTeam
                              }
                              onChange={(
                                e
                              ) =>
                                setGoalForm(
                                  (
                                    current
                                  ) => ({
                                    ...current,
                                    assist:
                                      e.target.value ===
                                      getGamePlayer(
                                        goalForm.scorer
                                      )?.pool_team_id
                                        ? ""
                                        : current.assist,
                                    concededTeam:
                                      e.target.value,
                                  })
                                )
                              }
                            >
                              <option value="">
                                Selecionar
                              </option>

                              {activeTeams.map(
                                  (
                                    team
                                  ) => (
                                    <option
                                      key={
                                        team.id
                                      }
                                      value={
                                        team.id
                                      }
                                    >
                                      {
                                        team.name
                                      }
                                    </option>
                                  )
                                )}
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
                            <Target
                              size={17}
                            />

                            {savingGoal
                              ? "Salvando..."
                              : "Confirmar gol"}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* =======================================
                      JOGADORES DO JOGO
                  ======================================= */}

                  <div className="teams-grid">
                    {activeTeams.map(
                      (team) => {
                        const teamPlayers =
                          gamePlayers.filter(
                            (
                              player
                            ) =>
                              player.pool_team_id ===
                              team.id
                          );

                        const goalkeeper =
                          getGoalkeeper(
                            team.id
                          );

                        return (
                          <div
                            className="card team-card"
                            key={
                              team.id
                            }
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
                                  {
                                    team.name
                                  }
                                </h2>
                              </div>

                              <strong className="team-score">
                                {
                                  getTeamScore(
                                    team.id
                                  )
                                }
                              </strong>
                            </div>

                            <div className="team-players">
                              {teamPlayers.map(
                                (
                                  gp
                                ) => {
                                  const player =
                                    getPlayer(
                                      gp.player_id
                                    );

                                  if (
                                    !player
                                  ) {
                                    return null;
                                  }

                                  return (
                                    <div
                                      className="match-player"
                                      key={
                                        gp.id
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

                                      <div className="match-player-info">
                                        <b>
                                          {
                                            player.name
                                          }
                                        </b>

                                        <small>
                                          {gp.role ===
                                          "goalkeeper"
                                            ? "🧤 Goleiro"
                                            : `⚽ ${gp.goals} gols · 🎯 ${gp.assists} assist.`}
                                        </small>

                                        {gp.role ===
                                          "goalkeeper" && (
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
                                          gp.role ===
                                          "goalkeeper"
                                            ? "active"
                                            : ""
                                        }`}
                                        title="Definir como goleiro"
                                        onClick={() =>
                                          setGoalkeeper(
                                            gp.id,
                                            team.id
                                          )
                                        }
                                      >
                                        <Shield
                                          size={
                                            16
                                          }
                                        />
                                      </button>
                                    </div>
                                  );
                                }
                              )}
                            </div>

                            {goalkeeper && (
                              <div className="goalkeeper-label">
                                🧤 Goleiro:{" "}
                                <b>
                                  {
                                    getPlayer(
                                      goalkeeper.player_id
                                    )
                                      ?.name
                                  }
                                </b>
                              </div>
                            )}

                            <div className="muted">
                              {
                                teamPlayers.length
                              }{" "}
                              jogadores
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                </>
              )}

              {/* =========================================
                  PRÓXIMO JOGO
              ========================================= */}

              {currentGame &&
                currentGame.status ===
                  "finished" &&
                nextGameTeams.length ===
                  2 && (
                  <div className="card">
                    <div className="section-title">
                      <div>
                        <span className="badge">
                          PRÓXIMO
                        </span>

                        <h2>
                          <ArrowRight />
                          Jogo{" "}
                          {
                            currentGame.game_number +
                            1
                          }
                        </h2>

                        <p className="muted">
                          O próximo confronto
                          já está definido.
                        </p>
                      </div>
                    </div>

                    <div className="match-versus">
                      {nextGameTeams.map(
                        (
                          team,
                          index
                        ) => (
                          <div
                            className="versus-team"
                            key={
                              team.id
                            }
                          >
                            <span
                              className="team-color"
                              style={{
                                backgroundColor:
                                  team.color,
                              }}
                            />

                            <b>
                              {
                                team.name
                              }
                            </b>

                            {index ===
                              0 && (
                              <span className="versus">
                                ×
                              </span>
                            )}
                          </div>
                        )
                      )}
                    </div>

                    <div className="start-area">
                      <button
                        className="button start-button"
                        type="button"
                        onClick={
                          startNextGame
                        }
                        disabled={
                          startingNextGame
                        }
                      >
                        <Play
                          size={18}
                        />

                        {startingNextGame
                          ? "Preparando..."
                          : `Iniciar Jogo ${
                              currentGame.game_number +
                              1
                            }`}
                      </button>
                    </div>
                  </div>
                )}

              

              {/* =========================================
                  HISTÓRICO DOS JOGOS
              ========================================= */}

              <div className="card">
                <div className="section-title">
                  <div>
                    <h2>
                      <CalendarDays />
                      Jogos do racha
                    </h2>
                  </div>
                </div>

                <div className="stats">
                  {games.map(
                    (game) => (
                      <div
                        key={
                          game.id
                        }
                      >
                        <Trophy />

                        <b>
                          Jogo{" "}
                          {
                            game.game_number
                          }
                        </b>

                        <span>
                          {game.status ===
                          "finished"
                            ? "Finalizado"
                            : "Em andamento"}
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </main>
  );
}
