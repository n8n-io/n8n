export const query = {
	getUsers() {
		return `query Users ($first: Int){
			users (first: $first){
				nodes {
					id
					name
				},
				pageInfo {
					hasNextPage
					endCursor
			}
		}}`;
	},
	getTeams() {
		return `query Teams ($first: Int, $after: String){
				teams (first: $first, after: $after){
					nodes {
						id
						name
					}
					pageInfo {
						hasNextPage
						endCursor
					}
			}}`;
	},
	getStates() {
		return `query States ($first: Int){
				workflowStates (first: $first){
					nodes {
						id
						name
					},
					pageInfo {
						hasNextPage
						endCursor
				}
			}}`;
	},
	createIssue() {
		return `mutation IssueCreate (
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
			}`;
	},
	deleteIssue() {
		return `mutation IssueDelete ($issueId: String!) {
					issueDelete(id: $issueId) {
						success
					}
				}`;
	},
	getIssue() {
		return `query Issue($issueId: String!) {
			issue(id: $issueId) {
				id,
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
		}`;
	},
	getIssues() {
		return `query Issue ($first: Int){
					issues (first: $first){
						nodes {
						id,
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
			}`;
	},
	updateIssue() {
		return `mutation IssueUpdate (
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
		}`;
	},
};
