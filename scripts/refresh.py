"""Update the bundled edition only after the full public files pass validation."""
from datetime import datetime, timezone
import gzip
import hashlib
import json
from pathlib import Path
from urllib.request import Request, urlopen
from ledger import CSV_URL, GUIDE_URL, edition

ROOT = Path(__file__).resolve().parents[1]

def download(url):
    with urlopen(Request(url, headers={'User-Agent': 'CoolCode Paper Cheque Trail'}), timeout=90) as response:
        return response.read()

def main():
    raw, guide = download(CSV_URL), download(GUIDE_URL)
    data = edition(raw, guide, datetime.now(timezone.utc).date().isoformat())
    target = ROOT / 'data' / 'edition.json.gz'
    index = data['index']
    index['source_sha256'] = hashlib.sha256(raw).hexdigest()
    if target.exists():
        prev = json.loads(gzip.decompress(target.read_bytes()))['index']
        if index['start'] > prev['start'] or index['through'] < prev['through']:
            raise ValueError('The new source lost historical coverage. Review before replacing the edition.')
    temporary = target.with_suffix('.tmp')
    temporary.write_bytes(gzip.compress(json.dumps(data, ensure_ascii=False, separators=(',', ':')).encode(), mtime=0))
    temporary.replace(target)
    print(f"{index['row_count']} rows through {index['through']}")

if __name__ == '__main__':
    main()
