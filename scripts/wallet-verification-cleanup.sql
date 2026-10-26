-- ---------------------------------------------------------------------------
-- Wallet verification (EcoVerify 1.2): run in the Supabase SQL editor AFTER
-- `npm run db:push` on an existing database.
--
-- Before 1.2 any text could be saved as a wallet, and "Criar carteira" generated a
-- fake "0xFONE…" address that nobody owns. From 1.2 on, users.wallet_address only
-- holds wallets verified by an admin (users.wallet_verified_at is set).
-- The app already ignores unverified addresses; this script just removes them.
-- ---------------------------------------------------------------------------

-- 1) Review: unverified addresses that will be removed
select id, email, wallet_address,
       case
         when wallet_address ilike '0xFONE%' then 'falsa (gerada pelo app)'
         when wallet_address ~* '^0x[0-9a-f]{40}$' then 'BEP-20 (BNB Chain)'
         when wallet_address ~ '^f[0-9a-f]{63}$' then 'FONE nativa, não verificada'
         else 'formato inválido'
       end as tipo
from users
where wallet_address is not null and wallet_verified_at is null;

-- 2) Users with native addresses: start a verification request for them, so they only
--    need to send the exact amount (they will see it on their profile). Optional.
--    Amounts are spread between 1.01 and 9.99 FONE; collisions are fine because the admin
--    also checks the sender address.
-- update users
--   set pending_wallet_address = wallet_address,
--       wallet_challenge_amount = round((1.01 + random() * 8.98)::numeric, 2),
--       wallet_challenge_created_at = now()
--   where wallet_address ~ '^f[0-9a-f]{63}$' and wallet_verified_at is null;

-- 3) Remove every unverified address (fake, BEP-20 and unverified native ones)
update users set wallet_address = null
where wallet_address is not null and wallet_verified_at is null;

-- 4) Open payouts stay in the queue and are paid once the user verifies a wallet.
--    Informational: payouts marked "paid" before 1.2 (no destination recorded).
select id, user_id, fone_amount, network, tx_hash, updated_at
from reward_queue
where status = 'paid' and wallet_address is null;
