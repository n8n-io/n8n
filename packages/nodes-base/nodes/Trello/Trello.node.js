import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { attachmentFields, attachmentOperations } from './AttachmentDescription';
import { boardFields, boardOperations } from './BoardDescription';
import { boardMemberFields, boardMemberOperations } from './BoardMemberDescription';
import { cardCommentFields, cardCommentOperations } from './CardCommentDescription';
import { cardFields, cardOperations } from './CardDescription';
import { checklistFields, checklistOperations } from './ChecklistDescription';
import { apiRequest, apiRequestAllItems } from './GenericFunctions';
import { labelFields, labelOperations } from './LabelDescription';
import { listFields, listOperations } from './ListDescription';
export class Trello {
    description = {
        displayName: 'Trello',
        name: 'trello',
        icon: 'file:trello.svg',
        group: ['transform'],
        version: 1,
        subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
        description: 'Create, change and delete boards and cards',
        defaults: {
            name: 'Trello',
        },
        usableAsTool: true,
        inputs: [NodeConnectionTypes.Main],
        outputs: [NodeConnectionTypes.Main],
        credentials: [
            {
                name: 'trelloApi',
                required: true,
                displayOptions: { show: { authentication: ['apiKey'] } },
            },
            {
                name: 'trelloOAuth1Api',
                required: true,
                displayOptions: { show: { authentication: ['oAuth1'] } },
            },
        ],
        properties: [
            {
                displayName: 'Authentication',
                name: 'authentication',
                type: 'options',
                options: [
                    { name: 'API Key', value: 'apiKey' },
                    { name: 'OAuth1', value: 'oAuth1' },
                ],
                default: 'apiKey',
            },
            {
                displayName: 'Resource',
                name: 'resource',
                type: 'options',
                noDataExpression: true,
                options: [
                    {
                        name: 'Attachment',
                        value: 'attachment',
                    },
                    {
                        name: 'Board',
                        value: 'board',
                    },
                    {
                        name: 'Board Member',
                        value: 'boardMember',
                    },
                    {
                        name: 'Card',
                        value: 'card',
                    },
                    {
                        name: 'Card Comment',
                        value: 'cardComment',
                    },
                    {
                        name: 'Checklist',
                        value: 'checklist',
                    },
                    {
                        name: 'Label',
                        value: 'label',
                    },
                    {
                        name: 'List',
                        value: 'list',
                    },
                ],
                default: 'card',
            },
            // ----------------------------------
            //         operations
            // ----------------------------------
            ...attachmentOperations,
            ...boardOperations,
            ...boardMemberOperations,
            ...cardOperations,
            ...cardCommentOperations,
            ...checklistOperations,
            ...labelOperations,
            ...listOperations,
            // ----------------------------------
            //         fields
            // ----------------------------------
            ...attachmentFields,
            ...boardFields,
            ...boardMemberFields,
            ...cardFields,
            ...cardCommentFields,
            ...checklistFields,
            ...labelFields,
            ...listFields,
        ],
    };
    methods = {
        listSearch: {
            async searchBoards(query) {
                if (!query) {
                    throw new NodeOperationError(this.getNode(), 'Query required for Trello search');
                }
                const searchResults = await apiRequest.call(this, 'GET', 'search', {}, {
                    query,
                    modelTypes: 'boards',
                    board_fields: 'name,url,desc',
                    // Enables partial word searching, only for the start of words though
                    partial: true,
                    // Seems like a good number since it isn't paginated. Default is 10.
                    boards_limit: 50,
                });
                return {
                    results: searchResults.boards.map((b) => ({
                        name: b.name,
                        value: b.id,
                        url: b.url,
                        description: b.desc,
                    })),
                };
            },
            async searchCards(query) {
                if (!query) {
                    throw new NodeOperationError(this.getNode(), 'Query required for Trello search');
                }
                const searchResults = await apiRequest.call(this, 'GET', 'search', {}, {
                    query,
                    modelTypes: 'cards',
                    board_fields: 'name,url,desc',
                    // Enables partial word searching, only for the start of words though
                    partial: true,
                    // Seems like a good number since it isn't paginated. Default is 10.
                    cards_limit: 50,
                });
                return {
                    results: searchResults.cards.map((b) => ({
                        name: b.name,
                        value: b.id,
                        url: b.url,
                        description: b.desc,
                    })),
                };
            },
        },
    };
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        const operation = this.getNodeParameter('operation', 0);
        const resource = this.getNodeParameter('resource', 0);
        // For Post
        let body;
        // For Query string
        let qs;
        let requestMethod;
        let endpoint;
        let returnAll = false;
        let responseData;
        for (let i = 0; i < items.length; i++) {
            try {
                requestMethod = 'GET';
                endpoint = '';
                body = {};
                qs = {};
                if (resource === 'board') {
                    if (operation === 'create') {
                        // ----------------------------------
                        //         create
                        // ----------------------------------
                        requestMethod = 'POST';
                        endpoint = 'boards';
                        body.name = this.getNodeParameter('name', i);
                        body.desc = this.getNodeParameter('description', i);
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        Object.assign(body, additionalFields);
                    }
                    else if (operation === 'delete') {
                        // ----------------------------------
                        //         delete
                        // ----------------------------------
                        requestMethod = 'DELETE';
                        const id = this.getNodeParameter('id', i, undefined, {
                            extractValue: true,
                        });
                        endpoint = `boards/${id}`;
                    }
                    else if (operation === 'get') {
                        // ----------------------------------
                        //         get
                        // ----------------------------------
                        requestMethod = 'GET';
                        const id = this.getNodeParameter('id', i, undefined, { extractValue: true });
                        endpoint = `boards/${id}`;
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        Object.assign(qs, additionalFields);
                    }
                    else if (operation === 'update') {
                        // ----------------------------------
                        //         update
                        // ----------------------------------
                        requestMethod = 'PUT';
                        const id = this.getNodeParameter('id', i, undefined, { extractValue: true });
                        endpoint = `boards/${id}`;
                        const updateFields = this.getNodeParameter('updateFields', i);
                        Object.assign(qs, updateFields);
                    }
                    else {
                        throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not known!`, { itemIndex: i });
                    }
                }
                else if (resource === 'boardMember') {
                    if (operation === 'getAll') {
                        // ----------------------------------
                        //         getAll
                        // ----------------------------------
                        requestMethod = 'GET';
                        const id = this.getNodeParameter('id', i);
                        returnAll = this.getNodeParameter('returnAll', i);
                        if (!returnAll) {
                            qs.limit = this.getNodeParameter('limit', i);
                        }
                        endpoint = `boards/${id}/members`;
                    }
                    else if (operation === 'add') {
                        // ----------------------------------
                        //               add
                        // ----------------------------------
                        requestMethod = 'PUT';
                        const id = this.getNodeParameter('id', i);
                        const idMember = this.getNodeParameter('idMember', i);
                        endpoint = `boards/${id}/members/${idMember}`;
                        qs.type = this.getNodeParameter('type', i);
                        qs.allowBillableGuest = this.getNodeParameter('additionalFields.allowBillableGuest', i, false);
                    }
                    else if (operation === 'invite') {
                        // ----------------------------------
                        //              invite
                        // ----------------------------------
                        requestMethod = 'PUT';
                        const id = this.getNodeParameter('id', i);
                        endpoint = `boards/${id}/members`;
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        qs.email = this.getNodeParameter('email', i);
                        qs.type = additionalFields.type;
                        body.fullName = additionalFields.fullName;
                    }
                    else if (operation === 'remove') {
                        // ----------------------------------
                        //              remove
                        // ----------------------------------
                        requestMethod = 'DELETE';
                        const id = this.getNodeParameter('id', i);
                        const idMember = this.getNodeParameter('idMember', i);
                        endpoint = `boards/${id}/members/${idMember}`;
                    }
                    else {
                        throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not known!`, { itemIndex: i });
                    }
                }
                else if (resource === 'card') {
                    if (operation === 'create') {
                        // ----------------------------------
                        //         create
                        // ----------------------------------
                        requestMethod = 'POST';
                        endpoint = 'cards';
                        body.idList = this.getNodeParameter('listId', i);
                        body.name = this.getNodeParameter('name', i);
                        body.desc = this.getNodeParameter('description', i);
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        Object.assign(body, additionalFields);
                    }
                    else if (operation === 'delete') {
                        // ----------------------------------
                        //         delete
                        // ----------------------------------
                        requestMethod = 'DELETE';
                        const id = this.getNodeParameter('id', i, undefined, { extractValue: true });
                        endpoint = `cards/${id}`;
                    }
                    else if (operation === 'get') {
                        // ----------------------------------
                        //         get
                        // ----------------------------------
                        requestMethod = 'GET';
                        const id = this.getNodeParameter('id', i, undefined, { extractValue: true });
                        endpoint = `cards/${id}`;
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        Object.assign(qs, additionalFields);
                    }
                    else if (operation === 'update') {
                        // ----------------------------------
                        //         update
                        // ----------------------------------
                        requestMethod = 'PUT';
                        const id = this.getNodeParameter('id', i, undefined, { extractValue: true });
                        endpoint = `cards/${id}`;
                        const updateFields = this.getNodeParameter('updateFields', i);
                        Object.assign(qs, updateFields);
                    }
                    else {
                        throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not known!`, { itemIndex: i });
                    }
                }
                else if (resource === 'cardComment') {
                    if (operation === 'create') {
                        // ----------------------------------
                        //         create
                        // ----------------------------------
                        const cardId = this.getNodeParameter('cardId', i, undefined, {
                            extractValue: true,
                        });
                        body.text = this.getNodeParameter('text', i);
                        requestMethod = 'POST';
                        endpoint = `cards/${cardId}/actions/comments`;
                    }
                    else if (operation === 'delete') {
                        // ----------------------------------
                        //         delete
                        // ----------------------------------
                        requestMethod = 'DELETE';
                        const cardId = this.getNodeParameter('cardId', i, undefined, {
                            extractValue: true,
                        });
                        const commentId = this.getNodeParameter('commentId', i);
                        endpoint = `/cards/${cardId}/actions/${commentId}/comments`;
                    }
                    else if (operation === 'update') {
                        // ----------------------------------
                        //         update
                        // ----------------------------------
                        requestMethod = 'PUT';
                        const cardId = this.getNodeParameter('cardId', i, undefined, {
                            extractValue: true,
                        });
                        const commentId = this.getNodeParameter('commentId', i);
                        qs.text = this.getNodeParameter('text', i);
                        endpoint = `cards/${cardId}/actions/${commentId}/comments`;
                    }
                    else {
                        throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not known!`, { itemIndex: i });
                    }
                }
                else if (resource === 'list') {
                    if (operation === 'archive') {
                        // ----------------------------------
                        //         archive
                        // ----------------------------------
                        requestMethod = 'PUT';
                        const id = this.getNodeParameter('id', i);
                        qs.value = this.getNodeParameter('archive', i);
                        endpoint = `lists/${id}/closed`;
                    }
                    else if (operation === 'create') {
                        // ----------------------------------
                        //         create
                        // ----------------------------------
                        requestMethod = 'POST';
                        endpoint = 'lists';
                        body.idBoard = this.getNodeParameter('idBoard', i);
                        body.name = this.getNodeParameter('name', i);
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        Object.assign(body, additionalFields);
                    }
                    else if (operation === 'get') {
                        // ----------------------------------
                        //         get
                        // ----------------------------------
                        requestMethod = 'GET';
                        const id = this.getNodeParameter('id', i);
                        endpoint = `lists/${id}`;
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        Object.assign(qs, additionalFields);
                    }
                    else if (operation === 'getAll') {
                        // ----------------------------------
                        //         getAll
                        // ----------------------------------
                        requestMethod = 'GET';
                        returnAll = this.getNodeParameter('returnAll', i);
                        if (!returnAll) {
                            qs.limit = this.getNodeParameter('limit', i);
                        }
                        const id = this.getNodeParameter('id', i);
                        endpoint = `boards/${id}/lists`;
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        Object.assign(qs, additionalFields);
                    }
                    else if (operation === 'getCards') {
                        // ----------------------------------
                        //         getCards
                        // ----------------------------------
                        requestMethod = 'GET';
                        returnAll = this.getNodeParameter('returnAll', i);
                        if (!returnAll) {
                            qs.limit = this.getNodeParameter('limit', i);
                        }
                        const id = this.getNodeParameter('id', i);
                        endpoint = `lists/${id}/cards`;
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        Object.assign(qs, additionalFields);
                    }
                    else if (operation === 'update') {
                        // ----------------------------------
                        //         update
                        // ----------------------------------
                        requestMethod = 'PUT';
                        const id = this.getNodeParameter('id', i);
                        endpoint = `lists/${id}`;
                        const updateFields = this.getNodeParameter('updateFields', i);
                        Object.assign(qs, updateFields);
                    }
                    else {
                        throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not known!`, { itemIndex: i });
                    }
                }
                else if (resource === 'attachment') {
                    if (operation === 'create') {
                        // ----------------------------------
                        //         create
                        // ----------------------------------
                        requestMethod = 'POST';
                        const cardId = this.getNodeParameter('cardId', i, undefined, {
                            extractValue: true,
                        });
                        const url = this.getNodeParameter('url', i);
                        Object.assign(body, {
                            url,
                        });
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        Object.assign(body, additionalFields);
                        endpoint = `cards/${cardId}/attachments`;
                    }
                    else if (operation === 'delete') {
                        // ----------------------------------
                        //         delete
                        // ----------------------------------
                        requestMethod = 'DELETE';
                        const cardId = this.getNodeParameter('cardId', i, undefined, {
                            extractValue: true,
                        });
                        const id = this.getNodeParameter('id', i);
                        endpoint = `cards/${cardId}/attachments/${id}`;
                    }
                    else if (operation === 'get') {
                        // ----------------------------------
                        //         get
                        // ----------------------------------
                        requestMethod = 'GET';
                        const cardId = this.getNodeParameter('cardId', i, undefined, {
                            extractValue: true,
                        });
                        const id = this.getNodeParameter('id', i);
                        endpoint = `cards/${cardId}/attachments/${id}`;
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        Object.assign(qs, additionalFields);
                    }
                    else if (operation === 'getAll') {
                        // ----------------------------------
                        //         getAll
                        // ----------------------------------
                        requestMethod = 'GET';
                        const cardId = this.getNodeParameter('cardId', i, undefined, {
                            extractValue: true,
                        });
                        endpoint = `cards/${cardId}/attachments`;
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        Object.assign(qs, additionalFields);
                    }
                    else {
                        throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not known!`, { itemIndex: i });
                    }
                }
                else if (resource === 'checklist') {
                    if (operation === 'create') {
                        // ----------------------------------
                        //         create
                        // ----------------------------------
                        requestMethod = 'POST';
                        const cardId = this.getNodeParameter('cardId', i, undefined, {
                            extractValue: true,
                        });
                        const name = this.getNodeParameter('name', i);
                        Object.assign(body, { name });
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        Object.assign(body, additionalFields);
                        endpoint = `cards/${cardId}/checklists`;
                    }
                    else if (operation === 'delete') {
                        // ----------------------------------
                        //         delete
                        // ----------------------------------
                        requestMethod = 'DELETE';
                        const cardId = this.getNodeParameter('cardId', i, undefined, {
                            extractValue: true,
                        });
                        const id = this.getNodeParameter('id', i);
                        endpoint = `cards/${cardId}/checklists/${id}`;
                    }
                    else if (operation === 'get') {
                        // ----------------------------------
                        //         get
                        // ----------------------------------
                        requestMethod = 'GET';
                        const id = this.getNodeParameter('id', i);
                        endpoint = `checklists/${id}`;
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        Object.assign(qs, additionalFields);
                    }
                    else if (operation === 'getAll') {
                        // ----------------------------------
                        //         getAll
                        // ----------------------------------
                        requestMethod = 'GET';
                        const cardId = this.getNodeParameter('cardId', i, undefined, {
                            extractValue: true,
                        });
                        endpoint = `cards/${cardId}/checklists`;
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        Object.assign(qs, additionalFields);
                    }
                    else if (operation === 'getCheckItem') {
                        // ----------------------------------
                        //         getCheckItem
                        // ----------------------------------
                        requestMethod = 'GET';
                        const cardId = this.getNodeParameter('cardId', i, undefined, {
                            extractValue: true,
                        });
                        const checkItemId = this.getNodeParameter('checkItemId', i);
                        endpoint = `cards/${cardId}/checkItem/${checkItemId}`;
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        Object.assign(qs, additionalFields);
                    }
                    else if (operation === 'createCheckItem') {
                        // ----------------------------------
                        //         createCheckItem
                        // ----------------------------------
                        requestMethod = 'POST';
                        const checklistId = this.getNodeParameter('checklistId', i);
                        endpoint = `checklists/${checklistId}/checkItems`;
                        const name = this.getNodeParameter('name', i);
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        Object.assign(body, { name, ...additionalFields });
                    }
                    else if (operation === 'deleteCheckItem') {
                        // ----------------------------------
                        //         deleteCheckItem
                        // ----------------------------------
                        requestMethod = 'DELETE';
                        const cardId = this.getNodeParameter('cardId', i, undefined, {
                            extractValue: true,
                        });
                        const checkItemId = this.getNodeParameter('checkItemId', i);
                        endpoint = `cards/${cardId}/checkItem/${checkItemId}`;
                    }
                    else if (operation === 'updateCheckItem') {
                        // ----------------------------------
                        //         updateCheckItem
                        // ----------------------------------
                        requestMethod = 'PUT';
                        const cardId = this.getNodeParameter('cardId', i, undefined, {
                            extractValue: true,
                        });
                        const checkItemId = this.getNodeParameter('checkItemId', i);
                        endpoint = `cards/${cardId}/checkItem/${checkItemId}`;
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        Object.assign(qs, additionalFields);
                    }
                    else if (operation === 'completedCheckItems') {
                        // ----------------------------------
                        //         completedCheckItems
                        // ----------------------------------
                        requestMethod = 'GET';
                        const cardId = this.getNodeParameter('cardId', i, undefined, {
                            extractValue: true,
                        });
                        endpoint = `cards/${cardId}/checkItemStates`;
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        Object.assign(qs, additionalFields);
                    }
                    else {
                        throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not known!`, { itemIndex: i });
                    }
                }
                else if (resource === 'label') {
                    if (operation === 'create') {
                        // ----------------------------------
                        //         create
                        // ----------------------------------
                        requestMethod = 'POST';
                        const idBoard = this.getNodeParameter('boardId', i, undefined, {
                            extractValue: true,
                        });
                        const name = this.getNodeParameter('name', i);
                        const color = this.getNodeParameter('color', i);
                        Object.assign(body, {
                            idBoard,
                            name,
                            color,
                        });
                        endpoint = 'labels';
                    }
                    else if (operation === 'delete') {
                        // ----------------------------------
                        //         delete
                        // ----------------------------------
                        requestMethod = 'DELETE';
                        const id = this.getNodeParameter('id', i);
                        endpoint = `labels/${id}`;
                    }
                    else if (operation === 'get') {
                        // ----------------------------------
                        //         get
                        // ----------------------------------
                        requestMethod = 'GET';
                        const id = this.getNodeParameter('id', i);
                        endpoint = `labels/${id}`;
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        Object.assign(qs, additionalFields);
                    }
                    else if (operation === 'getAll') {
                        // ----------------------------------
                        //         getAll
                        // ----------------------------------
                        requestMethod = 'GET';
                        const idBoard = this.getNodeParameter('boardId', i, undefined, {
                            extractValue: true,
                        });
                        endpoint = `board/${idBoard}/labels`;
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        Object.assign(qs, additionalFields);
                    }
                    else if (operation === 'update') {
                        // ----------------------------------
                        //         update
                        // ----------------------------------
                        requestMethod = 'PUT';
                        const id = this.getNodeParameter('id', i);
                        endpoint = `labels/${id}`;
                        const updateFields = this.getNodeParameter('updateFields', i);
                        Object.assign(qs, updateFields);
                    }
                    else if (operation === 'addLabel') {
                        // ----------------------------------
                        //         addLabel
                        // ----------------------------------
                        requestMethod = 'POST';
                        const cardId = this.getNodeParameter('cardId', i, undefined, {
                            extractValue: true,
                        });
                        const id = this.getNodeParameter('id', i);
                        body.value = id;
                        endpoint = `/cards/${cardId}/idLabels`;
                    }
                    else if (operation === 'removeLabel') {
                        // ----------------------------------
                        //         removeLabel
                        // ----------------------------------
                        requestMethod = 'DELETE';
                        const cardId = this.getNodeParameter('cardId', i, undefined, {
                            extractValue: true,
                        });
                        const id = this.getNodeParameter('id', i);
                        endpoint = `/cards/${cardId}/idLabels/${id}`;
                    }
                    else {
                        throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not known!`, { itemIndex: i });
                    }
                }
                else {
                    throw new NodeOperationError(this.getNode(), `The resource "${resource}" is not known!`, {
                        itemIndex: i,
                    });
                }
                // resources listed here do not support pagination so
                // paginate them 'manually'
                const skipPagination = ['list:getAll'];
                if (returnAll && !skipPagination.includes(`${resource}:${operation}`)) {
                    responseData = await apiRequestAllItems.call(this, requestMethod, endpoint, body, qs);
                }
                else {
                    responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);
                    if (!returnAll && qs.limit) {
                        responseData = responseData.splice(0, qs.limit);
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
//# sourceMappingURL=Trello.node.js.map