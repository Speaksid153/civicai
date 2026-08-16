import {
  isSignInWithEmailLink,
  onAuthStateChanged,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  signOut,
} from "firebase/auth";
import { auth, getAuthorityProfile, isFirebaseConfigured } from "./firebase";

const bootstrapAuthorityEmail = (import.meta.env.VITE_AUTHORITY_EMAIL || "")
  .trim()
  .toLowerCase();

function requireAuth() {
  if (!auth) {
    throw new Error("Authority login is unavailable because Firebase is not configured for this deployment.");
  }
  return auth;
}

export async function sendAuthoritySignInLink(email) {
  const firebaseAuth = requireAuth();
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail || normalizedEmail !== bootstrapAuthorityEmail) {
    throw new Error("That email is not registered as a CivicAI authority account.");
  }

  await sendSignInLinkToEmail(firebaseAuth, normalizedEmail, {
    url: `${window.location.origin}/authority`,
    handleCodeInApp: true,
  });
}

let emailLinkCompletion;

async function completeAuthorityEmailLink() {
  if (!auth || !isSignInWithEmailLink(auth, window.location.href)) return;
  if (!bootstrapAuthorityEmail) throw new Error("The authority email is not configured for this deployment.");

  if (!emailLinkCompletion) {
    emailLinkCompletion = signInWithEmailLink(auth, bootstrapAuthorityEmail, window.location.href)
      .then(() => window.history.replaceState({}, document.title, "/authority"));
  }
  await emailLinkCompletion;
}

export async function logoutUser() {
  if (auth) await signOut(auth);
}

export function observeAuth(callback) {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

export function observeAuthority(callback) {
  if (!auth) {
    callback({ status: "unconfigured", user: null, profile: null });
    return () => {};
  }

  let cancelled = false;
  let unsubscribe = () => {};

  async function handleUser(user) {
    if (!user) {
      callback({ status: "signed-out", user: null, profile: null });
      return;
    }

    try {
      const profile = await getAuthorityProfile(user.uid);
      const isBootstrapAuthority = Boolean(
        bootstrapAuthorityEmail
        && user.emailVerified
        && user.email?.toLowerCase() === bootstrapAuthorityEmail,
      );
      if (cancelled) return;
      callback({
        status: profile?.active === true || isBootstrapAuthority ? "authorized" : "forbidden",
        user,
        profile: profile || (isBootstrapAuthority ? {
          active: true,
          role: "owner",
          email: user.email,
        } : null),
      });
    } catch (error) {
      if (!cancelled) callback({ status: "error", user, profile: null, error });
    }
  }

  unsubscribe = onAuthStateChanged(auth, handleUser);
  completeAuthorityEmailLink().catch((error) => {
    if (!cancelled) callback({ status: "error", user: null, profile: null, error });
  });

  return () => {
    cancelled = true;
    unsubscribe();
  };
}

export function getCurrentUser() {
  return auth?.currentUser || null;
}

export { isFirebaseConfigured };
