-- ---------------------------------------------------------------------------
-- Concord ChemTrack - seed the first application user
--
-- The `password` column stores a bcrypt hash. The value below is the hash of
-- the password `admin123` (cost factor 10):
--
--   $2b$10$7XL/013l19eebyaHKmgMPet1qb2LIlLsqy8C51LLly9sPtKHWUZcW
--
-- Replace the username/password hash before running in production.
-- ---------------------------------------------------------------------------

insert into public.users (username, password)
values (
  'admin',
  '$2b$10$7XL/013l19eebyaHKmgMPet1qb2LIlLsqy8C51LLly9sPtKHWUZcW'
)
on conflict (username) do nothing;
