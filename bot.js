require('dotenv').config();
const { Telegraf } = require('telegraf');
const axios = require('axios');
const cheerio = require('cheerio');

// Inisialisasi bot menggunakan token dari .env
const bot = new Telegraf(process.env.BOT_TOKEN);

// Pesan saat bot pertama kali di-start oleh lu
bot.start((ctx) => {
    ctx.reply('Halo Bos! 🤖 Gua adalah Bot Auto-Affiliate lu.\nGua siap nyariin diskon dan ngirim link affiliate ke sini.\n\nKetik /cari untuk mulai simulasi nyari promo!');
});

// Perintah untuk menyuruh bot mencari promo
bot.command('cari', async (ctx) => {
    ctx.reply('⏳ Sebentar bos, gua lagi keliling internet nyari diskon gila...');
    
    try {
        // [SIMULASI] - Nanti kita ganti dengan URL Tokopedia/Shopee/E-commerce target
        // Sekarang kita pakai dummy api produk aja biar kelihatan cara kerjanya.
        const response = await axios.get('https://dummyjson.com/products/search?q=laptop');
        const produk = response.data.products[0]; // Ambil hasil pertama
        
        if (produk) {
            const diskon = Math.round(produk.discountPercentage);
            // Konversi Dolar ke Rupiah (Asumsi 1 USD = Rp 16.000)
            const kurs = 16000;
            const hargaDiskonRp = Math.round(produk.price * kurs);
            const hargaNormalRp = Math.round(hargaDiskonRp / (1 - (diskon/100)));
            
            // Fungsi untuk memformat angka jadi format Rp (Rp 10.000)
            const formatRp = (angka) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(angka);
            
            // [SIMULASI] Mengubah link biasa menjadi Link Affiliate
            const myAffiliateLink = `https://tokofiktif.com/affiliate?user=rafihanja&product_id=${produk.id}`;
            
            const pesan = `🚨 <b>PROMO NEMU!</b> 🚨\n\n` +
                          `💻 <b>${produk.title}</b>\n` +
                          `❌ Harga Normal: <s>${formatRp(hargaNormalRp)}</s>\n` +
                          `✅ Harga Diskon: <b>${formatRp(hargaDiskonRp)}</b> (Diskon ${diskon}%!)\n\n` +
                          `🔗 Sikat sebelum kehabisan:\n${myAffiliateLink}`;
            
            ctx.replyWithHTML(pesan);
        } else {
            ctx.reply('Lagi sepi bos, belum dapet promo yang masuk akal.');
        }
    } catch (error) {
        console.error(error);
        ctx.reply('Waduh, error pas nyari data nih bro.');
    }
});

// Menjalankan Bot
bot.launch().then(() => {
    console.log('🤖 Bot Affiliate sudah hidup dan menunggu perintah!');
});

// Biar aman kalau server dimatikan
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
