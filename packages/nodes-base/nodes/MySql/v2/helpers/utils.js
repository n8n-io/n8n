import { NodeOperationError } from 'n8n-workflow';
import { BATCH_MODE } from './interfaces';
import { operatorOptions } from '../actions/common.descriptions';
export function escapeSqlIdentifier(identifier) {
    const parts = identifier.match(/(`[^`]*`|[^.`]+)/g) ?? [];
    return parts
        .map((part) => {
        const trimmedPart = part.trim();
        if (trimmedPart.startsWith('`') && trimmedPart.endsWith('`')) {
            return trimmedPart;
        }
        return `\`${trimmedPart}\``;
    })
        .join('.');
}
function findParameterMatches(rawQuery, regex) {
    const matches = [];
    let match;
    while ((match = regex.exec(rawQuery)) !== null) {
        matches.push({
            match: match[0],
            index: match.index,
            paramNumber: match[1],
            isName: match[0].includes(':name'),
        });
    }
    return matches;
}
function isInsideQuotes(rawQuery, index) {
    const beforeMatch = rawQuery.substring(0, index);
    const singleQuoteCount = (beforeMatch.match(/'/g) || []).length;
    const doubleQuoteCount = (beforeMatch.match(/"/g) || []).length;
    return singleQuoteCount % 2 !== 0 || doubleQuoteCount % 2 !== 0;
}
function filterValidMatches(matches, rawQuery) {
    return matches.filter(({ index }) => !isInsideQuotes(rawQuery, index));
}
function processParameterReplacements(query, validMatches, replacements) {
    let processedQuery = query;
    for (const { match: matchStr, paramNumber, isName } of validMatches.reverse()) {
        const matchIndex = Number(paramNumber) - 1;
        if (matchIndex >= 0 && matchIndex < replacements.length) {
            if (isName) {
                processedQuery = processedQuery.replace(matchStr, escapeSqlIdentifier(replacements[matchIndex].toString()));
            }
            else {
                processedQuery = processedQuery.replace(matchStr, '?');
            }
        }
    }
    return processedQuery;
}
function extractValuesFromMatches(validMatches, replacements) {
    const nonNameMatches = validMatches.filter((match) => !match.isName);
    nonNameMatches.sort((a, b) => Number(a.paramNumber) - Number(b.paramNumber));
    const values = [];
    for (const { paramNumber } of nonNameMatches) {
        const matchIndex = Number(paramNumber) - 1;
        if (matchIndex >= 0 && matchIndex < replacements.length) {
            values.push(replacements[matchIndex]);
        }
    }
    return values;
}
function validateReferencedParameters(validMatches, replacements) {
    for (const match of validMatches) {
        const paramIndex = Number(match.paramNumber) - 1;
        if (paramIndex >= replacements.length || paramIndex < 0) {
            throw new Error(`Parameter $${match.paramNumber} referenced in query but no replacement value provided at index ${paramIndex + 1}`);
        }
    }
}
// Quote-aware parser: only rewrites `$<digit>` placeholders found outside string
// literals, so values inside quotes (e.g. `'$5'`) are left untouched.
export const prepareSafeQuery = (rawQuery, replacements) => {
    if (replacements === undefined) {
        return { query: rawQuery, values: [] };
    }
    const regex = /\$(\d+)(?::name)?/g;
    const matches = findParameterMatches(rawQuery, regex);
    const validMatches = filterValidMatches(matches, rawQuery);
    validateReferencedParameters(validMatches, replacements);
    const query = processParameterReplacements(rawQuery, validMatches, replacements);
    const values = extractValuesFromMatches(validMatches, replacements);
    return { query, values };
};
export const prepareQueryAndReplacements = (rawQuery, nodeVersion, replacements) => {
    if (replacements === undefined) {
        return { query: rawQuery, values: [] };
    }
    if (nodeVersion >= 2.5) {
        return prepareSafeQuery(rawQuery, replacements);
    }
    return prepareQueryLegacy(rawQuery, replacements);
};
export const prepareQueryLegacy = (rawQuery, replacements) => {
    let query = rawQuery;
    const values = [];
    const regex = /\$(\d+)(?::name)?/g;
    const matches = rawQuery.match(regex) || [];
    for (const match of matches) {
        if (match.includes(':name')) {
            const matchIndex = Number(match.replace('$', '').replace(':name', '')) - 1;
            query = query.replace(match, escapeSqlIdentifier(replacements[matchIndex].toString()));
        }
        else {
            const matchIndex = Number(match.replace('$', '')) - 1;
            query = query.replace(match, '?');
            values.push(replacements[matchIndex]);
        }
    }
    return { query, values };
};
export function prepareErrorItem(item, error, index) {
    return {
        json: { message: error.message, item: { ...item }, itemIndex: index },
        error,
        pairedItem: { item: index },
    };
}
export function parseMySqlError(error, itemIndex = 0, queries) {
    let message = error.message;
    const description = `sql: ${error.sql}, code: ${error.code}`;
    if (queries?.length &&
        (message || '').toLowerCase().includes('you have an error in your sql syntax')) {
        let queryIndex = itemIndex;
        const failedStatement = ((message.split("near '")[1] || '').split("' at")[0] || '').split(';')[0];
        if (failedStatement) {
            if (queryIndex === 0 && queries.length > 1) {
                const failedQueryIndex = queries.findIndex((query) => query.includes(failedStatement));
                if (failedQueryIndex !== -1) {
                    queryIndex = failedQueryIndex;
                }
            }
            const lines = queries[queryIndex].split('\n');
            const failedLine = lines.findIndex((line) => line.includes(failedStatement));
            if (failedLine !== -1) {
                message = `You have an error in your SQL syntax on line ${failedLine + 1} near '${failedStatement}'`;
            }
        }
    }
    if ((error?.message).includes('ECONNREFUSED')) {
        message = 'Connection refused';
    }
    return new NodeOperationError(this.getNode(), error, {
        message,
        description,
        itemIndex,
    });
}
export function wrapData(data) {
    if (!Array.isArray(data)) {
        return [{ json: data }];
    }
    return data.map((item) => ({
        json: item,
    }));
}
export function prepareOutput(response, options, statements, constructExecutionHelper, itemData) {
    let returnData = [];
    if (options.detailedOutput) {
        response.forEach((entry, index) => {
            const item = {
                sql: statements[index],
                data: entry,
            };
            const executionData = constructExecutionHelper(wrapData(item), {
                itemData,
            });
            returnData = returnData.concat(executionData);
        });
    }
    else {
        response
            .filter((entry) => Array.isArray(entry))
            .forEach((entry, index) => {
            const executionData = constructExecutionHelper(wrapData(entry), {
                itemData: Array.isArray(itemData) ? itemData[index] : itemData,
            });
            returnData = returnData.concat(executionData);
        });
    }
    if (!returnData.length) {
        if (options?.nodeVersion < 2.2) {
            returnData.push({ json: { success: true }, pairedItem: itemData });
        }
        else {
            const isSelectQuery = statements
                .filter((statement) => !statement.startsWith('--'))
                .every((statement) => statement
                .replace(/\/\*.*?\*\//g, '') // remove multiline comments
                .replace(/\n/g, '')
                .toLowerCase()
                .startsWith('select'));
            if (!isSelectQuery) {
                returnData.push({ json: { success: true }, pairedItem: itemData });
            }
        }
    }
    return returnData;
}
const END_OF_STATEMENT = /;(?=(?:[^'\\]|'[^']*?'|\\[\s\S])*?$)/g;
export const splitQueryToStatements = (query, filterOutEmpty = true) => {
    const statements = query
        .replace(/\n/g, '')
        .split(END_OF_STATEMENT)
        .map((statement) => statement.trim());
    return filterOutEmpty ? statements.filter((statement) => statement !== '') : statements;
};
export function configureQueryRunner(options, pool) {
    return async (queries) => {
        if (queries.length === 0) {
            return [];
        }
        let returnData = [];
        const mode = options.queryBatching || BATCH_MODE.SINGLE;
        let connection;
        try {
            connection = await pool.getConnection();
        }
        catch (e) {
            const error = parseMySqlError.call(this, e);
            if (!this.continueOnFail()) {
                throw error;
            }
            return [{ json: { message: error.message, error: { ...error } } }];
        }
        if (mode === BATCH_MODE.SINGLE) {
            const formattedQueries = queries.map(({ query, values }) => connection.format(query, values));
            try {
                //releasing connection after formatting queries, otherwise pool.query() will fail with timeout
                connection.release();
                let singleQuery = '';
                if (formattedQueries.length > 1) {
                    singleQuery = formattedQueries.map((query) => query.trim().replace(/;$/, '')).join(';');
                }
                else {
                    singleQuery = formattedQueries[0];
                }
                let response = (await pool.query(singleQuery))[0];
                if (!response)
                    return [];
                let statements;
                if (options?.nodeVersion <= 2.3) {
                    statements = singleQuery
                        .replace(/\n/g, '')
                        .split(';')
                        .filter((statement) => statement !== '');
                }
                else {
                    statements = splitQueryToStatements(singleQuery);
                }
                if (Array.isArray(response)) {
                    if (statements.length === 1)
                        response = [response];
                }
                else {
                    response = [response];
                }
                //because single query is used in this mode mapping itemIndex not possible, setting all items as paired
                const pairedItem = queries.map((q, index) => ({ item: q.itemIndex ?? index }));
                returnData = returnData.concat(prepareOutput(response, options, statements, this.helpers.constructExecutionMetaData, pairedItem));
            }
            catch (err) {
                const error = parseMySqlError.call(this, err, 0, formattedQueries);
                if (!this.continueOnFail())
                    throw error;
                returnData.push({ json: { message: error.message, error: { ...error } } });
            }
        }
        else {
            if (mode === BATCH_MODE.INDEPENDENTLY) {
                let formattedQuery = '';
                for (const [index, queryWithValues] of queries.entries()) {
                    const itemIndex = queryWithValues.itemIndex ?? index;
                    try {
                        const { query, values } = queryWithValues;
                        formattedQuery = connection.format(query, values);
                        let statements;
                        if (options?.nodeVersion <= 2.3) {
                            statements = formattedQuery.split(';').map((q) => q.trim());
                        }
                        else {
                            statements = splitQueryToStatements(formattedQuery, false);
                        }
                        const responses = [];
                        for (const statement of statements) {
                            if (statement === '')
                                continue;
                            const response = (await connection.query(statement))[0];
                            responses.push(response);
                        }
                        returnData = returnData.concat(prepareOutput(responses, options, statements, this.helpers.constructExecutionMetaData, { item: itemIndex }));
                    }
                    catch (err) {
                        const error = parseMySqlError.call(this, err, itemIndex, [formattedQuery]);
                        if (!this.continueOnFail()) {
                            connection.release();
                            throw error;
                        }
                        returnData.push(prepareErrorItem(queries[index], error, itemIndex));
                    }
                }
            }
            if (mode === BATCH_MODE.TRANSACTION) {
                await connection.beginTransaction();
                let formattedQuery = '';
                for (const [index, queryWithValues] of queries.entries()) {
                    const itemIndex = queryWithValues.itemIndex ?? index;
                    try {
                        const { query, values } = queryWithValues;
                        formattedQuery = connection.format(query, values);
                        let statements;
                        if (options?.nodeVersion <= 2.3) {
                            statements = formattedQuery.split(';').map((q) => q.trim());
                        }
                        else {
                            statements = splitQueryToStatements(formattedQuery, false);
                        }
                        const responses = [];
                        for (const statement of statements) {
                            if (statement === '')
                                continue;
                            const response = (await connection.query(statement))[0];
                            responses.push(response);
                        }
                        returnData = returnData.concat(prepareOutput(responses, options, statements, this.helpers.constructExecutionMetaData, { item: itemIndex }));
                    }
                    catch (err) {
                        const error = parseMySqlError.call(this, err, itemIndex, [formattedQuery]);
                        if (connection) {
                            await connection.rollback();
                            connection.release();
                        }
                        if (!this.continueOnFail())
                            throw error;
                        returnData.push(prepareErrorItem(queries[index], error, itemIndex));
                        // Return here because we already rolled back the transaction
                        return returnData;
                    }
                }
                await connection.commit();
            }
            connection.release();
        }
        return returnData;
    };
}
export function addWhereClauses(node, itemIndex, query, clauses, replacements, combineConditions) {
    if (clauses.length === 0)
        return [query, replacements];
    let combineWith = 'AND';
    if (combineConditions === 'OR') {
        combineWith = 'OR';
    }
    let whereQuery = ' WHERE';
    const values = [];
    clauses.forEach((clause, index) => {
        if (clause.condition === 'equal') {
            clause.condition = '=';
        }
        if (['>', '<', '>=', '<='].includes(clause.condition)) {
            const value = Number(clause.value);
            if (Number.isNaN(value)) {
                throw new NodeOperationError(node, `Operator in entry ${index + 1} of 'Select Rows' works with numbers, but value ${clause.value} is not a number`, {
                    itemIndex,
                });
            }
            clause.value = value;
        }
        let valueReplacement = ' ';
        if (clause.condition !== 'IS NULL' && clause.condition !== 'IS NOT NULL') {
            valueReplacement = ' ?';
            values.push(clause.value);
        }
        const operator = index === clauses.length - 1 ? '' : ` ${combineWith}`;
        whereQuery += ` ${escapeSqlIdentifier(clause.column)} ${clause.condition}${valueReplacement}${operator}`;
    });
    return [`${query}${whereQuery}`, replacements.concat.apply(replacements, values)];
}
export function addSortRules(query, rules, replacements) {
    if (rules.length === 0)
        return [query, replacements];
    let orderByQuery = ' ORDER BY';
    const values = [];
    rules.forEach((rule, index) => {
        const endWith = index === rules.length - 1 ? '' : ',';
        const direction = rule.direction === 'ASC' ? 'ASC' : 'DESC';
        orderByQuery += ` ${escapeSqlIdentifier(rule.column)} ${direction}${endWith}`;
    });
    return [`${query}${orderByQuery}`, replacements.concat.apply(replacements, values)];
}
export function replaceEmptyStringsByNulls(items, replace) {
    if (!replace)
        return [...items];
    const returnData = items.map((item) => {
        const newItem = { ...item };
        const keys = Object.keys(newItem.json);
        for (const key of keys) {
            if (newItem.json[key] === '') {
                newItem.json[key] = null;
            }
        }
        return newItem;
    });
    return returnData;
}
// operations use 'equal' instead of '=' because of the way expressions are handled
// manually add '=' to allow entering it instead of 'equal'
const conditionSet = new Set(operatorOptions.map((option) => option.value)).add('=');
export const isWhereClause = (clause) => {
    if (typeof clause !== 'object' || clause === null)
        return false;
    if (!('column' in clause))
        return false;
    if (!('condition' in clause) ||
        typeof clause.condition !== 'string' ||
        !conditionSet.has(clause.condition))
        return false;
    return true;
};
export const getWhereClauses = (ctx, itemIndex) => {
    const whereClauses = ctx.getNodeParameter('where', itemIndex, []);
    const whereClausesValues = whereClauses.values;
    if (!Array.isArray(whereClausesValues)) {
        return [];
    }
    const someInvalid = whereClausesValues.some((clause) => !isWhereClause(clause));
    if (someInvalid) {
        throw new NodeOperationError(ctx.getNode(), 'Invalid where clause', {
            itemIndex,
        });
    }
    return whereClausesValues;
};
//# sourceMappingURL=utils.js.map