-- Migration 111: Add missing payment_number_seq
-- The generate_license_invoice_number() RPC function (created in 104)
-- depends on this sequence, but it was never created.

create sequence if not exists public.payment_number_seq
  start with 1
  increment by 1
  minvalue 1
  no maxvalue
  cache 1;
