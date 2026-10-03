import type { IDataObject } from 'n8n-workflow';

import { classifyEntry, collapseById, selectChanges } from '../../trigger/changes';
import type { DeltaFeed, SharePointEvent } from '../../trigger/changes';

describe('SharePoint trigger: delta entries', () => {
	describe('classifyEntry', () => {
		it.each([
			// Both feed shapes, because only the key's presence may be tested. The
			// drive feed sends {}, so a test on `deleted.state` would pass the list
			// row below and miss every delete on the drive feed.
			['a drive-feed tombstone', { id: '1', deleted: {} }, 'deleted'],
			['a list-feed tombstone', { id: '1', deleted: { state: 'deleted' } }, 'deleted'],
			['a changed file', { id: '1', file: {} }, 'changed'],
			// A deleted folder keeps its facet, so it can still be told apart.
			['a deleted folder', { id: '1', deleted: {}, folder: {} }, undefined],
			['a folder', { id: '1', folder: {} }, undefined],
			['the drive root', { id: '1', root: {}, folder: {} }, undefined],
			['an entry carrying neither facet', { id: '1' }, undefined],
		] as Array<[string, IDataObject, SharePointEvent | undefined]>)(
			'on the drive feed, reads %s as %s',
			(_name, entry, expected) => {
				expect(classifyEntry(entry, 'driveItem')).toBe(expected);
			},
		);

		it.each([
			// The list feed carries no file or folder facet at all, so the content
			// type is the only thing identifying a folder, alive or deleted.
			['a changed item', { id: '1', contentType: { name: 'Item' } }, 'changed'],
			['a changed document', { id: '1', contentType: { name: 'Document' } }, 'changed'],
			[
				'a deleted document',
				{ id: '1', contentType: { name: 'Document' }, deleted: { state: 'deleted' } },
				'deleted',
			],
			['a folder', { id: '1', contentType: { name: 'Folder' } }, undefined],
			[
				'a deleted folder',
				{ id: '1', contentType: { name: 'Folder' }, deleted: { state: 'deleted' } },
				undefined,
			],
			// A generic list item can arrive with no content type selected at all.
			['an item with no content type', { id: '1' }, 'changed'],
		] as Array<[string, IDataObject, SharePointEvent | undefined]>)(
			'on the list feed, reads %s as %s',
			(_name, entry, expected) => {
				expect(classifyEntry(entry, 'listItem')).toBe(expected);
			},
		);

		it.each([
			// The drive feed has no contentType and the list feed has no facets, so
			// reading the wrong one would drop or admit entries wholesale.
			['driveItem', { id: '1', contentType: { name: 'Item' } }, undefined],
			['listItem', { id: '1', file: {} }, 'changed'],
		] as Array<[DeltaFeed, IDataObject, SharePointEvent | undefined]>)(
			'on %s, ignores the other feed shape',
			(feed, entry, expected) => {
				expect(classifyEntry(entry, feed)).toBe(expected);
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
			expect(
				selectChanges([changed, deleted, folder], events, 'driveItem').map((e) => e.id),
			).toEqual(ids);
		});

		it('emits the entry exactly as the feed sent it', () => {
			const entry = {
				id: 'c',
				file: { mimeType: 'application/pdf' },
				name: 'a.pdf',
				webUrl: 'https://contoso.sharepoint.com/a.pdf',
				parentReference: { id: 'p', driveId: 'd' },
			};

			expect(selectChanges([entry], ['changed'], 'driveItem')[0]).toEqual(entry);
		});

		it('collapses a repeated id first, so one file makes one event', () => {
			const entries = [
				{ id: 'c', file: {}, name: 'v1' },
				{ id: 'c', file: {}, name: 'v2' },
			];

			expect(selectChanges(entries, ['changed'], 'driveItem')).toEqual([
				{ id: 'c', file: {}, name: 'v2' },
			]);
		});
	});
});
