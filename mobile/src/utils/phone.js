const E164_REGEX = /^\+[1-9]\d{6,14}$/;
const LOCAL_10_DIGIT = /^\d{10}$/;

/**
 * Normalize user-entered phone to E.164 (default country +91).
 */
export const normalizePhone = (input) => {
  const trimmed = String(input || '')
    .trim()
    .replace(/[\s()-]/g, '');

  if (E164_REGEX.test(trimmed)) {
    return trimmed;
  }

  if (LOCAL_10_DIGIT.test(trimmed)) {
    return `+91${trimmed}`;
  }

  if (trimmed.startsWith('91') && trimmed.length === 12 && /^\d+$/.test(trimmed)) {
    return `+${trimmed}`;
  }

  return null;
};

/**
 * Display helper: strip +91 for familiar 10-digit UI when applicable.
 */
export const formatPhoneForDisplay = (phone) => {
  if (!phone) return '';
  if (phone.startsWith('+91') && phone.length === 13) {
    return phone.slice(3);
  }
  return phone;
};
