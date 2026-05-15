const supabase = require('../lib/supabase');
const { COVER_BUCKET, getPublicUrl, getSignedUrl } = require('../services/storageService');

async function getAllUserBooks(req, res, next) {
    try {
        // 1. Ambil data User dari middleware
        const userId = req.user.id;

        // VERBOSE
        // console.log(userId);

        // 2. Tarik semua data yang dibutuhkan secara Paralel
        // books: daftar semua buku
        // library: daftar buku yang sudah dibeli user ini
        // profile: status langganan user
        const [booksRes, libraryRes, profileRes] = await Promise.all([
            supabase.from("books").select("*").order("created_at", { ascending: false }),
            supabase.from("user_library").select("book_id").eq("user_id", userId),
            supabase.from('profiles').select('is_subscribed, subscription_until').eq('id', userId).single()
        ]);

        if (booksRes.error) throw booksRes.error;

        // 3. Ekstrak IDs dari library agar pengecekan .includes() jadi kencang
        const purchasedBookIds = libraryRes.data?.map(item => item.book_id) || [];

        // 4. Hitung status langganan
        const profile = profileRes.data;
        const isSubscribed = profile?.is_subscribed && new Date(profile.subscription_until) > new Date();
    
        // 5. Mapping hasil akhir
        const finalBooks = booksRes.data.map((book) => {
            const hasPurchased = purchasedBookIds.includes(book.id);

            return {
                ...book,
                cover_url: getPublicUrl(COVER_BUCKET, book.cover_filename),
                // User bisa buka kalau: Berlangganan AKTIF atau sudah beli buku tersebut
                is_locked: !(isSubscribed || hasPurchased)
            };
        });

        res.json({ data: finalBooks });
    } catch (err) {
        console.error("Error in getAllUserBooks:", err);
        next(err);
    }
}

async function getBookDetails(req, res, next) {
    try {
        const bookId = req.params.id;
        // Ambil ID langsung dari middleware, tidak perlu getUser(token) lagi!
        const userId = req.user.id; 

        // 1. Jalankan semua query secara PARALEL
        // Ini kunci biar nggak ada "delay 5 menit" karena query jalan barengan
        const [bookRes, libraryRes, profileRes] = await Promise.all([
            supabase.from('books').select('*').eq('id', bookId).single(),
            supabase.from("user_library").select("id").eq("user_id", userId).eq("book_id", bookId).maybeSingle(),
            supabase.from('profiles').select('is_subscribed, subscription_until').eq('id', userId).single()
        ]);

        // 2. Cek apakah buku ada
        if (bookRes.error || !bookRes.data) {
            return res.status(404).json({ error: 'Buku Tidak Ditemukan' });
        }

        const book = bookRes.data;
        const hasPurchased = !!libraryRes.data;
        const profile = profileRes.data;
        
        // 3. Logic Subscription yang reaktif terhadap data terbaru di DB
        const isSubscribed = profile?.is_subscribed && new Date(profile.subscription_until) > new Date();

        // 4. Final Assembly
        res.json({ 
            data: {
                ...book,
                cover_url: getPublicUrl(COVER_BUCKET, book.cover_filename),
                // Gembok terbuka jika langganan aktif ATAU sudah beli satuan
                is_locked: !(isSubscribed || hasPurchased) 
            } 
        });

    } catch (err) {
        // Jika ada crash, next(err) akan kirim ke error handler express
        console.error("Error in getBookDetails:", err);
        next(err);
    }
}

module.exports = { getAllUserBooks, getBookDetails };