/**
 * Security and Local Storage Durability Utility
 */

/**
 * Requests persistent storage from browser to prevent silent cache eviction
 */
export async function requestPersistentStorage() {
  if (typeof navigator === 'undefined' || !navigator.storage || !navigator.storage.persist) {
    return { supported: false, persisted: false, message: 'Storage Persistence API not supported in this browser' };
  }

  try {
    const isAlreadyPersisted = await navigator.storage.persisted();
    if (isAlreadyPersisted) {
      return { supported: true, persisted: true, message: 'Storage is already marked persistent' };
    }

    const granted = await navigator.storage.persist();
    return {
      supported: true,
      persisted: granted,
      message: granted ? 'Persistent storage granted' : 'Persistent storage was denied by browser',
    };
  } catch (err) {
    console.warn('Could not request persistent storage:', err);
    return { supported: true, persisted: false, error: err.message };
  }
}

/**
 * Generate a random cryptographic salt
 */
export function generateSalt() {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    return Array.from(arr)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * Hash a PIN or password using SHA-256 with salt via Web Crypto API
 */
export async function hashPin(pin, salt) {
  const enc = new TextEncoder();
  const data = enc.encode(`${salt}:${pin}:BizCRM_Lock`);
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const buffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // Fallback simple hash for non-crypto test environments
  let hash = 0;
  const str = `${salt}:${pin}`;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return `fallback_${Math.abs(hash)}`;
}

/**
 * Verify entered PIN against stored hash
 */
export async function verifyPin(enteredPin, storedHash, salt) {
  if (!storedHash || !enteredPin) return false;
  const computed = await hashPin(enteredPin, salt);
  return computed === storedHash;
}

const PIN_STORAGE_KEY = 'bizcrm_pin_config';
const PIN_SESSION_KEY = 'bizcrm_unlocked';

export function getPinConfig() {
  try {
    const raw = localStorage.getItem(PIN_STORAGE_KEY);
    if (!raw) return { enabled: false, hash: null, salt: null };
    const parsed = JSON.parse(raw);
    return {
      enabled: Boolean(parsed.enabled && parsed.hash && parsed.salt),
      hash: parsed.hash || null,
      salt: parsed.salt || null,
    };
  } catch {
    return { enabled: false, hash: null, salt: null };
  }
}

export async function setAppPin(pin) {
  if (!pin || pin.length < 4) {
    throw new Error('PIN must be at least 4 digits');
  }
  const salt = generateSalt();
  const hash = await hashPin(pin, salt);
  localStorage.setItem(
    PIN_STORAGE_KEY,
    JSON.stringify({
      enabled: true,
      hash,
      salt,
      updatedAt: new Date().toISOString(),
    })
  );
  setSessionUnlocked(true);
  return true;
}

export function removeAppPin() {
  localStorage.removeItem(PIN_STORAGE_KEY);
  sessionStorage.removeItem(PIN_SESSION_KEY);
  return true;
}

export function isPinProtected() {
  return getPinConfig().enabled;
}

export function isSessionUnlocked() {
  if (!isPinProtected()) return true;
  return sessionStorage.getItem(PIN_SESSION_KEY) === 'true';
}

export function setSessionUnlocked(unlocked) {
  if (unlocked) {
    sessionStorage.setItem(PIN_SESSION_KEY, 'true');
  } else {
    sessionStorage.removeItem(PIN_SESSION_KEY);
  }
}

