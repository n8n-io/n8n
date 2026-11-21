import asyncio, os, ssl, sys
import edge_tts, edge_tts.communicate as c
# route through the session proxy and trust its CA (edge-tts pins certifi by default)
c._SSL_CTX = ssl.create_default_context(cafile="/root/.ccr/ca-bundle.crt")
voice, rate, src, out = sys.argv[1:5]
async def main():
    await edge_tts.Communicate(open(src).read().strip(), voice, rate=rate, proxy=os.environ.get("HTTPS_PROXY")).save(out)
asyncio.run(main())
