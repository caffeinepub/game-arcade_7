import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useActor } from "./useActor";
import type { ScoreEntry } from "../backend.d";

export function useAllHighScores() {
  const { actor, isFetching } = useActor();
  return useQuery<ScoreEntry[]>({
    queryKey: ["allHighScores"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllHighScores();
    },
    enabled: !!actor && !isFetching,
    staleTime: 30_000,
  });
}

export function useHighScore(gameId: string) {
  const { actor, isFetching } = useActor();
  return useQuery<ScoreEntry | null>({
    queryKey: ["highScore", gameId],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getHighScore(gameId);
    },
    enabled: !!actor && !isFetching && !!gameId,
    staleTime: 30_000,
  });
}

export function useGlobalLeaderboard(gameId: string) {
  const { actor, isFetching } = useActor();
  return useQuery<ScoreEntry[]>({
    queryKey: ["leaderboard", gameId],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getGlobalLeaderboard(gameId);
    },
    enabled: !!actor && !isFetching && !!gameId,
    staleTime: 30_000,
  });
}

export function usePlayerCount(gameId: string) {
  const { actor, isFetching } = useActor();
  return useQuery<bigint>({
    queryKey: ["playerCount", gameId],
    queryFn: async () => {
      if (!actor) return BigInt(0);
      return actor.getPlayerCount(gameId);
    },
    enabled: !!actor && !isFetching && !!gameId,
    staleTime: 60_000,
  });
}

export function useSaveHighScore() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ gameId, score }: { gameId: string; score: number }) => {
      if (!actor) throw new Error("No actor available");
      await actor.saveHighScore(gameId, BigInt(score));
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["allHighScores"] });
      queryClient.invalidateQueries({ queryKey: ["highScore", variables.gameId] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard", variables.gameId] });
    },
  });
}
