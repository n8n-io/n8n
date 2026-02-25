#!/usr/bin/env bash
set -euo pipefail

COUNT=${1:-1}

if ! [[ "$COUNT" =~ ^[0-9]+$ ]] || [ "$COUNT" -lt 1 ]; then
	echo "Usage: $0 <count>" >&2
	exit 1
fi

MESSAGES=(
	"ancient civilizations social hierarchy"
	"how did the Roman Empire manage its economy"
	"what role did religion play in ancient Egypt"
	"trade routes of the Silk Road"
	"military strategies of Alexander the Great"
	"daily life in ancient Athens"
	"the fall of the Western Roman Empire"
	"Mesopotamian contributions to mathematics"
	"political structure of the Aztec Empire"
	"agricultural innovations in ancient China"
)

for i in $(seq 1 "$COUNT"); do
	INDEX=$(( (i - 1) % ${#MESSAGES[@]} ))
	MESSAGE=${MESSAGES[$INDEX]}
	MESSAGE_ID=$(uuidgen | tr '[:upper:]' '[:lower:]')
	SESSION_ID=$(uuidgen | tr '[:upper:]' '[:lower:]')
	echo "[$i/$COUNT] Sending messageId=$MESSAGE_ID sessionId=$SESSION_ID message=\"$MESSAGE\""

	curl 'http://localhost:5678/rest/chat/conversations/send' \
		-H 'Accept: application/json, text/plain, */*' \
		-H 'Accept-Language: en' \
		-H 'Cache-Control: no-cache' \
		-H 'Connection: keep-alive' \
		-H 'Content-Type: application/json' \
  -b 'rl_page_init_referrer=RudderEncrypt%3AU2FsdGVkX1%2BqTfXILCoX%2Ff7tWs2%2FkqI05FBl6J7hjZc%3D; rl_page_init_referring_domain=RudderEncrypt%3AU2FsdGVkX1%2FKxD7ApBprCfXkvEru%2BYYQZQsfqhbOggc%3D; n8n-auth=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImY3ZmY3OGE5LWU5N2ItNDE5ZS05NTNlLTcxMzMzZTEyMGVhYiIsImhhc2giOiJsRVNKYU5IZnhJIiwiYnJvd3NlcklkIjoid3h2OWczWit5ZmJsbSt1S1NKMkFrVUJwbHQ1SFFnUkR3SWt3U290N1NYND0iLCJ1c2VkTWZhIjpmYWxzZSwiaWF0IjoxNzcxOTM1MzQ3LCJleHAiOjE3NzI1NDAxNDd9.koxnIUkur0z5xZtAAoPow5bD0wVqdNvBexoJPyLbk9Y; rl_anonymous_id=RudderEncrypt%3AU2FsdGVkX1%2FIVF3vY2BDBMO%2Fcm3S%2BvF9Pb2weSNVDZ1XItbLcytn3kICX0O7TrWzcSPjAivD7Y8oiluppWTYfg%3D%3D; rl_user_id=RudderEncrypt%3AU2FsdGVkX19ON7B%2BtJJm9zhcy%2FJgrbhL4eivhlBRZWqrhp0AHRUDuWtLFUQGcQ9q697u7GMjmKsqEhnBk7WtKG2xdXnP1BMSbXMRmupftY6USNOAIDzqae%2BiehmvKejeXBHYcwwSkW483QKjv4Bdn7TIkakOME881nqPnfF7rPE%3D; rl_trait=RudderEncrypt%3AU2FsdGVkX1%2FT1OtQMVLHlgJMuANth5KlyOMhScKnBDmjWkuHzEZUwtYPOskYglKQvkl2I%2BATt86ZxTmEB64e0R5cDo1neUyHpxwTJucJDyhZK%2BMNsfkYlFoh%2BAuuWZXtOfP8Myt0o1X5PJDOhVLVvH4KT1FfuBsl9EnAcxbuhDE%3D; rl_session=RudderEncrypt%3AU2FsdGVkX19WxcIvSyWD2mdDx92DkPDApoPIBK96bRG6ZTYtsAwRI1PWMoBArPMqOnrhEDpFNBHGhcE%2FX0Qhzy1QpQ64R9nEDTp5rBP7rOtWeYnFmirinBZhWxKkyGz6DxmtPRs9bA7PYidRWJYfZQ%3D%3D; ph_phc_4URIAm1uYfJO7j8kWSe0J8lc8IqnstRLS7Jx8NcakHo_posthog=%7B%22%24device_id%22%3A%22019c08cd-214d-736a-a99e-ed8c00a9e527%22%2C%22distinct_id%22%3A%22498a58c5500d3519ac7f0d96d9195a1c1a2dac45edba6930a4f36429022410c9%23f7ff78a9-e97b-419e-953e-71333e120eab%22%2C%22%24sesid%22%3A%5B1771935514056%2C%22019c8f69-62bd-7cd4-ba1e-43802fbe1668%22%2C1771932574397%5D%2C%22%24epp%22%3Atrue%2C%22%24initial_person_info%22%3A%7B%22r%22%3A%22%24direct%22%2C%22u%22%3A%22http%3A%2F%2Flocalhost%3A5678%2Fsignout%22%7D%7D' \
  -H 'Origin: http://localhost:5678' \
  -H 'Pragma: no-cache' \
  -H 'Sec-Fetch-Dest: empty' \
  -H 'Sec-Fetch-Mode: cors' \
  -H 'Sec-Fetch-Site: same-origin' \
  -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36' \
  -H 'browser-id: a5a428ff-38ed-4013-8e8c-7f8481d0a923' \
  -H 'push-ref: chyptwe90m' \
		-H 'sec-ch-ua: "Not:A-Brand";v="99", "Google Chrome";v="145", "Chromium";v="145"' \
		-H 'sec-ch-ua-mobile: ?0' \
		-H 'sec-ch-ua-platform: "macOS"' \
		--data-raw "{\"model\":{\"provider\":\"custom-agent\",\"agentId\":\"480d97e3-11cf-45ce-8a61-259181bed283\"},\"messageId\":\"${MESSAGE_ID}\",\"sessionId\":\"${SESSION_ID}\",\"message\":\"${MESSAGE}\",\"credentials\":{},\"previousMessageId\":null,\"tools\":[],\"attachments\":[],\"agentName\":\"a\",\"timeZone\":\"Europe/Berlin\"}"

	echo
done
