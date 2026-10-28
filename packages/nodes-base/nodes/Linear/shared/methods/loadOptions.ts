import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

import { linearApiRequestAllItems, sort } from '../GenericFunctions';

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
		variables: {},
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
		variables: {},
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
		variables: {},
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
