import {
	NodeConnectionTypes,
	NodeOperationError,
	jsonParse,
	type IDataObject,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeBaseDescription,
	type INodeTypeDescription,
} from 'n8n-workflow';

import { allFields, allOperations, resourceProperty } from './descriptions';
import { sevenApiRequest, sevenApiRequestAllItems } from './GenericFunctions';

const versionDescription: INodeTypeDescription = {
	displayName: 'seven',
	name: 'sms77',
	icon: 'file:seven.svg',
	group: ['transform'],
	version: 2,
	subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
	description: 'Send SMS, RCS, WhatsApp, voice messages and manage seven resources',
	defaults: {
		name: 'seven',
	},
	usableAsTool: true,
	inputs: [NodeConnectionTypes.Main],
	outputs: [NodeConnectionTypes.Main],
	credentials: [
		{
			name: 'sms77Api',
			required: true,
		},
	],
	properties: [resourceProperty, ...allOperations, ...allFields],
};

export class Sms77V2 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			...versionDescription,
		};
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];

		for (let i = 0; i < items.length; i++) {
			const resource = this.getNodeParameter('resource', i);
			const operation = this.getNodeParameter('operation', i);

			let responseData: IDataObject | IDataObject[] | undefined;

			try {
				if (resource === 'sms') {
					if (operation === 'send') {
						const additionalFields = this.getNodeParameter('additionalFields', i, {});
						const body: IDataObject = {
							to: this.getNodeParameter('to', i),
							text: this.getNodeParameter('text', i),
							...additionalFields,
						};
						responseData = await sevenApiRequest.call(this, 'POST', '/sms', body);
					} else if (operation === 'delete') {
						const ids = (this.getNodeParameter('ids', i) as string)
							.split(',')
							.map((id) => id.trim())
							.filter(Boolean);
						responseData = await sevenApiRequest.call(this, 'DELETE', '/sms', { ids });
					}
				} else if (resource === 'voice') {
					if (operation === 'send') {
						const additionalFields = this.getNodeParameter('additionalFields', i, {});
						const body: IDataObject = {
							to: this.getNodeParameter('to', i),
							text: this.getNodeParameter('text', i),
							...additionalFields,
						};
						responseData = await sevenApiRequest.call(this, 'POST', '/voice', body);
					} else if (operation === 'hangup') {
						const callId = this.getNodeParameter('callId', i) as string;
						responseData = await sevenApiRequest.call(
							this,
							'POST',
							`/voice/${encodeURIComponent(callId)}/hangup`,
						);
					}
				} else if (resource === 'rcs') {
					if (operation === 'send') {
						const additionalFields = this.getNodeParameter('additionalFields', i, {});
						const richContent = additionalFields.richContent;
						delete additionalFields.richContent;

						const body: IDataObject = {
							to: this.getNodeParameter('to', i),
							text: richContent ?? this.getNodeParameter('text', i),
							...additionalFields,
						};
						responseData = await sevenApiRequest.call(this, 'POST', '/rcs/messages', body);
					} else if (operation === 'delete') {
						const messageId = this.getNodeParameter('messageId', i) as string;
						responseData = await sevenApiRequest.call(
							this,
							'DELETE',
							`/rcs/messages/${encodeURIComponent(messageId)}`,
						);
					} else if (operation === 'sendEvent') {
						const additionalFields = this.getNodeParameter('additionalFields', i, {});
						const body: IDataObject = {
							to: this.getNodeParameter('to', i),
							event: this.getNodeParameter('event', i),
							...additionalFields,
						};
						responseData = await sevenApiRequest.call(this, 'POST', '/rcs/events', body);
					}
				} else if (resource === 'whatsapp') {
					if (operation === 'send') {
						responseData = await executeWhatsAppSend.call(this, i);
					} else if (operation === 'delete') {
						const messageId = this.getNodeParameter('messageId', i) as string;
						responseData = await sevenApiRequest.call(
							this,
							'DELETE',
							`/waba/messages/${encodeURIComponent(messageId)}`,
						);
					} else if (operation === 'sendEvent') {
						responseData = await executeWhatsAppEvent.call(this, i);
					}
				} else if (resource === 'lookup') {
					const phoneNumber = this.getNodeParameter('number', i) as string;
					const qs: IDataObject = { number: phoneNumber };
					if (operation === 'rcs') {
						const from = this.getNodeParameter('from', i, '') as string;
						if (from) qs.from = from;
					}
					responseData = await sevenApiRequest.call(this, 'GET', `/lookup/${operation}`, {}, qs);
				} else if (resource === 'account') {
					if (operation === 'getBalance') {
						responseData = await sevenApiRequest.call(this, 'GET', '/balance');
					} else if (operation === 'getPricing') {
						const country = this.getNodeParameter('country', i, '') as string;
						const format = this.getNodeParameter('format', i, 'json') as string;
						const qs: IDataObject = { format };
						if (country) qs.country = country;
						responseData = await sevenApiRequest.call(this, 'GET', '/pricing', {}, qs);
					} else if (operation === 'getAnalytics') {
						const filters = this.getNodeParameter('filters', i, {});
						responseData = await sevenApiRequest.call(this, 'GET', '/analytics', {}, filters);
					}
				} else if (resource === 'journal') {
					const path = {
						getOutbound: '/journal/outbound',
						getInbound: '/journal/inbound',
						getVoice: '/journal/voice',
					}[operation];
					if (!path) {
						throw new NodeOperationError(this.getNode(), `Unknown journal operation: ${operation}`);
					}
					const filters = this.getNodeParameter('filters', i, {});
					responseData = await sevenApiRequest.call(this, 'GET', path, {}, filters);
				} else if (resource === 'senderId') {
					if (operation === 'validateForVoice') {
						const body: IDataObject = {
							number: this.getNodeParameter('number', i),
						};
						const callbackUrl = this.getNodeParameter('callback', i, '') as string;
						if (callbackUrl) body.callback = callbackUrl;
						responseData = await sevenApiRequest.call(this, 'POST', '/validate_for_voice', body);
					}
				} else if (resource === 'number') {
					responseData = await executeNumberOperation.call(this, operation, i);
				} else if (resource === 'contact') {
					responseData = await executeContactOperation.call(this, operation, i);
				} else if (resource === 'group') {
					responseData = await executeGroupOperation.call(this, operation, i);
				} else if (resource === 'subaccount') {
					responseData = await executeSubaccountOperation.call(this, operation, i);
				}

				if (Array.isArray(responseData)) {
					returnData.push.apply(returnData, responseData);
				} else if (responseData !== undefined && responseData !== null) {
					returnData.push(responseData);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: (error as Error).message });
					continue;
				}
				throw error;
			}
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}

async function executeWhatsAppSend(
	this: IExecuteFunctions,
	i: number,
): Promise<IDataObject | IDataObject[]> {
	const type = this.getNodeParameter('type', i) as string;
	const additionalFields = this.getNodeParameter('additionalFields', i, {});

	const body: IDataObject = {
		from: this.getNodeParameter('from', i),
		to: this.getNodeParameter('to', i),
		type,
		...additionalFields,
	};

	if (type === 'text') {
		body.text = this.getNodeParameter('text', i);
	} else if (type === 'template') {
		body.template = this.getNodeParameter('template', i);
		body.language = this.getNodeParameter('language', i);
		const components = this.getNodeParameter('components', i, '') as string;
		if (components) {
			body.components =
				typeof components === 'string' ? jsonParse<IDataObject>(components) : components;
		}
	} else if (['image', 'video', 'audio', 'document', 'sticker'].includes(type)) {
		body.url = this.getNodeParameter('url', i);
		const caption = this.getNodeParameter('caption', i, '') as string;
		if (caption && type !== 'audio' && type !== 'sticker') body.caption = caption;
		if (type === 'document') body.filename = this.getNodeParameter('filename', i);
	} else if (type === 'location') {
		body.latitude = this.getNodeParameter('latitude', i);
		body.longitude = this.getNodeParameter('longitude', i);
		const locName = this.getNodeParameter('locationName', i, '') as string;
		const address = this.getNodeParameter('address', i, '') as string;
		if (locName) body.name = locName;
		if (address) body.address = address;
	} else if (type === 'contacts') {
		const contacts = this.getNodeParameter('contacts', i) as string;
		body.contacts = typeof contacts === 'string' ? jsonParse<IDataObject[]>(contacts) : contacts;
	} else if (type === 'interactive') {
		const interactive = this.getNodeParameter('interactive', i) as string;
		const parsed =
			typeof interactive === 'string' ? jsonParse<IDataObject>(interactive) : interactive;
		Object.assign(body, parsed);
	}

	return await sevenApiRequest.call(this, 'POST', '/waba/messages', body);
}

async function executeWhatsAppEvent(
	this: IExecuteFunctions,
	i: number,
): Promise<IDataObject | IDataObject[]> {
	const event = this.getNodeParameter('event', i) as string;
	const body: IDataObject = {
		from: this.getNodeParameter('from', i),
		event,
	};

	if (event === 'reaction') {
		body.message_id = this.getNodeParameter('eventMsgId', i);
		body.emoji = this.getNodeParameter('emoji', i);
	} else {
		const to = this.getNodeParameter('eventTo', i, '') as string;
		const msgId = this.getNodeParameter('eventMsgId', i, '') as string;
		if (to) body.to = to;
		if (msgId) body.msg_id = msgId;
	}

	return await sevenApiRequest.call(this, 'POST', '/waba/events', body);
}

async function executeNumberOperation(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<IDataObject | IDataObject[]> {
	if (operation === 'getAvailable') {
		const filters = this.getNodeParameter('filters', i, {});
		return (await sevenApiRequest.call(
			this,
			'GET',
			'/numbers/available',
			{},
			filters,
		)) as IDataObject;
	}
	if (operation === 'order') {
		const body: IDataObject = {
			number: this.getNodeParameter('number', i),
			payment_interval: this.getNodeParameter('payment_interval', i, 'annually'),
		};
		return (await sevenApiRequest.call(this, 'POST', '/numbers/order', body)) as IDataObject;
	}
	if (operation === 'getActive') {
		return (await sevenApiRequest.call(this, 'GET', '/numbers/active')) as IDataObject;
	}
	const phoneNumber = this.getNodeParameter('number', i) as string;
	const numberPath = `/numbers/active/${encodeURIComponent(phoneNumber)}`;
	if (operation === 'get') {
		return (await sevenApiRequest.call(this, 'GET', numberPath)) as IDataObject;
	}
	if (operation === 'update') {
		const updateFields = this.getNodeParameter('updateFields', i, {});
		const body: IDataObject = { ...updateFields };
		if (typeof body.sms_forward === 'string' && body.sms_forward) {
			body.sms_forward = body.sms_forward
				.split(',')
				.map((s) => s.trim())
				.filter(Boolean);
		}
		if (typeof body.email_forward === 'string' && body.email_forward) {
			body.email_forward = body.email_forward
				.split(',')
				.map((s) => s.trim())
				.filter(Boolean);
		}
		return (await sevenApiRequest.call(this, 'PATCH', numberPath, body)) as IDataObject;
	}
	if (operation === 'delete') {
		const deleteImmediately = this.getNodeParameter('delete_immediately', i, false) as boolean;
		return (await sevenApiRequest.call(this, 'DELETE', numberPath, {
			delete_immediately: deleteImmediately,
		})) as IDataObject;
	}
	throw new NodeOperationError(this.getNode(), `Unknown number operation: ${operation}`);
}

async function executeContactOperation(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<IDataObject | IDataObject[]> {
	if (operation === 'getAll') {
		const filters = this.getNodeParameter('filters', i, {});
		const returnAll = this.getNodeParameter('returnAll', i, false);
		const qs: IDataObject = { ...filters };
		if (returnAll) {
			return await sevenApiRequestAllItems.call(this, 'GET', '/contacts', {}, qs);
		}
		qs.limit = this.getNodeParameter('limit', i, 30);
		const response = (await sevenApiRequest.call(this, 'GET', '/contacts', {}, qs)) as IDataObject;
		return Array.isArray(response) ? response : ((response.data as IDataObject[]) ?? response);
	}
	if (operation === 'create') {
		const payload = this.getNodeParameter('contactPayload', i, {}) as IDataObject;
		const body = normalizeContactPayload(payload);
		return (await sevenApiRequest.call(this, 'POST', '/contacts', body)) as IDataObject;
	}
	const contactId = this.getNodeParameter('contactId', i) as string;
	const path = `/contacts/${encodeURIComponent(contactId)}`;
	if (operation === 'get') {
		return (await sevenApiRequest.call(this, 'GET', path)) as IDataObject;
	}
	if (operation === 'update') {
		const payload = this.getNodeParameter('contactPayload', i, {}) as IDataObject;
		const body = normalizeContactPayload(payload);
		return (await sevenApiRequest.call(this, 'PATCH', path, body)) as IDataObject;
	}
	if (operation === 'delete') {
		return (await sevenApiRequest.call(this, 'DELETE', path)) as IDataObject;
	}
	throw new NodeOperationError(this.getNode(), `Unknown contact operation: ${operation}`);
}

function normalizeContactPayload(payload: IDataObject): IDataObject {
	const body: IDataObject = { ...payload };
	if (typeof body.groups === 'string' && body.groups) {
		body.groups = body.groups
			.split(',')
			.map((s) => Number(s.trim()))
			.filter((n) => !Number.isNaN(n));
	}
	return body;
}

async function executeGroupOperation(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<IDataObject | IDataObject[]> {
	if (operation === 'getAll') {
		const returnAll = this.getNodeParameter('returnAll', i, false);
		if (returnAll) {
			return await sevenApiRequestAllItems.call(this, 'GET', '/groups');
		}
		const limit = this.getNodeParameter('limit', i, 50);
		return (await sevenApiRequest.call(this, 'GET', '/groups', {}, { limit })) as IDataObject;
	}
	if (operation === 'create') {
		return (await sevenApiRequest.call(this, 'POST', '/groups', {
			name: this.getNodeParameter('name', i),
		})) as IDataObject;
	}
	const groupId = this.getNodeParameter('groupId', i) as string;
	const path = `/groups/${encodeURIComponent(groupId)}`;
	if (operation === 'get') {
		return (await sevenApiRequest.call(this, 'GET', path)) as IDataObject;
	}
	if (operation === 'update') {
		const groupName = this.getNodeParameter('name', i, '') as string;
		const body: IDataObject = {};
		if (groupName) body.name = groupName;
		return (await sevenApiRequest.call(this, 'PATCH', path, body)) as IDataObject;
	}
	if (operation === 'delete') {
		const deleteContacts = this.getNodeParameter('delete_contacts', i, false) as boolean;
		return (await sevenApiRequest.call(this, 'DELETE', path, {
			delete_contacts: deleteContacts,
		})) as IDataObject;
	}
	throw new NodeOperationError(this.getNode(), `Unknown group operation: ${operation}`);
}

async function executeSubaccountOperation(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<IDataObject | IDataObject[]> {
	// seven uses /api/subaccounts?action=<verb> for everything
	const baseQs = (action: string): IDataObject => ({ action });

	if (operation === 'getAll') {
		const id = this.getNodeParameter('subaccountId', i, '') as string;
		const qs = baseQs('read');
		if (id) qs.id = id;
		return (await sevenApiRequest.call(this, 'GET', '/subaccounts', {}, qs)) as IDataObject;
	}
	if (operation === 'create') {
		const body: IDataObject = {
			name: this.getNodeParameter('name', i),
			email: this.getNodeParameter('email', i),
		};
		return (await sevenApiRequest.call(
			this,
			'POST',
			'/subaccounts',
			body,
			baseQs('create'),
		)) as IDataObject;
	}
	if (operation === 'setAutoTransfer') {
		const body: IDataObject = {
			id: this.getNodeParameter('subaccountId', i),
			threshold: this.getNodeParameter('threshold', i),
			amount: this.getNodeParameter('amount', i),
		};
		return (await sevenApiRequest.call(
			this,
			'POST',
			'/subaccounts',
			body,
			baseQs('update'),
		)) as IDataObject;
	}
	if (operation === 'transferCredits') {
		const body: IDataObject = {
			id: this.getNodeParameter('subaccountId', i),
			amount: this.getNodeParameter('amount', i),
		};
		return (await sevenApiRequest.call(
			this,
			'POST',
			'/subaccounts',
			body,
			baseQs('transfer_credits'),
		)) as IDataObject;
	}
	if (operation === 'delete') {
		const body: IDataObject = {
			id: this.getNodeParameter('subaccountId', i),
		};
		return (await sevenApiRequest.call(
			this,
			'POST',
			'/subaccounts',
			body,
			baseQs('delete'),
		)) as IDataObject;
	}
	throw new NodeOperationError(this.getNode(), `Unknown subaccount operation: ${operation}`);
}
