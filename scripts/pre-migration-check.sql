-- ---------------------------------------------------------------------------
-- Run this in the Supabase SQL editor BEFORE `npm run db:push` on an existing
-- database. The new unique indexes cannot be created while duplicates exist.
-- Every query should return 0 rows. If not, fix the rows listed first.
-- ---------------------------------------------------------------------------

-- 1) Submissions approved twice (double points / double FONE in the queue)
select submission_id, count(*) as payouts
from reward_queue group by submission_id having count(*) > 1;

select submission_id, count(*) as point_entries
from points_ledger group by submission_id having count(*) > 1;

-- 2) Same wallet linked to more than one account
select wallet_address, count(*) as accounts, array_agg(email) as emails
from users where wallet_address is not null
group by wallet_address having count(*) > 1;

-- 3) Same photo used in more than one submission
select photo_hash, count(*) from submissions group by photo_hash having count(*) > 1;

-- 4) Duplicate favorites / reports (same user, same message)
select message_id, user_id, count(*) from message_favorites group by 1, 2 having count(*) > 1;
select message_id, reporter_id, count(*) from message_reports group by 1, 2 having count(*) > 1;

-- 5) Payouts pointing to the old fake "EcoChain" network (informational)
select id, status, network from reward_queue where network = 'EcoChain';

-- ---------------------------------------------------------------------------
-- Example fixes (review before running!)
-- ---------------------------------------------------------------------------
-- Keep only the oldest payout per submission:
-- delete from reward_queue r using reward_queue r2
--   where r.submission_id = r2.submission_id and r.created_at > r2.created_at and r.status = 'pending';
--
-- Rename the legacy network:
-- update reward_queue set network = 'FONE' where network = 'EcoChain';
