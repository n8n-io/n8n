import type {
	AssignmentCollectionValue,
	FilterValue,
	IconOrEmoji,
	INodeCredentials,
	INodeCredentialsDetails,
	INodeParameterResourceLocator,
	INodeParameters,
	NodeConnectionType,
	NodeParameterValueType,
	OnError,
	ResourceMapperValue,
	ResourceMapperField,
	FieldType,
	INodePropertyOptions,
	IDisplayOptions,
	INodePropertyRouting,
	FilterOptionsValue,
	FilterOperatorValue,
	FilterConditionValue,
	FilterOperatorType,
	AssignmentValue,
	NodeParameterValue,
	DisplayCondition,
	INode,
	IN8nRequestOperations,
	IN8nRequestOperationPaginationGeneric,
	IDataObject,
	IN8nRequestOperationPaginationOffset,
	IExecutePaginationFunctions,
	DeclarativeRestApiSettings,
	INodeExecutionData,
	INodeRequestOutput,
	PostReceiveAction,
	IPostReceiveBinaryData,
	IExecuteSingleFunctions,
	IN8nHttpFullResponse,
	IPostReceiveFilter,
	IPostReceiveLimit,
	IPostReceiveRootProperty,
	IPostReceiveSet,
	IPostReceiveSetKeyValue,
	IPostReceiveSort,
	IHttpRequestOptions,
	INodeRequestSend,
	GenericValue,
} from './interfaces';
import { z } from 'zod';

export const INodeParameterResourceLocatorSchema: z.ZodType<INodeParameterResourceLocator> =
	z.object({
		__rl: z.literal(true),
		mode: z.string(),
		value: z.union([z.string(), z.number(), z.null()]),
		cachedResultName: z.string().optional(),
		cachedResultUrl: z.string().optional(),
		__regex: z.string().optional(),
	});

const NodeParameterValueSchema: z.ZodType<NodeParameterValue> = z.union([
	z.string(),
	z.number(),
	z.boolean(),
	z.null(),
	z.undefined(),
]);

const RequiredNodeParameterValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

export const FieldTypeSchema: z.ZodType<FieldType> = z.enum([
	'boolean',
	'number',
	'string',
	'string-alphanumeric',
	'dateTime',
	'time',
	'array',
	'object',
	'options',
	'url',
	'jwt',
	'form-fields',
]);

// For `object` in GenericValue's type definition.
// We should probably look into not using `object` there,
// it's unclear whether functions are really expected.
const ObjectLikeSchema = z.custom<object>(
	(v) => (typeof v === 'object' && v !== null) || typeof v === 'function',
	{ message: 'Expected a non-primitive object' },
);

export const GenericValueSchema: z.ZodType<GenericValue> = z.union([
	z.string(),
	z.number(),
	z.boolean(),
	z.undefined(),
	z.null(),
	ObjectLikeSchema,
]);

export const IDataObjectSchema: z.ZodType<IDataObject> = z.lazy(() =>
	z.record(
		z.string(),
		z.union([
			GenericValueSchema,
			z.array(GenericValueSchema),
			IDataObjectSchema,
			z.array(IDataObjectSchema),
		]),
	),
);

export const IRequestOptionsSimplifiedAuthSchema = z.object({
	auth: z
		.object({
			username: z.string(),
			password: z.string(),
			sendImmediately: z.boolean().optional(),
		})
		.optional(),
	body: z.object({}).optional(),
	headers: IDataObjectSchema.optional(),
	qs: IDataObjectSchema.optional(),
	url: z.string().optional(),
	skipSslCertificateValidation: z.union([z.boolean(), z.string()]).optional(),
});

export const IN8nRequestOperationPaginationBaseSchema = z.object({
	type: z.string(),
	properties: z.record(z.string(), z.unknown()),
});

export const IN8nRequestOperationPaginationGenericSchema: z.ZodType<IN8nRequestOperationPaginationGeneric> =
	IN8nRequestOperationPaginationBaseSchema.extend({
		type: z.literal('generic'),
		properties: z.object({
			continue: z.union([z.boolean(), z.string()]),
			request: IRequestOptionsSimplifiedAuthSchema,
		}),
	});

export const IN8nRequestOperationPaginationOffsetSchema: z.ZodType<IN8nRequestOperationPaginationOffset> =
	IN8nRequestOperationPaginationBaseSchema.extend({
		type: z.literal('offset'),
		properties: z.object({
			limitParameter: z.string(),
			offsetParameter: z.string(),
			pageSize: z.number(),
			rootProperty: z.string().optional(),
			type: z.enum(['body', 'query']),
		}),
	});

export const IN8nRequestOperationsSchema: z.ZodType<IN8nRequestOperations> = z.object({
	pagination: z
		.union([
			IN8nRequestOperationPaginationGenericSchema,
			IN8nRequestOperationPaginationOffsetSchema,
			// TODO: Validating the function shape is skipped at runtime, any function is accepted
			z.custom<
				(
					this: IExecutePaginationFunctions,
					requestOptions: DeclarativeRestApiSettings.ResultOptions,
				) => Promise<INodeExecutionData[]>
			>((v) => typeof v === 'function'),
		])
		.optional(),
});

export const IPostReceiveBaseSchema = z.object({
	type: z.string(),
	enabled: z.union([z.boolean(), z.string()]).optional(),
	properties: z.record(
		z.string(),
		z.union([z.string(), z.number(), z.boolean(), IDataObjectSchema]),
	),
	errorMessage: z.string().optional(),
});

export const IPostReceiveBinaryDataSchema: z.ZodType<IPostReceiveBinaryData> =
	IPostReceiveBaseSchema.extend({
		type: z.literal('binaryData'),
		properties: z.object({
			destinationProperty: z.string(),
		}),
	});

export const IPostReceiveFilterSchema: z.ZodType<IPostReceiveFilter> =
	IPostReceiveBaseSchema.extend({
		type: z.literal('filter'),
		properties: z.object({
			pass: z.union([z.boolean(), z.string()]),
		}),
	});

export const IPostReceiveLimitSchema: z.ZodType<IPostReceiveLimit> = IPostReceiveBaseSchema.extend({
	type: z.literal('limit'),
	properties: z.object({
		maxResults: z.union([z.number(), z.string()]),
	}),
});

export const IPostReceiveRootPropertySchema: z.ZodType<IPostReceiveRootProperty> =
	IPostReceiveBaseSchema.extend({
		type: z.literal('rootProperty'),
		properties: z.object({
			property: z.string(),
		}),
	});

export const IPostReceiveSetSchema: z.ZodType<IPostReceiveSet> = IPostReceiveBaseSchema.extend({
	type: z.literal('set'),
	properties: z.object({
		value: z.string(),
	}),
});

export const IPostReceiveSetKeyValueSchema: z.ZodType<IPostReceiveSetKeyValue> =
	IPostReceiveBaseSchema.extend({
		type: z.literal('setKeyValue'),
		properties: z.record(z.union([z.string(), z.number()])),
	});

export const IPostReceiveSortSchema: z.ZodType<IPostReceiveSort> = IPostReceiveBaseSchema.extend({
	type: z.literal('sort'),
	properties: z.object({
		key: z.string(),
	}),
});

export const PostReceiveActionSchema: z.ZodType<PostReceiveAction> = z.union([
	// TODO: Validating the function shape is skipped at runtime, any function is accepted
	z.custom<
		(
			this: IExecuteSingleFunctions,
			items: INodeExecutionData[],
			response: IN8nHttpFullResponse,
		) => Promise<INodeExecutionData[]>
	>((v) => typeof v === 'function'),
	IPostReceiveBinaryDataSchema,
	IPostReceiveFilterSchema,
	IPostReceiveLimitSchema,
	IPostReceiveRootPropertySchema,
	IPostReceiveSetSchema,
	IPostReceiveSetKeyValueSchema,
	IPostReceiveSortSchema,
]);

export const INodeRequestOutputSchema: z.ZodType<INodeRequestOutput> = z.object({
	maxResults: z.union([z.number(), z.string()]),
	postReceive: z.array(PostReceiveActionSchema),
});

export const HttpRequestOptionsSchema: z.ZodType<DeclarativeRestApiSettings.HttpRequestOptions> =
	z.object({}); // TODO

export const INodeRequestSendSchema: z.ZodType<INodeRequestSend> = z.object({
	preSend: z.array(
		z.custom<
			(
				this: IExecuteSingleFunctions,
				requestOptions: IHttpRequestOptions,
			) => Promise<IHttpRequestOptions>
		>((v) => typeof v === 'function'),
	),
	paginate: z.union([z.boolean(), z.string()]).optional(),
	property: z.string().optional(),
	propertyInDotNotation: z.boolean().optional(),
	type: z.enum(['body', 'query']),
	value: z.string().optional(),
});

export const INodePropertyRoutingSchema: z.ZodType<INodePropertyRouting> = z.object({
	operations: IN8nRequestOperationsSchema.optional(),
	output: INodeRequestOutputSchema.optional(),
	request: HttpRequestOptionsSchema.optional(),
	send: INodeRequestSendSchema.optional(),
});

export const NumberOrStringSchema = z.union([z.number(), z.string()]);

export const DisplayConditionSchema: z.ZodType<DisplayCondition> = z.union([
	z.object({ _cnd: z.object({ eq: RequiredNodeParameterValueSchema }) }),
	z.object({ _cnd: z.object({ not: RequiredNodeParameterValueSchema }) }),
	z.object({ _cnd: z.object({ gte: NumberOrStringSchema }) }),
	z.object({ _cnd: z.object({ lte: NumberOrStringSchema }) }),
	z.object({ _cnd: z.object({ gt: NumberOrStringSchema }) }),
	z.object({ _cnd: z.object({ lt: NumberOrStringSchema }) }),
	z.object({
		_cnd: z.object({
			between: z.object({ from: NumberOrStringSchema, to: NumberOrStringSchema }),
		}),
	}),
	z.object({ _cnd: z.object({ startsWith: z.string() }) }),
	z.object({ _cnd: z.object({ endsWith: z.string() }) }),
	z.object({ _cnd: z.object({ includes: z.string() }) }),
	z.object({ _cnd: z.object({ regex: z.string() }) }),
	z.object({ _cnd: z.object({ exists: z.literal(true) }) }),
]);

export const IDisplayOptionsSchema: z.ZodType<IDisplayOptions> = z.object({
	show: z
		.object({
			'@version': z.array(z.union([z.number(), DisplayConditionSchema])).optional(),
			'@feature': z.array(z.union([z.string(), DisplayConditionSchema])).optional(),
			'@tool': z.array(z.boolean()).optional(),
		})
		.catchall(
			z.union([
				z.array(z.union([NodeParameterValueSchema, DisplayConditionSchema])),
				z.undefined(),
			]),
		),
	hide: z.record(
		z.string(),
		z.union([z.array(z.union([NodeParameterValueSchema, DisplayConditionSchema])), z.undefined()]),
	),
	hideOnCloud: z.boolean().optional(),
});

export const NodeConnectionTypeSchema: z.ZodType<NodeConnectionType> = z.enum([
	'ai_agent',
	'ai_chain',
	'ai_document',
	'ai_embedding',
	'ai_languageModel',
	'ai_memory',
	'ai_outputParser',
	'ai_retriever',
	'ai_reranker',
	'ai_textSplitter',
	'ai_tool',
	'ai_vectorStore',
	'main',
]);

export const INodePropertyOptionsSchema: z.ZodType<INodePropertyOptions> = z.object({
	name: z.string(),
	value: z.union([z.string(), z.number(), z.boolean()]),
	action: z.string().optional(),
	description: z.string().optional(),
	routing: INodePropertyRoutingSchema.optional(),
	outputConnectionType: NodeConnectionTypeSchema.optional(),
	inputSchema: z.any().optional(),
	displayOptions: IDisplayOptionsSchema.optional(),
	disabledOptions: z.literal(undefined).optional(),
});

export const ResourceMapperFieldSchema: z.ZodType<ResourceMapperField> = z.object({
	id: z.string(),
	displayName: z.string(),
	defaultMatch: z.boolean(),
	canBeUsedToMatch: z.boolean().optional(),
	required: z.boolean(),
	display: z.boolean(),
	type: FieldTypeSchema.optional(),
	removed: z.boolean().optional(),
	options: z.array(INodePropertyOptionsSchema),
	readOnly: z.boolean().optional(),
});

export const ResourceMapperValueSchema: z.ZodType<ResourceMapperValue> = z.object({
	mappingMode: z.string(),
	value: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])),
	matchingColumns: z.array(z.string()),
	schema: z.array(ResourceMapperFieldSchema),
	attemptToConvertTypes: z.boolean(),
	convertFieldsToString: z.boolean(),
});

export const FilterOptionsValueSchema: z.ZodType<FilterOptionsValue> = z.object({
	caseSensitive: z.boolean(),
	leftValue: z.string(),
	typeValidation: z.enum(['strict', 'loose']),
	version: z.union([z.literal(1), z.literal(2), z.literal(3)]),
});

export const FilterOperatorTypeSchema: z.ZodType<FilterOperatorType> = z.enum([
	'string',
	'number',
	'boolean',
	'array',
	'object',
	'dateTime',
	'any',
]);

export const FilterOperatorValueSchema: z.ZodType<FilterOperatorValue> = z.object({
	type: FilterOperatorTypeSchema,
	operation: z.string(),
	rightType: FilterOperatorTypeSchema.optional(),
	singleValue: z.boolean().optional(),
});

export const FilterConditionValueSchema: z.ZodType<FilterConditionValue> = z.object({
	id: z.string(),
	leftValue: z.union([RequiredNodeParameterValueSchema, z.array(RequiredNodeParameterValueSchema)]),
	operator: FilterOperatorValueSchema,
	rightValue: z.union([
		RequiredNodeParameterValueSchema,
		z.array(RequiredNodeParameterValueSchema),
	]),
});

export const FilterTypeCombinatorSchema = z.enum(['and', 'or']);

export const FilterValueSchema: z.ZodType<FilterValue> = z.object({
	options: FilterOptionsValueSchema,
	conditions: z.array(FilterConditionValueSchema),
	combinator: FilterTypeCombinatorSchema,
});

export const AssignmentValueSchema: z.ZodType<AssignmentValue> = z.object({
	id: z.string(),
	name: z.string(),
	value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
	type: z.string().optional(),
});

export const AssignmentCollectionValueSchema: z.ZodType<AssignmentCollectionValue> = z.object({
	assignments: z.array(AssignmentValueSchema),
});

export const IconOrEmojiSchema: z.ZodType<IconOrEmoji> = z.discriminatedUnion('type', [
	z.object({ type: z.literal('icon'), value: z.string() }),
	z.object({ type: z.literal('emoji'), value: z.string() }),
]);

export const NodeParameterValueTypeSchema: z.ZodType<NodeParameterValueType> = z.lazy(() =>
	z.union([
		NodeParameterValueSchema,
		INodeParameterResourceLocatorSchema,
		ResourceMapperValueSchema,
		FilterValueSchema,
		AssignmentCollectionValueSchema,
		IconOrEmojiSchema,

		INodeParametersSchema,

		// only the shapes allowed by the TS union
		z.array(NodeParameterValueSchema),
		z.array(INodeParametersSchema),
		z.array(INodeParameterResourceLocatorSchema),
		z.array(ResourceMapperValueSchema),
	]),
);

export const INodeParametersSchema: z.ZodType<INodeParameters> = z.record(
	z.string(),
	NodeParameterValueTypeSchema,
);

export const OnErrorSchema: z.ZodType<OnError> = z.enum([
	'continueErrorOutput',
	'continueRegularOutput',
	'stopWorkflow',
]);

export const INodeCredentialsDetailsSchema: z.ZodType<INodeCredentialsDetails> = z.object({
	id: z.string().nullable(),
	name: z.string(),
});

export const INodeCredentialsSchema: z.ZodType<INodeCredentials> = z.record(
	z.string(),
	INodeCredentialsDetailsSchema,
);

export const INodeSchema: z.ZodType<INode> = z.object({
	id: z.string(),
	name: z.string(),
	typeVersion: z.number(),
	type: z.string(),
	position: z.tuple([z.number(), z.number()]),
	disabled: z.boolean().optional(),
	notes: z.string().optional(),
	notesInFlow: z.boolean().optional(),
	retryOnFail: z.boolean().optional(),
	maxTries: z.number().optional(),
	waitBetweenTries: z.number().optional(),
	alwaysOutputData: z.boolean().optional(),
	executeOnce: z.boolean().optional(),
	onError: OnErrorSchema.optional(),
	continueOnFail: z.boolean().optional(),
	webhookId: z.string().optional(),
	extendsCredential: z.string().optional(),
	rewireOutputLogTo: NodeConnectionTypeSchema.optional(),
	parameters: INodeParametersSchema,
	credentials: INodeCredentialsSchema.optional(),
	forceCustomOperation: z
		.object({
			resource: z.string(),
			operation: z.string(),
		})
		.optional(),
});

export const INodesSchema: z.ZodType<INode[]> = z.array(INodeSchema);
