import { config, hasTwilio } from "../lib/config.js";
import { toIntlPhone } from "../lib/phone.js";

export async function reverseGeocode(lat, lng) {
  if (!config.googleMapsKey || lat == null || lng == null) {
    return lat != null ? `Lat: ${lat}, Long: ${lng}` : "Location unavailable";
  }
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${config.googleMapsKey}`;
    const res = await fetch(url);
    const data = await res.json();
    return data.results?.[0]?.formatted_address || `Lat: ${lat}, Long: ${lng}`;
  } catch {
    return `Lat: ${lat}, Long: ${lng}`;
  }
}

export async function sendSms(to, body) {
  const intlTo = toIntlPhone(to);
  if (!hasTwilio()) {
    console.log(`[SOS demo SMS] to=${intlTo}: ${body}`);
    return { sent: false, demo: true };
  }
  try {
    const creds = Buffer.from(`${config.twilio.sid}:${config.twilio.token}`).toString("base64");
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${config.twilio.sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${creds}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: intlTo, From: config.twilio.from, Body: body }),
      }
    );
    return { sent: res.ok, demo: false };
  } catch (err) {
    console.warn("sendSms failed:", err.message);
    return { sent: false, demo: false };
  }
}
