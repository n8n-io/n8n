import { formatBlocks } from '../../v3/helpers/utils';

describe('Notion V3 utils', () => {
	describe('formatBlocks', () => {
		it('formats numeric textContent values for regular text-bearing blocks', () => {
			const result = formatBlocks([
				{
					type: 'paragraph',
					textContent: 123,
				},
			]);

			expect(result).toEqual([
				{
					object: 'block',
					type: 'paragraph',
					paragraph: {
						rich_text: [{ text: { content: '123' } }],
					},
				},
			]);
		});

		it('formats numeric textContent values for to-do blocks', () => {
			const result = formatBlocks([
				{
					type: 'to_do',
					checked: true,
					textContent: 456,
				},
			]);

			expect(result).toEqual([
				{
					object: 'block',
					type: 'to_do',
					to_do: {
						checked: true,
						rich_text: [{ text: { content: '456' } }],
					},
				},
			]);
		});
	});
});
