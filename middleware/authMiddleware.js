const jwt = require('jsonwebtoken');
const supabase = require('../lib/supabase');

const attachUserContext = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ error: "You are not allowed to make transactions."});
        }

        const token = authHeader.split(' ')[1];
        // console.log(process.env.SUPABASE_JWT_SECRET)
        const decoded = jwt.decode(token);        

        user = {
            id: decoded.sub,
            email: decoded.email
        }

        // The Suspect of Performance Drop [YES IT IS!]
        // const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (!user) {
            return res.status(401).json({ error: "Please Login First"});
        }

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (profileError || !profile) {
            return res.status(404).json({ error: "Data Profil tidak ditemukan"})
        }

        req.user = {
            id: user.id,
            email: user.email,
            full_name: profile.full_name,
            is_subscribed: profile.is_subscribed,
        };

        next();
    } catch (err) {
        console.error("Transaction Auth Error", err);
        res.status(500).json({ error: "Internal Server Error"});
    }
};

module.exports = { attachUserContext }