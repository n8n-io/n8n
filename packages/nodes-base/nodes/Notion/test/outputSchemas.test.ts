import { readFileSync } from 'node:fs';
import path from 'node:path';

interface PropertySchema {
	type?: string | string[];
	properties?: Record<string, PropertySchema>;
	additionalProperties?: boolean | PropertySchema;
	anyOf?: PropertySchema[];
	items?: PropertySchema;
	required?: string[];
}

const readSchema = (version: string, file: string): PropertySchema =>
	JSON.parse(
		readFileSync(path.join(__dirname, '..', '__schema__', version, 'databasePage', file), 'utf-8'),
	) as PropertySchema;

const dateObjectOf = (schema: PropertySchema | boolean | undefined): PropertySchema | undefined =>
	typeof schema === 'object'
		? (schema.anyOf ?? [schema]).find(
				(option) => option.type === 'object' && option.properties && 'start' in option.properties,
			)
		: undefined;

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

		it('accepts numbers and booleans in the array values of the simplified output', () => {
			const { additionalProperties } = readSchema(version, `${operation}.json`);
			const arrayOption =
				typeof additionalProperties === 'object'
					? additionalProperties.anyOf?.find((option) => option.type === 'array')
					: undefined;

			expect(arrayOption?.items?.type).toEqual(
				expect.arrayContaining(['string', 'number', 'boolean', 'object']),
			);
		});

		it('requires the start of a simplified date value', () => {
			const { additionalProperties } = readSchema(version, `${operation}.json`);

			expect(dateObjectOf(additionalProperties)?.required).toEqual(['start']);
		});

		it('requires the start of a raw date value', () => {
			const schema = readSchema(version, `${operation}.simple-false.json`);
			const columns = schema.properties?.properties?.additionalProperties;

			expect(
				dateObjectOf(typeof columns === 'object' ? columns.properties?.date : undefined)?.required,
			).toEqual(['start']);
		});

		it('describes every field of a raw page', () => {
			const { properties } = readSchema(version, `${operation}.simple-false.json`);

			expect(Object.keys(properties ?? {})).toEqual(
				expect.arrayContaining([
					'object',
					'id',
					'created_time',
					'last_edited_time',
					'created_by',
					'last_edited_by',
					'cover',
					'icon',
					'parent',
					'archived',
					'in_trash',
					'properties',
					'url',
					'public_url',
				]),
			);
		});

		it('describes the fields that the Notion API adds to a raw page', () => {
			const { properties } = readSchema(version, `${operation}.simple-false.json`);

			expect(Object.keys(properties ?? {})).toEqual(
				expect.arrayContaining(['is_archived', 'is_locked', 'request_id']),
			);
			expect(properties?.parent?.properties).toHaveProperty('data_source_id');
		});

		it('describes the extra keys of people and text values in a raw page', () => {
			const schema = readSchema(version, `${operation}.simple-false.json`);
			const columns = schema.properties?.properties?.additionalProperties;
			const columnProperties = typeof columns === 'object' ? columns.properties : undefined;
			const person = columnProperties?.people?.items;
			const text = columnProperties?.title?.items;

			expect(Object.keys(person?.properties ?? {})).toEqual(
				expect.arrayContaining(['object', 'type', 'avatar_url']),
			);
			expect(person?.properties?.person?.properties).toHaveProperty('email_verified');
			expect(text?.properties?.text?.properties?.link?.properties).toHaveProperty('url');
			expect(
				columnProperties?.rich_text?.items?.properties?.text?.properties?.link?.properties,
			).toHaveProperty('url');
			expect(Object.keys(text?.properties ?? {})).toEqual(
				expect.arrayContaining(['type', 'text', 'annotations', 'href']),
			);
		});

		it('describes the value of every property type the node supports', () => {
			const schema = readSchema(version, `${operation}.simple-false.json`);
			const columns = schema.properties?.properties?.additionalProperties;
			const columnProperties = typeof columns === 'object' ? columns.properties : undefined;

			expect(Object.keys(columnProperties ?? {})).toEqual(
				expect.arrayContaining([
					'title',
					'rich_text',
					'number',
					'select',
					'status',
					'multi_select',
					'date',
					'people',
					'checkbox',
					'url',
					'email',
					'phone_number',
					'relation',
					'files',
					'formula',
					'rollup',
					'unique_id',
					'created_time',
					'last_edited_time',
					'created_by',
					'last_edited_by',
				]),
			);
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
