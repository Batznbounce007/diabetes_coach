export type CoachProfile = {
  gender: string;
  age: string;
  profession: string;
  insulinTherapy: string;
  usesClosedLoop: string;
  closedLoopSystem: string;
  pumpModel: string;
  cgmSystem: string;
  primaryGoal: string;
  challenge: string;
};

export const coachProfileStorageKey = "diabetes-coach-profile-v1";

export const emptyCoachProfile: CoachProfile = {
  gender: "",
  age: "",
  profession: "",
  insulinTherapy: "",
  usesClosedLoop: "",
  closedLoopSystem: "",
  pumpModel: "",
  cgmSystem: "",
  primaryGoal: "",
  challenge: ""
};
