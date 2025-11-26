// Note: nécessite process.env.SUPABASE_SERVICE_ROLE_KEY et SUPABASE_URL
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { userId, newPassword } = req.body;
  if (!userId || !newPassword) return res.status(400).json({ error: 'Missing params' });

  const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // Exemple : update du password via admin API
  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    password: newPassword,
    email_confirm: true
  });

  if (error) return res.status(500).json({ error });
  return res.status(200).json({ data });
}
