-- migration_016_reschedule_proposals
--
-- Business-proposed reschedule for PENDING bookings.
--
-- When a business can't honour a pending booking's requested slot, it proposes
-- an alternative time *back to the customer* rather than silently moving the
-- booking. The booking stays `pending` (so it keeps blocking its slot) until the
-- customer accepts (→ moved to the proposed time + confirmed) or declines
-- (→ proposal cleared, booking stays pending at its original time).
--
-- The proposal is tracked by these nullable columns — no new status value, so
-- existing status-driven code is untouched. A non-null reschedule_proposed_date
-- means "a proposal is awaiting the customer's response".
--
-- reschedule_token is an unguessable capability for the customer's tokenised
-- accept/decline link (the customer is typically not logged in).

alter table bookings
  add column if not exists reschedule_proposed_date date,
  add column if not exists reschedule_proposed_time time,
  add column if not exists reschedule_proposed_at   timestamptz,
  add column if not exists reschedule_token         text;
