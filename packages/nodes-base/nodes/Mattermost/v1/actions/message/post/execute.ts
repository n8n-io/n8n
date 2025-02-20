import type { IExecuteFunctions, IDataObject, INodeExecutionData } from 'n8n-workflow';

import { apiRequest } from '../../../transport';
import type { IAttachment } from '../../Interfaces';

export async function post(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {
	const body = {} as IDataObject;
	const qs = {} as IDataObject;
	const requestMethod = 'POST';
	const endpoint = 'posts';

	body.channel_id = this.getNodeParameter('channelId', index) as string;
	body.message = this.getNodeParameter('message', index) as string;

	const attachments = this.getNodeParameter('attachments', index, []) as unknown as IAttachment[];
	// The node does save the fields data differently than the API
	// expects so fix the data befre we send the request
	for (const attachment of attachments) {
		if (attachment.fields !== undefined) {
			if (attachment.fields.item !== undefined) {
				// Move the field-content up
				// @ts-ignore
				attachment.fields = attachment.fields.item;
			} else {
				// If it does not have any items set remove it
				// @ts-ignore
				delete attachment.fields;
			}
		}
	}

	for (const attachment of attachments) {
		if (attachment.actions !== undefined) {
			if (attachment.actions.item !== undefined) {
				// Move the field-content up
				// @ts-ignore
				attachment.actions = attachment.actions.item;
			} else {
				// If it does not have any items set remove it
				// @ts-ignore
				delete attachment.actions;
			}
		}
	}

	for (const attachment of attachments) {
		if (Array.isArray(attachment.actions)) {
			for (const attaction of attachment.actions) {
				if (attaction.type === 'button') {
					delete attaction.type;
				}
				if (attaction.data_source === 'custom') {
					delete attaction.data_source;
				}
				if (attaction.options) {
					attaction.options = attaction.options.option;
				}

				if (attaction.integration.item !== undefined) {
					attaction.integration = attaction.integration.item;
					if (Array.isArray(attaction.integration.context.property)) {
						const tmpcontex = {};
						for (const attactionintegprop of attaction.integration.context.property) {
							Object.assign(tmpcontex, { [attactionintegprop.name]: attactionintegprop.value });
						}
						delete attaction.integration.context;
						attaction.integration.context = tmpcontex;
					}
				}
			}
		}
	}

	body.props = {
		attachments,
	};

	// Add all the other options to the request
	const otherOptions = this.getNodeParameter('otherOptions', index) as IDataObject;
	Object.assign(body, otherOptions);

	const responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);

	return this.helpers.returnJsonArray(responseData as IDataObject[]);
}
