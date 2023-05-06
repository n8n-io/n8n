const PostgresFun = require('../../../nodes/Postgres/v1/genericFunctions');
const pgPromise = require('pg-promise');

type NodeParams = Record<string, string | {}>;

describe('pgUpdate', () => {
	it('runs query to update db', async () => {
		const updateItem = { id: 1234, name: 'test' };
		const nodeParams: NodeParams = {
			table: 'mytable',
			schema: 'myschema',
			updateKey: 'id',
			columns: 'id,name',
			additionalFields: {},
			returnFields: '*',
		};
		const getNodeParam = (key: string) => nodeParams[key];
		const pgp = pgPromise();
		const any = jest.fn();
		const db = { any };

		const items = [
			{
				json: updateItem,
			},
		];

		await PostgresFun.pgUpdate(getNodeParam, pgp, db, items);

		expect(db.any).toHaveBeenCalledWith(
			'update "myschema"."mytable" as t set "id"=v."id","name"=v."name" from (values(1234,\'test\')) as v("id","name") WHERE v."id" = t."id" RETURNING *',
		);
	});

	it('runs query to update db if updateKey is not in columns', async () => {
		const updateItem = { id: 1234, name: 'test' };
		const nodeParams: NodeParams = {
			table: 'mytable',
			schema: 'myschema',
			updateKey: 'id',
			columns: 'name',
			additionalFields: {},
			returnFields: '*',
		};
		const getNodeParam = (key: string) => nodeParams[key];
		const pgp = pgPromise();
		const any = jest.fn();
		const db = { any };

		const items = [
			{
				json: updateItem,
			},
		];

		const results = await PostgresFun.pgUpdate(getNodeParam, pgp, db, items);

		expect(db.any).toHaveBeenCalledWith(
			'update "myschema"."mytable" as t set "id"=v."id","name"=v."name" from (values(1234,\'test\')) as v("id","name") WHERE v."id" = t."id" RETURNING *',
		);
	});

	it('runs query to update db with cast as updateKey', async () => {
		const updateItem = { id: '1234', name: 'test' };
		const nodeParams: NodeParams = {
			table: 'mytable',
			schema: 'myschema',
			updateKey: 'id:uuid',
			columns: 'name',
			additionalFields: {},
			returnFields: '*',
		};
		const getNodeParam = (key: string) => nodeParams[key];
		const pgp = pgPromise();
		const any = jest.fn();
		const db = { any };

		const items = [
			{
				json: updateItem,
			},
		];

		await PostgresFun.pgUpdate(getNodeParam, pgp, db, items);

		expect(db.any).toHaveBeenCalledWith(
			'update "myschema"."mytable" as t set "id"=v."id","name"=v."name" from (values(\'1234\'::uuid,\'test\')) as v("id","name") WHERE v."id" = t."id" RETURNING *',
		);
	});

	it('runs query to update db with cast in target columns', async () => {
		const updateItem = { id: '1234', name: 'test' };
		const nodeParams: NodeParams = {
			table: 'mytable',
			schema: 'myschema',
			updateKey: 'id',
			columns: 'id:uuid,name',
			additionalFields: {},
			returnFields: '*',
		};
		const getNodeParam = (key: string) => nodeParams[key];
		const pgp = pgPromise();
		const any = jest.fn();
		const db = { any };

		const items = [
			{
				json: updateItem,
			},
		];

		await PostgresFun.pgUpdate(getNodeParam, pgp, db, items);

		expect(db.any).toHaveBeenCalledWith(
			'update "myschema"."mytable" as t set "id"=v."id","name"=v."name" from (values(\'1234\'::uuid,\'test\')) as v("id","name") WHERE v."id" = t."id" RETURNING *',
		);
	});
});

describe('pgInsert', () => {
	it('runs query to insert', async () => {
		const insertItem = { id: 1234, name: 'test', age: 34 };
		const nodeParams: NodeParams = {
			table: 'mytable',
			schema: 'myschema',
			columns: 'id,name,age',
			returnFields: '*',
			additionalFields: {},
		};
		const getNodeParam = (key: string) => nodeParams[key];
		const pgp = pgPromise();
		const any = jest.fn();
		const db = { any };

		const items = [
			{
				json: insertItem,
			},
		];

		await PostgresFun.pgInsert(getNodeParam, pgp, db, items);

		expect(db.any).toHaveBeenCalledWith(
			'insert into "myschema"."mytable"("id","name","age") values(1234,\'test\',34) RETURNING *',
		);
	});

	it('runs query to insert with type casting', async () => {
		const insertItem = { id: 1234, name: 'test', age: 34 };
		const nodeParams: NodeParams = {
			table: 'mytable',
			schema: 'myschema',
			columns: 'id:int,name:text,age',
			returnFields: '*',
			additionalFields: {},
		};
		const getNodeParam = (key: string) => nodeParams[key];
		const pgp = pgPromise();
		const any = jest.fn();
		const db = { any };

		const items = [
			{
				json: insertItem,
			},
		];

		await PostgresFun.pgInsert(getNodeParam, pgp, db, items);

		expect(db.any).toHaveBeenCalledWith(
			'insert into "myschema"."mytable"("id","name","age") values(1234::int,\'test\'::text,34) RETURNING *',
		);
	});
});
