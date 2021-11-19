module.exports = {
	mattermost: {
		header: {
			displayName: '🇩🇪 Mattermost',
			description: '🇩🇪 Consume Mattermost API',
		},
		credentialsModal: {
			mattermostApi: {
				accessToken: {
					displayName: '🇩🇪 Access token',
				},
			},
		},
		nodeView: {
			resource: {
				displayName: '🇩🇪 Resource',
				description: '🇩🇪 The resource to operate on.',
				options: {
					channel: {
						displayName: '🇩🇪 Channel',
					},
					message: {
						displayName: '🇩🇪 Message',
					},
					reaction: {
						displayName: '🇩🇪 Reaction',
					},
					user: {
						displayName: '🇩🇪 User',
					},
				},
			},
		},
	},
};
