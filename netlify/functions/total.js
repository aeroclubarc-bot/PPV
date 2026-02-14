// netlify/functions/total.js
const crypto = require("crypto");

const BASE_URL = "https://globalapi.solarmanpv.com";

const API_ID = process.env.SOLARMAN_API_ID;
const API_SECRET = process.env.SOLARMAN_API_SECRET;
const EMAIL = process.env.SOLARMAN_USERNAME;
const PASSWORD = process.env.SOLARMAN_PASSWORD;

function sha256Lower(str) {
  return crypto.createHash("sha256").update(str).digest("hex").toLowerCase();
}

function extractToken(data) {
  return data?.access_token || data?.data?.access_token || null;
}

// TOKEN
async function getAccessToken() {

  const res = await fetch(
    `${BASE_URL}/account/v1.0/token?appId=${API_ID}&language=en`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: EMAIL,
        password: sha256Lower(PASSWORD),
        appSecret: API_SECRET
      })
    }
  );

  const data = await res.json();
  const token = extractToken(data);

  if (!token) throw new Error("Token failed");

  return token;
}

// STATION
async function getStation(token) {

  const res = await fetch(`${BASE_URL}/station/v1.0/list`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      pageNum: 1,
      pageSize: 10
    })
  });

  const data = await res.json();

  return data?.data?.list?.[0];
}


// HANDLER
exports.handler = async function () {
  try {

    const token = await getAccessToken();
    const station = await getStation(token);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=60"
      },
      body: JSON.stringify({
        station_name: station.name,
        current_power_w: station.generationPower,
        installed_kwp: station.installedCapacity,
        battery_soc: station.batterySoc,
        updated_at: station.lastUpdateTime
      }, null, 2)
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
