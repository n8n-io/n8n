import {
	OptionsWithUri,
} from 'request';

import { IDataObject } from 'n8n-workflow';

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import * as _ from 'lodash';
import * as uuid from 'uuid/v4';

export async function matrixApiRequest(this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string, resource: string, body: object = {}, query: object = {}, headers: {} | undefined = undefined, option: {} = {}): Promise<any> { // tslint:disable-line:no-any
	let options: OptionsWithUri = {
		method,
		headers: headers || {
			'Content-Type': 'application/json; charset=utf-8'
		},
		body,
		qs: query,
		uri: `https://matrix.org/_matrix/client/r0${resource}`,
		json: true
	};
	options = Object.assign({}, options, option);
	if (Object.keys(body).length === 0) {
		delete options.body;
	}
	if (Object.keys(query).length === 0) {
		delete options.qs;
	}
	try {

		let response: any; // tslint:disable-line:no-any

		const credentials = this.getCredentials('matrixApi');
		if (credentials === undefined) {
			throw new Error('No credentials got returned!');
		}
		options.headers!.Authorization = `Bearer ${credentials.accessToken}`;
		//@ts-ignore
		response = await this.helpers.request(options);
		
		return response;
	} catch (error) {
		if (error.statusCode === 401) {
			// Return a clear error
			throw new Error('Matrix credentials are not valid!');
		}

		if (error.response && error.response.body && error.response.body.error) {
			// Try to return the error prettier
			throw new Error(`Matrix error response [${error.statusCode}]: ${error.response.body.error}`);
		}

		// If that data does not exist for some reason return the actual error
		throw error;
	}
}

export async function handleMatrixCall(this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, item: IDataObject, resource: string, operation: string): Promise<any> {

	if (resource === 'account') {
		if (operation === 'whoami') {
			return await matrixApiRequest.call(this, 'GET', '/account/whoami');
		}
	}
	else if (resource === 'room') {
		if (operation === 'listMembers') {
			const roomId = this.getNodeParameter('roomId', 0) as string;
			const membership = this.getNodeParameter('membership', 0) as string;
			const notMembership = this.getNodeParameter('notMembership', 0) as string;
			const qs: IDataObject = {
				membership,
				not_membership: notMembership,
			};
			return await matrixApiRequest.call(this, 'GET', `/rooms/${roomId}/members`, {}, qs);
		} else if (operation === 'create') {
			const name = this.getNodeParameter('roomName', 0) as string;
			const preset = this.getNodeParameter('preset', 0) as string;
			const roomAlias = this.getNodeParameter('roomAlias', 0) as string;
			const body: IDataObject = {
				name,
				preset,
				room_alias_name: roomAlias,
			};
			return await matrixApiRequest.call(this, 'POST', `/createRoom`, body);
		} else if (operation === 'join') {
			const roomIdOrAlias = this.getNodeParameter('roomIdOrAlias', 0) as string;
			return await matrixApiRequest.call(this, 'POST', `/rooms/${roomIdOrAlias}/join`);
		} else if (operation === 'leave') {
			const roomId = this.getNodeParameter('roomId', 0) as string;
			return await matrixApiRequest.call(this, 'POST', `/rooms/${roomId}/leave`);
		} else if (operation === 'invite') {
			const roomId = this.getNodeParameter('roomId', 0) as string;
			const userId = this.getNodeParameter('userId', 0) as string;
			const body: IDataObject = {
				user_id: userId
			};
			return await matrixApiRequest.call(this, 'POST', `/rooms/${roomId}/invite`, body);
		} else if (operation === 'kick') {
			const roomId = this.getNodeParameter('roomId', 0) as string;
			const userId = this.getNodeParameter('userId', 0) as string;
			const reason = this.getNodeParameter('reason', 0) as string;
			const body: IDataObject = {
				user_id: userId,
				reason,
			};
			return await matrixApiRequest.call(this, 'POST', `/rooms/${roomId}/kick`, body);
		}
	} else if (resource === 'message') {
		if (operation === 'create') {
			const roomId = this.getNodeParameter('roomId', 0) as string;
			const text = this.getNodeParameter('text', 0) as string;
			const body: IDataObject = {
				msgtype: 'm.text',
				body: text,
			};
			const messageId = uuid()
			return await matrixApiRequest.call(this, 'PUT', `/rooms/${roomId}/send/m.room.message/${messageId}`, body);
		} else if (operation === 'get') {
			const roomId = this.getNodeParameter('roomId', 0) as string;
			const from = this.getNodeParameter('from', 0) as string;
			const qs: IDataObject = {
				from,
			};
			return await matrixApiRequest.call(this, 'GET', `/rooms/${roomId}/messages`, {}, qs);
		} else if (operation === 'getAll') {
			const roomId = this.getNodeParameter('roomId', 0) as string;
			const qs: IDataObject = {
				filter: JSON.stringify({
					room: {
						rooms: [roomId]
					},
				}),
			};
			return await matrixApiRequest.call(this, 'GET', `/sync`, {}, qs);
		}
	} else if (resource === 'event') {
		if (operation === 'get') {
			const roomId = this.getNodeParameter('roomId', 0) as string;
			const eventId = this.getNodeParameter('eventId', 0) as string;
			return await matrixApiRequest.call(this, 'GET', `/rooms/${roomId}/event/${eventId}`);
		}
	} else if (resource === 'sync') {
		if (operation === 'get') {
			const fullState = this.getNodeParameter('fullState', 0) as boolean;
			const since = fullState === false ? this.getNodeParameter('since', 0) : '' as string;
			const filter = this.getNodeParameter('filter', 0) as string;

			const body: IDataObject = {
				full_state: fullState,
				since,
				filter,
			};
			
			return await matrixApiRequest.call(this, 'GET', `/sync`, body);
		}
	}


	throw new Error ('Not implemented yet');
	
}
