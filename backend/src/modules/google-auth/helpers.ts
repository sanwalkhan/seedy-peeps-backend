import { google } from 'googleapis';
import { config } from 'dotenv';

config();

// const oauth2Client =
new google.auth.OAuth2({
  clientId: process.env.GO_ID,
  clientSecret: process.env.GO_SECRET,
  redirectUri: 'postmessage',
});

export const getGoogleUser = async (token: string) => {
  const resp = await fetch('https://www.googleapis.com/userinfo/v2/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('getGoogleUser', getGoogleUser);
  const user = await resp.json();
  console.log('user', '-----', user);
  // await oauth2Client.revokeToken(token); // Remove and move it to logout endpoint
  return user;
};

export const revokeGoogleToken = async (token: string) => {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: token });
  await oauth2Client.revokeToken(token);
};
