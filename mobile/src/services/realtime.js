import { supabase } from '../lib/supabase';
import { mapProfile } from './api';

/**
 * Subscribe to plumber profile status changes.
 * Returns an unsubscribe function.
 */
export const subscribeToPlumberUpdates = (onChange) => {
  const channel = supabase
    .channel('plumber-status')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: 'role=eq.plumber',
      },
      (payload) => {
        const profile = mapProfile(payload.new);
        if (profile) {
          onChange(profile);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};
