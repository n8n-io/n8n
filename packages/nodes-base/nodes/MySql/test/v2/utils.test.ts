import type { INode } from 'n8n-workflow';
import type { SortRule, WhereClause } from '../../v2/helpers/interfaces';

import {
	prepareQueryAndReplacements,
	wrapData,
	addWhereClauses,
	addSortRules,
	replaceEmptyStringsByNulls,
} from '../../v2/helpers/utils';

const mySqlMockNode: INode = {
	id: '1',
	name: 'MySQL node',
	typeVersion: 2,
	type: 'n8n-nodes-base.mySql',
	position: [60, 760],
	parameters: {
		operation: 'select',
	},
};

describe('Test MySql V2, prepareQueryAndReplacements', () => {
	it('should transform query and values', () => {
		const preparedQuery = prepareQueryAndReplacements(
			'SELECT * FROM $1:name WHERE id = $2 AND name = $4 AND $3:name = 28',
			['table', 15, 'age', 'Name'],
		);
		expect(preparedQuery).toBeDefined();
		expect(preparedQuery.query).toEqual(
			'SELECT * FROM `table` WHERE id = ? AND name = ? AND `age` = 28',
		);
		expect(preparedQuery.values.length).toEqual(2);
		expect(preparedQuery.values[0]).toEqual(15);
		expect(preparedQuery.values[1]).toEqual('Name');
	});
});

describe('Test MySql V2, wrapData', () => {
	it('should wrap object in json', () => {
		const data = {
			id: 1,
			name: 'Name',
		};
		const wrappedData = wrapData(data);
		expect(wrappedData).toBeDefined();
		expect(wrappedData).toEqual([{ json: data }]);
	});
	it('should wrap each object in array in json', () => {
		const data = [
			{
				id: 1,
				name: 'Name',
			},
			{
				id: 2,
				name: 'Name 2',
			},
		];
		const wrappedData = wrapData(data);
		expect(wrappedData).toBeDefined();
		expect(wrappedData).toEqual([{ json: data[0] }, { json: data[1] }]);
	});
	it('json key from source should be inside json', () => {
		const data = {
			json: {
				id: 1,
				name: 'Name',
			},
		};
		const wrappedData = wrapData(data);
		expect(wrappedData).toBeDefined();
		expect(wrappedData).toEqual([{ json: data }]);
		expect(Object.keys(wrappedData[0].json)).toContain('json');
	});
});

describe('Test MySql V2, addWhereClauses', () => {
	it('add where clauses to query', () => {
		const whereClauses: WhereClause[] = [
			{ column: 'species', condition: 'equal', value: 'dog' },
			{ column: 'name', condition: 'equal', value: 'Hunter' },
		];
		const [query, values] = addWhereClauses(
			mySqlMockNode,
			0,
			'SELECT * FROM `pet`',
			whereClauses,
			[],
		);
		expect(query).toEqual('SELECT * FROM `pet` WHERE `species` = ? AND `name` = ?');
		expect(values.length).toEqual(2);
		expect(values[0]).toEqual('dog');
		expect(values[1]).toEqual('Hunter');
	});
	it('add where clauses to query combined by OR', () => {
		const whereClauses: WhereClause[] = [
			{ column: 'species', condition: 'equal', value: 'dog' },
			{ column: 'name', condition: 'equal', value: 'Hunter' },
		];
		const [query, values] = addWhereClauses(
			mySqlMockNode,
			0,
			'SELECT * FROM `pet`',
			whereClauses,
			[],
			'OR',
		);
		expect(query).toEqual('SELECT * FROM `pet` WHERE `species` = ? OR `name` = ?');
		expect(values.length).toEqual(2);
		expect(values[0]).toEqual('dog');
		expect(values[1]).toEqual('Hunter');
	});
});

describe('Test MySql V2, addSortRules', () => {
	it('should add ORDER by', () => {
		const sortRules: SortRule[] = [
			{ column: 'name', direction: 'ASC' },
			{ column: 'age', direction: 'DESC' },
		];
		const [query, values] = addSortRules('SELECT * FROM `pet`', sortRules, []);

		expect(query).toEqual('SELECT * FROM `pet` ORDER BY `name` ASC, `age` DESC');
		expect(values.length).toEqual(0);
	});
});

describe('Test MySql V2, replaceEmptyStringsByNulls', () => {
	it('should replace empty strings', () => {
		const data = [
			{ json: { id: 1, name: '' } },
			{ json: { id: '', name: '' } },
			{ json: { id: null, data: '' } },
		];
		const replacedData = replaceEmptyStringsByNulls(data, true);
		expect(replacedData).toBeDefined();
		expect(replacedData).toEqual([
			{ json: { id: 1, name: null } },
			{ json: { id: null, name: null } },
			{ json: { id: null, data: null } },
		]);
	});
	it('should not replace empty strings', () => {
		const data = [{ json: { id: 1, name: '' } }];
		const replacedData = replaceEmptyStringsByNulls(data);
		expect(replacedData).toBeDefined();
		expect(replacedData).toEqual([{ json: { id: 1, name: '' } }]);
	});
});
