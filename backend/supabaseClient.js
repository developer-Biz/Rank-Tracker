const { createClient } = require('@supabase/supabase-js');

let _client = null;

/**
 * Returns the Supabase client, creating it lazily on first call.
 * This ensures dotenv has already populated process.env before we read the vars.
 */
function getSupabase() {
    if (_client) return _client;

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase credentials not configured. Add SUPABASE_URL and SUPABASE_ANON_KEY to .env');
    }

    _client = createClient(supabaseUrl, supabaseKey);
    return _client;
}

module.exports = getSupabase;
