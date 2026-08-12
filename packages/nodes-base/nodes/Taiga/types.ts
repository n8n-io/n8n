export type Resource = 'epic' | 'issue' | 'task' | 'userStory';

export type Operation = 'create' | 'delete' | 'update' | 'get' | 'getAll';

export type LoadedResource = {
	id: string;
	name: string;
};

export type LoadOption = {
	value: string;
	name: string;
};

export type LoadedUser = {
	id: string;
	full_name_display: string;
};

export type LoadedUserStory = {
	id: string;
	subject: string;
};

export type LoadedEpic = LoadedUserStory;

export type LoadedTags = {
	[tagName: string]: string | null; // hex color
};

export type Operations = 'all' | 'create' | 'delete' | 'change';

export type Resources = 'all' | 'issue' | 'milestone' | 'task' | 'userstory' | 'wikipage';

export type WebhookPayload = {
	action: Operations;
	type: Resources;
	by: Record<string, string | number>;
	date: string;
	data: Record<string, string | number | object | string[]>;
};
