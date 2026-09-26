import { searchDocs, searchTables } from '../../GenericFunctions';
import { createLoadOptionsFunctions } from './helpers';

describe('Grist Node', () => {
	describe('List search', () => {
		describe('searchDocs', () => {
			const request = vi.fn();

			beforeEach(() => {
				request
					.mockReset()
					.mockResolvedValueOnce([{ id: 1 }, { id: 2 }])
					.mockResolvedValueOnce([
						{
							docs: [
								{ id: 'docZ', name: 'Zebra' },
								{ id: 'docA', name: 'Apple' },
							],
						},
						// A workspace with no documents.
						{},
					])
					.mockResolvedValueOnce([{ docs: [{ id: 'docM', name: 'Mango' }] }]);
			});

			it('should list the documents of every org, sorted by name', async () => {
				const result = await searchDocs.call(createLoadOptionsFunctions({}, request));

				expect(request.mock.calls.map(([options]) => options.uri)).toEqual([
					'https://grist.example.com/api/orgs',
					'https://grist.example.com/api/orgs/1/workspaces',
					'https://grist.example.com/api/orgs/2/workspaces',
				]);
				expect(result.results).toEqual([
					{ name: 'Apple', value: 'docA', url: 'https://grist.example.com/doc/docA' },
					{ name: 'Mango', value: 'docM', url: 'https://grist.example.com/doc/docM' },
					{ name: 'Zebra', value: 'docZ', url: 'https://grist.example.com/doc/docZ' },
				]);
			});

			it('should list a document with no name under its ID', async () => {
				request
					.mockReset()
					.mockResolvedValueOnce([{ id: 1 }])
					.mockResolvedValueOnce([{ docs: [{ id: 'docN' }] }]);

				const result = await searchDocs.call(createLoadOptionsFunctions({}, request));

				expect(result.results).toEqual([
					{ name: 'docN', value: 'docN', url: 'https://grist.example.com/doc/docN' },
				]);
			});

			it('should keep the documents of the orgs that answer when one org fails', async () => {
				request
					.mockReset()
					.mockResolvedValueOnce([{ id: 1 }, { id: 2 }])
					.mockRejectedValueOnce(new Error('Forbidden'))
					.mockResolvedValueOnce([{ docs: [{ id: 'docM', name: 'Mango' }] }]);

				const result = await searchDocs.call(createLoadOptionsFunctions({}, request));

				expect(result.results).toEqual([
					{ name: 'Mango', value: 'docM', url: 'https://grist.example.com/doc/docM' },
				]);
			});

			it('should report the error when no org answers', async () => {
				request
					.mockReset()
					.mockResolvedValueOnce([{ id: 1 }, { id: 2 }])
					.mockRejectedValue(new Error('Forbidden'));

				await expect(searchDocs.call(createLoadOptionsFunctions({}, request))).rejects.toThrow(
					'Forbidden',
				);
			});

			it('should return no documents for an account with no orgs', async () => {
				request.mockReset().mockResolvedValueOnce([]);

				const result = await searchDocs.call(createLoadOptionsFunctions({}, request));

				expect(result.results).toEqual([]);
			});

			it('should filter documents by name, ignoring case', async () => {
				const result = await searchDocs.call(createLoadOptionsFunctions({}, request), 'aPP');

				expect(result.results).toEqual([
					{ name: 'Apple', value: 'docA', url: 'https://grist.example.com/doc/docA' },
				]);
			});
		});

		describe('searchTables', () => {
			const request = vi.fn();

			beforeEach(() => {
				request.mockReset().mockResolvedValue({ tables: [{ id: 'People' }, { id: 'Orders' }] });
			});

			it('should list the tables of a document selected from the list', async () => {
				const docId = { __rl: true, mode: 'list', value: 'doc1' };

				const result = await searchTables.call(createLoadOptionsFunctions({ docId }, request));

				expect(request.mock.calls[0][0].uri).toBe('https://grist.example.com/api/docs/doc1/tables');
				expect(result.results).toEqual([
					{ name: 'People', value: 'People' },
					{ name: 'Orders', value: 'Orders' },
				]);
			});

			it('should list the tables of a document given by URL, filtered by ID', async () => {
				const docId = {
					__rl: true,
					mode: 'url',
					value: 'https://docs.getgrist.com/doc1AAAAAAAA/Sales',
				};

				const result = await searchTables.call(
					createLoadOptionsFunctions({ docId }, request),
					'ord',
				);

				expect(request.mock.calls[0][0].uri).toBe(
					'https://grist.example.com/api/docs/doc1AAAAAAAA/tables',
				);
				expect(result.results).toEqual([{ name: 'Orders', value: 'Orders' }]);
			});

			it('should list the tables of a document ID saved as a plain string', async () => {
				await searchTables.call(createLoadOptionsFunctions({ docId: 'doc1' }, request));

				expect(request.mock.calls[0][0].uri).toBe('https://grist.example.com/api/docs/doc1/tables');
			});

			it('should return no tables when the response carries none', async () => {
				request.mockReset().mockResolvedValue({});
				const docId = { __rl: true, mode: 'list', value: 'doc1' };

				const result = await searchTables.call(createLoadOptionsFunctions({ docId }, request));

				expect(result.results).toEqual([]);
			});

			it('should not make a request until a document is selected', async () => {
				const result = await searchTables.call(createLoadOptionsFunctions({ docId: '' }, request));

				expect(result.results).toEqual([]);
				expect(request).not.toHaveBeenCalled();
			});
		});
	});
});
