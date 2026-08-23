-- This immutable SECURITY INVOKER normalizer is used by authenticated
-- verification and role-aware queries. It exposes no table data and honors the
-- caller's privileges, so it is safe to retain as a public utility.
grant execute on function public.hpc_normalized_role(text) to authenticated;
