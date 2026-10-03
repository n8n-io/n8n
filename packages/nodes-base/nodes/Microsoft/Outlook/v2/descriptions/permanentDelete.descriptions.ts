import type { INodeProperties } from 'n8n-workflow';

/** Per-resource customized description */
function getPermanentDeleteOption(description: string): INodeProperties {
	return {
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [
			{
				displayName: 'Permanent Delete',
				name: 'permanentDelete',
				type: 'boolean',
				default: false,
				description,
			},
		],
	};
}

export const calendarPermanentDelete = getPermanentDeleteOption(
	"Permanently delete a calendar folder and the events that it contains and remove them from the mailbox. Folders aren't placed in the purges folder when they're permanently deleted.",
);

export const contactPermanentDelete = getPermanentDeleteOption(
	"Permanently delete a contact and place it in the purges folder at the user's mailbox.",
);

export const draftPermanentDelete = getPermanentDeleteOption(
	"Permanently delete a draft and place it in the purges folder at the user's mailbox.",
);

export const eventPermanentDelete = getPermanentDeleteOption(
	"Permanently delete an event and place it in the purges folder at the user's mailbox.",
);

export const folderPermanentDelete = getPermanentDeleteOption(
	"Permanently delete a mail folder and remove its items from the user's mailbox. Folders aren't placed in the purges folder when they're permanently deleted.",
);

export const messagePermanentDelete = getPermanentDeleteOption(
	"Permanently delete a message and place it in the purges folder at the user's mailbox.",
);
