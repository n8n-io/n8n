import type { INodeProperties } from 'n8n-workflow';
import z, { type ZodOptional, type ZodType } from 'zod';

function isObject(value: unknown): value is object {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function removeUndefinedProperties<T extends object>(obj: T): T {
	for (const [key, value] of Object.entries(obj)) {
		if (value === undefined) {
			delete (obj as Record<string, unknown>)[key];
		} else if (isObject(value)) {
			removeUndefinedProperties(value);
			if (Object.keys(value).length === 0) {
				delete (obj as Record<string, unknown>)[key];
			}
		}
	}
	return obj;
}

class CredentialSchemaRootObject<
	M extends BaseMetadata,
	S extends ZodType | null,
	T extends { [k: string]: CredentialSchemaProperty<M, S> } = {},
> {
	constructor(public shape: T) {}

	validate<Data>(data: Data) {
		return this.toZodSchema().safeParse(data);
	}

	toZodSchema() {
		return z.object(
			Object.fromEntries(
				Object.entries(this.shape)
					.filter(([_, property]) => property.toZodSchema())
					.map(([key, property]) => [key, property.toZodSchema()]),
			) as ZodifyObject<M, S, T>,
		);
	}

	getProperty<K extends keyof T>(key: K): T[K]['metadata'] {
		return this.shape[key].metadata;
	}

	toNodeProperties() {
		return Object.entries(this.shape).map(([key, schema]) => schema.toNodeProperties(key));
	}
}

type ToZodSchemaReturnType<
	M extends BaseMetadata = BaseMetadata,
	S extends ZodType | null = ZodType,
> = M['optional'] extends true ? (S extends null ? null : ZodOptional<NonNullable<S>>) : S;

abstract class CredentialSchemaProperty<
	M extends BaseMetadata = BaseMetadata,
	S extends ZodType | null = null,
> {
	constructor(
		public metadata: M,
		public schema: S,
	) {}

	toZodSchema(): ToZodSchemaReturnType<M, S> {
		if (this.schema && this.metadata.optional) {
			return this.schema.optional() as ToZodSchemaReturnType<M, S>;
		}

		return this.schema as ToZodSchemaReturnType<M, S>;
	}

	toNodeProperties(name: string): INodeProperties {
		return removeUndefinedProperties({
			name,
			displayName: this.metadata.label,
			description: this.metadata.description,
			default: '',
			type: 'string',
		});
	}
}

class CredentialSchemaString<
	S extends ZodType,
	M extends StringMetadata,
> extends CredentialSchemaProperty<M, S> {
	constructor(
		public metadata: M,
		schema: S,
	) {
		super(metadata, schema);
	}

	toNodeProperties(name: string): INodeProperties {
		return removeUndefinedProperties({
			...super.toNodeProperties(name),
			type: 'string',
			placeholder: this.metadata.placeholder,
			typeOptions: { password: this.metadata.password },
		});
	}
}

class CredentialSchemaNumber<
	S extends ZodType,
	M extends NumberMetadata,
> extends CredentialSchemaProperty<M, S> {
	constructor(
		public metadata: M,
		schema: S,
	) {
		super(metadata, schema);
	}

	toNodeProperties(name: string): INodeProperties {
		return removeUndefinedProperties({
			...super.toNodeProperties(name),
			type: 'number',
			default: this.metadata.default,
		});
	}
}

class CredentialSchemaOptions<
	V extends string,
	S extends ZodType,
	M extends OptionsMetadata<V>,
> extends CredentialSchemaProperty<M, S> {
	constructor(
		public metadata: M,
		schema: S,
	) {
		super(metadata, schema);
	}

	toNodeProperties(name: string): INodeProperties {
		const { options } = this.metadata;
		return removeUndefinedProperties({
			...super.toNodeProperties(name),
			type: 'options',
			options: options.map((option) => ({
				name: option.label,
				value: option.value,
				description: option.description,
			})),
			default: options.find((option) => option.default)?.value ?? options[0].value,
		});
	}
}

class CredentialSchemaNotice extends CredentialSchemaProperty<BaseMetadata, null> {
	constructor(public notice: string) {
		super({ label: notice }, null);
	}

	toNodeProperties(name: string): INodeProperties {
		return {
			...super.toNodeProperties(name),
			type: 'notice',
		};
	}
}

type BaseMetadata = {
	label: string;
	description?: string;
	default?: unknown;
	optional?: boolean;
};

type StringMetadata = BaseMetadata &
	Partial<{
		password: boolean;
		placeholder: string;
		default: string;
	}>;

type NumberMetadata = BaseMetadata &
	Partial<{
		default: number;
	}>;

type Option<V extends string> = {
	label: string;
	value: V;
	default?: boolean;
	description?: string;
};

type NonEmptyArray<T> = [T, ...T[]];
type OptionsMetadata<V extends string> = BaseMetadata & { options: NonEmptyArray<Option<V>> };

type Zodify<
	M extends BaseMetadata,
	S extends ZodType | null,
	T extends CredentialSchemaProperty<M, S>,
> = ReturnType<T['toZodSchema']> extends z.ZodType ? ReturnType<T['toZodSchema']> : never;

type ZodifyObject<
	M extends BaseMetadata,
	S extends ZodType | null,
	T extends { [k: string]: CredentialSchemaProperty<M, S> },
> = {
	[K in keyof T as ReturnType<T[K]['toZodSchema']> extends z.ZodType ? K : never]: Zodify<
		M,
		S,
		T[K]
	>;
};

type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export const CredentialSchema = {
	create<
		M extends BaseMetadata,
		S extends ZodType | null,
		T extends { [k: string]: CredentialSchemaProperty<M, S> },
	>(shape: T) {
		return new CredentialSchemaRootObject(shape);
	},

	password(options: Omit<Optional<StringMetadata, 'label'>, 'password'> = {}) {
		return new CredentialSchemaString(
			{
				password: true,
				label: 'Password',
				...options,
			},
			z.string(),
		);
	},
	// eslint-disable-next-line id-denylist
	string<M extends StringMetadata>(options: M) {
		return new CredentialSchemaString(options, z.string());
	},
	// eslint-disable-next-line id-denylist
	number<M extends NumberMetadata>(options: M) {
		return new CredentialSchemaNumber(options, z.number());
	},
	url(options: Optional<StringMetadata, 'label'> = {}) {
		return new CredentialSchemaString({ label: 'URL', ...options }, z.string().url());
	},
	email(options: Optional<StringMetadata, 'label'> = {}) {
		return new CredentialSchemaString({ label: 'Email', ...options }, z.string().email());
	},
	options<V extends string, M extends OptionsMetadata<V>>(options: M) {
		return new CredentialSchemaOptions(
			options,
			z.enum(
				options.options.map((option) => option.value) as NonEmptyArray<
					M['options'][number]['value']
				>,
			),
		);
	},
	notice(notice: string) {
		return new CredentialSchemaNotice(notice);
	},
};

export type InferCredentialSchema<
	T extends CredentialSchemaRootObject<BaseMetadata, ZodType | null>,
> = z.infer<ReturnType<T['toZodSchema']>>;
