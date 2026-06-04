# Chile DTE Implementation Spec (SIGMI)

## 1. Purpose
This document translates the SII certification manual into an actionable implementation plan for SIGMI sales electronic billing.

Scope:
- DTE issuance lifecycle for sales (starting with Factura Electronica type 33)
- SII-aligned validation, signing, folio control, sending, tracking, and reconciliation
- Certification-readiness controls (auditability and operational safeguards)

Date baseline: 2026-05-13

---

## 2. Current Baseline (Repository)

### 2.1 What exists now
- Sales routes include:
  - POST /api/v2/sales/overview
  - POST /api/v2/sales/:id/electronic-billing/issue
  - GET /api/v2/sales/:id/electronic-billing/status
- Sales domain currently persists generic sale metadata and details.
- Sales status flow exists (draft, pending, confirmed, canceled).

### 2.2 Gaps vs SII certification workflow
- No explicit CAF repository and folio allocator with uniqueness guarantees.
- No TED generation pipeline from CAF private key.
- No signed DTE XML generation and persistence.
- No envio lifecycle persistence (track ID, request/response XML, reconciliation states).
- No explicit rejection/reparo reconciliation workflow.
- No contingency/retry strategy for SII connectivity outages.
- No evidence report for certification controls (a-g).

---

## 3. SII Manual Requirements Mapped to System Capabilities

### 3.1 Technical requirements from manual
1. Validate XML against SII schema (XSD).
2. Sign XML using XML Digital Signature.
3. Build TED and sign with CAF private key (RSA-SHA1).
4. Send XML to SII and track by envio ID.
5. Query and reconcile accepted/rejected/reparo outcomes.

### 3.2 Operational requirements from certification stage
1. CAF management and access control.
2. Controlled foliation (no duplicate folio usage).
3. Backup and traceability of generated documents and communications.
4. Document sending process to SII.
5. Interchange process support.
6. Reconciliation process for all outcomes.
7. Contingency handling.

---

## 4. Target Architecture

### 4.1 Components
1. DteBuilderService
- Builds canonical DTE payload from sale + business + customer + tax lines.

2. CafService
- Stores CAF metadata and key material references.
- Allocates next folio atomically.

3. TedService
- Builds TED DD block.
- Signs TED with CAF private key (SHA1withRSA).

4. XmlSignatureService
- Produces signed XML Digital Signature for DTE and envelope.

5. SiiTransportService
- Handles envio upload, response parsing, status checks, retries.

6. DteLifecycleService
- Orchestrates issue -> send -> track -> reconcile.

7. DteReconciliationWorker (queue job)
- Periodically checks pending statuses and updates records.

### 4.2 Storage strategy
Use explicit tables for auditability, plus small denormalized metadata fields in sales.

Recommended tables:
1. sii_caf_files
- id
- business_id
- dte_type
- range_start
- range_end
- next_folio
- issued_at
- active
- encrypted_private_key_ref
- raw_caf_xml
- created_at, updated_at

2. sii_dte_documents
- id
- sale_id
- business_id
- dte_type
- folio
- status (draft, signed, sent, accepted, accepted_with_reparo, rejected, canceled)
- sii_track_id
- issuer_rut
- receiver_rut
- issued_at
- net_amount, tax_amount, exempt_amount, total_amount
- xml_unsigned
- xml_signed
- ted_xml
- ted_signature
- pdf_url (optional)
- xml_url (optional)
- last_error
- created_at, updated_at

3. sii_dte_events
- id
- dte_document_id
- event_type (issued, sent, status_checked, accepted, reparo, rejected, retry, error)
- payload_json
- created_at

4. sii_dte_envelopes (optional but recommended)
- id
- business_id
- track_id
- envelope_xml_signed
- sent_at
- raw_response
- created_at

Database constraints:
- Unique (business_id, dte_type, folio) on sii_dte_documents.
- CHECK or enum-like guards on status values.

---

## 5. API Contract (Recommended)

### 5.1 Keep existing endpoints
- POST /sales/:id/electronic-billing/issue
- GET /sales/:id/electronic-billing/status

### 5.2 Add operational endpoints
1. POST /sales/:id/electronic-billing/resend
- Reattempt sending a previously issued DTE.

2. POST /sales/:id/electronic-billing/reconcile
- Force status refresh from SII.

3. GET /sales/:id/electronic-billing/events
- Timeline for support/audit.

4. POST /config/dte/caf/upload
- Register CAF for a business and DTE type.

5. GET /config/dte/caf/active
- Current active CAF and remaining folios.

Response contract should include:
- saleId
- dteType
- folio
- siiStatus
- siiTrackId
- issuedAt
- errors (if any)

---

## 6. DTE Issuance Workflow

1. Validate sale state
- Sale must be confirmed.
- Amount consistency checks from details and taxes.

2. Resolve CAF and allocate folio
- Lock CAF row and increment next_folio atomically.

3. Build DTE model
- Header, issuer, receiver, totals, details, references.

4. Build and sign TED
- DD generated from DTE canonical values.
- Sign TED with CAF key.

5. Build and sign XML envelope
- XMLDSig according to SII requirements.

6. Persist draft artifacts
- Save xml/ted and event logs before transport.

7. Send to SII
- Parse envio response and save track ID.

8. Reconcile status
- Poll or scheduled job until final status.

9. Expose normalized status to frontend
- pending_send, sent, accepted, accepted_with_reparo, rejected, error.

---

## 7. Validation and Signing Details

1. XSD validation must run before send.
2. XMLDSig canonicalization and transforms must match SII schema profile.
3. TED signature algorithm is SHA1withRSA (per manual examples).
4. Keep deterministic field mapping to avoid signature mismatch.
5. Store both generated and transmitted XML for supportability.

---

## 8. Security and Compliance Controls

1. Never store private keys in plain text.
- Use encrypted storage or external secret manager.

2. Restrict CAF operations by role/permission.

3. Audit log every folio allocation and every DTE status transition.

4. Enforce idempotency on issue endpoint.
- If a sale already has active DTE (not canceled), return existing document unless explicit reissue policy exists.

5. PII and tax data
- Mask sensitive values in logs.

---

## 9. Frontend-Visible State Model

For each sale response, include a normalized summary:
- electronicBilling: {
  - dteType,
  - folio,
  - siiStatus,
  - siiTrackId,
  - issuedAt,
  - xmlUrl,
  - pdfUrl,
  - lastError
}

Status vocabulary for UI:
- not_issued
- pending_send
- sent
- accepted
- accepted_with_reparo
- rejected
- error

---

## 10. Phased Plan

### Phase 1 (Foundation)
- Add tables: sii_caf_files, sii_dte_documents, sii_dte_events.
- Implement CAF CRUD + allocator.
- Add migration guards and indexes.

### Phase 2 (Issuance Core)
- Implement DTE build + TED sign + XML sign.
- Wire POST /sales/:id/electronic-billing/issue.
- Persist XML artifacts and events.

### Phase 3 (Transport + Reconciliation)
- Implement SII transport adapter.
- Save track IDs and response payloads.
- Add reconciliation worker + manual reconcile endpoint.

### Phase 4 (Certification Readiness)
- Add audit/report endpoints and operational runbooks.
- Add contingency process and replay queue.
- Produce evidence checklist for SII certification steps.

---

## 11. Acceptance Criteria

1. No duplicate folio allocation under concurrent requests.
2. Every issued DTE has full trace (build, sign, send, reconcile events).
3. Frontend can always show a deterministic status for a sale.
4. Rejected/reparo responses are captured with actionable details.
5. Certification controls (a-g) are demonstrably implemented.

---

## 12. Suggested Immediate Backlog (Next 2 Sprints)

Sprint A:
1. Data model migrations for CAF/DTE/events.
2. CAF upload and active CAF endpoints.
3. Folio allocator with transactional locking tests.

Sprint B:
1. Implement issue endpoint end-to-end (build, TED, sign, persist).
2. Stub transport adapter + mock integration tests.
3. Reconciliation job and status endpoint normalization.

---

## 13. Notes
This spec is aligned with the provided SII certification manual and intended as implementation guidance for SIGMI. During execution, confirm technical details against the latest official SII technical annexes (XSD versions, signature profiles, and transport protocol updates).
