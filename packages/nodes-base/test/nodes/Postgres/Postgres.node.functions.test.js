const PostgresFun = require('../../../nodes/Postgres/Postgres.node.functions')
const pgPromise = require('pg-promise');

describe('pgUpdate', () => {
	it('runs query to update db', async () => {
		const updateItem = {id: 1234, name: 'test'};
		const nodeParams = {
			table: 'mytable',
			schema: 'myschema',
			updateKey: 'id',
			columns: 'id,name'
		};
		const getNodeParam = (key) => nodeParams[key];
		const pgp = pgPromise();
		const none = jest.fn();
		const db = {none};

		const items = [
			{
				json: updateItem
			}
		];

		const results = await PostgresFun.pgUpdate(getNodeParam, pgp, db, items)

		expect(db.none).toHaveBeenCalledWith(`update \"myschema\".\"mytable\" as t set \"id\"=v.\"id\",\"name\"=v.\"name\" from (values(1234,'test')) as v(\"id\",\"name\") WHERE v.id = t.id`);
		expect(results).toEqual([updateItem]);
	});

	it('runs query to update db if updateKey is not in columns', async () => {
		const updateItem = {id: 1234, name: 'test'};
		const nodeParams = {
			table: 'mytable',
			schema: 'myschema',
			updateKey: 'id',
			columns: 'name'
		};
		const getNodeParam = (key) => nodeParams[key];
		const pgp = pgPromise();
		const none = jest.fn();
		const db = {none};

		const items = [
			{
				json: updateItem
			}
		];

		const results = await PostgresFun.pgUpdate(getNodeParam, pgp, db, items)

		expect(db.none).toHaveBeenCalledWith(`update \"myschema\".\"mytable\" as t set \"id\"=v.\"id\",\"name\"=v.\"name\" from (values(1234,'test')) as v(\"id\",\"name\") WHERE v.id = t.id`);
		expect(results).toEqual([updateItem]);
	});

	it('runs query to update db with cast as updateKey', async () => {
		const updateItem = {id: '1234', name: 'test'};
		const nodeParams = {
			table: 'mytable',
			schema: 'myschema',
			updateKey: 'id:uuid',
			columns: 'name'
		};
		const getNodeParam = (key) => nodeParams[key];
		const pgp = pgPromise();
		const none = jest.fn();
		const db = {none};

		const items = [
			{
				json: updateItem
			}
		];

		const results = await PostgresFun.pgUpdate(getNodeParam, pgp, db, items)

		expect(db.none).toHaveBeenCalledWith(`update \"myschema\".\"mytable\" as t set \"id\"=v.\"id\",\"name\"=v.\"name\" from (values('1234'::uuid,'test')) as v(\"id\",\"name\") WHERE v.id = t.id`);
		expect(results).toEqual([updateItem]);
	});

	it('runs query to update db with cast in target columns', async () => {
		const updateItem = {id: '1234', name: 'test'};
		const nodeParams = {
			table: 'mytable',
			schema: 'myschema',
			updateKey: 'id',
			columns: 'id:uuid,name'
		};
		const getNodeParam = (key) => nodeParams[key];
		const pgp = pgPromise();
		const none = jest.fn();
		const db = {none};

		const items = [
			{
				json: updateItem
			}
		];

		const results = await PostgresFun.pgUpdate(getNodeParam, pgp, db, items)

		expect(db.none).toHaveBeenCalledWith(`update \"myschema\".\"mytable\" as t set \"id\"=v.\"id\",\"name\"=v.\"name\" from (values('1234'::uuid,'test')) as v(\"id\",\"name\") WHERE v.id = t.id`);
		expect(results).toEqual([updateItem]);
	});
});
