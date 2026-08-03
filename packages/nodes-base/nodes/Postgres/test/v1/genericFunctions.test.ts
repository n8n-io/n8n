import { mock } from 'vitest-mock-extended';
import pgPromise from 'pg-promise';

import * as PostgresFun from '../../v1/genericFunctions';
import type { PgpDatabase } from '../../v2/helpers/interfaces';

type NodeParams = Record<string, string | {}>;

const pgp = pgPromise();
const db = mock<PgpDatabase>();

describe('pgUpdate', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

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

	it('rejects column entries whose cast is not a valid PostgreSQL type', async () => {
		const nodeParams: NodeParams = {
			table: 'mytable',
			schema: 'myschema',
			updateKey: 'name',
			columns: 'name:foo.bar.baz',
			additionalFields: {},
			returnFields: '*',
		};
		const getNodeParam = (key: string) => nodeParams[key];

		const items = [{ json: { name: 'test' } }];

		await expect(PostgresFun.pgUpdate(getNodeParam, pgp, db, items)).rejects.toThrow(
			/Invalid column type/,
		);
		expect(db.any).not.toHaveBeenCalled();
	});

	it('rejects updateKey entries whose cast is not a valid PostgreSQL type', async () => {
		const nodeParams: NodeParams = {
			table: 'mytable',
			schema: 'myschema',
			updateKey: 'id:123uuid',
			columns: 'name',
			additionalFields: {},
			returnFields: '*',
		};
		const getNodeParam = (key: string) => nodeParams[key];

		const items = [{ json: { id: '1234', name: 'test' } }];

		await expect(PostgresFun.pgUpdate(getNodeParam, pgp, db, items)).rejects.toThrow(
			/Invalid column type/,
		);
		expect(db.any).not.toHaveBeenCalled();
	});
});

describe('pgInsert', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

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

		const items = [
			{
				json: insertItem,
			},
		];

		await PostgresFun.pgInsert(getNodeParam, pgp, db, items, false);

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

		const items = [
			{
				json: insertItem,
			},
		];

		await PostgresFun.pgInsert(getNodeParam, pgp, db, items, false);

		expect(db.any).toHaveBeenCalledWith(
			'insert into "myschema"."mytable"("id","name","age") values(1234::int,\'test\'::text,34) RETURNING *',
		);
	});

	it('accepts type casts with precision and array suffixes', async () => {
		const insertItem = { code: 'abc', scores: '{1,2}' };
		const nodeParams: NodeParams = {
			table: 'mytable',
			schema: 'myschema',
			columns: 'code:varchar(10),scores:int[]',
			returnFields: '*',
			additionalFields: {},
		};
		const getNodeParam = (key: string) => nodeParams[key];

		const items = [{ json: insertItem }];

		await PostgresFun.pgInsert(getNodeParam, pgp, db, items, false);

		expect(db.any).toHaveBeenCalledWith(
			'insert into "myschema"."mytable"("code","scores") values(\'abc\'::varchar(10),\'{1,2}\'::int[]) RETURNING *',
		);
	});

	it('rejects column entries whose cast is not a valid PostgreSQL type', async () => {
		const nodeParams: NodeParams = {
			table: 'mytable',
			schema: 'myschema',
			columns: 'name:foo()',
			returnFields: '*',
			additionalFields: {},
		};
		const getNodeParam = (key: string) => nodeParams[key];

		const items = [{ json: { name: 'test' } }];

		await expect(PostgresFun.pgInsert(getNodeParam, pgp, db, items, false)).rejects.toThrow(
			/Invalid column type/,
		);
		expect(db.any).not.toHaveBeenCalled();
	});

	it('rejects column entries with unexpected punctuation in the cast', async () => {
		const nodeParams: NodeParams = {
			table: 'mytable',
			schema: 'myschema',
			columns: 'name:foo;bar',
			returnFields: '*',
			additionalFields: {},
		};
		const getNodeParam = (key: string) => nodeParams[key];

		const items = [{ json: { name: 'test' } }];

		await expect(PostgresFun.pgInsert(getNodeParam, pgp, db, items, false)).rejects.toThrow(
			/Invalid column type/,
		);
		expect(db.any).not.toHaveBeenCalled();
	});

	it('rejects column entries with stray quote characters in the cast', async () => {
		const nodeParams: NodeParams = {
			table: 'mytable',
			schema: 'myschema',
			columns: "name:foo'bar",
			returnFields: '*',
			additionalFields: {},
		};
		const getNodeParam = (key: string) => nodeParams[key];

		const items = [{ json: { name: 'test' } }];

		await expect(PostgresFun.pgInsert(getNodeParam, pgp, db, items, false)).rejects.toThrow(
			/Invalid column type/,
		);
		expect(db.any).not.toHaveBeenCalled();
	});

	it('accepts ARRAY type casts with parameterized element type', async () => {
		const insertItem = { tags: '{1,2,3}' };
		const nodeParams: NodeParams = {
			table: 'mytable',
			schema: 'myschema',
			columns: 'tags:ARRAY(INTEGER)',
			returnFields: '*',
			additionalFields: {},
		};
		const getNodeParam = (key: string) => nodeParams[key];

		const items = [{ json: insertItem }];

		await PostgresFun.pgInsert(getNodeParam, pgp, db, items, false);

		expect(db.any).toHaveBeenCalledWith(
			'insert into "myschema"."mytable"("tags") values(\'{1,2,3}\'::ARRAY(INTEGER)) RETURNING *',
		);
	});

	it('accepts OBJECT type casts with column policy', async () => {
		const insertItem = { meta: 'x' };
		const nodeParams: NodeParams = {
			table: 'mytable',
			schema: 'myschema',
			columns: 'meta:OBJECT(DYNAMIC)',
			returnFields: '*',
			additionalFields: {},
		};
		const getNodeParam = (key: string) => nodeParams[key];

		const items = [{ json: insertItem }];

		await PostgresFun.pgInsert(getNodeParam, pgp, db, items, false);

		expect(db.any).toHaveBeenCalledWith(
			'insert into "myschema"."mytable"("meta") values(\'x\'::OBJECT(DYNAMIC)) RETURNING *',
		);
	});

	it('accepts GEOHASH type casts with precision', async () => {
		const insertItem = { location: 'u4pruydqqvj' };
		const nodeParams: NodeParams = {
			table: 'mytable',
			schema: 'myschema',
			columns: 'location:geohash(8c)',
			returnFields: '*',
			additionalFields: {},
		};
		const getNodeParam = (key: string) => nodeParams[key];

		const items = [{ json: insertItem }];

		await PostgresFun.pgInsert(getNodeParam, pgp, db, items, false);

		expect(db.any).toHaveBeenCalledWith(
			'insert into "myschema"."mytable"("location") values(\'u4pruydqqvj\'::geohash(8c)) RETURNING *',
		);
	});

	it('accepts schema-qualified type casts', async () => {
		const insertItem = { email: 'a@b.com' };
		const nodeParams: NodeParams = {
			table: 'mytable',
			schema: 'myschema',
			columns: 'email:public.citext',
			returnFields: '*',
			additionalFields: {},
		};
		const getNodeParam = (key: string) => nodeParams[key];

		const items = [{ json: insertItem }];

		await PostgresFun.pgInsert(getNodeParam, pgp, db, items, false);

		expect(db.any).toHaveBeenCalledWith(
			'insert into "myschema"."mytable"("email") values(\'a@b.com\'::public.citext) RETURNING *',
		);
	});

	it('accepts type casts with precision and a trailing modifier', async () => {
		const insertItem = { t: '2026-01-01T00:00:00Z' };
		const nodeParams: NodeParams = {
			table: 'mytable',
			schema: 'myschema',
			columns: 't:timestamp(3) with time zone',
			returnFields: '*',
			additionalFields: {},
		};
		const getNodeParam = (key: string) => nodeParams[key];

		const items = [{ json: insertItem }];

		await PostgresFun.pgInsert(getNodeParam, pgp, db, items, false);

		expect(db.any).toHaveBeenCalledWith(
			'insert into "myschema"."mytable"("t") values(\'2026-01-01T00:00:00Z\'::timestamp(3) with time zone) RETURNING *',
		);
	});
});
