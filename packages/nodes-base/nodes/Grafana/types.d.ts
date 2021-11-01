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