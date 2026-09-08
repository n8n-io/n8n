import { NodeApiError, NodeOperationError, } from 'n8n-workflow';
const addOptName = 'additionalOptions';
const possibleRootProperties = ['localPosts', 'reviews'];
const getAllParams = (execFns) => {
    const params = execFns.getNode().parameters;
    const additionalOptions = execFns.getNodeParameter(addOptName, {});
    // Merge standard parameters with additional options from the node parameters
    return { ...params, ...additionalOptions };
};
/* Helper function to adjust date-time parameters for API requests */
export async function handleDatesPresend(opts) {
    const params = getAllParams(this);
    const body = Object.assign({}, opts.body);
    const event = body.event ?? {};
    if (!params.startDateTime && !params.startDate && !params.endDateTime && !params.endDate) {
        return opts;
    }
    const createDateTimeObject = (dateString) => {
        const date = new Date(dateString);
        return {
            date: {
                year: date.getUTCFullYear(),
                month: date.getUTCMonth() + 1,
                day: date.getUTCDate(),
            },
            time: dateString.includes('T')
                ? {
                    hours: date.getUTCHours(),
                    minutes: date.getUTCMinutes(),
                    seconds: date.getUTCSeconds(),
                    nanos: 0,
                }
                : undefined,
        };
    };
    // Convert start and end date-time parameters if provided
    const startDateTime = params.startDateTime || params.startDate
        ? createDateTimeObject((params.startDateTime || params.startDate))
        : null;
    const endDateTime = params.endDateTime || params.endDate
        ? createDateTimeObject((params.endDateTime || params.endDate))
        : null;
    const schedule = {
        startDate: startDateTime?.date,
        endDate: endDateTime?.date,
        startTime: startDateTime?.time,
        endTime: endDateTime?.time,
    };
    event.schedule = schedule;
    Object.assign(body, { event });
    opts.body = body;
    return opts;
}
/* Helper function adding update mask to the request */
export async function addUpdateMaskPresend(opts) {
    const additionalOptions = this.getNodeParameter('additionalOptions');
    const propertyMapping = {
        postType: 'topicType',
        actionType: 'actionType',
        callToActionType: 'callToAction.actionType',
        url: 'callToAction.url',
        startDateTime: 'event.schedule.startDate,event.schedule.startTime',
        endDateTime: 'event.schedule.endDate,event.schedule.endTime',
        title: 'event.title',
        startDate: 'event.schedule.startDate',
        endDate: 'event.schedule.endDate',
        couponCode: 'offer.couponCode',
        redeemOnlineUrl: 'offer.redeemOnlineUrl',
        termsAndConditions: 'offer.termsAndConditions',
    };
    if (Object.keys(additionalOptions).length) {
        const updateMask = Object.keys(additionalOptions)
            .map((key) => propertyMapping[key] || key)
            .join(',');
        opts.qs = {
            ...opts.qs,
            updateMask,
        };
    }
    return opts;
}
/* Helper function to handle pagination */
export async function handlePagination(resultOptions) {
    const aggregatedResult = [];
    let nextPageToken;
    const returnAll = this.getNodeParameter('returnAll');
    let limit = 100;
    if (!returnAll) {
        limit = this.getNodeParameter('limit');
        resultOptions.maxResults = limit;
    }
    resultOptions.paginate = true;
    do {
        if (nextPageToken) {
            resultOptions.options.qs = { ...resultOptions.options.qs, pageToken: nextPageToken };
        }
        const responseData = await this.makeRoutingRequest(resultOptions);
        for (const page of responseData) {
            for (const prop of possibleRootProperties) {
                if (page.json[prop]) {
                    const currentData = page.json[prop];
                    aggregatedResult.push(...currentData);
                }
            }
            if (!returnAll && aggregatedResult.length >= limit) {
                return aggregatedResult.slice(0, limit).map((item) => ({ json: item }));
            }
            nextPageToken = page.json.nextPageToken;
        }
    } while (nextPageToken);
    return aggregatedResult.map((item) => ({ json: item }));
}
/* Helper functions to handle errors */
export async function handleErrorsDeletePost(data, response) {
    if (response.statusCode < 200 || response.statusCode >= 300) {
        const post = this.getNodeParameter('post', undefined);
        // Provide a better error message
        if (post && response.statusCode === 404) {
            throw new NodeOperationError(this.getNode(), 'The post you are deleting could not be found. Adjust the "post" parameter setting to delete the post correctly.');
        }
        throw new NodeApiError(this.getNode(), response.body, {
            message: response.statusMessage,
            httpCode: response.statusCode.toString(),
        });
    }
    return data;
}
export async function handleErrorsGetPost(data, response) {
    if (response.statusCode < 200 || response.statusCode >= 300) {
        const post = this.getNodeParameter('post', undefined);
        // Provide a better error message
        if (post && response.statusCode === 404) {
            throw new NodeOperationError(this.getNode(), 'The post you are requesting could not be found. Adjust the "post" parameter setting to retrieve the post correctly.');
        }
        throw new NodeApiError(this.getNode(), response.body, {
            message: response.statusMessage,
            httpCode: response.statusCode.toString(),
        });
    }
    return data;
}
export async function handleErrorsUpdatePost(data, response) {
    if (response.statusCode < 200 || response.statusCode >= 300) {
        const post = this.getNodeParameter('post');
        const additionalOptions = this.getNodeParameter('additionalOptions');
        // Provide a better error message
        if (post && response.statusCode === 404) {
            throw new NodeOperationError(this.getNode(), 'The post you are updating could not be found. Adjust the "post" parameter setting to update the post correctly.');
        }
        // Do not throw an error if the user didn't set additional options (a hint will be shown)
        if (response.statusCode === 400 && Object.keys(additionalOptions).length === 0) {
            return [{ json: { success: true } }];
        }
        throw new NodeApiError(this.getNode(), response.body, {
            message: response.statusMessage,
            httpCode: response.statusCode.toString(),
        });
    }
    return data;
}
export async function handleErrorsDeleteReply(data, response) {
    if (response.statusCode < 200 || response.statusCode >= 300) {
        const review = this.getNodeParameter('review', undefined);
        // Provide a better error message
        if (review && response.statusCode === 404) {
            throw new NodeOperationError(this.getNode(), 'The review you are deleting could not be found. Adjust the "review" parameter setting to update the review correctly.');
        }
        throw new NodeApiError(this.getNode(), response.body, {
            message: response.statusMessage,
            httpCode: response.statusCode.toString(),
        });
    }
    return data;
}
export async function handleErrorsGetReview(data, response) {
    if (response.statusCode < 200 || response.statusCode >= 300) {
        const review = this.getNodeParameter('review', undefined);
        // Provide a better error message
        if (review && response.statusCode === 404) {
            throw new NodeOperationError(this.getNode(), 'The review you are requesting could not be found. Adjust the "review" parameter setting to update the review correctly.');
        }
        throw new NodeApiError(this.getNode(), response.body, {
            message: response.statusMessage,
            httpCode: response.statusCode.toString(),
        });
    }
    return data;
}
export async function handleErrorsReplyToReview(data, response) {
    if (response.statusCode < 200 || response.statusCode >= 300) {
        const review = this.getNodeParameter('review', undefined);
        // Provide a better error message
        if (review && response.statusCode === 404) {
            throw new NodeOperationError(this.getNode(), 'The review you are replying to could not be found. Adjust the "review" parameter setting to reply to the review correctly.');
        }
        throw new NodeApiError(this.getNode(), response.body, {
            message: response.statusMessage,
            httpCode: response.statusCode.toString(),
        });
    }
    return data;
}
/* Helper function used in listSearch methods */
export async function googleApiRequest(method, resource, body = {}, qs = {}, url) {
    const options = {
        headers: {
            'Content-Type': 'application/json',
        },
        method,
        body,
        qs,
        url: url ?? `https://mybusiness.googleapis.com/v4${resource}`,
        json: true,
    };
    try {
        if (Object.keys(body).length === 0) {
            delete options.body;
        }
        return (await this.helpers.httpRequestWithAuthentication.call(this, 'googleBusinessProfileOAuth2Api', options));
    }
    catch (error) {
        throw new NodeApiError(this.getNode(), error);
    }
}
/* listSearch methods */
export async function searchAccounts(filter, paginationToken) {
    // Docs for this API call can be found here:
    // https://developers.google.com/my-business/reference/accountmanagement/rest/v1/accounts/list
    const query = {};
    if (paginationToken) {
        query.pageToken = paginationToken;
    }
    const responseData = await googleApiRequest.call(this, 'GET', '', {}, {
        pageSize: 20,
        ...query,
    }, 'https://mybusinessaccountmanagement.googleapis.com/v1/accounts');
    const accounts = responseData.accounts;
    const results = accounts
        .map((a) => ({
        name: a.accountName,
        value: a.name,
    }))
        .filter((a) => !filter ||
        a.name.toLowerCase().includes(filter.toLowerCase()) ||
        a.value.toLowerCase().includes(filter.toLowerCase()))
        .sort((a, b) => {
        if (a.name.toLowerCase() < b.name.toLowerCase())
            return -1;
        if (a.name.toLowerCase() > b.name.toLowerCase())
            return 1;
        return 0;
    });
    return { results, paginationToken: responseData.nextPageToken };
}
export async function searchLocations(filter, paginationToken) {
    // Docs for this API call can be found here:
    // https://developers.google.com/my-business/reference/businessinformation/rest/v1/accounts.locations/list
    const query = {};
    if (paginationToken) {
        query.pageToken = paginationToken;
    }
    const account = this.getNodeParameter('account').value;
    const responseData = await googleApiRequest.call(this, 'GET', '', {}, {
        readMask: 'name',
        pageSize: 100,
        ...query,
    }, `https://mybusinessbusinessinformation.googleapis.com/v1/${account}/locations`);
    const locations = responseData.locations;
    const results = locations
        .map((a) => ({
        name: a.name,
        value: a.name,
    }))
        .filter((a) => !filter || a.name.toLowerCase().includes(filter.toLowerCase()))
        .sort((a, b) => {
        if (a.name.toLowerCase() < b.name.toLowerCase())
            return -1;
        if (a.name.toLowerCase() > b.name.toLowerCase())
            return 1;
        return 0;
    });
    return { results, paginationToken: responseData.nextPageToken };
}
export async function searchReviews(filter, paginationToken) {
    const query = {};
    if (paginationToken) {
        query.pageToken = paginationToken;
    }
    const account = this.getNodeParameter('account').value;
    const location = this.getNodeParameter('location').value;
    const responseData = await googleApiRequest.call(this, 'GET', `/${account}/${location}/reviews`, {}, {
        pageSize: 50,
        ...query,
    });
    const reviews = responseData.reviews;
    const results = reviews
        .map((a) => ({
        name: a.comment,
        value: a.name,
    }))
        .filter((a) => !filter || a.name.toLowerCase().includes(filter.toLowerCase()))
        .sort((a, b) => {
        if (a.name.toLowerCase() < b.name.toLowerCase())
            return -1;
        if (a.name.toLowerCase() > b.name.toLowerCase())
            return 1;
        return 0;
    });
    return { results, paginationToken: responseData.nextPageToken };
}
export async function searchPosts(filter, paginationToken) {
    const query = {};
    if (paginationToken) {
        query.pageToken = paginationToken;
    }
    const account = this.getNodeParameter('account').value;
    const location = this.getNodeParameter('location').value;
    const responseData = await googleApiRequest.call(this, 'GET', `/${account}/${location}/localPosts`, {}, {
        pageSize: 100,
        ...query,
    });
    const localPosts = responseData.localPosts;
    const results = localPosts
        .map((a) => ({
        name: a.summary,
        value: a.name,
    }))
        .filter((a) => !filter || a.name.toLowerCase().includes(filter.toLowerCase()))
        .sort((a, b) => {
        if (a.name.toLowerCase() < b.name.toLowerCase())
            return -1;
        if (a.name.toLowerCase() > b.name.toLowerCase())
            return 1;
        return 0;
    });
    return { results, paginationToken: responseData.nextPageToken };
}
//# sourceMappingURL=GenericFunctions.js.map