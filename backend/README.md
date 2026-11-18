# Onyx backend auth

## Configuration

Copy `.env.example` to `.env`, set `MONGO_URI`, and replace `JWT_SECRET` with a long random value. Configure SMTP (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM`) to deliver verification and reset messages. Set `FRONTEND_URL` to the frontend origin.

For Google sign-in, create a Google OAuth web client and set the same client ID in backend `GOOGLE_CLIENT_ID` and frontend `VITE_GOOGLE_CLIENT_ID`. Add the frontend origin to the OAuth client's authorized JavaScript origins. The backend verifies Google ID tokens before issuing an ONYX session.

Start the API with `npm run dev`; it listens on port 5000 by default. For local development without SMTP, one-time verification/reset links are logged by the backend and included in development API responses. Those links are never included when `NODE_ENV=production`.

For product image uploads, set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` in the backend `.env`. Product requests accept multipart form data with repeated `images` file fields (JPEG, PNG, or WebP; up to 8 files and 5 MB per file). Product create/edit can also be sent as JSON when no new images are being uploaded.

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

## Catalog models and vendor product routes

`Shop`, `Category`, and `Product` are Mongoose models. Seed/create categories in MongoDB before vendors create products; each product references an existing category. A product's `vendor` is set from the authenticated user and cannot be supplied or changed by the request.

| Method | Path | Behavior |
| --- | --- | --- |
| POST | `/api/products` | Vendor-only. Creates a product; optional image files upload to Cloudinary. |
| GET | `/api/products/my` | Vendor-only. Lists only the signed-in vendor's products. |
| PUT | `/api/products/:id` | Vendor-only. Edits an owned product; other vendors receive 404. Include replacement `images` files to replace and remove prior Cloudinary images. |
| DELETE | `/api/products/:id` | Vendor-only. Deletes only an owned product and cleans up its Cloudinary images. |

Product writes require a verified vendor JWT in `Authorization: Bearer <token>`. The routes accept only the `vendor` role; administrators cannot create or edit products as vendors.

Registration requires `name`, `email`, `phone`, and an eight-character minimum password. Passwords are hashed using bcrypt before they are saved. New accounts must verify their email before password sign-in. Verification tokens expire in 24 hours; reset links expire in 15 minutes. Recovery and sign-in routes have per-IP rate limits. Auth middleware exports `authenticate`, `isVendor` (vendor or admin), and `isAdmin` for protecting application routes.

## Postman checks

Import `postman/Onyx-Auth.postman_collection.json` into Postman and run the **Onyx Auth API** collection against a development environment without SMTP. It covers registration, verification, sign-in, `/me`, resend verification, forgot/reset password, vendor registration, and expected invalid-token/configuration errors. It generates unique emails and creates test customer/vendor records in the configured database.
