import { mock } from 'jest-mock-extended';

import type { INode } from '../src/Interfaces';
import {
	hasDotNotationBannedChar,
	backslashEscape,
	dollarEscape,
	applyAccessPatterns,
	extractReferencesInNodeExpressions,
} from '../src/NodeReferenceParserUtils';

const mockNode = (name: string, expressions?: string[]) =>
	mock<INode>({
		parameters: Object.fromEntries(expressions?.map((x, i) => [`p${i}`, `={{ ${x} }}`]) ?? []),
		name,
	});

describe('NodeReferenceParserUtils', () => {
	describe('hasDotNotationBannedChar', () => {
		it('should return true for strings with banned characters', () => {
			expect(hasDotNotationBannedChar('1abc')).toBe(true);
			expect(hasDotNotationBannedChar('abc!')).toBe(true);
			expect(hasDotNotationBannedChar('abc@')).toBe(true);
		});

		it('should return false for strings without banned characters', () => {
			expect(hasDotNotationBannedChar('abc')).toBe(false);
			expect(hasDotNotationBannedChar('validName')).toBe(false);
		});
	});

	describe('backslashEscape', () => {
		it('should escape special characters with a backslash', () => {
			expect(backslashEscape('abc.def')).toBe('abc\\.def');
			expect(backslashEscape('[abc]')).toBe('\\[abc\\]');
			expect(backslashEscape('a+b')).toBe('a\\+b');
		});

		it('should return the same string if no escapable characters are present', () => {
			expect(backslashEscape('abc')).toBe('abc');
		});
	});

	describe('dollarEscape', () => {
		it('should escape dollar signs with double dollar signs', () => {
			expect(dollarEscape('$abc')).toBe('$$abc');
			expect(dollarEscape('abc$')).toBe('abc$$');
			expect(dollarEscape('$a$b$c')).toBe('$$a$$b$$c');
		});

		it('should return the same string if no dollar signs are present', () => {
			expect(dollarEscape('abc')).toBe('abc');
		});
	});

	describe('applyAccessPatterns', () => {
		it.each([
			{
				expression: '$node["oldName"].data',
				previousName: 'oldName',
				newName: 'newName',
				expected: '$node["newName"].data',
			},
			{
				expression: '$node.oldName.data',
				previousName: 'oldName',
				newName: 'new.Name',
				expected: '$node["new.Name"].data',
			},
			{
				expression: '$node["someOtherName"].data',
				previousName: 'oldName',
				newName: 'newName',
				expected: '$node["someOtherName"].data',
			},
			{
				expression: '$node["oldName"].data + $node["oldName"].info',
				previousName: 'oldName',
				newName: 'newName',
				expected: '$node["newName"].data + $node["newName"].info',
			},
			{
				expression: '$items("oldName", 0)',
				previousName: 'oldName',
				newName: 'newName',
				expected: '$items("newName", 0)',
			},
			{
				expression: "$items('oldName', 0)",
				previousName: 'oldName',
				newName: 'newName',
				expected: "$items('newName', 0)",
			},
			{
				expression: "$('oldName')",
				previousName: 'oldName',
				newName: 'newName',
				expected: "$('newName')",
			},
			{
				expression: '$("oldName")',
				previousName: 'oldName',
				newName: 'newName',
				expected: '$("newName")',
			},
			{
				expression: '$node["oldName"].data + $items("oldName", 0) + $("oldName")',
				previousName: 'oldName',
				newName: 'newName',
				expected: '$node["newName"].data + $items("newName", 0) + $("newName")',
			},
			{
				expression: '$node["oldName"].data + $items("oldName", 0)',
				previousName: 'oldName',
				newName: 'new-Name',
				expected: '$node["new-Name"].data + $items("new-Name", 0)',
			},
			{
				expression: '$node["old-Name"].data + $items("old-Name", 0)',
				previousName: 'old-Name',
				newName: 'newName',
				expected: '$node["newName"].data + $items("newName", 0)',
			},
			{
				expression: 'someRandomExpression("oldName")',
				previousName: 'oldName',
				newName: 'newName',
				expected: 'someRandomExpression("oldName")',
			},
			{
				expression: '$("old\\"Name")',
				previousName: 'old\\"Name',
				newName: 'n\\\'ew\\"Name',
				expected: '$("n\\\'ew\\"Name")',
			},
		])(
			'should correctly transform expression "$expression" with previousName "$previousName" and newName "$newName"',
			({ expression, previousName, newName, expected }) => {
				const result = applyAccessPatterns(expression, previousName, newName);
				expect(result).toBe(expected);
			},
		);
	});

	describe('extractReferencesInNodeExpressions', () => {
		let nodes: INode[] = [];
		let nodeNames: string[] = [];
		let startNodeName = 'Start';
		beforeEach(() => {
			nodes = [
				mockNode('B', ['$("A").item.json.myField']),
				mockNode('C', ['$("B").first().json.myField.anotherField']),
			];
			nodeNames = ['A', 'B', 'C'];
			startNodeName = 'Start';
		});

		it('should extract used expressions', () => {
			const result = extractReferencesInNodeExpressions(nodes, nodeNames, startNodeName);
			expect(result.nodes).toEqual(
				expect.arrayContaining(
					[
						{
							name: 'B',
							parameters: { p0: "$('Start').item.json.myField" },
						},
						{
							name: 'C',
							parameters: { p0: "$('Start').item.json.myField_anotherField" },
						},
					].map(expect.objectContaining),
				),
			);
			expect([...result.variables.entries()]).toEqual(
				expect.arrayContaining([
					['myField', '$("A").item.json.myField'],
					['myField_anotherField', '$("B").first().json.myField.anotherField'],
				]),
			);
		});
	});
});
