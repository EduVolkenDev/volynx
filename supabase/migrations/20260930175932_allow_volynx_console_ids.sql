-- Allow the permanent VOLYNX namespace while preserving the original VLX IDs.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '20s';
ALTER TABLE public.cloud_products
  DROP CONSTRAINT cloud_products_volynx_id_check,
  ADD CONSTRAINT cloud_products_volynx_id_check
    CHECK (volynx_id ~ '^(VLX|VOLYNX)-[A-Z0-9]+-[0-9]{3,}$');
COMMIT;
