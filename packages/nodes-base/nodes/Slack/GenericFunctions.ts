import { OptionsWithUri } from 'request';

import { IExecuteFunctions, IExecuteSingleFunctions, ILoadOptionsFunctions } from 'n8n-core';

import {
	IDataObject,
	IOAuth2Options,
	JsonObject,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

import _ from 'lodash';

export async function slackApiRequest(
	this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	method: string,
	resource: string,
	body: object = {},
	query: object = {},
	headers: IDataObject | undefined = undefined,
	option: IDataObject = {},
	// tslint:disable-next-line:no-any
): Promise<any> {
	const authenticationMethod = this.getNodeParameter('authentication', 0, 'accessToken') as string;
	let options: OptionsWithUri = {
		method,
		headers: headers || {
			'Content-Type': 'application/json; charset=utf-8',
		},
		body,
		qs: query,
		uri: `https://slack.com/api${resource}`,
		json: true,
	};
	options = Object.assign({}, options, option);
	if (Object.keys(body).length === 0) {
		delete options.body;
	}
	if (Object.keys(query).length === 0) {
		delete options.qs;
	}

	const oAuth2Options: IOAuth2Options = {
		tokenType: 'Bearer',
		property: 'authed_user.access_token',
	};

	try {
		const credentialType = authenticationMethod === 'accessToken' ? 'slackApi' : 'slackOAuth2Api';
		const response = await this.helpers.requestWithAuthentication.call(
			this,
			credentialType,
			options,
			{
				oauth2: oAuth2Options,
			},
		);

		if (response.ok === false) {
			if (response.error === 'paid_teams_only') {
				throw new NodeOperationError(
					this.getNode(),
					`Your current Slack plan does not include the resource '${this.getNodeParameter(
						'resource',
						0,
					)}'`,
					{
						description: `Hint: Upgrate to the Slack plan that includes the funcionality you want to use.`,
					},
				);
			}

			throw new NodeOperationError(
				this.getNode(),
				'Slack error response: ' + JSON.stringify(response),
			);
		}

		return response;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function slackApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	method: string,
	endpoint: string,

	body: any = {},
	query: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];
	let responseData;
	query.page = 1;
	//if the endpoint uses legacy pagination use count
	//https://api.slack.com/docs/pagination#classic
	if (endpoint.includes('files.list')) {
		query.count = 100;
	} else {
		query.limit = 100;
	}
	do {
		responseData = await slackApiRequest.call(this, method, endpoint, body, query);
		query.cursor = _.get(responseData, 'response_metadata.next_cursor');
		query.page++;
		returnData.push.apply(returnData, responseData[propertyName]);
	} while (
		(responseData.response_metadata?.next_cursor !== undefined &&
			responseData.response_metadata.next_cursor !== '' &&
			responseData.response_metadata.next_cursor !== null) ||
		(responseData.paging?.pages !== undefined &&
			responseData.paging.page !== undefined &&
			responseData.paging.page < responseData.paging.pages)
	);

	return returnData;
}

export function validateJSON(json: string | undefined): any {
	let result;
	try {
		result = JSON.parse(json!);
	} catch (exception) {
		result = undefined;
	}
	return result;
}
