import type { INodeProperties, INodePropertyOptions } from 'n8n-workflow';

import { messageOperations } from '../v2/MessageDescription';
import { threadOperations } from '../v2/ThreadDescription';

const removeLabelsHint = (operations: INodeProperties[]) =>
	operations
		.flatMap((property) => (property.options ?? []) as INodePropertyOptions[])
		.find((option) => option.value === 'removeLabels')?.builderHint?.propertyHint ?? '';

describe('Gmail archive hint', () => {
	it.each([
		['message', messageOperations],
		['thread', threadOperations],
	])('tells the builder that removing INBOX archives a %s', (_resource, operations) => {
		const hint = removeLabelsHint(operations);

		expect(hint).toContain("labelIds: ['INBOX']");
		expect(hint).toContain('no archive operation');
		expect(hint).toContain('no ARCHIVE label');
	});
});
