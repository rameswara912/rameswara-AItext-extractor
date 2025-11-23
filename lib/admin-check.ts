import { getSupabaseClient } from "./supabase";

const ADMIN_EMAIL = "rameswara912@gmail.com";

/**
 * Check if the current user is an admin
 * @returns true if the user is an admin, false otherwise
 */
export async function isAdmin(): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.getUser();
    
    if (error || !data?.user) {
      return false;
    }
    
    return data.user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  } catch (error) {
    console.error("[admin-check] Error checking admin status:", error);
    return false;
  }
}

/**
 * Get the admin email address
 */
export function getAdminEmail(): string {
  return ADMIN_EMAIL;
}

