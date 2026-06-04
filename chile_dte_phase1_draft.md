# Chile DTE Phase 1 Draft (SIGMI)

Date: 2026-05-17

## Goal
Lay down auditable persistence and controlled folio allocation for Chile DTE on top of Sales.

## Scope Delivered in This Draft
1. New database tables:
- sii_caf_files
- sii_dte_documents
- sii_dte_events

2. New Lucid models:
- SiiCafFile
- SiiDteDocument
- SiiDteEvent

3. New CAF service draft:
- Upload CAF and optionally activate it for (business, dteType)
- Deactivate prior active CAF for same (business, dteType) when activating a new CAF
- Allocate folio with transaction + row lock
- Auto-deactivate CAF when folio range is exhausted

## Draft Data Flow
1. CAF Upload
- Endpoint (future): config/dte/caf/upload
- Persist CAF metadata + key reference in sii_caf_files
- Active CAF selected per business and DTE type

2. Folio Allocation
- DTE issue orchestration will call CafService.allocateNextFolio
- Service locks the active CAF row (FOR UPDATE)
- Returns one unique folio and advances next_folio

3. DTE Document Persistence
- DTE lifecycle (next phases) will create row in sii_dte_documents with:
  - Sale/business relation
  - DTE type and folio
  - Monetary totals
  - XML/TED artifacts
  - SII track id and status

4. Event Trail
- Every lifecycle transition writes to sii_dte_events
- Intended event types include: issued, signed, sent, status_checked, accepted, reparo, rejected, retry, error

## Next Steps (Phase 2)
1. DteBuilderService with deterministic field mapping from sale + details
2. TedService (DD build + SHA1withRSA with CAF key)
3. XmlSignatureService (XMLDSig for DTE/envelope)
4. Issue endpoint refactor to use DteLifecycleService and persist records in new tables
5. Idempotency rule: if sale has active non-canceled DTE, return existing document

## Notes
- This draft does not yet integrate SII transport or reconciliation worker.
- This draft keeps current sales metadata response shape while introducing the persistent backend foundation.
