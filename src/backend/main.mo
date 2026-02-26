import Array "mo:core/Array";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Nat "mo:core/Nat";
import Iter "mo:core/Iter";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";

import Order "mo:core/Order";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";


actor {
  // Initialize the access control system
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // User Profile type
  public type UserProfile = {
    name : Text;
  };

  let userProfiles = Map.empty<Principal, UserProfile>();

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // Game Arcade Types
  type ScoreEntry = {
    gameId : Text;
    score : Nat;
    timestamp : Time.Time;
  };

  module ScoreEntry {
    public func compareByScore(a : ScoreEntry, b : ScoreEntry) : Order.Order {
      Nat.compare(b.score, a.score);
    };
  };

  let scores = Map.empty<Principal, Map.Map<Text, ScoreEntry>>();

  // Save high score - requires user authentication
  public shared ({ caller }) func saveHighScore(gameId : Text, score : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save high scores");
    };

    if (gameId == "") { Runtime.trap("Game id cannot be empty") };

    let timestamp = Time.now();
    let scoreEntry : ScoreEntry = {
      gameId;
      score;
      timestamp;
    };

    let userScores = switch (scores.get(caller)) {
      case (null) {
        let newScores = Map.empty<Text, ScoreEntry>();
        newScores.add(gameId, scoreEntry);
        scores.add(caller, newScores);
        return;
      };
      case (?existingScores) { existingScores };
    };

    switch (userScores.get(gameId)) {
      case (null) {
        userScores.add(gameId, scoreEntry);
        return;
      };
      case (?existingScore) {
        if (score > existingScore.score) {
          userScores.add(gameId, scoreEntry);
        };
      };
    };
  };

  // Get personal high score - requires user authentication
  public query ({ caller }) func getHighScore(gameId : Text) : async ?ScoreEntry {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access their high scores");
    };

    switch (scores.get(caller)) {
      case (null) { null };
      case (?userScores) {
        userScores.get(gameId);
      };
    };
  };

  // Get all personal high scores - requires user authentication
  public query ({ caller }) func getAllHighScores() : async [ScoreEntry] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access their high scores");
    };

    switch (scores.get(caller)) {
      case (null) { [] };
      case (?userScores) {
        userScores.values().toArray();
      };
    };
  };

  // Get global leaderboard - public access (no authentication required)
  public query ({ caller }) func getGlobalLeaderboard(gameId : Text) : async [ScoreEntry] {
    var allScores = Array.empty<ScoreEntry>();

    for ((_, userScores) in scores.entries()) {
      switch (userScores.get(gameId)) {
        case (?scoreEntry) {
          allScores := allScores.concat([scoreEntry]);
        };
        case (null) {};
      };
    };

    let sortedScores = allScores.sort(ScoreEntry.compareByScore);

    if (sortedScores.size() <= 10) {
      return sortedScores;
    };

    sortedScores.sliceToArray(0, 10);
  };

  // Get player count - public access (no authentication required)
  public query ({ caller }) func getPlayerCount(gameId : Text) : async Nat {
    var count = 0;
    for ((_, userScores) in scores.entries()) {
      switch (userScores.get(gameId)) {
        case (?scoreEntry) {
          count += 1;
        };
        case (null) {};
      };
    };
    count;
  };
};
