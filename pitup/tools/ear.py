import sys, json
from earshot import api
for f in sys.argv[1:]:
    r = api.realness(f); d = api.describe(f)
    print('==', f.split('/')[-1]); print(json.dumps(r, default=str)[:700]); print(json.dumps(d, default=str)[:900])
