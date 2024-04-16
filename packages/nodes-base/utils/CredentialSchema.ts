import { IDisplayOptions, INodeProperties, NodePropertyTypes } from 'n8n-workflow';
import { z } from 'zod';

type GConstructor<T = {}> = new (...args: any[]) => T;

type CredentialSchemaMetadata = {
	hidden: boolean;
	sensitive: boolean;
	displayName: string;
	displayOptions: IDisplayOptions;
	editorRows: number;
};

function credentialPropertyMixin<TBase extends GConstructor<z.ZodType & { _parse: Function }>>(
	Base: TBase,
) {
	return class CredentialSchema extends Base {
		metadata: CredentialSchemaMetadata;

		constructor(...args: any[]) {
			super(...args);
			this.metadata = {
				hidden: false,
				sensitive: false,
				displayName: '',
				displayOptions: {},
				editorRows: 1,
			};
		}

		displayName(name: string) {
			this.metadata.displayName = name;
			return this;
		}

		hidden(hidden = true) {
			this.metadata.hidden = hidden;
			return this;
		}

		sensitive(sensitive = true) {
			this.metadata.sensitive = sensitive;
			return this;
		}

		displayOptions(options: IDisplayOptions) {
			this.metadata.displayOptions = options;
			return this;
		}

		editorRows(rows: number) {
			this.metadata.editorRows = rows;
			return this;
		}
	};
}

const StringProperty = credentialPropertyMixin(z.ZodString);
const NumberProperty = credentialPropertyMixin(z.ZodNumber);
const BooleanProperty = credentialPropertyMixin(z.ZodBoolean);
// @ts-ignore
class EnumProperty<T> extends credentialPropertyMixin(z.ZodEnum<T>) {}
// @ts-ignore
class NativeEnumProperty<T> extends credentialPropertyMixin(z.ZodNativeEnum<T>) {}

export const credentialSchema = {
	string: () => {
		return new StringProperty({
			checks: [],
			typeName: z.ZodFirstPartyTypeKind.ZodString,
			coerce: false,
		});
	},
	number: () => {
		return new NumberProperty({
			checks: [],
			typeName: z.ZodFirstPartyTypeKind.ZodNumber,
			coerce: false,
		});
	},
	enum: <U extends string, T extends [U, ...U[]]>(values: T) => {
		return new EnumProperty<T>({
			values,
			typeName: z.ZodFirstPartyTypeKind.ZodEnum,
		});
	},
	nativeEnum: <T extends z.EnumLike>(values: T) => {
		return new NativeEnumProperty<T>({
			values,
			typeName: z.ZodFirstPartyTypeKind.ZodNativeEnum,
		});
	},
	boolean: () => {
		return new BooleanProperty({
			typeName: z.ZodFirstPartyTypeKind.ZodBoolean,
			coerce: false,
		});
	},
};

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
		const metadata = prop.metadata ?? prop._def?.innerType?.metadata ?? {};
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
