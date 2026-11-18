# Onyx backend auth

## Configuration

Copy `.env.example` to `.env`, set `MONGO_URI`, and replace `JWT_SECRET` with a long random value. Start the API with `npm run dev`; it listens on port 5000 by default.

## Authentication routes

All routes use JSON request and response bodies.

| Method | Path | Behavior |
| --- | --- | --- |
| POST | `/api/auth/register` | Creates a customer by default. Pass `role: "vendor"` to register a vendor. Admin registration is rejected. |
| POST | `/api/auth/login` | Checks the password and returns a JWT plus the public user profile. |
| GET | `/api/auth/me` | Returns the current user's public profile; requires `Authorization: Bearer <token>`. |

Registration requires `name`, `email`, `phone`, and an eight-character minimum password. Passwords are hashed using bcrypt before they are saved. Auth middleware exports `authenticate`, `isVendor` (vendor or admin), and `isAdmin` for protecting application routes.

## Postman checks

Import `postman/Onyx-Auth.postman_collection.json` into Postman and run the **Onyx Auth API** collection. The checks cover registration, duplicate and invalid input, invalid credentials, token issuance, authenticated and unauthenticated `/me`, and vendor registration. The collection generates unique test emails; running it creates test customer and vendor records in the configured database.
