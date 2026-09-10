import type {
	AnyBulkWriteOperation,
	Db,
	FindOneAndReplaceOptions,
	FindOneAndUpdateOptions,
	UpdateOptions,
	Sort,
	MongoClient,
} from 'mongodb';
import { BSON, MongoBulkWriteError, ObjectId } from 'mongodb';
import { NodeConnectionTypes, NodeOperationError, UnexpectedError, UserError } from 'n8n-workflow';
import type {
	IExecuteFunctions,
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IDataObject,
	INode,
	INodeCredentialTestResult,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IPairedItemData,
} from 'n8n-workflow';

import { parseAndResolveQueryParameters } from '@utils/query-parameters';

import {
	buildParameterizedConnString,
	connectMongoClient,
	prepareFields,
	prepareItems,
	sanitizeMongoUriInMessage,
	serializeMongoItems,
	stringifyObjectIDs,
	validateAndResolveMongoCredentials,
} from './GenericFunctions';
import type { IMongoParametricCredentials } from './mongoDb.types';
import { nodeProperties } from './MongoDbProperties';
import { generatePairedItemData } from '../../utils/utilities';

function resolveIndexDefinition(
	ctx: IExecuteFunctions,
	node: INode,
	itemIndex: number,
): Record<string, unknown> {
	return parseAndResolveQueryParameters(
		ctx.getNodeParameter('indexDefinition', itemIndex) as string,
		ctx.getNodeParameter('indexDefinitionParameters', itemIndex, []),
		node,
		itemIndex,
		'Index Definition',
	) as Record<string, unknown>;
}

const PARALLEL_WRITES_DEFAULT = 1;
const PARALLEL_WRITES_MAX = 16;
const BULK_CHUNK_MAX_OPS = 1000;
const BULK_CHUNK_MAX_BYTES = 15 * 1024 * 1024;
const PREPARE_YIELD_EVERY = 1000;
const CANCELLED_MESSAGE = 'The execution was cancelled';

interface BulkUpdateEntry {
	op: AnyBulkWriteOperation;
	filter: IDataObject;
	update: { $set: IDataObject };
	upsert: boolean;
	item: IDataObject;
	originalIndex: number;
	laneKey: string;
}

interface BulkUpdateGroup {
	entries: BulkUpdateEntry[];
	updateKeys: Set<string>;
}

interface BulkUpdateGroupState {
	stopped: boolean;
	failure?: { error: unknown; firstIndex: number };
}

function clampParallelWrites(value: unknown): number {
	const parsed = Math.floor(Number(value));
	if (!Number.isFinite(parsed)) return PARALLEL_WRITES_DEFAULT;
	return Math.min(PARALLEL_WRITES_MAX, Math.max(1, parsed));
}

function toLaneKey(value: unknown): string {
	return value instanceof Date ? String(value.getTime()) : String(value);
}

function laneIndexFor(laneKey: string, laneCount: number): number {
	let hash = 0x811c9dc5;
	for (let i = 0; i < laneKey.length; i++) {
		hash = Math.imul(hash ^ laneKey.charCodeAt(i), 0x01000193);
	}
	return (hash >>> 0) % laneCount;
}

function partitionIntoLanes(entries: BulkUpdateEntry[], laneCount: number): BulkUpdateEntry[][] {
	const lanes: BulkUpdateEntry[][] = Array.from({ length: laneCount }, () => []);
	for (const entry of entries) {
		lanes[laneIndexFor(entry.laneKey, laneCount)].push(entry);
	}
	return lanes.filter((lane) => lane.length > 0);
}

function statementSize(entry: BulkUpdateEntry): number {
	const statement = {
		q: entry.filter,
		u: entry.update,
		multi: false,
		...(entry.upsert ? { upsert: true } : {}),
	};
	return BSON.calculateObjectSize(statement) + 8;
}

function splitIntoChunks(lane: BulkUpdateEntry[]): BulkUpdateEntry[][] {
	const chunks: BulkUpdateEntry[][] = [];
	let chunk: BulkUpdateEntry[] = [];
	let chunkBytes = 0;
	for (const entry of lane) {
		const bytes = statementSize(entry);
		const full = chunk.length >= BULK_CHUNK_MAX_OPS || chunkBytes + bytes > BULK_CHUNK_MAX_BYTES;
		if (full && chunk.length > 0) {
			chunks.push(chunk);
			chunk = [];
			chunkBytes = 0;
		}
		chunk.push(entry);
		chunkBytes += bytes;
	}
	if (chunk.length > 0) chunks.push(chunk);
	return chunks;
}

function resolveLaneCount(
	group: BulkUpdateGroup,
	parallelWrites: number,
	maxPoolSize: number,
): number {
	if (parallelWrites <= 1 || group.updateKeys.size > 1) return 1;
	const chunkCount = Math.ceil(group.entries.length / BULK_CHUNK_MAX_OPS);
	const poolCap = maxPoolSize > 0 ? maxPoolSize : parallelWrites;
	return Math.max(1, Math.min(parallelWrites, poolCap, chunkCount));
}

async function hasDefaultCollation(mdb: Db, collection: string): Promise<boolean> {
	try {
		const [info] = await mdb.listCollections({ name: collection }, { nameOnly: false }).toArray();
		return info?.options !== undefined && 'collation' in info.options;
	} catch {
		return true;
	}
}

function writeErrorsByOpIndex(error: unknown): Map<number, string> {
	const verdicts = new Map<number, string>();
	if (!(error instanceof MongoBulkWriteError)) return verdicts;
	for (const writeError of [error.writeErrors].flat()) {
		verdicts.set(writeError.index, writeError.errmsg ?? error.message);
	}
	return verdicts;
}

/**
 * Batches update/findOneAndUpdate items into `bulkWrite` calls per collection.
 * Both operations already discard the driver result and echo the prepared
 * item, so the per-item output contract is unchanged. With `Parallel Writes`
 * above 1, a collection is split into key-partitioned lanes that run at once,
 * so items that target one document keep their input order.
 */
async function executeBulkUpdate(
	ctx: IExecuteFunctions,
	client: MongoClient,
	mdb: Db,
	items: INodeExecutionData[],
	itemsLength: number,
	sanitizeErrorMessage: (error: unknown) => string,
): Promise<INodeExecutionData[]> {
	const continueOnFail = ctx.continueOnFail();
	const parallelWrites = clampParallelWrites(
		ctx.getNodeParameter('options.parallelWrites', 0, PARALLEL_WRITES_DEFAULT),
	);
	const cancelSignal = ctx.getExecutionCancelSignal();
	const isCancelled = () => cancelSignal?.aborted === true;
	const results: Array<INodeExecutionData | undefined> = Array.from({ length: itemsLength });
	const groups = new Map<string, BulkUpdateGroup>();

	const echo = (entry: BulkUpdateEntry): INodeExecutionData => ({
		json: entry.item,
		pairedItem: { item: entry.originalIndex },
	});
	const failed = (index: number, cause: unknown): INodeExecutionData => ({
		json: { error: sanitizeErrorMessage(cause) },
		pairedItem: { item: index },
	});

	for (let i = 0; i < itemsLength; i++) {
		if (i > 0 && i % PREPARE_YIELD_EVERY === 0) {
			await new Promise<void>((resolve) => setImmediate(resolve));
			if (isCancelled()) throw new NodeOperationError(ctx.getNode(), CANCELLED_MESSAGE);
		}
		try {
			const fields = prepareFields(ctx.getNodeParameter('fields', i) as string);
			const useDotNotation = Boolean(ctx.getNodeParameter('options.useDotNotation', i, false));
			const dateFields = prepareFields(ctx.getNodeParameter('options.dateFields', i, '') as string);
			const updateKey = ((ctx.getNodeParameter('updateKey', i) as string) || '').trim();
			const upsert = Boolean(ctx.getNodeParameter('upsert', i));

			const [item] = prepareItems({
				items: [items[i]],
				fields,
				updateKey,
				useDotNotation,
				dateFields,
				isUpdate: true,
				node: ctx.getNode(),
			});

			if (!item) {
				throw new NodeOperationError(ctx.getNode(), 'Item is missing the updateKey field', {
					itemIndex: i,
				});
			}

			const filter: IDataObject = { [updateKey]: item[updateKey] };
			if (updateKey === '_id') {
				filter[updateKey] = new ObjectId(item[updateKey] as string);
				delete item._id;
			}
			const update = { $set: item };

			const collection = ctx.getNodeParameter('collection', i) as string;
			const group = groups.get(collection) ?? { entries: [], updateKeys: new Set<string>() };
			groups.set(collection, group);
			group.updateKeys.add(updateKey);
			group.entries.push({
				op: { updateOne: { filter, update, ...(upsert ? { upsert: true } : {}) } },
				filter,
				update,
				upsert,
				item,
				originalIndex: i,
				laneKey: toLaneKey(filter[updateKey]),
			});
		} catch (error) {
			if (!continueOnFail) throw error;
			results[i] = failed(i, error);
		}
	}

	const maxPoolSize = client.options.maxPoolSize;

	for (const [collection, group] of groups) {
		let laneCount = resolveLaneCount(group, parallelWrites, maxPoolSize);
		// A collection default collation can make distinct key values match one document
		if (laneCount > 1 && (await hasDefaultCollation(mdb, collection))) laneCount = 1;
		const lanes = laneCount === 1 ? [group.entries] : partitionIntoLanes(group.entries, laneCount);
		const chunksOf = (lane: BulkUpdateEntry[]) =>
			laneCount === 1 ? [lane] : splitIntoChunks(lane);

		const state: BulkUpdateGroupState = { stopped: false };
		const recordFailure = (chunk: BulkUpdateEntry[], error: unknown) => {
			const firstIndex = chunk[0].originalIndex;
			if (state.failure === undefined || firstIndex < state.failure.firstIndex) {
				state.failure = { error, firstIndex };
			}
		};
		const attributeFailure = (
			chunk: BulkUpdateEntry[],
			error: unknown,
			verdicts: Map<number, string>,
		) => {
			if (laneCount === 1 || verdicts.size === 0) return error;
			let opIndex = Number.POSITIVE_INFINITY;
			for (const index of verdicts.keys()) opIndex = Math.min(opIndex, index);
			return new NodeOperationError(ctx.getNode(), sanitizeErrorMessage(verdicts.get(opIndex)), {
				itemIndex: chunk[opIndex].originalIndex,
			});
		};

		const runChunk = async (chunk: BulkUpdateEntry[]) => {
			try {
				await mdb.collection(collection).bulkWrite(
					chunk.map((entry) => entry.op),
					{ ordered: !continueOnFail },
				);
				for (const entry of chunk) results[entry.originalIndex] = echo(entry);
			} catch (error) {
				const verdicts = writeErrorsByOpIndex(error);
				const chunkFailed = verdicts.size === 0;
				if (!continueOnFail) {
					state.stopped = true;
					recordFailure(chunk, attributeFailure(chunk, error, verdicts));
					return;
				}
				if (chunkFailed) {
					state.stopped = true;
					recordFailure(chunk, error);
				}
				for (const [opIndex, entry] of chunk.entries()) {
					const verdict = verdicts.get(opIndex);
					results[entry.originalIndex] =
						verdict !== undefined || chunkFailed
							? failed(entry.originalIndex, verdict ?? error)
							: echo(entry);
				}
			}
		};

		const runLane = async (lane: BulkUpdateEntry[]) => {
			for (const chunk of chunksOf(lane)) {
				if (state.stopped || isCancelled()) return;
				await runChunk(chunk);
			}
		};

		await Promise.allSettled(lanes.map(runLane));

		if (isCancelled()) throw new NodeOperationError(ctx.getNode(), CANCELLED_MESSAGE);
		if (state.failure !== undefined) {
			if (!continueOnFail) throw state.failure.error;
			for (const entry of group.entries) {
				results[entry.originalIndex] ??= failed(entry.originalIndex, state.failure.error);
			}
		}
	}

	return results.map((result, index) => {
		if (result === undefined) {
			throw new UnexpectedError('MongoDB bulk update produced no output for an item', {
				extra: { itemIndex: index },
			});
		}
		return result;
	});
}

export class MongoDb implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'MongoDB',
		name: 'mongoDb',
		icon: 'file:mongodb.svg',
		group: ['input'],
		version: [1, 1.1, 1.2, 1.3, 1.4, 1.5],
		description: 'Find, insert and update documents in MongoDB',
		defaults: {
			name: 'MongoDB',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'mongoDb',
				required: true,
				testedBy: 'mongoDbCredentialTest',
			},
		],
		properties: nodeProperties,
	};

	methods = {
		credentialTest: {
			async mongoDbCredentialTest(
				this: ICredentialTestFunctions,
				credential: ICredentialsDecrypted,
			): Promise<INodeCredentialTestResult> {
				const credentials = credential.data as IDataObject;
				let connectionString = '';

				try {
					const database = ((credentials.database as string) || '').trim();

					if (credentials.configurationType === 'connectionString') {
						connectionString = ((credentials.connectionString as string) || '').trim();
					} else {
						connectionString = buildParameterizedConnString(
							credentials as unknown as IMongoParametricCredentials,
						);
					}

					// Note: ICredentialTestFunctions doesn't have a way to get the Node instance
					// so we set the version to 0
					const client = await connectMongoClient(connectionString, 0, credentials);

					const { databases } = await client.db().admin().listDatabases();

					if (!(databases as IDataObject[]).map((db) => db.name).includes(database)) {
						throw new UserError(`Database "${database}" does not exist`, {
							level: 'warning',
						});
					}
					await client.close();
				} catch (error) {
					return {
						status: 'Error',
						message: sanitizeMongoUriInMessage(error, connectionString),
					};
				}
				return {
					status: 'OK',
					message: 'Connection successful!',
				};
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const credentials = await this.getCredentials('mongoDb');
		const node = this.getNode();
		const { database, connectionString } = validateAndResolveMongoCredentials(node, credentials);
		const nodeVersion = node.typeVersion;
		const sanitizeErrorMessage = (error: unknown) =>
			sanitizeMongoUriInMessage(error, connectionString);
		let client: MongoClient;
		try {
			client = await connectMongoClient(connectionString, nodeVersion, credentials);
		} catch (error) {
			throw new NodeOperationError(node, sanitizeErrorMessage(error));
		}
		let returnData: INodeExecutionData[] = [];

		try {
			const mdb = client.db(database);

			const items = this.getInputData();
			const operation = this.getNodeParameter('operation', 0);

			let itemsLength = items.length ? 1 : 0;
			let fallbackPairedItems: IPairedItemData[] | null = null;

			if (nodeVersion >= 1.1) {
				itemsLength = items.length;
			} else {
				fallbackPairedItems = generatePairedItemData(items.length);
			}

			if (operation === 'aggregate') {
				for (let i = 0; i < itemsLength; i++) {
					try {
						const queryParameter = parseAndResolveQueryParameters(
							this.getNodeParameter('query', i) as string,
							this.getNodeParameter('queryParameters', i, []),
							node,
							i,
						) as IDataObject;

						if (queryParameter._id && typeof queryParameter._id === 'string') {
							queryParameter._id = new ObjectId(queryParameter._id);
						}

						const query = mdb
							.collection(this.getNodeParameter('collection', i) as string)
							.aggregate(queryParameter as unknown as Document[]);

						for (const entry of await query.toArray()) {
							returnData.push({ json: entry, pairedItem: fallbackPairedItems ?? [{ item: i }] });
						}
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({
								json: { error: sanitizeErrorMessage(error) },
								pairedItem: fallbackPairedItems ?? [{ item: i }],
							});
							continue;
						}
						throw error;
					}
				}
			}

			if (operation === 'delete') {
				for (let i = 0; i < itemsLength; i++) {
					try {
						const queryParameter = parseAndResolveQueryParameters(
							this.getNodeParameter('query', i) as string,
							this.getNodeParameter('queryParameters', i, []),
							node,
							i,
						) as Document;
						const { deletedCount } = await mdb
							.collection(this.getNodeParameter('collection', i) as string)
							.deleteMany(queryParameter);

						returnData.push({
							json: { deletedCount },
							pairedItem: fallbackPairedItems ?? [{ item: i }],
						});
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({
								json: { error: sanitizeErrorMessage(error) },
								pairedItem: fallbackPairedItems ?? [{ item: i }],
							});
							continue;
						}
						throw error;
					}
				}
			}

			if (operation === 'find') {
				for (let i = 0; i < itemsLength; i++) {
					try {
						const queryParameter = parseAndResolveQueryParameters(
							this.getNodeParameter('query', i) as string,
							this.getNodeParameter('queryParameters', i, []),
							node,
							i,
						) as IDataObject;

						if (queryParameter._id && typeof queryParameter._id === 'string') {
							queryParameter._id = new ObjectId(queryParameter._id);
						}

						let query = mdb
							.collection(this.getNodeParameter('collection', i) as string)
							.find(queryParameter as unknown as Document);

						const options = this.getNodeParameter('options', i);
						const limit = options.limit as number;
						const skip = options.skip as number;
						const projection =
							options.projection &&
							(parseAndResolveQueryParameters(
								options.projection as string,
								options.projectionParameters ?? [],
								node,
								i,
								'Projection',
							) as Document);
						const sort =
							options.sort &&
							(parseAndResolveQueryParameters(
								options.sort as string,
								options.sortParameters ?? [],
								node,
								i,
								'Sort',
							) as Sort);

						if (skip > 0) {
							query = query.skip(skip);
						}
						if (limit > 0) {
							query = query.limit(limit);
						}
						if (sort && Object.keys(sort).length !== 0 && sort.constructor === Object) {
							query = query.sort(sort);
						}

						if (
							projection &&
							Object.keys(projection).length !== 0 &&
							projection.constructor === Object
						) {
							query = query.project(projection);
						}

						const queryResult = await query.toArray();

						for (const entry of queryResult) {
							returnData.push({ json: entry, pairedItem: fallbackPairedItems ?? [{ item: i }] });
						}
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({
								json: { error: sanitizeErrorMessage(error) },
								pairedItem: fallbackPairedItems ?? [{ item: i }],
							});
							continue;
						}
						throw error;
					}
				}
			}

			if (operation === 'findOneAndReplace') {
				fallbackPairedItems = fallbackPairedItems ?? generatePairedItemData(items.length);
				if (nodeVersion >= 1.3) {
					for (let i = 0; i < itemsLength; i++) {
						const fields = prepareFields(this.getNodeParameter('fields', i) as string);
						const useDotNotation = this.getNodeParameter(
							'options.useDotNotation',
							i,
							false,
						) as boolean;
						const dateFields = prepareFields(
							this.getNodeParameter('options.dateFields', i, '') as string,
						);
						const updateKey = ((this.getNodeParameter('updateKey', i) as string) || '').trim();
						const updateOptions = (this.getNodeParameter('upsert', i) as boolean)
							? { upsert: true }
							: undefined;

						try {
							const [item] = prepareItems({
								items: [items[i]],
								fields,
								updateKey,
								useDotNotation,
								dateFields,
								node: this.getNode(),
							});

							if (!item) {
								throw new NodeOperationError(
									this.getNode(),
									'Item is missing the updateKey field',
									{ itemIndex: i },
								);
							}

							const filter = { [updateKey]: item[updateKey] };
							if (updateKey === '_id') {
								filter[updateKey] = new ObjectId(item[updateKey] as string);
								delete item._id;
							}

							await mdb
								.collection(this.getNodeParameter('collection', i) as string)
								.findOneAndReplace(filter, item, updateOptions as FindOneAndReplaceOptions);

							returnData.push({ json: item, pairedItem: { item: i } });
						} catch (error) {
							if (this.continueOnFail()) {
								returnData.push({
									json: { error: sanitizeErrorMessage(error) },
									pairedItem: { item: i },
								});
								continue;
							}
							throw error;
						}
					}
				} else {
					const fields = prepareFields(this.getNodeParameter('fields', 0) as string);
					const useDotNotation = this.getNodeParameter(
						'options.useDotNotation',
						0,
						false,
					) as boolean;
					const dateFields = prepareFields(
						this.getNodeParameter('options.dateFields', 0, '') as string,
					);

					const updateKey = ((this.getNodeParameter('updateKey', 0) as string) || '').trim();

					const updateOptions = (this.getNodeParameter('upsert', 0) as boolean)
						? { upsert: true }
						: undefined;

					const updateItems = prepareItems({
						items,
						fields,
						updateKey,
						useDotNotation,
						dateFields,
						node: this.getNode(),
					});

					for (const item of updateItems) {
						try {
							const filter = { [updateKey]: item[updateKey] };
							if (updateKey === '_id') {
								filter[updateKey] = new ObjectId(item[updateKey] as string);
								delete item._id;
							}

							await mdb
								.collection(this.getNodeParameter('collection', 0) as string)
								.findOneAndReplace(filter, item, updateOptions as FindOneAndReplaceOptions);
						} catch (error) {
							if (this.continueOnFail()) {
								item.json = { error: sanitizeErrorMessage(error) };
								continue;
							}
							throw error;
						}
					}

					returnData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(updateItems),
						{ itemData: fallbackPairedItems },
					);
				}
			}

			if (operation === 'findOneAndUpdate') {
				fallbackPairedItems = fallbackPairedItems ?? generatePairedItemData(items.length);
				if (nodeVersion >= 1.5) {
					returnData = returnData.concat(
						await executeBulkUpdate(this, client, mdb, items, itemsLength, sanitizeErrorMessage),
					);
				} else if (nodeVersion >= 1.3) {
					for (let i = 0; i < itemsLength; i++) {
						const fields = prepareFields(this.getNodeParameter('fields', i) as string);
						const useDotNotation = this.getNodeParameter(
							'options.useDotNotation',
							i,
							false,
						) as boolean;
						const dateFields = prepareFields(
							this.getNodeParameter('options.dateFields', i, '') as string,
						);
						const updateKey = ((this.getNodeParameter('updateKey', i) as string) || '').trim();
						const updateOptions = (this.getNodeParameter('upsert', i) as boolean)
							? { upsert: true }
							: undefined;

						try {
							const [item] = prepareItems({
								items: [items[i]],
								fields,
								updateKey,
								useDotNotation,
								dateFields,
								isUpdate: true,
								node: this.getNode(),
							});

							if (!item) {
								throw new NodeOperationError(
									this.getNode(),
									'Item is missing the updateKey field',
									{ itemIndex: i },
								);
							}

							const filter = { [updateKey]: item[updateKey] };
							if (updateKey === '_id') {
								filter[updateKey] = new ObjectId(item[updateKey] as string);
								delete item._id;
							}

							await mdb
								.collection(this.getNodeParameter('collection', i) as string)
								.findOneAndUpdate(filter, { $set: item }, updateOptions as FindOneAndUpdateOptions);

							returnData.push({ json: item, pairedItem: { item: i } });
						} catch (error) {
							if (this.continueOnFail()) {
								returnData.push({
									json: { error: sanitizeErrorMessage(error) },
									pairedItem: { item: i },
								});
								continue;
							}
							throw error;
						}
					}
				} else {
					const fields = prepareFields(this.getNodeParameter('fields', 0) as string);
					const useDotNotation = this.getNodeParameter(
						'options.useDotNotation',
						0,
						false,
					) as boolean;
					const dateFields = prepareFields(
						this.getNodeParameter('options.dateFields', 0, '') as string,
					);

					const updateKey = ((this.getNodeParameter('updateKey', 0) as string) || '').trim();

					const updateOptions = (this.getNodeParameter('upsert', 0) as boolean)
						? { upsert: true }
						: undefined;

					const updateItems = prepareItems({
						items,
						fields,
						updateKey,
						useDotNotation,
						dateFields,
						isUpdate: nodeVersion >= 1.2,
						node: this.getNode(),
					});

					for (const item of updateItems) {
						try {
							const filter = { [updateKey]: item[updateKey] };
							if (updateKey === '_id') {
								filter[updateKey] = new ObjectId(item[updateKey] as string);
								delete item._id;
							}

							await mdb
								.collection(this.getNodeParameter('collection', 0) as string)
								.findOneAndUpdate(filter, { $set: item }, updateOptions as FindOneAndUpdateOptions);
						} catch (error) {
							if (this.continueOnFail()) {
								item.json = { error: sanitizeErrorMessage(error) };
								continue;
							}
							throw error;
						}
					}

					returnData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(updateItems),
						{ itemData: fallbackPairedItems },
					);
				}
			}

			if (operation === 'insert') {
				fallbackPairedItems = fallbackPairedItems ?? generatePairedItemData(items.length);
				if (nodeVersion >= 1.3) {
					// Phase 1: prepare items and group by collection name
					const groups = new Map<string, Array<{ item: IDataObject; originalIndex: number }>>();

					for (let i = 0; i < itemsLength; i++) {
						try {
							const fields = prepareFields(this.getNodeParameter('fields', i) as string);
							const useDotNotation = this.getNodeParameter(
								'options.useDotNotation',
								i,
								false,
							) as boolean;
							const dateFields = prepareFields(
								this.getNodeParameter('options.dateFields', i, '') as string,
							);
							const [insertItem] = prepareItems({
								items: [items[i]],
								fields,
								updateKey: '',
								useDotNotation,
								dateFields,
								node: this.getNode(),
							});

							if (!insertItem) continue;

							const collection = this.getNodeParameter('collection', i) as string;
							const group = groups.get(collection) ?? [];
							groups.set(collection, group);
							group.push({ item: insertItem, originalIndex: i });
						} catch (error) {
							if (this.continueOnFail()) {
								returnData.push({
									json: { error: sanitizeErrorMessage(error) },
									pairedItem: { item: i },
								});
							} else {
								throw error;
							}
						}
					}

					// Phase 2: insertMany per collection group
					for (const [collection, groupItems] of groups) {
						try {
							const { insertedIds } = await mdb
								.collection(collection)
								.insertMany(groupItems.map((g) => g.item));

							for (let idx = 0; idx < groupItems.length; idx++) {
								const g = groupItems[idx];
								returnData.push({
									json: { ...g.item, id: insertedIds[idx] as unknown as string },
									pairedItem: { item: g.originalIndex },
								});
							}
						} catch (error) {
							if (this.continueOnFail()) {
								for (const g of groupItems) {
									returnData.push({
										json: { error: sanitizeErrorMessage(error) },
										pairedItem: { item: g.originalIndex },
									});
								}
								continue;
							}
							throw error;
						}
					}

					returnData.sort((a, b) => {
						const aIdx = (a.pairedItem as { item: number }).item;
						const bIdx = (b.pairedItem as { item: number }).item;
						return aIdx - bIdx;
					});
				} else {
					let responseData: IDataObject[] = [];
					try {
						// Prepare the data to insert and copy it to be returned
						const fields = prepareFields(this.getNodeParameter('fields', 0) as string);
						const useDotNotation = this.getNodeParameter(
							'options.useDotNotation',
							0,
							false,
						) as boolean;
						const dateFields = prepareFields(
							this.getNodeParameter('options.dateFields', 0, '') as string,
						);

						const insertItems = prepareItems({
							items,
							fields,
							updateKey: '',
							useDotNotation,
							dateFields,
							node: this.getNode(),
						});

						const { insertedIds } = await mdb
							.collection(this.getNodeParameter('collection', 0) as string)
							.insertMany(insertItems);

						// Add the id to the data
						for (const i of Object.keys(insertedIds)) {
							responseData.push({
								...insertItems[parseInt(i, 10)],
								id: insertedIds[parseInt(i, 10)] as unknown as string,
							});
						}
					} catch (error) {
						if (this.continueOnFail()) {
							responseData = [{ error: sanitizeErrorMessage(error) }];
						} else {
							throw error;
						}
					}

					returnData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(responseData),
						{ itemData: fallbackPairedItems },
					);
				}
			}

			if (operation === 'update') {
				fallbackPairedItems = fallbackPairedItems ?? generatePairedItemData(items.length);
				if (nodeVersion >= 1.5) {
					returnData = returnData.concat(
						await executeBulkUpdate(this, client, mdb, items, itemsLength, sanitizeErrorMessage),
					);
				} else if (nodeVersion >= 1.3) {
					for (let i = 0; i < itemsLength; i++) {
						const fields = prepareFields(this.getNodeParameter('fields', i) as string);
						const useDotNotation = this.getNodeParameter(
							'options.useDotNotation',
							i,
							false,
						) as boolean;
						const dateFields = prepareFields(
							this.getNodeParameter('options.dateFields', i, '') as string,
						);
						const updateKey = ((this.getNodeParameter('updateKey', i) as string) || '').trim();
						const updateOptions = (this.getNodeParameter('upsert', i) as boolean)
							? { upsert: true }
							: undefined;

						try {
							const [item] = prepareItems({
								items: [items[i]],
								fields,
								updateKey,
								useDotNotation,
								dateFields,
								isUpdate: true,
								node: this.getNode(),
							});

							if (!item) {
								throw new NodeOperationError(
									this.getNode(),
									'Item is missing the updateKey field',
									{ itemIndex: i },
								);
							}

							const filter = { [updateKey]: item[updateKey] };
							if (updateKey === '_id') {
								filter[updateKey] = new ObjectId(item[updateKey] as string);
								delete item._id;
							}

							await mdb
								.collection(this.getNodeParameter('collection', i) as string)
								.updateOne(filter, { $set: item }, updateOptions as UpdateOptions);

							returnData.push({ json: item, pairedItem: { item: i } });
						} catch (error) {
							if (this.continueOnFail()) {
								returnData.push({
									json: { error: sanitizeErrorMessage(error) },
									pairedItem: { item: i },
								});
								continue;
							}
							throw error;
						}
					}
				} else {
					const fields = prepareFields(this.getNodeParameter('fields', 0) as string);
					const useDotNotation = this.getNodeParameter(
						'options.useDotNotation',
						0,
						false,
					) as boolean;
					const dateFields = prepareFields(
						this.getNodeParameter('options.dateFields', 0, '') as string,
					);

					const updateKey = ((this.getNodeParameter('updateKey', 0) as string) || '').trim();

					const updateOptions = (this.getNodeParameter('upsert', 0) as boolean)
						? { upsert: true }
						: undefined;

					const updateItems = prepareItems({
						items,
						fields,
						updateKey,
						useDotNotation,
						dateFields,
						isUpdate: nodeVersion >= 1.2,
						node: this.getNode(),
					});

					for (const item of updateItems) {
						try {
							const filter = { [updateKey]: item[updateKey] };
							if (updateKey === '_id') {
								filter[updateKey] = new ObjectId(item[updateKey] as string);
								delete item._id;
							}

							await mdb
								.collection(this.getNodeParameter('collection', 0) as string)
								.updateOne(filter, { $set: item }, updateOptions as UpdateOptions);
						} catch (error) {
							if (this.continueOnFail()) {
								item.json = { error: sanitizeErrorMessage(error) };
								continue;
							}
							throw error;
						}
					}

					returnData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(updateItems),
						{ itemData: fallbackPairedItems },
					);
				}
			}

			if (operation === 'listSearchIndexes') {
				for (let i = 0; i < itemsLength; i++) {
					try {
						const collection = this.getNodeParameter('collection', i) as string;
						const indexName = (() => {
							const name = this.getNodeParameter('indexName', i) as string;
							return name.length === 0 ? undefined : name;
						})();

						const cursor = indexName
							? mdb.collection(collection).listSearchIndexes(indexName)
							: mdb.collection(collection).listSearchIndexes();

						const query = await cursor.toArray();
						const result = query.map((json) => ({
							json,
							pairedItem: fallbackPairedItems ?? [{ item: i }],
						}));
						returnData.push(...result);
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({
								json: { error: sanitizeErrorMessage(error) },
								pairedItem: fallbackPairedItems ?? [{ item: i }],
							});
							continue;
						}
						throw error;
					}
				}
			}

			if (operation === 'dropSearchIndex') {
				for (let i = 0; i < itemsLength; i++) {
					try {
						const collection = this.getNodeParameter('collection', i) as string;
						const indexName = this.getNodeParameter('indexNameRequired', i) as string;

						await mdb.collection(collection).dropSearchIndex(indexName);
						returnData.push({
							json: {
								[indexName]: true,
							},
							pairedItem: fallbackPairedItems ?? [{ item: i }],
						});
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({
								json: { error: sanitizeErrorMessage(error) },
								pairedItem: fallbackPairedItems ?? [{ item: i }],
							});
							continue;
						}
						throw error;
					}
				}
			}

			if (operation === 'createSearchIndex') {
				for (let i = 0; i < itemsLength; i++) {
					try {
						const collection = this.getNodeParameter('collection', i) as string;
						const indexName = this.getNodeParameter('indexNameRequired', i) as string;
						const indexType = this.getNodeParameter('indexType', i) as string;
						const definition = resolveIndexDefinition(this, node, i);

						await mdb.collection(collection).createSearchIndex({
							name: indexName,
							definition,
							type: indexType,
						});

						returnData.push({
							json: { indexName },
							pairedItem: fallbackPairedItems ?? [{ item: i }],
						});
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({
								json: { error: sanitizeErrorMessage(error) },
								pairedItem: fallbackPairedItems ?? [{ item: i }],
							});
							continue;
						}
						throw error;
					}
				}
			}

			if (operation === 'updateSearchIndex') {
				for (let i = 0; i < itemsLength; i++) {
					try {
						const collection = this.getNodeParameter('collection', i) as string;
						const indexName = this.getNodeParameter('indexNameRequired', i) as string;
						const definition = resolveIndexDefinition(this, node, i);

						await mdb.collection(collection).updateSearchIndex(indexName, definition);

						returnData.push({
							json: { [indexName]: true },
							pairedItem: fallbackPairedItems ?? [{ item: i }],
						});
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({
								json: { error: sanitizeErrorMessage(error) },
								pairedItem: fallbackPairedItems ?? [{ item: i }],
							});
							continue;
						}
						throw error;
					}
				}
			}
		} catch (error) {
			const sanitizedMessage = sanitizeErrorMessage(error);
			if (error instanceof Error && sanitizedMessage === error.message) throw error;

			throw new NodeOperationError(node, sanitizedMessage);
		} finally {
			await client.close().catch(() => {});
		}

		if (nodeVersion >= 1.4) {
			return [await serializeMongoItems.call(this, returnData)];
		}

		return [stringifyObjectIDs(returnData)];
	}
}
