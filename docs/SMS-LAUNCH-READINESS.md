# Raha Supermarket — SMS launch readiness (no payment yet)

Status: DEVELOPMENT ONLY. Do not send live promotional messages until every gate is complete.

## Business documents
- Legal proprietor: PRAMIT KUMAR RAHA
- GST trade name: RAHA SUPER MARKET
- Constitution: proprietorship
- GST certificate and Udyam certificate received for registration reference.
- GST/Udyam registered address is Ward No. 1, Dineshpur; app store address was previously Ward No. 8, Gularbhoj Road. Verify before submitting DLT.
- Do not commit certificate PDFs, GSTIN, PAN, bank data, API keys, or customer phone lists to source control.

## Already prepared on this branch
- backend/marketing_crm.py: consent-gated, deduplicated audience preview logic; NOT wired to production routes.
- admin-app/app/admin/marketing.tsx: draft-only marketing screen; sending disabled.
- admin-app/app/admin/index.tsx: Marketing CRM navigation entry.
- Dockerfile.raha-admin-web: candidate isolated Docker build; NOT tested/deployed.

## Technical tasks before launch
- [ ] Inspect actual Firestore customers/orders schemas and consent collection/fields.
- [ ] Implement opt-in with consent timestamp, purpose, source, withdrawal, suppression list.
- [ ] Protect preview/campaign APIs with verified Firebase admin auth.
- [ ] Build campaign management, approved-template selection, segmentation, test-send, delivery status, idempotency, audit log, throttling, failure handling and per-campaign caps.
- [ ] Ensure sender/provider secrets only on backend and no raw numbers in logs.
- [ ] Add unit/integration tests and run them.
- [ ] Validate Expo web build; verify Railway root/build context, Dockerfile path, service domain, environment variables and healthcheck.
- [ ] Review PR and deploy without disturbing current backend/order flows.

## Client-funded activation steps (after approval/payment)
- [ ] Create/verify DLT Principal Entity under proprietor legal name and trade name.
- [ ] Obtain approved DLT entity ID, header/sender ID, and content templates.
- [ ] Create/verify MSG91 (or chosen provider) account and map DLT IDs.
- [ ] Add provider credentials to Railway backend secrets (never GitHub).
- [ ] Confirm SMS credits, provider pricing and daily campaign budget.
- [ ] Test one explicitly consented internal recipient; verify delivery report.
- [ ] Enable live sending only after explicit client authorization.

## Launch rule
Payment alone does not enable sending: DLT approvals, provider account, verified consent, security tests, and authorized go-live are mandatory.
