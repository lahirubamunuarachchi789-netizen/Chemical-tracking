/**
 * Name of the httpOnly session cookie.
 *
 * Kept in its own module (no `server-only`, no `jose` import) so that the
 * Edge Runtime middleware can import it without pulling in Node.js-only code.
 */
export const SESSION_COOKIE_NAME = "concord_chemtrack_session";
