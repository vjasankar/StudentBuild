const SUPABASE_URL = "https://qvtpsdcfvogmvkyysdva.supabase.co";

const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_UscbWHMCbCZmWsQM-fP_zQ_LwuV_O5G";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);