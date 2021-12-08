export type GrafanaCredentials = {
  apiKey: string;
  baseUrl: string;
};

export type DashboardUpdatePayload = {
  overwrite: true,
  dashboard: {
    uid: string,
    title?: string
  }
};

export type DashboardUpdateFields = {
  title?: string;
  folderId?: string;
};

export type LoadedDashboards = Array<{
  id: number;
  title: string;
}>;

export type LoadedFolders = LoadedDashboards;

export type LoadedTeams = {
  teams: Array<{
    id: number;
    name: string;
  }>
};

export type LoadedUsers = Array<{
  userId: number;
  email: string;
}>;