// ----------------------------------
//             queries
// ----------------------------------

export const getAllSpaces = `
	query {
		organization {
			spaces {
				id
				name
				labels {
					id
					name
					color
				}
				statuses {
					id
					name
					type
					default
				}
			}
		}
	}
`;

export const getAllUsers = `
	query {
		organization {
			users {
				id
				username
			}
		}
	}
`;

export const getLabels = `
	query {
		organization {
			spaces {
				labels {
					id
					name
					color
				}
			}
		}
	}
`;

export const getOrganization = `
	query {
		organization {
			id
			name
		}
	}
`;

export const getSpaces = `
	query {
		organization {
			spaces {
				id
				name
				labels {
					id
					name
					color
				}
				statuses {
					id
					name
					type
					default
				}
			}
		}
	}
`;

export const getStatuses = `
	query {
		organization {
			spaces {
				id
				statuses {
					id
					name
					type
					default
				}
			}
		}
	}
`;

export const getUsers = `
	query {
		organization {
			users {
				id
				username
			}
		}
	}
`;

export const getWorkItems = `
	query($spaceId: ID!) {
		workItems(spaceId: $spaceId) {
			workItems {
				id
				title
			}
		}
	}
`;

export const getWorkItem = `
	query($workItemId: ID!) {
		workItem(id: $workItemId) {
			id
			number
			title
			description
			status {
				id
				name
			}
			sort
			members {
				id
				username
			}
			watchers {
				id
				username
			}
			labels {
				id
				name
			}
			comments {
				id
				actor {
					__typename
				}
				body
				threadId
				updatedAt
				createdAt
			}
			effort
			impact
			updatedAt
			createdAt
		}
	}
`;

export const getAllWorkItems = `
	query($spaceId: ID!, $cursor: String) {
		workItems(spaceId: $spaceId, cursor: $cursor) {
			hasMore,
			cursor,
			workItems {
				id
				title
				description
				labels {
					id
				}
				comments {
					id
					body
					actor {
						... on User {
							id
							username
						}
						... on IntegrationUser {
							id
							externalName
						}
						... on Integration {
							id
							type
						}
						... on Application {
							id
							name
						}
					}
				}
			}
		}
	}
`;
