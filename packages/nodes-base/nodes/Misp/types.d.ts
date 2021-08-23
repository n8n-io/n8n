export type MispCredentials = {
	baseUrl: string;
	apiKey: string;
	allowUnauthorizedCerts: boolean;
};

export type LoadedOrgs = Array<{
	Organisation: { id: string; name: string; }
}>;

export type LoadedTags = {
	tags: { [key: string]: string }
};

export type LoadedUsers = Array<{
	User: { id: string; email: string; }
}>;
