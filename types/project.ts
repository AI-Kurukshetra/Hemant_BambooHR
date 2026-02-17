export type TeamModel = "small" | "medium" | "large";

export type Project = {
  id: string;
  name: string;
  clientName: string | null;
  sprintDurationWeeks: 1 | 2;
  teamModel: TeamModel;
  createdAt: string;
};

