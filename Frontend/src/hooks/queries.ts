// The dashboards' server state, expressed as TanStack Query hooks. Before this, each
// dashboard hand-rolled the same pattern: a useState for the rows, a useState for a
// "loading | ok | error" status, a `refresh()` that re-fetched, and a useEffect to run
// it on mount. After every action they called refresh() again to pull fresh data.
//
// That pattern is exactly what TanStack Query exists to replace. These hooks centralise
// it: a `useQuery` per list (it caches the data and tracks isLoading/isError for us),
// and a `useMutation` per write (it runs the API call and, on success, INVALIDATES the
// relevant cached lists so they refetch automatically — no manual refresh() needed).
//
// AuthContext already uses Query for /auth/me; this brings the dashboards onto it too.
//
// Query keys: each list's key starts with a stable name (e.g. ["applications"]) and
// includes the token. Including the token means a different login caches separately;
// the stable PREFIX means `invalidateQueries({ queryKey: ["applications"] })` still
// matches and refetches regardless of which token is appended (Query matches by prefix).

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listApplications,
  getApplication,
  updateApplicationStatus,
  createReferral,
  listReferrals,
  updateReferralStatus,
  createTrial,
  listTrials,
  listUsers,
  createUser,
  updateUserStatus,
  updateTrialStatus,
  type ApplicationRead,
  type ApplicationSummary,
  type ApplicationStatus,
  type ReferralDetailRead,
  type ReferralStatus,
  type TrialRead,
  type TrialStatus,
  type UserRead,
  type CreatableRole,
} from "../api";

// --- Queries (reads) -------------------------------------------------------
//
// Each hook returns the full TanStack Query result object. Callers read the parts
// they need: `data` (the rows, `undefined` until loaded), `isLoading`, `isError`.
// `enabled: !!token` keeps the query from running before a token exists.

// Coordinator/admin: the lead INBOX — a minimized summary per application (no
// email/contact/answers). The full record for one patient comes from useApplication.
export function useApplications(token: string | null) {
  return useQuery<ApplicationSummary[]>({
    queryKey: ["applications", token],
    queryFn: () => listApplications(token as string),
    enabled: !!token,
  });
}

// Coordinator/admin: ONE application in full (email, contact, eligibility answers),
// fetched when the drawer opens. Its OWN ["application", id, token] namespace — kept
// separate from the ["applications"] inbox list, so opening a patient never refetches
// the whole inbox and invalidating one list never touches the other. `enabled` gates
// it on a token AND a selected id, so it stays idle while the drawer is closed (id null).
export function useApplication(token: string | null, id: number | null) {
  return useQuery<ApplicationRead>({
    queryKey: ["application", id, token],
    queryFn: () => getApplication(token as string, id as number),
    enabled: !!token && id !== null,
  });
}

// Nurse: referred patients, each with their full application nested inside.
export function useReferrals(token: string | null) {
  return useQuery<ReferralDetailRead[]>({
    queryKey: ["referrals", token],
    queryFn: () => listReferrals(token as string),
    enabled: !!token,
  });
}

// Nurse/admin: every trial, newest first.
export function useTrials(token: string | null) {
  return useQuery<TrialRead[]>({
    queryKey: ["trials", token],
    queryFn: () => listTrials(token as string),
    enabled: !!token,
  });
}

// Admin: every staff account (no password hash — the backend's UserRead omits it).
export function useUsers(token: string | null) {
  return useQuery<UserRead[]>({
    queryKey: ["users", token],
    queryFn: () => listUsers(token as string),
    enabled: !!token,
  });
}

// --- Mutations (writes) ----------------------------------------------------
//
// Each mutation runs its API call, then on success invalidates the list(s) its change
// affected, so those queries refetch and the screen reflects the new state. We pass the
// stable key PREFIX (e.g. ["applications"]) to invalidateQueries so it matches the
// token-suffixed key regardless of who's logged in.
//
// Callers use `mutate(args)` (fire-and-forget) or `mutateAsync(args)` (await it), and
// can read `isPending` to disable a button while the request is in flight.

// Coordinator: approve / reject / mark-reviewed an application → refresh applications.
export function useUpdateApplicationStatus(token: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: ApplicationStatus }) =>
      updateApplicationStatus(token as string, id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
  });
}

// Coordinator: refer an approved application to a hospital. This also flips the
// application's status to "referred", so we refresh BOTH lists.
export function useCreateReferral(token: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { application_id: number; hospital: string }) =>
      createReferral(token as string, vars),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["referrals"] });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
  });
}

// Nurse: record follow-up (contacted / enrolled / declined) → refresh referrals.
export function useUpdateReferralStatus(token: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: ReferralStatus }) =>
      updateReferralStatus(token as string, id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["referrals"] });
    },
  });
}

// Nurse/admin: create a trial → refresh the trials list.
export function useCreateTrial(token: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { title: string; description: string }) =>
      createTrial(token as string, vars),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trials"] });
    },
  });
}

// Admin: create a coordinator/nurse account → refresh the users list.
export function useCreateUser(token: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      name: string;
      email: string;
      password: string;
      role: CreatableRole;
    }) => createUser(token as string, vars),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

// Admin: enable/disable an account → refresh the users list.
export function useUpdateUserStatus(token: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      updateUserStatus(token as string, id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

// Admin: launch (open) / close a trial → refresh the trials list.
export function useUpdateTrialStatus(token: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: TrialStatus }) =>
      updateTrialStatus(token as string, id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trials"] });
    },
  });
}

// Re-export the types callers commonly need alongside these hooks, so a dashboard can
// `import { useApplications, type ApplicationRead } from "../hooks/queries"`.
export type {
  ApplicationRead,
  ApplicationSummary,
  ReferralDetailRead,
  TrialRead,
  UserRead,
} from "../api";
