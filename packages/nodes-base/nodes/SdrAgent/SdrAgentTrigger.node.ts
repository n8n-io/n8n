import {
	INodeType,
	INodeTypeDescription,
	ITriggerFunctions,
	ITriggerResponse,
	NodeConnectionType,
} from 'n8n-workflow';
import {
	adjustTimeByOffset,
	checkDynamicObject,
	checkTimeSlotDayWise,
	createDynamicObject,
	getWeekDayOfToday,
	NormalObjT,
	toCamelCase,
} from './helper';
import Retell from 'retell-sdk';
import { getDbConnection } from '@utils/db';

export class SdrAgentTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'SDR Agent Trigger',
		name: 'sdrAgentTrigger',
		group: ['trigger'],
		version: 1,
		description: 'Triggers when a new call needs to be made based on retry rules.',
		defaults: {
			name: 'SDR Agent Trigger',
			color: '#FF5733',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		properties: [
			{
				displayName: 'Retry After (Days)',
				name: 'retryAfterDays',
				type: 'number',
				default: 1,
				description: 'Number of days to wait before retrying failed calls.',
			},
		],
	};

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const workflowData = this.getWorkflowStaticData('global');

		const segmentId = workflowData.segmentId as number;
		const sdrAgentId = workflowData.sdrAgentId as number;

		const retryAfterDays = this.getNodeParameter('retryAfterDays', 0) as number;

		if (!sdrAgentId || !segmentId) {
			throw new Error('SDR Agent ID and Segment ID are required.');
		}

		const connection = await getDbConnection();

		let [sdrAgent] = (await connection.execute(
			`SELECT 
                sa.*, 
                sasd.scheduling_hours, 
                sasd.retry_after_days, 
                sasd.max_attempts, 
                sasd.is_enabled, 
                sasd.timezone, 
                sasd.company_id AS schedulingCompanyId, 
                tz.*
            FROM sdr_agents AS sa
            JOIN s_a_scheduling_details AS sasd ON sa.id = sasd.sdr_agent_id
            JOIN timezones AS tz ON sasd.timezone = tz.id
            WHERE sa.id = ?
            AND sa.status = 'ACTIVE'
            AND sasd.is_enabled = TRUE`,
			[sdrAgentId],
		)) as any[];

		if (sdrAgent.length) {
			sdrAgent = sdrAgent[0];

			const { scheduling_hours } = sdrAgent;
			const todaysDayOfTheWeek = getWeekDayOfToday(sdrAgent.offset);

			if (scheduling_hours) {
				const schedulingHoursParsed = scheduling_hours;
				const isAvailable = checkTimeSlotDayWise(
					schedulingHoursParsed,
					todaysDayOfTheWeek,
					sdrAgent.offset,
				);

				if (isAvailable) {
					const [contacts] = await connection.execute(
						`
                        SELECT 
                            DISTINCT cal.*, 
                            sdr_agent.agent_phone_number,
                            sdr_agent.id AS agent_id,
                            sdr_agent.dynamic_variables AS dynamic_variables,
                            sdr_agent.uid AS agent_uid,
                            sdr_agent.general_tools AS general_tools,
                            sdr_agent.retell_steps AS retell_steps
                        FROM customers_and_leads_segments AS cals
                        JOIN customers_and_leads AS cal 
                            ON cals.customers_and_leads_id = cal.id
                        LEFT JOIN sdr_agents_call_details AS sacd 
                            ON sacd.lead_id = cal.id
                        LEFT JOIN sdr_agents AS sdr_agent 
                            ON sdr_agent.id = cal.sdr_agent_id
                        LEFT JOIN s_a_scheduling_details AS scheduling
                            ON scheduling.sdr_agent_id = sdr_agent.id
                        WHERE 
                            cals.segment_id = ?
                            AND cal.status NOT IN ('calling', 'non-responsive', 'do-not-call')
                            AND (cal.status != 'call-back' 
                                OR (CONVERT_TZ(NOW(), '+00:00', IFNULL(?, "+00:00")) >= 
                                    CONVERT_TZ(cal.callback_timestamp, '+00:00', IFNULL(?, "+00:00"))))
                            AND (
                                (SELECT COUNT(*) 
                                FROM sdr_agents_call_details AS calls 
                                WHERE calls.lead_id = cal.id) < 
                                (SELECT max_attempts 
                                FROM s_a_scheduling_details AS scheduling 
                                WHERE scheduling.sdr_agent_id = sdr_agent.id)
                                AND COALESCE((
                                    SELECT MAX(calls.created_at) 
                                    FROM sdr_agents_call_details AS calls 
                                    WHERE calls.lead_id = cal.id
                                ), '1970-01-01') <= 
                                DATE_SUB(NOW(), INTERVAL 
                                    COALESCE(?, 0) DAY)
                            )            
                        `,
						[segmentId, sdrAgent.offset, sdrAgent.offset, retryAfterDays],
					);
					console.log(contacts);
					// await scheduleLeadsCalls(contacts);

					// for (const contact of contacts as any[]) {
					//     const { id, phone_number } = contact;

					//     console.log(`Calling ${phone_number}...`);

					//     try {
					//         const callResult = await makeCall(phone_number);

					//         console.log(`Call successful for ${phone_number}`);

					//         await updateCallStatus(id, 'completed');
					//     } catch (error) {
					//         console.error(`Call failed for ${phone_number}, retrying after ${retryAfterDays} days.`);

					//         await updateCallStatus(id, 'failed');
					//     }
					// }
				}
			}
		}

		return {
			closeFunction: async () => {
				console.log('Trigger node stopped.');
			},
		};
	}
}

// async function updateCallStatus(contactId: number, status: string): Promise<void> {
//     const connection = await getDbConnection();
//     await connection.execute(
//         'UPDATE contacts SET call_status = ?, last_called_at = NOW() WHERE id = ?',
//         [status, contactId]
//     );
// }

// async function getCompanyRetellKey(id: number): Promise<string | null> {
//     const connection = await getDbConnection();
//     const [companies] = await connection.execute(`SELECT * FROM companies WHERE id = ?`, [id]) as any[];
//     return companies.length ? companies[0].retell_api_key : null;
// }

// async function getRetellClient(companyId: number): Promise<Retell> {
//     const apiKey = await getCompanyRetellKey(companyId);
//     if (!apiKey) {
//         throw new Error('API key not found for the company');
//     }
//     return new Retell({ apiKey });
// };

// async function createPhoneCall(
//     fromNumber: string,
//     toNumber: string,
//     dynamicVariables: NormalObjT,
//     companyId: number
// ) {
//     const RetellClient = await getRetellClient(companyId)

//     return RetellClient.call.createPhoneCall({
//         from_number: fromNumber,
//         to_number: toNumber,
//         retell_llm_dynamic_variables: dynamicVariables,
//     });
// }

// async function scheduleLeadsCalls(allNotContactedLeads: any[]) {
//     const createCallPromises = allNotContactedLeads.map(
//         async (notContactedLead) => {
//             const leadInfo = toCamelCase(notContactedLead)
//             const agentPhoneNumber = leadInfo.agentPhoneNumber;
//             try {
//                 if (agentPhoneNumber) {
//                     console.log(
//                         `Initiating call from ${agentPhoneNumber} to ${leadInfo.phoneNumber} `,
//                     );
//                     const dynamicVariables = JSON.parse(leadInfo.dynamicVariables) as string[] || []
//                     dynamicVariables.push('companyName')

//                     const dynamicVariableObj = createDynamicObject(JSON.parse(leadInfo?.customFields))
//                     dynamicVariableObj['leadName'] = (leadInfo.name).split(' ')[0]
//                     dynamicVariableObj['productName'] = leadInfo.productOfInterest
//                     dynamicVariableObj['currentTime'] = adjustTimeByOffset(new Date(), leadInfo.offset)
//                     dynamicVariableObj['companyName'] = leadInfo.companyName

//                     const checkDynamicObj = checkDynamicObject(dynamicVariables, { ...dynamicVariableObj, ...leadInfo })

//                     if (checkDynamicObj) {
//                         const createdCallData = await createPhoneCall(
//                             agentPhoneNumber,
//                             leadInfo.phoneNumber,
//                             dynamicVariableObj,
//                             leadInfo.companyId
//                         );
//                         const sdrAgentCallDetailsDataToInsert = {
//                             sdrAgentId: leadInfo.agentId,
//                             callCurrentStatus: createdCallData.call_status,
//                             retellCallId: createdCallData.call_id,
//                             companyId: leadInfo.companyId,
//                             leadId: leadInfo?.id,
//                         };
//                         // const sdrAgentCall = await this.sdrAgentsService.storeSdrAgentCallDetails(
//                         //     sdrAgentCallDetailsDataToInsert,
//                         // );

//                         // await this.mongodbService.insert(MongoDBCollection.REQUEST_RESPONSE_LOG, { action: ActionTypeE.CREATE, entityId: sdrAgentCall.id, entityType: 'sdr_agents_call_details', platform: PlatformTypeE.RETELL, callId: createdCallData.call_id, retellCall: createdCallData, companyId: sdrAgentCall.companyId, leadId: leadInfo.id })

//                         // await CustomerAndLeadsModel.query()
//                         //     .update({
//                         //         status: LeadStatusTypesE.CALLING,
//                         //         callbackTimestamp: null
//                         //     })
//                         //     .where({ id: leadInfo.id })
//                     } else {
//                         console.log('not eligible for call - ', leadInfo.id)
//                     }
//                 }
//             } catch (error) {
//                 console.log('call executer error ', error)
//             }
//         },
//     );
//     await Promise.allSettled(createCallPromises);
// }
