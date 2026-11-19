import { READ_ONLY_ANNOTATIONS, resolveNodeAnnotations } from 'n8n-workflow';

import { Merge } from '../Merge.node';

describe('Merge, annotations', () => {
	const merge = new Merge();

	describe('v1', () => {
		const description = merge.getNodeType(1).description;

		it.each([
			{},
			{ mode: 'append' },
			{ mode: 'keepKeyMatches' },
			{ mode: 'mergeByIndex', join: 'inner' },
			{ mode: 'mergeByIndex', join: 'left' },
			{ mode: 'mergeByIndex', join: 'outer' },
			{ mode: 'mergeByKey', overwrite: 'always' },
			{ mode: 'mergeByKey', overwrite: 'blank' },
			{ mode: 'mergeByKey', overwrite: 'undefined' },
			{ mode: 'multiplex' },
			{ mode: 'passThrough', output: 'input1' },
			{ mode: 'passThrough', output: 'input2' },
			{ mode: 'removeKeyMatches' },
			{ mode: 'wait' },
		])('should resolve %j as read-only', (parameters) => {
			expect(resolveNodeAnnotations(description, { parameters, typeVersion: 1 })).toEqual(
				READ_ONLY_ANNOTATIONS,
			);
		});
	});

	describe.each([2, 2.1])('v%s', (typeVersion) => {
		const description = merge.getNodeType(typeVersion).description;

		it.each([
			{},
			{ mode: 'append' },
			{ mode: 'combine', combinationMode: 'mergeByFields', joinMode: 'keepMatches' },
			{ mode: 'combine', combinationMode: 'mergeByFields', joinMode: 'keepNonMatches' },
			{ mode: 'combine', combinationMode: 'mergeByFields', joinMode: 'keepEverything' },
			{ mode: 'combine', combinationMode: 'mergeByFields', joinMode: 'enrichInput1' },
			{ mode: 'combine', combinationMode: 'mergeByFields', joinMode: 'enrichInput2' },
			{ mode: 'combine', combinationMode: 'mergeByPosition' },
			{ mode: 'combine', combinationMode: 'multiplex' },
			{ mode: 'chooseBranch', output: 'input1' },
			{ mode: 'chooseBranch', output: 'input2' },
			{ mode: 'chooseBranch', output: 'empty' },
		])('should resolve %j as read-only', (parameters) => {
			expect(resolveNodeAnnotations(description, { parameters, typeVersion })).toEqual(
				READ_ONLY_ANNOTATIONS,
			);
		});
	});

	describe.each([3, 3.1, 3.2])('v%s', (typeVersion) => {
		const description = merge.getNodeType(typeVersion).description;

		it.each([
			{},
			{ mode: 'append' },
			{ mode: 'append', numberInputs: 10 },
			{ mode: 'combine', combineBy: 'combineByFields', joinMode: 'keepMatches' },
			{ mode: 'combine', combineBy: 'combineByFields', joinMode: 'keepNonMatches' },
			{ mode: 'combine', combineBy: 'combineByFields', joinMode: 'keepEverything' },
			{ mode: 'combine', combineBy: 'combineByFields', joinMode: 'enrichInput1' },
			{ mode: 'combine', combineBy: 'combineByFields', joinMode: 'enrichInput2' },
			{ mode: 'combine', combineBy: 'combineByPosition' },
			{ mode: 'combine', combineBy: 'combineAll' },
			{ mode: 'combineBySql', query: 'SELECT * FROM input1' },
			{ mode: 'chooseBranch', output: 'specifiedInput' },
			{ mode: 'chooseBranch', output: 'empty' },
		])('should resolve %j as read-only', (parameters) => {
			expect(resolveNodeAnnotations(description, { parameters, typeVersion })).toEqual(
				READ_ONLY_ANNOTATIONS,
			);
		});
	});
});
