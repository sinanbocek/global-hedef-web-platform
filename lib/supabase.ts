import { createClient } from '@supabase/supabase-js';

// Kullanıcı tarafından sağlanan Supabase proje bilgileri
const SUPABASE_URL = 'https://xeimgafswdfxmwxtwfmp.supabase.co';
// Client tarafında sadece Public/Anon key kullanılır. Secret key kullanılmaz.
const SUPABASE_ANON_KEY = 'sb_publishable__9Si77oTuVgp9VHtkoCwjA_BdIQL-eN';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
