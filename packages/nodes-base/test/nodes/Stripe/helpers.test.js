const helpers = require("../../../nodes/Stripe/helpers");

describe('adjustMetadata', () => {
	it('it should adjust multiple metadata values', async () => {
		const additionalFieldsValues = {
			metadata: {
				metadataProperties: [
					{
						key: "keyA",
						value: "valueA"
					},
					{
						key: "keyB",
						value: "valueB"
					},
				],
			},
		}

		const adjustedMetadata = helpers.adjustMetadata(additionalFieldsValues)

		const expectedAdjustedMetadata = {
			metadata: {
				keyA: "valueA",
				keyB: "valueB"
			}
		}
		expect(adjustedMetadata).toStrictEqual(expectedAdjustedMetadata)
	});
});
