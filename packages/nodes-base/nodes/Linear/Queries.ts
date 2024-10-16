export const query = {
	getUsers() {
		return `query Users ($first: Int, $after: String){
			users (first: $first, after: $after){
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
		return `query States ($first: Int, $after: String, $filter: WorkflowStateFilter){
				workflowStates (first: $first, after: $after, filter: $filter){
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
		}`;
	},
	getIssueTeam() {
		return `query Issue($issueId: String!) {
			issue(id: $issueId) {
				team {
					id
				}
			}
		}`;
	},
	getIssues() {
		return `query Issue ($first: Int, $after: String){
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
		}`;
	},
};
