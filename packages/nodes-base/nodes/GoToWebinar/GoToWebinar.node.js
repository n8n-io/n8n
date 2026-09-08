import isEmpty from 'lodash/isEmpty';
import omit from 'lodash/omit';
import moment from 'moment-timezone';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { attendeeFields, attendeeOperations, coorganizerFields, coorganizerOperations, panelistFields, panelistOperations, registrantFields, registrantOperations, sessionFields, sessionOperations, webinarFields, webinarOperations, } from './descriptions';
import { goToWebinarApiRequest, goToWebinarApiRequestAllItems, handleGetAll, loadAnswers, loadRegistranMultiChoiceQuestions, loadRegistranSimpleQuestions, loadWebinars, loadWebinarSessions, } from './GenericFunctions';
export class GoToWebinar {
    description = {
        displayName: 'GoToWebinar',
        name: 'goToWebinar',
        icon: 'file:gotowebinar.svg',
        group: ['transform'],
        version: 1,
        subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
        description: 'Consume the GoToWebinar API',
        defaults: {
            name: 'GoToWebinar',
        },
        usableAsTool: true,
        inputs: [NodeConnectionTypes.Main],
        outputs: [NodeConnectionTypes.Main],
        credentials: [
            {
                name: 'goToWebinarOAuth2Api',
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
                        name: 'Attendee',
                        value: 'attendee',
                    },
                    {
                        name: 'Co-Organizer',
                        value: 'coorganizer',
                    },
                    {
                        name: 'Panelist',
                        value: 'panelist',
                    },
                    {
                        name: 'Registrant',
                        value: 'registrant',
                    },
                    {
                        name: 'Session',
                        value: 'session',
                    },
                    {
                        name: 'Webinar',
                        value: 'webinar',
                    },
                ],
                default: 'attendee',
            },
            ...attendeeOperations,
            ...attendeeFields,
            ...coorganizerOperations,
            ...coorganizerFields,
            ...panelistOperations,
            ...panelistFields,
            ...registrantOperations,
            ...registrantFields,
            ...sessionOperations,
            ...sessionFields,
            ...webinarOperations,
            ...webinarFields,
        ],
    };
    methods = {
        loadOptions: {
            async getWebinars() {
                return await loadWebinars.call(this);
            },
            async getAnswers() {
                return await loadAnswers.call(this);
            },
            async getWebinarSessions() {
                return await loadWebinarSessions.call(this);
            },
            // Get all the timezones to display them to user so that they can
            // select them easily
            async getTimezones() {
                const returnData = [];
                for (const timezone of moment.tz.names()) {
                    const timezoneName = timezone;
                    const timezoneId = timezone;
                    returnData.push({
                        name: timezoneName,
                        value: timezoneId,
                    });
                }
                return returnData;
            },
            async getRegistranSimpleQuestions() {
                return await loadRegistranSimpleQuestions.call(this);
            },
            async getRegistranMultiChoiceQuestions() {
                return await loadRegistranMultiChoiceQuestions.call(this);
            },
        },
    };
    async execute() {
        const items = this.getInputData();
        const resource = this.getNodeParameter('resource', 0);
        const operation = this.getNodeParameter('operation', 0);
        let responseData;
        const returnData = [];
        const { oauthTokenData } = await this.getCredentials('goToWebinarOAuth2Api');
        const accountKey = oauthTokenData.account_key;
        const organizerKey = oauthTokenData.organizer_key;
        for (let i = 0; i < items.length; i++) {
            try {
                if (resource === 'attendee') {
                    // *********************************************************************
                    //                            attendee
                    // *********************************************************************
                    // https://developer.goto.com/GoToWebinarV2/#tag/Attendees
                    if (operation === 'get') {
                        // ----------------------------------
                        //         attendee: get
                        // ----------------------------------
                        const webinarKey = this.getNodeParameter('webinarKey', i);
                        const sessionKey = this.getNodeParameter('sessionKey', i);
                        const registrantKey = this.getNodeParameter('registrantKey', i);
                        const endpoint = `organizers/${organizerKey}/webinars/${webinarKey}/sessions/${sessionKey}/attendees/${registrantKey}`;
                        responseData = await goToWebinarApiRequest.call(this, 'GET', endpoint, {}, {});
                    }
                    else if (operation === 'getAll') {
                        // ----------------------------------
                        //        attendee: getAll
                        // ----------------------------------
                        const webinarKey = this.getNodeParameter('webinarKey', i);
                        const sessionKey = this.getNodeParameter('sessionKey', i);
                        const endpoint = `organizers/${organizerKey}/webinars/${webinarKey}/sessions/${sessionKey}/attendees`;
                        responseData = await handleGetAll.call(this, endpoint, {}, {}, resource);
                    }
                    else if (operation === 'getDetails') {
                        // ----------------------------------
                        //     attendee: getDetails
                        // ----------------------------------
                        const webinarKey = this.getNodeParameter('webinarKey', i);
                        const sessionKey = this.getNodeParameter('sessionKey', i);
                        const registrantKey = this.getNodeParameter('registrantKey', i);
                        const details = this.getNodeParameter('details', i);
                        const endpoint = `organizers/${organizerKey}/webinars/${webinarKey}/sessions/${sessionKey}/attendees/${registrantKey}/${details}`;
                        responseData = await goToWebinarApiRequest.call(this, 'GET', endpoint, {}, {});
                    }
                }
                else if (resource === 'coorganizer') {
                    // *********************************************************************
                    //                            coorganizer
                    // *********************************************************************
                    // https://developer.goto.com/GoToWebinarV2/#tag/Co-organizers
                    if (operation === 'create') {
                        // ----------------------------------
                        //        coorganizer: create
                        // ----------------------------------
                        const webinarKey = this.getNodeParameter('webinarKey', i);
                        const body = {
                            external: this.getNodeParameter('isExternal', i),
                        };
                        if (body.external === false) {
                            body.organizerKey = this.getNodeParameter('organizerKey', i);
                        }
                        if (body.external === true) {
                            body.givenName = this.getNodeParameter('givenName', i);
                            body.email = this.getNodeParameter('email', i);
                        }
                        const endpoint = `organizers/${organizerKey}/webinars/${webinarKey}/coorganizers`;
                        responseData = await goToWebinarApiRequest.call(this, 'POST', endpoint, {}, [body]);
                    }
                    else if (operation === 'delete') {
                        // ----------------------------------
                        //       coorganizer: delete
                        // ----------------------------------
                        const webinarKey = this.getNodeParameter('webinarKey', i);
                        const coorganizerKey = this.getNodeParameter('coorganizerKey', i);
                        const qs = {
                            external: this.getNodeParameter('isExternal', i),
                        };
                        const endpoint = `organizers/${organizerKey}/webinars/${webinarKey}/coorganizers/${coorganizerKey}`;
                        responseData = await goToWebinarApiRequest.call(this, 'DELETE', endpoint, qs, {});
                        responseData = { success: true };
                    }
                    else if (operation === 'getAll') {
                        // ----------------------------------
                        //        coorganizer: getAll
                        // ----------------------------------
                        const webinarKey = this.getNodeParameter('webinarKey', i);
                        const endpoint = `organizers/${organizerKey}/webinars/${webinarKey}/coorganizers`;
                        responseData = await handleGetAll.call(this, endpoint, {}, {}, resource);
                    }
                    else if (operation === 'reinvite') {
                        // ----------------------------------
                        //       coorganizer: reinvite
                        // ----------------------------------
                        const webinarKey = this.getNodeParameter('webinarKey', i);
                        const coorganizerKey = this.getNodeParameter('coorganizerKey', i);
                        const qs = {
                            external: this.getNodeParameter('isExternal', i),
                        };
                        const endpoint = `organizers/${organizerKey}/webinars/${webinarKey}/coorganizers/${coorganizerKey}/resendInvitation`;
                        responseData = await goToWebinarApiRequest.call(this, 'POST', endpoint, qs, {});
                        responseData = { success: true };
                    }
                }
                else if (resource === 'panelist') {
                    // *********************************************************************
                    //                            panelist
                    // *********************************************************************
                    // https://developer.goto.com/GoToWebinarV2/#tag/Panelists
                    if (operation === 'create') {
                        // ----------------------------------
                        //         panelist: create
                        // ----------------------------------
                        const webinarKey = this.getNodeParameter('webinarKey', i);
                        const body = [
                            {
                                name: this.getNodeParameter('name', i),
                                email: this.getNodeParameter('email', i),
                            },
                        ];
                        const endpoint = `organizers/${organizerKey}/webinars/${webinarKey}/panelists`;
                        responseData = await goToWebinarApiRequest.call(this, 'POST', endpoint, {}, body);
                    }
                    else if (operation === 'delete') {
                        // ----------------------------------
                        //         panelist: delete
                        // ----------------------------------
                        const webinarKey = this.getNodeParameter('webinarKey', i);
                        const panelistKey = this.getNodeParameter('panelistKey', i);
                        const endpoint = `organizers/${organizerKey}/webinars/${webinarKey}/panelists/${panelistKey}`;
                        responseData = await goToWebinarApiRequest.call(this, 'DELETE', endpoint, {}, {});
                        responseData = { success: true };
                    }
                    else if (operation === 'getAll') {
                        // ----------------------------------
                        //         panelist: getAll
                        // ----------------------------------
                        const webinarKey = this.getNodeParameter('webinarKey', i);
                        const endpoint = `organizers/${organizerKey}/webinars/${webinarKey}/panelists`;
                        responseData = await handleGetAll.call(this, endpoint, {}, {}, resource);
                    }
                    else if (operation === 'reinvite') {
                        // ----------------------------------
                        //        panelist: reinvite
                        // ----------------------------------
                        const webinarKey = this.getNodeParameter('webinarKey', i);
                        const panelistKey = this.getNodeParameter('panelistKey', i);
                        const endpoint = `organizers/${organizerKey}/webinars/${webinarKey}/panelists/${panelistKey}/resendInvitation`;
                        responseData = await goToWebinarApiRequest.call(this, 'POST', endpoint, {}, {});
                        responseData = { success: true };
                    }
                }
                else if (resource === 'registrant') {
                    // *********************************************************************
                    //                            registrant
                    // *********************************************************************
                    // https://developer.goto.com/GoToWebinarV2/#tag/Registrants
                    if (operation === 'create') {
                        // ----------------------------------
                        //         registrant: create
                        // ----------------------------------
                        const webinarKey = this.getNodeParameter('webinarKey', i);
                        const qs = {};
                        const body = {
                            firstName: this.getNodeParameter('firstName', i),
                            lastName: this.getNodeParameter('lastName', i),
                            email: this.getNodeParameter('email', i),
                            responses: [],
                        };
                        let additionalFields = this.getNodeParameter('additionalFields', i);
                        if (additionalFields.resendConfirmation) {
                            qs.resendConfirmation = additionalFields.resendConfirmation;
                            additionalFields = omit(additionalFields, ['resendConfirmation']);
                        }
                        if (additionalFields.fullAddress) {
                            Object.assign(body, additionalFields.fullAddress.details);
                            additionalFields = omit(additionalFields, ['fullAddress']);
                        }
                        if (additionalFields.simpleResponses) {
                            //@ts-ignore
                            body.responses.push(...additionalFields.simpleResponses.details);
                            additionalFields = omit(additionalFields, ['simpleResponses']);
                        }
                        if (additionalFields.multiChoiceResponses) {
                            //@ts-ignore
                            body.responses.push(...additionalFields.multiChoiceResponses.details);
                            additionalFields = omit(additionalFields, ['multiChoiceResponses']);
                        }
                        Object.assign(body, additionalFields);
                        const endpoint = `organizers/${organizerKey}/webinars/${webinarKey}/registrants`;
                        responseData = await goToWebinarApiRequest.call(this, 'POST', endpoint, qs, body);
                    }
                    else if (operation === 'delete') {
                        // ----------------------------------
                        //        registrant: delete
                        // ----------------------------------
                        const webinarKey = this.getNodeParameter('webinarKey', i);
                        const registrantKey = this.getNodeParameter('registrantKey', i);
                        const endpoint = `organizers/${organizerKey}/webinars/${webinarKey}/registrants/${registrantKey}`;
                        responseData = await goToWebinarApiRequest.call(this, 'DELETE', endpoint, {}, {});
                        responseData = { success: true };
                    }
                    else if (operation === 'get') {
                        // ----------------------------------
                        //        registrant: get
                        // ----------------------------------
                        const webinarKey = this.getNodeParameter('webinarKey', i);
                        const registrantKey = this.getNodeParameter('registrantKey', i);
                        const endpoint = `organizers/${organizerKey}/webinars/${webinarKey}/registrants/${registrantKey}`;
                        responseData = await goToWebinarApiRequest.call(this, 'GET', endpoint, {}, {});
                    }
                    else if (operation === 'getAll') {
                        // ----------------------------------
                        //        registrant: getAll
                        // ----------------------------------
                        const webinarKey = this.getNodeParameter('webinarKey', i);
                        const endpoint = `organizers/${organizerKey}/webinars/${webinarKey}/registrants`;
                        responseData = await handleGetAll.call(this, endpoint, {}, {}, resource);
                    }
                }
                else if (resource === 'session') {
                    // *********************************************************************
                    //                              session
                    // *********************************************************************
                    // https://developer.goto.com/GoToWebinarV2/#tag/Sessions
                    if (operation === 'get') {
                        // ----------------------------------
                        //         session: get
                        // ----------------------------------
                        const webinarKey = this.getNodeParameter('webinarKey', i);
                        const sessionKey = this.getNodeParameter('sessionKey', i);
                        const endpoint = `organizers/${organizerKey}/webinars/${webinarKey}/sessions/${sessionKey}`;
                        responseData = await goToWebinarApiRequest.call(this, 'GET', endpoint, {}, {});
                    }
                    else if (operation === 'getAll') {
                        // ----------------------------------
                        //         session: getAll
                        // ----------------------------------
                        const qs = {};
                        const returnAll = this.getNodeParameter('returnAll', 0);
                        if (!returnAll) {
                            qs.limit = this.getNodeParameter('limit', 0);
                        }
                        const { webinarKey, times } = this.getNodeParameter('additionalFields', i);
                        if (times) {
                            qs.fromTime = moment(times.timesProperties.fromTime).format();
                            qs.toTime = moment(times.timesProperties.toTime).format();
                        }
                        else {
                            qs.fromTime = moment().subtract(1, 'years').format();
                            qs.toTime = moment().format();
                        }
                        if (webinarKey !== undefined) {
                            const endpoint = `organizers/${organizerKey}/webinars/${webinarKey}/sessions`;
                            responseData = await goToWebinarApiRequestAllItems.call(this, 'GET', endpoint, qs, {}, resource);
                        }
                        else {
                            const endpoint = `organizers/${organizerKey}/sessions`;
                            responseData = await goToWebinarApiRequestAllItems.call(this, 'GET', endpoint, qs, {}, resource);
                        }
                    }
                    else if (operation === 'getDetails') {
                        // ----------------------------------
                        //         session: getDetails
                        // ----------------------------------
                        const webinarKey = this.getNodeParameter('webinarKey', i);
                        const sessionKey = this.getNodeParameter('sessionKey', i);
                        const details = this.getNodeParameter('details', i);
                        const endpoint = `organizers/${organizerKey}/webinars/${webinarKey}/sessions/${sessionKey}/${details}`;
                        responseData = await goToWebinarApiRequest.call(this, 'GET', endpoint, {}, {});
                    }
                }
                else if (resource === 'webinar') {
                    // *********************************************************************
                    //                               webinar
                    // *********************************************************************
                    // https://developer.goto.com/GoToWebinarV2/#tag/Webinars
                    if (operation === 'create') {
                        // ----------------------------------
                        //         webinar: create
                        // ----------------------------------
                        const timesProperties = this.getNodeParameter('times.timesProperties', i, []);
                        const body = {
                            subject: this.getNodeParameter('subject', i),
                            times: timesProperties,
                        };
                        const additionalFields = this.getNodeParameter('additionalFields', i);
                        Object.assign(body, additionalFields);
                        const endpoint = `organizers/${organizerKey}/webinars`;
                        responseData = await goToWebinarApiRequest.call(this, 'POST', endpoint, {}, body);
                    }
                    else if (operation === 'delete') {
                        // ----------------------------------
                        //         webinar: delete
                        // ----------------------------------
                        const webinarKey = this.getNodeParameter('webinarKey', i);
                        const { sendCancellationEmails } = this.getNodeParameter('additionalFields', i);
                        const qs = {};
                        if (sendCancellationEmails) {
                            qs.sendCancellationEmails = sendCancellationEmails;
                        }
                        const endpoint = `organizers/${organizerKey}/webinars/${webinarKey}`;
                        await goToWebinarApiRequest.call(this, 'DELETE', endpoint, qs, {});
                        responseData = { success: true };
                    }
                    else if (operation === 'get') {
                        // ----------------------------------
                        //         webinar: get
                        // ----------------------------------
                        const webinarKey = this.getNodeParameter('webinarKey', i);
                        const endpoint = `organizers/${organizerKey}/webinars/${webinarKey}`;
                        responseData = await goToWebinarApiRequest.call(this, 'GET', endpoint, {}, {});
                    }
                    else if (operation === 'getAll') {
                        // ----------------------------------
                        //         webinar: getAll
                        // ----------------------------------
                        const qs = {};
                        const returnAll = this.getNodeParameter('returnAll', 0);
                        if (!returnAll) {
                            qs.limit = this.getNodeParameter('limit', 0);
                        }
                        const { times } = this.getNodeParameter('additionalFields', i);
                        if (times) {
                            qs.fromTime = moment(times.timesProperties.fromTime).format();
                            qs.toTime = moment(times.timesProperties.toTime).format();
                        }
                        else {
                            qs.fromTime = moment().subtract(1, 'years').format();
                            qs.toTime = moment().format();
                        }
                        const endpoint = `accounts/${accountKey}/webinars`;
                        responseData = await goToWebinarApiRequestAllItems.call(this, 'GET', endpoint, qs, {}, resource);
                    }
                    else if (operation === 'update') {
                        // ----------------------------------
                        //         webinar: update
                        // ----------------------------------
                        const webinarKey = this.getNodeParameter('webinarKey', i);
                        const qs = {
                            notifyParticipants: this.getNodeParameter('notifyParticipants', i),
                        };
                        let body = {};
                        let updateFields = this.getNodeParameter('updateFields', i);
                        if (updateFields.times) {
                            const { times } = updateFields;
                            body = {
                                times: times.timesProperties,
                            };
                            updateFields = omit(updateFields, ['times']);
                        }
                        Object.assign(body, updateFields);
                        if (isEmpty(updateFields)) {
                            throw new NodeOperationError(this.getNode(), `Please enter at least one field to update for the ${resource}.`, { itemIndex: i });
                        }
                        const endpoint = `organizers/${organizerKey}/webinars/${webinarKey}`;
                        await goToWebinarApiRequest.call(this, 'PUT', endpoint, qs, body);
                        responseData = { success: true };
                    }
                }
            }
            catch (error) {
                if (this.continueOnFail()) {
                    const executionErrorData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray({ error: error.message }), { itemData: { item: i } });
                    returnData.push(...executionErrorData);
                    continue;
                }
                throw error;
            }
            const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(responseData), { itemData: { item: i } });
            returnData.push(...executionData);
        }
        return [returnData];
    }
}
//# sourceMappingURL=GoToWebinar.node.js.map