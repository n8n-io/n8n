export const addCommentRequest = {
	query: `mutation CommentCreate ($issueId: String!, $body: String!, $parentId: String) {
			commentCreate(input: {issueId: $issueId, body: $body, parentId: $parentId}) {
				success
				comment {
					id
				}
			}
		}`,
	variables: {
		issueId: 'test-17',
		body: 'test',
	},
};

export const addCommentWithParentRequest = {
	query: `mutation CommentCreate ($issueId: String!, $body: String!, $parentId: String) {
			commentCreate(input: {issueId: $issueId, body: $body, parentId: $parentId}) {
				success
				comment {
					id
				}
			}
		}`,
	variables: {
		issueId: 'test-17',
		body: 'Add to parent',
		parentId: 'ff12069e-fac8-4b18-8455-cc6b29fa1e77',
	},
};

export const addCommentLink = {
	query: `mutation AttachmentLinkURL($url: String!, $issueId: String!) {
  		attachmentLinkURL(url: $url, issueId: $issueId) {
    		success
  		}
		}`,
	variables: {
		issueId: 'test-17',
		url: 'https://n8n.io',
	},
};

export const issueCreateRequest = {
	query: `mutation IssueCreate (
			$title: String!,
			$teamId: String!,
			$description: String,
			$assigneeId: String,
			$priorityId: Int,
			$stateId: String){
			issueCreate(
				input: {
					title: $title
					description: $description
					teamId: $teamId
					assigneeId: $assigneeId
					priority: $priorityId
					stateId: $stateId
				}
			) {
				success
					issue {
						id,
						identifier,
						title,
						priority
						archivedAt
						assignee {
							id
							displayName
						}
						state {
							id
							name
						}
						createdAt
						creator {
							id
							displayName
						}
						description
						dueDate
						cycle {
							id
							name
						}
					}
				}
			}`,
	variables: {
		teamId: '0a2994c1-5d99-48aa-ab22-8b5ba4711ebc',
		title: 'This is a test issue',
		assigneeId: '1c51f0c4-c552-4614-a534-8de1752ba7d7',
		description: 'test description',
		priorityId: 3,
		stateId: '65a87a3a-5729-4d82-96bf-badccbeb49af',
	},
};

export const getIssueRequest = {
	query: `query Issue($issueId: String!) {
			issue(id: $issueId) {
				id,
				identifier,
				title,
				priority,
				archivedAt,
				assignee {
					id,
					displayName
				}
				state {
					id
					name
				}
				createdAt
				creator {
					id
					displayName
				}
				description
				dueDate
				cycle {
					id
					name
				}
			}
		}`,
	variables: {
		issueId: 'test-18',
	},
};

export const getManyIssuesRequest = {
	query: `query Issue ($first: Int, $after: String){
					issues (first: $first, after: $after){
						nodes {
						id,
						identifier,
						title,
						priority
						archivedAt
						assignee {
							id
							displayName
						}
						state {
							id
							name
						}
						createdAt
						creator {
							id
							displayName
						}
						description
						dueDate
						cycle {
							id
							name
						}
					}
					pageInfo {
						hasNextPage
						endCursor
					}
				}
			}`,
	variables: {
		first: 1,
		after: null,
	},
};

export const updateIssueRequest = {
	query: `mutation IssueUpdate (
		$issueId: String!,
		$title: String,
		$teamId: String,
		$description: String,
		$assigneeId: String,
		$priorityId: Int,
		$stateId: String){
		issueUpdate(
			id: $issueId,
			input: {
				title: $title
				description: $description
				teamId: $teamId
				assigneeId: $assigneeId
				priority: $priorityId
				stateId: $stateId
			}
		) {
			success
				issue {
					id,
					identifier,
					title,
					priority
					archivedAt
					assignee {
						id
						displayName
					}
					state {
						id
						name
					}
					createdAt
					creator {
						id
						displayName
					}
					description
					dueDate
					cycle {
						id
						name
					}
				}
			}
		}`,
	variables: {
		issueId: 'test-18',
		assigneeId: '1c51f0c4-c552-4614-a534-8de1752ba7d7',
		description: 'New Description',
		priorityId: 3,
		stateId: '622493c0-f4ee-456d-af65-49a7611ede7a',
		teamId: '0a2994c1-5d99-48aa-ab22-8b5ba4711ebc',
		title: 'New Title',
	},
};

export const deleteIssueRequest = {
	query: `mutation IssueDelete ($issueId: String!) {
					issueDelete(id: $issueId) {
						success
					}
				}`,
	variables: {
		issueId: 'test-18',
	},
};
