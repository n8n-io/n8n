import type { INodeProperties } from 'n8n-workflow';

import { accountFields, accountOperations } from './AccountDescription';
import { contactFields, contactOperations } from './ContactDescription';
import { groupFields, groupOperations } from './GroupDescription';
import { journalFields, journalOperations } from './JournalDescription';
import { lookupFields, lookupOperations } from './LookupDescription';
import { numberFields, numberOperations } from './NumberDescription';
import { rcsFields, rcsOperations } from './RcsDescription';
import { senderIdFields, senderIdOperations } from './SenderIdDescription';
import { smsFields, smsOperations } from './SmsDescription';
import { subaccountFields, subaccountOperations } from './SubaccountDescription';
import { voiceFields, voiceOperations } from './VoiceDescription';
import { whatsappFields, whatsappOperations } from './WhatsAppDescription';

export const resourceProperty: INodeProperties = {
	displayName: 'Resource',
	name: 'resource',
	type: 'options',
	noDataExpression: true,

	options: [
		{ name: 'Account', value: 'account' },
		{ name: 'Contact', value: 'contact' },
		{ name: 'Group', value: 'group' },
		{ name: 'Journal', value: 'journal' },
		{ name: 'Lookup', value: 'lookup' },
		{ name: 'Number', value: 'number' },
		// eslint-disable-next-line n8n-nodes-base/node-param-resource-with-plural-option
		{ name: 'RCS', value: 'rcs' },
		{ name: 'Sender Identifier', value: 'senderId' },
		{ name: 'SMS', value: 'sms' },
		{ name: 'Subaccount', value: 'subaccount' },
		{ name: 'Voice', value: 'voice' },
		{ name: 'WhatsApp', value: 'whatsapp' },
	],
	default: 'sms',
};

export const allOperations: INodeProperties[] = [
	...smsOperations,
	...voiceOperations,
	...rcsOperations,
	...whatsappOperations,
	...lookupOperations,
	...accountOperations,
	...journalOperations,
	...senderIdOperations,
	...numberOperations,
	...contactOperations,
	...groupOperations,
	...subaccountOperations,
];

export const allFields: INodeProperties[] = [
	...smsFields,
	...voiceFields,
	...rcsFields,
	...whatsappFields,
	...lookupFields,
	...accountFields,
	...journalFields,
	...senderIdFields,
	...numberFields,
	...contactFields,
	...groupFields,
	...subaccountFields,
];
