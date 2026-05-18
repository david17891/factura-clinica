-- FiscoBot demo stabilization.
-- Fixes:
-- 1. Existing issued demo requests must carry their CFDI UUID on invoice_requests.
-- 2. Future issued requests must not exist without UUID.
-- 3. audit_events must not accept direct anon inserts.

UPDATE invoice_requests ir
SET uuid = idoc.cfdi_uuid
FROM (
  SELECT DISTINCT ON (invoice_request_id)
    invoice_request_id,
    cfdi_uuid
  FROM invoice_documents
  WHERE cfdi_uuid IS NOT NULL
  ORDER BY invoice_request_id, issued_at DESC, created_at DESC
) idoc
WHERE ir.id = idoc.invoice_request_id
  AND ir.status = 'issued'
  AND ir.uuid IS NULL;

ALTER TABLE invoice_requests
  DROP CONSTRAINT IF EXISTS invoice_requests_issued_requires_uuid;

ALTER TABLE invoice_requests
  ADD CONSTRAINT invoice_requests_issued_requires_uuid
  CHECK (status <> 'issued' OR uuid IS NOT NULL);

DROP POLICY IF EXISTS "System insert audit events" ON audit_events;

CREATE POLICY "Authenticated insert audit events" ON audit_events
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON audit_events FROM anon;
GRANT SELECT, INSERT ON audit_events TO authenticated;
