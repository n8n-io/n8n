import mssql from 'mssql';
import {
	configurePool,
	deleteOperation,
	insertOperation,
	updateOperation,
} from '../GenericFunctions';

jest.mock('mssql', () => {
	const originalModule = jest.requireActual('mssql');
	const { Request } = originalModule;
	Request.prototype.query = jest.fn(async function () {
		return {
			recordsets: [],
			recordset: [],
			output: {},
			rowsAffected: [],
		};
	});
	return {
		...originalModule,
		Request,
	};
});

describe('MSSQL tests', () => {
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

		const requestMock = jest.spyOn(mssql.Request.prototype, 'query');

		await insertOperation(tables, pool);

		expect(requestMock).toHaveBeenCalledTimes(1);
		expect(requestMock).toHaveBeenCalledWith(
			'INSERT INTO [users] ([id], [name], [age], [active]) VALUES (@r0v0, @r0v1, @r0v2, @r0v3), (@r1v0, @r1v1, @r1v2, @r1v3), (@r2v0, @r2v1, @r2v2, @r2v3);',
		);
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

		const requestMock = jest.spyOn(mssql.Request.prototype, 'query');

		await updateOperation(tables, pool);

		expect(requestMock).toHaveBeenCalledTimes(2);
		expect(requestMock).toHaveBeenCalledWith(
			'UPDATE [users] SET [name] = @v0, [age] = @v1, [active] = @v2 WHERE id = @condition;',
		);
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

		const requestMock = jest
			.spyOn(mssql.Request.prototype, 'query')
			.mockImplementation(async () => {
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

		await deleteOperation(tables, pool);

		expect(requestMock).toHaveBeenCalledTimes(3);
		expect(requestMock).toHaveBeenCalledWith('DELETE FROM [users] WHERE [id] IN (@v0);');
	});
});
