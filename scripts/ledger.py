"""Read Receiver General payment rows without rounding amounts or merging product codes."""
import csv
from datetime import date
from decimal import Decimal
import io
import json
import re
from html.parser import HTMLParser

BASE = 'https://donnees-data.tpsgc-pwgsc.gc.ca/ba1/domestiquespaie-domesticpay/'
CSV_URL = BASE + 'domestiquespaie-domesticpay.csv'
GUIDE_URL = BASE + 'soutien-support-eng.html'
FIELDS = ['DepartmentNumber', 'Product-Code', 'Fiscal-Year', 'Fiscal-Month', 'Payments-Total-Volume',
          'Payments-Total-Amount', 'LVTS-Payments-Volume', 'LVTS-Payments-Amount',
          'DD-Payments-Volume', 'DD-Payments-Amount', 'EDI-Payments-Volume', 'EDI-Payments-Amount',
          'Cheques-Payments-Volume', 'Cheques-Payments-Amount']

class ProductNames(HTMLParser):
    def __init__(self):
        super().__init__()
        self.names = {}
        self.row = []
        self.cell = None

    def handle_starttag(self, tag, attrs):
        if tag == 'tr':
            self.row = []
        if tag == 'td':
            self.cell = []

    def handle_data(self, value):
        if self.cell is not None:
            self.cell.append(value)

    def handle_endtag(self, tag):
        if tag == 'td' and self.cell is not None:
            self.row.append(' '.join(''.join(self.cell).split()))
            self.cell = None
        if tag == 'tr' and len(self.row) == 2 and re.fullmatch(r'\d{10}', self.row[0]):
            self.names[self.row[0]] = self.row[1]

def calendar_period(years, month):
    first, last = map(int, years.split('-'))
    if last != first + 1 or not 1 <= month <= 12:
        raise ValueError('Unrecognized fiscal period')
    return date(first if month <= 9 else last, (month + 2) % 12 + 1, 1).isoformat()[:7]

def cents(text):
    number = Decimal(text) * 100
    if number != number.to_integral_value():
        raise ValueError('Fraction of a cent in source')
    return int(number)

def edition(raw, guide, retrieved):
    names = ProductNames()
    names.feed(guide.decode('utf-8-sig'))
    if not all(code in names.names for code in ('3020000000', '3030000000')):
        raise ValueError('Product definitions missing')
    reader = csv.reader(io.StringIO(raw.decode('utf-8-sig')))
    header = next(reader)
    if len(header) != len(FIELDS) or any(not field.startswith(base + '-') for field, base in zip(header, FIELDS)):
        raise ValueError('Unrecognized payment columns')
    series = {}
    periods = set()
    for source_row, fields in enumerate(reader, 2):
        dept, product, years, month = fields[:4]
        if len(fields) != len(FIELDS) or not re.fullmatch(r'\d{3}', dept) or not re.fullmatch(r'\d{10}', product):
            raise ValueError(f'Unrecognized identifier or row width at {source_row}')
        period = calendar_period(years, int(month))
        values = [int(v) if i % 2 == 0 else cents(v) for i, v in enumerate(fields[4:])]
        if values[:2] != [sum(values[2::2]), sum(values[3::2])]:
            raise ValueError(f'Payment methods do not reconcile at {source_row}')
        history = series.setdefault(dept + '-' + product, {})
        if period in history:
            raise ValueError(f'Duplicate payment record at {source_row}')
        history[period] = [source_row, years, int(month), *values]
        periods.add(period)
    if len(periods) < 100 or '014-3020000000' not in series or '014-3030000000' not in series:
        raise ValueError('Historical coverage incomplete')
    metadata = {'retrieved':retrieved, 'start':min(periods), 'through':max(periods),
                'source':CSV_URL, 'definitions':GUIDE_URL, 'months':sorted(periods),
                'row_count':sum(map(len,series.values())), 'program_count':len(series),
                'programs':{key:names.names.get(key.split('-')[1], 'Product ' + key.split('-')[1]) for key in sorted(series)}}
    return {'index':metadata, 'series':series}

def write_site(archive, target):
    import gzip
    data = json.loads(gzip.decompress(archive.read_bytes()))
    target.mkdir(parents=True, exist_ok=True)
    for name, value in [('index', data['index']), *data['series'].items()]:
        (target / (name + '.json')).write_text(json.dumps(value, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
