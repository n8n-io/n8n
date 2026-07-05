import { describe, expect, it } from 'vitest';

import { playlistItemFields } from '../PlaylistItemDescription';

describe('YouTube Playlist Item description fields', () => {
	it('should accept arbitrary playlist IDs for add and getAll operations', () => {
		const addPlaylistField = playlistItemFields.find(
			(field) =>
				field.name === 'playlistId' && field.displayOptions?.show?.operation?.includes('add'),
		);
		const getAllPlaylistField = playlistItemFields.find(
			(field) =>
				field.name === 'playlistId' && field.displayOptions?.show?.operation?.includes('getAll'),
		);

		expect(addPlaylistField).toBeDefined();
		expect(addPlaylistField?.type).toBe('string');
		expect(addPlaylistField?.typeOptions).toBeUndefined();

		expect(getAllPlaylistField).toBeDefined();
		expect(getAllPlaylistField?.type).toBe('string');
		expect(getAllPlaylistField?.typeOptions).toBeUndefined();
	});
});
