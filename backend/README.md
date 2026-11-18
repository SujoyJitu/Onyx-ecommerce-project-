# Onyx backend auth

## Configuration

Copy `.env.example` to `.env`, set `MONGO_URI`, and replace `JWT_SECRET` with a long random value. Configure SMTP (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM`) to deliver verification and reset messages. Set `FRONTEND_URL` to the frontend origin.

For Google sign-in, create a Google OAuth web client and set the same client ID in backend `GOOGLE_CLIENT_ID` and frontend `VITE_GOOGLE_CLIENT_ID`. Add the frontend origin to the OAuth client's authorized JavaScript origins. The backend verifies Google ID tokens before issuing an ONYX session.

Start the API with `npm run dev`; it listens on port 5000 by default. For local development without SMTP, one-time verification/reset links are logged by the backend and included in development API responses. Those links are never included when `NODE_ENV=production`.

## Authentication routes

All routes use JSON request and response bodies.

| Method | Path | Behavior |
| --- | --- | --- |
| POST | `/api/auth/register` | Creates a customer by default. Pass `role: "vendor"` to register a vendor. Admin registration is rejected. |
| POST | `/api/auth/login` | Checks the password and returns a JWT plus the public user profile. |
| POST | `/api/auth/verify-email` | Verifies an email using a one-time token; issues a session JWT on success. |
| POST | `/api/auth/resend-verification` | Sends a new email verification link. |
| POST | `/api/auth/forgot-password` | Sends a one-time password reset link without revealing whether the email exists. |
| POST | `/api/auth/reset-password` | Sets a new password with an unexpired reset token and invalidates existing sessions. |
| POST | `/api/auth/google` | Verifies a Google ID token and creates or signs in the associated account. |
| GET | `/api/auth/me` | Returns the current user's public profile; requires `Authorization: Bearer <token>`. |

Registration requires `name`, `email`, `phone`, and an eight-character minimum password. Passwords are hashed using bcrypt before they are saved. New accounts must verify their email before password sign-in. Verification tokens expire in 24 hours; reset links expire in 15 minutes. Recovery and sign-in routes have per-IP rate limits. Auth middleware exports `authenticate`, `isVendor` (vendor or admin), and `isAdmin` for protecting application routes.

## Postman checks

Import `postman/Onyx-Auth.postman_collection.json` into Postman and run the **Onyx Auth API** collection against a development environment without SMTP. It covers registration, verification, sign-in, `/me`, resend verification, forgot/reset password, vendor registration, and expected invalid-token/configuration errors. It generates unique emails and creates test customer/vendor records in the configured database.
