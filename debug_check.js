
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xeimgafswdfxmwxtwfmp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable__9Si77oTuVgp9VHtkoCwjA_BdIQL-eN';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function check() {
    console.log("Checking DB Connection...");

    // 1. Check Count of ALL Policies
    const { count, error: countError } = await supabase
        .from('policies')
        .select('*', { count: 'exact', head: true });

    if (countError) console.error("Count Error:", countError);
    console.log("Total Policies in DB:", count);

    // 2. Fetch Sample of ACTIVE policies
    console.log("Fetching sample Active/Potential policies...");
    const { data, error } = await supabase
        .from('policies')
        .select('id, policy_no, status, end_date')
        .in('status', ['Active', 'Potansiyel', 'Potential'])
        .order('end_date', { ascending: true }) // Upcoming expiries
        .limit(20);

    if (error) {
        console.error("Fetch Error:", error);
    } else {
        console.log("Found Active/Potential Policies:", data.length);
        if (data.length > 0) {
            console.log("First 5 upcoming items:");
            data.slice(0, 5).forEach(p => console.log(`- ${p.end_date} | ${p.status} | ${p.policy_no}`));

            console.log("Last 5 items:");
            data.slice(-5).forEach(p => console.log(`- ${p.end_date} | ${p.status} | ${p.policy_no}`));
        }
    }

    // 3. Check what statuses explicitly exist
    // Fetch a sample of 100 to guess statuses
    const { data: rawData } = await supabase.from('policies').select('status').limit(100);
    const statuses = [...new Set(rawData?.map(p => p.status))];
    console.log("Sample Statuses found in DB:", statuses);
}

check();

