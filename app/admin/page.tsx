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
  Pause,
  Square,
  Clock,
  ArrowRightLeft,
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
  duration_minutes: number;
  timer_elapsed_seconds: number;
  timer_started_at: string | null;
  timer_status:
    | "stopped"
    | "running"
    | "paused"
    | "finished";
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

const TEAM_COLORS = [
  "#2563eb",
  "#dc2626",
  "#16a34a",
  "#eab308",
  "#9333ea",
  "#f97316",
  "#0891b2",
  "#db2777",
];

export default function Admin() {
  const supabase = createClient();

  // =========================================================
  // GERAL
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
  const [currentGame, setCurrentGame] =
    useState<Game | null>(null);

  const [teams, setTeams] = useState<Team[]>([]);
  const [gamePlayers, setGamePlayers] = useState<
    GamePlayer[]
  >([]);

  const [presentPlayers, setPresentPlayers] =
    useState<string[]>([]);

  const [playersPerTeam, setPlayersPerTeam] =
    useState(5);

  // duração do próximo jogo
  const [gameDuration, setGameDuration] =
    useState(10);

  const [startingRacha, setStartingRacha] =
    useState(false);

  const [startingGame, setStartingGame] =
    useState(false);

  const [finishingGame, setFinishingGame] =
    useState(false);

  const [finishingRacha, setFinishingRacha] =
    useState(false);

  // =========================================================
  // CRONÔMETRO
  // =========================================================

  const [timerSeconds, setTimerSeconds] =
    useState(0);

  // =========================================================
  // GOL
  // =========================================================

  const [showGoalForm, setShowGoalForm] =
    useState(false);

  const [goalForm, setGoalForm] =
    useState<GoalForm>({
      scorer: "",
      assist: "",
    });

  const [savingGoal, setSavingGoal] =
    useState(false);

  // =========================================================
  // DATA
  // =========================================================

  function getToday() {
    const now = new Date();

    return `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}-${String(
      now.getDate()
    ).padStart(2, "0")}`;
  }

  // =========================================================
  // GRUPOS
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
      console.error(error);
      setGroups([]);
      setLoading(false);
      return;
    }

    setGroups(data || []);

    if (!groupId && data && data.length > 0) {
      setGroupId(data[0].id);
    }

    setLoading(false);
  }

  // =========================================================
  // JOGADORES
  // =========================================================

  async function loadPlayers(id: string) {
    if (!id) return;

    setLoadingPlayers(true);

    const { data, error } = await supabase
      .from("player_overalls")
      .select("*")
      .eq("group_id", id)
      .order("overall", {
        ascending: false,
      });

    if (error) {
      console.error(error);
      setPlayers([]);
    } else {
      setPlayers(data || []);
    }

    setLoadingPlayers(false);
  }

  // =========================================================
  // RACHA DE HOJE
  // =========================================================

  async function loadTodayRacha(id: string) {
    if (!id) return;

    setLoadingRacha(true);

    const { data: existingRacha, error } =
      await supabase
        .from("rachas")
        .select("*")
        .eq("group_id", id)
        .eq("played_on", getToday())
        .eq("status", "open")
        .order("created_at", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

    if (error) {
      console.error(error);
      setLoadingRacha(false);
      return;
    }

    if (!existingRacha) {
      setRacha(null);
      setGames([]);
      setCurrentGame(null);
      setTeams([]);
      setGamePlayers([]);
      setPresentPlayers([]);
      setTimerSeconds(0);

      setLoadingRacha(false);
      return;
    }

    setRacha(existingRacha);

    setPlayersPerTeam(
      existingRacha.players_per_team
    );

    // =======================================================
    // PRESENÇA
    // =======================================================

    const { data: attendance } =
      await supabase
        .from("racha_attendance")
        .select("*")
        .eq("racha_id", existingRacha.id);

    const present =
      (attendance || [])
        .filter(
          (item: Attendance) =>
            item.present
        )
        .map(
          (item: Attendance) =>
            item.player_id
        );

    setPresentPlayers(present);

    // =======================================================
    // JOGOS
    // =======================================================

    const { data: loadedGames } =
      await supabase
        .from("racha_games")
        .select("*")
        .eq(
          "racha_id",
          existingRacha.id
        )
        .order("game_number", {
          ascending: true,
        });

    const gameData =
      loadedGames || [];

    setGames(gameData);

    const openGame =
      gameData.find(
        (game: Game) =>
          game.status === "open"
      ) || null;

    if (!openGame) {
      setCurrentGame(null);
      setTeams([]);
      setGamePlayers([]);
      setTimerSeconds(0);

      setLoadingRacha(false);
      return;
    }

    setCurrentGame(openGame);

    // =======================================================
    // TIMER
    // =======================================================

    const elapsed =
      calculateTimerSeconds(openGame);

    setTimerSeconds(elapsed);

    // =======================================================
    // TIMES
    // =======================================================

    const { data: loadedTeams } =
      await supabase
        .from("racha_teams")
        .select("*")
        .eq(
          "game_id",
          openGame.id
        );

    setTeams(loadedTeams || []);

    // =======================================================
    // JOGADORES
    // =======================================================

    const { data: loadedGamePlayers } =
      await supabase
        .from("racha_game_players")
        .select("*")
        .eq(
          "game_id",
          openGame.id
        );

    setGamePlayers(
      loadedGamePlayers || []
    );

    setLoadingRacha(false);
  }

  // =========================================================
  // LOAD INICIAL
  // =========================================================

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    if (!groupId) return;

    loadPlayers(groupId);
    loadTodayRacha(groupId);
  }, [groupId]);

  // =========================================================
  // CRONÔMETRO
  // =========================================================

  function calculateTimerSeconds(
    game: Game
  ) {
    if (
      game.timer_status !==
        "running" ||
      !game.timer_started_at
    ) {
      return game.timer_elapsed_seconds;
    }

    const started =
      new Date(
        game.timer_started_at
      ).getTime();

    const now =
      Date.now();

    const extra = Math.floor(
      (now - started) / 1000
    );

    return Math.min(
      game.duration_minutes * 60,
      game.timer_elapsed_seconds +
        extra
    );
  }

  useEffect(() => {
    if (
      !currentGame ||
      currentGame.timer_status !==
        "running"
    ) {
      return;
    }

    const interval =
      setInterval(() => {
        const seconds =
          calculateTimerSeconds(
            currentGame
          );

        setTimerSeconds(seconds);

        if (
          seconds >=
          currentGame.duration_minutes *
            60
        ) {
          finishTimerAutomatically();
        }
      }, 1000);

    return () =>
      clearInterval(interval);
  }, [currentGame]);

  // =========================================================
  // FORMATAR TIMER
  // =========================================================

  function formatTime(seconds: number) {
    const minutes =
      Math.floor(seconds / 60);

    const secs =
      seconds % 60;

    return `${String(
      minutes
    ).padStart(2, "0")}:${String(
      secs
    ).padStart(2, "0")}`;
  }

  // =========================================================
  // INICIAR TIMER
  // =========================================================

  async function startTimer() {
    if (!currentGame) return;

    const elapsed =
      timerSeconds;

    if (
      elapsed >=
      currentGame.duration_minutes *
        60
    ) {
      return;
    }

    const { error } =
      await supabase
        .from("racha_games")
        .update({
          timer_status:
            "running",
          timer_started_at:
            new Date().toISOString(),
          timer_elapsed_seconds:
            elapsed,
        })
        .eq(
          "id",
          currentGame.id
        );

    if (error) {
      console.error(error);
      alert(
        "Não foi possível iniciar o cronômetro."
      );
      return;
    }

    setCurrentGame({
      ...currentGame,
      timer_status:
        "running",
      timer_started_at:
        new Date().toISOString(),
      timer_elapsed_seconds:
        elapsed,
    });
  }

  // =========================================================
  // PAUSAR TIMER
  // =========================================================

  async function pauseTimer() {
    if (!currentGame) return;

    const elapsed =
      calculateTimerSeconds(
        currentGame
      );

    const { error } =
      await supabase
        .from("racha_games")
        .update({
          timer_status:
            "paused",
          timer_started_at:
            null,
          timer_elapsed_seconds:
            elapsed,
        })
        .eq(
          "id",
          currentGame.id
        );

    if (error) {
      console.error(error);
      return;
    }

    setTimerSeconds(elapsed);

    setCurrentGame({
      ...currentGame,
      timer_status:
        "paused",
      timer_started_at:
        null,
      timer_elapsed_seconds:
        elapsed,
    });
  }

  // =========================================================
  // FINALIZAR TIMER
  // =========================================================

  async function finishTimer() {
    if (!currentGame) return;

    const confirmed =
      confirm(
        "Deseja finalizar o tempo desta partida?"
      );

    if (!confirmed) return;

    const elapsed =
      calculateTimerSeconds(
        currentGame
      );

    const { error } =
      await supabase
        .from("racha_games")
        .update({
          timer_status:
            "finished",
          timer_started_at:
            null,
          timer_elapsed_seconds:
            Math.min(
              elapsed,
              currentGame.duration_minutes *
                60
            ),
        })
        .eq(
          "id",
          currentGame.id
        );

    if (error) {
      console.error(error);
      return;
    }

    const finalSeconds =
      Math.min(
        elapsed,
        currentGame.duration_minutes *
          60
      );

    setTimerSeconds(
      finalSeconds
    );

    setCurrentGame({
      ...currentGame,
      timer_status:
        "finished",
      timer_started_at:
        null,
      timer_elapsed_seconds:
        finalSeconds,
    });
  }

  // =========================================================
  // FINALIZAR AUTOMATICAMENTE
  // =========================================================

  async function finishTimerAutomatically() {
    if (!currentGame) return;

    if (
      currentGame.timer_status !==
      "running"
    ) {
      return;
    }

    const total =
      currentGame.duration_minutes *
      60;

    await supabase
      .from("racha_games")
      .update({
        timer_status:
          "finished",
        timer_started_at:
          null,
        timer_elapsed_seconds:
          total,
      })
      .eq(
        "id",
        currentGame.id
      );

    setTimerSeconds(total);

    setCurrentGame({
      ...currentGame,
      timer_status:
        "finished",
      timer_started_at:
        null,
      timer_elapsed_seconds:
        total,
    });
  }

  // =========================================================
  // CRIAR GRUPO
  // =========================================================

  async function addGroup(
    e: React.FormEvent
  ) {
    e.preventDefault();

    const name =
      groupName.trim();

    if (!name) return;

    const {
      data: { user },
    } =
      await supabase.auth.getUser();

    if (!user) return;

    const { data, error } =
      await supabase
        .from("groups")
        .insert({
          name,
          owner_id:
            user.id,
        })
        .select()
        .single();

    if (error) {
      alert(
        "Não foi possível criar o grupo."
      );
      return;
    }

    setGroupName("");

    await loadGroups();

    if (data) {
      setGroupId(data.id);
    }
  }

  // =========================================================
  // ADICIONAR JOGADOR
  // =========================================================

  async function addPlayer(
    e: React.FormEvent
  ) {
    e.preventDefault();

    const name =
      newPlayer.trim();

    if (
      !name ||
      !groupId
    ) {
      return;
    }

    const { error } =
      await supabase
        .from("players")
        .insert({
          group_id:
            groupId,
          name,
        });

    if (error) {
      alert(
        "Não foi possível adicionar o jogador."
      );
      return;
    }

    setNewPlayer("");

    await loadPlayers(
      groupId
    );
  }

  // =========================================================
  // PRESENÇA
  // =========================================================

  function togglePresent(
    playerId: string
  ) {
    if (racha) return;

    setPresentPlayers(
      (current) => {
        if (
          current.includes(
            playerId
          )
        ) {
          return current.filter(
            (id) =>
              id !== playerId
          );
        }

        return [
          ...current,
          playerId,
        ];
      }
    );
  }

  // =========================================================
  // SORTEIO
  // =========================================================

  function shufflePlayers(
    list: Player[]
  ) {
    const result =
      [...list];

    for (
      let i =
        result.length - 1;
      i > 0;
      i--
    ) {
      const j =
        Math.floor(
          Math.random() *
            (i + 1)
        );

      [
        result[i],
        result[j],
      ] = [
        result[j],
        result[i],
      ];
    }

    return result;
  }

  // =========================================================
  // INICIAR RACHA
  // =========================================================

  async function startRacha() {
    if (!groupId) return;

    if (
      presentPlayers.length <
      2
    ) {
      alert(
        "É necessário ter pelo menos 2 jogadores."
      );
      return;
    }

    setStartingRacha(
      true
    );

    try {
      const { data: newRacha, error } =
        await supabase
          .from("rachas")
          .insert({
            group_id:
              groupId,
            played_on:
              getToday(),
            status:
              "open",
            players_per_team:
              playersPerTeam,
          })
          .select()
          .single();

      if (
        error ||
        !newRacha
      ) {
        console.error(error);

        alert(
          "Não foi possível criar o racha."
        );

        return;
      }

      const attendanceRows =
        presentPlayers.map(
          (playerId) => ({
            racha_id:
              newRacha.id,
            player_id:
              playerId,
            present: true,
          })
        );

      const {
        error:
          attendanceError,
      } =
        await supabase
          .from(
            "racha_attendance"
          )
          .insert(
            attendanceRows
          );

      if (
        attendanceError
      ) {
        console.error(
          attendanceError
        );

        await supabase
          .from("rachas")
          .delete()
          .eq(
            "id",
            newRacha.id
          );

        alert(
          "Não foi possível registrar a presença."
        );

        return;
      }

      setRacha(
        newRacha
      );

      await createGame(
        newRacha.id,
        1,
        presentPlayers
      );
    } finally {
      setStartingRacha(
        false
      );
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
    if (
      playerIds.length <
      2
    ) {
      alert(
        "São necessários pelo menos 2 jogadores."
      );
      return false;
    }

    setStartingGame(
      true
    );

    try {
      const { data: newGame, error } =
        await supabase
          .from(
            "racha_games"
          )
          .insert({
            racha_id:
              rachaId,
            game_number:
              gameNumber,
            status:
              "open",
            duration_minutes:
              gameDuration,
            timer_elapsed_seconds:
              0,
            timer_status:
              "stopped",
          })
          .select()
          .single();

      if (
        error ||
        !newGame
      ) {
        console.error(error);

        alert(
          "Não foi possível criar o jogo."
        );

        return false;
      }

      // =====================================================
      // QUANTIDADE DE TIMES
      // =====================================================

      const numberOfTeams =
        Math.ceil(
          playerIds.length /
            playersPerTeam
        );

      const teamRows =
        Array.from(
          {
            length:
              numberOfTeams,
          },
          (_, index) => ({
            game_id:
              newGame.id,
            name:
              `Time ${index + 1}`,
            color:
              TEAM_COLORS[
                index %
                  TEAM_COLORS.length
              ],
          })
        );

      const {
        data: newTeams,
        error:
          teamsError,
      } =
        await supabase
          .from(
            "racha_teams"
          )
          .insert(
            teamRows
          )
          .select();

      if (
        teamsError ||
        !newTeams
      ) {
        console.error(
          teamsError
        );

        await supabase
          .from(
            "racha_games"
          )
          .delete()
          .eq(
            "id",
            newGame.id
          );

        alert(
          "Não foi possível criar os times."
        );

        return false;
      }

      // =====================================================
      // SORTEAR TODOS
      // =====================================================

      const selected =
        players.filter(
          (player) =>
            playerIds.includes(
              player.id
            )
        );

      const shuffled =
        shufflePlayers(
          selected
        );

      const gamePlayerRows =
        shuffled.map(
          (
            player,
            index
          ) => {
            const teamIndex =
              Math.floor(
                index /
                  playersPerTeam
              );

            const team =
              newTeams[
                teamIndex
              ];

            return {
              game_id:
                newGame.id,
              team_id:
                team.id,
              player_id:
                player.id,
              role:
                "field" as const,
            };
          }
        );

      const {
        data:
          createdPlayers,
        error:
          playersError,
      } =
        await supabase
          .from(
            "racha_game_players"
          )
          .insert(
            gamePlayerRows
          )
          .select();

      if (
        playersError
      ) {
        console.error(
          playersError
        );

        await supabase
          .from(
            "racha_games"
          )
          .delete()
          .eq(
            "id",
            newGame.id
          );

        alert(
          "Não foi possível montar os times."
        );

        return false;
      }

      setCurrentGame(
        newGame
      );

      setGames(
        (current) => [
          ...current,
          newGame,
        ]
      );

      setTeams(
        newTeams
      );

      setGamePlayers(
        createdPlayers ||
          []
      );

      setTimerSeconds(0);

      return true;
    } finally {
      setStartingGame(
        false
      );
    }
  }

  // =========================================================
  // PRÓXIMO JOGO
  // =========================================================

  async function startNextGame() {
    if (!racha) return;

    if (
      presentPlayers.length <
      2
    ) {
      alert(
        "São necessários pelo menos 2 jogadores."
      );
      return;
    }

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
      racha.id,
      nextNumber,
      presentPlayers
    );

    await loadTodayRacha(
      groupId
    );
  }

  // =========================================================
  // MOVER JOGADOR DE TIME
  // =========================================================

  async function movePlayer(
    gamePlayerId: string,
    newTeamId: string
  ) {
    const selected =
      gamePlayers.find(
        (player) =>
          player.id ===
          gamePlayerId
      );

    if (
      !selected ||
      selected.team_id ===
        newTeamId
    ) {
      return;
    }

    const { error } =
      await supabase
        .from(
          "racha_game_players"
        )
        .update({
          team_id:
            newTeamId,
        })
        .eq(
          "id",
          gamePlayerId
        );

    if (error) {
      console.error(
        error
      );

      alert(
        "Não foi possível mover o jogador."
      );

      return;
    }

    setGamePlayers(
      (current) =>
        current.map(
          (player) =>
            player.id ===
            gamePlayerId
              ? {
                  ...player,
                  team_id:
                    newTeamId,
                }
              : player
        )
    );
  }

  // =========================================================
  // JOGADOR
  // =========================================================

  function getPlayer(
    playerId: string
  ) {
    return players.find(
      (player) =>
        player.id ===
        playerId
    );
  }

  // =========================================================
  // TIME
  // =========================================================

  function getPlayerTeam(
    playerId: string
  ) {
    const gp =
      gamePlayers.find(
        (player) =>
          player.player_id ===
          playerId
      );

    if (!gp) return null;

    return teams.find(
      (team) =>
        team.id ===
        gp.team_id
    );
  }

  // =========================================================
  // PLACAR
  // =========================================================

  function getTeamScore(
    teamId: string
  ) {
    return gamePlayers
      .filter(
        (player) =>
          player.team_id ===
          teamId
      )
      .reduce(
        (total, player) =>
          total +
          player.goals,
        0
      );
  }

  // =========================================================
  // GOLEIRO
  // =========================================================

  function getGoalkeeper(
    teamId: string
  ) {
    return gamePlayers.find(
      (player) =>
        player.team_id ===
          teamId &&
        player.role ===
          "goalkeeper"
    );
  }

  // =========================================================
  // DEFINIR GOLEIRO
  // =========================================================

  async function setGoalkeeper(
    gamePlayerId: string,
    teamId: string
  ) {
    const current =
      getGoalkeeper(
        teamId
      );

    if (
      current &&
      current.id !==
        gamePlayerId
    ) {
      await supabase
        .from(
          "racha_game_players"
        )
        .update({
          role: "field",
        })
        .eq(
          "id",
          current.id
        );
    }

    const selected =
      gamePlayers.find(
        (player) =>
          player.id ===
          gamePlayerId
      );

    if (!selected) return;

    const newRole =
      selected.role ===
        "goalkeeper"
        ? "field"
        : "goalkeeper";

    const { error } =
      await supabase
        .from(
          "racha_game_players"
        )
        .update({
          role:
            newRole,
        })
        .eq(
          "id",
          gamePlayerId
        );

    if (error) {
      console.error(
        error
      );
      return;
    }

    setGamePlayers(
      (currentPlayers) =>
        currentPlayers.map(
          (player) => {
            if (
              current &&
              current.id ===
                player.id &&
              current.id !==
                gamePlayerId
            ) {
              return {
                ...player,
                role: "field",
              };
            }

            if (
              player.id ===
              gamePlayerId
            ) {
              return {
                ...player,
                role:
                  newRole,
              };
            }

            return player;
          }
        )
    );
  }

  // =========================================================
  // GOL
  // =========================================================

  async function registerGoal(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (
      !currentGame ||
      !goalForm.scorer
    ) {
      return;
    }

    setSavingGoal(true);

    try {
      const scorer =
        gamePlayers.find(
          (player) =>
            player.player_id ===
            goalForm.scorer
        );

      if (
        !scorer ||
        !scorer.team_id
      ) {
        return;
      }

      await supabase
        .from(
          "racha_game_players"
        )
        .update({
          goals:
            scorer.goals + 1,
        })
        .eq(
          "id",
          scorer.id
        );

      // assistência
      if (
        goalForm.assist
      ) {
        const assister =
          gamePlayers.find(
            (player) =>
              player.player_id ===
              goalForm.assist
          );

        if (assister) {
          await supabase
            .from(
              "racha_game_players"
            )
            .update({
              assists:
                assister.assists +
                1,
            })
            .eq(
              "id",
              assister.id
            );
        }
      }

      // goleiro adversário
      const opposingTeam =
        teams.find(
          (team) =>
            team.id !==
            scorer.team_id
        );

      if (opposingTeam) {
        const goalkeeper =
          getGoalkeeper(
            opposingTeam.id
          );

        if (goalkeeper) {
          await supabase
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
        }
      }

      setShowGoalForm(
        false
      );

      setGoalForm({
        scorer: "",
        assist: "",
      });

      await loadTodayRacha(
        groupId
      );

      await loadPlayers(
        groupId
      );
    } finally {
      setSavingGoal(
        false
      );
    }
  }

  // =========================================================
  // FINALIZAR JOGO
  // =========================================================

  async function finishGame() {
    if (!currentGame) return;

    const confirmed =
      confirm(
        `Finalizar o Jogo ${currentGame.game_number}?`
      );

    if (!confirmed) return;

    setFinishingGame(
      true
    );

    try {
      // se o timer estiver rodando,
      // encerra o tempo também
      const elapsed =
        calculateTimerSeconds(
          currentGame
        );

      const { error } =
        await supabase
          .from(
            "racha_games"
          )
          .update({
            status:
              "finished",
            timer_status:
              "finished",
            timer_started_at:
              null,
            timer_elapsed_seconds:
              Math.min(
                elapsed,
                currentGame.duration_minutes *
                  60
              ),
          })
          .eq(
            "id",
            currentGame.id
          );

      if (error) {
        console.error(
          error
        );

        alert(
          "Não foi possível finalizar o jogo."
        );

        return;
      }

      setCurrentGame(
        null
      );

      setTeams([]);
      setGamePlayers([]);
      setTimerSeconds(0);

      await loadPlayers(
        groupId
      );

      await loadTodayRacha(
        groupId
      );
    } finally {
      setFinishingGame(
        false
      );
    }
  }

  // =========================================================
  // FINALIZAR RACHA
  // =========================================================

  async function finishRacha() {
    if (
      !racha ||
      currentGame
    ) {
      return;
    }

    const confirmed =
      confirm(
        "Deseja realmente encerrar o racha de hoje?"
      );

    if (!confirmed) return;

    setFinishingRacha(
      true
    );

    try {
      const { error } =
        await supabase
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
        console.error(
          error
        );

        alert(
          "Não foi possível encerrar o racha."
        );

        return;
      }

      setRacha(null);
      setGames([]);
      setCurrentGame(null);
      setTeams([]);
      setGamePlayers([]);
      setPresentPlayers([]);
    } finally {
      setFinishingRacha(
        false
      );
    }
  }

  // =========================================================
  // TOP
  // =========================================================

  function getTopScorer() {
    if (
      gamePlayers.length ===
      0
    ) {
      return null;
    }

    const top =
      [...gamePlayers].sort(
        (a, b) =>
          b.goals -
          a.goals
      )[0];

    return top.goals > 0
      ? top
      : null;
  }

  function getTopAssister() {
    if (
      gamePlayers.length ===
      0
    ) {
      return null;
    }

    const top =
      [...gamePlayers].sort(
        (a, b) =>
          b.assists -
          a.assists
      )[0];

    return top.assists > 0
      ? top
      : null;
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

      {/* =====================================================
          GRUPO
      ===================================================== */}

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
                key={group.id}
                value={group.id}
              >
                {group.name}
              </option>
            )
          )}
        </select>

        <form
          onSubmit={
            addGroup
          }
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

      {/* =====================================================
          TABS
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
          CONTEÚDO
      ===================================================== */}

      <section className="racha-area">

        {loadingRacha ? (

          <div className="card">
            Carregando...
          </div>

        ) : !racha ? (

          <>
            {/* =================================================
                CONFIGURAÇÃO
            ================================================= */}

            <div className="card">

              <div className="section-title">

                <div>
                  <h2>
                    <CalendarDays />
                    Racha de hoje
                  </h2>

                  <p className="muted">
                    Selecione os jogadores
                    presentes.
                  </p>
                </div>

                <span className="present-count">
                  {
                    presentPlayers.length
                  }{" "}
                  presentes
                </span>

              </div>

              {/* =================================================
                  JOGADORES POR TIME
              ================================================= */}

              <div className="players-per-team-box">

                <div>

                  <b>
                    Jogadores por time
                  </b>

                  <small>
                    O sistema criará quantos
                    times forem necessários.
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
                  >
                    <Minus size={17} />
                  </button>

                  <strong>
                    {
                      playersPerTeam
                    }
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
                  DURAÇÃO
              ================================================= */}

              <div className="players-per-team-box">

                <div>

                  <b>
                    Duração da partida
                  </b>

                  <small>
                    Você poderá iniciar,
                    pausar e finalizar o tempo.
                  </small>

                </div>

                <div className="number-control">

                  <button
                    type="button"
                    onClick={() =>
                      setGameDuration(
                        (value) =>
                          Math.max(
                            1,
                            value - 1
                          )
                      )
                    }
                  >
                    <Minus size={17} />
                  </button>

                  <strong>
                    {
                      gameDuration
                    }
                    min
                  </strong>

                  <button
                    type="button"
                    onClick={() =>
                      setGameDuration(
                        (value) =>
                          Math.min(
                            120,
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
                  PREVISÃO
              ================================================= */}

              {presentPlayers.length >
                0 && (

                <div className="team-size-summary">

                  <span>
                    👥{" "}
                    {
                      presentPlayers.length
                    }{" "}
                    jogadores
                  </span>

                  <span>
                    ⚽{" "}
                    {Math.ceil(
                      presentPlayers.length /
                        playersPerTeam
                    )}{" "}
                    times
                  </span>

                  <span>
                    ⏱️{" "}
                    {
                      gameDuration
                    }{" "}
                    min
                  </span>

                </div>
              )}

              {/* =================================================
                  PRESENÇA
              ================================================= */}

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

                  <Shuffle size={18} />

                  {startingRacha
                    ? "Sorteando..."
                    : "Sortear todos os times"}

                </button>

              </div>

            </div>

            {/* =================================================
                ADICIONAR JOGADOR
            ================================================= */}

            <div className="card">

              <h2>
                <Users />
                Jogadores
              </h2>

              <form
                onSubmit={
                  addPlayer
                }
                className="inline"
              >

                <input
                  placeholder="Nome do jogador"
                  value={
                    newPlayer
                  }
                  onChange={(e) =>
                    setNewPlayer(
                      e.target
                        .value
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

          <>
            {/* =================================================
                CABEÇALHO RACHA
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
                    {
                      presentPlayers.length
                    }{" "}
                    jogadores ·{" "}
                    {
                      playersPerTeam
                    }{" "}
                    por time
                  </p>

                </div>

                <button
                  className="finish-button"
                  onClick={
                    finishRacha
                  }
                  disabled={
                    finishingRacha ||
                    !!currentGame
                  }
                >
                  <CheckCircle2
                    size={17}
                  />

                  Encerrar racha
                </button>

              </div>

              {/* =================================================
                  JOGOS
              ================================================= */}

              <div className="racha-games-list">

                {games.map(
                  (game) => (

                    <span
                      key={
                        game.id
                      }
                      className={
                        currentGame?.id ===
                        game.id
                          ? "game-pill active"
                          : "game-pill"
                      }
                    >
                      Jogo{" "}
                      {
                        game.game_number
                      }

                      {game.status ===
                      "finished"
                        ? " ✓"
                        : " • ao vivo"}
                    </span>

                  )
                )}

              </div>

            </div>

            {/* =================================================
                JOGO ATUAL
            ================================================= */}

            {currentGame ? (

              <>

                {/* =================================================
                    CRONÔMETRO
                ================================================= */}

                <div className="card timer-card">

                  <div className="live-label">

                    <Clock
                      size={17}
                    />

                    JOGO{" "}
                    {
                      currentGame.game_number
                    }

                  </div>

                  <div className="timer-display">

                    {
                      formatTime(
                        Math.max(
                          0,
                          currentGame.duration_minutes *
                            60 -
                            timerSeconds
                        )
                      )
                    }

                  </div>

                  <div className="timer-info">

                    Duração:{" "}
                    {
                      currentGame.duration_minutes
                    }{" "}
                    minutos

                  </div>

                  <div className="timer-actions">

                    {currentGame.timer_status !==
                      "finished" && (

                      <>
                        {currentGame.timer_status ===
                          "running" ? (

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

                        ) : (

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

                            {currentGame.timer_status ===
                            "paused"
                              ? "Continuar"
                              : "Iniciar tempo"}
                          </button>

                        )}

                        <button
                          className="finish-button"
                          type="button"
                          onClick={
                            finishTimer
                          }
                        >
                          <Square
                            size={16}
                          />
                          Finalizar tempo
                        </button>

                      </>
                    )}

                    {currentGame.timer_status ===
                      "finished" && (

                      <div className="goalkeeper-label">
                        ⏱️ Tempo da partida
                        finalizado
                      </div>

                    )}

                  </div>

                </div>

                {/* =================================================
                    PLACAR
                ================================================= */}

                <div className="score-card">

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
                      className="button goal-button"
                      onClick={
                        () =>
                          setShowGoalForm(
                            true
                          )
                      }
                    >
                      <Plus
                        size={18}
                      />
                      Registrar gol
                    </button>

                    <button
                      className="finish-button"
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

                      Finalizar jogo
                    </button>

                  </div>

                </div>

                {/* =================================================
                    GOL
                ================================================= */}

                {showGoalForm && (

                  <div className="card">

                    <h2>
                      <Target />
                      Registrar gol
                    </h2>

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
                              Selecionar
                            </option>

                            {gamePlayers.map(
                              (gp) => {

                                const player =
                                  getPlayer(
                                    gp.player_id
                                  );

                                if (!player)
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

                            {gamePlayers.map(
                              (gp) => {

                                const player =
                                  getPlayer(
                                    gp.player_id
                                  );

                                if (!player)
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

                {/* =================================================
                    TIMES
                ================================================= */}

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
                              {
                                getTeamScore(
                                  team.id
                                )
                              }
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
                                          : `⚽ ${gp.goals} · 🎯 ${gp.assists}`}

                                      </small>

                                    </div>

                                    {/* =================================
                                        MOVER DE TIME
                                    ================================= */}

                                    <select
                                      value={
                                        team.id
                                      }
                                      onChange={(e) =>
                                        movePlayer(
                                          gp.id,
                                          e.target
                                            .value
                                        )
                                      }
                                      title="Mover jogador"
                                    >

                                      <option
                                        value={
                                          team.id
                                        }
                                      >
                                        {
                                          team.name
                                        }
                                      </option>

                                      {teams
                                        .filter(
                                          (
                                            otherTeam
                                          ) =>
                                            otherTeam.id !==
                                            team.id
                                        )
                                        .map(
                                          (
                                            otherTeam
                                          ) => (
                                            <option
                                              key={
                                                otherTeam.id
                                              }
                                              value={
                                                otherTeam.id
                                              }
                                            >
                                              →
                                              {
                                                otherTeam.name
                                              }
                                            </option>
                                          )
                                        )}

                                    </select>

                                    {/* =================================
                                        GOLEIRO
                                    ================================= */}

                                    <button
                                      type="button"
                                      className={`goalkeeper-button ${
                                        gp.role ===
                                        "goalkeeper"
                                          ? "active"
                                          : ""
                                      }`}
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

                              🧤 Goleiro:{" "}

                              <b>
                                {
                                  getPlayer(
                                    goalkeeper.player_id
                                  )?.name
                                }
                              </b>

                              {" · "}
                              Sofreu{" "}
                              {
                                goalkeeper.goals_conceded
                              }

                            </div>

                          )}

                        </div>
                      );
                    }
                  )}

                </div>

                {/* =================================================
                    ESTATÍSTICAS
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
                          top.goals !==
                          1
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

                    <CheckCircle2
                      size={38}
                    />

                    <b>
                      Jogo finalizado
                    </b>

                    <span>
                      O resultado foi
                      salvo. Escolha
                      a duração e
                      inicie o próximo
                      jogo.
                    </span>

                    <div className="players-per-team-box">

                      <div>

                        <b>
                          Duração do próximo jogo
                        </b>

                      </div>

                      <div className="number-control">

                        <button
                          type="button"
                          onClick={() =>
                            setGameDuration(
                              (value) =>
                                Math.max(
                                  1,
                                  value - 1
                                )
                            )
                          }
                        >
                          <Minus
                            size={17}
                          />
                        </button>

                        <strong>
                          {
                            gameDuration
                          }
                          min
                        </strong>

                        <button
                          type="button"
                          onClick={() =>
                            setGameDuration(
                              (value) =>
                                Math.min(
                                  120,
                                  value + 1
                                )
                            )
                          }
                        >
                          <Plus
                            size={17}
                          />
                        </button>

                      </div>

                    </div>

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

                      {startingGame
                        ? "Sorteando..."
                        : `Sortear jogo ${
                            games.length +
                            1
                          }`}

                    </button>

                  </div>

                </div>

                {/* =================================================
                    HISTÓRICO
                ================================================= */}

                {games.length >
                  0 && (

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
                            key={
                              game.id
                            }
                          >

                            <div>

                              <b>
                                Jogo{" "}
                                {
                                  game.game_number
                                }
                              </b>

                              <small>
                                {
                                  game.duration_minutes
                                }{" "}
                                minutos ·{" "}
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

    location.href =
      "/admin/login";
  }
}
