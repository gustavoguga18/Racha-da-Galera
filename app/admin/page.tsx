"use client";

import { useEffect, useMemo, useState } from "react";
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
  ArrowRightLeft,
  RotateCcw,
} from "lucide-react";

/* =====================================================
   TIPOS
===================================================== */

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
  concededTeam: string;
};

type TimerStatus = "idle" | "running" | "paused" | "finished";

/* =====================================================
   CONSTANTES
===================================================== */

const TEAM_COLORS = [
  "#2563eb",
  "#dc2626",
  "#16a34a",
  "#9333ea",
  "#ea580c",
  "#0891b2",
  "#db2777",
  "#ca8a04",
];

const DEFAULT_MINUTES = 10;

/* =====================================================
   COMPONENTE
===================================================== */

export default function Admin() {
  const supabase = createClient();

  /* =====================================================
     ESTADO GERAL
  ===================================================== */

  const [groups, setGroups] = useState<Group[]>([]);
  const [groupId, setGroupId] = useState("");

  const [players, setPlayers] = useState<Player[]>([]);

  const [newPlayer, setNewPlayer] = useState("");
  const [groupName, setGroupName] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadingPlayers, setLoadingPlayers] = useState(false);

  /* =====================================================
     RACHA
  ===================================================== */

  const [racha, setRacha] = useState<Racha | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [currentGame, setCurrentGame] = useState<Game | null>(null);

  const [teams, setTeams] = useState<Team[]>([]);
  const [gamePlayers, setGamePlayers] = useState<GamePlayer[]>([]);

  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [presentPlayers, setPresentPlayers] = useState<string[]>([]);

  const [playersPerTeam, setPlayersPerTeam] = useState("5");

  const [loadingRacha, setLoadingRacha] = useState(false);
  const [startingRacha, setStartingRacha] = useState(false);
  const [startingGame, setStartingGame] = useState(false);
  const [finishingGame, setFinishingGame] = useState(false);

  /* =====================================================
     GOL
  ===================================================== */

  const [showGoalForm, setShowGoalForm] = useState(false);

  const [goalForm, setGoalForm] = useState<GoalForm>({
    scorer: "",
    assist: "",
    concededTeam: "",
  });

  const [savingGoal, setSavingGoal] = useState(false);

  /* =====================================================
     TIMER
  ===================================================== */

  const [durationMinutes, setDurationMinutes] =
    useState(DEFAULT_MINUTES);

  const [timerStatus, setTimerStatus] =
    useState<TimerStatus>("idle");

  const [timerSeconds, setTimerSeconds] = useState(
    DEFAULT_MINUTES * 60
  );

  /* =====================================================
     CARREGAR GRUPOS
  ===================================================== */

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

  /* =====================================================
     CARREGAR JOGADORES
  ===================================================== */

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

  /* =====================================================
     DATA LOCAL
  ===================================================== */

  function getToday() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  /* =====================================================
     CARREGAR PRESENÇA
  ===================================================== */

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

    const rows = data || [];

    setAttendance(rows);

    setPresentPlayers(
      rows
        .filter((row: Attendance) => row.present)
        .map((row: Attendance) => row.player_id)
    );
  }

  /* =====================================================
     CARREGAR JOGO
  ===================================================== */

  async function loadGame(game: Game | null) {
    if (!game) {
      setCurrentGame(null);
      setTeams([]);
      setGamePlayers([]);
      return;
    }

    setCurrentGame(game);

    const { data: loadedTeams, error: teamsError } =
      await supabase
        .from("racha_teams")
        .select("*")
        .eq("game_id", game.id)
        .order("name");

    if (teamsError) {
      console.error("Erro ao carregar times:", teamsError);
    }

    const {
      data: loadedPlayers,
      error: playersError,
    } = await supabase
      .from("racha_game_players")
      .select("*")
      .eq("game_id", game.id);

    if (playersError) {
      console.error(
        "Erro ao carregar jogadores do jogo:",
        playersError
      );
    }

    setTeams(loadedTeams || []);
    setGamePlayers(loadedPlayers || []);

    resetTimerForGame(game.id);
  }

  /* =====================================================
     CARREGAR RACHA DE HOJE
  ===================================================== */

  async function loadTodayRacha(id: string) {
    if (!id) {
      setRacha(null);
      setGames([]);
      setCurrentGame(null);
      setTeams([]);
      setGamePlayers([]);
      return;
    }

    setLoadingRacha(true);

    const today = getToday();

    const { data: existingRacha, error: rachaError } =
      await supabase
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

    setPlayersPerTeam(
      String(existingRacha.players_per_team || 5)
    );

    await loadAttendance(existingRacha.id);

    const { data: loadedGames, error: gamesError } =
      await supabase
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

    const gameList = loadedGames || [];

    setGames(gameList);

    const openGame =
      gameList.find(
        (game: Game) => game.status === "open"
      ) || null;

    await loadGame(openGame);

    setLoadingRacha(false);
  }

  /* =====================================================
     LOAD INICIAL
  ===================================================== */

  useEffect(() => {
    loadGroups();
  }, []);

  /* =====================================================
     TROCA DE GRUPO
  ===================================================== */

  useEffect(() => {
    if (!groupId) return;

    loadPlayers(groupId);
    loadTodayRacha(groupId);
  }, [groupId]);

  /* =====================================================
     TIMER
  ===================================================== */

  function getTimerStorageKey(gameId: string) {
    return `racha-timer-${gameId}`;
  }

  function resetTimerForGame(gameId: string) {
    if (typeof window === "undefined") return;

    const key = getTimerStorageKey(gameId);
    const saved = localStorage.getItem(key);

    if (!saved) {
      setDurationMinutes(DEFAULT_MINUTES);
      setTimerSeconds(DEFAULT_MINUTES * 60);
      setTimerStatus("idle");
      return;
    }

    try {
      const parsed = JSON.parse(saved);

      const savedDuration =
        Number(parsed.durationMinutes) ||
        DEFAULT_MINUTES;

      const savedSeconds =
        Number(parsed.timerSeconds);

      const savedStatus =
        parsed.timerStatus || "idle";

      setDurationMinutes(savedDuration);
      setTimerSeconds(
        Number.isFinite(savedSeconds)
          ? savedSeconds
          : savedDuration * 60
      );
      setTimerStatus(savedStatus);
    } catch {
      setDurationMinutes(DEFAULT_MINUTES);
      setTimerSeconds(DEFAULT_MINUTES * 60);
      setTimerStatus("idle");
    }
  }

  function saveTimer(
    gameId: string,
    status: TimerStatus,
    seconds: number,
    minutes: number
  ) {
    if (typeof window === "undefined") return;

    localStorage.setItem(
      getTimerStorageKey(gameId),
      JSON.stringify({
        durationMinutes: minutes,
        timerSeconds: seconds,
        timerStatus: status,
      })
    );
  }

  function changeDuration(value: number) {
    if (timerStatus === "running") return;

    const safeValue = Math.max(
      1,
      Math.min(180, value)
    );

    setDurationMinutes(safeValue);

    if (
      timerStatus === "idle" ||
      timerStatus === "finished"
    ) {
      const seconds = safeValue * 60;

      setTimerSeconds(seconds);
      setTimerStatus("idle");

      if (currentGame) {
        saveTimer(
          currentGame.id,
          "idle",
          seconds,
          safeValue
        );
      }
    }
  }

  function startTimer() {
    if (!currentGame) return;

    let seconds = timerSeconds;

    if (timerStatus === "finished" || seconds <= 0) {
      seconds = durationMinutes * 60;
      setTimerSeconds(seconds);
    }

    setTimerStatus("running");

    saveTimer(
      currentGame.id,
      "running",
      seconds,
      durationMinutes
    );
  }

  function pauseTimer() {
    if (!currentGame) return;

    setTimerStatus("paused");

    saveTimer(
      currentGame.id,
      "paused",
      timerSeconds,
      durationMinutes
    );
  }

  function resumeTimer() {
    if (!currentGame) return;

    setTimerStatus("running");

    saveTimer(
      currentGame.id,
      "running",
      timerSeconds,
      durationMinutes
    );
  }

  function finishTimer() {
    if (!currentGame) return;

    setTimerStatus("finished");
    setTimerSeconds(0);

    saveTimer(
      currentGame.id,
      "finished",
      0,
      durationMinutes
    );
  }

  function restartTimer() {
    if (!currentGame) return;

    const seconds = durationMinutes * 60;

    setTimerSeconds(seconds);
    setTimerStatus("idle");

    saveTimer(
      currentGame.id,
      "idle",
      seconds,
      durationMinutes
    );
  }

  useEffect(() => {
    if (timerStatus !== "running") return;

    const interval = setInterval(() => {
      setTimerSeconds((current) => {
        if (current <= 1) {
          if (currentGame) {
            saveTimer(
              currentGame.id,
              "finished",
              0,
              durationMinutes
            );
          }

          setTimerStatus("finished");

          return 0;
        }

        const next = current - 1;

        if (currentGame) {
          saveTimer(
            currentGame.id,
            "running",
            next,
            durationMinutes
          );
        }

        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [
    timerStatus,
    currentGame,
    durationMinutes,
  ]);

  function formatTimer(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;

    return `${String(minutes).padStart(
      2,
      "0"
    )}:${String(secs).padStart(2, "0")}`;
  }

  /* =====================================================
     CRIAR GRUPO
  ===================================================== */

  async function addGroup(
    e: React.FormEvent
  ) {
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

  /* =====================================================
     ADICIONAR JOGADOR
  ===================================================== */

  async function addPlayer(
    e: React.FormEvent
  ) {
    e.preventDefault();

    const name = newPlayer.trim();

    if (!name || !groupId) return;

    const {
      data: createdPlayer,
      error,
    } = await supabase
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

    /* =================================================
       SE JÁ EXISTE RACHA ABERTO,
       ADICIONA AUTOMATICAMENTE À PRESENÇA
    ================================================= */

    if (racha && createdPlayer) {
      const { error: attendanceError } =
        await supabase
          .from("racha_attendance")
          .upsert(
            {
              racha_id: racha.id,
              player_id: createdPlayer.id,
              present: true,
            },
            {
              onConflict:
                "racha_id,player_id",
            }
          );

      if (attendanceError) {
        console.error(
          "Erro ao adicionar presença:",
          attendanceError
        );
      }

      await loadAttendance(racha.id);
    }
  }

  /* =====================================================
     PRESENÇA
  ===================================================== */

  async function togglePresent(
    playerId: string
  ) {
    if (!racha) {
      setPresentPlayers((current) => {
        if (current.includes(playerId)) {
          return current.filter(
            (id) => id !== playerId
          );
        }

        return [...current, playerId];
      });

      return;
    }

    const currentlyPresent =
      presentPlayers.includes(playerId);

    const newValue = !currentlyPresent;

    const { error } = await supabase
      .from("racha_attendance")
      .upsert(
        {
          racha_id: racha.id,
          player_id: playerId,
          present: newValue,
        },
        {
          onConflict:
            "racha_id,player_id",
        }
      );

    if (error) {
      console.error(
        "Erro ao alterar presença:",
        error
      );

      alert(
        "Não foi possível alterar a presença."
      );

      return;
    }

    await loadAttendance(racha.id);
  }

  /* =====================================================
     SORTEIO
  ===================================================== */

  function shufflePlayers(
    list: Player[]
  ) {
    const shuffled = [...list];

    for (
      let i = shuffled.length - 1;
      i > 0;
      i--
    ) {
      const j = Math.floor(
        Math.random() * (i + 1)
      );

      [
        shuffled[i],
        shuffled[j],
      ] = [
        shuffled[j],
        shuffled[i],
      ];
    }

    return shuffled;
  }

  /* =====================================================
     CRIAR TIMES PARA UM JOGO
  ===================================================== */

  async function createGame(
    rachaData: Racha,
    gameNumber: number
  ) {
    const selectedPlayers =
      players.filter((player) =>
        presentPlayers.includes(player.id)
      );

    if (selectedPlayers.length < 2) {
      alert(
        "É necessário ter pelo menos 2 jogadores presentes."
      );

      return null;
    }

    const perTeam = Math.max(
      1,
      Number(
        rachaData.players_per_team
      ) || 5
    );

    const numberOfTeams = Math.ceil(
      selectedPlayers.length / perTeam
    );

    const { data: newGame, error: gameError } =
      await supabase
        .from("racha_games")
        .insert({
          racha_id: rachaData.id,
          game_number: gameNumber,
          status: "open",
        })
        .select()
        .single();

    if (gameError || !newGame) {
      console.error(
        "Erro ao criar jogo:",
        gameError
      );

      alert(
        "Não foi possível criar o jogo."
      );

      return null;
    }

    /* =================================================
       CRIAR TIMES
    ================================================= */

    const teamRows = Array.from(
      { length: numberOfTeams },
      (_, index) => ({
        game_id: newGame.id,
        name: `Time ${index + 1}`,
        color:
          TEAM_COLORS[
            index % TEAM_COLORS.length
          ],
      })
    );

    const {
      data: newTeams,
      error: teamsError,
    } = await supabase
      .from("racha_teams")
      .insert(teamRows)
      .select();

    if (
      teamsError ||
      !newTeams ||
      newTeams.length === 0
    ) {
      console.error(
        "Erro ao criar times:",
        teamsError
      );

      await supabase
        .from("racha_games")
        .delete()
        .eq("id", newGame.id);

      alert(
        "Não foi possível criar os times."
      );

      return null;
    }

    /* =================================================
       SORTEAR JOGADORES
    ================================================= */

    const shuffled =
      shufflePlayers(selectedPlayers);

    const playerRows = shuffled.map(
      (player, index) => {
        const teamIndex =
          Math.floor(index / perTeam);

        const team =
          newTeams[teamIndex];

        return {
          game_id: newGame.id,
          team_id: team?.id || null,
          player_id: player.id,
          role: "field" as const,
        };
      }
    );

    const {
      data: createdPlayers,
      error: playerError,
    } = await supabase
      .from("racha_game_players")
      .insert(playerRows)
      .select();

    if (playerError) {
      console.error(
        "Erro ao registrar jogadores:",
        playerError
      );

      await supabase
        .from("racha_games")
        .delete()
        .eq("id", newGame.id);

      alert(
        "Não foi possível montar os times."
      );

      return null;
    }

    setGames((current) => [
      ...current,
      newGame,
    ]);

    setCurrentGame(newGame);
    setTeams(newTeams);
    setGamePlayers(
      createdPlayers || []
    );

    restartTimer();

    return newGame;
  }

  /* =====================================================
     INICIAR RACHA
  ===================================================== */

  async function startRacha() {
    if (!groupId) return;

    if (presentPlayers.length < 2) {
      alert(
        "Selecione pelo menos 2 jogadores."
      );

      return;
    }

    const perTeam = Number(
      playersPerTeam
    );

    if (
      !Number.isFinite(perTeam) ||
      perTeam < 1
    ) {
      alert(
        "Informe uma quantidade válida de jogadores por time."
      );

      return;
    }

    setStartingRacha(true);

    try {
      /* ===============================================
         CRIAR RACHA
      =============================================== */

      const {
        data: newRacha,
        error: rachaError,
      } = await supabase
        .from("rachas")
        .insert({
          group_id: groupId,
          played_on: getToday(),
          status: "open",
          players_per_team: perTeam,
        })
        .select()
        .single();

      if (rachaError || !newRacha) {
        console.error(
          "Erro ao criar racha:",
          rachaError
        );

        alert(
          "Não foi possível criar o racha."
        );

        return;
      }

      setRacha(newRacha);

      /* ===============================================
         REGISTRAR PRESENÇA
      =============================================== */

      const attendanceRows =
        presentPlayers.map(
          (playerId) => ({
            racha_id: newRacha.id,
            player_id: playerId,
            present: true,
          })
        );

      const {
        error: attendanceError,
      } = await supabase
        .from("racha_attendance")
        .insert(attendanceRows);

      if (attendanceError) {
        console.error(
          "Erro ao registrar presença:",
          attendanceError
        );
      }

      await loadAttendance(
        newRacha.id
      );

      /* ===============================================
         CRIAR PRIMEIRO JOGO
      =============================================== */

      await createGame(
        newRacha,
        1
      );

      await loadPlayers(groupId);
    } finally {
      setStartingRacha(false);
    }
  }

  /* =====================================================
     PRÓXIMO JOGO
  ===================================================== */

  async function startNextGame() {
    if (!racha) return;

    if (
      currentGame &&
      currentGame.status === "open"
    ) {
      alert(
        "Finalize o jogo atual antes de iniciar o próximo."
      );

      return;
    }

    if (presentPlayers.length < 2) {
      alert(
        "É necessário ter pelo menos 2 jogadores presentes."
      );

      return;
    }

    setStartingGame(true);

    try {
      const nextNumber =
        games.length > 0
          ? Math.max(
              ...games.map(
                (game) =>
                  game.game_number
              )
            ) + 1
          : 1;

      await createGame(
        racha,
        nextNumber
      );
    } finally {
      setStartingGame(false);
    }
  }

  /* =====================================================
     FINALIZAR JOGO
  ===================================================== */

  async function finishGame() {
    if (!currentGame) return;

    const confirmed = confirm(
      `Finalizar o jogo ${currentGame.game_number}?`
    );

    if (!confirmed) return;

    setFinishingGame(true);

    try {
      const { error } =
        await supabase
          .from("racha_games")
          .update({
            status: "finished",
          })
          .eq(
            "id",
            currentGame.id
          );

      if (error) {
        console.error(
          "Erro ao finalizar jogo:",
          error
        );

        alert(
          "Não foi possível finalizar o jogo."
        );

        return;
      }

      setTimerStatus("finished");

      setGames((current) =>
        current.map((game) =>
          game.id === currentGame.id
            ? {
                ...game,
                status: "finished",
              }
            : game
        )
      );

      setCurrentGame({
        ...currentGame,
        status: "finished",
      });

      await loadPlayers(groupId);
    } finally {
      setFinishingGame(false);
    }
  }

  /* =====================================================
     TROCAR JOGADOR DE TIME
  ===================================================== */

  async function movePlayer(
    gamePlayerId: string,
    newTeamId: string
  ) {
    if (!currentGame) return;

    const player =
      gamePlayers.find(
        (item) =>
          item.id === gamePlayerId
      );

    if (!player) return;

    if (
      player.team_id === newTeamId
    ) {
      return;
    }

    const { error } =
      await supabase
        .from("racha_game_players")
        .update({
          team_id: newTeamId,
        })
        .eq(
          "id",
          gamePlayerId
        );

    if (error) {
      console.error(
        "Erro ao trocar jogador de time:",
        error
      );

      alert(
        "Não foi possível trocar o jogador de time."
      );

      return;
    }

    setGamePlayers((current) =>
      current.map((item) =>
        item.id === gamePlayerId
          ? {
              ...item,
              team_id: newTeamId,
            }
          : item
      )
    );
  }

  /* =====================================================
     JOGADOR SAI DO JOGO
  ===================================================== */

  async function playerLeavesGame(
    gamePlayerId: string
  ) {
    const confirmed = confirm(
      "Marcar este jogador como fora deste jogo?"
    );

    if (!confirmed) return;

    const now =
      new Date().toISOString();

    const { error } =
      await supabase
        .from("racha_game_players")
        .update({
          left_at: now,
        })
        .eq(
          "id",
          gamePlayerId
        );

    if (error) {
      console.error(
        "Erro ao registrar saída:",
        error
      );

      return;
    }

    setGamePlayers((current) =>
      current.map((item) =>
        item.id === gamePlayerId
          ? {
              ...item,
              left_at: now,
            }
          : item
      )
    );
  }

  /* =====================================================
     DEFINIR GOLEIRO
  ===================================================== */

  async function setGoalkeeper(
    gamePlayerId: string,
    teamId: string
  ) {
    if (!currentGame) return;

    const currentGoalkeeper =
      gamePlayers.find(
        (player) =>
          player.team_id === teamId &&
          player.role === "goalkeeper"
      );

    /* ===============================================
       TIRAR GOLEIRO ATUAL
    =============================================== */

    if (
      currentGoalkeeper &&
      currentGoalkeeper.id !==
        gamePlayerId
    ) {
      const { error } =
        await supabase
          .from("racha_game_players")
          .update({
            role: "field",
          })
          .eq(
            "id",
            currentGoalkeeper.id
          );

      if (error) {
        console.error(
          "Erro ao retirar goleiro:",
          error
        );

        return;
      }
    }

    /* ===============================================
       DEFINIR NOVO GOLEIRO
    =============================================== */

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

    setGamePlayers((current) =>
      current.map((player) => {
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
          currentGoalkeeper &&
          player.id ===
            currentGoalkeeper.id
        ) {
          return {
            ...player,
            role: "field",
          };
        }

        return player;
      })
    );
  }

  /* =====================================================
     ABRIR GOL
  ===================================================== */

  function openGoalForm() {
    const firstOpponent =
      teams.find(
        (team) =>
          team.id !==
          getPlayerTeamId(
            goalForm.scorer
          )
      );

    setGoalForm({
      scorer: "",
      assist: "",
      concededTeam:
        firstOpponent?.id || "",
    });

    setShowGoalForm(true);
  }

  /* =====================================================
     ENCONTRAR JOGADOR
  ===================================================== */

  function getPlayer(
    playerId: string
  ) {
    return players.find(
      (player) =>
        player.id === playerId
    );
  }

  /* =====================================================
     ENCONTRAR JOGADOR DO JOGO
  ===================================================== */

  function getGamePlayer(
    playerId: string
  ) {
    return gamePlayers.find(
      (player) =>
        player.player_id === playerId
    );
  }

  /* =====================================================
     TIME DO JOGADOR
  ===================================================== */

  function getPlayerTeamId(
    playerId: string
  ) {
    return getGamePlayer(
      playerId
    )?.team_id || null;
  }

  function getPlayerTeam(
    playerId: string
  ) {
    const teamId =
      getPlayerTeamId(playerId);

    if (!teamId) return null;

    return (
      teams.find(
        (team) =>
          team.id === teamId
      ) || null
    );
  }

  /* =====================================================
     PLACAR DO TIME
  ===================================================== */

  function getTeamScore(
    teamId: string
  ) {
    return gamePlayers
      .filter(
        (player) =>
          player.team_id === teamId
      )
      .reduce(
        (total, player) =>
          total + player.goals,
        0
      );
  }

  /* =====================================================
     GOLEIRO DO TIME
  ===================================================== */

  function getGoalkeeper(
    teamId: string
  ) {
    return gamePlayers.find(
      (player) =>
        player.team_id === teamId &&
        player.role === "goalkeeper"
    );
  }

  /* =====================================================
     REGISTRAR GOL
  ===================================================== */

  async function registerGoal(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (!currentGame) return;

    if (!goalForm.scorer) {
      alert(
        "Selecione quem fez o gol."
      );

      return;
    }

    const scorer =
      getGamePlayer(
        goalForm.scorer
      );

    if (
      !scorer ||
      !scorer.team_id
    ) {
      alert(
        "Jogador inválido."
      );

      return;
    }

    if (
      goalForm.assist ===
      goalForm.scorer
    ) {
      alert(
        "O jogador não pode dar assistência para o próprio gol."
      );

      return;
    }

    if (
      teams.length > 1 &&
      !goalForm.concededTeam
    ) {
      alert(
        "Selecione o time que sofreu o gol."
      );

      return;
    }

    if (
      goalForm.concededTeam ===
      scorer.team_id
    ) {
      alert(
        "O time que marcou não pode ser o time que sofreu o gol."
      );

      return;
    }

    setSavingGoal(true);

    try {
      /* ===============================================
         GOL DO MARCADOR
      =============================================== */

      const newGoals =
        scorer.goals + 1;

      const {
        error: scorerError,
      } = await supabase
        .from("racha_game_players")
        .update({
          goals: newGoals,
        })
        .eq(
          "id",
          scorer.id
        );

      if (scorerError) {
        console.error(
          "Erro ao registrar gol:",
          scorerError
        );

        alert(
          "Não foi possível registrar o gol."
        );

        return;
      }

      /* ===============================================
         ASSISTÊNCIA
      =============================================== */

      if (goalForm.assist) {
        const assister =
          getGamePlayer(
            goalForm.assist
          );

        if (assister) {
          const {
            error: assistError,
          } = await supabase
            .from(
              "racha_game_players"
            )
            .update({
              assists:
                assister.assists + 1,
            })
            .eq(
              "id",
              assister.id
            );

          if (assistError) {
            console.error(
              "Erro ao registrar assistência:",
              assistError
            );
          }
        }
      }

      /* ===============================================
         GOL SOFRIDO PELO GOLEIRO
      =============================================== */

      if (goalForm.concededTeam) {
        const goalkeeper =
          getGoalkeeper(
            goalForm.concededTeam
          );

        if (goalkeeper) {
          const {
            error: goalkeeperError,
          } = await supabase
            .from(
              "racha_game_players"
            )
            .update({
              goals_conceded:
                goalkeeper.goals_conceded +
                1,
            })
            .eq(
              "id",
              goalkeeper.id
            );

          if (goalkeeperError) {
            console.error(
              "Erro ao registrar gol sofrido:",
              goalkeeperError
            );
          }
        }
      }

      /* ===============================================
         ATUALIZAR TELA
      =============================================== */

      const {
        data: refreshedPlayers,
      } = await supabase
        .from(
          "racha_game_players"
        )
        .select("*")
        .eq(
          "game_id",
          currentGame.id
        );

      setGamePlayers(
        refreshedPlayers || []
      );

      setShowGoalForm(false);

      setGoalForm({
        scorer: "",
        assist: "",
        concededTeam: "",
      });

      await loadPlayers(groupId);
    } finally {
      setSavingGoal(false);
    }
  }

  /* =====================================================
     FINALIZAR RACHA
  ===================================================== */

  async function finishRacha() {
    if (!racha) return;

    const confirmed = confirm(
      "Tem certeza que deseja finalizar o racha de hoje?"
    );

    if (!confirmed) return;

    /* ===============================================
       FINALIZAR JOGO ABERTO
    =============================================== */

    if (
      currentGame &&
      currentGame.status === "open"
    ) {
      const {
        error: gameError,
      } = await supabase
        .from("racha_games")
        .update({
          status: "finished",
        })
        .eq(
          "id",
          currentGame.id
        );

      if (gameError) {
        console.error(
          "Erro ao finalizar jogo:",
          gameError
        );

        alert(
          "Não foi possível finalizar o jogo atual."
        );

        return;
      }
    }

    /* ===============================================
       FINALIZAR RACHA
    =============================================== */

    const { error } =
      await supabase
        .from("rachas")
        .update({
          status: "finished",
        })
        .eq(
          "id",
          racha.id
        );

    if (error) {
      console.error(
        "Erro ao finalizar racha:",
        error
      );

      alert(
        "Não foi possível finalizar o racha."
      );

      return;
    }

    setRacha(null);
    setGames([]);
    setCurrentGame(null);
    setTeams([]);
    setGamePlayers([]);
    setAttendance([]);
    setPresentPlayers([]);

    setTimerStatus("idle");
    setTimerSeconds(
      DEFAULT_MINUTES * 60
    );

    await loadPlayers(groupId);
    await loadTodayRacha(groupId);
  }

  /* =====================================================
     LOGOUT
  ===================================================== */

  async function logout() {
    await supabase.auth.signOut();

    location.href =
      "/admin/login";
  }

  /* =====================================================
     JOGADORES PRESENTES
  ===================================================== */

  const presentPlayerObjects =
    useMemo(() => {
      return players.filter(
        (player) =>
          presentPlayers.includes(
            player.id
          )
      );
    }, [
      players,
      presentPlayers,
    ]);

  /* =====================================================
     ARILHEIRO DO JOGO
  ===================================================== */

  const topScorer = useMemo(() => {
    if (!gamePlayers.length)
      return null;

    const sorted = [
      ...gamePlayers,
    ].sort(
      (a, b) =>
        b.goals - a.goals
    );

    const top = sorted[0];

    if (!top || top.goals === 0)
      return null;

    return {
      player: getPlayer(
        top.player_id
      ),
      goals: top.goals,
    };
  }, [
    gamePlayers,
    players,
  ]);

  /* =====================================================
     GARÇOM DO JOGO
  ===================================================== */

  const topAssist = useMemo(() => {
    if (!gamePlayers.length)
      return null;

    const sorted = [
      ...gamePlayers,
    ].sort(
      (a, b) =>
        b.assists - a.assists
    );

    const top = sorted[0];

    if (
      !top ||
      top.assists === 0
    ) {
      return null;
    }

    return {
      player: getPlayer(
        top.player_id
      ),
      assists: top.assists,
    };
  }, [
    gamePlayers,
    players,
  ]);

  /* =====================================================
     LOADING
  ===================================================== */

  if (loading) {
    return (
      <main className="page">
        <div className="card">
          Carregando...
        </div>
      </main>
    );
  }

  /* =====================================================
     INTERFACE
  ===================================================== */

  return (
    <main className="page">
      {/* =================================================
          HEADER
      ================================================= */}

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

      {/* =================================================
          GRUPO
      ================================================= */}

      <section className="toolbar">
        <select
          value={groupId}
          onChange={(e) =>
            setGroupId(
              e.target.value
            )
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

      {/* =================================================
          MENU
      ================================================= */}

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

      {/* =================================================
          ADICIONAR JOGADOR
          FICA SEMPRE VISÍVEL
      ================================================= */}

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
            disabled={
              !newPlayer.trim()
            }
          >
            <Plus size={17} />
            Adicionar jogador
          </button>
        </form>

        {racha && (
          <p className="muted">
            O jogador será adicionado
            automaticamente como
            presente no racha de hoje.
          </p>
        )}
      </div>

      {/* =================================================
          RACHA
      ================================================= */}

      <section className="racha-area">
        {loadingRacha ? (
          <div className="card">
            <p className="muted">
              Carregando racha de hoje...
            </p>
          </div>
        ) : !racha ? (
          <>
            {/* ===========================================
                PRÉ-RACHA
            =========================================== */}

            <div className="card">
              <div className="section-title">
                <div>
                  <h2>
                    <CalendarDays />
                    Racha de hoje
                  </h2>

                  <p className="muted">
                    Selecione quem está
                    presente e defina
                    quantos jogadores
                    terão em cada time.
                  </p>
                </div>

                <span className="present-count">
                  {presentPlayers.length}{" "}
                  presentes
                </span>
              </div>

              {/* =========================================
                  JOGADORES POR TIME
              ========================================= */}

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
                    <option value="1">
                      1 jogador
                    </option>

                    <option value="2">
                      2 jogadores
                    </option>

                    <option value="3">
                      3 jogadores
                    </option>

                    <option value="4">
                      4 jogadores
                    </option>

                    <option value="5">
                      5 jogadores
                    </option>

                    <option value="6">
                      6 jogadores
                    </option>

                    <option value="7">
                      7 jogadores
                    </option>

                    <option value="8">
                      8 jogadores
                    </option>

                    <option value="9">
                      9 jogadores
                    </option>

                    <option value="10">
                      10 jogadores
                    </option>

                    <option value="11">
                      11 jogadores
                    </option>
                  </select>
                </label>
              </div>

              {/* =========================================
                  PREVISÃO DOS TIMES
              ========================================= */}

              {presentPlayers.length >
                0 && (
                <div className="muted">
                  Com{" "}
                  <b>
                    {presentPlayers.length}
                  </b>{" "}
                  jogadores e{" "}
                  <b>
                    {Number(
                      playersPerTeam
                    )}
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
                </div>
              )}

              {/* =========================================
                  PRESENÇA
              ========================================= */}

              {players.length === 0 ? (
                <div className="empty-box">
                  <Users size={32} />

                  <b>
                    Nenhum jogador
                    cadastrado
                  </b>

                  <span>
                    Adicione os jogadores
                    acima antes de iniciar
                    o racha.
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
          </>
        ) : (
          <>
            {/* =================================================
                CABEÇALHO DO RACHA
            ================================================= */}

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
                    jogadores presentes ·{" "}
                    {games.length}{" "}
                    {games.length === 1
                      ? "jogo"
                      : "jogos"}
                  </p>
                </div>

                <button
                  className="finish-button"
                  type="button"
                  onClick={
                    finishRacha
                  }
                >
                  <CheckCircle2
                    size={17}
                  />
                  Finalizar racha
                </button>
              </div>
            </div>

            {/* =================================================
                PRESENÇA / JOGADORES DO RACHA
            ================================================= */}

            <div className="card">
              <div className="section-title">
                <div>
                  <h2>
                    <Users />
                    Jogadores presentes
                  </h2>

                  <p className="muted">
                    Adicione ou retire
                    jogadores do racha.
                  </p>
                </div>

                <span className="present-count">
                  {
                    presentPlayers.length
                  }{" "}
                  presentes
                </span>
              </div>

              <div className="attendance-list">
                {players.map(
                  (player) => {
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
            </div>

            {/* =================================================
                HISTÓRICO DE JOGOS DO RACHA
            ================================================= */}

            <div className="card">
              <div className="section-title">
                <div>
                  <h2>
                    <Trophy />
                    Jogos do racha
                  </h2>

                  <p className="muted">
                    Cada jogo mantém suas
                    próprias equipes e
                    estatísticas.
                  </p>
                </div>
              </div>

              <div className="stats">
                {games.map(
                  (game) => (
                    <div
                      key={game.id}
                    >
                      <b>
                        Jogo{" "}
                        {
                          game.game_number
                        }
                      </b>

                      <span>
                        {game.status ===
                        "open"
                          ? "Em andamento"
                          : "Finalizado"}
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* =================================================
                JOGO ATUAL
            ================================================= */}

            {currentGame ? (
              <>
                {/* =============================================
                    TIMER
                ============================================= */}

                <div className="card">
                  <div className="section-title">
                    <div>
                      <h2>
                        <Clock />
                        Jogo{" "}
                        {
                          currentGame.game_number
                        }
                      </h2>

                      <p className="muted">
                        Configure o tempo
                        deste jogo.
                      </p>
                    </div>

                    <strong
                      style={{
                        fontSize:
                          "2.5rem",
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
                        Duração do jogo
                        (minutos)
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
                              e.target
                                .value
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
                      ⏱️ Tempo encerrado.
                      Agora você pode
                      finalizar o jogo.
                    </p>
                  )}
                </div>

                {/* =============================================
                    PLACAR
                ============================================= */}

                <div className="score-card">
                  <div className="live-label">
                    <span className="live-dot" />

                    {currentGame.status ===
                    "open"
                      ? "JOGO EM ANDAMENTO"
                      : "JOGO FINALIZADO"}
                  </div>

                  <div className="scoreboard">
                    {teams.map(
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
                            {getTeamScore(
                              team.id
                            )}
                          </strong>
                        </div>
                      )
                    )}
                  </div>

                  <div className="score-actions">
                    {currentGame.status ===
                      "open" && (
                      <>
                        <button
                          className="button goal-button"
                          type="button"
                          onClick={
                            openGoalForm
                          }
                        >
                          <Plus
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
                      </>
                    )}
                  </div>
                </div>

                {/* =============================================
                    REGISTRAR GOL
                ============================================= */}

                {showGoalForm && (
                  <div className="card goal-form-card">
                    <div className="section-title">
                      <div>
                        <h2>
                          <Target />
                          Registrar gol
                        </h2>

                        <p className="muted">
                          Informe quem marcou,
                          quem deu a
                          assistência e qual
                          time sofreu o gol.
                        </p>
                      </div>
                    </div>

                    <form
                      onSubmit={
                        registerGoal
                      }
                    >
                      <div className="form-grid">
                        {/* ===================================
                            MARCADOR
                        =================================== */}

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
                              const scorerId =
                                e.target
                                  .value;

                              const scorerTeam =
                                getPlayerTeamId(
                                  scorerId
                                );

                              const firstOpponent =
                                teams.find(
                                  (
                                    team
                                  ) =>
                                    team.id !==
                                    scorerTeam
                                );

                              setGoalForm(
                                (
                                  current
                                ) => ({
                                  ...current,
                                  scorer:
                                    scorerId,
                                  concededTeam:
                                    firstOpponent?.id ||
                                    "",
                                })
                              );
                            }}
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

                                if (
                                  !player
                                )
                                  return null;

                                const team =
                                  getPlayerTeam(
                                    player.id
                                  );

                                return (
                                  <option
                                    key={
                                      gp.id
                                    }
                                    value={
                                      player.id
                                    }
                                  >
                                    {
                                      player.name
                                    }{" "}
                                    —{" "}
                                    {
                                      team?.name
                                    }
                                  </option>
                                );
                              }
                            )}
                          </select>
                        </label>

                        {/* ===================================
                            ASSISTÊNCIA
                        =================================== */}

                        <label>
                          <span>
                            Assistência
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
                                (
                                  gp
                                ) =>
                                  gp.player_id !==
                                  goalForm.scorer
                              )
                              .map(
                                (
                                  gp
                                ) => {
                                  const player =
                                    getPlayer(
                                      gp.player_id
                                    );

                                  if (
                                    !player
                                  )
                                    return null;

                                  return (
                                    <option
                                      key={
                                        gp.id
                                      }
                                      value={
                                        player.id
                                      }
                                    >
                                      {
                                        player.name
                                      }
                                    </option>
                                  );
                                }
                              )}
                          </select>
                        </label>

                        {/* ===================================
                            TIME QUE SOFREU
                        =================================== */}

                        <label>
                          <span>
                            Time que sofreu o gol
                          </span>

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
                                  concededTeam:
                                    e.target
                                      .value,
                                })
                              )
                            }
                          >
                            <option value="">
                              Selecionar time
                            </option>

                            {teams
                              .filter(
                                (
                                  team
                                ) =>
                                  team.id !==
                                  getPlayerTeamId(
                                    goalForm.scorer
                                  )
                              )
                              .map(
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
                          onClick={() => {
                            setShowGoalForm(
                              false
                            );

                            setGoalForm(
                              {
                                scorer:
                                  "",
                                assist:
                                  "",
                                concededTeam:
                                  "",
                              }
                            );
                          }}
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

                {/* =============================================
                    TIMES
                ============================================= */}

                <div className="teams-grid">
                  {teams.map(
                    (team) => {
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
                              {getTeamScore(
                                team.id
                              )}
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
                                )
                                  return null;

                                const isGoalkeeper =
                                  gp.role ===
                                  "goalkeeper";

                                return (
                                  <div
                                    className="match-player"
                                    key={
                                      gp.id
                                    }
                                    style={{
                                      opacity:
                                        gp.left_at
                                          ? 0.5
                                          : 1,
                                    }}
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

                                      {gp.left_at && (
                                        <small>
                                          Saiu do jogo
                                        </small>
                                      )}
                                    </div>

                                    {/* =================================
                                        TROCAR TIME
                                    ================================= */}

                                    {currentGame.status ===
                                      "open" && (
                                      <select
                                        value={
                                          gp.team_id ||
                                          ""
                                        }
                                        title="Trocar de time"
                                        onChange={(
                                          e
                                        ) =>
                                          movePlayer(
                                            gp.id,
                                            e
                                              .target
                                              .value
                                          )
                                        }
                                      >
                                        {teams.map(
                                          (
                                            targetTeam
                                          ) => (
                                            <option
                                              key={
                                                targetTeam.id
                                              }
                                              value={
                                                targetTeam.id
                                              }
                                            >
                                              {
                                                targetTeam.name
                                              }
                                            </option>
                                          )
                                        )}
                                      </select>
                                    )}

                                    {/* =================================
                                        GOLEIRO
                                    ================================= */}

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

                                    {/* =================================
                                        SAIR DO JOGO
                                    ================================= */}

                                    {currentGame.status ===
                                      "open" &&
                                      !gp.left_at && (
                                        <button
                                          type="button"
                                          className="ghost"
                                          title="Marcar saída"
                                          onClick={() =>
                                            playerLeavesGame(
                                              gp.id
                                            )
                                          }
                                        >
                                          Sair
                                        </button>
                                      )}
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

                {/* =============================================
                    RESUMO DO JOGO
                ============================================= */}

                <div className="stats">
                  <div>
                    <Target />

                    <b>
                      Artilheiro
                    </b>

                    <span>
                      {topScorer
                        ? `${topScorer.player?.name} — ${topScorer.goals} gol${
                            topScorer.goals !==
                            1
                              ? "s"
                              : ""
                          }`
                        : "Nenhum gol"}
                    </span>
                  </div>

                  <div>
                    <Trophy />

                    <b>
                      Garçom
                    </b>

                    <span>
                      {topAssist
                        ? `${topAssist.player?.name} — ${topAssist.assists} assist.`
                        : "Nenhuma assistência"}
                    </span>
                  </div>
                </div>

                {/* =============================================
                    PRÓXIMO JOGO
                ============================================= */}

                {currentGame.status ===
                  "finished" && (
                  <div className="card">
                    <div className="section-title">
                      <div>
                        <h2>
                          <ArrowRightLeft />
                          Próximo jogo
                        </h2>

                        <p className="muted">
                          O jogo anterior foi
                          finalizado. Os
                          jogadores presentes
                          serão sorteados
                          novamente.
                        </p>
                      </div>
                    </div>

                    <button
                      className="button"
                      type="button"
                      onClick={
                        startNextGame
                      }
                      disabled={
                        startingGame
                      }
                    >
                      <Shuffle
                        size={18}
                      />

                      {startingGame
                        ? "Sorteando..."
                        : "Sortear times e iniciar próximo jogo"}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="card">
                <div className="empty-box">
                  <Trophy size={32} />

                  <b>
                    Nenhum jogo aberto
                  </b>

                  <span>
                    Finalize o jogo anterior
                    ou inicie um novo jogo.
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
                        2
                    }
                  >
                    <Shuffle
                      size={18}
                    />
                    Iniciar jogo
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
