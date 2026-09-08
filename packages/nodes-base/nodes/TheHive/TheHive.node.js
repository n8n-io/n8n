import set from 'lodash/set';
import { NodeConnectionTypes, } from 'n8n-workflow';
import { alertFields, alertOperations } from './descriptions/AlertDescription';
import { caseFields, caseOperations } from './descriptions/CaseDescription';
import { logFields, logOperations } from './descriptions/LogDescription';
import { observableFields, observableOperations } from './descriptions/ObservableDescription';
import { taskFields, taskOperations } from './descriptions/TaskDescription';
import { buildCustomFieldSearch, mapResource, parseAnalyzers, prepareCustomFields, prepareOptional, prepareRangeQuery, prepareSortQuery, splitTags, theHiveApiRequest, } from './GenericFunctions';
import { And, Between, ContainsString, Eq, Id, In, Parent } from './QueryFunctions';
export class TheHive {
    description = {
        displayName: 'TheHive',
        name: 'theHive',
        icon: 'file:thehive.svg',
        group: ['transform'],
        subtitle: '={{$parameter["operation"]}} : {{$parameter["resource"]}}',
        version: 1,
        description: 'Consume TheHive API',
        defaults: {
            name: 'TheHive',
        },
        usableAsTool: true,
        inputs: [NodeConnectionTypes.Main],
        outputs: [NodeConnectionTypes.Main],
        credentials: [
            {
                name: 'theHiveApi',
                required: true,
            },
        ],
        properties: [
            {
                displayName: 'Resource',
                name: 'resource',
                type: 'options',
                noDataExpression: true,
                required: true,
                options: [
                    {
                        name: 'Alert',
                        value: 'alert',
                    },
                    {
                        name: 'Case',
                        value: 'case',
                    },
                    {
                        name: 'Log',
                        value: 'log',
                    },
                    {
                        name: 'Observable',
                        value: 'observable',
                    },
                    {
                        name: 'Task',
                        value: 'task',
                    },
                ],
                default: 'alert',
            },
            // Alert
            ...alertOperations,
            ...alertFields,
            // Observable
            ...observableOperations,
            ...observableFields,
            // Case
            ...caseOperations,
            ...caseFields,
            // Task
            ...taskOperations,
            ...taskFields,
            // Log
            ...logOperations,
            ...logFields,
        ],
    };
    methods = {
        loadOptions: {
            async loadResponders() {
                // request the analyzers from instance
                const resource = mapResource(this.getNodeParameter('resource'));
                const resourceId = this.getNodeParameter('id');
                const endpoint = `/connector/cortex/responder/${resource}/${resourceId}`;
                const responders = await theHiveApiRequest.call(this, 'GET', endpoint);
                const returnData = [];
                for (const responder of responders) {
                    returnData.push({
                        name: responder.name,
                        value: responder.id,
                        description: responder.description,
                    });
                }
                return returnData;
            },
            async loadAnalyzers() {
                // request the analyzers from instance
                const dataType = this.getNodeParameter('dataType');
                const endpoint = `/connector/cortex/analyzer/type/${dataType}`;
                const requestResult = await theHiveApiRequest.call(this, 'GET', endpoint);
                const returnData = [];
                for (const analyzer of requestResult) {
                    for (const cortexId of analyzer.cortexIds) {
                        returnData.push({
                            name: `[${cortexId}] ${analyzer.name}`,
                            value: `${analyzer.id}::${cortexId}`,
                            description: analyzer.description,
                        });
                    }
                }
                return returnData;
            },
            async loadCustomFields() {
                const credentials = await this.getCredentials('theHiveApi');
                const version = credentials.apiVersion;
                const endpoint = version === 'v1' ? '/customField' : '/list/custom_fields';
                const requestResult = await theHiveApiRequest.call(this, 'GET', endpoint);
                const returnData = [];
                // Convert TheHive3 response to the same format as TheHive 4
                const customFields = version === 'v1'
                    ? requestResult
                    : Object.keys(requestResult).map((key) => requestResult[key]);
                for (const field of customFields) {
                    returnData.push({
                        name: `${field.name}: ${field.reference}`,
                        value: field.reference,
                        description: `${field.type}: ${field.description}`,
                    });
                }
                return returnData;
            },
            async loadObservableOptions() {
                // if v1 is not used we remove 'count' option
                const version = (await this.getCredentials('theHiveApi')).apiVersion;
                const options = [
                    ...(version === 'v1'
                        ? [{ name: 'Count', value: 'count', description: 'Count observables' }]
                        : []),
                    { name: 'Create', value: 'create', description: 'Create observable' },
                    {
                        name: 'Execute Analyzer',
                        value: 'executeAnalyzer',
                        description: 'Execute an responder on selected observable',
                    },
                    {
                        name: 'Execute Responder',
                        value: 'executeResponder',
                        description: 'Execute a responder on selected observable',
                    },
                    {
                        name: 'Get Many',
                        value: 'getAll',
                        description: 'Get all observables of a specific case',
                    },
                    { name: 'Get', value: 'get', description: 'Get a single observable' },
                    { name: 'Search', value: 'search', description: 'Search observables' },
                    { name: 'Update', value: 'update', description: 'Update observable' },
                ];
                return options;
            },
            async loadObservableTypes() {
                const version = (await this.getCredentials('theHiveApi')).apiVersion;
                const endpoint = version === 'v1' ? '/observable/type?range=all' : '/list/list_artifactDataType';
                const dataTypes = await theHiveApiRequest.call(this, 'GET', endpoint);
                let returnData = [];
                if (version === 'v1') {
                    returnData = dataTypes.map((dataType) => {
                        return {
                            name: dataType.name,
                            value: dataType.name,
                        };
                    });
                }
                else {
                    returnData = Object.keys(dataTypes).map((key) => {
                        const dataType = dataTypes[key];
                        return {
                            name: dataType,
                            value: dataType,
                        };
                    });
                }
                // Sort the array by option name
                returnData.sort((a, b) => {
                    if (a.name < b.name) {
                        return -1;
                    }
                    if (a.name > b.name) {
                        return 1;
                    }
                    return 0;
                });
                return returnData;
            },
            async loadTaskOptions() {
                const credentials = await this.getCredentials('theHiveApi');
                const version = credentials.apiVersion;
                const options = [
                    ...(version === 'v1'
                        ? [{ name: 'Count', value: 'count', description: 'Count tasks' }]
                        : []),
                    { name: 'Create', value: 'create', description: 'Create a task' },
                    {
                        name: 'Execute Responder',
                        value: 'executeResponder',
                        description: 'Execute a responder on the specified task',
                    },
                    { name: 'Get Many', value: 'getAll', description: 'Get all asks of a specific case' },
                    { name: 'Get', value: 'get', description: 'Get a single task' },
                    { name: 'Search', value: 'search', description: 'Search tasks' },
                    { name: 'Update', value: 'update', description: 'Update a task' },
                ];
                return options;
            },
            async loadAlertOptions() {
                const credentials = await this.getCredentials('theHiveApi');
                const version = credentials.apiVersion;
                const options = [
                    ...(version === 'v1'
                        ? [{ name: 'Count', value: 'count', description: 'Count alerts' }]
                        : []),
                    { name: 'Create', value: 'create', description: 'Create alert' },
                    {
                        name: 'Execute Responder',
                        value: 'executeResponder',
                        description: 'Execute a responder on the specified alert',
                    },
                    { name: 'Get', value: 'get', description: 'Get an alert' },
                    { name: 'Get Many', value: 'getAll', description: 'Get all alerts' },
                    { name: 'Mark as Read', value: 'markAsRead', description: 'Mark the alert as read' },
                    {
                        name: 'Mark as Unread',
                        value: 'markAsUnread',
                        description: 'Mark the alert as unread',
                    },
                    { name: 'Merge', value: 'merge', description: 'Merge alert into an existing case' },
                    { name: 'Promote', value: 'promote', description: 'Promote an alert into a case' },
                    { name: 'Update', value: 'update', description: 'Update alert' },
                ];
                return options;
            },
            async loadCaseOptions() {
                const credentials = await this.getCredentials('theHiveApi');
                const version = credentials.apiVersion;
                const options = [
                    ...(version === 'v1'
                        ? [{ name: 'Count', value: 'count', description: 'Count a case' }]
                        : []),
                    { name: 'Create', value: 'create', description: 'Create a case' },
                    {
                        name: 'Execute Responder',
                        value: 'executeResponder',
                        description: 'Execute a responder on the specified case',
                    },
                    { name: 'Get Many', value: 'getAll', description: 'Get all cases' },
                    { name: 'Get', value: 'get', description: 'Get a single case' },
                    { name: 'Update', value: 'update', description: 'Update a case' },
                ];
                return options;
            },
        },
    };
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        const length = items.length;
        const qs = {};
        let responseData;
        const resource = this.getNodeParameter('resource', 0);
        const operation = this.getNodeParameter('operation', 0);
        for (let i = 0; i < length; i++) {
            try {
                if (resource === 'alert') {
                    if (operation === 'count') {
                        const filters = this.getNodeParameter('filters', i, {});
                        const countQueryAttributs = prepareOptional(filters);
                        const _countSearchQuery = And();
                        if ('customFieldsUi' in filters) {
                            const customFields = (await prepareCustomFields.call(this, filters));
                            const searchQueries = buildCustomFieldSearch(customFields);
                            _countSearchQuery['_and'].push(...searchQueries);
                        }
                        for (const key of Object.keys(countQueryAttributs)) {
                            if (key === 'tags') {
                                _countSearchQuery['_and'].push(In(key, countQueryAttributs[key]));
                            }
                            else if (key === 'description' || key === 'title') {
                                _countSearchQuery['_and'].push(ContainsString(key, countQueryAttributs[key]));
                            }
                            else {
                                _countSearchQuery['_and'].push(Eq(key, countQueryAttributs[key]));
                            }
                        }
                        const body = {
                            query: [
                                {
                                    _name: 'listAlert',
                                },
                                {
                                    _name: 'filter',
                                    _and: _countSearchQuery['_and'],
                                },
                            ],
                        };
                        body['query'].push({
                            _name: 'count',
                        });
                        qs.name = 'count-Alert';
                        responseData = await theHiveApiRequest.call(this, 'POST', '/v1/query', body, qs);
                        responseData = { count: responseData };
                    }
                    if (operation === 'create') {
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        const jsonParameters = this.getNodeParameter('jsonParameters', i);
                        const customFields = await prepareCustomFields.call(this, additionalFields, jsonParameters);
                        const body = {
                            title: this.getNodeParameter('title', i),
                            description: this.getNodeParameter('description', i),
                            severity: this.getNodeParameter('severity', i),
                            date: Date.parse(this.getNodeParameter('date', i)),
                            tags: splitTags(this.getNodeParameter('tags', i)),
                            tlp: this.getNodeParameter('tlp', i),
                            status: this.getNodeParameter('status', i),
                            type: this.getNodeParameter('type', i),
                            source: this.getNodeParameter('source', i),
                            sourceRef: this.getNodeParameter('sourceRef', i),
                            follow: this.getNodeParameter('follow', i, true),
                            ...prepareOptional(additionalFields),
                        };
                        if (customFields) {
                            Object.keys(customFields).forEach((key) => {
                                set(body, key, customFields[key]);
                            });
                        }
                        const artifactUi = this.getNodeParameter('artifactUi', i);
                        if (artifactUi) {
                            const artifactValues = artifactUi.artifactValues;
                            if (artifactValues) {
                                const artifactData = [];
                                for (const artifactvalue of artifactValues) {
                                    const element = {};
                                    element.message = artifactvalue.message;
                                    element.tags = artifactvalue.tags.split(',');
                                    element.dataType = artifactvalue.dataType;
                                    element.data = artifactvalue.data;
                                    if (artifactvalue.dataType === 'file') {
                                        const binaryPropertyName = artifactvalue.binaryProperty;
                                        const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
                                        element.data = `${binaryData.fileName};${binaryData.mimeType};${binaryData.data}`;
                                    }
                                    artifactData.push(element);
                                }
                                body.artifacts = artifactData;
                            }
                        }
                        responseData = await theHiveApiRequest.call(this, 'POST', '/alert', body);
                    }
                    /*
                        Execute responder feature differs from Cortex execute responder
                        if it doesn't interfere with n8n standards then we should keep it
                    */
                    if (operation === 'executeResponder') {
                        const alertId = this.getNodeParameter('id', i);
                        const responderId = this.getNodeParameter('responder', i);
                        let body;
                        let response;
                        responseData = [];
                        body = {
                            responderId,
                            objectId: alertId,
                            objectType: 'alert',
                        };
                        response = await theHiveApiRequest.call(this, 'POST', '/connector/cortex/action', body);
                        body = {
                            query: [
                                {
                                    _name: 'listAction',
                                },
                                {
                                    _name: 'filter',
                                    _and: [
                                        {
                                            _field: 'cortexId',
                                            _value: response.cortexId,
                                        },
                                        {
                                            _field: 'objectId',
                                            _value: response.objectId,
                                        },
                                        {
                                            _field: 'startDate',
                                            _value: response.startDate,
                                        },
                                    ],
                                },
                            ],
                        };
                        qs.name = 'log-actions';
                        do {
                            response = await theHiveApiRequest.call(this, 'POST', '/v1/query', body, qs);
                        } while (response.status === 'Waiting' || response.status === 'InProgress');
                        responseData = response;
                    }
                    if (operation === 'get') {
                        const alertId = this.getNodeParameter('id', i);
                        const includeSimilar = this.getNodeParameter('options.includeSimilar', i, false);
                        if (includeSimilar) {
                            qs.similarity = true;
                        }
                        responseData = await theHiveApiRequest.call(this, 'GET', `/alert/${alertId}`, {}, qs);
                    }
                    if (operation === 'getAll') {
                        const credentials = await this.getCredentials('theHiveApi');
                        const returnAll = this.getNodeParameter('returnAll', i);
                        const version = credentials.apiVersion;
                        const filters = this.getNodeParameter('filters', i, {});
                        const queryAttributs = prepareOptional(filters);
                        const options = this.getNodeParameter('options', i);
                        const _searchQuery = And();
                        if ('customFieldsUi' in filters) {
                            const customFields = (await prepareCustomFields.call(this, filters));
                            const searchQueries = buildCustomFieldSearch(customFields);
                            _searchQuery['_and'].push(...searchQueries);
                        }
                        for (const key of Object.keys(queryAttributs)) {
                            if (key === 'tags') {
                                _searchQuery['_and'].push(In(key, queryAttributs[key]));
                            }
                            else if (key === 'description' || key === 'title') {
                                _searchQuery['_and'].push(ContainsString(key, queryAttributs[key]));
                            }
                            else {
                                _searchQuery['_and'].push(Eq(key, queryAttributs[key]));
                            }
                        }
                        let endpoint;
                        let method;
                        let body = {};
                        let limit = undefined;
                        if (!returnAll) {
                            limit = this.getNodeParameter('limit', i);
                        }
                        if (version === 'v1') {
                            endpoint = '/v1/query';
                            method = 'POST';
                            body = {
                                query: [
                                    {
                                        _name: 'listAlert',
                                    },
                                    {
                                        _name: 'filter',
                                        _and: _searchQuery['_and'],
                                    },
                                ],
                            };
                            //@ts-ignore
                            prepareSortQuery(options.sort, body);
                            if (limit !== undefined) {
                                //@ts-ignore
                                prepareRangeQuery(`0-${limit}`, body);
                            }
                            qs.name = 'alerts';
                        }
                        else {
                            method = 'POST';
                            endpoint = '/alert/_search';
                            if (limit !== undefined) {
                                qs.range = `0-${limit}`;
                            }
                            body.query = _searchQuery;
                            Object.assign(qs, prepareOptional(options));
                        }
                        responseData = await theHiveApiRequest.call(this, method, endpoint, body, qs);
                    }
                    if (operation === 'markAsRead') {
                        const alertId = this.getNodeParameter('id', i);
                        responseData = await theHiveApiRequest.call(this, 'POST', `/alert/${alertId}/markAsRead`);
                    }
                    if (operation === 'markAsUnread') {
                        const alertId = this.getNodeParameter('id', i);
                        responseData = await theHiveApiRequest.call(this, 'POST', `/alert/${alertId}/markAsUnread`);
                    }
                    if (operation === 'merge') {
                        const alertId = this.getNodeParameter('id', i);
                        const caseId = this.getNodeParameter('caseId', i);
                        responseData = await theHiveApiRequest.call(this, 'POST', `/alert/${alertId}/merge/${caseId}`, {});
                    }
                    if (operation === 'promote') {
                        const alertId = this.getNodeParameter('id', i);
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        const body = {};
                        Object.assign(body, additionalFields);
                        responseData = await theHiveApiRequest.call(this, 'POST', `/alert/${alertId}/createCase`, body);
                    }
                    if (operation === 'update') {
                        const alertId = this.getNodeParameter('id', i);
                        const jsonParameters = this.getNodeParameter('jsonParameters', i);
                        const updateFields = this.getNodeParameter('updateFields', i);
                        const customFields = await prepareCustomFields.call(this, updateFields, jsonParameters);
                        const artifactUi = updateFields.artifactUi;
                        delete updateFields.artifactUi;
                        const body = {
                            ...customFields,
                        };
                        Object.assign(body, updateFields);
                        if (artifactUi) {
                            const artifactValues = artifactUi.artifactValues;
                            if (artifactValues) {
                                const artifactData = [];
                                for (const artifactvalue of artifactValues) {
                                    const element = {};
                                    element.message = artifactvalue.message;
                                    element.tags = artifactvalue.tags.split(',');
                                    element.dataType = artifactvalue.dataType;
                                    element.data = artifactvalue.data;
                                    if (artifactvalue.dataType === 'file') {
                                        const binaryPropertyName = artifactvalue.binaryProperty;
                                        const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
                                        element.data = `${binaryData.fileName};${binaryData.mimeType};${binaryData.data}`;
                                    }
                                    artifactData.push(element);
                                }
                                body.artifacts = artifactData;
                            }
                        }
                        responseData = await theHiveApiRequest.call(this, 'PATCH', `/alert/${alertId}`, body);
                    }
                }
                if (resource === 'observable') {
                    if (operation === 'count') {
                        const countQueryAttributs = prepareOptional(this.getNodeParameter('filters', i, {}));
                        const _countSearchQuery = And();
                        for (const key of Object.keys(countQueryAttributs)) {
                            if (key === 'dataType' || key === 'tags') {
                                _countSearchQuery['_and'].push(In(key, countQueryAttributs[key]));
                            }
                            else if (key === 'description' || key === 'keywork' || key === 'message') {
                                _countSearchQuery['_and'].push(ContainsString(key, countQueryAttributs[key]));
                            }
                            else if (key === 'range') {
                                _countSearchQuery['_and'].push(Between('startDate', countQueryAttributs['range']['dateRange']['fromDate'], countQueryAttributs['range']['dateRange']['toDate']));
                            }
                            else {
                                _countSearchQuery['_and'].push(Eq(key, countQueryAttributs[key]));
                            }
                        }
                        const body = {
                            query: [
                                {
                                    _name: 'listObservable',
                                },
                                {
                                    _name: 'filter',
                                    _and: _countSearchQuery['_and'],
                                },
                            ],
                        };
                        body['query'].push({
                            _name: 'count',
                        });
                        qs.name = 'count-observables';
                        responseData = await theHiveApiRequest.call(this, 'POST', '/v1/query', body, qs);
                        responseData = { count: responseData };
                    }
                    if (operation === 'executeAnalyzer') {
                        const observableId = this.getNodeParameter('id', i);
                        const analyzers = parseAnalyzers(this.getNodeParameter('analyzers', i));
                        let response;
                        let body;
                        responseData = [];
                        for (const analyzer of analyzers) {
                            body = {
                                ...analyzer,
                                artifactId: observableId,
                            };
                            // execute the analyzer
                            response = await theHiveApiRequest.call(this, 'POST', '/connector/cortex/job', body, qs);
                            const jobId = response.id;
                            qs.name = 'observable-jobs';
                            // query the job result (including the report)
                            do {
                                responseData = await theHiveApiRequest.call(this, 'GET', `/connector/cortex/job/${jobId}`, body, qs);
                            } while (responseData.status === 'Waiting' || responseData.status === 'InProgress');
                        }
                    }
                    if (operation === 'executeResponder') {
                        const observableId = this.getNodeParameter('id', i);
                        const responderId = this.getNodeParameter('responder', i);
                        let body;
                        let response;
                        responseData = [];
                        body = {
                            responderId,
                            objectId: observableId,
                            objectType: 'case_artifact',
                        };
                        response = await theHiveApiRequest.call(this, 'POST', '/connector/cortex/action', body);
                        body = {
                            query: [
                                {
                                    _name: 'listAction',
                                },
                                {
                                    _name: 'filter',
                                    _and: [
                                        {
                                            _field: 'cortexId',
                                            _value: response.cortexId,
                                        },
                                        {
                                            _field: 'objectId',
                                            _value: response.objectId,
                                        },
                                        {
                                            _field: 'startDate',
                                            _value: response.startDate,
                                        },
                                    ],
                                },
                            ],
                        };
                        qs.name = 'log-actions';
                        do {
                            response = await theHiveApiRequest.call(this, 'POST', '/v1/query', body, qs);
                        } while (response.status === 'Waiting' || response.status === 'InProgress');
                        responseData = response;
                    }
                    if (operation === 'create') {
                        const caseId = this.getNodeParameter('caseId', i);
                        let body = {
                            dataType: this.getNodeParameter('dataType', i),
                            message: this.getNodeParameter('message', i),
                            startDate: Date.parse(this.getNodeParameter('startDate', i)),
                            tlp: this.getNodeParameter('tlp', i),
                            ioc: this.getNodeParameter('ioc', i),
                            sighted: this.getNodeParameter('sighted', i),
                            status: this.getNodeParameter('status', i),
                            ...prepareOptional(this.getNodeParameter('options', i, {})),
                        };
                        let options = {};
                        if (body.dataType === 'file') {
                            const binaryPropertyName = this.getNodeParameter('binaryProperty', i);
                            const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
                            const dataBuffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
                            options = {
                                formData: {
                                    attachment: {
                                        value: dataBuffer,
                                        options: {
                                            contentType: binaryData.mimeType,
                                            filename: binaryData.fileName,
                                        },
                                    },
                                    _json: JSON.stringify(body),
                                },
                            };
                            body = {};
                        }
                        else {
                            body.data = this.getNodeParameter('data', i);
                        }
                        responseData = await theHiveApiRequest.call(this, 'POST', `/case/${caseId}/artifact`, body, qs, '', options);
                    }
                    if (operation === 'get') {
                        const observableId = this.getNodeParameter('id', i);
                        const credentials = await this.getCredentials('theHiveApi');
                        const version = credentials.apiVersion;
                        let endpoint;
                        let method;
                        let body = {};
                        if (version === 'v1') {
                            endpoint = '/v1/query';
                            method = 'POST';
                            body = {
                                query: [
                                    {
                                        _name: 'getObservable',
                                        idOrName: observableId,
                                    },
                                ],
                            };
                            qs.name = `get-observable-${observableId}`;
                        }
                        else {
                            method = 'GET';
                            endpoint = `/case/artifact/${observableId}`;
                        }
                        responseData = await theHiveApiRequest.call(this, method, endpoint, body, qs);
                    }
                    if (operation === 'getAll') {
                        const credentials = await this.getCredentials('theHiveApi');
                        const returnAll = this.getNodeParameter('returnAll', i);
                        const version = credentials.apiVersion;
                        const options = this.getNodeParameter('options', i);
                        const caseId = this.getNodeParameter('caseId', i);
                        let endpoint;
                        let method;
                        let body = {};
                        let limit = undefined;
                        if (!returnAll) {
                            limit = this.getNodeParameter('limit', i);
                        }
                        if (version === 'v1') {
                            endpoint = '/v1/query';
                            method = 'POST';
                            body = {
                                query: [
                                    {
                                        _name: 'getCase',
                                        idOrName: caseId,
                                    },
                                    {
                                        _name: 'observables',
                                    },
                                ],
                            };
                            //@ts-ignore
                            prepareSortQuery(options.sort, body);
                            if (limit !== undefined) {
                                //@ts-ignore
                                prepareRangeQuery(`0-${limit}`, body);
                            }
                            qs.name = 'observables';
                        }
                        else {
                            method = 'POST';
                            endpoint = '/case/artifact/_search';
                            if (limit !== undefined) {
                                qs.range = `0-${limit}`;
                            }
                            body.query = Parent('case', Id(caseId));
                            Object.assign(qs, prepareOptional(options));
                        }
                        responseData = await theHiveApiRequest.call(this, method, endpoint, body, qs);
                    }
                    if (operation === 'search') {
                        const credentials = await this.getCredentials('theHiveApi');
                        const returnAll = this.getNodeParameter('returnAll', i);
                        const version = credentials.apiVersion;
                        const queryAttributs = prepareOptional(this.getNodeParameter('filters', i, {}));
                        const _searchQuery = And();
                        const options = this.getNodeParameter('options', i);
                        for (const key of Object.keys(queryAttributs)) {
                            if (key === 'dataType' || key === 'tags') {
                                _searchQuery['_and'].push(In(key, queryAttributs[key]));
                            }
                            else if (key === 'description' || key === 'keywork' || key === 'message') {
                                _searchQuery['_and'].push(ContainsString(key, queryAttributs[key]));
                            }
                            else if (key === 'range') {
                                _searchQuery['_and'].push(Between('startDate', queryAttributs['range']['dateRange']['fromDate'], queryAttributs['range']['dateRange']['toDate']));
                            }
                            else {
                                _searchQuery['_and'].push(Eq(key, queryAttributs[key]));
                            }
                        }
                        let endpoint;
                        let method;
                        let body = {};
                        let limit = undefined;
                        if (!returnAll) {
                            limit = this.getNodeParameter('limit', i);
                        }
                        if (version === 'v1') {
                            endpoint = '/v1/query';
                            method = 'POST';
                            body = {
                                query: [
                                    {
                                        _name: 'listObservable',
                                    },
                                    {
                                        _name: 'filter',
                                        _and: _searchQuery['_and'],
                                    },
                                ],
                            };
                            //@ts-ignore
                            prepareSortQuery(options.sort, body);
                            if (limit !== undefined) {
                                //@ts-ignore
                                prepareRangeQuery(`0-${limit}`, body);
                            }
                            qs.name = 'observables';
                        }
                        else {
                            method = 'POST';
                            endpoint = '/case/artifact/_search';
                            if (limit !== undefined) {
                                qs.range = `0-${limit}`;
                            }
                            body.query = _searchQuery;
                            Object.assign(qs, prepareOptional(options));
                        }
                        responseData = await theHiveApiRequest.call(this, method, endpoint, body, qs);
                    }
                    if (operation === 'update') {
                        const id = this.getNodeParameter('id', i);
                        const body = {
                            ...prepareOptional(this.getNodeParameter('updateFields', i, {})),
                        };
                        responseData = await theHiveApiRequest.call(this, 'PATCH', `/case/artifact/${id}`, body, qs);
                        responseData = { success: true };
                    }
                }
                if (resource === 'case') {
                    if (operation === 'count') {
                        const filters = this.getNodeParameter('filters', i, {});
                        const countQueryAttributs = prepareOptional(filters);
                        const _countSearchQuery = And();
                        if ('customFieldsUi' in filters) {
                            const customFields = (await prepareCustomFields.call(this, filters));
                            const searchQueries = buildCustomFieldSearch(customFields);
                            _countSearchQuery['_and'].push(...searchQueries);
                        }
                        for (const key of Object.keys(countQueryAttributs)) {
                            if (key === 'tags') {
                                _countSearchQuery['_and'].push(In(key, countQueryAttributs[key]));
                            }
                            else if (key === 'description' || key === 'summary' || key === 'title') {
                                _countSearchQuery['_and'].push(ContainsString(key, countQueryAttributs[key]));
                            }
                            else {
                                _countSearchQuery['_and'].push(Eq(key, countQueryAttributs[key]));
                            }
                        }
                        const body = {
                            query: [
                                {
                                    _name: 'listCase',
                                },
                                {
                                    _name: 'filter',
                                    _and: _countSearchQuery['_and'],
                                },
                            ],
                        };
                        body['query'].push({
                            _name: 'count',
                        });
                        qs.name = 'count-cases';
                        responseData = await theHiveApiRequest.call(this, 'POST', '/v1/query', body, qs);
                        responseData = { count: responseData };
                    }
                    if (operation === 'executeResponder') {
                        const caseId = this.getNodeParameter('id', i);
                        const responderId = this.getNodeParameter('responder', i);
                        let body;
                        let response;
                        responseData = [];
                        body = {
                            responderId,
                            objectId: caseId,
                            objectType: 'case',
                        };
                        response = await theHiveApiRequest.call(this, 'POST', '/connector/cortex/action', body);
                        body = {
                            query: [
                                {
                                    _name: 'listAction',
                                },
                                {
                                    _name: 'filter',
                                    _and: [
                                        {
                                            _field: 'cortexId',
                                            _value: response.cortexId,
                                        },
                                        {
                                            _field: 'objectId',
                                            _value: response.objectId,
                                        },
                                        {
                                            _field: 'startDate',
                                            _value: response.startDate,
                                        },
                                    ],
                                },
                            ],
                        };
                        qs.name = 'log-actions';
                        do {
                            response = await theHiveApiRequest.call(this, 'POST', '/v1/query', body, qs);
                        } while (response.status === 'Waiting' || response.status === 'InProgress');
                        responseData = response;
                    }
                    if (operation === 'create') {
                        const options = this.getNodeParameter('options', i, {});
                        const jsonParameters = this.getNodeParameter('jsonParameters', i);
                        const customFields = await prepareCustomFields.call(this, options, jsonParameters);
                        const body = {
                            title: this.getNodeParameter('title', i),
                            description: this.getNodeParameter('description', i),
                            severity: this.getNodeParameter('severity', i),
                            startDate: Date.parse(this.getNodeParameter('startDate', i)),
                            owner: this.getNodeParameter('owner', i),
                            flag: this.getNodeParameter('flag', i),
                            tlp: this.getNodeParameter('tlp', i),
                            tags: splitTags(this.getNodeParameter('tags', i)),
                            ...prepareOptional(options),
                        };
                        if (customFields) {
                            Object.keys(customFields).forEach((key) => {
                                set(body, key, customFields[key]);
                            });
                        }
                        responseData = await theHiveApiRequest.call(this, 'POST', '/case', body);
                    }
                    if (operation === 'get') {
                        const caseId = this.getNodeParameter('id', i);
                        const credentials = await this.getCredentials('theHiveApi');
                        const version = credentials.apiVersion;
                        let endpoint;
                        let method;
                        let body = {};
                        if (version === 'v1') {
                            endpoint = '/v1/query';
                            method = 'POST';
                            body = {
                                query: [
                                    {
                                        _name: 'getCase',
                                        idOrName: caseId,
                                    },
                                ],
                            };
                            qs.name = `get-case-${caseId}`;
                        }
                        else {
                            method = 'GET';
                            endpoint = `/case/${caseId}`;
                        }
                        responseData = await theHiveApiRequest.call(this, method, endpoint, body, qs);
                    }
                    if (operation === 'getAll') {
                        const credentials = await this.getCredentials('theHiveApi');
                        const returnAll = this.getNodeParameter('returnAll', i);
                        const version = credentials.apiVersion;
                        const filters = this.getNodeParameter('filters', i, {});
                        const queryAttributs = prepareOptional(filters);
                        const _searchQuery = And();
                        const options = this.getNodeParameter('options', i);
                        if ('customFieldsUi' in filters) {
                            const customFields = (await prepareCustomFields.call(this, filters));
                            const searchQueries = buildCustomFieldSearch(customFields);
                            _searchQuery['_and'].push(...searchQueries);
                        }
                        for (const key of Object.keys(queryAttributs)) {
                            if (key === 'tags') {
                                _searchQuery['_and'].push(In(key, queryAttributs[key]));
                            }
                            else if (key === 'description' || key === 'summary' || key === 'title') {
                                _searchQuery['_and'].push(ContainsString(key, queryAttributs[key]));
                            }
                            else {
                                _searchQuery['_and'].push(Eq(key, queryAttributs[key]));
                            }
                        }
                        let endpoint;
                        let method;
                        let body = {};
                        let limit = undefined;
                        if (!returnAll) {
                            limit = this.getNodeParameter('limit', i);
                        }
                        if (version === 'v1') {
                            endpoint = '/v1/query';
                            method = 'POST';
                            body = {
                                query: [
                                    {
                                        _name: 'listCase',
                                    },
                                    {
                                        _name: 'filter',
                                        _and: _searchQuery['_and'],
                                    },
                                ],
                            };
                            //@ts-ignore
                            prepareSortQuery(options.sort, body);
                            if (limit !== undefined) {
                                //@ts-ignore
                                prepareRangeQuery(`0-${limit}`, body);
                            }
                            qs.name = 'cases';
                        }
                        else {
                            method = 'POST';
                            endpoint = '/case/_search';
                            if (limit !== undefined) {
                                qs.range = `0-${limit}`;
                            }
                            body.query = _searchQuery;
                            Object.assign(qs, prepareOptional(options));
                        }
                        responseData = await theHiveApiRequest.call(this, method, endpoint, body, qs);
                    }
                    if (operation === 'update') {
                        const id = this.getNodeParameter('id', i);
                        const updateFields = this.getNodeParameter('updateFields', i, {});
                        const jsonParameters = this.getNodeParameter('jsonParameters', i);
                        const customFields = await prepareCustomFields.call(this, updateFields, jsonParameters);
                        const body = {
                            ...customFields,
                            ...prepareOptional(updateFields),
                        };
                        responseData = await theHiveApiRequest.call(this, 'PATCH', `/case/${id}`, body);
                    }
                }
                if (resource === 'task') {
                    if (operation === 'count') {
                        const countQueryAttributs = prepareOptional(this.getNodeParameter('filters', i, {}));
                        const _countSearchQuery = And();
                        for (const key of Object.keys(countQueryAttributs)) {
                            if (key === 'title' || key === 'description') {
                                _countSearchQuery['_and'].push(ContainsString(key, countQueryAttributs[key]));
                            }
                            else {
                                _countSearchQuery['_and'].push(Eq(key, countQueryAttributs[key]));
                            }
                        }
                        const body = {
                            query: [
                                {
                                    _name: 'listTask',
                                },
                                {
                                    _name: 'filter',
                                    _and: _countSearchQuery['_and'],
                                },
                            ],
                        };
                        body['query'].push({
                            _name: 'count',
                        });
                        qs.name = 'count-tasks';
                        responseData = await theHiveApiRequest.call(this, 'POST', '/v1/query', body, qs);
                        responseData = { count: responseData };
                    }
                    if (operation === 'create') {
                        const caseId = this.getNodeParameter('caseId', i);
                        const body = {
                            title: this.getNodeParameter('title', i),
                            status: this.getNodeParameter('status', i),
                            flag: this.getNodeParameter('flag', i),
                            ...prepareOptional(this.getNodeParameter('options', i, {})),
                        };
                        responseData = await theHiveApiRequest.call(this, 'POST', `/case/${caseId}/task`, body);
                    }
                    if (operation === 'executeResponder') {
                        const taskId = this.getNodeParameter('id', i);
                        const responderId = this.getNodeParameter('responder', i);
                        let body;
                        let response;
                        responseData = [];
                        body = {
                            responderId,
                            objectId: taskId,
                            objectType: 'case_task',
                        };
                        response = await theHiveApiRequest.call(this, 'POST', '/connector/cortex/action', body);
                        body = {
                            query: [
                                {
                                    _name: 'listAction',
                                },
                                {
                                    _name: 'filter',
                                    _and: [
                                        {
                                            _field: 'cortexId',
                                            _value: response.cortexId,
                                        },
                                        {
                                            _field: 'objectId',
                                            _value: response.objectId,
                                        },
                                        {
                                            _field: 'startDate',
                                            _value: response.startDate,
                                        },
                                    ],
                                },
                            ],
                        };
                        qs.name = 'task-actions';
                        do {
                            response = await theHiveApiRequest.call(this, 'POST', '/v1/query', body, qs);
                        } while (response.status === 'Waiting' || response.status === 'InProgress');
                        responseData = response;
                    }
                    if (operation === 'get') {
                        const taskId = this.getNodeParameter('id', i);
                        const credentials = await this.getCredentials('theHiveApi');
                        const version = credentials.apiVersion;
                        let endpoint;
                        let method;
                        let body = {};
                        if (version === 'v1') {
                            endpoint = '/v1/query';
                            method = 'POST';
                            body = {
                                query: [
                                    {
                                        _name: 'getTask',
                                        idOrName: taskId,
                                    },
                                ],
                            };
                            qs.name = `get-task-${taskId}`;
                        }
                        else {
                            method = 'GET';
                            endpoint = `/case/task/${taskId}`;
                        }
                        responseData = await theHiveApiRequest.call(this, method, endpoint, body, qs);
                    }
                    if (operation === 'getAll') {
                        // get all require a case id (it retursn all tasks for a specific case)
                        const credentials = await this.getCredentials('theHiveApi');
                        const returnAll = this.getNodeParameter('returnAll', i);
                        const version = credentials.apiVersion;
                        const caseId = this.getNodeParameter('caseId', i);
                        const options = this.getNodeParameter('options', i);
                        let endpoint;
                        let method;
                        let body = {};
                        let limit = undefined;
                        if (!returnAll) {
                            limit = this.getNodeParameter('limit', i);
                        }
                        if (version === 'v1') {
                            endpoint = '/v1/query';
                            method = 'POST';
                            body = {
                                query: [
                                    {
                                        _name: 'getCase',
                                        idOrName: caseId,
                                    },
                                    {
                                        _name: 'tasks',
                                    },
                                ],
                            };
                            //@ts-ignore
                            prepareSortQuery(options.sort, body);
                            if (limit !== undefined) {
                                //@ts-ignore
                                prepareRangeQuery(`0-${limit}`, body);
                            }
                            qs.name = 'case-tasks';
                        }
                        else {
                            method = 'POST';
                            endpoint = '/case/task/_search';
                            if (limit !== undefined) {
                                qs.range = `0-${limit}`;
                            }
                            body.query = And(Parent('case', Id(caseId)));
                            Object.assign(qs, prepareOptional(options));
                        }
                        responseData = await theHiveApiRequest.call(this, method, endpoint, body, qs);
                    }
                    if (operation === 'search') {
                        const credentials = await this.getCredentials('theHiveApi');
                        const returnAll = this.getNodeParameter('returnAll', i);
                        const version = credentials.apiVersion;
                        const queryAttributs = prepareOptional(this.getNodeParameter('filters', i, {}));
                        const _searchQuery = And();
                        const options = this.getNodeParameter('options', i);
                        for (const key of Object.keys(queryAttributs)) {
                            if (key === 'title' || key === 'description') {
                                _searchQuery['_and'].push(ContainsString(key, queryAttributs[key]));
                            }
                            else {
                                _searchQuery['_and'].push(Eq(key, queryAttributs[key]));
                            }
                        }
                        let endpoint;
                        let method;
                        let body = {};
                        let limit = undefined;
                        if (!returnAll) {
                            limit = this.getNodeParameter('limit', i);
                        }
                        if (version === 'v1') {
                            endpoint = '/v1/query';
                            method = 'POST';
                            body = {
                                query: [
                                    {
                                        _name: 'listTask',
                                    },
                                    {
                                        _name: 'filter',
                                        _and: _searchQuery['_and'],
                                    },
                                ],
                            };
                            //@ts-ignore
                            prepareSortQuery(options.sort, body);
                            if (limit !== undefined) {
                                //@ts-ignore
                                prepareRangeQuery(`0-${limit}`, body);
                            }
                            qs.name = 'tasks';
                        }
                        else {
                            method = 'POST';
                            endpoint = '/case/task/_search';
                            if (limit !== undefined) {
                                qs.range = `0-${limit}`;
                            }
                            body.query = _searchQuery;
                            Object.assign(qs, prepareOptional(options));
                        }
                        responseData = await theHiveApiRequest.call(this, method, endpoint, body, qs);
                    }
                    if (operation === 'update') {
                        const id = this.getNodeParameter('id', i);
                        const body = {
                            ...prepareOptional(this.getNodeParameter('updateFields', i, {})),
                        };
                        responseData = await theHiveApiRequest.call(this, 'PATCH', `/case/task/${id}`, body);
                    }
                }
                if (resource === 'log') {
                    if (operation === 'create') {
                        const taskId = this.getNodeParameter('taskId', i);
                        let body = {
                            message: this.getNodeParameter('message', i),
                            startDate: Date.parse(this.getNodeParameter('startDate', i)),
                            status: this.getNodeParameter('status', i),
                        };
                        const optionals = this.getNodeParameter('options', i);
                        let options = {};
                        if (optionals.attachementUi) {
                            const attachmentValues = optionals.attachementUi
                                .attachmentValues;
                            if (attachmentValues) {
                                const binaryPropertyName = attachmentValues.binaryProperty;
                                const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
                                const dataBuffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
                                options = {
                                    formData: {
                                        attachment: {
                                            value: dataBuffer,
                                            options: {
                                                contentType: binaryData.mimeType,
                                                filename: binaryData.fileName,
                                            },
                                        },
                                        _json: JSON.stringify(body),
                                    },
                                };
                                body = {};
                            }
                        }
                        responseData = await theHiveApiRequest.call(this, 'POST', `/case/task/${taskId}/log`, body, qs, '', options);
                    }
                    if (operation === 'executeResponder') {
                        const logId = this.getNodeParameter('id', i);
                        const responderId = this.getNodeParameter('responder', i);
                        let body;
                        let response;
                        responseData = [];
                        body = {
                            responderId,
                            objectId: logId,
                            objectType: 'case_task_log',
                        };
                        response = await theHiveApiRequest.call(this, 'POST', '/connector/cortex/action', body);
                        body = {
                            query: [
                                {
                                    _name: 'listAction',
                                },
                                {
                                    _name: 'filter',
                                    _and: [
                                        {
                                            _field: 'cortexId',
                                            _value: response.cortexId,
                                        },
                                        {
                                            _field: 'objectId',
                                            _value: response.objectId,
                                        },
                                        {
                                            _field: 'startDate',
                                            _value: response.startDate,
                                        },
                                    ],
                                },
                            ],
                        };
                        qs.name = 'log-actions';
                        do {
                            response = await theHiveApiRequest.call(this, 'POST', '/v1/query', body, qs);
                        } while (response.status === 'Waiting' || response.status === 'InProgress');
                        responseData = response;
                    }
                    if (operation === 'get') {
                        const logId = this.getNodeParameter('id', i);
                        const credentials = await this.getCredentials('theHiveApi');
                        const version = credentials.apiVersion;
                        let endpoint;
                        let method;
                        let body = {};
                        if (version === 'v1') {
                            endpoint = '/v1/query';
                            method = 'POST';
                            body = {
                                query: [
                                    {
                                        _name: 'getLog',
                                        idOrName: logId,
                                    },
                                ],
                            };
                            qs.name = `get-log-${logId}`;
                        }
                        else {
                            method = 'POST';
                            endpoint = '/case/task/log/_search';
                            body.query = { _id: logId };
                        }
                        responseData = await theHiveApiRequest.call(this, method, endpoint, body, qs);
                    }
                    if (operation === 'getAll') {
                        const credentials = await this.getCredentials('theHiveApi');
                        const returnAll = this.getNodeParameter('returnAll', i);
                        const version = credentials.apiVersion;
                        const taskId = this.getNodeParameter('taskId', i);
                        let endpoint;
                        let method;
                        let body = {};
                        let limit = undefined;
                        if (!returnAll) {
                            limit = this.getNodeParameter('limit', i);
                        }
                        if (version === 'v1') {
                            endpoint = '/v1/query';
                            method = 'POST';
                            body = {
                                query: [
                                    {
                                        _name: 'getTask',
                                        idOrName: taskId,
                                    },
                                    {
                                        _name: 'logs',
                                    },
                                ],
                            };
                            if (limit !== undefined) {
                                //@ts-ignore
                                prepareRangeQuery(`0-${limit}`, body);
                            }
                            qs.name = 'case-task-logs';
                        }
                        else {
                            method = 'POST';
                            endpoint = '/case/task/log/_search';
                            if (limit !== undefined) {
                                qs.range = `0-${limit}`;
                            }
                            body.query = And(Parent('task', Id(taskId)));
                        }
                        responseData = await theHiveApiRequest.call(this, method, endpoint, body, qs);
                    }
                }
                const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: i } });
                returnData.push(...executionData);
            }
            catch (error) {
                if (this.continueOnFail()) {
                    const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray({ error: error.message }), { itemData: { item: i } });
                    returnData.push(...executionData);
                    continue;
                }
                throw error;
            }
        }
        return [returnData];
    }
}
//# sourceMappingURL=TheHive.node.js.map