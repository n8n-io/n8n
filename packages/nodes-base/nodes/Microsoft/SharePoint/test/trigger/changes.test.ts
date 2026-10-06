import type { IDataObject } from 'n8n-workflow';

import { classifyEntry, collapseById, selectChanges } from '../../trigger/changes';
import type { SharePointEvent } from '../../trigger/changes';

describe('SharePoint trigger: delta entries', () => {
	describe('classifyEntry', () => {
		it.each([
			// Both feed shapes, because only the key's presence may be tested. The
			// drive feed sends {}, so a test on `deleted.state` would pass the list
			// row below and miss every delete on the drive feed.
			['a drive-feed tombstone', 'deleted', { id: '1', deleted: {} }],
			['a list-feed tombstone', 'deleted', { id: '1', deleted: { state: 'deleted' } }],
			['a changed file', 'changed', { id: '1', file: {} }],
			// A deleted folder keeps its facet, so it can still be told apart.
			['a deleted folder', undefined, { id: '1', deleted: {}, folder: {} }],
			['a folder', undefined, { id: '1', folder: {} }],
			['the drive root', undefined, { id: '1', root: {}, folder: {} }],
			['an entry carrying neither facet', undefined, { id: '1' }],
		] as Array<[string, SharePointEvent | undefined, IDataObject]>)(
			'reads %s as %s',
			(_name, expected, entry) => {
				expect(classifyEntry(entry)).toBe(expected);
			},
		);
	});

	describe('collapseById', () => {
		it('keeps the last entry for a repeated id', () => {
			const first = { id: 'a', name: 'one.txt', file: {} };
			const other = { id: 'b', file: {} };
			const last = { id: 'a', name: 'two.txt', file: {} };

			expect(collapseById([first, other, last])).toEqual([last, other]);
		});

		it('passes through an entry with no usable id rather than losing it', () => {
			const unkeyed = { file: {}, name: 'orphan.txt' };

			expect(collapseById([{ id: 'a', file: {} }, unkeyed])).toContainEqual(unkeyed);
		});
	});

	describe('selectChanges', () => {
		const changed = { id: 'c', file: {} };
		const deleted = { id: 'd', deleted: {} };
		const folder = { id: 'f', folder: {} };

		it.each([
			[
				['changed', 'deleted'],
				['c', 'd'],
			],
			[['changed'], ['c']],
			[['deleted'], ['d']],
			[[], []],
		] as Array<[SharePointEvent[], string[]]>)('with %j selected, emits %j', (events, ids) => {
			expect(selectChanges([changed, deleted, folder], events).map((e) => e.id)).toEqual(ids);
		});

		it('emits the entry exactly as the feed sent it', () => {
			const entry = {
				id: 'c',
				file: { mimeType: 'application/pdf' },
				name: 'a.pdf',
				webUrl: 'https://contoso.sharepoint.com/a.pdf',
				parentReference: { id: 'p', driveId: 'd' },
			};

			expect(selectChanges([entry], ['changed'])[0]).toEqual(entry);
		});

		it('collapses a repeated id first, so one file makes one event', () => {
			const entries = [
				{ id: 'c', file: {}, name: 'v1' },
				{ id: 'c', file: {}, name: 'v2' },
			];

			expect(selectChanges(entries, ['changed'])).toEqual([{ id: 'c', file: {}, name: 'v2' }]);
		});
	});
});
