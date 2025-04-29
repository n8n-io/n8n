import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Test MicrosoftOutlookV2, contact => event', () => {
	nock('https://graph.microsoft.com/v1.0/me')
		.post(
			'/calendars/AAMkADlhOTA0MTc5LWUwOTMtNDRkZS05NzE0LTNlYmI0ZWM5OWI5OABGAAAAAABPLqzvT6b9RLP0CKzHiJrRBwBZf4De-LkrSqpPI8eyjUmAAAAAAAEGAABZf4De-LkrSqpPI8eyjUmAAAAJ9-JDAAA=/events',
			{
				body: { content: 'event description', contentType: 'html' },
				bodyPreview: 'preview',
				categories: ['Yellow category', 'Orange category'],
				end: { dateTime: '2023-09-06T07:56:47.000Z', timeZone: 'UTC' },
				hideAttendees: true,
				importance: 'normal',
				isAllDay: false,
				isCancelled: false,
				isDraft: false,
				isOnlineMeeting: true,
				sensitivity: 'personal',
				showAs: 'busy',
				start: { dateTime: '2023-09-05T07:26:47.000Z', timeZone: 'UTC' },
				subject: 'New Event',
				type: 'occurrence',
			},
		)
		.reply(200, {
			'@odata.context':
				"https://graph.microsoft.com/v1.0/$metadata#users('b834447b-6848-4af9-8390-d2259ce46b74')/calendars('AAMkADlhOTA0MTc5LWUwOTMtNDRkZS05NzE0LTNlYmI0ZWM5OWI5OABGAAAAAABPLqzvT6b9RLP0CKzHiJrRBwBZf4De-LkrSqpPI8eyjUmAAAAAAAEGAABZf4De-LkrSqpPI8eyjUmAAAAJ9-JDAAA%3D')/events/$entity",
			'@odata.etag': 'W/"WX+A3vy5K0qqTyPHso1JgAABVtwgEQ=="',
			id: 'AAMkADlhOTA0MTc5LWUwOTMtNDRkZS05NzE0LTNlYmI0ZWM5OWI5OABGAAAAAABPLqzvT6b9RLP0CKzHiJrRBwBZf4De-LkrSqpPI8eyjUmAAAAAAAENAABZf4De-LkrSqpPI8eyjUmAAAFXBFUSAAA=',
			createdDateTime: '2023-09-04T10:12:47.1985121Z',
			lastModifiedDateTime: '2023-09-04T10:12:48.2173253Z',
			changeKey: 'WX+A3vy5K0qqTyPHso1JgAABVtwgEQ==',
			categories: ['Yellow category', 'Orange category'],
			transactionId: null,
			originalStartTimeZone: 'UTC',
			originalEndTimeZone: 'UTC',
			iCalUId:
				'040000008200E00074C5B7101A82E0080000000062DD545A18DFD90100000000000000001000000004C50947C7B42140B29018ABAB42C965',
			reminderMinutesBeforeStart: 15,
			isReminderOn: true,
			hasAttachments: false,
			subject: 'New Event',
			bodyPreview:
				'event description\r\n________________________________________________________________________________\r\nMicrosoft Teams meeting\r\nJoin on your computer, mobile app or room device\r\nClick here to join the meeting\r\nMeeting ID: 355 132 640 047\r\nPasscode: xgUo7v',
			importance: 'normal',
			sensitivity: 'personal',
			isAllDay: false,
			isCancelled: false,
			isOrganizer: true,
			responseRequested: true,
			seriesMasterId: null,
			showAs: 'busy',
			type: 'singleInstance',
			webLink:
				'https://outlook.office365.com/owa/?itemid=AAMkADlhOTA0MTc5LWUwOTMtNDRkZS05NzE0LTNlYmI0ZWM5OWI5OABGAAAAAABPLqzvT6b9RLP0CKzHiJrRBwBZf4De%2FLkrSqpPI8eyjUmAAAAAAAENAABZf4De%2FLkrSqpPI8eyjUmAAAFXBFUSAAA%3D&exvsurl=1&path=/calendar/item',
			onlineMeetingUrl: null,
			isOnlineMeeting: true,
			onlineMeetingProvider: 'teamsForBusiness',
			allowNewTimeProposals: true,
			occurrenceId: null,
			isDraft: false,
			hideAttendees: true,
			responseStatus: {
				response: 'organizer',
				time: '0001-01-01T00:00:00Z',
			},
			body: {
				contentType: 'html',
				content:
					'<html>\r\n<head>\r\n<meta http-equiv="Content-Type" content="text/html; charset=utf-8">\r\n</head>\r\n<body>\r\nevent description<br>\r\n<div style="width:100%"><span style="white-space:nowrap; color:#5F5F5F; opacity:.36">________________________________________________________________________________</span>\r\n</div>\r\n<div class="me-email-text" lang="en-US" style="color:#252424; font-family:\'Segoe UI\',\'Helvetica Neue\',Helvetica,Arial,sans-serif">\r\n<div style="margin-top:24px; margin-bottom:20px"><span style="font-size:24px; color:#252424">Microsoft Teams meeting</span>\r\n</div>\r\n<div style="margin-bottom:20px">\r\n<div style="margin-top:0px; margin-bottom:0px; font-weight:bold"><span style="font-size:14px; color:#252424">Join on your computer, mobile app or room device</span>\r\n</div>\r\n<a href="https://teams.microsoft.com/l/meetup-join/19%3ameeting_MDZmMzZmYzYtMDc4Yi00NTA2LWE3MTMtZDc5ZDI1M2JmY2M3%40thread.v2/0?context=%7b%22Tid%22%3a%2223786ca6-7ff2-4672-87d0-5c649ee0a337%22%2c%22Oid%22%3a%22b834447b-6848-4af9-8390-d2259ce46b74%22%7d" class="me-email-headline" style="font-size:14px; font-family:\'Segoe UI Semibold\',\'Segoe UI\',\'Helvetica Neue\',Helvetica,Arial,sans-serif; text-decoration:underline; color:#6264a7">Click\r\n here to join the meeting</a> </div>\r\n<div style="margin-bottom:20px; margin-top:20px">\r\n<div style="margin-bottom:4px"><span data-tid="meeting-code" style="font-size:14px; color:#252424">Meeting ID:\r\n<span style="font-size:16px; color:#252424">355 132 640 047</span> </span><br>\r\n<span style="font-size:14px; color:#252424">Passcode: </span><span style="font-size:16px; color:#252424">xgUo7v\r\n</span>\r\n<div style="font-size:14px"><a href="https://www.microsoft.com/en-us/microsoft-teams/download-app" class="me-email-link" style="font-size:14px; text-decoration:underline; color:#6264a7; font-family:\'Segoe UI\',\'Helvetica Neue\',Helvetica,Arial,sans-serif">Download\r\n Teams</a> | <a href="https://www.microsoft.com/microsoft-teams/join-a-meeting" class="me-email-link" style="font-size:14px; text-decoration:underline; color:#6264a7; font-family:\'Segoe UI\',\'Helvetica Neue\',Helvetica,Arial,sans-serif">\r\nJoin on the web</a></div>\r\n</div>\r\n</div>\r\n<div style="margin-bottom:24px; margin-top:20px"><a href="https://aka.ms/JoinTeamsMeeting" class="me-email-link" style="font-size:14px; text-decoration:underline; color:#6264a7; font-family:\'Segoe UI\',\'Helvetica Neue\',Helvetica,Arial,sans-serif">Learn More</a>\r\n | <a href="https://teams.microsoft.com/meetingOptions/?organizerId=b834447b-6848-4af9-8390-d2259ce46b74&amp;tenantId=23786ca6-7ff2-4672-87d0-5c649ee0a337&amp;threadId=19_meeting_MDZmMzZmYzYtMDc4Yi00NTA2LWE3MTMtZDc5ZDI1M2JmY2M3@thread.v2&amp;messageId=0&amp;language=en-US" class="me-email-link" style="font-size:14px; text-decoration:underline; color:#6264a7; font-family:\'Segoe UI\',\'Helvetica Neue\',Helvetica,Arial,sans-serif">\r\nMeeting options</a> </div>\r\n</div>\r\n<div style="font-size:14px; margin-bottom:4px; font-family:\'Segoe UI\',\'Helvetica Neue\',Helvetica,Arial,sans-serif">\r\n</div>\r\n<div style="font-size:12px"></div>\r\n<div></div>\r\n<div style="width:100%"><span style="white-space:nowrap; color:#5F5F5F; opacity:.36">________________________________________________________________________________</span>\r\n</div>\r\n</body>\r\n</html>\r\n',
			},
			start: {
				dateTime: '2023-09-05T07:26:47.0000000',
				timeZone: 'UTC',
			},
			end: {
				dateTime: '2023-09-06T07:56:47.0000000',
				timeZone: 'UTC',
			},
			location: {
				displayName: 'Microsoft Teams Meeting',
				locationType: 'default',
				uniqueId: 'Microsoft Teams Meeting',
				uniqueIdType: 'private',
			},
			locations: [
				{
					displayName: 'Microsoft Teams Meeting',
					locationType: 'default',
					uniqueId: 'Microsoft Teams Meeting',
					uniqueIdType: 'private',
				},
			],
			recurrence: null,
			attendees: [],
			organizer: {
				emailAddress: {
					name: 'Michael Kret',
					address: 'MichaelDevSandbox@5w1hb7.onmicrosoft.com',
				},
			},
			onlineMeeting: {
				joinUrl:
					'https://teams.microsoft.com/l/meetup-join/19%3ameeting_MDZmMzZmYzYtMDc4Yi00NTA2LWE3MTMtZDc5ZDI1M2JmY2M3%40thread.v2/0?context=%7b%22Tid%22%3a%2223786ca6-7ff2-4672-87d0-5c649ee0a337%22%2c%22Oid%22%3a%22b834447b-6848-4af9-8390-d2259ce46b74%22%7d',
			},
		});

	new NodeTestHarness().setupTests({
		workflowFiles: ['create.workflow.json'],
	});
});
