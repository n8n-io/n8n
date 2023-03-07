import type { IExecuteFunctions } from 'n8n-core';

import type { IDataObject, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { apiRequest, apiRequestAllItems } from '../../../transport';

import { snakeCase } from 'change-case';

export async function getAll(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const returnAll = this.getNodeParameter('returnAll', index);
	const additionalFields = this.getNodeParameter('additionalFields', index);

	const qs = {} as IDataObject;
	const requestMethod = 'GET';
	const endpoint = '/users';
	const body = {} as IDataObject;

	if (additionalFields.inTeam) {
		qs.in_team = additionalFields.inTeam;
	}

	if (additionalFields.notInTeam) {
		qs.not_in_team = additionalFields.notInTeam;
	}

	if (additionalFields.inChannel) {
		qs.in_channel = additionalFields.inChannel;
	}

	if (additionalFields.notInChannel) {
		qs.not_in_channel = additionalFields.notInChannel;
	}

	if (additionalFields.sort) {
		qs.sort = snakeCase(additionalFields.sort as string);
	}

	const validRules = {
		inTeam: ['last_activity_at', 'created_at', 'username'],
		inChannel: ['status', 'username'],
	};

	if (additionalFields.sort) {
		if (additionalFields.inTeam !== undefined || additionalFields.inChannel !== undefined) {
			if (
				additionalFields.inTeam !== undefined &&
				!validRules.inTeam.includes(snakeCase(additionalFields.sort as string))
			) {
				throw new NodeOperationError(
					this.getNode(),
					`When In Team is set the only valid values for sorting are ${validRules.inTeam.join(
						',',
					)}`,
					{ itemIndex: index },
				);
			}
			if (
				additionalFields.inChannel !== undefined &&
				!validRules.inChannel.includes(snakeCase(additionalFields.sort as string))
			) {
				throw new NodeOperationError(
					this.getNode(),
					`When In Channel is set the only valid values for sorting are ${validRules.inChannel.join(
						',',
					)}`,
					{ itemIndex: index },
				);
			}
			if (additionalFields.inChannel === '' && additionalFields.sort !== 'username') {
				throw new NodeOperationError(
					this.getNode(),
					'When sort is different than username In Channel must be set',
					{ itemIndex: index },
				);
			}

			if (additionalFields.inTeam === '' && additionalFields.sort !== 'username') {
				throw new NodeOperationError(
					this.getNode(),
					'When sort is different than username In Team must be set',
					{ itemIndex: index },
				);
			}
		} else {
			throw new NodeOperationError(
				this.getNode(),
				"When sort is defined either 'in team' or 'in channel' must be defined",
				{ itemIndex: index },
			);
		}
	}

	if (additionalFields.sort === 'username') {
		qs.sort = '';
	}

	if (!returnAll) {
		qs.per_page = this.getNodeParameter('limit', index);
	}

	let responseData;

	if (returnAll) {
		responseData = await apiRequestAllItems.call(this, requestMethod, endpoint, body, qs);
	} else {
		responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);
	}

	return this.helpers.returnJsonArray(responseData as IDataObject[]);
}
