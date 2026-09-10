import { createInMemoryProject } from '@n8n/rules-engine/ast';
import { describe, expect, it } from 'vitest';

import { DerivedOutputKeysRule } from './derived-output-keys.rule.js';

describe('DerivedOutputKeysRule', () => {
	const rule = new DerivedOutputKeysRule();

	const analyze = (code: string) => {
		const project = createInMemoryProject();
		project.createSourceFile('node.ts', code);
		return rule.analyzeProject(project).map((v) => v.message);
	};

	describe('flags derived keys that reach output', () => {
		it('a template literal key on a returned object', () => {
			const messages = analyze(`
				function prepend(prefix: string, properties: Record<string, unknown>) {
					for (const key of Object.keys(properties)) {
						properties[\`\${prefix}_\${snakeCase(key)}\`] = properties[key];
					}
					return properties;
				}
			`);

			expect(messages).toHaveLength(1);
			expect(messages[0]).toContain('prepend');
			expect(messages[0]).toContain('template literal');
		});

		it('a transform call on an element of a returned array', () => {
			const messages = analyze(`
				function keysToSnakeCase(elements: IDataObject[]) {
					for (const element of elements) {
						for (const key of Object.keys(element)) {
							element[snakeCase(key)] = element[key];
						}
					}
					return elements;
				}
			`);

			expect(messages).toHaveLength(1);
			expect(messages[0]).toContain('snakeCase');
		});

		it('a key computed one statement earlier', () => {
			const messages = analyze(`
				function rename(obj: IDataObject, key: string) {
					const newKey = key.replace(/\\s/g, '_');
					obj[newKey] = obj[key];
					return obj;
				}
			`);

			expect(messages).toHaveLength(1);
			expect(messages[0]).toContain('replace');
		});

		it('a write into item.json', () => {
			const messages = analyze(`
				function fill(item: INodeExecutionData, name: string) {
					item.json[name.toLowerCase()] = true;
				}
			`);

			expect(messages).toHaveLength(1);
		});

		it('an object pushed onto the returned array', () => {
			const messages = analyze(`
				function run(rows: IDataObject[]) {
					const returnData: INodeExecutionData[] = [];
					for (const row of rows) {
						const json: IDataObject = {};
						json[normalizeFieldName(row.name as string)] = row.value;
						returnData.push({ json });
					}
					return returnData;
				}
			`);

			expect(messages).toHaveLength(1);
			expect(messages[0]).toContain('normalizeFieldName');
		});

		it('an object passed to returnJsonArray', () => {
			const messages = analyze(`
				function run(this: IExecuteFunctions, data: IDataObject) {
					const simplified: IDataObject = {};
					for (const key of Object.keys(data)) {
						simplified[camelCase(key)] = data[key];
					}
					return this.helpers.returnJsonArray(simplified);
				}
			`);

			expect(messages).toHaveLength(1);
		});

		it('a write inside a nested callback on an object declared outside it', () => {
			const messages = analyze(`
				function addSuffixToEntriesKeys(data: INodeExecutionData[], suffix: string) {
					return data.map((entry) => {
						const json: IDataObject = {};
						Object.keys(entry.json).forEach((key) => {
							json[\`\${key}_\${suffix}\`] = entry.json[key];
						});
						return { ...entry, json };
					});
				}
			`);

			expect(messages).toHaveLength(1);
			expect(messages[0]).toContain('addSuffixToEntriesKeys');
		});

		it('a computed property in a returned object literal', () => {
			const messages = analyze(`
				const toEntry = (key: string, value: unknown) => ({ [\`field_\${key}\`]: value });
			`);

			expect(messages).toHaveLength(1);
			expect(messages[0]).toContain('toEntry');
		});
	});

	describe('ignores', () => {
		it('a key produced by deriveOutputKey', () => {
			expect(
				analyze(`
					function prepend(prefix: string, properties: IDataObject, version: number) {
						const strategy = version >= 3 ? 'snake_case_unicode' : 'snake_case_ascii';
						for (const key of Object.keys(properties)) {
							properties[deriveOutputKey(key, { strategy, prefix })] = properties[key];
						}
						return properties;
					}
				`),
			).toEqual([]);
		});

		it('a key produced by deriveOutputKey one statement earlier', () => {
			expect(
				analyze(`
					function keysToSnakeCase(elements: IDataObject[]) {
						for (const element of elements) {
							for (const key of Object.keys(element)) {
								const snakeKey = deriveOutputKey(key, { strategy: 'snake_case_unicode' });
								if (key !== snakeKey) element[snakeKey] = element[key];
							}
						}
						return elements;
					}
				`),
			).toEqual([]);
		});

		it('a template literal that only converts the key to a string', () => {
			expect(
				analyze(`
					function wrap(values: Array<{ key: string; value: unknown }>) {
						return values.map((value) => ({ [\`\${value.key}\`]: value.value }));
					}
				`),
			).toEqual([]);
		});

		it('a reduce accumulator that ends up in a request body', () => {
			expect(
				analyze(`
					async function send(this: IExecuteFunctions, attributes: Array<{ name: string }>) {
						const requested = attributes.reduce<IDataObject>((acc, cur) => {
							acc[cur.name.toUpperCase()] = true;
							return acc;
						}, {});
						return await this.helpers.httpRequest({ method: 'POST', body: { requested } });
					}
				`),
			).toEqual([]);
		});

		it('a key forwarded unchanged', () => {
			expect(
				analyze(`
					function copy(source: IDataObject) {
						const result: IDataObject = {};
						for (const key of Object.keys(source)) {
							result[key] = source[key];
						}
						return result;
					}
				`),
			).toEqual([]);
		});

		it('a derived key on a request body', () => {
			expect(
				analyze(`
					async function send(this: IExecuteFunctions, fields: IDataObject) {
						const body: IDataObject = {};
						for (const key of Object.keys(fields)) {
							body[snakeCase(key)] = fields[key];
						}
						return await this.helpers.httpRequest({ method: 'POST', body });
					}
				`),
			).toEqual([]);
		});

		it('a literal key', () => {
			expect(
				analyze(`
					function tag(result: IDataObject) {
						result['created_at'] = Date.now();
						return result;
					}
				`),
			).toEqual([]);
		});

		it('a numeric index', () => {
			expect(
				analyze(`
					function fill(result: IDataObject[]) {
						for (let i = 0; i < 3; i++) {
							result[i] = { index: i };
						}
						return result;
					}
				`),
			).toEqual([]);
		});

		it('a binary property name built from a prefix and index', () => {
			expect(
				analyze(`
					function attach(item: INodeExecutionData, index: number, data: IBinaryData) {
						item.binary![\`attachment_\${index}\`] = data;
						return item;
					}
				`),
			).toEqual([]);
		});

		it('a derived key on an object that never reaches output', () => {
			expect(
				analyze(`
					function index(items: IDataObject[]) {
						const lookup: IDataObject = {};
						for (const item of items) {
							lookup[String(item.id).toLowerCase()] = item;
						}
						log(lookup);
					}
				`),
			).toEqual([]);
		});
	});
});
