import { readFileSync } from 'node:fs';
import path from 'node:path';

interface PropertySchema {
	type?: string | string[];
	properties?: Record<string, PropertySchema>;
	additionalProperties?: boolean | PropertySchema;
	anyOf?: PropertySchema[];
}

const readSchema = (version: string, file: string): PropertySchema =>
	JSON.parse(
		readFileSync(path.join(__dirname, '..', '__schema__', version, 'databasePage', file), 'utf-8'),
	) as PropertySchema;

const hasDateObject = (schema: PropertySchema | boolean | undefined): boolean =>
	typeof schema === 'object' &&
	(schema.anyOf ?? [schema]).some(
		(option) => option.type === 'object' && option.properties && 'start' in option.properties,
	);

describe.each(['v3.0.0'])('Notion database page output schemas %s', (version) => {
	describe.each(['get', 'getAll'])('%s', (operation) => {
		it('describes the simplified output by default', () => {
			const schema = readSchema(version, `${operation}.json`);

			expect(Object.keys(schema.properties ?? {})).toEqual(['id', 'name', 'url']);
			expect(schema.additionalProperties).toBeTruthy();
		});

		it('says that a simplified date value is an object with a start', () => {
			const { additionalProperties } = readSchema(version, `${operation}.json`);

			expect(hasDateObject(additionalProperties)).toBe(true);
		});

		it('describes the raw page when Simplify is off', () => {
			const schema = readSchema(version, `${operation}.simple-false.json`);

			expect(schema.properties).toHaveProperty('object');
			expect(schema.properties).toHaveProperty('created_time');
			expect(schema.properties).toHaveProperty('url');
			expect(schema.properties).not.toHaveProperty('name');
		});

		it('types the raw page properties by column name, including dates and people', () => {
			const schema = readSchema(version, `${operation}.simple-false.json`);
			const columns = schema.properties?.properties?.additionalProperties;

			expect(columns).toBeTruthy();
			expect(typeof columns === 'object' && columns.properties).toHaveProperty('date');
			expect(typeof columns === 'object' && columns.properties).toHaveProperty('people');
			expect(
				hasDateObject(typeof columns === 'object' ? columns.properties?.date : undefined),
			).toBe(true);
		});
	});
});
