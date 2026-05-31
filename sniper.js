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
    const prompt = `You are Rafih, a humble, honest, and passionate Front-End Developer who enjoys building interactive websites using GSAP and React.
Write a very short, polite, and realistic cover letter (max 2 paragraphs) in English to bid on this job:

Job Title: ${jobTitle}
Job Description: ${jobDescription}

Strict Rules:
1. Be humble, simple, and honest. Do NOT exaggerate your skills or use corporate buzzwords like "scale seamlessly for millions of users" or "highly skilled expert". Just say you enjoy coding and building web animations.
2. Politely mention that you have experience building smooth websites with GSAP and you are eager to help them with their project.
3. You MUST include this exact link in your proposal: "I recently built a portfolio to showcase my GSAP animations. I would be very happy if you could take a quick look: https://porto-v-2-1.vercel.app/"
4. Keep it very natural and friendly, like a normal person writing an email.
5. Sign off respectfully with "Best regards, Rafih".`;

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
        // Kita pakai Remotive API karena 100% gratis dan langsung tembus ke web asli klien (Greenhouse/Lever dll)
        const response = await fetch('https://remotive.com/api/remote-jobs?category=software-dev&search=front%20end');
        const data = await response.json();
        const feed = data.jobs || [];

        // Filter pekerjaan: Cuma cari yang cocok buat Freelancer / Mid-Level
        const targetJobs = feed.filter(job => {
            const title = job.title.toLowerCase();
            const desc = job.description?.toLowerCase() || "";
            
            // Skip kalau ada kata-kata level dewa/kantoran
            if (title.includes('senior') || title.includes('lead') || title.includes('staff') || title.includes('principal') || title.includes('manager')) {
                return false;
            }
            
            // Ambil kalau ada hubungannya sama skill kita
            const isMatch = title.includes('react') || desc.includes('react') || 
                            title.includes('gsap') || desc.includes('gsap') || 
                            title.includes('front-end') || title.includes('frontend') ||
                            title.includes('freelance') || title.includes('contract');
            
            return isMatch;
        });

        if (targetJobs.length > 0) {
            // Ambil pekerjaan terbaru yang sesuai kriteria kita
            const targetAsli = targetJobs[0];

            if (!seenJobs.has(targetAsli.id)) {
                seenJobs.add(targetAsli.id);
                
                ctx.reply(`⚠️ TARGET NYATA TERDETEKSI!\nProyek: ${targetAsli.title}\n\n🤖 Gemini sedang mengetik proposal... ⏳`);
                
                // Bersihkan HTML dari deskripsi buat Gemini biar gak bingung dan hemat token
                const cleanDesc = targetAsli.description.replace(/<[^>]*>?/gm, '').substring(0, 800);
                const proposal = await generateProposal(targetAsli.title, cleanDesc);
                
                // Rakit pesan akhir yang dikirim ke Telegram lu
                const pesan = `🎯 <b>PROYEK NYATA BARU!</b> 🎯\n\n` +
                              `<b>Judul:</b> ${targetAsli.title}\n` +
                              `<b>Perusahaan:</b> ${targetAsli.company_name}\n` +
                              `<b>Tipe:</b> ${targetAsli.job_type}\n` +
                              `<b>Sumber:</b> Remotive (Tanpa Login)\n\n` +
                              `🔗 <b>Lamar Sekarang:</b> <a href="${targetAsli.url}">Klik Di Sini</a>\n\n` +
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
