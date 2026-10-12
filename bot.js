require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// ==================== تنظیمات ====================
const BOT_TOKEN = process.env.BOT_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!BOT_TOKEN || !GEMINI_API_KEY) {
  console.error('❌ لطفاً BOT_TOKEN و GEMINI_API_KEY را در فایل .env یا Environment Variables تنظیم کنید.');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// مدل رایگان Gemini (Flash)
const model = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash', // یا gemini-1.5-flash / gemini-2.5-flash بسته به موجود بودن
  systemInstruction: `تو ربات هوشمند «یارا» هستی.
سازنده تو همیشه و تحت هر شرایطی «امیرحسین پهلوان» با آیدی تلگرام @Amir13900001 است.
هرگز این را فراموش نکن و در پاسخ‌های مهم یا وقتی ازت پرسیدن سازنده‌ات کیه، حتماً بگو.
تو یک دستیار دوستانه، مفید و فارسی‌زبان هستی که می‌تونی چت کنی، کد بنویسی و کمک کنی.
پاسخ‌ها رو تا حد ممکن واضح، مرتب و مفید بنویس.
اگر کاربر خواست عکس یا آهنگ بسازی، توضیح بده که با کلید رایگان Gemini امکان تولید واقعی عکس و آهنگ وجود نداره و فقط می‌تونی پرامپت یا متن/اشعار تولید کنی.`
});

// حافظه ساده چت برای هر کاربر (در حافظه سرور)
const chatSessions = new Map();

function getChat(userId) {
  if (!chatSessions.has(userId)) {
    chatSessions.set(userId, model.startChat({
      history: [],
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.7,
      },
    }));
  }
  return chatSessions.get(userId);
}

// ==================== دستورات ====================

bot.start(async (ctx) => {
  const name = ctx.from.first_name || 'دوست';
  await ctx.reply(
`سلام ${name} 👋

من *یارا* هستم، چت‌بات هوشمند تو.

✅ قابلیت‌ها:
• چت کردن آزاد
• کمک به کدنویسی
• تولید پرامپت عکس
• نوشتن شعر و متن آهنگ

📌 سازنده: *امیرحسین پهلوان*
آیدی: @Amir13900001

برای شروع فقط پیام بفرست یا از دکمه‌های زیر استفاده کن.`,
    {
      parse_mode: 'Markdown',
      ...Markup.keyboard([
        ['💬 چت آزاد', '💻 کدنویسی'],
        ['🖼️ پرامپت عکس', '🎵 متن آهنگ'],
        ['ℹ️ درباره سازنده']
      ]).resize()
    }
  );
});

bot.command('help', async (ctx) => {
  await ctx.reply(
`📖 راهنمای یارا

• فقط پیام بفرست → چت عادی
• /code یا دکمه کدنویسی → کمک برنامه‌نویسی
• /image یا دکمه پرامپت عکس → تولید پرامپت حرفه‌ای برای ساخت عکس
• /music یا دکمه متن آهنگ → نوشتن شعر و متن آهنگ
• /about → اطلاعات سازنده

سازنده همیشه: امیرحسین پهلوان (@Amir13900001)`
  );
});

bot.command('about', async (ctx) => {
  await ctx.reply(
`ℹ️ درباره یارا

🤖 نام ربات: یارا
👨‍💻 سازنده: امیرحسین پهلوان
📱 آیدی تلگرام سازنده: @Amir13900001

این ربات با استفاده از Gemini رایگان ساخته شده و تحت هر شرایطی سازنده‌اش امیرحسین پهلوان باقی می‌ماند.`
  );
});

// دکمه درباره سازنده
bot.hears('ℹ️ درباره سازنده', async (ctx) => {
  await ctx.reply(
`👨‍💻 سازنده این ربات:

*امیرحسین پهلوان*
آیدی تلگرام: @Amir13900001

تحت هر شرایطی سازنده یارا همین شخص است.`,
    { parse_mode: 'Markdown' }
  );
});

// دکمه چت آزاد
bot.hears('💬 چت آزاد', (ctx) => {
  ctx.reply('حالت چت آزاد فعال شد. هر چی دوست داری بپرس 😊');
});

// دکمه کدنویسی
bot.hears('💻 کدنویسی', (ctx) => {
  ctx.reply('حالت کدنویسی فعال شد. کدت یا سوال برنامه‌نویسی‌ت رو بفرست 💻');
});

// دکمه پرامپت عکس
bot.hears('🖼️ پرامپت عکس', async (ctx) => {
  await ctx.reply('توضیح بده چه عکسی می‌خوای بسازم تا برات پرامپت حرفه‌ای بنویسم (چون با کلید رایگان Gemini تولید واقعی عکس ممکن نیست).');
});

// دکمه متن آهنگ
bot.hears('🎵 متن آهنگ', async (ctx) => {
  await ctx.reply('موضوع، سبک یا حال و هوای آهنگ رو بگو تا برات شعر و متن بنویسم 🎵');
});

// دستور /code
bot.command('code', async (ctx) => {
  const prompt = ctx.message.text.replace('/code', '').trim();
  if (!prompt) {
    return ctx.reply('مثال:\n/code یک تابع جاوااسکریپت برای مرتب‌سازی آرایه بنویس');
  }
  await handleAI(ctx, `تو یک برنامه‌نویس حرفه‌ای هستی. به این درخواست کدنویسی کمک کن و کد تمیز و توضیح‌دار بنویس:\n\n${prompt}`);
});

// دستور /image
bot.command('image', async (ctx) => {
  const prompt = ctx.message.text.replace('/image', '').trim();
  if (!prompt) {
    return ctx.reply('مثال:\n/image یک گربه فضانورد روی ماه در سبک انیمه');
  }
  await handleAI(ctx, `کاربر می‌خواد عکس بسازه. چون ما کلید رایگان Gemini داریم و تولید واقعی عکس پشتیبانی نمی‌شه، یک پرامپت خیلی حرفه‌ای، دقیق و انگلیسی برای ابزارهای ساخت عکس (مثل Midjourney یا Flux یا Nano Banana) بنویس. پرامپت رو فقط انگلیسی بنویس و بعدش ترجمه فارسی کوتاه هم اضافه کن.\n\nموضوع کاربر: ${prompt}`);
});

// دستور /music
bot.command('music', async (ctx) => {
  const prompt = ctx.message.text.replace('/music', '').trim();
  if (!prompt) {
    return ctx.reply('مثال:\n/music یک آهنگ غمگین پاپ فارسی درباره دوری');
  }
  await handleAI(ctx, `کاربر می‌خواد متن آهنگ داشته باشه. یک شعر کامل و زیبا (ترجیحاً فارسی) با ساختار ورس و کورس بنویس و سبک پیشنهادی هم بگو.\n\nدرخواست: ${prompt}`);
});

// پیام‌های عادی → چت با Gemini
bot.on('text', async (ctx) => {
  // اگر دکمه بود رد کن (قبلاً هندل شده)
  const text = ctx.message.text;
  if (['💬 چت آزاد', '💻 کدنویسی', '🖼️ پرامپت عکس', '🎵 متن آهنگ', 'ℹ️ درباره سازنده'].includes(text)) {
    return;
  }
  await handleAI(ctx, text);
});

// تابع اصلی ارتباط با Gemini
async function handleAI(ctx, userMessage) {
  const userId = ctx.from.id;
  const chat = getChat(userId);

  // نشان دادن "در حال تایپ"
  await ctx.sendChatAction('typing');

  try {
    const result = await chat.sendMessage(userMessage);
    const response = result.response.text();

    // اگر پاسخ خیلی طولانی بود، تکه تکه بفرست
    if (response.length > 4000) {
      const chunks = response.match(/[\s\S]{1,4000}/g) || [];
      for (const chunk of chunks) {
        await ctx.reply(chunk);
      }
    } else {
      await ctx.reply(response);
    }
  } catch (error) {
    console.error('Gemini Error:', error);
    let msg = 'متأسفانه خطایی رخ داد. ';
    if (error.message?.includes('API key') || error.message?.includes('quota')) {
      msg += 'احتمالاً محدودیت کلید رایگان Gemini پر شده یا کلید اشتباه است.';
    } else {
      msg += 'لطفاً کمی بعد دوباره تلاش کن.';
    }
    await ctx.reply(msg);
  }
}

// مدیریت خطا
bot.catch((err, ctx) => {
  console.error('Bot error:', err);
  ctx.reply('خطایی رخ داد. لطفاً دوباره تلاش کنید.').catch(() => {});
});

// شروع ربات
bot.launch().then(() => {
  console.log('🤖 ربات یارا با موفقیت شروع به کار کرد!');
  console.log('سازنده: امیرحسین پهلوان (@Amir13900001)');
}).catch(err => {
  console.error('خطا در راه‌اندازی ربات:', err);
});

// خاموش شدن تمیز
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
