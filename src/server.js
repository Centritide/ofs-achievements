/**
 * The core server that runs on a Cloudflare worker.
 */

import { Router } from 'itty-router';
import { Client } from "pg";
import {
  InteractionResponseType,
  InteractionType,
  verifyKey,
} from 'discord-interactions';
import {UPDATE_EVENT_COMMAND,DISPLAY_PROFILE_COMMAND, IMPORT_FROM_ROLES_COMMAND,REQUEST_SCORE_COMMAND,IMPORT_USER,INFO_COMMAND, START_TOURNEY_COMMAND, SUBMIT_TOURNEY_COMMAND,STOP_TOURNEY_COMMAND, LEADERBOARD_COMMAND} from './commands.js';
const data = require("./data/data.json");
const dict = data.dict;
const event_thresholds = data.event_thresholds;
const table = "users";
const tourney_length = 15*60*1000; // 15 minutes
class JsonResponse extends Response {
  constructor(body, init) {
    const jsonBody = JSON.stringify(body);
    init = init || {
      headers: {
        'content-type': 'application/json;charset=UTF-8',
      },
    };
    super(jsonBody, init);
  }
}

const router = Router();

/**
 * A simple :wave: hello page to verify the worker is working.
 */
router.get('/', (request, env) => {
  return new Response(`👋 ${env.DISCORD_APPLICATION_ID}`);
});

/**
 * Main route for all requests sent from Discord.  All incoming messages will
 * include a JSON payload described here:
 * https://discord.com/developers/docs/interactions/receiving-and-responding#interaction-object
 */
router.post('/', async (request, env) => {
  const { isValid, interaction } = await server.verifyDiscordRequest(
    request,
    env
  );
  if (!isValid || !interaction) {
    return new Response('Bad request signature.', { status: 401 });
  }
  console.log(interaction);
  if (interaction.type === InteractionType.PING) {
    // The `PING` message is used during the initial webhook handshake, and is
    // required to configure the webhook in the developer portal.
    return new JsonResponse({
      type: InteractionResponseType.PONG,
    });
  }

  if (interaction.type === InteractionType.APPLICATION_COMMAND) {
    // Most user commands will come as `APPLICATION_COMMAND`.
    switch (interaction.data.name.toLowerCase()) {
      case DISPLAY_PROFILE_COMMAND.name.toLowerCase():
        return showProfile(interaction,env);
      case UPDATE_EVENT_COMMAND.name.toLowerCase():
        switch (interaction.data.options[0].name.toLowerCase()){
          case UPDATE_EVENT_COMMAND.options[0].name.toLowerCase():
            return update(interaction,env);
          case UPDATE_EVENT_COMMAND.options[1].name.toLowerCase():
            return update(interaction,env);
          default:
            return updateEvent(interaction,env);
        }
      case IMPORT_FROM_ROLES_COMMAND.name.toLowerCase():
        return importFromRoles(interaction.member.user.id,interaction,env);
      case IMPORT_USER.name.toLowerCase():
        return importFromRoles(interaction.data.options[0].value,interaction,env);

      // case PROFILE_TO_ROLES_COMMAND.name.toLowerCase():

      case REQUEST_SCORE_COMMAND.name.toLowerCase():
        return requestScore(interaction,env);
      case INFO_COMMAND.name.toLowerCase():
        return help(interaction, env);
      case START_TOURNEY_COMMAND.name.toLowerCase():
        return startTourney(interaction, env);
      case SUBMIT_TOURNEY_COMMAND.name.toLowerCase():
        return submitTourney(interaction, env);
      case STOP_TOURNEY_COMMAND.name.toLowerCase():
        return stopTourney(interaction, env);
      case LEADERBOARD_COMMAND.name.toLowerCase():
        return leaderboard(interaction, env);
      case TEST_COMMAND.name.toLowerCase():

        return new JsonResponse({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data:{
            embeds:[
              {
                image: {
                  url: interaction.data.resolved.attachments[Object.keys(interaction.data.resolved.attachments)[0]].url
                }
              }
            ]
          }
        })
        break;

      default:
        return new JsonResponse({ error: 'Unknown Type' + interaction.data.name.toLowerCase() }, { status: 400 });
    }
  }
  if (interaction.type === InteractionType.MESSAGE_COMPONENT){
    // if channel is secret channel, componentResponse
    // if channel is secret tourney channel, tourneyResponse
    if  (interaction.message.channel_id == env.CHANNEL_ID){
      return await componentResponse(interaction, env);

    } else if (interaction.message.channel_id == env.TOUR_CHANNEL_ID) {
      return await tourneyResponse(interaction, env);
    }
  }
  console.error('Unknown Type');
  return new JsonResponse({ error: 'Unknown Type' }, { status: 400 });
});
router.all('*', () => new Response('Not Found.', { status: 404 }));


// holy hell. what the hell. AAAAAAAA

async function help(interaction,env){
  // if(!Object.hasOwn(interaction.data,"options"))
  // return new JsonResponse({
  //   type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
  //   data: {
  //     content: "aaaaaa",
  //     flags: 1000000
  //   }});
  const info = (Object.hasOwn(interaction.data,"options")) ? interaction.data.options[0].value : "default";

  return new JsonResponse({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: data.infos[info],
      flags: 1000000
    }
  });
}

async function showProfile(interaction,env){
  // console.log(interaction);
  const user = interaction.data.options[0].options[0].value;


  let avi_url;
  if(interaction.data.resolved.users[user].avatar === null){
    avi_url = 'https://cdn.wikimg.net/en/splatoonwiki/images/2/2a/S3_Stage_Random.png?20230909072647';
  }else if(interaction.data.resolved.users[user].avatar.substring(0,2) == "a_"){
    avi_url = "https://cdn.discordapp.com/avatars/"+user+"/"+interaction.data.resolved.users[user].avatar+".gif";
  }else{
    avi_url = "https://cdn.discordapp.com/avatars/"+user+"/"+interaction.data.resolved.users[user].avatar+".png";
  }
  const page = (interaction.data.options[0].options.length>=2) ? interaction.data.options[0].options[1].value : 0;
  // console.log(interaction.data.options[0].options);
  const usemax = data.layouts[page][0];
  const title = data.layouts[page][1];
  const layoutscores = data.layouts[page][2];
  const client = new Client({
    user: env.PG_USER ,
    password: env.PG_PW ,
    host: env.PG_HOST ,
    port: 6543,
    database: env.PG_NAME
  });
  let daysum = 0;
  let nightsum=0;
  let hasdaynum = 0;
  let hasnightnum = 0;
  await client.connect();
  const output = await client.query(`SELECT * from ${table} where id = ${user}`);
  let row;
  if(output.rows.length >0){
    row = output.rows[0];
  } else {
    client.end();
    return new JsonResponse({type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: "No profile detected for user <@"+user+">",
        flags: 1000000
    }});
  } //checks if data exists for the user. if none exists, fails
  delete row.id;
  let fields = [];
  // console.log(usemax);
  if(usemax){
    // console.log(layoutscores);
    for(let i of layoutscores){
      if(i == ""){
        // console.log(i);
        fields.push({
          "name": "​",
          "value": "​",
          "inline":true
        })
      }else if(typeof i === 'string'){
        // console.log(getStageMax(row,i));
        fields.push({
          "name":dict[i],
          "value":(getStageMax(row,i)==0)?"-":getStageMax(row,i),
          "inline":true
        })
      } else { //TODO there should be some logic for adding badges to scores
        daysum += getStageMax(row,i[1]);
        nightsum += getStageMax(row,i[0]);
        if (getStageMax(row,i[1])>0) hasdaynum += 1;
        if (getStageMax(row,i[0])>0) hasnightnum += 1;
        fields.push({
          "name": "🌙"+dict[i[0]]+"/☀️",
          "value":((getStageMax(row,i[0])==0)?"-":getStageMax(row,i[0]))+"/"+((getStageMax(row,i[1])==0)?"-":getStageMax(row,i[1])),
          "inline":true
        })
      }
    }
  } else{
    let layout = [];
    for(let i of layoutscores){
      // console.log(i);
      layout = layout.concat(data.col_groups[i]);
      // console.log("helloooo");
      // console.log((3-(data.col_groups[i].length%3)));
      for(let j = 0; data.col_groups[i].length%3>0 && j<(3-(data.col_groups[i].length%3));j++){
        layout.push("");
      }
    }
    for(let i of layout){
      const value = row[i];
      // console.log(row[i] || 0);

      if(i == ""){
        fields.push({
          "name": "​", //this too
          "value": "​",
          "inline":true
        })
      } else { //TODO there should be some logic for adding badges to scores
        // console.log(`${i} ${dict[i]}`)
        fields.push({
          "name": dict[i],
          "value": value==0?"-":value,
          "inline":true
        })
      }
    }
  }
  client.end();
  // console.log(fields)
  return new JsonResponse({type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      "content": "",
      "tts": false,
      "embeds": [
        {
          // "id": 652627557,
          "title": "",
          "description": "<@" + user + ">'s scores (<t:"+Math.floor((Date.now()/1000))+":d>)",
          "color": 11714851,
          "fields": fields,
          "author": {
            "name": `OF Scorecard: ${title}`,
            // "url": "https://author.url",
            "icon_url": "" //guild_icon
          },
          // "image": {
          //   "url": ""
          // },
          "thumbnail": {
            "url": avi_url
          },
          "footer": {
            "text": (daysum > 0 || nightsum > 0) ? `total: ${nightsum} / ${daysum} ☀️ | avg: ${((nightsum/hasnightnum) || 0).toFixed(1)} / ${((daysum/hasdaynum) || 0).toFixed(1)} ☀️ `:"what should i write here 😔",
            "icon_url": ""
          },
          // "timestamp": "<t:"+Date.now()":d>"
        }
      ]
    }
  });
}

function getStageMax(row,stage){
  let arr = [];
  // console.log(stage);
  for(let i of data.col_groups[stage]){
    arr.push(row[i])
  }
  return Math.max(...arr);
}
function getStageEmoji(stage,score){
  //TODO
}

// handles responding to super secret staff buttons/fields

async function componentResponse(interaction,env){
  const user = interaction.message.embeds[0].fields[0].value;
  let subcommand = interaction.message.embeds[0].fields[1].value;
  let score = Number(interaction.message.embeds[0].fields[2].value);
  let rot_type = interaction.message.embeds[0].fields[3].value;
  let stage = interaction.message.embeds[0].fields[4].value;
  const link = interaction.message.embeds[0].image.url;
  const content = interaction.message.content;
  const response = await fetch(`https://discord.com/api/v10/users/@me/channels`,{
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bot ${env.DISCORD_TOKEN}`,
    },
    method:'POST',
    body: JSON.stringify({
      "recipient_id": user
    })
  })
  const dmchannel = await response.json();
  switch(interaction.data.custom_id.toLowerCase()){
    case "approve":

      let column = stage + ((subcommand == "bigrun" || subcommand == "eggstra") ? "":rot_type);

      let newscore = await updateScore(user,score,column,env);

      const acceptresponse = await fetch(`https://discord.com/api/v10/channels/${dmchannel.id}/messages`,{
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bot ${env.DISCORD_TOKEN}`,
        },
        method:'POST',
        body: JSON.stringify({
          "content": "Updated your score:" + dict[column] + " score: " + newscore,
          "embeds": interaction.message.embeds,
        })
      })
      const acceptdata = await acceptresponse.json()
      // console.log(acceptdata);
      return new JsonResponse({
        type: InteractionResponseType.UPDATE_MESSAGE,
        data: {
          content: content + "\nUpdated score for <@" + user + ">. " + column + " score: " + newscore,
          components:[]
        }
      });
    case "deny":
      const denyresponse = await fetch(`https://discord.com/api/v10/channels/${dmchannel.id}/messages`,{
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bot ${env.DISCORD_TOKEN}`,
        },
        method:'POST',
        body: JSON.stringify({
          "content": "Your score request was denied.",
          "embeds": interaction.message.embeds,
        })
      })
      const denydata = await denyresponse.json()
      // console.log(denydata);
      return new JsonResponse({
        type: InteractionResponseType.UPDATE_MESSAGE,
        data: {
          content: content + "\ndenied",
          embeds:interaction.message.embeds,
          components:[]
        }
      });
    case "change subcommand":
      subcommand = interaction.data.values[0];

    case "change map":
      stage = interaction.data.values[0];
      break;
    case "change rotation type":
      rot_type = interaction.data.values[0];
      break;

    case "add 1":
      score = score + 1;
      break;
    case "add 2":
      score +=2;
      break;
    case "add 5":
      score +=5;
      break;
    case "add 10":
      score +=10;
      break;
    case "sub 1":
      score -=1;
      break;
    case "sub 2":
      score -=2;
      break;
    case "sub 5":
      score -=5;
      break;
    case "sub 10":
      score -=10;
      break;
  }
  return new JsonResponse({
    type: InteractionResponseType.UPDATE_MESSAGE,
    data: {
      "embeds":  embedMaker(link,user,subcommand,score,rot_type,stage),
      "components": componentMaker(subcommand,score,rot_type,stage)
    }
  });
}

//handles the super secret tourney buttons/fields, sends leaderboard once 3 submissions are approved

async function tourneyResponse(interaction, env) {
  // console.log("a");
  const id = interaction.message.embeds[0].fields[0].value;
  const user = interaction.message.embeds[0].fields[1].value
  const score = Number(interaction.message.embeds[0].fields[2].value);
  const tourney_id = interaction.message.embeds[0].fields[3].value;
  const content = interaction.message.content;
  const response = await fetch(`https://discord.com/api/v10/users/@me/channels`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bot ${env.DISCORD_TOKEN}`,
    },
    method: 'POST',
    body: JSON.stringify({
      "recipient_id": user
    })
  });
  const dmchannel = await response.json();
  const client = new Client({
    user: env.PG_USER,
    password: env.PG_PW,
    host: env.PG_HOST,
    port: 6543,
    database: env.PG_NAME
  });
  await client.connect();
  let output, output2;
  switch (interaction.data.custom_id.toLowerCase()) {
    case "approve":
      output = await client.query(`UPDATE submissions SET submission_status = 'accepted' WHERE id = ${id};`);
      output2 = await client.query(`SELECT * FROM submissions WHERE tournament_id = ${tourney_id} ORDER BY score DESC;`);
      const requested = output2.rows.filter((row) => row.submission_status == 'requested');

      // if there are no more requested submissions, send leaderboard
      if (requested.rows.length == 0) {
        const leaderboard = output2.rows.filter((row) => row.submission_status == 'accepted');
        // console.log(leaderboard[0].team_members[0]);
        let leaderboardstring = "## Top 3 for One Shot Showdown " + tourney_id + "\n";
        const place = ['🥇 1st', '🥈 2nd', '🥉 3rd'];
        const oss_cols = ['oss_1st','oss_2nd','oss_3rd'];
        for (let i = 0; i < 3; i++) {
          let members = leaderboard[i].team_members[0].split(" ").map((member) => "<@" + member + ">").join(", ");
          leaderboardstring += `${place[i]}\n:OFS4a_goldenegg: x **${leaderboard[i].score}**\nTeam Members: ${members}\n\n`
          for (let j in leaderboard[i].team_members[0].split(" ")){
            // console.log(`UPDATE users SET ${oss_cols[i]} = ${oss_cols[i]} + 1 WHERE id = ${j}`);
            let output3 = await client.query(`UPDATE users SET ${oss_cols[i]} = ${oss_cols[i]} + 1 WHERE id = ${leaderboard[i].team_members[0].split(" ")[j]}`);
          }

        }
        const tourney_channel = "1329610164390727680"; // tournaments and events channel
        const tourney_response = await fetch(`https://discord.com/api/v10/channels/${tourney_channel}/messages`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bot ${env.DISCORD_TOKEN}`,
          },
          method: 'POST',
          body: JSON.stringify({
            "content": leaderboardstring
          })
        });
        // const tourney_data = await tourney_response.json();
        // console.log(tourney_data);
        return new JsonResponse({
          type: InteractionResponseType.UPDATE_MESSAGE,
          data: {
            content: content + "\nAdded submission for<@" + user + " >. " + " score: " + score + "\nAnd leaderboard sent to <#" + tourney_channel + ">",
          }
        })
      }
      client.end();
      // console.log(output);

      // only need to send response if no leaderboard
      //const acceptresponse = await fetch(`https://discord.com/api/v10/channels/${dmchannel.id}/messages`, {
      //  headers: {
      //    'Content-Type': 'application/json',
      //    Authorization: `Bot ${env.DISCORD_TOKEN}`,
      //  },
      //  method: 'POST',
      //  body: JSON.stringify({
      //    "content": "Accepted your submission for tournament " + tourney_id + " with score " + score,
      //    "embeds": interaction.message.embeds,
      //  })
      //});
      // const acceptdata = await acceptresponse.json();
      // console.log(acceptdata);
      return new JsonResponse({
        type: InteractionResponseType.UPDATE_MESSAGE,
        data: {
          content: content + "\nAdded submission for <@" + user + ">. " + " score: " + score,
          components: []
        }
      });
    case "deny":
      // delete submission
      output = await client.query(`DELETE FROM submissions WHERE id = ${id};`);
      output2 = await client.query(`SELECT * FROM submissions WHERE tournament_id = ${tourney_id} AND submission_status IS NULL ORDER BY score DESC LIMIT 1;`);
      // console.log(output);
      if (output2.rows.length == 0) {
        return new JsonResponse({
          type: InteractionResponseType.UPDATE_MESSAGE,
          data: {
            content: content + "\nDeleted submission for <@" + user + ">. " + " score: " + score,
            components: []
          }
        });
      }
      row = output2.rows[0];
      await client.query(`UPDATE submissions SET submission_status = 'requested' WHERE id = ${row.id};`);
      client.end();
      await handleSubmission(env, row.id, row.score, row.team_members, row.tournament_id, row.link);
      const denyresponse = await fetch(`https://discord.com/api/v10/channels/${dmchannel.id}/messages`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bot ${env.DISCORD_TOKEN}`,
        },
        method: 'POST',
        body: JSON.stringify({
          "content": "Your FSR submission was denied.",
          "embeds": interaction.message.embeds,
        })
      });
      const denydata = await denyresponse.json();
      // console.log(denydata);
      return new JsonResponse({
        type: InteractionResponseType.UPDATE_MESSAGE,
        data: {
          content: content + "\ndenied",
          embeds: interaction.message.embeds,
          components: []
        }
      });
  }
}


//formatting for the super secret staff messages

function embedMaker(link,user,subcommand,score,rot_type,stage){
  return [
    {
      // "id": 652627557,
      "author": {
        "name": ""
      },
      "image": {
        "url": link
      },
      "fields": [
        {
          "name":"user",
          "value": user
        },
        {
          "name":"subcommand",
          "value": subcommand
        },
        {
          "name":"score",
          "value": score,
        },
        {
          "name": "rot_type",
          "value": rot_type
        },
        {
          "name": "stage/event #",
          "value": stage
        }
      ]
    }
  ];
}

function mapField(subcommand){
  let map_event_field;
  switch(subcommand){
    case REQUEST_SCORE_COMMAND.options[0].name.toLowerCase(): //s3
      map_event_field =
      {
        type:1,
        components:[{
          type:3,
          custom_id:"change map",
          placeholder:"change map/event",
          options:[
            {
              "label": "Spawning Grounds",
              "value": "sg",
              // "description": "ez map",
            },
            {
              "label": "Marooner's Bay",
              "value": "mb",
              // "description": "ez map",
            },
            {
              "label": "Salmonid Smokeyard",
              "value": "ssy",
              // "description": "ez map",
            },
            {
              "label": "Gone Fission Hydroplant",
              "value": "gfh",
              // "description": "ez map",
            },
            {
              "label": "Sockeye Station",
              "value": "sst",
              // "description": "ez map",
            },
            {
              "label": "Jammin' Salmon Junction",
              "value": "jsj",
              // "description": "ez map",
            },
            {
              "label": "Bonerattle Arena",
              "value": "bra",
              // "description": "ez map",
            }
          ]
        }]
      };
      break;
    case REQUEST_SCORE_COMMAND.options[1].name.toLowerCase(): //s2
      map_event_field =
      {
        type:1,
        components:[{
          type:3,
          custom_id:"change map",
          placeholder:"change map/event",
          options:[
            {
              "label": "Spawning Grounds",
              "value": "s2sg",
              // "description": "ez map",
            },
            {
              "label": "Marooner's Bay",
              "value": "s2mb",
              // "description": "ez map",
            },
            {
              "label": "Lost Outpost",
              "value": "s2lo",
              // "description": "ez map",
            },
            {
              "label": "Salmond Smokeyard",
              "value": "s2ss",
              // "description": "ez map",
            },
            {
              "label": "Ruins of Ark Polaris",
              "value": "s2ap",
              // "description": "ez map",
            },
          ]
        }]
      };
      break;
    case REQUEST_SCORE_COMMAND.options[2].name.toLowerCase(): //bigrun
      map_event_field =
      {
        type:1,
        components:[{
          type:3,
          custom_id:"change map",
          placeholder:"change map/event",
          options:[
            {
              "label": "Big Run #1 - Wahoo World",
              "value": "br1",
              // "description": "ez map",
            },
            {
              "label": "Big Run #2 - Inkblot Art Academy",
              "value": "br2",
              // "description": "ez map",
            },
            {
              "label": "Big Run #3 - Undertow Spillway",
              "value": "br3",
              // "description": "ez map",
            },
            {
              "label": "Big Run #4 - Um'ami Ruins",
              "value": "br4",
              // "description": "ez map",
            },
            {
              "label": "Big Run #5 - Barnacle & Dime",
              "value": "br5",
              // "description": "ez map",
            },
            {
              "label": "Big Run #6 - Eeltail Alley",
              "value": "br6",
              // "description": "ez map",
            },
            {
              "label": "Big Run #7 - Grand Splatlands Bowl",
              "value": "br7",
              // "description": "ez map",
            },
          ]
        }]
      };
      break;
    case REQUEST_SCORE_COMMAND.options[3].name.toLowerCase(): //eggstra
      map_event_field =
      {
        type:1,
        components:[{
          type:3,
          custom_id:"change map",
          placeholder:"change map/event",
          options:[
            {
              "label": "Eggstra Work #1 - Sockeye Station",
              "value": "ew1",
              "description": "Splattershot, Blaster, Splat Roller, Splat Charger",
            },
            {
              "label": "Eggstra Work #2 - Gone Fission Hydroplant",
              "value": "ew2",
              "description": "Heavy Splatling, Slosher, Splat Dualies, Splat Brella",
            },
            {
              "label": "Eggstra Work #3 - Spawning Grounds",
              "value": "ew3",
              "description": "Flingza Roller, Tri-Stringer, Splatana Wiper, .52 Gal",
            },
            {
              "label": "Eggstra Work #4 - Marooner's Bay",
              "value": "ew4",
              "description": "Classic Squiffer, Splash-o-matic, S-Blast '92, Dynamo Roller",
            },
            {
              "label": "Eggstra Work #5 - Jammin' Salmon Junction",
              "value": "ew5",
              "description": "Splattershot Jr., Sloshing Machine, Rapid Blaster, Hydra Splatling",
            },
            {
              "label": "Eggstra Work #6 - Salmonid Smokeyard",
              "value": "ew6",
              "description": "N-ZAP '85, Squeezer, Carbon Roller, Tenta Brella",
            },
            {
              "label": "Eggstra Work #7 - Bonerattle Arena",
              "value": "ew7",
              "description": "Splattershot, Octobrush, Nautilus 47, Explosher",
            }
          ]
        }]
      };
      break;
  }
  return map_event_field;
}

function componentMaker(subcommand,score,rot_type,stage){
  const approverow = {
    type:1,
    components:[
      {
        type:2,
        label:"approve",
        style:3,
        custom_id:"approve",
        // disabled:"true"
      },
      {
        type:2,
        label:"deny",
        style:4,
        custom_id:"deny",
        // disabled:"true"
      },
      {
        type:2,
        label:"+1",
        style:2,
        custom_id:"add 1"
      },
      {
        type:2,
        label:"+2",
        style:2,
        custom_id:"add 2"
      },
      {
        type:2,
        label:"+5",
        style:2,
        custom_id:"add 5"
      }
    ]
  };
  const scorerow = {
    type: 1,
    components: [
      {
        type: 2,
        label: "-1",
        style: 2,
        custom_id: "sub 1"
      },
      {
        type: 2,
        label: "-2",
        style: 2,
        custom_id: "sub 2"
      },
      {
        type: 2,
        label: "-5",
        style: 2,
        custom_id: "sub 5"
      },
      {
        type: 2,
        label: "-10",
        style: 2,
        custom_id: "sub 10"
      },
      {
        type: 2,
        label: "+10",
        style: 2,
        custom_id: "add 10"
      }
    ]
  };
  if (subcommand == "tourney") {
    return ([approverow, scorerow]);
  }
  const subcommandrow = {
    type:1,
    components:[{
      type:3,
      custom_id:"change subcommand",
      placeholder:"change subcommand",
      options:[
        {
          "label": "s3",
          "value": "s3"
        },
        {
          "label": "s2",
          "value": "s2"
        },
        {
          "label": "big run",
          "value": "bigrun"
        },
        {
          "label": "eggstra work",
          "value": "eggstra"
        }
      ]
    }]
  }
  const stagerow = mapField(subcommand.toLowerCase());
  const rotationrow = {
    type:1,
    components:[{
      type:3,
      custom_id:"change rotation type",
      placeholder:"change rotation type",
      options:[
        {
          label:"Normal",
          value:"normal"
        },
        {
          label:"All Green Random",
          value:"green_random"
        },
        {
          label:"One Green Random",
          value:"single_random"
        },
        {
          label:"All Gold Random",
          value:"golden_random"
        },
        {
          label:"Normal (Day Only)",
          value:"normalday"
        },
        {
          label:"All Green Random (Day Only)",
          value:"green_randomday"
        },
        {
          label:"One Green Random (Day Only)",
          value:"single_randomday"
        },
        {
          label:"All Gold Random (Day Only)",
          value:"golden_randomday"
        },
        {
          label:"Princess",
          value:"princess"
        }
      ]
    }]
  }

  if(!(data[subcommand].includes(stage))){
    return([stagerow]);
  } else if(subcommand == "bigrun" || subcommand == "eggstra") {
    return(
      [
        approverow,
        subcommandrow,
        stagerow,
        scorerow
      ]
    );
  } else if(rot_type == "False"){
    return([rotationrow]);
  }else {
    // console.log([
    //   approverow,
    //   subcommandrow,
    //   stagerow,
    //   rotationrow,
    //   scorerow
    // ]);
    return(
      [
        approverow,
        subcommandrow,
        stagerow,
        rotationrow,
        scorerow
      ]
    );
  }
}

//three functions that all update a score. well done. very normal

async function updateScore(user,score,column,env,strict_increase = true){

  // console.log(user +" " + score+ " " + column);

  const client = new Client({
    user: env.PG_USER ,
    password: env.PG_PW ,
    host: env.PG_HOST ,
    port: 6543,
    database: env.PG_NAME
  });
  try {
    await client.connect();
  } catch (error) {
    console.error(error);
  }

  if(strict_increase){
    const old = await client.query(`SELECT ${column} from ${table} where id = ${user};`);
    let old_score = 0;
    if(old.rows.length>0 && (old.rows[0][column]<score)){
      try{
        await client.query(`UPDATE ${table} set ${column} = ${score} where id = ${user};`)

        old_score = old.rows[0][column];
      } catch{
      }
    } else if (old.rows.length > 0){
      old_score = old.rows[0][column];
    }else {
      old_score = 0;
      await client.query(`INSERT INTO ${table} (id,${column}) VALUES (${user},${score});`);
    };
    return Math.max(old_score,score);
  } else {
    let old_score;
    const old = await client.query(`SELECT ${column}from ${table} where id = ${user};`);
    if(old.rows.length <= 0){
      old_score = 0;
      await client.query(`INSERT INTO ${table} (id,${column}) VALUES (${user},${score});`);
    } else {
      try{
        // console.log(await client.query(`UPDATE ${table} set ${column} = ${score} where id = ${user};`));
        old_score = old.rows[0][column];
      } catch{
      }
    }
    client.end();
    return old_score;
  }

}

async function updateEvent(interaction,env){
  const subcommand = interaction.data.options[0].name.toLowerCase();
  const user = interaction.data.options[0].options[0].value;
  const event = interaction.data.options[0].options[1].value;
  const score = interaction.data.options[0].options[2].value;

  const old_score = await updateScore(user, score, event,env,false);
  if(old_score ===undefined){
    return new JsonResponse({type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: "Failed to update score.",
        flags: 1000000
    }});
  } else {
  return new JsonResponse({type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: "Updated " + event + " score for <@"+user + "> to " + score + ". Was:"  + old_score,
      flags: 1000000
  }});}
}

async function update(interaction,env){
  const user = interaction.data.options[0].options[0].value;
  const stage = interaction.data.options[0].options[1].value;
  const score = interaction.data.options[0].options[2].value;
  const rot_type = interaction.data.options[0].options[3].value;
  let column = stage + rot_type;
  const old_score = await updateScore(user,score,column,env,false);
  if(old_score ===undefined){
    return new JsonResponse({type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: "Failed to update score.",
        flags: 1000000
    }});
  } else {
  let content = "Updated " + column + " score for <@"+user + "> to " + score + ". Was:"  + old_score;
  return new JsonResponse({type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: content,
      flags: 1000000
  }});
}
}
// requests. sends a message to secret channel
async function requestScore(interaction,env){
  const subcommand = interaction.data.options[0].name.toLowerCase();
  const user = interaction.member.user.id;
  const options = interaction.data.options[0].options;
  // console.log(options);
  let link, score,stage;
  let rot_type = "event";
  for(const i of options) {
    switch (i.name.toLowerCase()){
      case "stage":
        stage = i.value;
        break;
      case "score":
        score = i.value;
        break;
      case "rot_type":
        rot_type = i.value;
        break;
      case "link":
        link = i.value;
        break;
      case "attachment":
        if(interaction.data.resolved.attachments[i.value].content_type.substring(0,5) === "image"){
          link = interaction.data.resolved.attachments[i.value].url;
        } else {
          return new JsonResponse({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              "content": "Please only attach images",
              "flags":1000000
            }
          });
        }

        break;
    }
  }
  if(link == undefined){
    return new JsonResponse({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        "content": "Please provide an image link or an attached image",
        "flags":1000000
      }
    });
  }
  const content = "<@" + user + "> requested (" + subcommand + ") " + score + " on " + stage + " " + rot_type + " " + link;
  let real;
  let attachments=[];
  if(link.substring(0,29) === "https://discord.com/channels/"){
    const parts = link.split("/");
    const channel_id = parts[5];
    const msg_id = parts[6];
    const get_message = await fetch(`https://discord.com/api/v10/channels/${channel_id}/messages/` + msg_id, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bot ${env.DISCORD_TOKEN}`,
      }
    }).then((response)=> response.json());

    if(get_message.attachments.length == 0){
      real = 20040234;
    } else {
      link = get_message.attachments[0].url;
      attachments=get_message.attachments;
      real = 200;
    }

  } else if (link.substring(0,17) ==="https://stat.ink/"){
    const parts = link.split("/");
    const id = parts[5];
    link = `https://s3-img-gen.stats.ink/salmon/en-US/${id}.jpg`;
    const img = await fetch(link);
    real = img.status;
  } else if(link.substring(0,27)=="https://cdn.discordapp.com/"){
    real = 200;
  } else {
    const img = await fetch(link);
    real = img.status;
  }
  if(real==200){

  } else {
    return new JsonResponse({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        "content": "Please link a valid image",
        "flags":1000000
      }
    });
  }
  const components = componentMaker(subcommand,score,rot_type,stage);
  const embeds = embedMaker(link,user,subcommand,score,rot_type,stage);
  for(let i in attachments){
    if(i>0){embeds.push({"image": {
      "url": attachments[i].url
    }})}
  }
  const channel_id = env.CHANNEL_ID;

  const response = await fetch(`https://discord.com/api/v10/channels/${channel_id}/messages`,{
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bot ${env.DISCORD_TOKEN}`,
    },
    method:'POST',
    body: JSON.stringify({
      "content": content,
      "embeds": embeds,
      "components":components,
      "attachments":[]
    })
  })
  const data = await response.json()
  // console.log(data);
  if(data.id === undefined){
    // console.log(data);
    return new JsonResponse({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        "content": "Request failed.",
        "flags":1000000
      }
    });
  } else{
  return new JsonResponse({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      "content": "Request sent! https://discord.com/channels/" + interaction.guild_id + "/" + data.channel_id + "/" + data.id ,
      "flags":1000000
    }
  });}
}

// import roles from a user

async function importFromRoles(id,interaction,env){
  const guild = interaction.guild_id;
  const user = await fetch(`https://discord.com/api/v10/guilds/${guild}/members/${id}`,{
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bot ${env.DISCORD_TOKEN}`,
    },
    method:'GET'
  }).then(response => response.json());
  // console.log(user.roles);
  const client = new Client({
    user: env.PG_USER ,
    password: env.PG_PW ,
    host: env.PG_HOST ,
    port: 6543,
    database: env.PG_NAME
  });
  await client.connect();
  let query;
  let vals;
  const old = await client.query(`SELECT * from ${table} where id = ${id};`);
  let hits = 0;
  if(old.rows.length <= 0){
    query = `INSERT INTO ${table} (id,`;
    vals = `VALUES (${id},`;
    for(let i in user.roles){
      const pair = data.roleid_mapscores[user.roles[i]];
      if(pair!=undefined){
        query = query + `\`${pair[0]}\`, `;
        vals = vals + `${pair[1]}, `;
        hits +=1;
      }
    }
    query = query.replace(/,\s*$/, "");
    vals = vals.replace(/,\s*$/, "");
    query = `${query}) ${vals});`
  } else {
    // console.log(old);
    //only strictly increase event roles - if pair[1]> old.rows[0][0] or something
    query = `UPDATE ${table} set `;;
    for(let i in user.roles){
      const pair = data.roleid_mapscores[user.roles[i]];
      // console.log(pair);
      if(pair!=undefined && pair[1]>old.rows[0][pair[0]]){
        query = query + `${pair[0]}=${pair[1]}, `;
        hits +=1;
      }
    }
    query = query.replace(/,\s*$/, "");
    query = query + ` WHERE id=${id}`
  }
  if(hits<1){
    client.end();
    return new JsonResponse({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        "content": "No new score roles found.",
        "flags":1000000
      }
    });
  }
  const response = await client.query(query);
  client.end();
  // console.log(response);
  return new JsonResponse({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      "content": `Imported scores`,
      "embeds":[{
        "description":"<:bunger:886046158034710559>        "
      }],
      "flags":1000000
    }
  });
}

// starts tournament, sends message in tournament channel
async function startTourney(interaction, env) {
  // check if user has the correct permissions
  if (!interaction.member.roles.includes("1118691602819452958")) {
    return new JsonResponse({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        "content": "You do not have permissions to use this command.",
        "flags": 1000000
      }
    });
  }

  // check if there's an ongoing tournament by using the database and looking for the latest tournament
  const client = new Client({
    user: env.PG_USER,
    password: env.PG_PW,
    host: env.PG_HOST,
    port: 6543,
    database: env.PG_NAME
  });
  await client.connect();
  // database has a table called tournaments with columns id, scenario, and start_time.
  let output = await client.query(`SELECT * from tournaments ORDER BY start_time DESC LIMIT 1`);
  const date = new Date();
  if (output.rows.length > 0) {
    // check if the latest tournament has ended
    if (output.rows[0].is_active) {
      client.end();
      return new JsonResponse({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          "content": "There is already an ongoing tournament. Please wait until it ends before starting a new one.",
          "flags": 1000000
        }
      });
    }
  }
  // if there's no ongoing tournament, start a new one

  const scenario = interaction.data.options[0].value;

  // insert the new tournament into the database
  output = await client.query(`INSERT INTO tournaments (scenario, start_time) VALUES ('${scenario}', ${date.getTime()});`);
  client.end();
  // const test = env.DISCORD_APPLICATION_ID == "1173198500931043390";

  const tour_announcement_channel = "753255233056145528";

  // the date tourney_length from now with discord timestamps
  const date_end = "<t:" + Math.floor((date.getTime() + tourney_length) / 1000) + ":R>";
  const response = await fetch(`https://discord.com/api/v10/channels/${tour_announcement_channel}/messages`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bot ${env.DISCORD_TOKEN}`,
    },
    method: 'POST',
    body: JSON.stringify({
      "content": `One Shot Showdown ${output.id} has started! You'll have until ${date_end} to complete the following scenario: **${scenario}** and submit it.\n\nYou must play the scenario **ONLY ONCE**! No backing out, or intentionally disconnecting to gain an unfair advantage. If you have a disconnection, we'll be running these events very often, so don't worry, just catch the next one!\n\nPlease submit your score with the following format: </submit:1322802982596771851>; @mention all your teammates, and remember to attach proof by attaching an image of the shift from NSO. Good luck!`
    })
  });
  const data = await response.json();
  // console.log(data);
  return new JsonResponse({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      "content": "Tournament started!",
      "flags": 1000000
    }
  });
}

// stops tournament, sends the 3 fastest times in secret channel for approval

async function stopTourney(interaction, env) {
  // check if user has the correct permissions
  if (!interaction.member.roles.includes("1118691602819452958")) {
    return new JsonResponse({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        "content": "You do not have permissions to use this command.",
        "flags": 1000000
      }
    });
  }

  // check if there's an ongoing tournament by using the database and looking for the latest tournament
  const client = new Client({
    user: env.PG_USER,
    password: env.PG_PW,
    host: env.PG_HOST,
    port: 6543,
    database: env.PG_NAME
  });
  await client.connect();

  let output = await client.query(`SELECT * from tournaments ORDER BY start_time DESC LIMIT 1`);
  const tourney_id = output.rows[0].id;
  const date = new Date();
  if (output.rows.length <= 0) {
    client.end();
    return new JsonResponse({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        "content": "There is no ongoing event. Please wait until an event starts before ending it.",
        "flags": 1000000
      }
    });
  }
  if (!output.rows[0].is_active) {
    client.end();
    return new JsonResponse({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        "content": "One Shot Showdown " + tourney_id + " has already ended.",
        "flags": 1000000
      }
    });
  }

  // if (BigInt(date.getTime()) < BigInt(output.rows[0].start_time) + BigInt(tourney_length)) {
  //   client.end();
  //   const mins = tourney_length / 60000;
  //   return new JsonResponse({
  //     type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
  //     data: {
  //       "content": "One Shot Showdown " + tourney_id + "'s submission deadline has not been reached. Please wait until " + mins + " minutes have passed.",
  //       "flags": 1000000
  //     }
  //   });
  // }

  // end the tournament
  let output2 = await client.query(`UPDATE tournaments SET is_active = false WHERE id = ${tourney_id};`);

  // get the top 3 scores
  const top3 = await client.query(`SELECT * from submissions WHERE tournament_id = ${tourney_id} ORDER BY score DESC LIMIT 3;`);
  // console.log(top3.rows.length);
  for (let i = 0; i < top3.rows.length; i++) {
    const team = top3.rows[i].team_members;
    const score = top3.rows[i].score;
    const link = top3.rows[i].link;
    const id = top3.rows[i].id;
    // console.log("a");
    await client.query(`UPDATE submissions SET submission_status = 'requested' WHERE id = ${id};`);
    await handleSubmission(env, id, score, team, tourney_id, link);
  }
  client.end();
  return new JsonResponse({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      "content": "Tournament ended. The top " + top3.rows.length + " scores have been sent for approval.",
      "flags": 1000000
    }
  });
}

// checks submission for validity, adds to database

async function submitTourney(interaction, env) {
  // check if there's an ongoing tournament by using the database and looking for the latest tournament
  const client = new Client({
    user: env.PG_USER,
    password: env.PG_PW,
    host: env.PG_HOST,
    port: 6543,
    database: env.PG_NAME
  });
  await client.connect();
  // database has a table called tournaments with columns id, scenario, and start_time.
  let output = await client.query(`SELECT * from tournaments ORDER BY start_time DESC LIMIT 1`);
  const date = new Date();
  if (output.rows.length <= 0) {
    client.end();
    return new JsonResponse({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        "content": "There is no ongoing event. Please wait until an event starts before submitting a score.",
        "flags": 1000000
      }
    });
  }
  // check if the latest tournament has ended, which is tourney_length after the start time
  const start_time = output.rows[0].start_time;
  const is_active = output.rows[0].is_active;
  const tourney_id = output.rows[0].id;
  if (!is_active || date.getTime() > start_time + tourney_length) {
    client.end();
    return new JsonResponse({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        "content": "One Shot Showdown " + tourney_id + " has ended. Please wait until the next event starts before submitting a score.",
        "flags": 1000000
      }
    });
  }
  // check if the user or any teammates have already submitted a score
  const team = [interaction.member.user.id, interaction.data.options[1].value, interaction.data.options[2].value, interaction.data.options[3].value];
  let output2 = await client.query('SELECT * FROM submissions WHERE tournament_id = $1 AND team_members && $2::TEXT[];', [tourney_id, team]);
  if (output2.rows.length > 0) {
    client.end();
    return new JsonResponse({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      // need to allow some way to delete wrong submissions in the future
      data: {
        "content": "You or one of your teammates have already submitted a score for this event. For now, there is no way to submit another score - a method to delete wrong submissions will be added in the future.",
        "flags": 1000000
      }
    });
  }
  const score = interaction.data.options[0].value;
  const image = interaction.data.options[4].value;
  // only image attachment is allowed, so unsure if additional checks are needed like checking undefined
  let link;
  if (interaction.data.resolved.attachments[image].content_type.substring(0, 5) === "image") {
      link = interaction.data.resolved.attachments[image].url;
  } else {
      return new JsonResponse({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
              "content": "Please only attach images",
              "flags": 1000000
          }
      });
  }
  let real;
  if (link.substring(0, 27) == "https://cdn.discordapp.com/") {
    real = 200;
  } else {
    const img = await fetch(link);
    real = img.status;
  }
  if (real != 200) {
    return new JsonResponse({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        "content": "Please link a valid image",
        "flags": 1000000
      }
    });
  }

  // insert the new submission into the database
  // console.log(`INSERT INTO submissions (tournament_id, team_members, score, link) VALUES (${tourney_id}, '{${team[0]} ${team[1]} ${team[2]} ${team[3]}}', ${score}, '${link})';`)
  output = await client.query(`INSERT INTO submissions (tournament_id, team_members, score, link) VALUES (${tourney_id}, '{${team[0]} ${team[1]} ${team[2]} ${team[3]}}', ${score}, '${link}');`);
  client.end();

  return new JsonResponse({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
      "content": "Score submitted successfully!",
      "flags": 1000000
      }
  });
}

async function handleSubmission(env, id, score, team, tourney_id, link) {
  // const test = env.DISCORD_APPLICATION_ID == "1173198500931043390";
  const channel_id = env.TOUR_CHANNEL_ID


  const components = componentMaker("tourney", score, null, null);
  const response = await fetch(`https://discord.com/api/v10/channels/${channel_id}/messages`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bot ${env.DISCORD_TOKEN}`,
    },
    method: 'POST',
    body: JSON.stringify({
      "content": `<@${team[0].split(" ")[0]}> submitted ${score} for FSR${tourney_id} with <@${team[0].split(" ")[1]}>,<@${team[0].split(" ")[2]}>,and <@${team[0].split(" ")[3]}>.\n${link}`,
      "embeds": [
        {
          "author": {
            "name": ""
          },
          "image": {
            "url": link
          },
          "fields": [
            {
              "name": "id",
              "value": id
            },
            {
              "name": "user",
              "value": team[0].split(" ")[0]
            },
            {
              "name": "score",
              "value": score
            },
            {
              "name": "tourney id",
              "value": tourney_id
            },
            {
              "name": "team",
              "value": team[0]
            }
          ]
        }
      ],
      "components": components,
      // "attachments": []
    })
  });
  // fetch(`https://discord.com/api/v10/channels/${channel_id}/messages`,{
  //   headers: {
  //     'Content-Type': 'application/json',
  //     Authorization: `Bot ${env.DISCORD_TOKEN}`,
  //   },
  //   method:'POST',
  //   body: JSON.stringify({
  //     "content": content,
  //     "embeds": embeds,
  //     "components":components,
  //     "attachments":[]
  //   })
  // })

  const data = await response.json();
  // console.log(data);
  // console.log(data);
  return data;
}

// sends leaderboard of OSS
async function leaderboard(interaction, env) {
  const client = new Client({
    user: env.PG_USER,
    password: env.PG_PW,
    host: env.PG_HOST,
    port: 6543,
    database: env.PG_NAME
  });
  await client.connect();
  let tourney_id;
  if (Object.hasOwn(interaction.data, "options")) {
    tourney_id = interaction.data.options[0].value;
  } else {
    let output = await client.query(`SELECT * from tournaments ORDER BY start_time DESC LIMIT 1`);
    tourney_id = output.rows[0].id;
  }
  output = await client.query(`SELECT * from submissions WHERE tournament_id = ${tourney_id} ORDER BY score DESC;`);
  client.end();
  if (output.rows.length == 0) {
    return new JsonResponse({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        "content": "No submissions found for OSS " + tourney_id,
        "flags": 1000000
      }
    });
  }
  let content = "## Unofficial leaderboard for OSS " + tourney_id + "\n";
  for (let i = 0; i < output.rows.length; i++) {
    content += `${i + 1}. ${output.rows[i].score}\n`;
  }
  return new JsonResponse({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      "content": content,
      "flags": 1000000
    }
  });
}

//idk what the stuff after here is
async function verifyDiscordRequest(request, env) {
  const signature = request.headers.get('x-signature-ed25519');
  const timestamp = request.headers.get('x-signature-timestamp');
  const body = await request.text();
  const isValidRequest =
    signature &&
    timestamp &&
    verifyKey(body, signature, timestamp, env.DISCORD_PUBLIC_KEY);
  if (!isValidRequest) {
    return { isValid: false };
  }

  return { interaction: JSON.parse(body), isValid: true };
}
const server = {
  verifyDiscordRequest: verifyDiscordRequest,
  fetch: async function (request, env) {
    return router.handle(request, env);
  },

};
export default server;
