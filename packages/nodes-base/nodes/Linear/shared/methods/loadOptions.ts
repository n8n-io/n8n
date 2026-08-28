import type { IDataObject, ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

import { linearApiRequest, linearApiRequestAllItems, sort } from '../GenericFunctions';

export async function getTeams(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];
	const body = {
		query: `query Teams ($first: Int, $after: String){
			teams (first: $first, after: $after){
				nodes {
					id
					name
				}
				pageInfo {
					hasNextPage
					endCursor
				}
			}
		}`,
		variables: {
			$first: 10,
		},
	};
	const teams = await linearApiRequestAllItems.call(this, 'data.teams', body);

	for (const team of teams) {
		returnData.push({
			name: team.name as string,
			value: team.id as string,
		});
	}
	return returnData;
}

export async function getUsers(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];
	const body = {
		query: `query Users ($first: Int, $after: String){
			users (first: $first, after: $after){
				nodes {
					id
					name
				},
				pageInfo {
					hasNextPage
					endCursor
				}
			}
		}`,
		variables: {
			$first: 10,
		},
	};
	const users = await linearApiRequestAllItems.call(this, 'data.users', body);

	for (const user of users) {
		returnData.push({
			name: user.name as string,
			value: user.id as string,
		});
	}
	return returnData;
}

export async function getStates(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	let teamId = this.getNodeParameter('teamId', null) as string;
	// The team can live in the operation's own collection (update/getAll) rather than at the root
	if (!teamId) {
		const updateFields = this.getNodeParameter('updateFields', null) as IDataObject;
		const filters = this.getNodeParameter('filters', null) as IDataObject;
		teamId = (updateFields?.teamId ?? filters?.teamId) as string;
	}
	// Fall back to the team of the selected issue (issueId is a resource locator in v2)
	if (!teamId) {
		const issueId = this.getNodeParameter('issueId', null, { extractValue: true }) as string | null;
		if (issueId) {
			const body = {
				query: `query Issue($issueId: String!) {
					issue(id: $issueId) {
						team {
							id
						}
					}
				}`,
				variables: {
					issueId,
				},
			};
			const responseData = await linearApiRequest.call(this, body);
			teamId = (responseData as IDataObject & { data: { issue: { team: { id: string } } } })?.data
				?.issue?.team?.id;
		}
	}

	if (!teamId) {
		return [];
	}

	const returnData: INodePropertyOptions[] = [];
	const body = {
		query: `query States ($first: Int, $after: String, $filter: WorkflowStateFilter){
			workflowStates (first: $first, after: $after, filter: $filter){
				nodes {
					id
					name
				},
				pageInfo {
					hasNextPage
					endCursor
				}
			}
		}`,
		variables: {
			$first: 10,
			filter: {
				team: {
					id: {
						eq: teamId,
					},
				},
			},
		},
	};
	const states = await linearApiRequestAllItems.call(this, 'data.workflowStates', body);

	for (const state of states) {
		returnData.push({
			name: state.name as string,
			value: state.id as string,
		});
	}
	return returnData.sort(sort);
}

export async function getLabels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];
	const body = {
		query: `query IssueLabels ($first: Int, $after: String){
			issueLabels (first: $first, after: $after){
				nodes {
					id
					name
				}
				pageInfo {
					hasNextPage
					endCursor
				}
			}
		}`,
		variables: {
			$first: 50,
		},
	};
	const labels = await linearApiRequestAllItems.call(this, 'data.issueLabels', body);

	for (const label of labels) {
		returnData.push({
			name: label.name as string,
			value: label.id as string,
		});
	}
	return returnData.sort(sort);
}

export async function getProjects(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];
	const body = {
		query: `query Projects ($first: Int, $after: String){
			projects (first: $first, after: $after){
				nodes {
					id
					name
				}
				pageInfo {
					hasNextPage
					endCursor
				}
			}
		}`,
		variables: {
			$first: 50,
		},
	};
	const projects = await linearApiRequestAllItems.call(this, 'data.projects', body);

	for (const project of projects) {
		returnData.push({
			name: project.name as string,
			value: project.id as string,
		});
	}
	return returnData.sort(sort);
}

export async function getCycles(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const returnData: INodePropertyOptions[] = [];
	const body = {
		query: `query Cycles ($first: Int, $after: String){
			cycles (first: $first, after: $after){
				nodes {
					id
					name
					number
				}
				pageInfo {
					hasNextPage
					endCursor
				}
			}
		}`,
		variables: {
			$first: 50,
		},
	};
	const cycles = await linearApiRequestAllItems.call(this, 'data.cycles', body);

	for (const cycle of cycles) {
		returnData.push({
			name: (cycle.name as string) || `Cycle ${cycle.number as number}`,
			value: cycle.id as string,
		});
	}
	return returnData;
}
