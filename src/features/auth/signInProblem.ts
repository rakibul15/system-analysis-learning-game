import { tr } from '@/shared/lib/i18n';

/**
 * What to tell a learner whose sign-in did not finish, from the Firebase code (or our own
 * 'redirect-lost'). `elsewhere` asks them to open the site in their phone's own browser, for the
 * cases a browser built into another app (GitHub, Facebook, Messenger) cannot do.
 */
export function signInProblem(code: string): { text: string; elsewhere: boolean } {
  switch (code) {
    case 'auth/popup-blocked':
      return { text: tr('Google-এর window খুলতে দেরি হয়েছিল, তাই browser আটকে দিয়েছে। এখন সব তৈরি: আবার চাপুন।', 'The browser blocked Google\'s window because it took too long to open. Everything is ready now: tap again.'), elsewhere: false };
    case 'redirect-lost':
      return { text: tr('Google থেকে ফিরে login শেষ হয়নি। আবার চাপুন; তাতেও না হলে link-টা Chrome বা Safari-তে খুলুন।', 'Sign-in did not finish after coming back from Google. Tap again; if that fails too, open the link in Chrome or Safari.'), elsewhere: true };
    case 'auth/network-request-failed':
      return { text: tr('Internet পাওয়া যায়নি। সংযোগ দেখে আবার চাপুন।', 'No internet connection. Check it and tap again.'), elsewhere: false };
    case 'auth/too-many-requests':
      return { text: tr('অনেকবার চেষ্টা হয়েছে। একটু পরে আবার চেষ্টা করুন।', 'Too many tries. Please wait a little and try again.'), elsewhere: false };
    case 'auth/unauthorized-domain':
      return { text: tr('এই ঠিকানা থেকে login চালু নেই। parcelgo-system-design.vercel.app থেকে খুলুন।', 'Sign-in is not enabled on this address. Open parcelgo-system-design.vercel.app instead.'), elsewhere: false };
    case 'auth/web-storage-unsupported':
    case 'auth/operation-not-supported-in-this-environment':
      return { text: tr('এই browser-এ Google login চলে না। Link-টা Chrome বা Safari-তে খুলুন।', 'Google sign-in does not work in this browser. Open the link in Chrome or Safari.'), elsewhere: true };
    default:
      return { text: tr('Login হয়নি, আবার চেষ্টা করুন। বারবার না হলে link-টা Chrome বা Safari-তে খুলে দেখুন।', 'Sign-in failed, please try again. If it keeps failing, open the link in Chrome or Safari.'), elsewhere: true };
  }
}

/**
 * The app whose built-in browser this page is open in, when its user agent says so. Google refuses
 * to sign in inside these. Some apps (GitHub's) open links in a view that looks like the phone's
 * own browser, so this cannot catch every case; a failed sign-in still points to Chrome or Safari.
 */
export function embeddedIn(ua: string): string | null {
  if (/FBAN|FBAV|FB_IAB|FBIOS|FB4A/.test(ua)) return /Messenger|Orca/.test(ua) ? 'Messenger' : 'Facebook';
  if (/Instagram/.test(ua)) return 'Instagram';
  if (/\bLine\//.test(ua)) return 'LINE';
  if (/MicroMessenger/.test(ua)) return 'WeChat';
  if (/musical_ly|BytedanceWebview|TikTok/i.test(ua)) return 'TikTok';
  if (/Android.*; wv\)/.test(ua)) return 'app';
  return null;
}

export const isAndroid = (ua: string) => /Android/.test(ua);
