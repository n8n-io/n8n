type MattermostChannel = {
	resource: 'channel';
	operation: 'addUser' | 'create' | 'del' | 'members' | 'restore' | 'statistics';
};

type MattermostMessage = {
	resource: 'message';
	operation: 'del' | 'post' | 'postEphemeral';
};

type MattermostReaction = {
	resource: 'reaction';
	operation: 'create' | 'del' | 'getAll';
};

type MattermostUser = {
	resource: 'user';
	operation: 'create' | 'deactive' | 'getAll' | 'getById' | 'invite';
};

type Mattermost = MattermostChannel | MattermostMessage | MattermostReaction | MattermostUser;