require('dotenv').config();
const { Telegraf } = require('telegraf');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Parser = require('rss-parser');
const express = require('express');

const bot = new Telegraf(process.env.BOT_TOKEN);
const parser = new Parser();

// ==========================================
// DUMMY WEB SERVER (WAJIB UNTUK RENDER.COM)
// ==========================================
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('AI Sniper Bot is Running 24/7!');
});

app.listen(PORT, () => {
  console.log(`Web server nyala di port ${PORT} (Render senyum melihat ini)`);
});

// Menghubungkan ke Otak Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

// Simpan ID pekerjaan yang sudah dikirim biar gak spam HP lu
const seenJobs = new Set();
let pollingInterval;

// Fungsi AI Pembantu (Menulis Surat Lamaran)
async function generateProposal(jobTitle, jobDescription) {
    const prompt = `Anda adalah seorang Freelance Front-End Developer senior yang sangat ahli dalam animasi GSAP dan React.
Tuliskan surat lamaran kerja (Cover Letter) dalam bahasa Inggris untuk klien yang memposting proyek berikut:

Judul Proyek Klien: ${jobTitle}
Deskripsi Proyek: ${jobDescription}

Syarat penulisan:
1. Sangat pendek, *to the point*, dan percaya diri (Maksimal 2 paragraf).
2. Tunjukkan bahwa Anda sudah terbiasa dengan GSAP ScrollTrigger dan optimasi performa.
3. JANGAN pakai kata-kata kaku ala bot AI. Buat se-natural mungkin seperti manusia.
4. Akhiri dengan "Best regards, [Your Name]".`;

    try {
        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (error) {
        console.error("Gemini Error:", error);
        return "⚠️ Gagal meminta AI menulis proposal (Cek limit API atau koneksi).";
    }
}

// Fungsi Radar Pencari Proyek (Murni dari Internet)
async function checkJobs(ctx) {
    console.log("Radar berputar... Mencari target nyata di internet...");
    try {
        // Kita pakai jalur data (RSS) dari WeWorkRemotely (portal job remote global)
        // karena bebas blokir Cloudflare.
        const feedUrl = 'https://weworkremotely.com/categories/remote-front-end-programming-jobs.rss';
        const feed = await parser.parseURL(feedUrl);

        // Filter pekerjaan: Cuma mau yang ada tulisan "React" atau "GSAP"
        const targetJobs = feed.items.filter(job => 
            job.title.toLowerCase().includes('react') || 
            job.contentSnippet?.toLowerCase().includes('react') ||
            job.title.toLowerCase().includes('gsap') ||
            job.contentSnippet?.toLowerCase().includes('gsap')
        );

        if (targetJobs.length > 0) {
            // Ambil pekerjaan terbaru yang sesuai kriteria kita
            const targetAsli = targetJobs[0];

            if (!seenJobs.has(targetAsli.guid)) {
                seenJobs.add(targetAsli.guid);
                
                ctx.reply(`⚠️ TARGET NYATA TERDETEKSI!\nProyek: ${targetAsli.title}\n\n🤖 Gemini sedang mengetik proposal... ⏳`);
                
                // Perintah AI jalan di sini
                const proposal = await generateProposal(targetAsli.title, targetAsli.contentSnippet || "Front-End Developer Job");
                
                // Rakit pesan akhir yang dikirim ke Telegram lu
                const pesan = `🎯 <b>PROYEK NYATA BARU!</b> 🎯\n\n` +
                              `<b>Judul:</b> ${targetAsli.title}\n` +
                              `<b>Sumber:</b> We Work Remotely\n\n` +
                              `🔗 <b>Lamar Sekarang:</b> <a href="${targetAsli.link}">Klik Di Sini</a>\n\n` +
                              `=====================\n` +
                              `🤖 <b>AUTO-PROPOSAL DARI AI:</b>\n<pre>${proposal}</pre>\n` +
                              `=====================\n(Tinggal Copy-Paste aja bos!)`;
                
                ctx.replyWithHTML(pesan);
            } else {
                console.log("Proyek sudah pernah dikirim, skip...");
            }
        } else {
            console.log("Belum ada proyek React/GSAP baru saat ini.");
        }
    } catch (error) {
        console.log("Radar Error:", error.message);
    }
}

// Tombol ON
bot.command('mulai_sniper', (ctx) => {
    ctx.reply('👁️‍🗨️ Mode Sniper BERSENJATA AI diaktifkan!\nRadar akan mencari klien tiap 15 detik.\n(Ketik /stop_sniper untuk istirahat)');
    
    // Tembakan pertama
    checkJobs(ctx);
    
    // Perulangan Polling (Kita set 15 detik buat demo. Aslinya 5-10 menit biar ga diblokir website)
    pollingInterval = setInterval(() => checkJobs(ctx), 15000);
});

// Tombol OFF
bot.command('stop_sniper', (ctx) => {
    clearInterval(pollingInterval);
    ctx.reply('🛑 Sniper dimatikan. Radar masuk mode tidur.');
});

bot.launch().then(() => {
    console.log('🔫 Monster Sniper Bot sudah menyala di Terminal!');
});

// Anti-crash
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
