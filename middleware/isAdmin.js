const supabase = require("../lib/supabase");

/**
 * Middleware: isAdmin
 * - Validates JWT dari header Authorization
 * - Memastikan user memiliki flag is_admin: true di tabel profiles
 */
async function isAdmin(req, res, next) {
  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or invalid Authorization header" });
    }

    const token = authHeader.split(" ")[1];

    // Validasi JWT via Supabase Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    // Cek flag is_admin di tabel profiles
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return res.status(403).json({ error: "User profile not found" });
    }

    if (!profile.is_admin) {
      return res.status(403).json({ error: "Access denied: Admins only" });
    }

    // Attach user ke request untuk digunakan di controller
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = isAdmin;
