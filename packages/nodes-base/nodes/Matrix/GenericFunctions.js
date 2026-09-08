import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';
export async function matrixApiRequest(method, resource, body = {}, query = {}, headers = undefined, option = {}) {
    let options = {
        method,
        headers: headers || {
            'Content-Type': 'application/json; charset=utf-8',
        },
        body,
        qs: query,
        uri: '',
        json: true,
    };
    options = Object.assign({}, options, option);
    if (Object.keys(body).length === 0) {
        delete options.body;
    }
    if (Object.keys(query).length === 0) {
        delete options.qs;
    }
    try {
        const credentials = await this.getCredentials('matrixApi');
        options.uri = `${credentials.homeserverUrl}/_matrix/${option.overridePrefix || 'client'}/r0${resource}`;
        options.headers.Authorization = `Bearer ${credentials.accessToken}`;
        const response = await this.helpers.request(options);
        // When working with images, the request cannot be JSON (it's raw binary data)
        // But the output is JSON so we have to parse it manually.
        //@ts-ignore
        return options.overridePrefix === 'media' ? JSON.parse(response) : response;
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
export async function handleMatrixCall(index, resource, operation) {
    if (resource === 'account') {
        if (operation === 'me') {
            return await matrixApiRequest.call(this, 'GET', '/account/whoami');
        }
    }
    else if (resource === 'room') {
        if (operation === 'create') {
            const name = this.getNodeParameter('roomName', index);
            const preset = this.getNodeParameter('preset', index);
            const roomAlias = this.getNodeParameter('roomAlias', index);
            const body = {
                name,
                preset,
            };
            if (roomAlias) {
                body.room_alias_name = roomAlias;
            }
            return await matrixApiRequest.call(this, 'POST', '/createRoom', body);
        }
        else if (operation === 'join') {
            const roomIdOrAlias = this.getNodeParameter('roomIdOrAlias', index);
            return await matrixApiRequest.call(this, 'POST', `/rooms/${roomIdOrAlias}/join`);
        }
        else if (operation === 'leave') {
            const roomId = this.getNodeParameter('roomId', index);
            return await matrixApiRequest.call(this, 'POST', `/rooms/${roomId}/leave`);
        }
        else if (operation === 'invite') {
            const roomId = this.getNodeParameter('roomId', index);
            const userId = this.getNodeParameter('userId', index);
            const body = {
                user_id: userId,
            };
            return await matrixApiRequest.call(this, 'POST', `/rooms/${roomId}/invite`, body);
        }
        else if (operation === 'kick') {
            const roomId = this.getNodeParameter('roomId', index);
            const userId = this.getNodeParameter('userId', index);
            const reason = this.getNodeParameter('reason', index);
            const body = {
                user_id: userId,
                reason,
            };
            return await matrixApiRequest.call(this, 'POST', `/rooms/${roomId}/kick`, body);
        }
    }
    else if (resource === 'message') {
        if (operation === 'create') {
            const roomId = this.getNodeParameter('roomId', index);
            const text = this.getNodeParameter('text', index, '');
            const messageType = this.getNodeParameter('messageType', index);
            const messageFormat = this.getNodeParameter('messageFormat', index);
            const body = {
                msgtype: messageType,
                body: text,
            };
            if (messageFormat === 'org.matrix.custom.html') {
                const fallbackText = this.getNodeParameter('fallbackText', index, '');
                body.format = messageFormat;
                body.formatted_body = text;
                body.body = fallbackText;
            }
            const messageId = uuid();
            return await matrixApiRequest.call(this, 'PUT', `/rooms/${roomId}/send/m.room.message/${messageId}`, body);
        }
        else if (operation === 'getAll') {
            const roomId = this.getNodeParameter('roomId', index);
            const returnAll = this.getNodeParameter('returnAll', index);
            const otherOptions = this.getNodeParameter('otherOptions', index);
            const returnData = [];
            if (returnAll) {
                let responseData;
                let from;
                do {
                    const qs = {
                        dir: 'b', // Get latest messages first - doesn't return anything if we use f without a previous token.
                        from,
                    };
                    if (otherOptions.filter) {
                        qs.filter = otherOptions.filter;
                    }
                    responseData = await matrixApiRequest.call(this, 'GET', `/rooms/${roomId}/messages`, {}, qs);
                    returnData.push.apply(returnData, responseData.chunk);
                    from = responseData.end;
                } while (responseData.chunk.length > 0);
            }
            else {
                const limit = this.getNodeParameter('limit', index);
                const qs = {
                    dir: 'b', // GetfallbackText latest messages first - doesn't return anything if we use f without a previous token.
                    limit,
                };
                if (otherOptions.filter) {
                    qs.filter = otherOptions.filter;
                }
                const responseData = await matrixApiRequest.call(this, 'GET', `/rooms/${roomId}/messages`, {}, qs);
                returnData.push.apply(returnData, responseData.chunk);
            }
            return returnData;
        }
    }
    else if (resource === 'event') {
        if (operation === 'get') {
            const roomId = this.getNodeParameter('roomId', index);
            const eventId = this.getNodeParameter('eventId', index);
            return await matrixApiRequest.call(this, 'GET', `/rooms/${roomId}/event/${eventId}`);
        }
    }
    else if (resource === 'media') {
        if (operation === 'upload') {
            const roomId = this.getNodeParameter('roomId', index);
            const mediaType = this.getNodeParameter('mediaType', index);
            const binaryPropertyName = this.getNodeParameter('binaryPropertyName', index);
            const additionalFields = this.getNodeParameter('additionalFields', index);
            let body;
            const qs = {};
            const headers = {};
            const { fileName, mimeType } = this.helpers.assertBinaryData(index, binaryPropertyName);
            body = await this.helpers.getBinaryDataBuffer(index, binaryPropertyName);
            if (additionalFields.fileName) {
                qs.filename = additionalFields.fileName;
            }
            else {
                qs.filename = fileName;
            }
            headers['Content-Type'] = mimeType;
            headers.accept = 'application/json,text/*;q=0.99';
            const uploadRequestResult = await matrixApiRequest.call(this, 'POST', '/upload', body, qs, headers, {
                overridePrefix: 'media',
                json: false,
            });
            body = {
                msgtype: `m.${mediaType}`,
                body: qs.filename,
                url: uploadRequestResult.content_uri,
            };
            const messageId = uuid();
            return await matrixApiRequest.call(this, 'PUT', `/rooms/${roomId}/send/m.room.message/${messageId}`, body);
        }
    }
    else if (resource === 'roomMember') {
        if (operation === 'getAll') {
            const roomId = this.getNodeParameter('roomId', index);
            const filters = this.getNodeParameter('filters', index);
            const qs = {
                membership: filters.membership ? filters.membership : '',
                not_membership: filters.notMembership ? filters.notMembership : '',
            };
            const roomMembersResponse = await matrixApiRequest.call(this, 'GET', `/rooms/${roomId}/members`, {}, qs);
            return roomMembersResponse.chunk;
        }
    }
    throw new NodeOperationError(this.getNode(), 'Not implemented yet');
}
//# sourceMappingURL=GenericFunctions.js.map