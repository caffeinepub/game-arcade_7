import Map "mo:core/Map";
import Text "mo:core/Text";
import Principal "mo:core/Principal";

module {
  public type UserProfile = {
    name : Text;
  };

  public type UserAccount = {
    username : Text;
    passwordHash : Text;
  };

  public type ScoreEntry = {
    gameId : Text;
    score : Nat;
    timestamp : Int;
  };

  type OldActor = {
    scores : Map.Map<Principal, Map.Map<Text, ScoreEntry>>;
    userProfiles : Map.Map<Principal, UserProfile>;
  };

  type NewActor = {
    scores : Map.Map<Principal, Map.Map<Text, ScoreEntry>>;
    userProfiles : Map.Map<Principal, UserProfile>;
    accounts : Map.Map<Principal, UserAccount>;
    usernameToPrincipal : Map.Map<Text, Principal>;
  };

  public func run(old : OldActor) : NewActor {
    {
      old with
      accounts = Map.empty<Principal, UserAccount>();
      usernameToPrincipal = Map.empty<Text, Principal>();
    };
  };
};
