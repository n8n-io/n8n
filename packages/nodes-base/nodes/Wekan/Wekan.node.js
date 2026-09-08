import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { boardFields, boardOperations } from './BoardDescription';
import { cardCommentFields, cardCommentOperations } from './CardCommentDescription';
import { cardFields, cardOperations } from './CardDescription';
import { checklistFields, checklistOperations } from './ChecklistDescription';
import { checklistItemFields, checklistItemOperations } from './ChecklistItemDescription';
import { apiRequest } from './GenericFunctions';
import { listFields, listOperations } from './ListDescription';
import { wrapData } from '../../utils/utilities';
// https://wekan.github.io/api/v4.41/
export class Wekan {
    description = {
        displayName: 'Wekan',
        name: 'wekan',
        icon: 'file:wekan.svg',
        group: ['transform'],
        version: 1,
        subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
        description: 'Consume Wekan API',
        defaults: {
            name: 'Wekan',
        },
        usableAsTool: true,
        inputs: [NodeConnectionTypes.Main],
        outputs: [NodeConnectionTypes.Main],
        credentials: [
            {
                name: 'wekanApi',
                required: true,
            },
        ],
        properties: [
            {
                displayName: 'Resource',
                name: 'resource',
                type: 'options',
                noDataExpression: true,
                options: [
                    {
                        name: 'Board',
                        value: 'board',
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
                        name: 'Checklist Item',
                        value: 'checklistItem',
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
            ...boardOperations,
            ...cardOperations,
            ...cardCommentOperations,
            ...checklistOperations,
            ...checklistItemOperations,
            ...listOperations,
            // ----------------------------------
            //         fields
            // ----------------------------------
            ...boardFields,
            ...cardFields,
            ...cardCommentFields,
            ...checklistFields,
            ...checklistItemFields,
            ...listFields,
        ],
    };
    methods = {
        loadOptions: {
            async getUsers() {
                const returnData = [];
                const users = await apiRequest.call(this, 'GET', 'users', {}, {});
                for (const user of users) {
                    returnData.push({
                        name: user.username,
                        value: user._id,
                    });
                }
                return returnData;
            },
            async getBoards() {
                const returnData = [];
                const user = await apiRequest.call(this, 'GET', 'user', {}, {});
                const boards = await apiRequest.call(this, 'GET', `users/${user._id}/boards`, {}, {});
                for (const board of boards) {
                    returnData.push({
                        name: board.title,
                        value: board._id,
                    });
                }
                return returnData;
            },
            async getLists() {
                const returnData = [];
                const boardId = this.getCurrentNodeParameter('boardId');
                const lists = await apiRequest.call(this, 'GET', `boards/${boardId}/lists`, {}, {});
                for (const list of lists) {
                    returnData.push({
                        name: list.title,
                        value: list._id,
                    });
                }
                return returnData;
            },
            async getSwimlanes() {
                const returnData = [];
                const boardId = this.getCurrentNodeParameter('boardId');
                const swimlanes = await apiRequest.call(this, 'GET', `boards/${boardId}/swimlanes`, {}, {});
                for (const swimlane of swimlanes) {
                    returnData.push({
                        name: swimlane.title,
                        value: swimlane._id,
                    });
                }
                return returnData;
            },
            async getCards() {
                const returnData = [];
                const boardId = this.getCurrentNodeParameter('boardId');
                const listId = this.getCurrentNodeParameter('listId');
                const cards = await apiRequest.call(this, 'GET', `boards/${boardId}/lists/${listId}/cards`, {}, {});
                for (const card of cards) {
                    returnData.push({
                        name: card.title,
                        value: card._id,
                    });
                }
                return returnData;
            },
            async getChecklists() {
                const returnData = [];
                const boardId = this.getCurrentNodeParameter('boardId');
                const cardId = this.getCurrentNodeParameter('cardId');
                const checklists = await apiRequest.call(this, 'GET', `boards/${boardId}/cards/${cardId}/checklists`, {}, {});
                for (const checklist of checklists) {
                    returnData.push({
                        name: checklist.title,
                        value: checklist._id,
                    });
                }
                return returnData;
            },
            async getChecklistItems() {
                const returnData = [];
                const boardId = this.getCurrentNodeParameter('boardId');
                const cardId = this.getCurrentNodeParameter('cardId');
                const checklistId = this.getCurrentNodeParameter('checklistId');
                const checklist = await apiRequest.call(this, 'GET', `boards/${boardId}/cards/${cardId}/checklists/${checklistId}`, {}, {});
                for (const item of checklist.items) {
                    returnData.push({
                        name: item.title,
                        value: item._id,
                    });
                }
                return returnData;
            },
            async getComments() {
                const returnData = [];
                const boardId = this.getCurrentNodeParameter('boardId');
                const cardId = this.getCurrentNodeParameter('cardId');
                const comments = await apiRequest.call(this, 'GET', `boards/${boardId}/cards/${cardId}/comments`, {}, {});
                for (const comment of comments) {
                    returnData.push({
                        name: comment.comment,
                        value: comment._id,
                    });
                }
                return returnData;
            },
        },
    };
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        let returnAll;
        let limit;
        const operation = this.getNodeParameter('operation', 0);
        const resource = this.getNodeParameter('resource', 0);
        // For Post
        let body;
        // For Query string
        let qs;
        let requestMethod;
        let endpoint;
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
                        body.title = this.getNodeParameter('title', i);
                        body.owner = this.getNodeParameter('owner', i);
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        Object.assign(body, additionalFields);
                    }
                    else if (operation === 'delete') {
                        // ----------------------------------
                        //         delete
                        // ----------------------------------
                        requestMethod = 'DELETE';
                        const boardId = this.getNodeParameter('boardId', i);
                        endpoint = `boards/${boardId}`;
                    }
                    else if (operation === 'get') {
                        // ----------------------------------
                        //         get
                        // ----------------------------------
                        requestMethod = 'GET';
                        const boardId = this.getNodeParameter('boardId', i);
                        endpoint = `boards/${boardId}`;
                    }
                    else if (operation === 'getAll') {
                        // ----------------------------------
                        //         getAll
                        // ----------------------------------
                        requestMethod = 'GET';
                        const userId = this.getNodeParameter('IdUser', i);
                        returnAll = this.getNodeParameter('returnAll', i);
                        endpoint = `users/${userId}/boards`;
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
                        const boardId = this.getNodeParameter('boardId', i);
                        const listId = this.getNodeParameter('listId', i);
                        endpoint = `boards/${boardId}/lists/${listId}/cards`;
                        body.title = this.getNodeParameter('title', i);
                        body.swimlaneId = this.getNodeParameter('swimlaneId', i);
                        body.authorId = this.getNodeParameter('authorId', i);
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        Object.assign(body, additionalFields);
                    }
                    else if (operation === 'delete') {
                        // ----------------------------------
                        //         delete
                        // ----------------------------------
                        requestMethod = 'DELETE';
                        const boardId = this.getNodeParameter('boardId', i);
                        const listId = this.getNodeParameter('listId', i);
                        const cardId = this.getNodeParameter('cardId', i);
                        endpoint = `boards/${boardId}/lists/${listId}/cards/${cardId}`;
                    }
                    else if (operation === 'get') {
                        // ----------------------------------
                        //         get
                        // ----------------------------------
                        requestMethod = 'GET';
                        const boardId = this.getNodeParameter('boardId', i);
                        const listId = this.getNodeParameter('listId', i);
                        const cardId = this.getNodeParameter('cardId', i);
                        endpoint = `boards/${boardId}/lists/${listId}/cards/${cardId}`;
                    }
                    else if (operation === 'getAll') {
                        // ----------------------------------
                        //         getAll
                        // ----------------------------------
                        requestMethod = 'GET';
                        const boardId = this.getNodeParameter('boardId', i);
                        const fromObject = this.getNodeParameter('fromObject', i);
                        returnAll = this.getNodeParameter('returnAll', i);
                        if (fromObject === 'list') {
                            const listId = this.getNodeParameter('listId', i);
                            endpoint = `boards/${boardId}/lists/${listId}/cards`;
                        }
                        if (fromObject === 'swimlane') {
                            const swimlaneId = this.getNodeParameter('swimlaneId', i);
                            endpoint = `boards/${boardId}/swimlanes/${swimlaneId}/cards`;
                        }
                    }
                    else if (operation === 'update') {
                        // ----------------------------------
                        //         update
                        // ----------------------------------
                        requestMethod = 'PUT';
                        const boardId = this.getNodeParameter('boardId', i);
                        const listId = this.getNodeParameter('listId', i);
                        const cardId = this.getNodeParameter('cardId', i);
                        endpoint = `boards/${boardId}/lists/${listId}/cards/${cardId}`;
                        const updateFields = this.getNodeParameter('updateFields', i);
                        Object.assign(body, updateFields);
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
                        requestMethod = 'POST';
                        const boardId = this.getNodeParameter('boardId', i);
                        const cardId = this.getNodeParameter('cardId', i);
                        endpoint = `boards/${boardId}/cards/${cardId}/comments`;
                        body.authorId = this.getNodeParameter('authorId', i);
                        body.comment = this.getNodeParameter('comment', i);
                    }
                    else if (operation === 'delete') {
                        // ----------------------------------
                        //         delete
                        // ----------------------------------
                        requestMethod = 'DELETE';
                        const boardId = this.getNodeParameter('boardId', i);
                        const cardId = this.getNodeParameter('cardId', i);
                        const commentId = this.getNodeParameter('commentId', i);
                        endpoint = `boards/${boardId}/cards/${cardId}/comments/${commentId}`;
                    }
                    else if (operation === 'get') {
                        // ----------------------------------
                        //         get
                        // ----------------------------------
                        requestMethod = 'GET';
                        const boardId = this.getNodeParameter('boardId', i);
                        const cardId = this.getNodeParameter('cardId', i);
                        const commentId = this.getNodeParameter('commentId', i);
                        endpoint = `boards/${boardId}/cards/${cardId}/comments/${commentId}`;
                    }
                    else if (operation === 'getAll') {
                        // ----------------------------------
                        //         getAll
                        // ----------------------------------
                        requestMethod = 'GET';
                        const boardId = this.getNodeParameter('boardId', i);
                        const cardId = this.getNodeParameter('cardId', i);
                        endpoint = `boards/${boardId}/cards/${cardId}/comments`;
                    }
                    else {
                        throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not known!`, { itemIndex: i });
                    }
                }
                else if (resource === 'list') {
                    if (operation === 'create') {
                        // ----------------------------------
                        //         create
                        // ----------------------------------
                        requestMethod = 'POST';
                        const boardId = this.getNodeParameter('boardId', i);
                        endpoint = `boards/${boardId}/lists`;
                        body.title = this.getNodeParameter('title', i);
                    }
                    else if (operation === 'delete') {
                        // ----------------------------------
                        //         delete
                        // ----------------------------------
                        requestMethod = 'DELETE';
                        const boardId = this.getNodeParameter('boardId', i);
                        const listId = this.getNodeParameter('listId', i);
                        endpoint = `boards/${boardId}/lists/${listId}`;
                    }
                    else if (operation === 'get') {
                        // ----------------------------------
                        //         get
                        // ----------------------------------
                        requestMethod = 'GET';
                        const boardId = this.getNodeParameter('boardId', i);
                        const listId = this.getNodeParameter('listId', i);
                        endpoint = `boards/${boardId}/lists/${listId}`;
                    }
                    else if (operation === 'getAll') {
                        // ----------------------------------
                        //         getAll
                        // ----------------------------------
                        requestMethod = 'GET';
                        const boardId = this.getNodeParameter('boardId', i);
                        returnAll = this.getNodeParameter('returnAll', i);
                        endpoint = `boards/${boardId}/lists`;
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
                        const boardId = this.getNodeParameter('boardId', i);
                        const cardId = this.getNodeParameter('cardId', i);
                        endpoint = `boards/${boardId}/cards/${cardId}/checklists`;
                        body.title = this.getNodeParameter('title', i);
                        body.items = this.getNodeParameter('items', i);
                    }
                    else if (operation === 'delete') {
                        // ----------------------------------
                        //         delete
                        // ----------------------------------
                        requestMethod = 'DELETE';
                        const boardId = this.getNodeParameter('boardId', i);
                        const cardId = this.getNodeParameter('cardId', i);
                        const checklistId = this.getNodeParameter('checklistId', i);
                        endpoint = `boards/${boardId}/cards/${cardId}/checklists/${checklistId}`;
                    }
                    else if (operation === 'get') {
                        // ----------------------------------
                        //         get
                        // ----------------------------------
                        requestMethod = 'GET';
                        const boardId = this.getNodeParameter('boardId', i);
                        const cardId = this.getNodeParameter('cardId', i);
                        const checklistId = this.getNodeParameter('checklistId', i);
                        endpoint = `boards/${boardId}/cards/${cardId}/checklists/${checklistId}`;
                    }
                    else if (operation === 'getAll') {
                        // ----------------------------------
                        //         getAll
                        // ----------------------------------
                        requestMethod = 'GET';
                        const boardId = this.getNodeParameter('boardId', i);
                        const cardId = this.getNodeParameter('cardId', i);
                        returnAll = this.getNodeParameter('returnAll', i);
                        endpoint = `boards/${boardId}/cards/${cardId}/checklists`;
                    }
                    else if (operation === 'getCheckItem') {
                        // ----------------------------------
                        //         getCheckItem
                        // ----------------------------------
                        requestMethod = 'GET';
                        const boardId = this.getNodeParameter('boardId', i);
                        const cardId = this.getNodeParameter('cardId', i);
                        const checklistId = this.getNodeParameter('checklistId', i);
                        const itemId = this.getNodeParameter('itemId', i);
                        endpoint = `boards/${boardId}/cards/${cardId}/checklists/${checklistId}/items/${itemId}`;
                    }
                    else if (operation === 'deleteCheckItem') {
                        // ----------------------------------
                        //         deleteCheckItem
                        // ----------------------------------
                        requestMethod = 'DELETE';
                        const boardId = this.getNodeParameter('boardId', i);
                        const cardId = this.getNodeParameter('cardId', i);
                        const checklistId = this.getNodeParameter('checklistId', i);
                        const itemId = this.getNodeParameter('itemId', i);
                        endpoint = `boards/${boardId}/cards/${cardId}/checklists/${checklistId}/items/${itemId}`;
                    }
                    else if (operation === 'updateCheckItem') {
                        // ----------------------------------
                        //         updateCheckItem
                        // ----------------------------------
                        requestMethod = 'PUT';
                        const boardId = this.getNodeParameter('boardId', i);
                        const cardId = this.getNodeParameter('cardId', i);
                        const checklistId = this.getNodeParameter('checklistId', i);
                        const itemId = this.getNodeParameter('itemId', i);
                        endpoint = `boards/${boardId}/cards/${cardId}/checklists/${checklistId}/items/${itemId}`;
                        const updateFields = this.getNodeParameter('updateFields', i);
                        Object.assign(body, updateFields);
                    }
                    else {
                        throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not known!`, { itemIndex: i });
                    }
                }
                else if (resource === 'checklistItem') {
                    if (operation === 'get') {
                        // ----------------------------------
                        //         get
                        // ----------------------------------
                        requestMethod = 'GET';
                        const boardId = this.getNodeParameter('boardId', i);
                        const cardId = this.getNodeParameter('cardId', i);
                        const checklistId = this.getNodeParameter('checklistId', i);
                        const itemId = this.getNodeParameter('checklistItemId', i);
                        endpoint = `boards/${boardId}/cards/${cardId}/checklists/${checklistId}/items/${itemId}`;
                    }
                    else if (operation === 'delete') {
                        // ----------------------------------
                        //         delete
                        // ----------------------------------
                        requestMethod = 'DELETE';
                        const boardId = this.getNodeParameter('boardId', i);
                        const cardId = this.getNodeParameter('cardId', i);
                        const checklistId = this.getNodeParameter('checklistId', i);
                        const itemId = this.getNodeParameter('checklistItemId', i);
                        endpoint = `boards/${boardId}/cards/${cardId}/checklists/${checklistId}/items/${itemId}`;
                    }
                    else if (operation === 'update') {
                        // ----------------------------------
                        //         update
                        // ----------------------------------
                        requestMethod = 'PUT';
                        const boardId = this.getNodeParameter('boardId', i);
                        const cardId = this.getNodeParameter('cardId', i);
                        const checklistId = this.getNodeParameter('checklistId', i);
                        const itemId = this.getNodeParameter('checklistItemId', i);
                        endpoint = `boards/${boardId}/cards/${cardId}/checklists/${checklistId}/items/${itemId}`;
                        const updateFields = this.getNodeParameter('updateFields', i);
                        Object.assign(body, updateFields);
                    }
                }
                let responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs);
                if (returnAll === false && Array.isArray(responseData)) {
                    limit = this.getNodeParameter('limit', i);
                    responseData = responseData.splice(0, limit);
                }
                const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData), { itemData: { item: i } });
                returnData.push(...executionData);
            }
            catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({ json: { error: error.message }, pairedItem: { item: i } });
                    continue;
                }
                throw error;
            }
        }
        return [this.helpers.returnJsonArray(returnData)];
    }
}
//# sourceMappingURL=Wekan.node.js.map