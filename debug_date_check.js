
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xeimgafswdfxmwxtwfmp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable__9Si77oTuVgp9VHtkoCwjA_BdIQL-eN';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function check() {
    console.log("Checking Policies for 2025-12-13...");

    const targetDate = '2025-12-13';

    // Fetch ALL policies ending on this date
    const { data, error } = await supabase
        .from('policies')
        .select(`
        id, 
        policy_no, 
        status, 
        end_date, 
        customers ( full_name )
    `)
        .eq('end_date', targetDate);

    if (error) {
        console.error("Error:", error);
        return;
    }

    console.log(`Found ${data.length} policies ending on ${targetDate}:`);
    data.forEach(p => {
        console.log(`- Customer: ${p.customers?.full_name} | Status: ${p.status} | PolicyNo: ${p.policy_no}`);
    });
}

check();
