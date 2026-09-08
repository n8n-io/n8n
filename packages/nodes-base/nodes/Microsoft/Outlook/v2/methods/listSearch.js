import { encodeOutlookId } from '../helpers/utils';
import { getSubfolders, microsoftApiRequest } from '../transport';
// listSearch context throughout this file: the transport's trailing `0` is its
// fallback read (getNodeParameter's 2nd arg here is a fallback, not an item index).
async function search(resource, nameProperty, filter, paginationToken) {
    let response = {};
    if (paginationToken) {
        response = await microsoftApiRequest.call(this, 'GET', '', 0, undefined, undefined, paginationToken);
    }
    else {
        const qs = {
            $select: `id,${nameProperty}`,
            $top: 100,
        };
        if (filter) {
            const filterValue = encodeURI(filter);
            qs.$filter = `contains(${nameProperty}, '${filterValue}')`;
        }
        response = await microsoftApiRequest.call(this, 'GET', resource, 0, undefined, qs);
    }
    return {
        results: response.value.map((entry) => {
            return {
                name: entry[nameProperty],
                value: entry.id,
            };
        }),
        paginationToken: response['@odata.nextLink'],
    };
}
export async function searchContacts(filter, paginationToken) {
    return await search.call(this, '/contacts', 'displayName', filter, paginationToken);
}
export async function searchCalendars(filter, paginationToken) {
    return await search.call(this, '/calendars', 'name', filter, paginationToken);
}
export async function searchDrafts(filter, paginationToken) {
    let response = {};
    if (paginationToken) {
        response = await microsoftApiRequest.call(this, 'GET', '', 0, undefined, undefined, paginationToken);
    }
    else {
        const qs = {
            $select: 'id,subject,bodyPreview,webLink',
            $top: 100,
            $filter: 'isDraft eq true',
        };
        if (filter) {
            const filterValue = encodeURI(filter);
            qs.$filter += ` AND contains(${'subject'}, '${filterValue}')`;
        }
        response = await microsoftApiRequest.call(this, 'GET', '/messages', 0, undefined, qs);
    }
    return {
        results: response.value.map((entry) => {
            return {
                name: (entry.subject || entry.bodyPreview),
                value: entry.id,
                url: entry.webLink,
            };
        }),
        paginationToken: response['@odata.nextLink'],
    };
}
export async function searchMessages(filter, paginationToken) {
    let response = {};
    if (paginationToken) {
        response = await microsoftApiRequest.call(this, 'GET', '', 0, undefined, undefined, paginationToken);
    }
    else {
        const qs = {
            $select: 'id,subject,bodyPreview,webLink',
            $top: 100,
        };
        if (filter) {
            const filterValue = encodeURI(filter);
            qs.$filter = `contains(${'subject'}, '${filterValue}')`;
        }
        response = await microsoftApiRequest.call(this, 'GET', '/messages', 0, undefined, qs);
    }
    return {
        results: response.value.map((entry) => {
            return {
                name: (entry.subject || entry.bodyPreview),
                value: entry.id,
                url: entry.webLink,
            };
        }),
        paginationToken: response['@odata.nextLink'],
    };
}
export async function searchEvents(filter, paginationToken) {
    let response = {};
    const calendarId = this.getNodeParameter('calendarId', undefined, {
        extractValue: true,
    });
    if (paginationToken) {
        response = await microsoftApiRequest.call(this, 'GET', '', 0, undefined, undefined, paginationToken);
    }
    else {
        const qs = {
            $select: 'id,subject,bodyPreview',
            $top: 100,
        };
        if (filter) {
            const filterValue = encodeURI(filter);
            qs.$filter = `contains(${'subject'}, '${filterValue}')`;
        }
        response = await microsoftApiRequest.call(this, 'GET', `/calendars/${calendarId}/events`, 0, undefined, qs);
    }
    return {
        results: response.value.map((entry) => {
            return {
                name: (entry.subject || entry.bodyPreview),
                value: entry.id,
                url: `https://outlook.office365.com/calendar/item/${encodeOutlookId(entry.id)}`,
            };
        }),
        paginationToken: response['@odata.nextLink'],
    };
}
export async function searchFolders(filter, paginationToken) {
    let response = {};
    if (paginationToken) {
        response = await microsoftApiRequest.call(this, 'GET', '', 0, undefined, undefined, paginationToken);
    }
    else {
        const qs = {
            $top: 100,
        };
        response = await microsoftApiRequest.call(this, 'GET', '/mailFolders', 0, undefined, qs);
    }
    let folders = await getSubfolders.call(this, response.value, 0, true);
    if (filter) {
        filter = filter.toLowerCase();
        folders = folders.filter((folder) => (folder.displayName || '').toLowerCase().includes(filter));
    }
    return {
        results: folders.map((entry) => {
            return {
                name: entry.displayName,
                value: entry.id,
                url: `https://outlook.office365.com/mail/${encodeOutlookId(entry.id)}`,
            };
        }),
        paginationToken: response['@odata.nextLink'],
    };
}
export async function searchAttachments(paginationToken) {
    let response = {};
    const messageId = this.getNodeParameter('messageId', undefined, {
        extractValue: true,
    });
    if (paginationToken) {
        response = await microsoftApiRequest.call(this, 'GET', '', 0, undefined, undefined, paginationToken);
    }
    else {
        const qs = {
            $select: 'id,name',
            $top: 100,
        };
        response = await microsoftApiRequest.call(this, 'GET', `/messages/${messageId}/attachments`, 0, undefined, qs);
    }
    return {
        results: response.value.map((entry) => {
            return {
                name: entry.name,
                value: entry.id,
            };
        }),
        paginationToken: response['@odata.nextLink'],
    };
}
//# sourceMappingURL=listSearch.js.map