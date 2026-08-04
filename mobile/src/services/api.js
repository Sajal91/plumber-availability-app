import { supabase } from '../lib/supabase';
import { normalizePhone } from '../utils/phone';

const PROFILE_SELECT = 'id, name, phone_number, role, status, last_updated';

export const mapProfile = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    phoneNumber: row.phone_number,
    role: row.role,
    status: row.status,
    lastUpdated: row.last_updated,
  };
};

const throwApiError = (message, status) => {
  const error = new Error(message || 'Something went wrong. Please try again.');
  error.status = status;
  throw error;
};

const readFunctionErrorMessage = async (error, fallbackData) => {
  if (fallbackData?.message) {
    return fallbackData.message;
  }

  try {
    if (error?.context && typeof error.context.json === 'function') {
      const body = await error.context.json();
      if (body?.message) {
        return body.message;
      }
    }
  } catch {
    // ignore parse failures
  }

  return error?.message || 'Unable to request OTP. Please try again.';
};

/**
 * Invite-only gate, then Supabase Phone Auth OTP send.
 */
export const sendOtp = async (phoneNumber) => {
  const phone = normalizePhone(phoneNumber);
  if (!phone) {
    throwApiError('Enter a valid phone number', 400);
  }

  const { data: gateData, error: gateError } = await supabase.functions.invoke(
    'request-otp',
    { body: { phoneNumber: phone } }
  );

  if (gateError) {
    const message = await readFunctionErrorMessage(gateError, gateData);
    throwApiError(message, gateError.context?.status || 400);
  }

  if (gateData?.message?.includes('not registered')) {
    throwApiError(gateData.message, 404);
  }

  const otpPhone = normalizePhone(gateData?.phone) || phone;

  // Invite-only: never create a new Auth user from the login screen.
  const { error } = await supabase.auth.signInWithOtp({
    phone: otpPhone,
    options: { shouldCreateUser: false },
  });

  if (error) {
    const lowered = (error.message || '').toLowerCase();
    const message =
      lowered.includes('signups not allowed') || lowered.includes('user not found')
        ? 'Phone number not registered. Contact admin.'
        : error.message;
    throwApiError(message, 400);
  }

  return { phone: otpPhone, message: 'OTP sent successfully' };
};

/**
 * Verify SMS OTP and load the invite-only profile.
 */
export const verifyOtp = async (phoneNumber, otp) => {
  const phone = normalizePhone(phoneNumber);
  if (!phone) {
    throwApiError('Enter a valid phone number', 400);
  }

  const { data, error } = await supabase.auth.verifyOtp({
    phone,
    token: otp,
    type: 'sms',
  });

  if (error) {
    throwApiError(error.message || 'Invalid phone number or OTP', 401);
  }

  const userId = data.user?.id;
  if (!userId) {
    throwApiError('Login failed. Please try again.', 401);
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select(PROFILE_SELECT)
    .eq('id', userId)
    .maybeSingle();

  if (profileError) {
    await supabase.auth.signOut();
    throwApiError(profileError.message, 500);
  }

  if (!profile) {
    await supabase.auth.signOut();
    throwApiError('Phone number not registered. Contact admin.', 403);
  }

  return {
    message: 'Login successful',
    user: mapProfile(profile),
  };
};

export const getMe = async () => {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throwApiError('Not authenticated', 401);
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select(PROFILE_SELECT)
    .eq('id', user.id)
    .single();

  if (error) {
    throwApiError(error.message, 500);
  }

  return { user: mapProfile(profile) };
};

export const getPlumbers = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_SELECT)
    .eq('role', 'plumber')
    .order('name', { ascending: true });

  if (error) {
    throwApiError(error.message, 500);
  }

  return { plumbers: (data || []).map(mapProfile) };
};

export const updateStatus = async (status) => {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throwApiError('Not authenticated', 401);
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({ status })
    .eq('id', user.id)
    .select(PROFILE_SELECT)
    .single();

  if (error) {
    throwApiError(error.message, 400);
  }

  return {
    message: 'Status updated successfully',
    user: mapProfile(data),
  };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throwApiError(error.message, 500);
  }
};

export const getErrorMessage = (error) => {
  if (!error) {
    return 'Something went wrong. Please try again.';
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error.message === 'Network Error' || error.message?.includes('Failed to fetch')) {
    return 'Cannot reach server. Check your Supabase URL and network connection.';
  }

  return error.message || 'Something went wrong. Please try again.';
};
