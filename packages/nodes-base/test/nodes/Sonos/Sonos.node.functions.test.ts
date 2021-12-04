import { IAllExecuteFunctions, ICredentialDataDecryptedObject, INodeParameters } from "n8n-workflow";
import { HELPER_TYPE, LoadOptionsFunctionsStub } from "../../TestHelper";
import { promisify } from "util";
import { loadHouseholds, loadPlayers, getFirstGroup, loadFavorites, playAudioClip, groupAll, executeGroupAction, playFavorite } from "../../../nodes/Sonos/GenericFunctions";
import { readFile } from "fs";
import { OptionsWithUrl, RequestPromiseOptions } from "request-promise-native";

const readFileAsync = promisify(readFile);

describe('Sonos Node', () => {
	let credentials: Map<string, ICredentialDataDecryptedObject>;
	let nodeParameters: INodeParameters = {};
	let optionsStub: LoadOptionsFunctionsStub;
	beforeEach(() => {
		credentials = new Map<string, ICredentialDataDecryptedObject>();
		credentials.set("sonosApi", {});
		optionsStub = new LoadOptionsFunctionsStub(credentials, nodeParameters);
	});
	describe("Configuration", () => {
		it('Fetches households', async () => {
			optionsStub.setHelper(HELPER_TYPE.requestOAuth2, async (): Promise<any> => {
				return readFileAsync("./test/nodes/Sonos/households.response.json", "utf-8");
			});
			const result = await loadHouseholds.call(optionsStub);
	
			expect(result.length).toEqual(1);
			expect(result[0].name).toEqual("Sonos_MyHouseholdId");
			expect(result[0].value).toEqual("Sonos_MyHouseholdId");
		});
		it('Fetches players', async () => {
			optionsStub.setHelper(HELPER_TYPE.requestOAuth2, async (): Promise<any> => {
				return readFileAsync("./test/nodes/Sonos/groups.response.json", "utf-8");
			});
			const result = await loadPlayers.call(optionsStub);
	
			expect(result.length).toEqual(2);
			expect(result[0].name).toEqual("Sonos Roam");
			expect(result[0].value).toEqual("RINCON_123456");
			expect(result[1].name).toEqual("Sonos Move");
			expect(result[1].value).toEqual("RINCON_1234567");
		});
		it('Fetches the first group', async () => {
			optionsStub.setHelper(HELPER_TYPE.requestOAuth2, async (): Promise<any> => {
				return readFileAsync("./test/nodes/Sonos/groups.response.json", "utf-8");
			});
			const result = await getFirstGroup.call(optionsStub);
	
			expect(result).toEqual("RINCON_1234567:1234");
		});
		it('Fetches Sonos Favorites', async () => {
			optionsStub.setHelper(HELPER_TYPE.requestOAuth2, async (): Promise<any> => {
				return readFileAsync("./test/nodes/Sonos/favorites.response.json", "utf-8");
			});
			const result = await loadFavorites.call(optionsStub);
	
			expect(result.length).toEqual(2);
			expect(result[0].name).toEqual("\"Kill Your Darlings\" // [DJ-Mix] By Dennis Kruissen - 10/2013");
			expect(result[0].value).toEqual("10");
			expect(result[1].name).toEqual("10Hz Bass Test");
			expect(result[1].value).toEqual("41");
		});
	});

	describe("Action", () => {
		it("Plays an Audio Clip", async () => {
			let callOptions: OptionsWithUrl | any = {};
			nodeParameters["player"] = "PLAYER_1";
			nodeParameters["url"] = "https://url";
			nodeParameters["volume"] = 50;
			optionsStub.setHelper(HELPER_TYPE.requestOAuth2, async (...args: any[]): Promise<any> => {
				callOptions = args[1];
				return readFileAsync("./test/nodes/Sonos/playAudioClip.response.json", "utf-8");
			});
			await playAudioClip.call(optionsStub);
			const body = JSON.parse(callOptions.body);
			expect(body.streamUrl).toEqual("https://url");
			expect(body.volume).toEqual(50);
			expect(callOptions.uri).toEqual("https://api.ws.sonos.com/control/api/v1/players/PLAYER_1/audioClip");
		});

		it("Groups all Players", async () => {
			let callOptions: OptionsWithUrl | any = {};
			nodeParameters["household"] = "HOUSEHOLD_1";
			optionsStub.setHelper(HELPER_TYPE.requestOAuth2, async (...args: any[]): Promise<any> => {
				callOptions = args[1];
				if (callOptions.uri.endsWith("/groups")) {
					return readFileAsync("./test/nodes/Sonos/groups.response.json", "utf-8");
				} else {
					return "{}";
				}
			});
			await groupAll.call(optionsStub);
			const body = JSON.parse(callOptions.body);
			expect(body.playerIds.length).toEqual(2);
			expect(callOptions.uri).toEqual("https://api.ws.sonos.com/control/api/v1/households/HOUSEHOLD_1/groups/createGroup");
		});

		it("Executes Group Action on First Group", async () => {
			let callOptions: OptionsWithUrl | any = {};
			nodeParameters["household"] = "HOUSEHOLD_1";
			optionsStub.setHelper(HELPER_TYPE.requestOAuth2, async (...args: any[]): Promise<any> => {
				callOptions = args[1];
				if (callOptions.uri.endsWith("/groups")) {
					return readFileAsync("./test/nodes/Sonos/groups.response.json", "utf-8");
				} else {
					return "{}";
				}
			});
			await executeGroupAction.call(optionsStub, "play");
			expect(callOptions.body).toEqual(undefined);
			expect(callOptions.uri).toEqual("https://api.ws.sonos.com/control/api/v1/groups/RINCON_1234567:1234/playback/play");
		});

		it("Plays Sonos Favorite on First Group", async () => {
			let callOptions: OptionsWithUrl | any = {};
			nodeParameters["household"] = "HOUSEHOLD_1";
			nodeParameters["favorite"] = "1";
			nodeParameters["shuffle"] = true;
			nodeParameters["repeat"] = true;
			nodeParameters["crossfade"] = true;
			optionsStub.setHelper(HELPER_TYPE.requestOAuth2, async (...args: any[]): Promise<any> => {
				callOptions = args[1];
				if (callOptions.uri.endsWith("/groups")) {
					return readFileAsync("./test/nodes/Sonos/groups.response.json", "utf-8");
				} else {
					return "{}";
				}
			});
			await playFavorite.call(optionsStub);
			
			const body = JSON.parse(callOptions.body);
			expect(body.favoriteId).toEqual("1");
			expect(body.playModes.shuffle).toEqual(true);
			expect(body.playModes.repeat).toEqual(true);
			expect(body.playModes.crossfade).toEqual(true);
			expect(callOptions.uri).toEqual("https://api.ws.sonos.com/control/api/v1/groups/RINCON_1234567:1234/favorites");
		});
	});
});
