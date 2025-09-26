import type { INode } from '../src/interfaces';
import {
	hasDotNotationBannedChar,
	backslashEscape,
	dollarEscape,
	applyAccessPatterns,
	extractReferencesInNodeExpressions,
} from '../src/node-reference-parser-utils';

const makeNode = (name: string, expressions?: string[]) =>
	({
		parameters: Object.fromEntries(expressions?.map((x, i) => [`p${i}`, `={{ ${x} }}`]) ?? []),
		name,
	}) as INode;

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
				makeNode('B', ['$("A").item.json.myField']),
				makeNode('C', ['$("A").first().json.myField.anotherField']),
			];
			nodeNames = ['A', 'B', 'C'];
			startNodeName = 'Start';
		});
		it('should extract used expressions', () => {
			const result = extractReferencesInNodeExpressions(nodes, nodeNames, startNodeName);
			expect([...result.variables.entries()]).toEqual([
				['myField', '$("A").item.json.myField'],
				['myField_anotherField_firstItem', '$("A").first().json.myField.anotherField'],
			]);
			expect(result.nodes).toEqual([
				{
					name: 'B',
					parameters: { p0: "={{ $('Start').item.json.myField }}" },
				},
				{
					name: 'C',
					parameters: { p0: "={{ $('Start').first().json.myField_anotherField_firstItem }}" },
				},
			]);
		});
		it('should handle metadata functions', () => {
			nodes = [
				makeNode('B', ['$("A").isExecuted ? 1 : 2']),
				makeNode('C', ['someFunction($("D").params["resource"])']),
			];
			nodeNames = ['A', 'B', 'C', 'D'];

			const result = extractReferencesInNodeExpressions(nodes, nodeNames, startNodeName);
			expect([...result.variables.entries()]).toEqual([
				['A_isExecuted', '$("A").isExecuted'],
				['D_params', '$("D").params'],
			]);
			expect(result.nodes).toEqual([
				{
					name: 'B',
					parameters: { p0: "={{ $('Start').first().json.A_isExecuted ? 1 : 2 }}" },
				},
				{
					name: 'C',
					parameters: { p0: '={{ someFunction($(\'Start\').first().json.D_params["resource"]) }}' },
				},
			]);
		});
		it('should not handle standalone node references', () => {
			nodes = [makeNode('B', ['$("D")'])];
			nodeNames = ['B', 'D'];

			const result = extractReferencesInNodeExpressions(nodes, nodeNames, startNodeName, ['B']);
			expect([...result.variables.entries()]).toEqual([]);
			expect(result.nodes).toEqual([
				{
					name: 'B',
					parameters: { p0: '={{ $("D") }}' },
				},
			]);
		});

		it('should not handle reference to non-existent node', () => {
			nodes = [makeNode('B', ['$("E").item.json.x'])];
			nodeNames = ['B'];

			const result = extractReferencesInNodeExpressions(nodes, nodeNames, startNodeName, ['B']);
			expect([...result.variables.entries()]).toEqual([]);
			expect(result.nodes).toEqual([
				{
					name: 'B',
					parameters: { p0: '={{ $("E").item.json.x }}' },
				},
			]);
		});
		it('should not handle invalid node references', () => {
			nodes = [makeNode('B', ['$("D)'])];
			nodeNames = ['B', 'D'];

			const result = extractReferencesInNodeExpressions(nodes, nodeNames, startNodeName);
			expect([...result.variables.entries()]).toEqual([]);
			expect(result.nodes).toEqual([
				{
					name: 'B',
					parameters: { p0: '={{ $("D) }}' },
				},
			]);
		});
		it('should not handle new fields on the node', () => {
			nodes = [makeNode('B', ['$("D").thisIsNotAField.json.x.y.z'])];
			nodeNames = ['B', 'D'];

			const result = extractReferencesInNodeExpressions(nodes, nodeNames, startNodeName);
			expect([...result.variables.entries()]).toEqual([]);
			expect(result.nodes).toEqual([
				{
					name: 'B',
					parameters: { p0: '={{ $("D").thisIsNotAField.json.x.y.z }}' },
				},
			]);
		});
		it('should handle $json in graphInputNodeName only', () => {
			nodes = [makeNode('B', ['$json.a.b.c_d["e"]["f"]']), makeNode('C', ['$json.x.y.z'])];
			nodeNames = ['A', 'B', 'C'];

			const result = extractReferencesInNodeExpressions(nodes, nodeNames, startNodeName, ['B']);
			expect([...result.variables.entries()]).toEqual([['a_b_c_d', '$json.a.b.c_d']]);
			expect(result.nodes).toEqual([
				{
					name: 'B',
					parameters: { p0: '={{ $json.a_b_c_d["e"]["f"] }}' },
				},
				{
					name: 'C',
					parameters: { p0: '={{ $json.x.y.z }}' },
				},
			]);
		});
		it('should handle complex $json case for first node', () => {
			nodes = [
				{
					parameters: {
						p0: '=https://raw.githubusercontent.com/{{ $json.org }}/{{ $json.repo }}/refs/heads/master/package.json',
					},
					name: 'A',
				} as unknown as INode,
			];
			nodeNames = ['A', 'B'];

			const result = extractReferencesInNodeExpressions(nodes, nodeNames, startNodeName, ['A']);
			expect([...result.variables.entries()]).toEqual([
				['repo', '$json.repo'],
				['org', '$json.org'],
			]);
			expect(result.nodes).toEqual([
				{
					name: 'A',
					parameters: {
						p0: '=https://raw.githubusercontent.com/{{ $json.org }}/{{ $json.repo }}/refs/heads/master/package.json',
					},
				},
			]);
		});
		it('should support different node accessor patterns', () => {
			nodes = [
				makeNode('N', ['$("A").item.json.myField']),
				makeNode('O', ['$node["B"].item.json.myField']),
				makeNode('P', ['$node.C.item.json.myField']),
			];
			nodeNames = ['A', 'B', 'C', 'N', 'O', 'P'];

			const result = extractReferencesInNodeExpressions(nodes, nodeNames, startNodeName);
			expect([...result.variables.entries()]).toEqual([
				['myField', '$("A").item.json.myField'],
				['B_myField', '$node["B"].item.json.myField'],
				['C_myField', '$node.C.item.json.myField'],
			]);
			expect(result.nodes).toEqual([
				{
					name: 'N',
					parameters: { p0: "={{ $('Start').item.json.myField }}" },
				},
				{
					name: 'O',
					parameters: { p0: "={{ $('Start').item.json.B_myField }}" },
				},
				{
					name: 'P',
					parameters: { p0: "={{ $('Start').item.json.C_myField }}" },
				},
			]);
		});
		it('should handle simple name clashes', () => {
			nodes = [
				makeNode('B', ['$("A").item.json.myField']),
				makeNode('C', ['$("D").item.json.myField']),
				makeNode('E', ['$("F").item.json.myField']),
			];
			nodeNames = ['A', 'B', 'C', 'D', 'E', 'F'];
			const result = extractReferencesInNodeExpressions(nodes, nodeNames, startNodeName);
			expect([...result.variables.entries()]).toEqual([
				['myField', '$("A").item.json.myField'],
				['D_myField', '$("D").item.json.myField'],
				['F_myField', '$("F").item.json.myField'],
			]);
			expect(result.nodes).toEqual([
				{
					name: 'B',
					parameters: { p0: "={{ $('Start').item.json.myField }}" },
				},
				{
					name: 'C',
					parameters: { p0: "={{ $('Start').item.json.D_myField }}" },
				},
				{
					name: 'E',
					parameters: { p0: "={{ $('Start').item.json.F_myField }}" },
				},
			]);
		});

		it('should handle complex name clashes', () => {
			nodes = [
				makeNode('F', ['$("A").item.json.myField']),
				makeNode('B', ['$("A").item.json.Node_Name_With_Gap_myField']),
				makeNode('C', ['$("D").item.json.Node_Name_With_Gap_myField']),
				makeNode('E', ['$("Node_Name_With_Gap").item.json.myField']),
			];
			nodeNames = ['A', 'B', 'C', 'D', 'E', 'F', 'Node_Name_With_Gap'];
			const result = extractReferencesInNodeExpressions(nodes, nodeNames, startNodeName);
			expect([...result.variables.entries()]).toEqual([
				['myField', '$("A").item.json.myField'],
				['Node_Name_With_Gap_myField', '$("A").item.json.Node_Name_With_Gap_myField'],
				['D_Node_Name_With_Gap_myField', '$("D").item.json.Node_Name_With_Gap_myField'],
				// This is the `myField` variable from node 'E', referencing $("Node_Name_With_Gap").item.json.myField
				// It first has a clash with A.myField, requiring its node name to come attached
				// And then has _1 because it clashes B.Node_Name_With_Gap_myField
				['Node_Name_With_Gap_myField_1', '$("Node_Name_With_Gap").item.json.myField'],
			]);
			expect(result.nodes).toEqual([
				{ name: 'F', parameters: { p0: "={{ $('Start').item.json.myField }}" } },
				{
					name: 'B',
					parameters: { p0: "={{ $('Start').item.json.Node_Name_With_Gap_myField }}" },
				},
				{
					name: 'C',
					parameters: { p0: "={{ $('Start').item.json.D_Node_Name_With_Gap_myField }}" },
				},
				{
					name: 'E',
					parameters: { p0: "={{ $('Start').item.json.Node_Name_With_Gap_myField_1 }}" },
				},
			]);
		});

		it('should handle code node', () => {
			nodes = [
				{
					parameters: {
						jsCode:
							"for (const item of $input.all()) {\n  item.json.myNewField = $('DebugHelper').first().json.uid;\n}\n\nreturn $input.all();",
					},
					type: 'n8n-nodes-base.code',
					typeVersion: 2,
					position: [660, 0],
					id: 'c9de02d0-982a-4f8c-9af7-93f63795aa9b',
					name: 'Code',
				},
			];
			nodeNames = ['DebugHelper', 'Code'];
			const result = extractReferencesInNodeExpressions(nodes, nodeNames, startNodeName);
			expect([...result.variables.entries()]).toEqual([
				['uid_firstItem', "$('DebugHelper').first().json.uid"],
			]);
			expect(result.nodes).toEqual([
				{
					parameters: {
						jsCode:
							"for (const item of $input.all()) {\n  item.json.myNewField = $('Start').first().json.uid_firstItem;\n}\n\nreturn $input.all();",
					},
					type: 'n8n-nodes-base.code',
					typeVersion: 2,
					position: [660, 0],
					id: 'c9de02d0-982a-4f8c-9af7-93f63795aa9b',
					name: 'Code',
				},
			]);
		});
		it('should not extract expression referencing node in subGraph', () => {
			nodes = [
				makeNode('B', ['$("A").item.json.myField']),
				makeNode('C', ['$("B").first().json.myField.anotherField']),
			];
			nodeNames = ['A', 'B', 'C'];
			const result = extractReferencesInNodeExpressions(nodes, nodeNames, startNodeName);
			expect([...result.variables.entries()]).toEqual([['myField', '$("A").item.json.myField']]);
			expect(result.nodes).toEqual([
				{
					name: 'B',
					parameters: { p0: "={{ $('Start').item.json.myField }}" },
				},
				{
					name: 'C',
					parameters: { p0: '={{ $("B").first().json.myField.anotherField }}' },
				},
			]);
		});
		it('should throw if node name clashes with start name', () => {
			nodes = [makeNode('Start', ['$("A").item.json.myField'])];
			nodeNames = ['A', 'Start'];
			expect(() => extractReferencesInNodeExpressions(nodes, nodeNames, startNodeName)).toThrow();
		});

		it('should support custom Start node name', () => {
			nodes = [makeNode('Start', ['$("A").item.json.myField'])];
			nodeNames = ['A', 'Start'];
			startNodeName = 'A different start name';
			const result = extractReferencesInNodeExpressions(nodes, nodeNames, startNodeName);
			expect([...result.variables.entries()]).toEqual([['myField', '$("A").item.json.myField']]);
			expect(result.nodes).toEqual([
				{
					name: 'Start',
					parameters: { p0: "={{ $('A different start name').item.json.myField }}" },
				},
			]);
		});
		it('should throw if called with node in subgraph whose name is not in nodeNames list', () => {
			nodes = [makeNode('B', ['$("A").item.json.myField'])];
			nodeNames = ['A'];
			expect(() => extractReferencesInNodeExpressions(nodes, nodeNames, startNodeName)).toThrow();
		});
		it('handles multiple expressions referencing different nodes in the same string', () => {
			nodes = [makeNode('B', ['$("A").item.json.myField + $("C").item.json.anotherField'])];
			nodeNames = ['A', 'B', 'C'];
			const result = extractReferencesInNodeExpressions(nodes, nodeNames, startNodeName);
			expect([...result.variables.entries()]).toEqual([
				['anotherField', '$("C").item.json.anotherField'],
				['myField', '$("A").item.json.myField'],
			]);
			expect(result.nodes).toEqual([
				{
					name: 'B',
					parameters: {
						p0: "={{ $('Start').item.json.myField + $('Start').item.json.anotherField }}",
					},
				},
			]);
		});

		it('handles multiple expressions referencing different nested bits of the same field', () => {
			nodes = [
				makeNode('B', [
					'$("A").item.json.myField.nestedField',
					'$("A").item.json.myField.anotherNestedField',
					'$("A").item.json.myField.anotherNestedField.x.y.z',
				]),
			];
			nodeNames = ['A', 'B'];
			const result = extractReferencesInNodeExpressions(nodes, nodeNames, startNodeName);
			expect([...result.variables.entries()]).toEqual([
				['myField_nestedField', '$("A").item.json.myField.nestedField'],
				['myField_anotherNestedField', '$("A").item.json.myField.anotherNestedField'],
				['myField_anotherNestedField_x_y_z', '$("A").item.json.myField.anotherNestedField.x.y.z'],
			]);
			expect(result.nodes).toEqual([
				{
					name: 'B',
					parameters: {
						p0: "={{ $('Start').item.json.myField_nestedField }}",
						p1: "={{ $('Start').item.json.myField_anotherNestedField }}",
						p2: "={{ $('Start').item.json.myField_anotherNestedField_x_y_z }}",
					},
				},
			]);
		});

		it('handles first(), last(), all() and items at the same time', () => {
			nodes = [
				makeNode('B', [
					'$("A").first().json.myField',
					'$("A").last().json.myField',
					'$("A").all().json.myField',
					'$("A").item.json.myField',
					'$("A").first()',
					'$("A").all()',
				]),
			];
			nodeNames = ['A', 'B'];
			const result = extractReferencesInNodeExpressions(nodes, nodeNames, startNodeName);
			expect([...result.variables.entries()]).toEqual([
				['myField_firstItem', '$("A").first().json.myField'],
				['myField_lastItem', '$("A").last().json.myField'],
				['myField_allItems', '$("A").all().json.myField'],
				['myField', '$("A").item.json.myField'],
				['A_firstItem', '$("A").first()'],
				['A_allItems', '$("A").all()'],
			]);
			expect(result.nodes).toEqual([
				{
					name: 'B',
					parameters: {
						p0: "={{ $('Start').first().json.myField_firstItem }}",
						p1: "={{ $('Start').last().json.myField_lastItem }}",
						p2: "={{ $('Start').first().json.myField_allItems }}",
						p3: "={{ $('Start').item.json.myField }}",
						p4: "={{ $('Start').first().json.A_firstItem }}",
						p5: "={{ $('Start').first().json.A_allItems }}",
					},
				},
			]);
		});
		it('handles supported itemMatching examples', () => {
			nodes = [
				makeNode('B', [
					'$("A").itemMatching(0).json.myField',
					'$("A").itemMatching(1).json.myField',
					'$("C").itemMatching(1).json.myField',
					'$("A").itemMatching(20).json.myField',
				]),
			];
			nodeNames = ['A', 'B', 'C'];
			const result = extractReferencesInNodeExpressions(nodes, nodeNames, startNodeName);
			expect([...result.variables.entries()]).toEqual([
				['myField_itemMatching_0', '$("A").itemMatching(0).json.myField'],
				['myField_itemMatching_1', '$("A").itemMatching(1).json.myField'],
				['C_myField_itemMatching_1', '$("C").itemMatching(1).json.myField'],
				['myField_itemMatching_20', '$("A").itemMatching(20).json.myField'],
			]);
			expect(result.nodes).toEqual([
				{
					name: 'B',
					parameters: {
						p0: "={{ $('Start').itemMatching(0).json.myField_itemMatching_0 }}",
						p1: "={{ $('Start').itemMatching(1).json.myField_itemMatching_1 }}",
						p2: "={{ $('Start').itemMatching(1).json.C_myField_itemMatching_1 }}",
						p3: "={{ $('Start').itemMatching(20).json.myField_itemMatching_20 }}",
					},
				},
			]);
		});
		it('does not throw for complex itemMatching example', () => {
			nodes = [
				makeNode('B', [
					'$("A").itemMatching(Math.PI).json.myField',
					'$("A").itemMatching(eval("const fib = (n) => n < 2 ? 1 : (fib(n - 1) + fib(n-2)); fib(15)")).json.anotherField',
					'$("A").itemMatching($("A").itemMatch(1).json.myField).json.myField',
				]),
			];
			nodeNames = ['A', 'B'];
			expect(() =>
				extractReferencesInNodeExpressions(nodes, nodeNames, startNodeName),
			).not.toThrow();
		});
		it('should handle multiple expressions', () => {
			nodes = [
				makeNode('B', ['$("A").item.json.myField', '$("C").item.json.anotherField']),
				makeNode('D', ['$("A").item.json.myField', '$("B").item.json.someField']),
			];
			nodeNames = ['A', 'B', 'C', 'D'];
			const result = extractReferencesInNodeExpressions(nodes, nodeNames, startNodeName);
			expect([...result.variables.entries()]).toEqual([
				['myField', '$("A").item.json.myField'],
				['anotherField', '$("C").item.json.anotherField'],
			]);
			expect(result.nodes).toEqual([
				{
					name: 'B',
					parameters: {
						p0: "={{ $('Start').item.json.myField }}",
						p1: "={{ $('Start').item.json.anotherField }}",
					},
				},
				{
					name: 'D',
					parameters: {
						p0: "={{ $('Start').item.json.myField }}",
						p1: '={{ $("B").item.json.someField }}',
					},
				},
			]);
		});
		it('should support handle calls to normal js functions on the data accessor', () => {
			nodes = [makeNode('A', ['$("B B").first().toJsonObject().randomJSFunction()'])];
			nodeNames = ['A', 'B B'];
			const result = extractReferencesInNodeExpressions(nodes, nodeNames, startNodeName);
			expect([...result.variables.entries()]).toEqual([['B_B_firstItem', '$("B B").first()']]);
			expect(result.nodes).toEqual([
				{
					name: 'A',
					parameters: {
						p0: "={{ $('Start').first().json.B_B_firstItem.toJsonObject().randomJSFunction() }}",
					},
				},
			]);
		});
		it('should support handle spaces and special characters in nodeNames', () => {
			nodes = [
				makeNode('a_=-9-0!@#!%^$%&*(', ['$("A").item.json.myField']),
				makeNode('A node with spaces', [
					'$("A \\" |[w.e,i,r$d]| `\' Ñode  \\$\\( Name \\)").item.json.myField',
				]),
			];
			nodeNames = [
				'A',
				'A node with spaces',
				'A \\" |[w.e,i,r$d]| `\' Ñode  \\$\\( Name \\)',
				'a_=-9-0!@#!%^$%&*(',
			];
			const result = extractReferencesInNodeExpressions(nodes, nodeNames, startNodeName);
			expect([...result.variables.entries()]).toEqual([
				['myField', '$("A").item.json.myField'],
				[
					'A__weir$d__ode__$_Name__myField',
					'$("A \\" |[w.e,i,r$d]| `\' Ñode  \\$\\( Name \\)").item.json.myField',
				],
			]);
			expect(result.nodes).toEqual([
				{
					name: 'a_=-9-0!@#!%^$%&*(',
					parameters: { p0: "={{ $('Start').item.json.myField }}" },
				},
				{
					name: 'A node with spaces',
					parameters: { p0: "={{ $('Start').item.json.A__weir$d__ode__$_Name__myField }}" },
				},
			]);
		});
		it('should handle assignments format of Set node correctly', () => {
			nodes = [
				{
					parameters: {
						assignments: {
							assignments: [
								{
									id: 'cf8bd6cb-f28a-4a73-b141-02e5c22cfe74',
									name: 'ghApiBaseUrl',
									value: '={{ $("A").item.json.x.y.z }}',
									type: 'string',
								},
							],
						},
						options: {},
					},
					type: 'n8n-nodes-base.set',
					typeVersion: 3.4,
					position: [80, 80],
					id: '6e2fd284-2aba-4dee-8921-18be9a291484',
					name: 'Params',
				},
			];
			nodeNames = ['A', 'Params'];
			const result = extractReferencesInNodeExpressions(nodes, nodeNames, startNodeName);
			expect([...result.variables.entries()]).toEqual([['x_y_z', '$("A").item.json.x.y.z']]);
			expect(result.nodes).toEqual([
				{
					parameters: {
						assignments: {
							assignments: [
								{
									id: 'cf8bd6cb-f28a-4a73-b141-02e5c22cfe74',
									name: 'ghApiBaseUrl',
									value: "={{ $('Start').item.json.x_y_z }}",
									type: 'string',
								},
							],
						},
						options: {},
					},
					type: 'n8n-nodes-base.set',
					typeVersion: 3.4,
					position: [80, 80],
					id: '6e2fd284-2aba-4dee-8921-18be9a291484',
					name: 'Params',
				},
			]);
		});
		it('should support handle unexpected code after the data accessor', () => {
			nodes = [makeNode('A', ['$("B").all()[0].json.first_node_variable'])];
			nodeNames = ['A', 'B'];
			const result = extractReferencesInNodeExpressions(nodes, nodeNames, startNodeName);
			expect([...result.variables.entries()]).toEqual([['B_allItems', '$("B").all()']]);
			expect(result.nodes).toEqual([
				{
					name: 'A',
					parameters: {
						p0: "={{ $('Start').first().json.B_allItems[0].json.first_node_variable }}",
					},
				},
			]);
		});
		it('should carry over unrelated properties', () => {
			nodes = [
				{
					parameters: {
						a: 3,
						b: { c: 4, d: true },
						d: 'hello',
						e: "={{ $('goodbye').item.json.f }}",
					},
					name: 'A',
				} as unknown as INode,
			];
			nodeNames = ['A', 'goodbye'];
			const result = extractReferencesInNodeExpressions(nodes, nodeNames, startNodeName);
			expect([...result.variables.entries()]).toEqual([['f', "$('goodbye').item.json.f"]]);
			expect(result.nodes).toEqual([
				{
					parameters: {
						a: 3,
						b: { c: 4, d: true },
						d: 'hello',
						e: "={{ $('Start').item.json.f }}",
					},
					name: 'A',
				},
			]);
		});

		it('should extract "fieldToSplitOut" constant fields in n8n-nodes-base.splitOut', () => {
			nodes = [
				{
					parameters: {
						fieldToSplitOut: 'foo,bar',
					},
					type: 'n8n-nodes-base.splitOut',
					typeVersion: 1,
					position: [200, 200],
					id: 'splitOutNodeId',
					name: 'A',
				},
			];
			nodeNames = ['A', 'B'];

			const result = extractReferencesInNodeExpressions(nodes, nodeNames, startNodeName, ['A']);
			expect([...result.variables.entries()]).toEqual([
				['foo', '$json.foo'],
				['bar', '$json.bar'],
			]);
		});

		it('should error at extracting "fieldToSplitOut" expression in n8n-nodes-base.splitOut', () => {
			nodes = [
				{
					parameters: {
						fieldToSplitOut: '={{ foo,bar }}',
					},
					type: 'n8n-nodes-base.splitOut',
					typeVersion: 1,
					position: [200, 200],
					id: 'splitOutNodeId',
					name: 'A',
				},
			];
			nodeNames = ['A', 'B'];

			expect(() =>
				extractReferencesInNodeExpressions(nodes, nodeNames, startNodeName, ['A']),
			).toThrow('not supported');
		});
	});
});
