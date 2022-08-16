export const query = {
	getProcess() {
		return `query getProcess($id: ID!) {
				process (id: $id) {
					id
					triggers {
						webhook {
							enabled
							auth {
								basicAuth {
									username
									password
								}
							}
						}
					}
				}
			}`;
	},
	getProcesses() {
		return `query getProcesses($first: Int!, $after: String) {
				processes (first: $first, after: $after) {
					edges {
						node {
							id
							name
							triggers {
								webhook {
									enabled
								}
							}
						}
					}
					pageInfo {
						hasNextPage
						endCursor
					}
				}
			}`;
	},
	getTags() {
		return `query getVersionedProcesses($processId: ID!) {
			allVersionedProcesses(processId: $processId) {
				id
				tag
			}
		}
		`;
	},
	getTeams() {
		return `query getTeams {
				teams {
					slug
					name
				}
			}`;
	},
};
