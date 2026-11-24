# Paper Cheque Trail

[Open the payment ledger](https://coolcode.ca/paperchequetrail/)

Compare any two federal department and payment-product combinations by month. The ledger opens with Old Age Security and the Canada Pension Plan. Choose cheque counts, cheque value in Canadian dollars, the fraction of payments issued by cheque, or the fraction of their dollar value.

<!-- coolcode:guide -->
In October 2026, Old Age Security issued 172,555 cheques among 7,554,966 payments. Switch to count share to see 2.28%, compare it with CPP and open the monthly values for the source row behind either figure.
<!-- /coolcode:guide -->

## Reading the results

Each published record represents one department, one payment product and one fiscal month. April is month 1. The page preserves department numbers and product codes, including leading zeros, and follows the federal product dictionary where a name is available. The picker includes every combination in the edition, including discontinued and short-lived series.

Cheque count share divides cheque count by all payment counts in the same record. Value share uses the corresponding dollar amounts. A published zero is distinct from an unavailable month or an undefined share with a zero denominator. A record measures payments issued. The file cannot identify a unique recipient, a delivery date or when a cheque was cashed. The product dictionary also identifies electronic debit products in some other categories.

Each record links to its row number in the published CSV. Download the selected series to keep the record numbers, fiscal periods, exact integer cents, counts and program identifiers. The current view can be shared by copying its URL. The comparison loads from the project's own static files.

## Sources and maintenance

[Government of Canada — Domestic Payments](https://open.canada.ca/data/en/dataset/e19d7468-6f95-475a-bcfc-4141cad76268) · [Download the CSV](https://donnees-data.tpsgc-pwgsc.gc.ca/ba1/domestiquespaie-domesticpay/domestiquespaie-domesticpay.csv) · [Payment-product definitions](https://donnees-data.tpsgc-pwgsc.gc.ca/ba1/domestiquespaie-domesticpay/soutien-support-eng.html) · [Parliamentary written question Q-663](https://www.ourcommons.ca/written-questions/45-1/Q-663).

The launch edition contains 20,677 source rows, 243 department/product combinations and 103 calendar months from April 2018 through October 2026. The app displays the current edition’s dates. Source row numbers can move in later versions. The index publishes a SHA-256 digest of the federal CSV.

A monthly GitHub Actions job retrieves both federal files, validates the schema, unique keys, fiscal intervals and payment-method totals, saves the validated edition and deploys it. The compressed source snapshot is versioned so checks and ordinary builds work offline. A failed import stops deployment.

Run `python scripts/refresh.py` for a fresh edition, `node --test tests/*.test.mjs` and `python -m unittest discover -s tests` for checks, and `python scripts/build.py` to build. Preview with `python -m http.server --directory dist`.

<!-- schedule-reliability -->
## Schedule reliability

Public GitHub repositories can have scheduled workflows disabled after 60 days of inactivity. A separate weekly [schedule guard](.github/workflows/schedule-guard.yml) calls GitHub's enable-workflow API for an explicit list of refresh workflows and itself. It can restore workflows disabled for inactivity, preserves manually disabled workflows, and runs independently of collection failures.

This is an interim mitigation, not a scheduling guarantee: GitHub does not document active-workflow renewal as a permanent exemption, and scheduled runs can be delayed or dropped. A scheduler on our own Linux server is the planned independent trigger. The guard does not collect data, create dummy commits, or change source/check timestamps; successful collection and published data freshness still need monitoring.
<!-- /schedule-reliability -->
