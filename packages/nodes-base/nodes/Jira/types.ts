export type JiraWebhook = {
	id: number;
	name: string;
	createdDate: number;
	updatedDate: number;
	events: string[];
	configuration: {};
	url: string;
	active: boolean;
	scopeType: string;
	sslVerificationRequired: boolean;
	self?: string; // Only available for version < 10
};
export type JiraServerInfo = {
	baseUrl: string;
	version: string;
	versionNumbers: number[];
	deploymentType?: 'Cloud' | 'Server';
	buildNumber: number;
	buildDate: string;
	databaseBuildNumber: number;
	serverTime: string;
	scmInfo: string;
	serverTitle: string;
};
