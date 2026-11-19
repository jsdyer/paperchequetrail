import gzip
import json
from pathlib import Path
import sys
import unittest
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'scripts'))
from ledger import calendar_period, cents

class PaymentTests(unittest.TestCase):
    def test_fiscal_calendar(self):
        self.assertEqual(calendar_period('2025-2026', 10),'2026-01')
        self.assertEqual(calendar_period('2025-2026', 12),'2026-03')
        self.assertEqual(calendar_period('2026-2027', 1),'2026-04')

    def test_published_edition(self):
        data=json.loads(gzip.decompress((ROOT/'data/edition.json.gz').read_bytes()))
        for key in ('014-3020000000','014-3030000000'):
            self.assertIn(key,data['series'])
        self.assertEqual(data['index']['row_count'], sum(map(len,data['series'].values())))
        self.assertGreaterEqual(data['index']['through'],'2026-10')
        self.assertEqual(cents('166052000.71'),16605200071)
