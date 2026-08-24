const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const ownerEmail = process.env.OWNER_EMAIL;
const ownerPassword = process.env.OWNER_PASSWORD;

if (!SUPABASE_URL || !SUPABASE_KEY || !ownerEmail || !ownerPassword) {
  throw new Error('SUPABASE_URL, SUPABASE_KEY, OWNER_EMAIL, and OWNER_PASSWORD must be set');
}

async function req(path, method = 'GET', body = null, token = null) {
  const headers = {
    'apikey': SUPABASE_KEY,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${SUPABASE_URL}${path}`, opts);
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

async function main() {
  console.log('=== AUTHENTICATING OWNER ACCOUNT ===');

  let signInRes = await req('/auth/v1/token?grant_type=password', 'POST', { email: ownerEmail, password: ownerPassword });
  let token = signInRes.data?.access_token;

  if (!token) {
    console.log('Sign in failed, attempting signup...');
    const signUpRes = await req('/auth/v1/signup', 'POST', { email: ownerEmail, password: ownerPassword });
    token = signUpRes.data?.session?.access_token || signUpRes.data?.access_token;
  }

  if (!token) {
    console.error('Could not obtain token:', signInRes.data);
    return;
  }

  console.log('Got Owner Token successfully!');

  // Claim owner role
  const claimRes = await req('/rest/v1/rpc/claim_owner', 'POST', {}, token);
  console.log('Claim owner role result:', claimRes.data);

  // 1. Update shop_settings to OPEN
  const getSettings = await req('/rest/v1/shop_settings?select=*', 'GET', null, token);
  if (getSettings.ok && getSettings.data.length > 0) {
    const id = getSettings.data[0].id;
    const upd = await req(`/rest/v1/shop_settings?id=eq.${id}`, 'PATCH', {
      is_open_override: true,
      open_time: '08:00',
      close_time: '22:00'
    }, token);
    console.log('Updated shop_settings OPEN status:', upd.ok ? 'SUCCESS' : upd.data);
  } else {
    const ins = await req('/rest/v1/shop_settings', 'POST', [{
      is_open_override: true,
      open_time: '08:00',
      close_time: '22:00'
    }], token);
    console.log('Inserted shop_settings OPEN status:', ins.ok ? 'SUCCESS' : ins.data);
  }

  // 2. Seed Food Items
  const sampleItems = [
    { name: 'Special South Indian Meals', price: 90, available_quantity: 25, is_active: true },
    { name: 'Executive Chicken Biryani', price: 150, available_quantity: 30, is_active: true },
    { name: 'Curd Rice', price: 40, available_quantity: 20, is_active: true },
    { name: 'Paneer Butter Masala Combo', price: 120, available_quantity: 0, is_active: true }, // 0 quantity
    { name: 'Seasonal Fruit Bowl', price: 50, available_quantity: 15, is_active: false }, // inactive
  ];

  for (const item of sampleItems) {
    const check = await req(`/rest/v1/food_items?name=eq.${encodeURIComponent(item.name)}`, 'GET', null, token);
    if (check.ok && check.data.length > 0) {
      const upd = await req(`/rest/v1/food_items?id=eq.${check.data[0].id}`, 'PATCH', item, token);
      console.log(`Updated food item "${item.name}":`, upd.ok ? 'SUCCESS' : upd.data);
    } else {
      const ins = await req('/rest/v1/food_items', 'POST', [item], token);
      console.log(`Inserted food item "${item.name}":`, ins.ok ? 'SUCCESS' : ins.data);
    }
  }

  // 3. Seed Orders
  const sampleOrders = [
    {
      order_number: '#1001',
      student_name: 'Rahul Sharma',
      phone_number: '9876543210',
      department: 'Computer Science',
      items: [{ name: 'Special South Indian Meals', qty: 2, price: 90 }],
      total_amount: 180,
      payment_method: 'cod',
      payment_status: 'pending',
      order_status: 'placed',
    },
    {
      order_number: '#1002',
      student_name: 'Priya Sundaram',
      phone_number: '9876543211',
      department: 'Electrical Eng',
      items: [{ name: 'Executive Chicken Biryani', qty: 1, price: 150 }],
      total_amount: 150,
      payment_method: 'online',
      payment_status: 'paid',
      order_status: 'delivered',
      delivered_at: new Date().toISOString(),
    },
    {
      order_number: '#1003',
      student_name: 'Karthik Raja',
      phone_number: '9876543212',
      department: 'Mechanical Eng',
      items: [{ name: 'Curd Rice', qty: 2, price: 40 }],
      total_amount: 80,
      payment_method: 'cod',
      payment_status: 'pending',
      order_status: 'cancelled',
      cancelled_at: new Date().toISOString(),
    },
  ];

  for (const ord of sampleOrders) {
    const checkOrd = await req(`/rest/v1/orders?order_number=eq.${encodeURIComponent(ord.order_number)}`, 'GET', null, token);
    if (!checkOrd.ok || checkOrd.data.length === 0) {
      const insOrd = await req('/rest/v1/orders', 'POST', [ord], token);
      console.log(`Inserted order ${ord.order_number}:`, insOrd.ok ? 'SUCCESS' : insOrd.data);
    }
  }

  console.log('=== SEEDING COMPLETED SUCCESSFULLY ===');
}

main().catch(console.error);
