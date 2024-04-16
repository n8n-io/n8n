import { INodeProperties, NodePropertyTypes } from 'n8n-workflow';
import { z } from 'zod';

function zodTypeToNodePropertyType(zodType: string): NodePropertyTypes {
	switch (zodType) {
		case 'ZodEnum':
		case 'ZodNativeEnum':
			return 'options';
		case 'ZodBoolean':
			return 'boolean';
		case 'ZodNumber':
			return 'number';
		case 'ZodString':
		default:
			return 'string';
	}
}

export const toNodeProperties = (schema: z.AnyZodObject): INodeProperties[] => {
	return Object.entries(schema.shape).map(([key, prop]: [string, any]) => {
		const metadata = prop._def.metadata ?? prop._def?.innerType?._def.metadata ?? {};
		let property: INodeProperties = {
			name: key,
			type: zodTypeToNodePropertyType(prop._def.innerType?._def?.typeName ?? prop._def.typeName),
			displayName: metadata?.displayName,
			default: prop._def?.defaultValue?.() ?? '',
		};

		if (metadata.sensitive) {
			if (!property.typeOptions) {
				property.typeOptions = {};
			}
			property.typeOptions.password = true;
		}

		if (metadata.editorRows !== 1) {
			if (!property.typeOptions) {
				property.typeOptions = {};
			}
			property.typeOptions.rows = metadata.editorRows;
		}

		if (prop._def?.description) {
			property.description = prop._def?.description;
		}

		if (metadata.displayOptions && Object.keys(metadata.displayOptions).length > 0) {
			property.displayOptions = metadata.displayOptions;
		}

		const options = prop._def.innerType?._def?.values ?? prop._def.values;
		if (options) {
			property.options = Object.entries(options).map(([key, value]) => ({
				name: key,
				value: value as string,
			}));
		}

		return property;
	});
};
