import { supabase } from './supabase';

export async function signOutFromSupabase() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error) {
    console.error('Error signing out from Supabase:', error);
    throw error;
  }
}

export async function supabaseClient() {
  try {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      console.warn('No active Supabase session found');
    }
    return supabase;
  } catch (error) {
    console.error('Error getting Supabase client with session:', error);
    return supabase;
  }
}