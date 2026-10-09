import { readFileSync } from 'node:fs';
import path from 'node:path';

const schemaDir = path.join(__dirname, '..', '__schema__');

const readSchema = (version: string, file: string) => {
	const content = readFileSync(path.join(schemaDir, version, 'message', file), 'utf-8');
	return JSON.parse(content) as { properties: Record<string, unknown> };
};

describe.each(['v2.1.0', 'v2.2.0'])('Gmail message output schemas %s', (version) => {
	describe.each(['get', 'getAll'])('%s', (operation) => {
		it('describes the simplified output by default', () => {
			const { properties } = readSchema(version, `${operation}.json`);

			expect(properties).toHaveProperty('From');
			expect(properties).toHaveProperty('Subject');
			expect(properties).not.toHaveProperty('from');
		});

		it('describes the parsed email when Simplify is off', () => {
			const { properties } = readSchema(version, `${operation}.simple-false.json`);

			expect(properties).toHaveProperty('from');
			expect(properties).toHaveProperty('headers');
			expect(properties).toHaveProperty('text');
			expect(properties).toHaveProperty('html');
			expect(properties).toHaveProperty('textAsHtml');
			expect(properties).not.toHaveProperty('From');
		});
	});
});
