const supabase = require("../lib/supabase");

// ─────────────────────────────────────────
// POST /auth/login
// ─────────────────────────────────────────
async function login(req, res, next) {
    try {
      const { email, password } = req.body;
  
      // 1. Autentikasi ke Supabase
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
  
      // 2. Ambil profil (tanpa memblokir akses kalau bukan admin)
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', data.user.id)
        .single();
  
      // 3. Kirim semua datanya. Frontend yang tentukan 'siapa boleh apa'.
      res.json({
        message: "Login berhasil",
        token: data.session.access_token,
        user: {
          id: data.user.id,
          email: data.user.email,
          // Kalau profile ga ketemu, default-kan ke false
          is_admin: profile ? profile.is_admin : false 
        }
      });
  
    } catch (err) {
      res.status(401).json({ error: err.message });
    }
  }


// ─────────────────────────────────────────
// POST /auth/signup
// ─────────────────────────────────────────
  async function signup(req, res, next) {
    try {
      const { email, password } = req.body;
  
      if (!email || !password) {
        return res.status(400).json({ error: "Email dan password wajib diisi" });
      }
  
      // 1. Register user di Supabase Auth
      const { data, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true // INI KUNCINYA: Langsung terverifikasi!
      });
  
      if (authError) throw authError;
  
      // 2. Insert ke tabel profiles
      // Secara default, kita set is_admin: false untuk user baru
      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            { 
              id: data.user.id, 
            //   email: data.user.email,
              is_admin: false // Default bukan admin
            }
          ]);
  
        if (profileError) throw profileError;
      }
  
      res.status(201).json({
        message: "Registrasi berhasil. Silakan cek email untuk verifikasi jika diperlukan.",
        user: {
          id: data.user.id,
          email: data.user.email
        }
      });
  
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

module.exports = { login, signup };