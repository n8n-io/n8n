import mssql from 'mssql';
import type { IDataObject } from 'n8n-workflow';
import {
	configurePool,
	deleteOperation,
	insertOperation,
	updateOperation,
} from '../GenericFunctions';

let parameters: IDataObject;

jest.mock('mssql', () => {
	const originalModule = jest.requireActual('mssql');
	const { Request } = originalModule;
	Request.prototype.query = async function (q: string) {
		parameters = this.parameters;
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
	};
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
		expect((parameters.r0v0 as IDataObject).value).toEqual(1);
		expect((parameters.r0v1 as IDataObject).value).toEqual('Sam');
		expect((parameters.r0v2 as IDataObject).value).toEqual(31);
		expect((parameters.r0v3 as IDataObject).value).toEqual(false);
		expect((parameters.r1v0 as IDataObject).value).toEqual(3);
		expect((parameters.r1v1 as IDataObject).value).toEqual('Jon');
		expect((parameters.r1v2 as IDataObject).value).toEqual(null);
		expect((parameters.r1v3 as IDataObject).value).toEqual(true);
		expect((parameters.r2v0 as IDataObject).value).toEqual(4);
		expect((parameters.r2v1 as IDataObject).value).toEqual(null);
		expect((parameters.r2v2 as IDataObject).value).toEqual(25);
		expect((parameters.r2v3 as IDataObject).value).toEqual(false);
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
		expect((parameters.v0 as IDataObject).value).toEqual('Greg');
		expect((parameters.v1 as IDataObject).value).toEqual(43);
		expect((parameters.v2 as IDataObject).value).toEqual(0);
		expect((parameters.condition as IDataObject).value).toEqual(2);
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

		const requestMock = jest.spyOn(mssql.Request.prototype, 'query');

		await deleteOperation(tables, pool);

		expect(requestMock).toHaveBeenCalledTimes(3);
		expect(requestMock).toHaveBeenCalledWith('DELETE FROM [users] WHERE [id] IN (@v0);');
		expect((parameters.v0 as IDataObject).value).toEqual(2);
	});
});
