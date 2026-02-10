# Security Analysis Report

**Project:** Tria Production  
**Analysis Date:** 2025-10-09  
**Scope:** Full workspace (Tria application and related sources)

---

## 1. Executive Summary

| Severity | Count |
|----------|--------|
| **Critical** | 4 |
| **High**     | 5 |
| **Medium**   | 5 |
| **Low**      | 4 |
| **Total**    | **18** |

**Summary:** The analysis identified several critical and high-severity issues, primarily around **hardcoded credentials**, **unprotected or overly permissive API endpoints**, **information leakage**, and **SSRF/open-redirect style risks**. One **high-severity dependency vulnerability** (jws) was also found. Addressing the Critical and High items should be the immediate priority.

---

## 2. Detailed Findings

---

### CRITICAL-1: Admin setup endpoint returns credentials in response

- **Severity:** Critical  
- **File:** `Tria/src/app/api/setup/admin/route.ts`  
- **Line Number:** 54–56  

**Issue Summary:** The GET `/api/setup/admin` endpoint creates an admin user and returns the admin email and **plaintext password** in the JSON response.

**Detailed Explanation:**  
Returning credentials in any API response is a serious security flaw. Anyone who can trigger this endpoint (e.g., an authenticated but non-admin user if the route is reachable after login, or if the route is ever exposed to the public) can obtain the admin password. Credentials in responses can also be logged by proxies, browsers, or monitoring tools, and can be leaked via client-side code or history.

**Recommended Fix:**

1. Remove `credentials: { email, password }` from the response entirely.
2. If this is a one-time setup flow, use a secure out-of-band mechanism (e.g., send the temporary password to a secure channel or require it to be set on first login and never return it).
3. Restrict the endpoint so it can only be called in a controlled setup context (e.g., allowlist IP, one-time token, or run only via a secure script), and ensure it is not callable by normal authenticated users.
4. If a temporary password is required for first login, generate it server-side, set it, and do not include it in the response; use password reset or “set password on first login” instead.

**Best Practice Note:** Never return passwords or secrets in API responses. Use secure one-time setup flows and avoid hardcoded default passwords.

---

### CRITICAL-2: Hardcoded admin password in setup route

- **Severity:** Critical  
- **File:** `Tria/src/app/api/setup/admin/route.ts`  
- **Line Number:** 7  

**Issue Summary:** The admin user is created with a hardcoded password `'AdminSecurePassword123!'`.

**Detailed Explanation:**  
Hardcoded passwords are easily discovered via source control, deployment artifacts, or leaks. If the repo or build is ever exposed, the same password may be used in production. This enables full admin compromise.

**Recommended Fix:**

1. Remove the hardcoded password. Use an environment variable (e.g. `INITIAL_ADMIN_PASSWORD`) that is set only during secure, one-time setup and is not committed.
2. Prefer creating the admin without a known password and using “invite” or “set password on first login” flows so no shared secret is stored in code or config.
3. Ensure the setup endpoint is not callable in production by normal users (see CRITICAL-1).

**Best Practice Note:** All secrets (passwords, API keys, tokens) should come from a secure secret store or environment configuration, never from source code.

---

### CRITICAL-3: Test-email endpoint sends magic link and exposes it in response

- **Severity:** Critical  
- **File:** `Tria/src/app/api/auth/test-email/route.ts`  
- **Line Number:** 46–51, 50  

**Issue Summary:** POST `/api/auth/test-email` is unauthenticated, sends a Supabase magic/signup link to an arbitrary email provided in the request, and returns `link: data?.properties?.action_link` in the success response.

**Detailed Explanation:**  
An attacker can call this endpoint with any victim email. The response can include the one-time action link. That link typically allows setting a session (or completing signup) for that user. Thus, the attacker can **take over any user account** by requesting a test email for the victim and using the returned link. The endpoint also exposes configuration (e.g. `supabaseUrl`, `hasServiceKey`), which aids reconnaissance.

**Recommended Fix:**

1. **Immediately** stop returning `action_link` (or any token/link) in the response. Never expose one-time auth links to the client.
2. Restrict the endpoint to trusted callers only (e.g., authenticated admin, or disable in production). If it is for debugging, guard with `NODE_ENV === 'development'` and/or IP/role checks.
3. Remove or restrict exposure of internal config (e.g. `hasServiceKey`, full `supabaseUrl`) in responses.
4. Consider removing this endpoint in production or moving it behind an admin-only API.

**Best Practice Note:** One-time auth links and tokens must never be returned in API responses. Debug endpoints must be disabled or strictly restricted in production.

---

### CRITICAL-4: Hardcoded temporary passwords in auth flows

- **Severity:** Critical  
- **File:** `Tria/src/app/api/auth/resend-confirmation/route.ts` (lines 47, 75), `Tria/src/app/api/auth/test-email/route.ts` (line 30)  
- **Line Numbers:** 47, 75 (resend-confirmation); 30 (test-email)  

**Issue Summary:** Resend-confirmation and test-email use a hardcoded temporary password `'TempPassword123!'` when calling Supabase `generateLink` (e.g. signup/recovery).

**Detailed Explanation:**  
Using a single hardcoded value for “temporary” passwords across all users makes it trivial for an attacker who learns it (e.g. from repo, docs, or one leaked response) to abuse signup/recovery flows or to attempt credential stuffing. It also weakens the security of any flow that relies on link uniqueness if the same secret is reused.

**Recommended Fix:**

1. Generate a **unique** temporary password per request (e.g. cryptographically random string) when calling `generateLink`, and do not return it to the client.
2. Prefer Supabase flows that do not require a temporary password for “resend confirmation” (e.g. resend confirmation email only) so that no shared secret is involved.
3. Remove or strictly restrict test-email (see CRITICAL-3) and do not use a fixed password there.

**Best Practice Note:** Temporary or one-time passwords should be randomly generated per operation and never hardcoded or reused across users.

---

### HIGH-1: Unprotected debug endpoint exposes database structure and data

- **Severity:** High  
- **File:** `Tria/src/app/api/debug/check-data/route.ts`  
- **Line Numbers:** 1–67 (entire route)  

**Issue Summary:** GET `/api/debug/check-data` has no authentication. It uses the service role key (or anon key fallback), queries multiple tables, and returns counts, error messages, and sample rows (e.g. legacy and new products, images).

**Detailed Explanation:**  
Unprotected debug endpoints expose schema and data to anyone who knows the URL. Attackers can use this to understand the database layout, enumerate data, and plan further attacks. Using `SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY` as fallback also risks using the anon key in unintended conditions, which can bypass RLS in some usages.

**Recommended Fix:**

1. Remove this route from production, or protect it with strict checks: e.g. admin-only session and/or allowlist IP, and `NODE_ENV === 'development'`.
2. Do not fall back to the anon key for server-side debug; use the service role only when explicitly required and only in a secured context.
3. Avoid returning raw error messages and sample rows to the client; log details server-side only.

**Best Practice Note:** All debug/diagnostic endpoints must be disabled in production or gated by role and environment.

---

### HIGH-2: Auth diagnose endpoint unauthenticated and leaks user/profile data

- **Severity:** High  
- **File:** `Tria/src/app/api/auth/diagnose/route.ts`  
- **Line Numbers:** 11–79  

**Issue Summary:** POST `/api/auth/diagnose` accepts an email in the body, has no authentication, uses the service role to look up Supabase Auth users and profiles, and returns detailed user/profile and recommendation data. On error, it returns `error.stack`.

**Detailed Explanation:**  
Any party can query whether an email exists in Auth and in profiles, and retrieve role, onboarding status, approval status, and influencer profile data. This enables **user enumeration** and **information disclosure**. Returning `error.stack` in 500 responses leaks internal paths and structure.

**Recommended Fix:**

1. Require authentication and restrict to admin (or support) only.
2. Do not return stack traces to the client; log them server-side and return a generic error message.
3. Consider whether this endpoint is needed in production; if so, limit returned fields and audit access.

**Best Practice Note:** User lookup and diagnostic endpoints must be restricted to authorized roles and must not expose stack traces or unnecessary PII.

---

### HIGH-3: Image proxy SSRF via weak URL validation

- **Severity:** High  
- **File:** `Tria/src/app/api/images/proxy/route.ts`  
- **Line Numbers:** 19–20, 30  

**Issue Summary:** The proxy allows any URL that **contains** the substring `'supabase.co/storage'`. The server then fetches the decoded URL and streams the response back.

**Detailed Explanation:**  
An attacker can pass a URL such as `https://evil.com/supabase.co/storage/phishing` or `https://attacker.com/?x=supabase.co/storage`. The check `imageUrl.includes('supabase.co/storage')` passes, but the request goes to the attacker’s server (or another backend), enabling **SSRF**. The server can be used to scan internal networks, access cloud metadata, or proxy malicious content.

**Recommended Fix:**

1. Validate the URL with a strict allowlist: parse the URL, ensure the hostname is exactly a known Supabase storage host (e.g. `*.supabase.co` with a known project ref or allowlisted project refs), and reject any other host.
2. Do not rely on substring checks. Use `new URL()` and compare `origin` or `hostname` against an allowlist.
3. Optionally restrict paths (e.g. only `/storage/v1/object/...`) to limit abuse.

**Best Practice Note:** For proxy/fetch-by-URL features, use allowlisted origins/hosts and parsed URLs, not substring matching.

---

### HIGH-4: Health endpoint exposes environment configuration

- **Severity:** High (in sensitive environments)  
- **File:** `Tria/src/app/api/health/db/route.ts`  
- **Line Numbers:** 11–14, 35  

**Issue Summary:** GET `/api/health/db` is unauthenticated and returns `env: { hasSupabaseUrl, hasServiceRoleKey }` and `profilesCount`.

**Detailed Explanation:**  
Revealing whether the service role key is set and profile count helps attackers understand your deployment and prioritize targets. In combination with other issues, it can support reconnaissance.

**Recommended Fix:**

1. Return only what is necessary for health checks (e.g. `{ ok: true }` or a simple status).
2. Do not expose `hasServiceRoleKey` or other env details to unauthenticated callers.
3. If this is for internal monitoring only, restrict by IP or deploy behind an internal network.

**Best Practice Note:** Health endpoints should expose minimal information and, if they reveal config, should be restricted to trusted consumers.

---

### HIGH-5: Vulnerable dependency – jws (HMAC verification)

- **Severity:** High  
- **File:** `Tria/package.json` (dependency tree)  
- **Line Number:** N/A (dependency: `jws@4.0.0`)  

**Issue Summary:** `npm audit` reports a high-severity vulnerability in `jws` (auth0/node-jws): **Improperly Verifies HMAC Signature** (GHSA-869p-cjfg-cm3x).

**Detailed Explanation:**  
JWS is commonly used for JWT handling. Improper HMAC verification can allow signature bypass or forgery, potentially leading to authentication bypass if JWTs are used for sessions or API auth.

**Recommended Fix:**

1. Run `npm audit fix` and verify the application still works.
2. If no fix is available, upgrade the direct dependency that pulls in `jws` (e.g. a Supabase or auth library) to a version that uses a patched `jws`.
3. Re-run `npm audit` and regression tests after changes.

**Best Practice Note:** Run `npm audit` regularly and address high/critical vulnerabilities in dependencies promptly.

---

### MEDIUM-1: Admin clear-auth uses service role client for getUser()

- **Severity:** Medium  
- **File:** `Tria/src/app/api/admin/clear-auth/route.ts`  
- **Line Numbers:** 6–7  

**Issue Summary:** The route uses `createServiceClient()` and then `supabase.auth.getUser()` to check the current user and admin role.

**Detailed Explanation:**  
The service role client does not use request cookies; it is a server-side client with the service role key only. So `getUser()` on this client typically does not receive the caller’s session and may always return `null`, causing the endpoint to always respond 401. If the intent is to allow admins to clear auth, the auth check may be broken. If somewhere the session is passed differently, the behavior should be verified.

**Recommended Fix:**

1. Use the **user-scoped** client (e.g. `createClient()` from `@/lib/auth`) to call `getUser()` so the request cookies are used and the current user is identified.
2. After confirming the user is an admin (via profile/role), use `createServiceClient()` only for the actual admin operations (e.g. `listUsers`, `deleteUser`).
3. Test that an admin can successfully call the endpoint and that non-admins receive 403.

**Best Practice Note:** Use the session-aware client for “who is calling?” and the service role client only for privileged actions after authorization.

---

### MEDIUM-2: Test-email and diagnose expose internal config in responses

- **Severity:** Medium  
- **File:** `Tria/src/app/api/auth/test-email/route.ts` (config, link); `Tria/src/app/api/auth/diagnose/route.ts` (stack trace)  
- **Line Numbers:** test-email: 39–43, 50, 59–62; diagnose: 74–76  

**Issue Summary:** Success and error responses include `config` (e.g. `siteUrl`, `supabaseUrl`, `hasServiceKey`) and sometimes `link` or `details`/`stack`, which leak internal structure.

**Detailed Explanation:**  
Exposing config and stack traces helps attackers map your infrastructure and find bugs. It is redundant with the critical link-exposure issue but worth calling out for hardening.

**Recommended Fix:**

1. Remove `config` and `link` from test-email responses (see CRITICAL-3).
2. In diagnose, do not return `error.stack` or raw `details`; log them server-side and return a generic message.
3. Restrict both endpoints (see CRITICAL-3, HIGH-2).

**Best Practice Note:** Error and debug responses should not include stack traces, internal URLs, or config to the client.

---

### MEDIUM-3: Image proxy sets Access-Control-Allow-Origin: *

- **Severity:** Medium  
- **File:** `Tria/src/app/api/images/proxy/route.ts`  
- **Line Number:** 57  

**Issue Summary:** The response sets `'Access-Control-Allow-Origin': '*'`, allowing any website to embed or fetch the proxied image via the browser.

**Detailed Explanation:**  
If the proxied content is sensitive (e.g. signed URLs or user-specific storage paths), broad CORS allows any site to request it on behalf of a user who is logged in, potentially leaking content. It also makes it easier to use your proxy in third-party sites without your control.

**Recommended Fix:**

1. Set CORS only when needed; use the request’s `Origin` and allowlist your own domains, or omit the header if the proxy is same-origin only.
2. Ensure the proxy URL validation is strict (see HIGH-3) so that only intended storage URLs are fetched.

**Best Practice Note:** Use a restrictive CORS policy (allowlist origins) instead of `*` for APIs that may touch sensitive or user-specific resources.

---

### MEDIUM-4: Login route user enumeration via detailed error messages

- **Severity:** Medium  
- **File:** `Tria/src/app/api/auth/login/route.ts`  
- **Line Numbers:** 66–74  

**Issue Summary:** On invalid login, the API returns different messages depending on whether the user exists and whether email is confirmed (e.g. “No account found”, “Verify your email”, “Invalid password”).

**Detailed Explanation:**  
An attacker can distinguish “email does not exist” from “email exists, wrong password or unconfirmed”, enabling **user enumeration** and targeted phishing or credential stuffing.

**Recommended Fix:**

1. Use a single generic message for all failed login attempts (e.g. “Invalid email or password” or “Unable to sign in. Check your credentials or confirm your email.”).
2. Log the real reason (user not found, wrong password, unconfirmed) server-side for support and security monitoring only.

**Best Practice Note:** Authentication endpoints should not reveal whether an identifier (email/username) exists in the system.

---

### MEDIUM-5: Resend-confirmation allows user enumeration

- **Severity:** Medium  
- **File:** `Tria/src/app/api/auth/resend-confirmation/route.ts`  
- **Line Numbers:** 27–31  

**Issue Summary:** The endpoint returns 404 with “No account found with this email address” when the email does not exist, and 200 with a different message when the email exists, allowing enumeration of registered emails.

**Detailed Explanation:**  
User enumeration simplifies phishing and targeted attacks. The endpoint is unauthenticated by design (for users who have not confirmed), but the response body should not reveal existence of the account.

**Recommended Fix:**

1. Return the same HTTP status and a generic message for both “email not found” and “email found, confirmation sent” (e.g. “If an account exists for this email, a confirmation link has been sent.”).
2. Do not return 404 for non-existent email; use 200 with the generic message and optionally rate-limit by IP/email (you already have auth rate limiting; consider a dedicated limit for this action).

**Best Practice Note:** Public auth-related endpoints (reset password, resend confirmation) should use consistent responses to avoid enumeration.

---

### LOW-1: OpenAI API key fallback to empty string

- **Severity:** Low  
- **File:** `Tria/src/lib/tryon/intelligent-scene-analyzer.ts`, and similar in `gpt-face-analyzer.ts`, `complexity-analyzer.ts`  
- **Line Number:** 21 (intelligent-scene-analyzer.ts)  

**Issue Summary:** `apiKey: process.env.OPENAI_API_KEY || ''` creates an OpenAI client even when the key is missing, leading to empty-string key.

**Detailed Explanation:**  
Requests with an empty or invalid key will fail with API errors, but it can make debugging harder and could lead to unexpected behavior if error handling assumes a valid key. It also diverges from the centralized `getOpenAIKey()` which throws when the key is missing.

**Recommended Fix:**

1. Use the centralized `getOpenAIKey()` from `@/lib/config/api-keys` so the key is validated and missing key throws early.
2. If this is intentional for optional features, document it and handle “no key” explicitly (e.g. skip the feature or return a clear error) instead of passing `''`.

**Best Practice Note:** Use a single, validated source for API keys and fail fast when they are missing in required code paths.

---

### LOW-2: Debug route fallback to anon key

- **Severity:** Low  
- **File:** `Tria/src/app/api/debug/check-data/route.ts`  
- **Line Number:** 7  

**Issue Summary:** `const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!` uses the anon key when the service role key is unset.

**Detailed Explanation:**  
In development or misconfiguration, the debug route could run with the anon key. RLS would apply, so behavior and data exposure would differ from “full admin” and could be confusing or unsafe if the route is ever exposed. The primary fix is to remove or lock down the debug route (see HIGH-1).

**Recommended Fix:**

1. Do not fall back to the anon key for this endpoint. If the service role key is not set, return 503 or a clear error and do not run the check.
2. Prefer removing or strictly gating the debug route rather than supporting a fallback key.

**Best Practice Note:** Server-side admin or debug operations should not fall back to less privileged keys; fail explicitly when the intended key is missing.

---

### LOW-3: Verbose logging of auth and errors in API routes

- **Severity:** Low  
- **File:** Multiple (e.g. `Tria/src/app/api/tryon/route.ts` lines 81–84, 96–99; login route logs email)  
- **Line Numbers:** Various  

**Issue Summary:** Some routes log session user IDs, emails, and detailed error messages that could end up in log aggregation or support tools.

**Detailed Explanation:**  
Logging PII (email, user id) and detailed errors can violate privacy and aid an attacker who gains access to logs. It can also leak internal logic (e.g. “Profile not found”, “Hybrid pipeline failed”).

**Recommended Fix:**

1. Avoid logging email or user IDs in plain form in production; use hashed or truncated values if needed for correlation.
2. Log detailed errors and stack traces only server-side (e.g. structured logger with level and env check); do not send them to the client (see MEDIUM-2).
3. Review all `console.log`/`console.error` in API routes and trim to non-sensitive, non-verbose messages in production.

**Best Practice Note:** Treat logs as sensitive; minimize PII and internal details, and control log level by environment.

---

### LOW-4: No security headers in Next.js config

- **Severity:** Low  
- **File:** `Tria/next.config.ts`  
- **Line Numbers:** 1–41  

**Issue Summary:** The Next.js config does not define security headers (e.g. X-Frame-Options, X-Content-Type-Options, CSP, Strict-Transport-Security).

**Detailed Explanation:**  
Security headers help mitigate XSS, clickjacking, MIME sniffing, and protocol downgrade. Relying only on framework defaults may leave gaps.

**Recommended Fix:**

1. Add headers in `next.config.ts` (or via middleware) such as:
   - `X-Frame-Options: DENY` (or SAMEORIGIN if you need framing)
   - `X-Content-Type-Options: nosniff`
   - `Referrer-Policy: strict-origin-when-cross-origin` (or stricter)
   - `Strict-Transport-Security` (when serving over HTTPS)
   - Content-Security-Policy (CSP) tuned to your app
2. Ensure `poweredByHeader: false` remains (already set) to avoid disclosing Next.js.

**Best Practice Note:** Define a security headers policy in config or middleware and review it as part of release.

---

## 3. Dependency and Configuration Issues

### Outdated or vulnerable libraries

| Package | Issue | Recommendation |
|--------|--------|----------------|
| jws (transitive) | High – Improperly Verifies HMAC Signature (GHSA-869p-cjfg-cm3x) | Run `npm audit fix`; if not fixed, upgrade the direct dependency that pulls in jws (e.g. Supabase/auth-related). |

### Configuration

- **next.config.ts:** No security headers (see LOW-4). `poweredByHeader: false` is set (good).
- **Environment:** Secrets are read from `process.env`; no hardcoded API keys in the sampled code except the passwords and temp passwords noted above. `.env.example` documents required vars without real values (good).
- **Rate limiting:** Implemented in `rate-limit-middleware.ts` with buckets for auth, tryon, and AI routes; in-memory store. For production at scale, consider a shared store (e.g. Redis) for consistency across instances.

---

## 4. General Recommendations

1. **Secrets and credentials**  
   - Remove all hardcoded passwords and temporary passwords; use env or secret manager and per-request generation where needed.  
   - Never return credentials or one-time links in API responses.

2. **Sensitive and debug endpoints**  
   - Remove or strictly protect `/api/setup/admin`, `/api/debug/check-data`, `/api/auth/test-email`, and `/api/auth/diagnose` (admin-only and/or development-only, no link/config/stack in response).  
   - Ensure health/db returns minimal, non-sensitive info and is restricted if needed.

3. **Input and URL validation**  
   - Harden the image proxy with strict URL allowlisting (parsed URL, allowlisted Supabase storage host/path).  
   - Continue using Zod (or similar) for request bodies; ensure all user-controlled inputs are validated and length-limited.

4. **Authentication and authorization**  
   - Use the session-aware client for “current user” and admin checks; use the service role client only for authorized admin actions.  
   - Fix admin clear-auth to use the user client for `getUser()` and service client only for the destructive operation.

5. **Information disclosure**  
   - Use a single, generic message for login failures and resend-confirmation to prevent user enumeration.  
   - Do not expose stack traces, internal config, or one-time links to the client; log them server-side only.

6. **Dependencies and operations**  
   - Run `npm audit` regularly and fix high/critical issues.  
   - Consider automated dependency scanning (e.g. Dependabot, Snyk) and a policy for upgrading transitive dependencies.

7. **Security headers and CORS**  
   - Add security headers (X-Frame-Options, X-Content-Type-Options, CSP, HSTS) in Next.js config or middleware.  
   - Restrict CORS on the image proxy to your own origins instead of `*`.

8. **Logging**  
   - Avoid logging PII and detailed errors to the client or to logs that are widely accessible; use structured logging and environment-based log levels.

Implementing the critical and high-severity items first will materially reduce risk; the medium and low items will improve defense-in-depth and maintainability.
