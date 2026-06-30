import type { INodeProperties } from 'n8n-workflow';

/**
 * Mailbox target for the app-only Service Principal credential. Self-contained
 * (no import from any other Microsoft node) and spread into both the Outlook node
 * and the trigger. Only this mailbox field is shared; the auth option, the
 * `credentials[]` entry, and the `servicePrincipalNotice` are declared by hand in
 * each node/trigger file.
 *
 * Shown (and required) only when the Service Principal credential is selected.
 * Uses ID mode only (no `searchListMethod`) so rendering needs no Directory read
 * permission — the user pastes the UPN or user object ID.
 */
export const mailboxRLC: INodeProperties = {
	displayName: 'Mailbox',
	name: 'mailbox',
	type: 'resourceLocator',
	default: { mode: 'id', value: '' },
	required: true,
	description: 'The mailbox the Service Principal should act on',
	modes: [
		{
			displayName: 'By ID',
			name: 'id',
			type: 'string',
			placeholder: 'e.g. jane@contoso.com or a user object ID',
			hint: 'The user principal name (UPN) or object ID of the mailbox to access. App-only Microsoft Graph has no personal mailbox to default to.',
		},
	],
	displayOptions: {
		show: {
			authentication: ['microsoftEntraServicePrincipalApi'],
		},
	},
};

export const mailboxDescription: INodeProperties[] = [mailboxRLC];
