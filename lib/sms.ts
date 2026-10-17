// lib/sms.ts

interface SmsPayload {
  to: string;
  message: string;
}

export async function sendSmsNotification({ to, message }: SmsPayload): Promise<boolean> {
  try {
    const userId = process.env.NOTIFY_USER_ID;
    const apiKey = process.env.NOTIFY_API_KEY;
    const senderId = process.env.NOTIFY_SENDER_ID || 'NotifyDEMO';

    // Clean phone number to Sri Lankan international format (947XXXXXXXX)
    let formattedPhone = to.replace(/\D/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '94' + formattedPhone.substring(1);
    } else if (formattedPhone.length === 9) {
      formattedPhone = '94' + formattedPhone;
    }

    // If SMS credentials are not configured in .env yet, log nicely without failing
    if (!userId || !apiKey) {
      console.log(`[SMS SIMULATION] To: ${formattedPhone} | Message: ${message}`);
      return true;
    }

    const url = new URL('https://app.notify.lk/api/v1/send');
    url.searchParams.append('user_id', userId);
    url.searchParams.append('api_key', apiKey);
    url.searchParams.append('sender_id', senderId);
    url.searchParams.append('to', formattedPhone);
    url.searchParams.append('message', message);

    const res = await fetch(url.toString(), { method: 'GET' });
    return res.ok;
  } catch (error) {
    console.error('SMS Send Error:', error);
    return false;
  }
}