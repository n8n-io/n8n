import type { INodeProperties } from 'n8n-workflow';

import { properties as triggerProperties } from '../../../trigger/MessageDescription';
import { description as contactCreate } from '../../../v2/actions/contact/create.operation';
import { description as contactDelete } from '../../../v2/actions/contact/delete.operation';
import { description as contactGet } from '../../../v2/actions/contact/get.operation';
import { description as contactGetAll } from '../../../v2/actions/contact/getAll.operation';
import { description as contactUpdate } from '../../../v2/actions/contact/update.operation';
import { description as draftCreate } from '../../../v2/actions/draft/create.operation';
import { description as draftDelete } from '../../../v2/actions/draft/delete.operation';
import { description as draftGet } from '../../../v2/actions/draft/get.operation';
import { description as draftUpdate } from '../../../v2/actions/draft/update.operation';
import { description as eventCreate } from '../../../v2/actions/event/create.operation';
import { description as eventDelete } from '../../../v2/actions/event/delete.operation';
import { description as eventGet } from '../../../v2/actions/event/get.operation';
import { description as eventGetAll } from '../../../v2/actions/event/getAll.operation';
import { description as eventUpdate } from '../../../v2/actions/event/update.operation';
import { description as folderMessageGetAll } from '../../../v2/actions/folderMessage/getAll.operation';
import { description as messageDelete } from '../../../v2/actions/message/delete.operation';
import { description as messageGet } from '../../../v2/actions/message/get.operation';
import { description as messageGetAll } from '../../../v2/actions/message/getAll.operation';
import { description as messageMove } from '../../../v2/actions/message/move.operation';
import { description as messageReply } from '../../../v2/actions/message/reply.operation';
import { description as messageUpdate } from '../../../v2/actions/message/update.operation';
import { description as attachmentAdd } from '../../../v2/actions/messageAttachment/add.operation';
import { description as attachmentDownload } from '../../../v2/actions/messageAttachment/download.operation';
import { description as attachmentGet } from '../../../v2/actions/messageAttachment/get.operation';
import { description as attachmentGetAll } from '../../../v2/actions/messageAttachment/getAll.operation';
import { immutableIdsOption } from '../../../v2/descriptions';

const hasImmutableIdsOption = (properties: INodeProperties[]) =>
	properties.some(
		(property) =>
			property.name === 'options' &&
			property.type === 'collection' &&
			(property.options as INodeProperties[] | undefined)?.some(
				(option) => option.name === 'immutableIds',
			),
	);

const supportedOperations: Array<{ name: string; description: INodeProperties[] }> = [
	{ name: 'Contact: Create', description: contactCreate },
	{ name: 'Contact: Delete', description: contactDelete },
	{ name: 'Contact: Get', description: contactGet },
	{ name: 'Contact: Get Many', description: contactGetAll },
	{ name: 'Contact: Update', description: contactUpdate },
	{ name: 'Draft: Create', description: draftCreate },
	{ name: 'Draft: Delete', description: draftDelete },
	{ name: 'Draft: Get', description: draftGet },
	{ name: 'Draft: Update', description: draftUpdate },
	{ name: 'Event: Create', description: eventCreate },
	{ name: 'Event: Delete', description: eventDelete },
	{ name: 'Event: Get', description: eventGet },
	{ name: 'Event: Get Many', description: eventGetAll },
	{ name: 'Event: Update', description: eventUpdate },
	{ name: 'Folder Message: Get Many', description: folderMessageGetAll },
	{ name: 'Message: Delete', description: messageDelete },
	{ name: 'Message: Get', description: messageGet },
	{ name: 'Message: Get Many', description: messageGetAll },
	{ name: 'Message: Move', description: messageMove },
	{ name: 'Message: Reply', description: messageReply },
	{ name: 'Message: Update', description: messageUpdate },
	{ name: 'Message Attachment: Add', description: attachmentAdd },
	{ name: 'Message Attachment: Download', description: attachmentDownload },
	{ name: 'Message Attachment: Get', description: attachmentGet },
	{ name: 'Message Attachment: Get Many', description: attachmentGetAll },
	{ name: 'Outlook Trigger', description: triggerProperties },
];

describe('Microsoft Outlook immutable IDs option', () => {
	it('uses the expected label and description', () => {
		expect(immutableIdsOption.displayName).toBe('Immutable IDs');
		expect(immutableIdsOption.description).toBe('Whether to enable immutable IDs');
		expect(immutableIdsOption.default).toBe(false);
	});

	it.each(supportedOperations)('exposes the option for $name', ({ description }) => {
		expect(hasImmutableIdsOption(description)).toBe(true);
	});
});
