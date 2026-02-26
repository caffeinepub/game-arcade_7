import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export type Time = bigint;
export interface ScoreEntry {
    gameId: string;
    score: bigint;
    timestamp: Time;
}
export interface UserProfile {
    name: string;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    checkUsernameExists(username: string): Promise<boolean>;
    getAllHighScores(): Promise<Array<ScoreEntry>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getCallerUsername(): Promise<string | null>;
    getGlobalLeaderboard(gameId: string): Promise<Array<ScoreEntry>>;
    getHighScore(gameId: string): Promise<ScoreEntry | null>;
    getPlayerCount(gameId: string): Promise<bigint>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    loginUser(username: string, password: string): Promise<void>;
    registerUser(username: string, password: string): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    saveHighScore(gameId: string, score: bigint): Promise<void>;
}
