-- FiscoBot local hardening: remove recursive profiles RLS policies.
--
-- Policies on profiles cannot query profiles again to discover superadmin
-- status; doing so makes ordinary authenticated reads fail with:
-- "infinite recursion detected in policy for relation profiles".
--
-- The MVP only needs users to read their own profile. Profile management for
-- demo users is handled by the local seed script with service_role server-side.

DROP POLICY IF EXISTS "Superadmin full access profiles" ON profiles;
DROP POLICY IF EXISTS "Superadmin manage profiles" ON profiles;

DROP POLICY IF EXISTS "Users read own profile" ON profiles;
CREATE POLICY "Users read own profile" ON profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());
