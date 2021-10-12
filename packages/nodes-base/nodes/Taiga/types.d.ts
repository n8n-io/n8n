type Resource = 'epic' | 'issue' | 'task' | 'userStory';

type Operation = 'create' | 'delete' | 'update' | 'get' | 'getAll'

type LoadedResource = {
	id: string;
	name: string;
};

type LoadOption = {
	value: string;
	name: string;
};

type LoadedUser = {
	id: string;
	full_name_display: string;
};

type LoadedUserStory = {
	id: string;
	subject: string;
};

type LoadedEpic = LoadedUserStory;

type LoadedTags = {
	[tagName: string]: string | null; // hex color
}

type Operations = 'all' | 'create' | 'delete' | 'change';

type Resources = 'all' | 'issue' | 'milestone' | 'task' | 'userstory' | 'wikipage';

type WebhookPayload = {
	action: Operations;
	type: Resources;
	by: Record<string, string | number>;
	date: string;
	data: Record<string, string | number | object | string[]>;
}
