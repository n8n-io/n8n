import type { IDataObject, INode } from 'n8n-workflow';

import { createMockExecuteFunction } from '@test/nodes/Helpers';

import * as mode from '../../v3/actions/mode';

const node: INode = {
	id: '123456',
	name: 'Merge',
	typeVersion: 3,
	type: 'n8n-nodes-base.merge',
	position: [50, 50],
	parameters: {},
};

const inputsData = [
	[
		{
			json: {
				id: 1,
				data: 'a',
				name: 'Sam',
			},
		},
		{
			json: {
				id: 2,
				data: 'b',
				name: 'Dan',
			},
		},
		{
			json: {
				id: 3,
				data: 'c',
				name: 'Jon',
			},
		},
		{
			json: {
				id: 6,
				data: 'e',
				name: 'Ron',
			},
		},
		{
			json: {
				id: 7,
				data: 'f',
				name: 'Joe',
			},
		},
	],
	[
		{
			json: {
				id: 1,
				data: 'aa',
				country: 'PL',
			},
		},
		{
			json: {
				id: 2,
				data: 'bb',
				country: 'FR',
			},
		},
		{
			json: {
				id: 3,
				data: 'cc',
				country: 'UA',
			},
		},
		{
			json: {
				id: 4,
				data: 'ee',
				country: 'US',
			},
		},
		{
			json: {
				id: 5,
				data: 'ff',
				country: 'ES',
			},
		},
	],
];
describe('Test MergeV3, combineBySql operation', () => {
	it('LEFT JOIN', async () => {
		const nodeParameters: IDataObject = {
			operation: 'combineBySql',
			query:
				'SELECT *, input1.data as data_1\nFROM input1\nLEFT JOIN input2\nON input1.id = input2.id\n',
		};

		const returnData = await mode.combineBySql.execute.call(
			createMockExecuteFunction(nodeParameters, node),
			inputsData,
		);

		expect(returnData[0][0].json).toEqual({
			data_1: 'a',
			id: 1,
			data: 'aa',
			name: 'Sam',
			country: 'PL',
		});
	});
	it('LEFT JOIN, missing input 2(empty array)', async () => {
		const nodeParameters: IDataObject = {
			operation: 'combineBySql',
			query:
				'SELECT *, input1.data as data_1\nFROM input1\nLEFT JOIN input2\nON input1.id = input2.id\n',
		};

		const returnData = await mode.combineBySql.execute.call(
			createMockExecuteFunction(nodeParameters, node),
			[inputsData[0], []],
		);

		expect(returnData.length).toEqual(1);
		expect(returnData[0].length).toEqual(5);
		expect(returnData[0][0].json).toEqual({
			data: 'a',
			data_1: 'a',
			id: 1,
			name: 'Sam',
		});
	});

	it('LEFT JOIN, missing data in input 2', async () => {
		const nodeParameters: IDataObject = {
			operation: 'combineBySql',
			query:
				'SELECT *, input1.data as data_1\nFROM input1\nLEFT JOIN input2\nON input1.id = input2.id\n',
		};

		await expect(
			mode.combineBySql.execute.call(createMockExecuteFunction(nodeParameters, node), [
				inputsData[0],
			]),
		).rejects.toMatchObject({
			message: 'Issue while executing query',
			description: 'Table does not exist: input2',
		});
	});

	it('LEFT JOIN, invalid syntax', async () => {
		const nodeParameters: IDataObject = {
			operation: 'combineBySql',
			query:
				'SELECTTT *, input1.data as data_1\nFROM input1\nLEFT JOIN input2\nON input1.id = input2.id\n',
		};

		await expect(
			mode.combineBySql.execute.call(createMockExecuteFunction(nodeParameters, node), inputsData),
		).rejects.toMatchObject({
			message: 'Issue while executing query',
			description: expect.stringContaining('Parse error'),
		});

		await expect(
			mode.combineBySql.execute.call(createMockExecuteFunction(nodeParameters, node), inputsData),
		).rejects.toMatchObject({
			description: expect.stringContaining('SELECTTT'),
		});
	});

	it('RIGHT JOIN', async () => {
		const nodeParameters: IDataObject = {
			operation: 'combineBySql',
			query: 'SELECT *\nFROM input1\nRIGHT JOIN input2\nON input1.id = input2.id;\n',
		};

		const returnData = await mode.combineBySql.execute.call(
			createMockExecuteFunction(nodeParameters, node),
			inputsData,
		);

		expect(returnData.length).toEqual(1);
		expect(returnData[0].length).toEqual(5);
		expect(returnData[0][0].json).toEqual({
			id: 1,
			data: 'aa',
			name: 'Sam',
			country: 'PL',
		});
		expect(returnData[0][4].json).toEqual({
			id: 5,
			data: 'ff',
			country: 'ES',
		});
	});

	it('INNER JOIN', async () => {
		const nodeParameters: IDataObject = {
			operation: 'combineBySql',
			query: 'SELECT *\nFROM input1\nINNER JOIN input2\nON input1.id = input2.id;\n',
		};

		const returnData = await mode.combineBySql.execute.call(
			createMockExecuteFunction(nodeParameters, node),
			inputsData,
		);

		expect(returnData.length).toEqual(1);
		expect(returnData[0].length).toEqual(3);
		expect(returnData[0][2].json).toEqual({
			id: 3,
			data: 'cc',
			name: 'Jon',
			country: 'UA',
		});
	});

	it('FULL OUTER JOIN', async () => {
		const nodeParameters: IDataObject = {
			operation: 'combineBySql',
			query: 'SELECT *\nFROM input1\nFULL OUTER JOIN input2\nON input1.id = input2.id;\n',
		};

		const returnData = await mode.combineBySql.execute.call(
			createMockExecuteFunction(nodeParameters, node),
			inputsData,
		);

		expect(returnData.length).toEqual(1);
		expect(returnData[0].length).toEqual(7);
		expect(returnData[0][2].json).toEqual({
			id: 3,
			data: 'cc',
			name: 'Jon',
			country: 'UA',
		});
	});
	it('CROSS JOIN', async () => {
		const nodeParameters: IDataObject = {
			operation: 'combineBySql',
			query: 'SELECT *, input1.data AS data_1\nFROM input1\nCROSS JOIN input2;\n',
		};

		const returnData = await mode.combineBySql.execute.call(
			createMockExecuteFunction(nodeParameters, node),
			inputsData,
		);

		expect(returnData.length).toEqual(1);
		expect(returnData[0].length).toEqual(25);
		expect(returnData[0][0].json).toEqual({
			data_1: 'a',
			id: 1,
			data: 'aa',
			name: 'Sam',
			country: 'PL',
		});
	});

	it('should collect pairedItems data, if version >= 3.1 and SELECT query', async () => {
		const nodeParameters: IDataObject = {
			operation: 'combineBySql',
			query: 'SELECT name FROM input1 LEFT JOIN input2 ON input1.id = input2.id',
		};

		const inputs = [
			[
				{
					json: {
						id: 1,
						data: 'a',
						name: 'Sam',
					},
					pairedItem: {
						item: 0,
						input: undefined,
					},
				},
				{
					json: {
						id: 2,
						data: 'b',
						name: 'Dan',
					},
					pairedItem: {
						item: 1,
						input: undefined,
					},
				},
				{
					json: {
						id: 3,
						data: 'c',
						name: 'Jon',
					},
					pairedItem: {
						item: 2,
						input: undefined,
					},
				},
			],
			[
				{
					json: {
						id: 1,
						data: 'aa',
						country: 'PL',
					},
					pairedItem: {
						item: 0,
						input: 1,
					},
				},
				{
					json: {
						id: 2,
						data: 'bb',
						country: 'FR',
					},
					pairedItem: {
						item: 1,
						input: 1,
					},
				},
				{
					json: {
						id: 3,
						data: 'cc',
						country: 'UA',
					},
					pairedItem: {
						item: 2,
						input: 1,
					},
				},
			],
		];

		const returnData = await mode.combineBySql.execute.call(
			createMockExecuteFunction(nodeParameters, { ...node, typeVersion: 3.1 }),
			inputs,
		);

		expect(returnData.length).toEqual(1);
		expect(returnData).toEqual([
			[
				{
					json: {
						name: 'Sam',
					},
					pairedItem: [
						{
							item: 0,
							input: undefined,
						},
						{
							item: 0,
							input: 1,
						},
					],
				},
				{
					json: {
						name: 'Dan',
					},
					pairedItem: [
						{
							item: 1,
							input: undefined,
						},
						{
							item: 1,
							input: 1,
						},
					],
				},
				{
					json: {
						name: 'Jon',
					},
					pairedItem: [
						{
							item: 2,
							input: undefined,
						},
						{
							item: 2,
							input: 1,
						},
					],
				},
			],
		]);
	});

	it('Empty successful query should return [{ success: true }] at version <= 3.1', async () => {
		const nodeParameters: IDataObject = {
			operation: 'combineBySql',
			query: 'SELECT id from input1',
		};

		const returnData = await mode.combineBySql.execute.call(
			createMockExecuteFunction(nodeParameters, { ...node, typeVersion: 3.1 }),
			[[]],
		);

		expect(returnData.length).toEqual(1);
		expect(returnData[0].length).toEqual(1);
		expect(returnData[0][0].json).toEqual({
			success: true,
		});
	});

	it('Empty successful query should return [] at version >= 3.2 if no option set', async () => {
		const nodeParameters: IDataObject = {
			operation: 'combineBySql',
			query: 'SELECT id from input1',
		};

		const returnData = await mode.combineBySql.execute.call(
			createMockExecuteFunction(nodeParameters, { ...node, typeVersion: 3.2 }),
			[[]],
		);

		expect(returnData).toEqual([[]]);
	});

	it('Empty successful query should return [{ success: true }] at version >= 3.2 if option set', async () => {
		const nodeParameters: IDataObject = {
			operation: 'combineBySql',
			query: 'SELECT id from input1',
			options: {
				emptyQueryResult: 'success',
			},
		};

		const returnData = await mode.combineBySql.execute.call(
			createMockExecuteFunction(nodeParameters, { ...node, typeVersion: 3.2 }),
			[[]],
		);

		expect(returnData.length).toEqual(1);
		expect(returnData[0].length).toEqual(1);
		expect(returnData[0][0].json).toEqual({
			success: true,
		});
	});

	describe('Security Tests', () => {
		it('should block FILE() function access', async () => {
			const nodeParameters: IDataObject = {
				operation: 'combineBySql',
				query: "SELECT * FROM FILE('test.csv')",
			};

			await expect(
				mode.combineBySql.execute.call(createMockExecuteFunction(nodeParameters, node), inputsData),
			).rejects.toMatchObject({
				message: 'Issue while executing query',
				description: 'File access operations are disabled for security reasons',
			});
		});

		it('should block JSON() function access', async () => {
			const nodeParameters: IDataObject = {
				operation: 'combineBySql',
				query: "SELECT * FROM JSON('data.json')",
			};

			await expect(
				mode.combineBySql.execute.call(createMockExecuteFunction(nodeParameters, node), inputsData),
			).rejects.toMatchObject({
				message: 'Issue while executing query',
				description: 'File access operations are disabled for security reasons',
			});
		});

		it('should block TXT() function access', async () => {
			const nodeParameters: IDataObject = {
				operation: 'combineBySql',
				query: "SELECT * FROM TXT('data.txt')",
			};

			await expect(
				mode.combineBySql.execute.call(createMockExecuteFunction(nodeParameters, node), inputsData),
			).rejects.toMatchObject({
				message: 'Issue while executing query',
				description: 'File access operations are disabled for security reasons',
			});
		});

		it('should block CSV() function access', async () => {
			const nodeParameters: IDataObject = {
				operation: 'combineBySql',
				query: "SELECT * FROM CSV('data.csv')",
			};

			await expect(
				mode.combineBySql.execute.call(createMockExecuteFunction(nodeParameters, node), inputsData),
			).rejects.toMatchObject({
				message: 'Issue while executing query',
				description: 'File access operations are disabled for security reasons',
			});
		});

		it('should block XLSX() function access', async () => {
			const nodeParameters: IDataObject = {
				operation: 'combineBySql',
				query: "SELECT * FROM XLSX('data.xlsx')",
			};

			await expect(
				mode.combineBySql.execute.call(createMockExecuteFunction(nodeParameters, node), inputsData),
			).rejects.toMatchObject({
				message: 'Issue while executing query',
				description: 'File access operations are disabled for security reasons',
			});
		});

		it('should block XLS() function access', async () => {
			const nodeParameters: IDataObject = {
				operation: 'combineBySql',
				query: "SELECT * FROM XLS('data.xls')",
			};

			await expect(
				mode.combineBySql.execute.call(createMockExecuteFunction(nodeParameters, node), inputsData),
			).rejects.toMatchObject({
				message: 'Issue while executing query',
				description: 'File access operations are disabled for security reasons',
			});
		});

		it('should block LOAD() function access', async () => {
			const nodeParameters: IDataObject = {
				operation: 'combineBySql',
				query: "SELECT * FROM input1 WHERE id = LOAD('test.txt')",
			};

			await expect(
				mode.combineBySql.execute.call(createMockExecuteFunction(nodeParameters, node), inputsData),
			).rejects.toMatchObject({
				message: 'Issue while executing query',
				description: 'File access operations are disabled for security reasons',
			});
		});

		it('should block SAVE() function access', async () => {
			const nodeParameters: IDataObject = {
				operation: 'combineBySql',
				query: "SELECT id, SAVE('output.txt', name) as saved FROM input1",
			};

			await expect(
				mode.combineBySql.execute.call(createMockExecuteFunction(nodeParameters, node), inputsData),
			).rejects.toMatchObject({
				message: 'Issue while executing query',
				description: 'File access operations are disabled for security reasons',
			});
		});

		it('should still allow normal SQL operations', async () => {
			const nodeParameters: IDataObject = {
				operation: 'combineBySql',
				query: 'SELECT id, name FROM input1 WHERE id > 1',
			};

			const returnData = await mode.combineBySql.execute.call(
				createMockExecuteFunction(nodeParameters, node),
				inputsData,
			);

			expect(returnData.length).toEqual(1);
			expect(returnData[0].length).toEqual(4);
			expect(returnData[0][0].json).toEqual({
				id: 2,
				name: 'Dan',
			});
		});
	});

	describe('Advanced SQL Query Tests', () => {
		it('should handle UNION queries', async () => {
			const nodeParameters: IDataObject = {
				operation: 'combineBySql',
				query: 'SELECT id, name FROM input1 UNION SELECT id, country as name FROM input2',
			};

			const returnData = await mode.combineBySql.execute.call(
				createMockExecuteFunction(nodeParameters, node),
				inputsData,
			);

			expect(returnData.length).toEqual(1);
			expect(returnData[0].length).toEqual(10);
			// Should contain both names from input1 and countries from input2
			expect(returnData[0].some((item) => item.json.name === 'Sam')).toBe(true);
			expect(returnData[0].some((item) => item.json.name === 'PL')).toBe(true);
		});

		it('should handle UNION ALL queries', async () => {
			const nodeParameters: IDataObject = {
				operation: 'combineBySql',
				query: 'SELECT id FROM input1 UNION ALL SELECT id FROM input2',
			};

			const returnData = await mode.combineBySql.execute.call(
				createMockExecuteFunction(nodeParameters, node),
				inputsData,
			);

			expect(returnData.length).toEqual(1);
			expect(returnData[0].length).toEqual(10);
			// Should include duplicate IDs
			const ids = returnData[0].map((item) => item.json.id);
			expect(ids.filter((id) => id === 1).length).toBe(2);
		});

		it('should handle subqueries', async () => {
			const nodeParameters: IDataObject = {
				operation: 'combineBySql',
				query: 'SELECT * FROM input1 WHERE id IN (SELECT id FROM input2 WHERE country = "PL")',
			};

			const returnData = await mode.combineBySql.execute.call(
				createMockExecuteFunction(nodeParameters, node),
				inputsData,
			);

			expect(returnData.length).toEqual(1);
			expect(returnData[0].length).toEqual(1);
			expect(returnData[0][0].json).toEqual({
				id: 1,
				data: 'a',
				name: 'Sam',
			});
		});

		it('should handle basic filtering', async () => {
			const nodeParameters: IDataObject = {
				operation: 'combineBySql',
				query: 'SELECT * FROM input1 WHERE id < 4',
			};

			const returnData = await mode.combineBySql.execute.call(
				createMockExecuteFunction(nodeParameters, node),
				inputsData,
			);

			expect(returnData.length).toEqual(1);
			expect(returnData[0].length).toEqual(3);
			expect(returnData[0][0].json.id).toBe(1);
			expect(returnData[0][1].json.id).toBe(2);
			expect(returnData[0][2].json.id).toBe(3);
		});

		it('should handle CASE statements', async () => {
			const nodeParameters: IDataObject = {
				operation: 'combineBySql',
				query: `SELECT id, name,
					CASE
						WHEN id <= 2 THEN 'Low'
						WHEN id <= 5 THEN 'Medium'
						ELSE 'High'
					END as category
					FROM input1`,
			};

			const returnData = await mode.combineBySql.execute.call(
				createMockExecuteFunction(nodeParameters, node),
				inputsData,
			);

			expect(returnData.length).toEqual(1);
			expect(returnData[0].length).toEqual(5);
			expect(returnData[0][0].json.category).toBe('Low');
			expect(returnData[0][2].json.category).toBe('Medium');
			expect(returnData[0][4].json.category).toBe('High');
		});

		it('should handle ORDER BY with multiple columns', async () => {
			const nodeParameters: IDataObject = {
				operation: 'combineBySql',
				query: 'SELECT * FROM input1 ORDER BY name DESC, id ASC',
			};

			const returnData = await mode.combineBySql.execute.call(
				createMockExecuteFunction(nodeParameters, node),
				inputsData,
			);

			expect(returnData.length).toEqual(1);
			expect(returnData[0].length).toEqual(5);
			// Should be ordered by name DESC, then id ASC
			expect(returnData[0][0].json.name).toBe('Sam');
			expect(returnData[0][4].json.name).toBe('Dan');
		});

		it('should handle LIMIT and OFFSET', async () => {
			const nodeParameters: IDataObject = {
				operation: 'combineBySql',
				query: 'SELECT * FROM input1 ORDER BY id LIMIT 2 OFFSET 1',
			};

			const returnData = await mode.combineBySql.execute.call(
				createMockExecuteFunction(nodeParameters, node),
				inputsData,
			);

			expect(returnData.length).toEqual(1);
			expect(returnData[0].length).toEqual(2);
			expect(returnData[0][0].json.id).toBe(2);
			expect(returnData[0][1].json.id).toBe(3);
		});

		it('should handle string functions', async () => {
			const nodeParameters: IDataObject = {
				operation: 'combineBySql',
				query: `SELECT
					UPPER(name) as upper_name,
					LOWER(name) as lower_name,
					LENGTH(name) as name_length,
					CONCAT(name, '_', data) as combined
					FROM input1 WHERE id = 1`,
			};

			const returnData = await mode.combineBySql.execute.call(
				createMockExecuteFunction(nodeParameters, node),
				inputsData,
			);

			expect(returnData.length).toEqual(1);
			expect(returnData[0].length).toEqual(1);
			expect(returnData[0][0].json).toEqual({
				upper_name: 'SAM',
				lower_name: 'sam',
				name_length: 3,
				combined: 'Sam_a',
			});
		});

		it('should handle mathematical operations', async () => {
			const nodeParameters: IDataObject = {
				operation: 'combineBySql',
				query: `SELECT
					id,
					id * 2 as doubled,
					id + 10 as plus_ten,
					id % 2 as modulo,
					ROUND(id / 3.0, 2) as divided
					FROM input1 WHERE id <= 3`,
			};

			const returnData = await mode.combineBySql.execute.call(
				createMockExecuteFunction(nodeParameters, node),
				inputsData,
			);

			expect(returnData.length).toEqual(1);
			expect(returnData[0].length).toEqual(3);
			expect(returnData[0][0].json).toEqual({
				id: 1,
				doubled: 2,
				plus_ten: 11,
				modulo: 1,
				divided: 0.33,
			});
		});

		it('should handle simple WHERE clauses', async () => {
			const nodeParameters: IDataObject = {
				operation: 'combineBySql',
				query: 'SELECT * FROM input1 WHERE name LIKE "%o%"',
			};

			const returnData = await mode.combineBySql.execute.call(
				createMockExecuteFunction(nodeParameters, node),
				inputsData,
			);

			expect(returnData.length).toEqual(1);
			expect(returnData[0].length).toEqual(3);
			// Should contain Jon, Ron, and Joe (all names with 'o')
			expect(returnData[0].some((item) => item.json.name === 'Jon')).toBe(true);
			expect(returnData[0].some((item) => item.json.name === 'Ron')).toBe(true);
			expect(returnData[0].some((item) => item.json.name === 'Joe')).toBe(true);
		});

		it('should handle complex JOIN with WHERE conditions', async () => {
			const nodeParameters: IDataObject = {
				operation: 'combineBySql',
				query: `SELECT
					input1.name,
					input2.country,
					input1.data as input1_data,
					input2.data as input2_data
					FROM input1
					INNER JOIN input2 ON input1.id = input2.id
					WHERE input1.id > 1 AND input2.country IN ('FR', 'UA')
					ORDER BY input1.id`,
			};

			const returnData = await mode.combineBySql.execute.call(
				createMockExecuteFunction(nodeParameters, node),
				inputsData,
			);

			expect(returnData.length).toEqual(1);
			expect(returnData[0].length).toEqual(2);
			expect(returnData[0][0].json).toEqual({
				name: 'Dan',
				country: 'FR',
				input1_data: 'b',
				input2_data: 'bb',
			});
			expect(returnData[0][1].json).toEqual({
				name: 'Jon',
				country: 'UA',
				input1_data: 'c',
				input2_data: 'cc',
			});
		});

		it('should handle EXISTS subquery', async () => {
			const nodeParameters: IDataObject = {
				operation: 'combineBySql',
				query: `SELECT * FROM input1
					WHERE EXISTS (
						SELECT 1 FROM input2
						WHERE input2.id = input1.id AND input2.country = 'PL'
					)`,
			};

			const returnData = await mode.combineBySql.execute.call(
				createMockExecuteFunction(nodeParameters, node),
				inputsData,
			);

			expect(returnData.length).toEqual(1);
			expect(returnData[0].length).toEqual(1);
			expect(returnData[0][0].json.name).toBe('Sam');
		});

		it('should handle NOT EXISTS subquery', async () => {
			const nodeParameters: IDataObject = {
				operation: 'combineBySql',
				query: `SELECT * FROM input1
					WHERE NOT EXISTS (
						SELECT 1 FROM input2
						WHERE input2.id = input1.id
					)
					ORDER BY id`,
			};

			const returnData = await mode.combineBySql.execute.call(
				createMockExecuteFunction(nodeParameters, node),
				inputsData,
			);

			expect(returnData.length).toEqual(1);
			expect(returnData[0].length).toEqual(2);
			// Should return records from input1 that don't have matching IDs in input2
			expect(returnData[0][0].json.id).toBe(6);
			expect(returnData[0][1].json.id).toBe(7);
		});

		it('should handle DISTINCT queries', async () => {
			const nodeParameters: IDataObject = {
				operation: 'combineBySql',
				query:
					'SELECT DISTINCT SUBSTR(name, 1, 1) as first_letter FROM input1 ORDER BY first_letter',
			};

			const returnData = await mode.combineBySql.execute.call(
				createMockExecuteFunction(nodeParameters, node),
				inputsData,
			);

			expect(returnData.length).toEqual(1);
			// Should return unique first letters only
			const letters = returnData[0].map((item) => item.json.first_letter);
			expect(letters).toEqual([...new Set(letters)].sort());
		});

		it('should handle multiple table operations with aliases', async () => {
			const nodeParameters: IDataObject = {
				operation: 'combineBySql',
				query: `SELECT
					u.name as user_name,
					p.country as user_country,
					u.id
					FROM input1 u
					LEFT JOIN input2 p ON u.id = p.id
					WHERE u.name LIKE '%an%'`,
			};

			const returnData = await mode.combineBySql.execute.call(
				createMockExecuteFunction(nodeParameters, node),
				inputsData,
			);

			expect(returnData.length).toEqual(1);
			expect(returnData[0].length).toEqual(1);
			expect(returnData[0][0].json).toEqual({
				user_name: 'Dan',
				user_country: 'FR',
				id: 2,
			});
		});
	});
});

describe('Test MergeV3, append operation', () => {
	it('append inputs', async () => {
		const nodeParameters: IDataObject = {};

		const returnData = await mode.append.execute.call(
			createMockExecuteFunction(nodeParameters, node),
			inputsData,
		);

		expect(returnData.length).toEqual(1);
		expect(returnData[0].length).toEqual(10);
		expect(returnData[0][0].json).toEqual({
			id: 1,
			data: 'a',
			name: 'Sam',
		});
	});
});
describe('Test MergeV3, combineByFields operation', () => {
	it('merge inputs', async () => {
		const nodeParameters: IDataObject = {
			joinMode: 'keepMatches',
			fieldsToMatchString: 'id',
			options: {},
		};

		const returnData = await mode.combineByFields.execute.call(
			createMockExecuteFunction(nodeParameters, node),
			inputsData,
		);

		expect(returnData.length).toEqual(1);
		expect(returnData[0].length).toEqual(3);
		expect(returnData[0][1].json).toEqual({
			id: 2,
			data: 'bb',
			name: 'Dan',
			country: 'FR',
		});
	});
});

describe('Test MergeV3, combineByPosition operation', () => {
	it('combine inputs', async () => {
		const nodeParameters: IDataObject = {};

		const returnData = await mode.combineByPosition.execute.call(
			createMockExecuteFunction(nodeParameters, node),
			inputsData,
		);

		expect(returnData.length).toEqual(1);
		expect(returnData[0].length).toEqual(5);
		expect(returnData[0][4].json).toEqual({
			id: 5,
			data: 'ff',
			name: 'Joe',
			country: 'ES',
		});
	});
});

describe('Test MergeV3, chooseBranch operation', () => {
	it('choose input', async () => {
		const nodeParameters: IDataObject = {
			useDataOfInput: 2,
			chooseBranchMode: 'waitForAll',
			output: 'specifiedInput',
		};

		const returnData = await mode.chooseBranch.execute.call(
			createMockExecuteFunction(nodeParameters, node),
			inputsData,
		);

		expect(returnData.length).toEqual(1);
		expect(returnData[0].length).toEqual(5);
		expect(returnData[0][0].json).toEqual({
			id: 1,
			data: 'aa',
			country: 'PL',
		});
	});
});

describe('Test MergeV3, combineAll operation', () => {
	it('combine inputs', async () => {
		const nodeParameters: IDataObject = {
			options: {},
		};

		const returnData = await mode.combineAll.execute.call(
			createMockExecuteFunction(nodeParameters, node),
			inputsData,
		);

		expect(returnData.length).toEqual(1);
		expect(returnData[0].length).toEqual(25);
		expect(returnData[0][0].json).toEqual({
			id: 1,
			data: 'aa',
			name: 'Sam',
			country: 'PL',
		});
	});
});
