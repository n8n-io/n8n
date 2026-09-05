/**
 * GraphQL response fixtures for the item workflow tests, shaped like real
 * monday.com API payloads (data under `data`, errors omitted on success).
 */

export const createItemResponse = {
	data: {
		create_item: {
			id: '201',
			name: 'New Item',
			url: 'https://acme.monday.com/boards/123/pulses/201',
			state: 'active',
			board: { id: '123', name: 'CRM' },
			group: { id: 'topics', title: 'Topics' },
			column_values: [],
		},
	},
};

export const updateItemResponse = {
	data: {
		change_multiple_column_values: {
			id: '11',
			name: 'My Item',
			url: 'https://acme.monday.com/boards/123/pulses/11',
			state: 'active',
			board: { id: '123', name: 'CRM' },
			group: { id: 'topics', title: 'Topics' },
			column_values: [{ id: 'text_1', type: 'text', text: 'hi', value: '"hi"' }],
		},
	},
};

export const getItemResponse = {
	data: {
		items: [
			{
				id: '11',
				name: 'My Item',
				state: 'active',
				url: 'https://acme.monday.com/boards/123/pulses/11',
				created_at: '2026-01-01T00:00:00Z',
				updated_at: '2026-01-02T00:00:00Z',
				board: { id: '123', name: 'CRM' },
				group: { id: 'topics', title: 'Topics' },
				parent_item: null,
				column_values: [
					{
						id: 'text_1',
						type: 'text',
						text: 'hello',
						value: '"hello"',
						column: { title: 'Notes' },
					},
					{
						id: 'status',
						type: 'status',
						text: 'Done',
						value: '{"index":1}',
						column: { title: 'Status' },
					},
				],
			},
		],
	},
};

export const getItemsResponse = {
	data: {
		boards: [
			{
				items_page: {
					cursor: null,
					items: [
						{
							id: '11',
							name: 'My Item',
							state: 'active',
							url: 'https://acme.monday.com/boards/123/pulses/11',
							created_at: '2026-01-01T00:00:00Z',
							updated_at: '2026-01-02T00:00:00Z',
							group: { id: 'topics', title: 'Topics' },
							column_values: [{ id: 'text_1', type: 'text', text: 'hello', value: '"hello"' }],
						},
						{
							id: '12',
							name: 'Second Item',
							state: 'active',
							url: 'https://acme.monday.com/boards/123/pulses/12',
							created_at: '2026-01-03T00:00:00Z',
							updated_at: '2026-01-03T00:00:00Z',
							group: { id: 'topics', title: 'Topics' },
							column_values: [],
						},
					],
				},
			},
		],
	},
};

export const archiveItemResponse = {
	data: {
		archive_item: {
			id: '11',
			name: 'My Item',
			state: 'archived',
		},
	},
};
