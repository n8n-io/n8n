import { IDisplayOptions } from 'n8n-workflow';
import { z } from 'zod';

type GConstructor<T = {}> = new (...args: any[]) => T;

type CredentialSchemaDef = z.ZodStringDef & {
	metadata: {
		hidden: boolean;
		sensitive: boolean;
		displayName: string;
		displayOptions: IDisplayOptions;
	};
};

function credentialSchemaMixin<TBase extends GConstructor<z.ZodString>>(Base: TBase) {
	return class CredentialSchema extends Base {
		override _def: CredentialSchemaDef;

		constructor(...args: any[]) {
			super(...args);
			this._def = {
				...super['_def'],
				metadata: { hidden: false, sensitive: false, displayName: '', displayOptions: {} },
			};
		}

		displayName(name: string) {
			this._def.metadata.displayName = name;
			return this;
		}

		hidden(hidden = true) {
			this._def.metadata.hidden = hidden;
			return this;
		}

		sensitive(sensitive = true) {
			this._def.metadata.sensitive = sensitive;
			return this;
		}

		displayWhen<T, K extends keyof T>(object: Record<K, T[K][]>) {
			this._def.metadata.displayOptions.show = object as IDisplayOptions['show'];
			return this;
		}

		hideWhen<T, K extends keyof T>(object: Record<K, T[K][]>) {
			this._def.metadata.displayOptions.hide = object as IDisplayOptions['hide'];
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
};
