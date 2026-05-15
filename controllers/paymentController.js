const supabase = require('../lib/supabase');

async function subscribe(req, res, next) {
    try {
        const { plan } = req.body;
        const userId = req.user.id;

        let durationDays = 30;
        if ( plan === 'yearly' ) durationDays = 365;

        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + durationDays);

        const { data, error } = await supabase
            .from('profiles')
            .update({
                is_subscribed: true,
                subscription_until: expiryDate.toISOString()
            }) 
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;

        res.json({
            message: `Subscribe ${plan} berhasil!`,
            plan: plan,
            expires_at: expiryDate
        });
    } catch (err) {
        console.error("Subscribe Error:", err);
        res.status(500).json({ error: err.message });
    }
}

async function purchase(req, res, next) {
    const { bookId } = req.body;
    const userId = req.user.id;

    const { error } = await supabase
        .from('user_library')
        .insert([{ 
            user_id: userId, 
            book_id: bookId 
        }]);

    if (error) return res.status(500).json({ error: error.message });

    res.json({ message: "Payment Success!" });

}

module.exports = { purchase, subscribe };