// Kept apart from client.ts so components that only need this flag do not pull the Supabase browser client into their bundle.
export const authEnabled = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
