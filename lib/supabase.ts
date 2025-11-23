import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { GUEST_MODE } from "./guest-mode";

let browserClient: SupabaseClient | null = null;
let errorHandlerAdded = false;

// Add global error handler to suppress auth-related errors when no session exists
function addRefreshTokenErrorHandler() {
  if (typeof window === 'undefined' || errorHandlerAdded) return;
  errorHandlerAdded = true;

  // Handle unhandled promise rejections (where Supabase auth errors often appear)
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason;
    const errorMessage = error?.message || error?.toString() || '';
    const errorName = error?.name || '';
    
    // Suppress refresh token errors and missing session errors
    if (errorMessage.includes('Refresh Token Not Found') || 
        errorMessage.includes('Invalid Refresh Token') ||
        errorMessage.includes('Auth session missing') ||
        errorName === 'AuthSessionMissingError') {
      event.preventDefault(); // Prevent the error from showing in console
      return;
    }
  });
}

export function getSupabaseClient(): SupabaseClient {
  if (browserClient) return browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    if (GUEST_MODE) {
      // In guest mode, create a dummy client that won't be used
      console.warn("Supabase credentials missing, but running in GUEST_MODE");
      throw new Error(
        "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/ANON_KEY env vars"
      );
    }
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/ANON_KEY env vars"
    );
  }

  // Add error handler before creating client
  addRefreshTokenErrorHandler();

  browserClient = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });

  return browserClient;
}

