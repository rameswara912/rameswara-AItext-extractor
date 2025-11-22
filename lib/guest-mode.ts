// Guest mode utility for Electron app testing
// This allows the app to function without Supabase authentication

export const GUEST_MODE = false;

export function useGuestMode() {
  return GUEST_MODE;
}

export function isAuthenticated(): boolean {
  const session = localStorage.getItem('supabase.auth.token');
  return !!session;
}

export function getGuestUserEmail(): string {
  return "guest@aiextractor.local";
}
