export type MispCredentials = {
	baseUrl: string;
	apiKey: string;
	allowUnauthorizedCerts: boolean;
};

export type LoadedOrgs = Array<{
	Organisation: { id: string; name: string };
}>;

export type LoadedTags = {
	Tag: Array<{ id: string; name: string }>;
};

export type LoadedUsers = Array<{
	User: { id: string; email: string };
}>;
