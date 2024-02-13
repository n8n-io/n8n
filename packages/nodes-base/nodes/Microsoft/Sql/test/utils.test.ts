import { Request } from 'mssql';
import type { IDataObject } from 'n8n-workflow';
import {
	configurePool,
	deleteOperation,
	insertOperation,
	mssqlChunk,
	updateOperation,
} from '../GenericFunctions';

describe('MSSQL tests', () => {
	let querySpy: jest.SpyInstance<void, Parameters<Request['query']>>;
	let request: Request;

	const assertParameters = (parameters: unknown[][] | IDataObject) => {
		if (Array.isArray(parameters)) {
			parameters.forEach((values, rowIndex) => {
				values.forEach((value, index) => {
					const received = (request.parameters[`r${rowIndex}v${index}`] as IDataObject).value;
					expect(received).toEqual(value);
				});
			});
		} else {
			for (const key in parameters) {
				expect((request.parameters[key] as IDataObject).value).toEqual(parameters[key]);
			}
		}
	};

	beforeEach(() => {
		jest.resetAllMocks();
		querySpy = jest.spyOn(Request.prototype, 'query').mockImplementation(async function (
			this: Request,
		) {
			// eslint-disable-next-line @typescript-eslint/no-this-alias
			request = this;
			return [
				[
					[
						{
							recordsets: [],
							recordset: undefined,
							output: {},
							rowsAffected: [0],
						},
					],
				],
			];
		});
	});

	it('should perform insert operation', async () => {
		const pool = configurePool({});
		const tables = {
			users: {
				'id, name, age, active': [
					{
						id: 1,
						name: 'Sam',
						age: 31,
						active: false,
					},
					{
						id: 3,
						name: 'Jon',
						age: null,
						active: true,
					},
					{
						id: 4,
						name: undefined,
						age: 25,
						active: false,
					},
				],
			},
		};

		await insertOperation(tables, pool);

		expect(querySpy).toHaveBeenCalledTimes(1);
		expect(querySpy).toHaveBeenCalledWith(
			'INSERT INTO [users] ([id], [name], [age], [active]) VALUES (@r0v0, @r0v1, @r0v2, @r0v3), (@r1v0, @r1v1, @r1v2, @r1v3), (@r2v0, @r2v1, @r2v2, @r2v3);',
		);
		assertParameters([
			[1, 'Sam', 31, false],
			[3, 'Jon', null, true],
			[4, null, 25, false],
		]);
	});

	it('should perform update operation', async () => {
		const pool = configurePool({});
		const tables = {
			users: {
				'name, age, active': [
					{
						name: 'Greg',
						age: 43,
						active: 0,
						updateKey: 'id',
						id: 2,
					},
				],
			},
		};

		await updateOperation(tables, pool);

		expect(querySpy).toHaveBeenCalledTimes(1);
		expect(querySpy).toHaveBeenCalledWith(
			'UPDATE [users] SET [name] = @v0, [age] = @v1, [active] = @v2 WHERE id = @condition;',
		);
		assertParameters({
			v0: 'Greg',
			v1: 43,
			v2: 0,
			condition: 2,
		});
	});

	it('should perform delete operation', async () => {
		const pool = configurePool({});
		const tables = {
			users: {
				id: [
					{
						json: {
							id: 2,
						},
						pairedItem: {
							item: 0,
							input: undefined,
						},
					},
				],
			},
		};

		await deleteOperation(tables, pool);

		expect(querySpy).toHaveBeenCalledTimes(1);
		expect(querySpy).toHaveBeenCalledWith('DELETE FROM [users] WHERE [id] IN (@v0);');
		assertParameters({ v0: 2 });
	});

	describe('mssqlChunk', () => {
		it('should chunk insert values correctly', () => {
			const chunks = mssqlChunk(
				new Array(3000)
					.fill(null)
					.map((_, index) => ({ id: index, name: 'John Doe', verified: true })),
			);
			expect(chunks.map((chunk) => chunk.length)).toEqual([699, 699, 699, 699, 204]);
		});
	});
});
