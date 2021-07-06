type Resource = 'epic' | 'issue' | 'task' | 'userStory';

type Operation = 'create' | 'delete' | 'update' | 'get' | 'getAll'

type LoadedResource = {
	id: string;
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

type LoadedTags = {
	[tagName: string]: string | null; // hex color
}
