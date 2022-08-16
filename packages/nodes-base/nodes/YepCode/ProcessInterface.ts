interface IBasicAuth {
	username: string;
	password: string;
}

interface IAuth {
	basicAuth?: IBasicAuth;
}

interface IWebhook {
	enabled: boolean;
	auth?: IAuth;
}

interface ITriggers {
	webhook?: IWebhook;
}

export interface IProcess {
	id: string;
	name: string;
	triggers: ITriggers;
}
