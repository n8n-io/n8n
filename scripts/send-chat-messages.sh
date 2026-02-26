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
  -b 'rl_page_init_referrer=RudderEncrypt%3AU2FsdGVkX1%2BqTfXILCoX%2Ff7tWs2%2FkqI05FBl6J7hjZc%3D; rl_page_init_referring_domain=RudderEncrypt%3AU2FsdGVkX1%2FKxD7ApBprCfXkvEru%2BYYQZQsfqhbOggc%3D; n8n-auth=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFmNTA4MDQxLTU1YzMtNDI0NS05MDMyLWQ2ZTU4ZGQwNWRiNiIsImhhc2giOiJUNXlJWEJuZ0I1IiwiYnJvd3NlcklkIjoid3h2OWczWit5ZmJsbSt1S1NKMkFrVUJwbHQ1SFFnUkR3SWt3U290N1NYND0iLCJ1c2VkTWZhIjpmYWxzZSwiaWF0IjoxNzcyMDQzMzU2LCJleHAiOjE3NzI2NDgxNTZ9.UYze4uetHMmAN7TD7Pgh9AhqNna7b4A16ezqN8MP3Cg; rl_anonymous_id=RudderEncrypt%3AU2FsdGVkX19VkZF1uuagzIJAK8cPMsqUCm1FG1JgGn9Bsfp61BB2zW0P59YY2AqjtmB9rYY4HnvPpPO9VTl%2FVg%3D%3D; rl_user_id=RudderEncrypt%3AU2FsdGVkX1%2BuaTeQ1OuG%2BxmSe6iDC99koAKJzywNE5ywVQ6yy8sgO2RgQKgBVkgiD0kZkw%2F1kXNKGTjZ4zK63vJH0HBw%2BThTNpxiMYRzeNLAFchUGttzU%2BU4hm%2Fp4QFAGnIKKYWuRwvK7wJqD7zKHKZPMhZZEE91Qq90xcgEeFI%3D; rl_trait=RudderEncrypt%3AU2FsdGVkX19EI1o9TCpUcGT1mI7%2F4OLzIE3dK6%2BY9i7exb4crJFdcevcFI7aOfNdQUg7Xib428bkLf2DrnqsUYhho3otp8OI0CQHDQnIVaf8q5wYEsJw3TfG1c%2BOPr%2BQw9X1oF09GAGMZlL21wSiNbstsTTG0NVCEHVldFhHIaw%3D; rl_session=RudderEncrypt%3AU2FsdGVkX19ivnFvrZzzj47r1FVngIS1awcC9l7AFiB3ALxJDpKd1zzcmL%2FnLJAeaL15IRIf78DSKoCos%2Bhq8ruhgx9Fh6%2FV6OfIzd16wtxIqorfeJ%2B4vCRWvs8J2jGoF9MhLKTfCl7nLkv2z%2BCRzg%3D%3D; ph_phc_4URIAm1uYfJO7j8kWSe0J8lc8IqnstRLS7Jx8NcakHo_posthog=%7B%22%24device_id%22%3A%22019c08cd-214d-736a-a99e-ed8c00a9e527%22%2C%22distinct_id%22%3A%225d5f6b803a8531ae28fe23a0be4fe5d8c4e778a0e0b9a4fed9eabc15299828db%23af508041-55c3-4245-9032-d6e58dd05db6%22%2C%22%24sesid%22%3A%5B1772046901661%2C%22019c9603-ccb3-7dbc-a9b3-d189e6b38318%22%2C1772043357361%5D%2C%22%24epp%22%3Atrue%2C%22%24initial_person_info%22%3A%7B%22r%22%3A%22%24direct%22%2C%22u%22%3A%22http%3A%2F%2Flocalhost%3A5678%2Fsignout%22%7D%7D' \
  -H 'Origin: http://localhost:5678' \
  -H 'Pragma: no-cache' \
  -H 'Sec-Fetch-Dest: empty' \
  -H 'Sec-Fetch-Mode: cors' \
  -H 'Sec-Fetch-Site: same-origin' \
  -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36' \
  -H 'browser-id: a5a428ff-38ed-4013-8e8c-7f8481d0a923' \
  -H 'push-ref: 8nfk3kxybq' \
		-H 'sec-ch-ua: "Not:A-Brand";v="99", "Google Chrome";v="145", "Chromium";v="145"' \
		-H 'sec-ch-ua-mobile: ?0' \
		-H 'sec-ch-ua-platform: "macOS"' \
		--data-raw "{\"model\":{\"provider\":\"custom-agent\",\"agentId\":\"db279c1b-e260-48cd-9b09-29fe22b94808\"},\"messageId\":\"${MESSAGE_ID}\",\"sessionId\":\"${SESSION_ID}\",\"message\":\"${MESSAGE}\",\"credentials\":{},\"previousMessageId\":null,\"tools\":[],\"attachments\":[],\"agentName\":\"a\",\"timeZone\":\"Europe/Berlin\"}"

	echo
done
