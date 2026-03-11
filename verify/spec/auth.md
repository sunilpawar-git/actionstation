# Task
Google OAuth login for Eden.so

## Changed Files
- src/features/auth/components/LoginPage.tsx
- src/features/auth/services/authService.ts
- src/features/auth/stores/authStore.ts

## Acceptance Criteria

### AC-1: Login page renders
- Visiting `/` when unauthenticated shows the login card
- The page contains a "Sign in with Google" button (role=button)
- The Eden.so logo SVG is visible
- No console errors on initial render

### AC-2: Sign-in button state
- The "Sign in with Google" button is enabled by default (not disabled)
- While sign-in is in flight (`isLoading=true`) the button gains `aria-busy="true"` and is disabled
- A spinner element is visible during loading (aria-hidden="true")

### AC-3: Error banner
- When `authStore.error` is non-null, a `role="alert"` div appears
- The error message text is visible inside the alert
- The alert disappears when the error is cleared

### AC-4: Successful OAuth redirect
- After a successful `signInWithGoogle()` call the user is NOT on `/` (they land on the canvas/workspace)
- The login card is no longer visible after redirect
- Session cookie / Firebase auth token is present in localStorage or IndexedDB

### AC-5: Accessibility baseline
- The login button has a non-empty accessible name
- The page title is "Eden" (or contains the app name)
- No critical axe violations on the login page
