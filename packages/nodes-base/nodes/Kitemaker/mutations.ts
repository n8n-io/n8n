// ----------------------------------
//           mutations
// ----------------------------------

export const createWorkItem = `
	mutation($input: CreateWorkItemInput!) {
		createWorkItem(input: $input) {
			workItem {
				id
				number
				title
				description
				status {
					id
					name
				}
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
				effort
				impact
				updatedAt
				createdAt
			}
		}
	}
`;

export const editWorkItem = `
	mutation ($input: EditWorkItemInput!) {
		editWorkItem(input: $input) {
			workItem {
				id
				number
				title
				description
				status {
					id
					name
				}
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
				effort
				impact
				updatedAt
				createdAt
			}
		}
	}
`;
