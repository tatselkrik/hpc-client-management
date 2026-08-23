-- Appointment write triggers run with the authenticated caller's privileges.
-- This immutable helper exposes only the reviewed status-transition matrix and
-- must be executable for those trigger calls to succeed.
revoke execute on function public.hpc_appointment_transition_allowed(text, text)
  from public, anon;
grant execute on function public.hpc_appointment_transition_allowed(text, text)
  to authenticated;
