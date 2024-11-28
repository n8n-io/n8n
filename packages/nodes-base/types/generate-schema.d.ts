declare module 'generate-schema' {
	export interface SchemaObject {
		$schema: string;
		title?: string;
		type: string;
		properties?: {
			[key: string]: SchemaObject | SchemaArray | SchemaProperty;
		};
		required?: string[];
		items?: SchemaObject | SchemaArray;
	}

	export interface SchemaArray {
		type: string;
		items?: SchemaObject | SchemaArray | SchemaProperty;
		oneOf?: Array<SchemaObject | SchemaArray | SchemaProperty>;
		required?: string[];
	}

	export interface SchemaProperty {
		type: string | string[];
		format?: string;
	}

	export function json(title: string, schema: SchemaObject): SchemaObject;
	export function json(schema: SchemaObject): SchemaObject;
}
