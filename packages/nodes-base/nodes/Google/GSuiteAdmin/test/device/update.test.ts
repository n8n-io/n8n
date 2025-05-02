import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Google GSuiteAdmin Node', () => {
	beforeEach(() => {
		nock.disableNetConnect();
		nock('https://www.googleapis.com/admin')
			.put(
				'/directory/v1/customer/my_customer/devices/chromeos/9990fpff-8ba8-4444-8555-f7ee88881b4c',
			)
			.reply(200, {
				kind: 'admin#directory#chromeosdevice',
				etag: '"example"',
				deviceId: '9990fpff-8ba8-4444-8555-f7ee88881b4c',
				serialNumber: '5CC115NN33',
				status: 'DISABLED',
				lastSync: '2025-02-12T07:17:16.950Z',
				annotatedUser: 'my user',
				annotatedLocation: 'test',
				annotatedAssetId: '1234567788',
				notes: 'test',
				model: 'Test Model',
				osVersion: '129.0.6668.99',
				platformVersion: '16002.51.0 (Official Build) stable-channel reven',
				firmwareVersion: 'FirmwareNotParsed',
				macAddress: '666c8888ffccf',
				lastEnrollmentTime: '2025-02-10T17:03:10.324Z',
				firstEnrollmentTime: '2025-02-10T17:03:10.324Z',
				orgUnitPath: '/',
				orgUnitId: '00pp88a2z2uu88pp',
				recentUsers: [
					{
						type: 'USER_TYPE_MANAGED',
						email: 'admin-google@example.com',
					},
				],
				activeTimeRanges: [
					{
						date: '2025-02-10',
						activeTime: 300000,
					},
					{
						date: '2025-02-11',
						activeTime: 1920025,
					},
					{
						date: '2025-02-12',
						activeTime: 30000,
					},
				],
				tpmVersionInfo: {
					family: '0',
					specLevel: '0',
					manufacturer: '0',
					tpmModel: '0',
					firmwareVersion: '0',
					vendorSpecific: '',
				},
				cpuStatusReports: [
					{
						reportTime: '2025-02-10T17:03:13.233Z',
						cpuUtilizationPercentageInfo: [12],
					},
					{
						reportTime: '2025-02-10T17:04:13.233Z',
						cpuTemperatureInfo: [
							{
								temperature: 42,
								label: 'edge\n',
							},
							{
								temperature: 42,
								label: 'Tctl\n',
							},
							{
								temperature: 43,
								label: 'acpitz\n',
							},
						],
					},
					{
						reportTime: '2025-02-10T17:11:01.943Z',
						cpuUtilizationPercentageInfo: [28],
					},
					{
						reportTime: '2025-02-10T17:12:02.223Z',
						cpuTemperatureInfo: [
							{
								temperature: 42,
								label: 'edge\n',
							},
							{
								temperature: 51,
								label: 'Tctl\n',
							},
							{
								temperature: 43,
								label: 'acpitz\n',
							},
						],
					},
					{
						reportTime: '2025-02-10T17:47:32.621Z',
						cpuUtilizationPercentageInfo: [28],
					},
					{
						reportTime: '2025-02-10T17:48:42.770Z',
						cpuTemperatureInfo: [
							{
								temperature: 43,
								label: 'edge\n',
							},
							{
								temperature: 44,
								label: 'Tctl\n',
							},
							{
								temperature: 44,
								label: 'acpitz\n',
							},
						],
					},
					{
						reportTime: '2025-02-10T18:56:24.294Z',
						cpuUtilizationPercentageInfo: [29],
					},
					{
						reportTime: '2025-02-10T18:57:27.841Z',
						cpuTemperatureInfo: [
							{
								temperature: 34,
								label: 'edge\n',
							},
							{
								temperature: 35,
								label: 'Tctl\n',
							},
							{
								temperature: 35,
								label: 'acpitz\n',
							},
						],
					},
					{
						reportTime: '2025-02-10T23:04:56.582Z',
						cpuUtilizationPercentageInfo: [27],
					},
					{
						reportTime: '2025-02-10T23:05:56.563Z',
						cpuTemperatureInfo: [
							{
								temperature: 27,
								label: 'edge\n',
							},
							{
								temperature: 28,
								label: 'Tctl\n',
							},
							{
								temperature: 27,
								label: 'acpitz\n',
							},
						],
					},
					{
						reportTime: '2025-02-10T23:56:47.138Z',
						cpuUtilizationPercentageInfo: [28],
					},
					{
						reportTime: '2025-02-10T23:57:50.717Z',
						cpuTemperatureInfo: [
							{
								temperature: 39,
								label: 'edge\n',
							},
							{
								temperature: 39,
								label: 'Tctl\n',
							},
							{
								temperature: 40,
								label: 'acpitz\n',
							},
						],
					},
					{
						reportTime: '2025-02-11T07:49:44.333Z',
						cpuUtilizationPercentageInfo: [26],
					},
					{
						reportTime: '2025-02-11T07:50:48.473Z',
						cpuTemperatureInfo: [
							{
								temperature: 26,
								label: 'edge\n',
							},
							{
								temperature: 27,
								label: 'Tctl\n',
							},
							{
								temperature: 27,
								label: 'acpitz\n',
							},
						],
					},
					{
						reportTime: '2025-02-11T15:46:23.530Z',
						cpuUtilizationPercentageInfo: [27],
					},
					{
						reportTime: '2025-02-11T15:47:22.723Z',
						cpuTemperatureInfo: [
							{
								temperature: 27,
								label: 'edge\n',
							},
							{
								temperature: 28,
								label: 'Tctl\n',
							},
							{
								temperature: 27,
								label: 'acpitz\n',
							},
						],
					},
					{
						reportTime: '2025-02-11T15:52:40.368Z',
						cpuUtilizationPercentageInfo: [28],
					},
					{
						reportTime: '2025-02-11T15:53:41.233Z',
						cpuTemperatureInfo: [
							{
								temperature: 34,
								label: 'edge\n',
							},
							{
								temperature: 35,
								label: 'Tctl\n',
							},
							{
								temperature: 35,
								label: 'acpitz\n',
							},
						],
					},
					{
						reportTime: '2025-02-11T16:06:07.349Z',
						cpuUtilizationPercentageInfo: [30],
					},
					{
						reportTime: '2025-02-11T16:07:07.921Z',
						cpuTemperatureInfo: [
							{
								temperature: 39,
								label: 'edge\n',
							},
							{
								temperature: 39,
								label: 'Tctl\n',
							},
							{
								temperature: 40,
								label: 'acpitz\n',
							},
						],
					},
					{
						reportTime: '2025-02-11T16:13:28.511Z',
						cpuUtilizationPercentageInfo: [25],
					},
					{
						reportTime: '2025-02-11T16:14:27.628Z',
						cpuTemperatureInfo: [
							{
								temperature: 36,
								label: 'edge\n',
							},
							{
								temperature: 37,
								label: 'Tctl\n',
							},
							{
								temperature: 37,
								label: 'acpitz\n',
							},
						],
					},
					{
						reportTime: '2025-02-11T16:17:06.188Z',
						cpuUtilizationPercentageInfo: [27],
					},
					{
						reportTime: '2025-02-11T16:18:06.375Z',
						cpuTemperatureInfo: [
							{
								temperature: 40,
								label: 'edge\n',
							},
							{
								temperature: 41,
								label: 'Tctl\n',
							},
							{
								temperature: 42,
								label: 'acpitz\n',
							},
						],
					},
					{
						reportTime: '2025-02-11T16:36:20.232Z',
						cpuUtilizationPercentageInfo: [27],
					},
					{
						reportTime: '2025-02-11T16:37:20.599Z',
						cpuTemperatureInfo: [
							{
								temperature: 45,
								label: 'edge\n',
							},
							{
								temperature: 58,
								label: 'Tctl\n',
							},
							{
								temperature: 45,
								label: 'acpitz\n',
							},
						],
					},
					{
						reportTime: '2025-02-11T16:48:45.267Z',
						cpuUtilizationPercentageInfo: [27],
					},
					{
						reportTime: '2025-02-11T16:49:44.854Z',
						cpuTemperatureInfo: [
							{
								temperature: 42,
								label: 'edge\n',
							},
							{
								temperature: 44,
								label: 'Tctl\n',
							},
							{
								temperature: 44,
								label: 'acpitz\n',
							},
						],
					},
					{
						reportTime: '2025-02-12T06:35:29.337Z',
						cpuUtilizationPercentageInfo: [30],
					},
					{
						reportTime: '2025-02-12T06:36:28.433Z',
						cpuTemperatureInfo: [
							{
								temperature: 42,
								label: 'edge\n',
							},
							{
								temperature: 42,
								label: 'Tctl\n',
							},
							{
								temperature: 42,
								label: 'acpitz\n',
							},
						],
					},
				],
				systemRamTotal: '16089374720',
				systemRamFreeReports: [
					{
						reportTime: '2025-02-10T17:03:13.230Z',
						systemRamFreeInfo: ['13905453056'],
					},
					{
						reportTime: '2025-02-10T17:11:01.697Z',
						systemRamFreeInfo: ['15221055488'],
					},
					{
						reportTime: '2025-02-10T17:47:32.153Z',
						systemRamFreeInfo: ['15237283840'],
					},
					{
						reportTime: '2025-02-10T18:56:23.878Z',
						systemRamFreeInfo: ['15228760064'],
					},
					{
						reportTime: '2025-02-10T23:04:56.127Z',
						systemRamFreeInfo: ['15228022784'],
					},
					{
						reportTime: '2025-02-10T23:56:46.839Z',
						systemRamFreeInfo: ['15226499072'],
					},
					{
						reportTime: '2025-02-11T07:49:43.939Z',
						systemRamFreeInfo: ['15229087744'],
					},
					{
						reportTime: '2025-02-11T15:46:23.165Z',
						systemRamFreeInfo: ['15226187776'],
					},
					{
						reportTime: '2025-02-11T15:52:39.966Z',
						systemRamFreeInfo: ['15226843136'],
					},
					{
						reportTime: '2025-02-11T16:06:06.871Z',
						systemRamFreeInfo: ['15225753600'],
					},
					{
						reportTime: '2025-02-11T16:13:28.176Z',
						systemRamFreeInfo: ['15228182528'],
					},
					{
						reportTime: '2025-02-11T16:17:05.936Z',
						systemRamFreeInfo: ['15223095296'],
					},
					{
						reportTime: '2025-02-11T16:36:19.897Z',
						systemRamFreeInfo: ['15226126336'],
					},
					{
						reportTime: '2025-02-11T16:48:44.934Z',
						systemRamFreeInfo: ['15226707968'],
					},
					{
						reportTime: '2025-02-12T06:35:28.949Z',
						systemRamFreeInfo: ['15222706176'],
					},
				],
				diskVolumeReports: [
					{
						volumeInfo: [
							{
								volumeId: '/media/archive',
								storageTotal: '8044687360',
								storageFree: '8044687360',
							},
							{
								volumeId: '/media/removable',
								storageTotal: '8044687360',
								storageFree: '8044687360',
							},
						],
					},
				],
				lastKnownNetwork: [
					{
						ipAddress: '192.168.0.106',
						wanIpAddress: '87.121.13.137',
					},
				],
				cpuInfo: [
					{
						model: 'AMD Ryzen 5 4500U with Radeon Graphics',
						architecture: 'x64',
						maxClockSpeedKhz: 2375000,
						logicalCpus: [
							{
								maxScalingFrequencyKhz: 2375000,
								currentScalingFrequencyKhz: 1397253,
								idleDuration: '60s',
								cStates: [
									{
										displayName: 'C3',
										sessionDuration: '59.509354s',
									},
									{
										displayName: 'C1',
										sessionDuration: '1.338153s',
									},
									{
										displayName: 'C2',
										sessionDuration: '0.241264s',
									},
									{
										displayName: 'POLL',
										sessionDuration: '0.004477s',
									},
								],
							},
							{
								maxScalingFrequencyKhz: 2375000,
								currentScalingFrequencyKhz: 1397372,
								idleDuration: '60s',
								cStates: [
									{
										displayName: 'C3',
										sessionDuration: '58.861175s',
									},
									{
										displayName: 'C1',
										sessionDuration: '1.335068s',
									},
									{
										displayName: 'C2',
										sessionDuration: '0.761853s',
									},
									{
										displayName: 'POLL',
										sessionDuration: '0.007583s',
									},
								],
							},
							{
								maxScalingFrequencyKhz: 2375000,
								currentScalingFrequencyKhz: 1397454,
								idleDuration: '58s',
								cStates: [
									{
										displayName: 'C3',
										sessionDuration: '57.457528s',
									},
									{
										displayName: 'C1',
										sessionDuration: '1.280076s',
									},
									{
										displayName: 'C2',
										sessionDuration: '0.167642s',
									},
									{
										displayName: 'POLL',
										sessionDuration: '0.003444s',
									},
								],
							},
							{
								maxScalingFrequencyKhz: 2375000,
								currentScalingFrequencyKhz: 1397348,
								idleDuration: '59s',
								cStates: [
									{
										displayName: 'C3',
										sessionDuration: '58.906343s',
									},
									{
										displayName: 'C1',
										sessionDuration: '1.101873s',
									},
									{
										displayName: 'C2',
										sessionDuration: '0.119013s',
									},
									{
										displayName: 'POLL',
										sessionDuration: '0.009095s',
									},
								],
							},
							{
								maxScalingFrequencyKhz: 2375000,
								currentScalingFrequencyKhz: 1383188,
								idleDuration: '60s',
								cStates: [
									{
										displayName: 'C3',
										sessionDuration: '59.476621s',
									},
									{
										displayName: 'C1',
										sessionDuration: '1.048691s',
									},
									{
										displayName: 'C2',
										sessionDuration: '0.192808s',
									},
									{
										displayName: 'POLL',
										sessionDuration: '0.003546s',
									},
								],
							},
							{
								maxScalingFrequencyKhz: 2375000,
								currentScalingFrequencyKhz: 1397437,
								idleDuration: '60s',
								cStates: [
									{
										displayName: 'C3',
										sessionDuration: '60.155800s',
									},
									{
										displayName: 'C1',
										sessionDuration: '0.681644s',
									},
									{
										displayName: 'C2',
										sessionDuration: '0.143131s',
									},
									{
										displayName: 'POLL',
										sessionDuration: '0.004276s',
									},
								],
							},
						],
					},
				],
				extendedSupportEligible: false,
				chromeOsType: 'chromeOsFlex',
				diskSpaceUsage: {
					capacityBytes: '549755813888',
					usedBytes: '85613068288',
				},
			});
	});

	new NodeTestHarness().setupTests({
		workflowFiles: ['update.workflow.json'],
	});
});
