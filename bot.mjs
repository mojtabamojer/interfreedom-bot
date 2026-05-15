import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_FILE = join(__dirname, 'data.json');
const BOT_TOKEN = "8673330891:AAH8mSrLS-hXHDchO7erRBv1Sy8esWdqoyk";
const BASE_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;
const BOT_USERNAME = "InterFreedom_bot";

// ─── Premium Emoji IDs ───────────────────────────────────────────────────────
const E = {
  // Main keyboard buttons
  GET_SERVICE:    "5206607081334906820",
  INVITE:         "5424818078833715060",
  PROFILE:        "5190806721286657692",
  SUPPORT:        "5413704112220949842",
  RULES:          "5271604874419647061",
  GUIDE:          "5447644880824181073",
  CHANNEL_BTN:    "5472363448404809929",
  VERIFY:         "5436040291507247633",
  // Admin panel inline buttons
  BOT_STATUS:     "6037618875846102911",
  FULL_STATS:     "5375296873982604963",
  RECENT_USERS:   "5231200819986047254",
  TOP_INVITES:    "5395444784611480792",
  TOP_SERVICE:    "5461117441612462242",
  TOP_RICH:       "5391112412445288650",
  MSG_USER:       "5334544901428229844",
  BROADCAST:      "5264713049637409446",
  SEARCH_USER:    "5453957997418004470",
  USER_INFO:      "5246989476248429334",
  UNBAN:          "5440660757194744323",
  BAN:            "5240241223632954241",
  SET_COINS:      "5472308992514464048",
  ADD_COINS:      "5400250414929041085",
  MANUAL_SERVICE: "5994495364084796671",
  RESET_COINS:    "5436113877181941026",
  WELCOME_TEXT:   "5465665476971471368",
  DELETE_USER:    "5472027899789843495",
  CHANNELS:       "6300757202651055745",
  COIN_SETTINGS:  "5422439311196834318",
  ALL_USERS:      "4981404027402061416",
  MONTHLY_STATS:  "5213383002129702114",
  FULL_REPORT:    "5427009714745517609",
  MANAGE_CONFIG:  "6032751234790726550",
  MAINTENANCE:    "5255883984151276991",
  CUSTOM_BTNS:    "5785193735075663481",
  // Message text emoji
  MSG_FIRE:       "5785219784052314091",
  MSG_CHECK:      "5924664865208671041",
  MSG_BELL:       "5785033300867288899",
  MSG_STAR:       "5422439311196834318",
  MSG_LINK:       "5215392879320505675",
  MSG_UP:         "5264713049637409446",
  MSG_DOWN:       "5453957997418004470",
  MSG_BULB:       "5246989476248429334",
  MSG_LOCK:       "5271604874419647061",
  MSG_GIFT:       "5424818078833715060",
  MSG_SHIELD:     "5413704112220949842",
  MSG_INFO:       "5190806721286657692",
  MSG_DATE:       "5231200819986047254",
  MSG_CHART:      "5375296873982604963",
  MSG_TROPHY:     "5461117441612462242",
  MSG_COIN:       "5400250414929041085",
  MSG_ERROR:      "5240241223632954241",
  MSG_SUCCESS:    "5440660757194744323",
  MSG_PEOPLE:     "5395444784611480792",
  MSG_PARTY:      "5447644880824181073",
};

// Helper to embed premium emoji in message text
function em(emojiId) {
  return `<tg-emoji emoji-id="${emojiId}">⭐</tg-emoji>`;
}

// ─── DB ───────────────────────────────────────────────────────────────────────
function loadDB() {
  if (!existsSync(DB_FILE)) {
    const def = defaultDB();
    writeFileSync(DB_FILE, JSON.stringify(def, null, 2));
    return def;
  }
  try {
    return JSON.parse(readFileSync(DB_FILE, 'utf8'));
  } catch {
    return defaultDB();
  }
}

function defaultDB() {
  return {
    users: {},
    settings: {
      coin_per_referral: 1,
      service_cost: 2,
      service_size_gb: 1,
      service_duration_hours: 24,
      welcome_text: 'به ربات کانفیگ رایگان خوش آمدید',
      maintenance_mode: false,
      admin_ids: [8426046895],
      admin_usernames: ['Mojeao', 'Abslnf'],
    },
    configs: [],
    required_channels: [
      { username: 'lnterFreedom', title: 'InterFreedom', url: 'https://t.me/lnterFreedom' },
    ],
    custom_buttons: [],
    pending_captchas: {},
  };
}

function saveDB(db) {
  try {
    writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  } catch (e) {
    console.error('saveDB error:', e.message);
  }
}

function getUser(db, chatId) {
  const id = String(chatId);
  if (!db.users[id]) {
    db.users[id] = {
      chat_id: chatId,
      username: null,
      first_name: null,
      coins: 0,
      referral_count: 0,
      join_date: new Date().toISOString().slice(0, 10),
      is_banned: false,
      referred_by: null,
      total_services: 0,
      registered: false,
    };
  }
  return db.users[id];
}

function isAdmin(db, chatId, username) {
  const s = db.settings;
  if ((s.admin_ids || []).includes(Number(chatId))) return true;
  if ((s.admin_ids || []).includes(String(chatId))) return true;
  const uname = (username || '').toLowerCase();
  if (!uname) return false;
  return (s.admin_usernames || []).some(a => a.toLowerCase() === uname);
}

// ─── Telegram API ─────────────────────────────────────────────────────────────
async function api(method, body = {}) {
  try {
    const res = await fetch(`${BASE_URL}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.json();
  } catch (e) {
    console.error(`API ${method} error:`, e.message);
    return { ok: false, description: e.message };
  }
}

async function send(chatId, text, extra = {}) {
  return api('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML', ...extra });
}

async function edit(chatId, msgId, text, extra = {}) {
  return api('editMessageText', { chat_id: chatId, message_id: msgId, text, parse_mode: 'HTML', ...extra });
}

async function answerCb(id, text = '', alert = false) {
  return api('answerCallbackQuery', { callback_query_id: id, text, show_alert: alert });
}

async function isMemberOf(chatId, channelUsername) {
  try {
    const r = await api('getChatMember', { chat_id: `@${channelUsername}`, user_id: chatId });
    return r.ok && ['member', 'administrator', 'creator'].includes(r.result?.status);
  } catch {
    return false;
  }
}

async function checkAllSubs(chatId, db) {
  for (const ch of (db.required_channels || [])) {
    if (!(await isMemberOf(chatId, ch.username))) return false;
  }
  return true;
}

// ─── Keyboards ───────────────────────────────────────────────────────────────
function mainKb(db) {
  const standard = [
    [{ text: 'دریافت اشتراک', icon_custom_emoji_id: E.GET_SERVICE, style: 'primary' }],
    [
      { text: 'دعوت دوستان', icon_custom_emoji_id: E.INVITE, style: 'primary' },
      { text: 'پروفایل', icon_custom_emoji_id: E.PROFILE, style: 'primary' },
    ],
    [
      { text: 'پشتیبانی', icon_custom_emoji_id: E.SUPPORT, style: 'primary' },
      { text: 'قوانین', icon_custom_emoji_id: E.RULES, style: 'primary' },
    ],
    [{ text: 'راهنما', icon_custom_emoji_id: E.GUIDE, style: 'primary' }],
  ];

  // Add custom buttons from admin
  const customBtns = db.custom_buttons || [];
  for (let i = 0; i < customBtns.length; i += 2) {
    const row = [];
    const b1 = customBtns[i];
    row.push({
      text: b1.text,
      icon_custom_emoji_id: b1.emoji_id || E.STAR,
      style: b1.style || 'primary',
    });
    if (customBtns[i + 1]) {
      const b2 = customBtns[i + 1];
      row.push({
        text: b2.text,
        icon_custom_emoji_id: b2.emoji_id || E.STAR,
        style: b2.style || 'primary',
      });
    }
    standard.push(row);
  }

  return { keyboard: standard, resize_keyboard: true, persistent: true };
}

function subKb(db) {
  const rows = (db.required_channels || []).map(ch => ([{
    text: ch.title,
    url: ch.url,
    icon_custom_emoji_id: E.CHANNEL_BTN,
  }]));
  rows.push([{
    text: 'تایید عضویت',
    callback_data: 'verify_sub',
    icon_custom_emoji_id: E.VERIFY,
  }]);
  return { inline_keyboard: rows };
}

function adminKb() {
  return {
    inline_keyboard: [
      [
        { text: 'وضعیت ربات', callback_data: 'adm_status', icon_custom_emoji_id: E.BOT_STATUS },
        { text: 'آمار کامل', callback_data: 'adm_stats', icon_custom_emoji_id: E.FULL_STATS },
      ],
      [
        { text: 'آخرین کاربران', callback_data: 'adm_recent', icon_custom_emoji_id: E.RECENT_USERS },
        { text: 'برترین دعوت‌ها', callback_data: 'adm_top_inv', icon_custom_emoji_id: E.TOP_INVITES },
      ],
      [
        { text: 'ثروتمندترین‌ها', callback_data: 'adm_top_rich', icon_custom_emoji_id: E.TOP_RICH },
        { text: 'بیشترین سرویس', callback_data: 'adm_top_svc', icon_custom_emoji_id: E.TOP_SERVICE },
      ],
      [
        { text: 'پیام همگانی', callback_data: 'adm_broadcast', icon_custom_emoji_id: E.BROADCAST },
        { text: 'پیام به کاربر', callback_data: 'adm_msg_user', icon_custom_emoji_id: E.MSG_USER },
      ],
      [
        { text: 'اطلاعات کاربر', callback_data: 'adm_user_info', icon_custom_emoji_id: E.USER_INFO },
        { text: 'جستجوی کاربر', callback_data: 'adm_search', icon_custom_emoji_id: E.SEARCH_USER },
      ],
      [
        { text: 'رفع مسدودی', callback_data: 'adm_unban', icon_custom_emoji_id: E.UNBAN },
        { text: 'مسدود کردن', callback_data: 'adm_ban', icon_custom_emoji_id: E.BAN },
      ],
      [
        { text: 'افزودن سکه', callback_data: 'adm_add_coins', icon_custom_emoji_id: E.ADD_COINS },
        { text: 'تنظیم سکه', callback_data: 'adm_set_coins', icon_custom_emoji_id: E.SET_COINS },
      ],
      [
        { text: 'ری‌ست سکه', callback_data: 'adm_reset_coins', icon_custom_emoji_id: E.RESET_COINS },
        { text: 'سرویس دستی', callback_data: 'adm_manual_svc', icon_custom_emoji_id: E.MANUAL_SERVICE },
      ],
      [
        { text: 'متن خوش‌آمد', callback_data: 'adm_welcome', icon_custom_emoji_id: E.WELCOME_TEXT },
        { text: 'حذف کاربر', callback_data: 'adm_del_user', icon_custom_emoji_id: E.DELETE_USER },
      ],
      [
        { text: 'کانال‌های اجباری', callback_data: 'adm_channels', icon_custom_emoji_id: E.CHANNELS },
        { text: 'تنظیمات سکه‌ها', callback_data: 'adm_coin_cfg', icon_custom_emoji_id: E.COIN_SETTINGS },
      ],
      [
        { text: 'همه کاربران', callback_data: 'adm_all_users', icon_custom_emoji_id: E.ALL_USERS },
        { text: 'آمار ماهانه', callback_data: 'adm_monthly', icon_custom_emoji_id: E.MONTHLY_STATS },
      ],
      [
        { text: 'گزارش کامل', callback_data: 'adm_report', icon_custom_emoji_id: E.FULL_REPORT },
        { text: 'مدیریت کانفیگ', callback_data: 'adm_configs', icon_custom_emoji_id: E.MANAGE_CONFIG },
      ],
      [
        { text: 'دکمه‌های سفارشی', callback_data: 'adm_custom_btns', icon_custom_emoji_id: E.CUSTOM_BTNS },
        { text: 'حالت تعمیر', callback_data: 'adm_maintenance', icon_custom_emoji_id: E.MAINTENANCE },
      ],
    ],
  };
}

// ─── Captcha ──────────────────────────────────────────────────────────────────
function makeCaptcha() {
  const a = Math.floor(Math.random() * 9) + 1;
  const b = Math.floor(Math.random() * 9) + 1;
  const ops = ['+', '-'];
  const op = ops[Math.floor(Math.random() * ops.length)];
  const answer = op === '+' ? a + b : Math.abs(a - b);
  const q = op === '-' ? `${Math.max(a, b)} - ${Math.min(a, b)}` : `${a} + ${b}`;
  return { q, answer };
}

// ─── Message screens ──────────────────────────────────────────────────────────
async function showWelcome(chatId, db) {
  const text =
    `${em(E.MSG_FIRE)} <b>به ربات کانفیگ رایگان خوش آمدید</b>\n\n` +
    `${em(E.MSG_BELL)} با این ربات می‌تونی خیلی راحت:\n\n` +
    `${em(E.MSG_CHECK)} کانفیگ‌های پرسرعت و باکیفیت دریافت کنی\n` +
    `${em(E.MSG_CHECK)} با فعالیت و دعوت دوستان، امتیاز جمع کنی\n` +
    `${em(E.MSG_CHECK)} با امتیازها کانفیگ رایگان بگیری\n` +
    `${em(E.MSG_CHECK)} همیشه از وضعیت و سلامت سرویس‌ها با خبر باشی\n\n` +
    `${em(E.MSG_DOWN)} یکی از گزینه‌های زیر رو انتخاب کن:\n` +
    `<b>@${BOT_USERNAME}</b>`;
  await send(chatId, text, { reply_markup: mainKb(db) });
}

async function showForceSub(chatId, db) {
  const text =
    `${em(E.MSG_LOCK)} برای استفاده از ربات ابتدا باید در کانال‌های زیر عضو شوید\n\n` +
    `${em(E.MSG_CHECK)} پس از عضویت در کانال‌ها روی دکمه تایید عضویت کلیک کنید.`;
  await send(chatId, text, { reply_markup: subKb(db) });
}

async function showProfile(chatId, db) {
  const u = getUser(db, chatId);
  const text =
    `${em(E.MSG_INFO)} <b>پروفایل شما</b>\n\n` +
    `${em(E.MSG_SHIELD)} شناسه: <code>${chatId}</code>\n` +
    `${em(E.MSG_PEOPLE)} نام: ${u.first_name || '—'}\n` +
    `${em(E.MSG_INFO)} نام کاربری: ${u.username ? '@' + u.username : '—'}\n` +
    `${em(E.MSG_TROPHY)} امتیاز فعلی: ${u.coins}\n` +
    `${em(E.MSG_PEOPLE)} تعداد دعوت: ${u.referral_count}\n` +
    `${em(E.MSG_DATE)} تاریخ عضویت: ${u.join_date}`;
  await send(chatId, text, { reply_markup: mainKb(db) });
}

async function showInvite(chatId, db) {
  const u = getUser(db, chatId);
  const s = db.settings;
  const link = `https://t.me/${BOT_USERNAME}?start=add_${chatId}`;
  const text =
    `${em(E.MSG_GIFT)} <b>سیستم دعوت دوستان</b>\n\n` +
    `${em(E.MSG_COIN)} امتیاز هر دعوت: ${s.coin_per_referral}\n` +
    `${em(E.MSG_PEOPLE)} تعداد دعوت‌های شما: ${u.referral_count}\n` +
    `${em(E.MSG_TROPHY)} امتیاز فعلی: ${u.coins}\n\n` +
    `${em(E.MSG_LINK)} لینک دعوت اختصاصی شما:\n<code>${link}</code>\n\n` +
    `${em(E.MSG_UP)} این لینک رو با دوستان خود به اشتراک بگذارید و به ازای هر نفر که وارد ربات شود، ${s.coin_per_referral} امتیاز دریافت کنید!\n\n` +
    `${em(E.MSG_BULB)} با ${s.service_cost} امتیاز می‌توانید یک اشتراک ${s.service_size_gb} گیگ و ${s.service_duration_hours} ساعته دریافت کنید`;
  await send(chatId, text, {
    reply_markup: {
      inline_keyboard: [[{
        text: 'اشتراک‌گذاری لینک',
        switch_inline_query: link,
        icon_custom_emoji_id: E.MSG_STAR,
      }]],
    },
  });
}

async function showGetService(chatId, db) {
  const u = getUser(db, chatId);
  const s = db.settings;
  const cost = s.service_cost || 2;

  if (u.coins < cost) {
    const lack = cost - u.coins;
    const text =
      `${em(E.MSG_ERROR)} <b>امتیاز کافی نیست!</b>\n\n` +
      `${em(E.GET_SERVICE)} هزینه اشتراک: ${cost} امتیاز\n` +
      `${em(E.MSG_TROPHY)} امتیاز فعلی شما: ${u.coins}\n` +
      `${em(E.MSG_COIN)} امتیاز کمبود: ${lack}\n\n` +
      `${em(E.MSG_BULB)} با دعوت دوستان می‌توانید امتیاز کسب کنید!`;
    await send(chatId, text, {
      reply_markup: {
        inline_keyboard: [[{
          text: 'دعوت دوستان',
          callback_data: 'goto_invite',
          icon_custom_emoji_id: E.INVITE,
        }]],
      },
    });
    return;
  }

  const configs = db.configs || [];
  if (!configs.length) {
    await send(chatId, `${em(E.MSG_ERROR)} در حال حاضر کانفیگی موجود نیست. لطفاً بعداً تلاش کنید.`, { reply_markup: mainKb(db) });
    return;
  }

  const config = configs[Math.floor(Math.random() * configs.length)];
  const tag = u.username ? u.username : String(chatId).slice(-4);
  const personalConfig = config.replace(/#[^\s]*$/, '') + `#${tag}_${Math.floor(Math.random() * 9000 + 1000)}`;

  u.coins -= cost;
  u.total_services = (u.total_services || 0) + 1;
  saveDB(db);

  const text =
    `${em(E.MSG_SUCCESS)} <b>اشتراک با موفقیت ایجاد شد!</b>\n\n` +
    `${em(E.MSG_CHART)} حجم: ${s.service_size_gb} گیگ\n` +
    `${em(E.MSG_DATE)} مدت اعتبار: ${s.service_duration_hours} ساعت\n` +
    `${em(E.MSG_LINK)} لینک اشتراک:\n<code>${personalConfig}</code>\n\n` +
    `${em(E.MSG_BELL)} این لینک را در برنامه V2ray خود وارد کنید.\n` +
    `${em(E.MSG_COIN)} امتیاز باقیمانده: ${u.coins}`;
  await send(chatId, text, { reply_markup: mainKb(db) });
}

async function showRules(chatId, db) {
  const text =
    `${em(E.RULES)} <b>قوانین و شرایط استفاده</b>\n\n` +
    `${em(E.MSG_LOCK)} <b>حریم خصوصی</b>\n` +
    `اطلاعات شما کاملاً محرمانه بوده و فقط جهت مدیریت سرویس استفاده می‌شود.\n\n` +
    `${em(E.MSG_PEOPLE)} <b>سیستم دعوت (رفرال)</b>\n` +
    `دریافت اشتراک رایگان از طریق دعوت دوستان با لینک اختصاصی شما انجام می‌شود.\n` +
    `هرگونه تقلب (اکانت فیک، ربات) شناسایی شده و منجر به مسدودسازی دائمی حساب خواهد شد.\n\n` +
    `${em(E.MSG_ERROR)} <b>قوانین استفاده</b>\n` +
    `اشتراک دریافتی صرفاً برای استفاده شخصی بوده و به اشتراک‌گذاری آن ممنوع است.\n` +
    `استفاده از سرویس برای فعالیت‌های مخرب یا حملات DDoS اکیداً ممنوع می‌باشد.\n\n` +
    `${em(E.MSG_SHIELD)} <b>مسئولیت</b>\n` +
    `تمامی مسئولیت نحوه استفاده از سرویس بر عهده کاربر خواهد بود.`;
  await send(chatId, text, { reply_markup: mainKb(db) });
}

async function showGuide(chatId, db) {
  const text =
    `${em(E.GUIDE)} <b>راهنمای دریافت اشتراک رایگان</b>\n\n` +
    `برای دریافت اشتراک پرسرعت، مراحل زیر را دنبال کنید:\n\n` +
    `<b>1️⃣ مرحله ۱: دریافت لینک اختصاصی</b>\n` +
    `وارد بخش دعوت دوستان شوید و لینک اختصاصی خود را دریافت کنید.\n\n` +
    `<b>2️⃣ مرحله ۲: دعوت از دوستان</b>\n` +
    `لینک را برای دوستان خود ارسال کنید. با عضویت هر کاربر، امتیاز به حساب شما افزوده می‌شود.\n\n` +
    `<b>3️⃣ مرحله ۳: دریافت اشتراک</b>\n` +
    `پس از رسیدن امتیاز به حد نصاب، از بخش دریافت اشتراک کانفیگ خود را رایگان دریافت کنید.\n\n` +
    `${em(E.MSG_BULB)} <b>نکته مهم</b>\n` +
    `سیستم دارای آنتی‌تقلب بوده و استفاده از اکانت‌های فیک منجر به حذف امتیازات خواهد شد.\n\n` +
    `${em(E.SUPPORT)} <b>پشتیبانی</b>\n` +
    `در صورت بروز مشکل، از بخش پشتیبانی اقدام کنید.`;
  await send(chatId, text, { reply_markup: mainKb(db) });
}

// ─── State (in-memory + persisted) ───────────────────────────────────────────
const userState = new Map();

function getState(chatId) {
  return userState.get(String(chatId)) || null;
}
function setState(chatId, st) {
  if (st === null) userState.delete(String(chatId));
  else userState.set(String(chatId), st);
}

// ─── /start handler ───────────────────────────────────────────────────────────
async function handleStart(msg, db) {
  const chatId = msg.chat.id;
  const text = msg.text || '';
  const username = msg.from?.username || null;
  const firstName = msg.from?.first_name || 'کاربر';

  const u = getUser(db, chatId);
  u.username = username || u.username;
  u.first_name = firstName || u.first_name;

  // Auto-register admin
  if (isAdmin(db, chatId, username) && !(db.settings.admin_ids || []).includes(chatId)) {
    db.settings.admin_ids = [...(db.settings.admin_ids || []), chatId];
  }

  if (u.is_banned) {
    await send(chatId, `${em(E.MSG_ERROR)} حساب کاربری شما مسدود شده است.`);
    saveDB(db);
    return;
  }

  if (db.settings.maintenance_mode && !isAdmin(db, chatId, username)) {
    await send(chatId, `${em(E.MSG_BELL)} ربات در حال تعمیر است. لطفاً بعداً تلاش کنید.`);
    saveDB(db);
    return;
  }

  const match = text.match(/start=?add_(\d+)/);
  const referrerId = match ? String(match[1]) : null;

  // Captcha for new users (not yet registered)
  if (!u.registered) {
    if (referrerId && referrerId !== String(chatId)) {
      db.pending_captchas = db.pending_captchas || {};
      db.pending_captchas[String(chatId)] = { referrerId, tries: 0 };
    } else {
      db.pending_captchas = db.pending_captchas || {};
      db.pending_captchas[String(chatId)] = { referrerId: null, tries: 0 };
    }

    const cap = makeCaptcha();
    db.pending_captchas[String(chatId)].answer = cap.answer;
    db.pending_captchas[String(chatId)].question = cap.q;
    saveDB(db);
    setState(chatId, 'captcha');
    await send(chatId,
      `${em(E.MSG_SHIELD)} <b>تایید امنیتی</b>\n\n` +
      `برای جلوگیری از تقلب، جواب این سوال ساده رو بنویس:\n\n` +
      `<b>${cap.q} = ?</b>`,
      { reply_markup: { remove_keyboard: true } }
    );
    saveDB(db);
    return;
  }

  const ok = await checkAllSubs(chatId, db);
  if (!ok) {
    saveDB(db);
    await showForceSub(chatId, db);
    return;
  }

  saveDB(db);
  await showWelcome(chatId, db);
}

// ─── Captcha handler ──────────────────────────────────────────────────────────
async function handleCaptcha(chatId, text, db) {
  const cap = (db.pending_captchas || {})[String(chatId)];
  if (!cap) {
    setState(chatId, null);
    await send(chatId, 'خطا. لطفاً /start بزنید.');
    return;
  }

  if (parseInt(text.trim()) === cap.answer) {
    // Correct!
    setState(chatId, null);
    const u = getUser(db, chatId);
    u.registered = true;

    // Credit referrer
    if (cap.referrerId && cap.referrerId !== String(chatId) && !u.referred_by) {
      const refUser = db.users[cap.referrerId];
      if (refUser) {
        const before = refUser.coins;
        refUser.coins += db.settings.coin_per_referral || 1;
        refUser.referral_count = (refUser.referral_count || 0) + 1;
        u.referred_by = cap.referrerId;

        // Notify referrer
        await send(Number(cap.referrerId),
          `${em(E.MSG_PARTY)} <b>زیرمجموعه جدید!</b>\n\n` +
          `${em(E.MSG_PEOPLE)} به ربات دعوت شد ${u.username ? '@' + u.username : u.first_name || 'کاربر'}\n\n` +
          `${em(E.MSG_COIN)} موجودی شما:\n` +
          `قبل: ${before} امتیاز\n` +
          `بعد: ${refUser.coins} امتیاز\n\n` +
          `${em(E.MSG_CHART)} تعداد کل زیرمجموعه‌های شما: ${refUser.referral_count}`
        ).catch(() => {});
      }
    }

    delete db.pending_captchas[String(chatId)];
    saveDB(db);

    await send(chatId, `${em(E.MSG_SUCCESS)} تایید شد!`);

    const ok = await checkAllSubs(chatId, db);
    if (!ok) await showForceSub(chatId, db);
    else await showWelcome(chatId, db);

  } else {
    cap.tries = (cap.tries || 0) + 1;
    if (cap.tries >= 5) {
      // Too many wrong answers
      delete db.pending_captchas[String(chatId)];
      setState(chatId, null);
      saveDB(db);
      await send(chatId, `${em(E.MSG_ERROR)} تلاش‌های زیاد! برای شروع مجدد /start بزنید.`);
      return;
    }
    const newCap = makeCaptcha();
    cap.answer = newCap.answer;
    cap.question = newCap.q;
    saveDB(db);
    await send(chatId,
      `${em(E.MSG_ERROR)} جواب اشتباه! تلاش ${cap.tries} از 5.\n\n` +
      `دوباره امتحان کنید:\n\n<b>${newCap.q} = ?</b>`
    );
  }
}

// ─── Admin state handler ──────────────────────────────────────────────────────
async function handleAdminState(chatId, text, db, username) {
  const st = getState(chatId);
  if (!st || !st.startsWith('adm_')) return false;

  if (!isAdmin(db, chatId, username)) {
    setState(chatId, null);
    return false;
  }

  if (st === 'adm_broadcast') {
    setState(chatId, null);
    let sent = 0, fail = 0;
    const uids = Object.keys(db.users);
    await send(chatId, `${em(E.BROADCAST)} شروع ارسال پیام به ${uids.length} کاربر...`);
    for (const uid of uids) {
      try { await send(Number(uid), text); sent++; }
      catch { fail++; }
      await new Promise(r => setTimeout(r, 60));
    }
    await send(chatId, `${em(E.MSG_SUCCESS)} پیام همگانی ارسال شد.\nموفق: ${sent}\nناموفق: ${fail}`);

  } else if (st === 'adm_msg_user_id') {
    setState(chatId, `adm_msg_user_text:${text.trim()}`);
    await send(chatId, 'متن پیام را ارسال کنید:');

  } else if (st?.startsWith('adm_msg_user_text:')) {
    const targetId = Number(st.split(':')[1]);
    setState(chatId, null);
    const r = await send(targetId, text);
    await send(chatId, r.ok ? `${em(E.MSG_SUCCESS)} پیام ارسال شد.` : `${em(E.MSG_ERROR)} خطا: ${r.description}`);

  } else if (st === 'adm_search') {
    setState(chatId, null);
    const q = text.replace('@', '').toLowerCase();
    const found = Object.values(db.users).find(u =>
      String(u.chat_id) === q || (u.username || '').toLowerCase() === q
    );
    if (!found) { await send(chatId, `${em(E.MSG_ERROR)} کاربر پیدا نشد.`); return true; }
    await send(chatId,
      `${em(E.MSG_INFO)} شناسه: ${found.chat_id}\n` +
      `نام: ${found.first_name || '—'}\nیوزرنیم: @${found.username || '—'}\n` +
      `سکه: ${found.coins}\nدعوت: ${found.referral_count}\n` +
      `سرویس: ${found.total_services || 0}\nمسدود: ${found.is_banned ? 'بله' : 'خیر'}`
    );

  } else if (st === 'adm_user_info') {
    setState(chatId, null);
    const u = db.users[text.trim()];
    if (!u) { await send(chatId, `${em(E.MSG_ERROR)} کاربر پیدا نشد.`); return true; }
    await send(chatId,
      `${em(E.MSG_INFO)} <b>اطلاعات کاربر</b>\n\n` +
      `شناسه: ${u.chat_id}\nنام: ${u.first_name || '—'}\n` +
      `یوزرنیم: @${u.username || '—'}\nسکه: ${u.coins}\n` +
      `دعوت: ${u.referral_count}\nسرویس: ${u.total_services || 0}\n` +
      `مسدود: ${u.is_banned ? 'بله' : 'خیر'}\nتاریخ: ${u.join_date}`
    );

  } else if (st === 'adm_ban') {
    setState(chatId, null);
    const u = db.users[text.trim()];
    if (!u) { await send(chatId, `${em(E.MSG_ERROR)} کاربر پیدا نشد.`); return true; }
    u.is_banned = true;
    saveDB(db);
    await send(chatId, `${em(E.MSG_SUCCESS)} کاربر ${text} مسدود شد.`);
    await send(u.chat_id, `${em(E.MSG_ERROR)} حساب کاربری شما مسدود شده است.`).catch(() => {});

  } else if (st === 'adm_unban') {
    setState(chatId, null);
    const u = db.users[text.trim()];
    if (!u) { await send(chatId, `${em(E.MSG_ERROR)} کاربر پیدا نشد.`); return true; }
    u.is_banned = false;
    saveDB(db);
    await send(chatId, `${em(E.MSG_SUCCESS)} رفع مسدودی کاربر ${text} انجام شد.`);

  } else if (st === 'adm_add_coins') {
    setState(chatId, null);
    const [uid, amt] = text.split(/\s+/);
    const u = db.users[uid];
    if (!u || isNaN(Number(amt))) { await send(chatId, `${em(E.MSG_ERROR)} فرمت: آیدی مقدار`); return true; }
    u.coins += Number(amt);
    saveDB(db);
    await send(chatId, `${em(E.MSG_SUCCESS)} ${amt} سکه به کاربر ${uid} اضافه شد. موجودی: ${u.coins}`);
    await send(u.chat_id, `${em(E.MSG_COIN)} ${amt} سکه به حساب شما اضافه شد. موجودی: ${u.coins}`).catch(() => {});

  } else if (st === 'adm_set_coins') {
    setState(chatId, null);
    const [uid, amt] = text.split(/\s+/);
    const u = db.users[uid];
    if (!u || isNaN(Number(amt))) { await send(chatId, `${em(E.MSG_ERROR)} فرمت: آیدی مقدار`); return true; }
    u.coins = Number(amt);
    saveDB(db);
    await send(chatId, `${em(E.MSG_SUCCESS)} سکه کاربر ${uid} به ${amt} تنظیم شد.`);

  } else if (st === 'adm_reset_coins') {
    setState(chatId, null);
    const u = db.users[text.trim()];
    if (!u) { await send(chatId, `${em(E.MSG_ERROR)} کاربر پیدا نشد.`); return true; }
    u.coins = 0;
    saveDB(db);
    await send(chatId, `${em(E.MSG_SUCCESS)} سکه‌های کاربر ${text} صفر شد.`);

  } else if (st === 'adm_manual_svc') {
    setState(chatId, null);
    const u = db.users[text.trim()];
    if (!u) { await send(chatId, `${em(E.MSG_ERROR)} کاربر پیدا نشد.`); return true; }
    const configs = db.configs || [];
    if (!configs.length) { await send(chatId, `${em(E.MSG_ERROR)} کانفیگی موجود نیست.`); return true; }
    const config = configs[Math.floor(Math.random() * configs.length)];
    const tag = u.username || String(u.chat_id).slice(-4);
    const pc = config.replace(/#[^\s]*$/, '') + `#${tag}_${Math.floor(Math.random() * 9000 + 1000)}`;
    u.total_services = (u.total_services || 0) + 1;
    saveDB(db);
    await send(chatId, `${em(E.MSG_SUCCESS)} سرویس ارسال شد.`);
    await send(u.chat_id,
      `${em(E.MSG_GIFT)} <b>سرویس دریافت کردید!</b>\n\n` +
      `${em(E.MSG_CHART)} حجم: ${db.settings.service_size_gb} گیگ\n` +
      `${em(E.MSG_DATE)} مدت: ${db.settings.service_duration_hours} ساعت\n\n` +
      `${em(E.MSG_LINK)} لینک:\n<code>${pc}</code>`
    ).catch(() => {});

  } else if (st === 'adm_welcome') {
    setState(chatId, null);
    db.settings.welcome_text = text;
    saveDB(db);
    await send(chatId, `${em(E.MSG_SUCCESS)} متن خوش‌آمد بروزرسانی شد.`);

  } else if (st === 'adm_del_user') {
    setState(chatId, null);
    if (db.users[text.trim()]) {
      delete db.users[text.trim()];
      saveDB(db);
      await send(chatId, `${em(E.MSG_SUCCESS)} کاربر ${text} حذف شد.`);
    } else {
      await send(chatId, `${em(E.MSG_ERROR)} کاربر پیدا نشد.`);
    }

  } else if (st === 'adm_channels') {
    setState(chatId, null);
    db.required_channels = db.required_channels || [];
    if (text.startsWith('add ')) {
      const parts = text.slice(4).trim().split(/\s+/);
      const uname = parts[0].replace('@', '');
      const title = parts.slice(1).join(' ') || uname;
      db.required_channels.push({ username: uname, title, url: `https://t.me/${uname}` });
      saveDB(db);
      await send(chatId, `${em(E.MSG_SUCCESS)} کانال @${uname} اضافه شد.`);
    } else if (text.startsWith('del ')) {
      const uname = text.slice(4).trim().replace('@', '');
      db.required_channels = db.required_channels.filter(c => c.username !== uname);
      saveDB(db);
      await send(chatId, `${em(E.MSG_SUCCESS)} کانال @${uname} حذف شد.`);
    } else {
      await send(chatId, `${em(E.MSG_ERROR)} فرمت اشتباه.`);
    }

  } else if (st === 'adm_coin_cfg') {
    setState(chatId, null);
    if (text.startsWith('ref_coin ')) {
      db.settings.coin_per_referral = Number(text.split(' ')[1]);
      saveDB(db);
      await send(chatId, `${em(E.MSG_SUCCESS)} امتیاز هر دعوت: ${db.settings.coin_per_referral}`);
    } else if (text.startsWith('svc_cost ')) {
      db.settings.service_cost = Number(text.split(' ')[1]);
      saveDB(db);
      await send(chatId, `${em(E.MSG_SUCCESS)} هزینه سرویس: ${db.settings.service_cost}`);
    } else if (text.startsWith('svc_gb ')) {
      db.settings.service_size_gb = Number(text.split(' ')[1]);
      saveDB(db);
      await send(chatId, `${em(E.MSG_SUCCESS)} حجم سرویس: ${db.settings.service_size_gb} گیگ`);
    } else if (text.startsWith('svc_hours ')) {
      db.settings.service_duration_hours = Number(text.split(' ')[1]);
      saveDB(db);
      await send(chatId, `${em(E.MSG_SUCCESS)} مدت سرویس: ${db.settings.service_duration_hours} ساعت`);
    } else {
      await send(chatId, `${em(E.MSG_ERROR)} فرمت اشتباه.`);
    }

  } else if (st === 'adm_configs') {
    setState(chatId, null);
    if (text === 'clear_configs') {
      db.configs = [];
      saveDB(db);
      await send(chatId, `${em(E.MSG_SUCCESS)} همه کانفیگ‌ها پاک شدند.`);
    } else if (/^(vless|vmess|trojan|ss):\/\//.test(text)) {
      db.configs = db.configs || [];
      const lines = text.split('\n').filter(l => /^(vless|vmess|trojan|ss):\/\//.test(l.trim()));
      db.configs.push(...lines.map(l => l.trim()));
      saveDB(db);
      await send(chatId, `${em(E.MSG_SUCCESS)} ${lines.length} کانفیگ اضافه شد. تعداد کل: ${db.configs.length}`);
    } else {
      await send(chatId, `${em(E.MSG_ERROR)} لینک نامعتبر. باید با vless://, vmess://, trojan:// یا ss:// شروع شود.`);
    }

  } else if (st === 'adm_add_admin') {
    setState(chatId, null);
    const input = text.trim().replace('@', '');
    const asId = Number(input);
    if (!isNaN(asId) && asId > 0) {
      db.settings.admin_ids = [...new Set([...(db.settings.admin_ids || []), asId])];
    } else {
      db.settings.admin_usernames = [...new Set([...(db.settings.admin_usernames || []), input])];
    }
    saveDB(db);
    await send(chatId, `${em(E.MSG_SUCCESS)} ادمین اضافه شد: ${text.trim()}`);

  } else if (st === 'adm_custom_btn_add') {
    setState(chatId, null);
    // Format: text | emoji_id | style | response_text
    // Example: دکمه جدید | 5206607081334906820 | primary | این پیام جواب دکمه است
    const parts = text.split('|').map(p => p.trim());
    if (parts.length < 2) {
      await send(chatId,
        `${em(E.MSG_ERROR)} فرمت اشتباه!\n\n` +
        `فرمت صحیح:\n<code>متن دکمه | emoji_id | style | متن پاسخ</code>\n\n` +
        `مثال:\n<code>اطلاعات | 5206607081334906820 | primary | این پیام اطلاعات است</code>\n\n` +
        `style می‌تواند: primary, secondary, destructive باشد`
      );
      return true;
    }
    db.custom_buttons = db.custom_buttons || [];
    db.custom_buttons.push({
      text: parts[0],
      emoji_id: parts[1] || E.MSG_STAR,
      style: parts[2] || 'primary',
      response: parts[3] || parts[0],
    });
    saveDB(db);
    await send(chatId, `${em(E.MSG_SUCCESS)} دکمه سفارشی اضافه شد: ${parts[0]}`);

  } else if (st === 'adm_custom_btn_del') {
    setState(chatId, null);
    const idx = parseInt(text.trim()) - 1;
    db.custom_buttons = db.custom_buttons || [];
    if (isNaN(idx) || idx < 0 || idx >= db.custom_buttons.length) {
      await send(chatId, `${em(E.MSG_ERROR)} شماره نامعتبر.`);
      return true;
    }
    const removed = db.custom_buttons.splice(idx, 1)[0];
    saveDB(db);
    await send(chatId, `${em(E.MSG_SUCCESS)} دکمه "${removed.text}" حذف شد.`);
  }

  return true;
}

// ─── Callback handler ─────────────────────────────────────────────────────────
async function handleCallback(cb) {
  const chatId = cb.message.chat.id;
  const msgId = cb.message.message_id;
  const data = cb.data;
  const cbId = cb.id;
  const username = cb.from?.username || '';

  const db = loadDB();

  // Public callbacks
  if (data === 'verify_sub') {
    const ok = await checkAllSubs(chatId, db);
    if (ok) {
      await answerCb(cbId, `${em(E.MSG_SUCCESS)} عضویت تایید شد!`);
      await showWelcome(chatId, db);
    } else {
      await answerCb(cbId, 'هنوز در همه کانال‌ها عضو نشده‌اید!', true);
    }
    return;
  }

  if (data === 'goto_invite') {
    await answerCb(cbId);
    await showInvite(chatId, db);
    return;
  }

  // Admin-only callbacks
  if (!isAdmin(db, chatId, username)) {
    await answerCb(cbId, 'دسترسی ندارید.', true);
    return;
  }

  await answerCb(cbId);

  if (data === 'adm_status') {
    const total = Object.keys(db.users).length;
    const banned = Object.values(db.users).filter(u => u.is_banned).length;
    await edit(chatId, msgId,
      `${em(E.BOT_STATUS)} <b>وضعیت ربات</b>\n\n` +
      `${em(E.FULL_STATS)} کاربران: ${total}\n` +
      `${em(E.BAN)} مسدودی‌ها: ${banned}\n` +
      `${em(E.MANAGE_CONFIG)} کانفیگ‌ها: ${(db.configs || []).length}\n` +
      `${em(E.MAINTENANCE)} حالت تعمیر: ${db.settings.maintenance_mode ? 'فعال' : 'غیرفعال'}\n` +
      `${em(E.COIN_SETTINGS)} هزینه سرویس: ${db.settings.service_cost} امتیاز\n` +
      `${em(E.ADD_COINS)} امتیاز هر دعوت: ${db.settings.coin_per_referral}`,
      { reply_markup: adminKb() }
    );

  } else if (data === 'adm_stats') {
    const users = Object.values(db.users);
    await edit(chatId, msgId,
      `${em(E.FULL_STATS)} <b>آمار کامل</b>\n\n` +
      `${em(E.ALL_USERS)} کل کاربران: ${users.length}\n` +
      `${em(E.COIN_SETTINGS)} کل امتیازات: ${users.reduce((s, u) => s + (u.coins || 0), 0)}\n` +
      `${em(E.TOP_INVITES)} کل دعوت‌ها: ${users.reduce((s, u) => s + (u.referral_count || 0), 0)}\n` +
      `${em(E.TOP_SERVICE)} کل سرویس‌ها: ${users.reduce((s, u) => s + (u.total_services || 0), 0)}`,
      { reply_markup: adminKb() }
    );

  } else if (data === 'adm_recent') {
    const list = Object.values(db.users).slice(-10).reverse();
    const lines = list.map(u => `${u.first_name || '—'} | @${u.username || '—'} | ${u.coins} سکه`);
    await edit(chatId, msgId,
      `${em(E.RECENT_USERS)} <b>آخرین کاربران:</b>\n\n${lines.join('\n') || '—'}`,
      { reply_markup: adminKb() }
    );

  } else if (data === 'adm_top_inv') {
    const list = Object.values(db.users).sort((a, b) => (b.referral_count || 0) - (a.referral_count || 0)).slice(0, 10);
    const lines = list.map((u, i) => `${i + 1}. @${u.username || '—'} — ${u.referral_count} دعوت`);
    await edit(chatId, msgId,
      `${em(E.TOP_INVITES)} <b>برترین دعوت‌ها:</b>\n\n${lines.join('\n') || '—'}`,
      { reply_markup: adminKb() }
    );

  } else if (data === 'adm_top_rich') {
    const list = Object.values(db.users).sort((a, b) => (b.coins || 0) - (a.coins || 0)).slice(0, 10);
    const lines = list.map((u, i) => `${i + 1}. @${u.username || '—'} — ${u.coins} امتیاز`);
    await edit(chatId, msgId,
      `${em(E.TOP_RICH)} <b>ثروتمندترین‌ها:</b>\n\n${lines.join('\n') || '—'}`,
      { reply_markup: adminKb() }
    );

  } else if (data === 'adm_top_svc') {
    const list = Object.values(db.users).sort((a, b) => (b.total_services || 0) - (a.total_services || 0)).slice(0, 10);
    const lines = list.map((u, i) => `${i + 1}. @${u.username || '—'} — ${u.total_services || 0} سرویس`);
    await edit(chatId, msgId,
      `${em(E.TOP_SERVICE)} <b>بیشترین سرویس:</b>\n\n${lines.join('\n') || '—'}`,
      { reply_markup: adminKb() }
    );

  } else if (data === 'adm_broadcast') {
    setState(chatId, 'adm_broadcast');
    await send(chatId, `${em(E.BROADCAST)} متن پیام همگانی را ارسال کنید:`);

  } else if (data === 'adm_msg_user') {
    setState(chatId, 'adm_msg_user_id');
    await send(chatId, `${em(E.MSG_USER)} آیدی عددی کاربر را ارسال کنید:`);

  } else if (data === 'adm_search') {
    setState(chatId, 'adm_search');
    await send(chatId, `${em(E.SEARCH_USER)} یوزرنیم یا آیدی کاربر را ارسال کنید:`);

  } else if (data === 'adm_user_info') {
    setState(chatId, 'adm_user_info');
    await send(chatId, `${em(E.USER_INFO)} آیدی عددی کاربر را ارسال کنید:`);

  } else if (data === 'adm_ban') {
    setState(chatId, 'adm_ban');
    await send(chatId, `${em(E.BAN)} آیدی عددی کاربری که می‌خواهید مسدود کنید:`);

  } else if (data === 'adm_unban') {
    setState(chatId, 'adm_unban');
    await send(chatId, `${em(E.UNBAN)} آیدی عددی کاربری که می‌خواهید رفع مسدودی کنید:`);

  } else if (data === 'adm_add_coins') {
    setState(chatId, 'adm_add_coins');
    await send(chatId, `${em(E.ADD_COINS)} آیدی کاربر و مقدار سکه:\n<code>123456789 10</code>`);

  } else if (data === 'adm_set_coins') {
    setState(chatId, 'adm_set_coins');
    await send(chatId, `${em(E.SET_COINS)} آیدی کاربر و مقدار جدید:\n<code>123456789 5</code>`);

  } else if (data === 'adm_reset_coins') {
    setState(chatId, 'adm_reset_coins');
    await send(chatId, `${em(E.RESET_COINS)} آیدی کاربری که سکه‌اش صفر شود:`);

  } else if (data === 'adm_manual_svc') {
    setState(chatId, 'adm_manual_svc');
    await send(chatId, `${em(E.MANUAL_SERVICE)} آیدی کاربری که سرویس دستی بگیرد:`);

  } else if (data === 'adm_welcome') {
    setState(chatId, 'adm_welcome');
    await send(chatId, `${em(E.WELCOME_TEXT)} متن جدید خوش‌آمد را ارسال کنید:`);

  } else if (data === 'adm_del_user') {
    setState(chatId, 'adm_del_user');
    await send(chatId, `${em(E.DELETE_USER)} آیدی کاربری که حذف شود:`);

  } else if (data === 'adm_channels') {
    const chs = (db.required_channels || []).map(c => `@${c.username} — ${c.title}`).join('\n');
    setState(chatId, 'adm_channels');
    await send(chatId,
      `${em(E.CHANNELS)} <b>کانال‌های اجباری:</b>\n${chs || '—'}\n\n` +
      `برای افزودن:\n<code>add @username عنوان کانال</code>\n` +
      `برای حذف:\n<code>del @username</code>`
    );

  } else if (data === 'adm_coin_cfg') {
    setState(chatId, 'adm_coin_cfg');
    await send(chatId,
      `${em(E.COIN_SETTINGS)} <b>تنظیمات سکه:</b>\n\n` +
      `امتیاز هر دعوت: ${db.settings.coin_per_referral}\n` +
      `هزینه سرویس: ${db.settings.service_cost}\n` +
      `حجم سرویس: ${db.settings.service_size_gb} گیگ\n` +
      `مدت سرویس: ${db.settings.service_duration_hours} ساعت\n\n` +
      `فرمت تغییر:\n` +
      `<code>ref_coin 2</code> — امتیاز هر دعوت\n` +
      `<code>svc_cost 3</code> — هزینه سرویس\n` +
      `<code>svc_gb 2</code> — حجم گیگ\n` +
      `<code>svc_hours 48</code> — مدت ساعت`
    );

  } else if (data === 'adm_all_users') {
    const users = Object.values(db.users);
    let out = `${em(E.ALL_USERS)} <b>همه کاربران (${users.length} نفر):</b>\n\n`;
    for (const u of users.slice(0, 50)) {
      out += `${u.chat_id} | @${u.username || '—'} | ${u.coins} سکه\n`;
    }
    if (users.length > 50) out += `\n... و ${users.length - 50} نفر دیگر`;
    await send(chatId, out);

  } else if (data === 'adm_monthly') {
    const users = Object.values(db.users);
    const now = new Date();
    await edit(chatId, msgId,
      `${em(E.MONTHLY_STATS)} <b>آمار ماهانه (${now.getMonth() + 1}/${now.getFullYear()}):</b>\n\n` +
      `کل کاربران: ${users.length}\n` +
      `کل سرویس‌ها: ${users.reduce((s, u) => s + (u.total_services || 0), 0)}\n` +
      `کل دعوت‌ها: ${users.reduce((s, u) => s + (u.referral_count || 0), 0)}`,
      { reply_markup: adminKb() }
    );

  } else if (data === 'adm_report') {
    const users = Object.values(db.users);
    const banned = users.filter(u => u.is_banned).length;
    await edit(chatId, msgId,
      `${em(E.FULL_REPORT)} <b>گزارش کامل</b>\n\n` +
      `کل کاربران: ${users.length}\n` +
      `فعال: ${users.length - banned}\n` +
      `مسدود: ${banned}\n` +
      `کانفیگ‌ها: ${(db.configs || []).length}\n` +
      `کل سرویس‌ها: ${users.reduce((s, u) => s + (u.total_services || 0), 0)}\n` +
      `کل امتیازات: ${users.reduce((s, u) => s + (u.coins || 0), 0)}`,
      { reply_markup: adminKb() }
    );

  } else if (data === 'adm_configs') {
    setState(chatId, 'adm_configs');
    const n = (db.configs || []).length;
    await send(chatId,
      `${em(E.MANAGE_CONFIG)} <b>مدیریت کانفیگ</b>\n\n` +
      `تعداد کانفیگ: ${n}\n\n` +
      `برای افزودن، لینک vless/vmess/trojan/ss را ارسال کنید.\n` +
      `می‌توانید چند لینک را در یک پیام (هر خط یک لینک) ارسال کنید.\n` +
      `برای حذف همه: <code>clear_configs</code>`
    );

  } else if (data === 'adm_custom_btns') {
    const btns = db.custom_buttons || [];
    const list = btns.map((b, i) => `${i + 1}. ${b.text} (${b.style || 'primary'})`).join('\n');
    await send(chatId,
      `${em(E.CUSTOM_BTNS)} <b>دکمه‌های سفارشی (${btns.length} دکمه):</b>\n\n${list || '—'}\n\n` +
      `برای افزودن دکمه جدید:\n` +
      `<code>add_btn</code>\n\n` +
      `برای حذف دکمه:\n` +
      `<code>del_btn شماره</code>\n\n` +
      `مثال افزودن:\n` +
      `<code>متن دکمه | emoji_id | primary | پیام جواب</code>`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'افزودن دکمه', callback_data: 'adm_add_custom_btn', icon_custom_emoji_id: E.ADD_COINS }],
            [{ text: 'حذف دکمه', callback_data: 'adm_del_custom_btn', icon_custom_emoji_id: E.DELETE_USER }],
          ],
        },
      }
    );

  } else if (data === 'adm_add_custom_btn') {
    setState(chatId, 'adm_custom_btn_add');
    await send(chatId,
      `${em(E.ADD_COINS)} <b>افزودن دکمه سفارشی</b>\n\n` +
      `فرمت:\n<code>متن دکمه | emoji_id | style | متن پاسخ</code>\n\n` +
      `style: primary, secondary, destructive\n\n` +
      `مثال:\n<code>اطلاعات ما | 5206607081334906820 | primary | سایت ما: example.com</code>`
    );

  } else if (data === 'adm_del_custom_btn') {
    setState(chatId, 'adm_custom_btn_del');
    const btns = db.custom_buttons || [];
    const list = btns.map((b, i) => `${i + 1}. ${b.text}`).join('\n');
    await send(chatId,
      `${em(E.DELETE_USER)} <b>حذف دکمه سفارشی</b>\n\n${list || 'دکمه‌ای وجود ندارد.'}\n\nشماره دکمه را ارسال کنید:`
    );

  } else if (data === 'adm_maintenance') {
    db.settings.maintenance_mode = !db.settings.maintenance_mode;
    saveDB(db);
    await edit(chatId, msgId,
      `${em(E.MAINTENANCE)} حالت تعمیر ${db.settings.maintenance_mode ? 'فعال' : 'غیرفعال'} شد.`,
      { reply_markup: adminKb() }
    );
  }
}

// ─── Main message router ──────────────────────────────────────────────────────
async function handleMessage(msg) {
  if (!msg?.text) return;
  const chatId = msg.chat.id;
  const text = msg.text.trim();
  const username = msg.from?.username || '';

  const db = loadDB();
  const u = getUser(db, chatId);
  u.username = username || u.username;
  u.first_name = msg.from?.first_name || u.first_name;

  // Auto-register admin
  if (isAdmin(db, chatId, username) && !(db.settings.admin_ids || []).includes(chatId)) {
    db.settings.admin_ids = [...(db.settings.admin_ids || []), chatId];
    saveDB(db);
  }

  console.log(`[${new Date().toISOString()}] @${username || '—'} (${chatId}): ${text.slice(0, 50)}`);

  // /start
  if (text.startsWith('/start')) {
    await handleStart(msg, db);
    return;
  }

  // /admin
  if (text === '/admin') {
    if (isAdmin(db, chatId, username)) {
      const r = await send(chatId, `${em(E.BOT_STATUS)} <b>پنل مدیریت ادمین</b>`, { reply_markup: adminKb() });
      if (!r.ok) {
        console.error('Admin panel error:', r.description);
        await send(chatId, `خطا در نمایش پنل: ${r.description}`);
      }
    } else {
      await send(chatId, `${em(E.MSG_ERROR)} دسترسی ندارید. آیدی شما: ${chatId}`);
    }
    saveDB(db);
    return;
  }

  // Captcha state
  const st = getState(chatId);
  if (st === 'captcha') {
    await handleCaptcha(chatId, text, db);
    return;
  }

  // Admin states
  if (st && st.startsWith('adm_')) {
    if (await handleAdminState(chatId, text, db, username)) {
      saveDB(db);
      return;
    }
  }

  // Check if banned
  if (u.is_banned) {
    await send(chatId, `${em(E.MSG_ERROR)} حساب کاربری شما مسدود شده است.`);
    return;
  }

  // Maintenance
  if (db.settings.maintenance_mode && !isAdmin(db, chatId, username)) {
    await send(chatId, `${em(E.MAINTENANCE)} ربات در حال تعمیر است.`);
    return;
  }

  // New user not registered
  if (!u.registered && !isAdmin(db, chatId, username)) {
    await handleStart(msg, db);
    return;
  }

  // Forced subscription check
  const ok = await checkAllSubs(chatId, db);
  if (!ok) {
    await showForceSub(chatId, db);
    saveDB(db);
    return;
  }

  // Main menu
  if (text === 'دریافت اشتراک') await showGetService(chatId, db);
  else if (text === 'دعوت دوستان') await showInvite(chatId, db);
  else if (text === 'پروفایل') await showProfile(chatId, db);
  else if (text === 'پشتیبانی') await send(chatId, 'فاقد ورودی!');
  else if (text === 'قوانین') await showRules(chatId, db);
  else if (text === 'راهنما') await showGuide(chatId, db);
  else {
    // Check custom buttons
    const customBtn = (db.custom_buttons || []).find(b => b.text === text);
    if (customBtn) {
      await send(chatId, customBtn.response, { reply_markup: mainKb(db) });
    } else {
      await send(chatId, 'لطفاً از منوی پایین استفاده کنید.', { reply_markup: mainKb(db) });
    }
  }

  saveDB(db);
}

// ─── Polling ──────────────────────────────────────────────────────────────────
let offset = 0;

async function poll() {
  console.log(`[${new Date().toISOString()}] ربات شروع به کار کرد...`);
  while (true) {
    try {
      const res = await fetch(
        `${BASE_URL}/getUpdates?offset=${offset}&timeout=30&allowed_updates=["message","callback_query"]`
      );
      const data = await res.json();

      if (!data.ok) {
        console.error('getUpdates error:', data.description);
        await new Promise(r => setTimeout(r, 5000));
        continue;
      }

      for (const upd of data.result) {
        offset = upd.update_id + 1;
        if (upd.message) handleMessage(upd.message).catch(e => console.error('msg err:', e.message));
        if (upd.callback_query) handleCallback(upd.callback_query).catch(e => console.error('cb err:', e.message));
      }
    } catch (e) {
      console.error('Poll error:', e.message);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}

poll();
