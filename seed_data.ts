
import { createClient } from '@supabase/supabase-js';

// Hardcoded values for local seeding script
const supabaseUrl = 'https://xeimgafswdfxmwxtwfmp.supabase.co';
const supabaseKey = 'sb_publishable__9Si77oTuVgp9VHtkoCwjA_BdIQL-eN';

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const FIRST_NAMES = ['Ahmet', 'Mehmet', 'Ayşe', 'Fatma', 'Mustafa', 'Zeynep', 'Ali', 'Emine', 'Hüseyin', 'Elif'];
const LAST_NAMES = ['Yılmaz', 'Kaya', 'Demir', 'Çelik', 'Şahin', 'Yıldız', 'Yıldırım', 'Öztürk', 'Aydın', 'Özdemir'];
const COMPANY_SUFFIXES = ['A.Ş.', 'Ltd. Şti.', 'Holding', 'Grup', 'Ticaret'];

const getRandomElement = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];
const getRandomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const generateTCKN = () => {
    let tckn = '';
    for (let i = 0; i < 11; i++) tckn += Math.floor(Math.random() * 10);
    return tckn;
};

const generateVKN = () => {
    let vkn = '';
    for (let i = 0; i < 10; i++) vkn += Math.floor(Math.random() * 10);
    return vkn;
};

const main = async () => {
    console.log('Starting seed process...');

    const { data: products } = await supabase.from('insurance_products').select('id, name_tr, category_id').eq('is_active', true);
    const { data: companies } = await supabase.from('settings_companies').select('id').eq('is_active', true);
    const { data: users } = await supabase.from('settings_users').select('id').eq('role', 'Satışçı');

    if (!products || products.length === 0) throw new Error('No products found');
    if (!companies || companies.length === 0) throw new Error('No companies found');
    const salesPersonIds = users?.map(u => u.id) || [];

    console.log(`Found ${products.length} products and ${companies.length} companies.`);

    const createdCustomerIds: string[] = [];

    // Create 5 Individual
    for (let i = 0; i < 5; i++) {
        const payload = {
            type: 'Bireysel',
            full_name: `${getRandomElement(FIRST_NAMES)} ${getRandomElement(LAST_NAMES)}`,
            tc_kn: generateTCKN(),
            email: `test_bireysel_${i}_${Date.now()}@example.com`,
            phone: `555${getRandomInt(1000000, 9999999)}`,
            risk_score: getRandomInt(10, 100)
        };
        const { data, error } = await supabase.from('customers').insert(payload).select('id').single();
        if (error) console.error('Error creating Bireysel:', error);
        else createdCustomerIds.push(data.id);
    }

    // Create 5 Corporate
    for (let i = 0; i < 5; i++) {
        const companyName = `${getRandomElement(LAST_NAMES)} ${getRandomElement(['İnşaat', 'Teknoloji', 'Gıda', 'Otomotiv', 'Lojistik'])} ${getRandomElement(COMPANY_SUFFIXES)}`;
        const payload = {
            type: 'Kurumsal',
            full_name: companyName,
            tc_kn: generateVKN(),
            email: `info@${companyName.toLowerCase().replace(/ /g, '').replace(/\./g, '').substring(0, 10)}_${Date.now()}.com`,
            phone: `212${getRandomInt(1000000, 9999999)}`,
            risk_score: getRandomInt(50, 100)
        };
        const { data, error } = await supabase.from('customers').insert(payload).select('id').single();
        if (error) console.error('Error creating Kurumsal:', error);
        else createdCustomerIds.push(data.id);
    }

    console.log(`Created ${createdCustomerIds.length} customers.`);

    let policyCount = 0;
    for (const customerId of createdCustomerIds) {
        for (const product of products) {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - getRandomInt(1, 300));
            const endDate = new Date(startDate);
            endDate.setFullYear(endDate.getFullYear() + 1);

            const premium = getRandomInt(1000, 50000);
            const commission = premium * (getRandomInt(10, 25) / 100);

            const { error } = await supabase.from('policies').insert({
                customer_id: customerId,
                company_id: getRandomElement(companies).id,
                product_id: product.id,
                category_id: product.category_id,
                type: 'Diğer',
                policy_no: `POL-${Date.now()}-${getRandomInt(100, 999)}`,
                start_date: startDate.toISOString().split('T')[0],
                end_date: endDate.toISOString().split('T')[0],
                premium: premium,
                commission_amount: commission,
                status: 'Active',
                salesperson_id: salesPersonIds.length > 0 ? getRandomElement(salesPersonIds) : null,
                description: 'Otomatik test kaydı'
            });
            if (error) console.error('Error creating policy:', error);
            else policyCount++;
        }

        for (let k = 0; k < 2; k++) {
            // Fix: Added start_date and end_date for Potential policies (required by DB)
            const startDate = new Date().toISOString().split('T')[0];
            const endDate = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0];

            const { error } = await supabase.from('policies').insert({
                customer_id: customerId,
                status: 'Potential',
                type: 'Diğer',
                product_id: getRandomElement(products).id,
                description: 'Potansiyel görüşme notu vs.',
                policy_no: `POT-${Date.now()}-${getRandomInt(1000, 9999)}`,
                start_date: startDate, // Required
                end_date: endDate,     // Required
                premium: 0,
                commission_amount: 0
            });
            if (error) console.error('Error creating potential:', error);
        }
    }

    console.log(`Created ${policyCount} active policies and ${createdCustomerIds.length * 2} potential policies.`);
    console.log('Seeding complete.');
};

main();
