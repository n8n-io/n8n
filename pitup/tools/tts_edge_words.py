import asyncio, json, os, ssl, sys
import edge_tts, edge_tts.communicate as c
c._SSL_CTX = ssl.create_default_context(cafile="/root/.ccr/ca-bundle.crt")
voice, rate, src, out, jout = sys.argv[1:6]
async def main():
    com = edge_tts.Communicate(open(src).read().strip(), voice, rate=rate, proxy=os.environ.get("HTTPS_PROXY"), boundary="WordBoundary")
    words = []
    with open(out, "wb") as f:
        async for ch in com.stream():
            if ch["type"] == "audio": f.write(ch["data"])
            elif ch["type"] in ("WordBoundary", "SentenceBoundary"): words.append({"t": ch["offset"] / 1e7, "d": ch["duration"] / 1e7, "w": ch["text"], "k": ch["type"]})
    json.dump(words, open(jout, "w"), ensure_ascii=False)
asyncio.run(main())
