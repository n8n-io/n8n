import { IDisplayOptions } from 'n8n-workflow';
import { z } from 'zod';

type GConstructor<T = {}> = new (...args: any[]) => T;

type CredentialSchemaMetadata = {
	hidden: boolean;
	sensitive: boolean;
	displayName: string;
	displayOptions: IDisplayOptions;
};

function credentialSchemaMixin<
	TBase extends GConstructor<z.ZodType & { _parse: z.ZodString['_parse'] }>,
>(Base: TBase) {
	return class CredentialSchema extends Base {
		metadata: CredentialSchemaMetadata;

		constructor(...args: any[]) {
			super(...args);
			this.metadata = { hidden: false, sensitive: false, displayName: '', displayOptions: {} };
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
	};
}

const StringProperty = credentialSchemaMixin(z.ZodString);
// @ts-ignore
class EnumProperty<T> extends credentialSchemaMixin(z.ZodEnum<T>) {}
// @ts-ignore
class NativeEnumProperty<T> extends credentialSchemaMixin(z.ZodNativeEnum<T>) {}

export const credentialSchema = {
	string: () => {
		return new StringProperty({
			checks: [],
			typeName: z.ZodFirstPartyTypeKind.ZodString,
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
};
