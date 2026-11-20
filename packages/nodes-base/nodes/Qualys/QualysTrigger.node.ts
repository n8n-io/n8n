import {
	NodeConnectionTypes,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
	type IPollFunctions,
} from 'n8n-workflow';

import { authenticationProperties, qualysCredentials } from './transport/authentication';
import { triggerProperties } from './trigger/events';
import { poll } from './trigger/poll';

/**
 * Polling trigger for the VMDR platform API.
 *
 * Qualys has no outbound webhook for these collections, so the only way to
 * react to a detection or a scan is to ask on an interval. Each poll reads the
 * slice of time since the last one, using the "changed since" parameter the
 * endpoint documents, rather than re-reading the collection and diffing it.
 */
export class QualysTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Qualys Trigger',
		name: 'qualysTrigger',
		group: ['trigger'],
		icon: { light: 'file:qualys.svg', dark: 'file:qualys.dark.svg' },
		version: 1,
		subtitle: '={{ $parameter["event"] }}',
		description: 'Start a workflow when Qualys VMDR reports a change',
		defaults: {
			name: 'Qualys Trigger',
		},
		polling: true,
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: qualysCredentials,
		properties: [...authenticationProperties, ...triggerProperties],
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		return await poll.call(this);
	}
}
