import { MongoBulkWriteError, ObjectId } from 'mongodb';
import { NodeConnectionTypes, NodeOperationError, UserError } from 'n8n-workflow';
import { parseAndResolveQueryParameters } from '@utils/query-parameters';
import { buildParameterizedConnString, connectMongoClient, prepareFields, prepareItems, sanitizeMongoUriInMessage, serializeMongoItems, stringifyObjectIDs, validateAndResolveMongoCredentials, } from './GenericFunctions';
import { nodeProperties } from './MongoDbProperties';
import { generatePairedItemData } from '../../utils/utilities';
function resolveIndexDefinition(ctx, node, itemIndex) {
    return parseAndResolveQueryParameters(ctx.getNodeParameter('indexDefinition', itemIndex), ctx.getNodeParameter('indexDefinitionParameters', itemIndex, []), node, itemIndex, 'Index Definition');
}
/**
 * Batches update/findOneAndUpdate items into one `bulkWrite` per collection.
 * Both operations already discard the driver result and echo the prepared
 * item, so the per-item output contract is unchanged.
 */
async function executeBulkUpdate(ctx, mdb, items, itemsLength, sanitizeErrorMessage) {
    const continueOnFail = ctx.continueOnFail();
    const returnData = [];
    const groups = new Map();
    for (let i = 0; i < itemsLength; i++) {
        try {
            const fields = prepareFields(ctx.getNodeParameter('fields', i));
            const useDotNotation = Boolean(ctx.getNodeParameter('options.useDotNotation', i, false));
            const dateFields = prepareFields(ctx.getNodeParameter('options.dateFields', i, ''));
            const updateKey = (ctx.getNodeParameter('updateKey', i) || '').trim();
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
            const filter = { [updateKey]: item[updateKey] };
            if (updateKey === '_id') {
                filter[updateKey] = new ObjectId(item[updateKey]);
                delete item._id;
            }
            const collection = ctx.getNodeParameter('collection', i);
            const group = groups.get(collection) ?? [];
            groups.set(collection, group);
            group.push({
                op: { updateOne: { filter, update: { $set: item }, ...(upsert ? { upsert: true } : {}) } },
                item,
                originalIndex: i,
            });
        }
        catch (error) {
            if (!continueOnFail)
                throw error;
            returnData.push({
                json: { error: sanitizeErrorMessage(error) },
                pairedItem: { item: i },
            });
        }
    }
    for (const [collection, entries] of groups) {
        try {
            // Ordered stops at the first failure within a collection (the pre-1.5 per-item
            // behaviour). Across interleaved collections it does not: groups run one at a
            // time, so a later group's failure can't stop an already-run group — matches
            // Insert, and only observable when `collection` is a per-item expression.
            // Continue-on-fail flips to unordered: attempt every item independently.
            await mdb.collection(collection).bulkWrite(entries.map((entry) => entry.op), { ordered: !continueOnFail });
            for (const entry of entries) {
                returnData.push({ json: entry.item, pairedItem: { item: entry.originalIndex } });
            }
        }
        catch (error) {
            if (!continueOnFail)
                throw error;
            // writeErrors carry the op's position within this bulkWrite call.
            // The driver types this as OneOrMore<WriteError>, so normalise to an array.
            const failedOpIndexes = new Map();
            if (error instanceof MongoBulkWriteError) {
                const writeErrors = [error.writeErrors].flat();
                for (const writeError of writeErrors) {
                    failedOpIndexes.set(writeError.index, writeError.errmsg ?? error.message);
                }
            }
            for (const [opIndex, entry] of entries.entries()) {
                const failure = failedOpIndexes.get(opIndex);
                // No per-op verdicts (e.g. a connection failure): treat the whole group as failed
                if (failure !== undefined || failedOpIndexes.size === 0) {
                    returnData.push({
                        json: { error: sanitizeErrorMessage(failure ?? error) },
                        pairedItem: { item: entry.originalIndex },
                    });
                }
                else {
                    returnData.push({ json: entry.item, pairedItem: { item: entry.originalIndex } });
                }
            }
        }
    }
    returnData.sort((a, b) => a.pairedItem.item - b.pairedItem.item);
    return returnData;
}
export class MongoDb {
    description = {
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
            async mongoDbCredentialTest(credential) {
                const credentials = credential.data;
                let connectionString = '';
                try {
                    const database = (credentials.database || '').trim();
                    if (credentials.configurationType === 'connectionString') {
                        connectionString = (credentials.connectionString || '').trim();
                    }
                    else {
                        connectionString = buildParameterizedConnString(credentials);
                    }
                    // Note: ICredentialTestFunctions doesn't have a way to get the Node instance
                    // so we set the version to 0
                    const client = await connectMongoClient(connectionString, 0, credentials);
                    const { databases } = await client.db().admin().listDatabases();
                    if (!databases.map((db) => db.name).includes(database)) {
                        throw new UserError(`Database "${database}" does not exist`, {
                            level: 'warning',
                        });
                    }
                    await client.close();
                }
                catch (error) {
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
    async execute() {
        const credentials = await this.getCredentials('mongoDb');
        const node = this.getNode();
        const { database, connectionString } = validateAndResolveMongoCredentials(node, credentials);
        const nodeVersion = node.typeVersion;
        const sanitizeErrorMessage = (error) => sanitizeMongoUriInMessage(error, connectionString);
        let client;
        try {
            client = await connectMongoClient(connectionString, nodeVersion, credentials);
        }
        catch (error) {
            throw new NodeOperationError(node, sanitizeErrorMessage(error));
        }
        let returnData = [];
        try {
            const mdb = client.db(database);
            const items = this.getInputData();
            const operation = this.getNodeParameter('operation', 0);
            let itemsLength = items.length ? 1 : 0;
            let fallbackPairedItems = null;
            if (nodeVersion >= 1.1) {
                itemsLength = items.length;
            }
            else {
                fallbackPairedItems = generatePairedItemData(items.length);
            }
            if (operation === 'aggregate') {
                for (let i = 0; i < itemsLength; i++) {
                    try {
                        const queryParameter = parseAndResolveQueryParameters(this.getNodeParameter('query', i), this.getNodeParameter('queryParameters', i, []), node, i);
                        if (queryParameter._id && typeof queryParameter._id === 'string') {
                            queryParameter._id = new ObjectId(queryParameter._id);
                        }
                        const query = mdb
                            .collection(this.getNodeParameter('collection', i))
                            .aggregate(queryParameter);
                        for (const entry of await query.toArray()) {
                            returnData.push({ json: entry, pairedItem: fallbackPairedItems ?? [{ item: i }] });
                        }
                    }
                    catch (error) {
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
                        const queryParameter = parseAndResolveQueryParameters(this.getNodeParameter('query', i), this.getNodeParameter('queryParameters', i, []), node, i);
                        const { deletedCount } = await mdb
                            .collection(this.getNodeParameter('collection', i))
                            .deleteMany(queryParameter);
                        returnData.push({
                            json: { deletedCount },
                            pairedItem: fallbackPairedItems ?? [{ item: i }],
                        });
                    }
                    catch (error) {
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
                        const queryParameter = parseAndResolveQueryParameters(this.getNodeParameter('query', i), this.getNodeParameter('queryParameters', i, []), node, i);
                        if (queryParameter._id && typeof queryParameter._id === 'string') {
                            queryParameter._id = new ObjectId(queryParameter._id);
                        }
                        let query = mdb
                            .collection(this.getNodeParameter('collection', i))
                            .find(queryParameter);
                        const options = this.getNodeParameter('options', i);
                        const limit = options.limit;
                        const skip = options.skip;
                        const projection = options.projection &&
                            parseAndResolveQueryParameters(options.projection, options.projectionParameters ?? [], node, i, 'Projection');
                        const sort = options.sort &&
                            parseAndResolveQueryParameters(options.sort, options.sortParameters ?? [], node, i, 'Sort');
                        if (skip > 0) {
                            query = query.skip(skip);
                        }
                        if (limit > 0) {
                            query = query.limit(limit);
                        }
                        if (sort && Object.keys(sort).length !== 0 && sort.constructor === Object) {
                            query = query.sort(sort);
                        }
                        if (projection &&
                            Object.keys(projection).length !== 0 &&
                            projection.constructor === Object) {
                            query = query.project(projection);
                        }
                        const queryResult = await query.toArray();
                        for (const entry of queryResult) {
                            returnData.push({ json: entry, pairedItem: fallbackPairedItems ?? [{ item: i }] });
                        }
                    }
                    catch (error) {
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
                        const fields = prepareFields(this.getNodeParameter('fields', i));
                        const useDotNotation = this.getNodeParameter('options.useDotNotation', i, false);
                        const dateFields = prepareFields(this.getNodeParameter('options.dateFields', i, ''));
                        const updateKey = (this.getNodeParameter('updateKey', i) || '').trim();
                        const updateOptions = this.getNodeParameter('upsert', i)
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
                                throw new NodeOperationError(this.getNode(), 'Item is missing the updateKey field', { itemIndex: i });
                            }
                            const filter = { [updateKey]: item[updateKey] };
                            if (updateKey === '_id') {
                                filter[updateKey] = new ObjectId(item[updateKey]);
                                delete item._id;
                            }
                            await mdb
                                .collection(this.getNodeParameter('collection', i))
                                .findOneAndReplace(filter, item, updateOptions);
                            returnData.push({ json: item, pairedItem: { item: i } });
                        }
                        catch (error) {
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
                }
                else {
                    const fields = prepareFields(this.getNodeParameter('fields', 0));
                    const useDotNotation = this.getNodeParameter('options.useDotNotation', 0, false);
                    const dateFields = prepareFields(this.getNodeParameter('options.dateFields', 0, ''));
                    const updateKey = (this.getNodeParameter('updateKey', 0) || '').trim();
                    const updateOptions = this.getNodeParameter('upsert', 0)
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
                                filter[updateKey] = new ObjectId(item[updateKey]);
                                delete item._id;
                            }
                            await mdb
                                .collection(this.getNodeParameter('collection', 0))
                                .findOneAndReplace(filter, item, updateOptions);
                        }
                        catch (error) {
                            if (this.continueOnFail()) {
                                item.json = { error: sanitizeErrorMessage(error) };
                                continue;
                            }
                            throw error;
                        }
                    }
                    returnData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(updateItems), { itemData: fallbackPairedItems });
                }
            }
            if (operation === 'findOneAndUpdate') {
                fallbackPairedItems = fallbackPairedItems ?? generatePairedItemData(items.length);
                if (nodeVersion >= 1.5) {
                    returnData = returnData.concat(await executeBulkUpdate(this, mdb, items, itemsLength, sanitizeErrorMessage));
                }
                else if (nodeVersion >= 1.3) {
                    for (let i = 0; i < itemsLength; i++) {
                        const fields = prepareFields(this.getNodeParameter('fields', i));
                        const useDotNotation = this.getNodeParameter('options.useDotNotation', i, false);
                        const dateFields = prepareFields(this.getNodeParameter('options.dateFields', i, ''));
                        const updateKey = (this.getNodeParameter('updateKey', i) || '').trim();
                        const updateOptions = this.getNodeParameter('upsert', i)
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
                                throw new NodeOperationError(this.getNode(), 'Item is missing the updateKey field', { itemIndex: i });
                            }
                            const filter = { [updateKey]: item[updateKey] };
                            if (updateKey === '_id') {
                                filter[updateKey] = new ObjectId(item[updateKey]);
                                delete item._id;
                            }
                            await mdb
                                .collection(this.getNodeParameter('collection', i))
                                .findOneAndUpdate(filter, { $set: item }, updateOptions);
                            returnData.push({ json: item, pairedItem: { item: i } });
                        }
                        catch (error) {
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
                }
                else {
                    const fields = prepareFields(this.getNodeParameter('fields', 0));
                    const useDotNotation = this.getNodeParameter('options.useDotNotation', 0, false);
                    const dateFields = prepareFields(this.getNodeParameter('options.dateFields', 0, ''));
                    const updateKey = (this.getNodeParameter('updateKey', 0) || '').trim();
                    const updateOptions = this.getNodeParameter('upsert', 0)
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
                                filter[updateKey] = new ObjectId(item[updateKey]);
                                delete item._id;
                            }
                            await mdb
                                .collection(this.getNodeParameter('collection', 0))
                                .findOneAndUpdate(filter, { $set: item }, updateOptions);
                        }
                        catch (error) {
                            if (this.continueOnFail()) {
                                item.json = { error: sanitizeErrorMessage(error) };
                                continue;
                            }
                            throw error;
                        }
                    }
                    returnData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(updateItems), { itemData: fallbackPairedItems });
                }
            }
            if (operation === 'insert') {
                fallbackPairedItems = fallbackPairedItems ?? generatePairedItemData(items.length);
                if (nodeVersion >= 1.3) {
                    // Phase 1: prepare items and group by collection name
                    const groups = new Map();
                    for (let i = 0; i < itemsLength; i++) {
                        try {
                            const fields = prepareFields(this.getNodeParameter('fields', i));
                            const useDotNotation = this.getNodeParameter('options.useDotNotation', i, false);
                            const dateFields = prepareFields(this.getNodeParameter('options.dateFields', i, ''));
                            const [insertItem] = prepareItems({
                                items: [items[i]],
                                fields,
                                updateKey: '',
                                useDotNotation,
                                dateFields,
                                node: this.getNode(),
                            });
                            if (!insertItem)
                                continue;
                            const collection = this.getNodeParameter('collection', i);
                            const group = groups.get(collection) ?? [];
                            groups.set(collection, group);
                            group.push({ item: insertItem, originalIndex: i });
                        }
                        catch (error) {
                            if (this.continueOnFail()) {
                                returnData.push({
                                    json: { error: sanitizeErrorMessage(error) },
                                    pairedItem: { item: i },
                                });
                            }
                            else {
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
                                    json: { ...g.item, id: insertedIds[idx] },
                                    pairedItem: { item: g.originalIndex },
                                });
                            }
                        }
                        catch (error) {
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
                        const aIdx = a.pairedItem.item;
                        const bIdx = b.pairedItem.item;
                        return aIdx - bIdx;
                    });
                }
                else {
                    let responseData = [];
                    try {
                        // Prepare the data to insert and copy it to be returned
                        const fields = prepareFields(this.getNodeParameter('fields', 0));
                        const useDotNotation = this.getNodeParameter('options.useDotNotation', 0, false);
                        const dateFields = prepareFields(this.getNodeParameter('options.dateFields', 0, ''));
                        const insertItems = prepareItems({
                            items,
                            fields,
                            updateKey: '',
                            useDotNotation,
                            dateFields,
                            node: this.getNode(),
                        });
                        const { insertedIds } = await mdb
                            .collection(this.getNodeParameter('collection', 0))
                            .insertMany(insertItems);
                        // Add the id to the data
                        for (const i of Object.keys(insertedIds)) {
                            responseData.push({
                                ...insertItems[parseInt(i, 10)],
                                id: insertedIds[parseInt(i, 10)],
                            });
                        }
                    }
                    catch (error) {
                        if (this.continueOnFail()) {
                            responseData = [{ error: sanitizeErrorMessage(error) }];
                        }
                        else {
                            throw error;
                        }
                    }
                    returnData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: fallbackPairedItems });
                }
            }
            if (operation === 'update') {
                fallbackPairedItems = fallbackPairedItems ?? generatePairedItemData(items.length);
                if (nodeVersion >= 1.5) {
                    returnData = returnData.concat(await executeBulkUpdate(this, mdb, items, itemsLength, sanitizeErrorMessage));
                }
                else if (nodeVersion >= 1.3) {
                    for (let i = 0; i < itemsLength; i++) {
                        const fields = prepareFields(this.getNodeParameter('fields', i));
                        const useDotNotation = this.getNodeParameter('options.useDotNotation', i, false);
                        const dateFields = prepareFields(this.getNodeParameter('options.dateFields', i, ''));
                        const updateKey = (this.getNodeParameter('updateKey', i) || '').trim();
                        const updateOptions = this.getNodeParameter('upsert', i)
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
                                throw new NodeOperationError(this.getNode(), 'Item is missing the updateKey field', { itemIndex: i });
                            }
                            const filter = { [updateKey]: item[updateKey] };
                            if (updateKey === '_id') {
                                filter[updateKey] = new ObjectId(item[updateKey]);
                                delete item._id;
                            }
                            await mdb
                                .collection(this.getNodeParameter('collection', i))
                                .updateOne(filter, { $set: item }, updateOptions);
                            returnData.push({ json: item, pairedItem: { item: i } });
                        }
                        catch (error) {
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
                }
                else {
                    const fields = prepareFields(this.getNodeParameter('fields', 0));
                    const useDotNotation = this.getNodeParameter('options.useDotNotation', 0, false);
                    const dateFields = prepareFields(this.getNodeParameter('options.dateFields', 0, ''));
                    const updateKey = (this.getNodeParameter('updateKey', 0) || '').trim();
                    const updateOptions = this.getNodeParameter('upsert', 0)
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
                                filter[updateKey] = new ObjectId(item[updateKey]);
                                delete item._id;
                            }
                            await mdb
                                .collection(this.getNodeParameter('collection', 0))
                                .updateOne(filter, { $set: item }, updateOptions);
                        }
                        catch (error) {
                            if (this.continueOnFail()) {
                                item.json = { error: sanitizeErrorMessage(error) };
                                continue;
                            }
                            throw error;
                        }
                    }
                    returnData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(updateItems), { itemData: fallbackPairedItems });
                }
            }
            if (operation === 'listSearchIndexes') {
                for (let i = 0; i < itemsLength; i++) {
                    try {
                        const collection = this.getNodeParameter('collection', i);
                        const indexName = (() => {
                            const name = this.getNodeParameter('indexName', i);
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
                    }
                    catch (error) {
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
                        const collection = this.getNodeParameter('collection', i);
                        const indexName = this.getNodeParameter('indexNameRequired', i);
                        await mdb.collection(collection).dropSearchIndex(indexName);
                        returnData.push({
                            json: {
                                [indexName]: true,
                            },
                            pairedItem: fallbackPairedItems ?? [{ item: i }],
                        });
                    }
                    catch (error) {
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
                        const collection = this.getNodeParameter('collection', i);
                        const indexName = this.getNodeParameter('indexNameRequired', i);
                        const indexType = this.getNodeParameter('indexType', i);
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
                    }
                    catch (error) {
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
                        const collection = this.getNodeParameter('collection', i);
                        const indexName = this.getNodeParameter('indexNameRequired', i);
                        const definition = resolveIndexDefinition(this, node, i);
                        await mdb.collection(collection).updateSearchIndex(indexName, definition);
                        returnData.push({
                            json: { [indexName]: true },
                            pairedItem: fallbackPairedItems ?? [{ item: i }],
                        });
                    }
                    catch (error) {
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
        }
        catch (error) {
            const sanitizedMessage = sanitizeErrorMessage(error);
            if (error instanceof Error && sanitizedMessage === error.message)
                throw error;
            throw new NodeOperationError(node, sanitizedMessage);
        }
        finally {
            await client.close().catch(() => { });
        }
        if (nodeVersion >= 1.4) {
            return [await serializeMongoItems.call(this, returnData)];
        }
        return [stringifyObjectIDs(returnData)];
    }
}
//# sourceMappingURL=MongoDb.node.js.map