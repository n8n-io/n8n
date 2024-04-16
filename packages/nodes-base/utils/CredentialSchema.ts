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

		displayWhen<T, K extends keyof T>(object: Record<K, T[K][]>) {
			this.metadata.displayOptions.show = object as IDisplayOptions['show'];
			return this;
		}

		hideWhen<T, K extends keyof T>(object: Record<K, T[K][]>) {
			this.metadata.displayOptions.hide = object as IDisplayOptions['hide'];
			return this;
		}
	};
}

const StringProperty = credentialSchemaMixin(z.ZodString);

export const credentialSchema = {
	string: () => {
		return new StringProperty({
			checks: [],
			typeName: z.ZodFirstPartyTypeKind.ZodString,
			coerce: false,
		});
	},
	enum: <U extends string, T extends [U, ...U[]]>(values: T) => {
		const EnumProperty = credentialSchemaMixin(z.ZodEnum<T>);
		return new EnumProperty({
			values,
			typeName: z.ZodFirstPartyTypeKind.ZodEnum,
		});
	},
};
