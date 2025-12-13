
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xeimgafswdfxmwxtwfmp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable__9Si77oTuVgp9VHtkoCwjA_BdIQL-eN';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function check() {
    console.log("Checking Specific Policies...");

    // Search for the names visible in the user's screenshot
    const names = ['Miralay', 'Arda', 'Alperen'];

    for (const name of names) {
        const { data, error } = await supabase
            .from('customers')
            .select('id, full_name, policies ( id, end_date, policy_no, status )')
            .ilike('full_name', `%${name}%`)
            .limit(5);

        if (data) {
            data.forEach(c => {
                console.log(`Customer: ${c.full_name}`);
                c.policies.forEach(p => {
                    console.log(`  - Policy End Date: ${p.end_date} | Status: ${p.status}`);
                });
            });
        }
    }
}

check();
