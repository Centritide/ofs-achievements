import {UPDATE_EVENT_COMMAND,DISPLAY_PROFILE_COMMAND, IMPORT_FROM_ROLES_COMMAND,IMPORT_USER,REQUEST_SCORE_COMMAND,INFO_COMMAND,SUBMIT_TOURNEY_COMMAND,START_TOURNEY_COMMAND} from './commands.js';
import dotenv from 'dotenv';
import process from 'node:process';

/**
 * This file is meant to be run from the command line, and is not used by the
 * application server.  It's allowed to use node.js primitives, and only needs
 * to be run once.
 */

dotenv.config({ path: '.dev2.vars' });

const token = process.env.DISCORD_TOKEN;
const applicationId = process.env.DISCORD_APPLICATION_ID;
const guildId = process.env.GUILD_ID;
if (!token) {
  throw new Error('The DISCORD_TOKEN environment variable is required.');
}
if (!applicationId) {
  throw new Error(
    'The DISCORD_APPLICATION_ID environment variable is required.'
  );
}

/**
 * Register all commands globally.  This can take o(minutes), so wait until
 * you're sure these are the commands you want.
 */
const url = `https://discord.com/api/v10/applications/${applicationId}/guilds/${guildId}/commands`;

const response = await fetch(url, {
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bot ${token}`,
  },
  method: 'PUT',
  body: JSON.stringify([UPDATE_EVENT_COMMAND,DISPLAY_PROFILE_COMMAND,IMPORT_FROM_ROLES_COMMAND,IMPORT_USER,REQUEST_SCORE_COMMAND,INFO_COMMAND,SUBMIT_TOURNEY_COMMAND,START_TOURNEY_COMMAND]),
});

if (response.ok) {
  console.log('Registered all commands');
  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
  // set permissions for start tourney
  const commandId = data.find((command) => command.name === 'start-tourney').id;
  try {
    const response2 = await setCommandPermissions(commandId);
    if (response2.ok) {
      console.log('Set permissions for start tourney command');
    } else {
      console.error('Error setting permissions for start tourney command');
      let errorText = `Error setting permissions for start tourney command \n ${response2.url}: ${response2.status} ${response2.statusText}`;
      try {
        const error = await response2.text();
        if (error) {
          errorText = `${errorText} \n\n ${error}`;
        }
      } catch (err) {
        console.error('Error reading body from request:', err);
      }
      console.error(errorText);
    }
  } catch (err) {
    console.error('Error setting permissions:', err);
  }

  const permissionsUrl = `https://discord.com/api/v10/applications/${applicationId}/guilds/${guildId}/commands/${commandId}/permissions`;

} else {
  console.error('Error registering commands');
  let errorText = `Error registering commands \n ${response.url}: ${response.status} ${response.statusText}`;
  try {
    const error = await response.text();
    if (error) {
      errorText = `${errorText} \n\n ${error}`;
    }
  } catch (err) {
    console.error('Error reading body from request:', err);
  }
  console.error(errorText);
}

async function setCommandPermissions(commandId) {
  const permissions = [
    {
      id: '782652297212592169', // tournament organizer role id placeholder, replace with actual role id
      type: 1,
      permission: true,
    },
  ]
  const response = await fetch(
    `https://discord.com/api/v10/applications/${applicationId}/guilds/${guildId}/commands/${commandId}/permissions`,
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bot ${token}`,
      },
      method: 'PUT',
      body: JSON.stringify({ permissions }),
    }
  );
  return response;
}