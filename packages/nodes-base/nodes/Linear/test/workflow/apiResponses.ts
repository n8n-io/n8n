export const commentCreateResponse = {
	data: {
		commentCreate: {
			success: true,
			comment: {
				id: 'ff12069e-fac8-4b18-8455-cc6b29fa1e77',
			},
		},
	},
};

export const commentCreateWithParentResponse = {
	data: {
		commentCreate: {
			success: true,
			comment: {
				id: 'bd0e4d70-7964-4877-aa30-d81534027f44',
			},
		},
	},
};

export const attachmentLinkURLResponse = {
	data: {
		attachmentLinkURL: {
			success: true,
		},
	},
};

export const issueCreateResponse = {
	data: {
		issueCreate: {
			success: true,
			issue: {
				id: '3c7316e3-4224-424d-8cc8-1dd3b96764b8',
				identifier: 'TEST-18',
				title: 'This is a test issue',
				priority: 3,
				archivedAt: null,
				assignee: {
					id: '1c51f0c4-c552-4614-a534-8de1752ba7d7',
					displayName: 'nathan',
				},
				state: {
					id: '65a87a3a-5729-4d82-96bf-badccbeb49af',
					name: 'Backlog',
				},
				createdAt: '2025-06-12T10:38:35.296Z',
				creator: {
					id: '1c51f0c4-c552-4614-a534-8de1752ba7d7',
					displayName: 'nathan',
				},
				description: 'test description',
				dueDate: null,
				cycle: null,
			},
		},
	},
};

export const getIssueResponse = {
	data: {
		issue: {
			id: '3c7316e3-4224-424d-8cc8-1dd3b96764b8',
			identifier: 'TEST-18',
			title: 'This is a test issue',
			priority: 3,
			archivedAt: null,
			assignee: {
				id: '1c51f0c4-c552-4614-a534-8de1752ba7d7',
				displayName: 'nathan',
			},
			state: {
				id: '65a87a3a-5729-4d82-96bf-badccbeb49af',
				name: 'Backlog',
			},
			createdAt: '2025-06-12T10:38:35.296Z',
			creator: {
				id: '1c51f0c4-c552-4614-a534-8de1752ba7d7',
				displayName: 'nathan',
			},
			description: 'test description',
			dueDate: null,
			cycle: null,
		},
	},
};

export const getManyIssueResponse = {
	data: {
		issues: {
			nodes: [
				{
					id: '3c7316e3-4224-424d-8cc8-1dd3b96764b8',
					identifier: 'TEST-18',
					title: 'This is a test issue',
					priority: 3,
					archivedAt: null,
					assignee: {
						id: '1c51f0c4-c552-4614-a534-8de1752ba7d7',
						displayName: 'nathan',
					},
					state: {
						id: '65a87a3a-5729-4d82-96bf-badccbeb49af',
						name: 'Backlog',
					},
					createdAt: '2025-06-12T10:38:35.296Z',
					creator: {
						id: '1c51f0c4-c552-4614-a534-8de1752ba7d7',
						displayName: 'nathan',
					},
					description: 'test description',
					dueDate: null,
					cycle: null,
				},
			],
			pageInfo: {
				hasNextPage: true,
				endCursor: '3c7316e3-4224-424d-8cc8-1dd3b96764b8',
			},
		},
	},
};

export const issueUpdateResponse = {
	data: {
		issueUpdate: {
			success: true,
			issue: {
				id: '3c7316e3-4224-424d-8cc8-1dd3b96764b8',
				identifier: 'TEST-18',
				title: 'New Title',
				priority: 3,
				archivedAt: null,
				assignee: {
					id: '1c51f0c4-c552-4614-a534-8de1752ba7d7',
					displayName: 'nathan',
				},
				state: {
					id: '622493c0-f4ee-456d-af65-49a7611ede7a',
					name: 'Canceled',
				},
				createdAt: '2025-06-12T10:38:35.296Z',
				creator: {
					id: '1c51f0c4-c552-4614-a534-8de1752ba7d7',
					displayName: 'nathan',
				},
				description: 'New Description',
				dueDate: null,
				cycle: null,
			},
		},
	},
};

export const deleteIssueResponse = {
	data: {
		issueDelete: {
			success: true,
		},
	},
};
