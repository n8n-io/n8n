import { READ_ONLY_ANNOTATIONS, resolveNodeAnnotations } from 'n8n-workflow';

import { versionDescription } from '../../v2/actions/versionDescription';

describe('GoogleSheetsV2, annotations', () => {
	it.each([
		[{}, READ_ONLY_ANNOTATIONS],
		[{ resource: 'sheet', operation: 'read' }, READ_ONLY_ANNOTATIONS],
		[
			{ resource: 'sheet', operation: 'append' },
			{ effect: 'write', destructive: false, idempotent: false },
		],
		[
			{ resource: 'sheet', operation: 'update' },
			{ effect: 'write', destructive: true, idempotent: true },
		],
		[
			{ resource: 'sheet', operation: 'appendOrUpdate' },
			{ effect: 'write', destructive: true, idempotent: false },
		],
		[
			{ resource: 'sheet', operation: 'clear' },
			{ effect: 'write', destructive: true, idempotent: true },
		],
		[
			{ resource: 'sheet', operation: 'remove' },
			{ effect: 'write', destructive: true, idempotent: false },
		],
		[
			{ resource: 'spreadsheet', operation: 'deleteSpreadsheet' },
			{ effect: 'write', destructive: true, idempotent: false },
		],
		[
			{ resource: 'sheet', operation: 'delete' },
			{ effect: 'write', destructive: true, idempotent: false },
		],
		[
			{ resource: 'spreadsheet', operation: 'create' },
			{ effect: 'write', destructive: false, idempotent: false },
		],
	])('should resolve %j', (parameters, expected) => {
		expect(resolveNodeAnnotations(versionDescription, { parameters, typeVersion: 4.7 })).toEqual(
			expected,
		);
	});
});
