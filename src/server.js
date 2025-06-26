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
import {UPDATE_EVENT_COMMAND,DISPLAY_PROFILE_COMMAND, IMPORT_FROM_ROLES_COMMAND,REQUEST_SCORE_COMMAND,IMPORT_USER,INFO_COMMAND, OSS_COMMAND, SUBMIT_TOURNEY_COMMAND, LEADERBOARD_COMMAND, JOIN_TOURNEY_COMMAND, LEAVE_TOURNEY_COMMAND, QUEUE_STATUS_COMMAND} from './commands.js';
const data = require("./data/data.json");
const dict = data.dict;
const event_thresholds = data.event_thresholds;
const table = "users";
const tourney_length = BigInt(15*60*1000); // 15 minutes
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
  return new Response(`👋 ${env.DISCORD_APPLICATION_ID} how did you get here. play beastieball`);
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
      case SUBMIT_TOURNEY_COMMAND.name.toLowerCase():
        return submitTourney(interaction, env);
      case LEADERBOARD_COMMAND.name.toLowerCase():
        return leaderboard(interaction, env);
      case JOIN_TOURNEY_COMMAND.name.toLowerCase():
        return joinTourney(interaction, env);
      case LEAVE_TOURNEY_COMMAND.name.toLowerCase():
        return leaveTourney(interaction, env);
      case OSS_COMMAND.name.toLowerCase():
        return oss(interaction, env);
      case QUEUE_STATUS_COMMAND.name.toLowerCase():
        return queueStatus(interaction, env);
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
  const clicker = interaction.member.user.id;
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
          content: content + "\nUpdated score for <@" + user + ">. " + column + " score: " + newscore + `\nSigned by: <@${clicker}>`,
          flags:1<<12,
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
          content: content + "\ndenied"+ `\nSigned by: <@${clicker}>`,
          flags:1<<12,
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
  let score = Number(interaction.message.embeds[0].fields[2].value);
  const tourney_id = interaction.message.embeds[0].fields[3].value;
  const content = interaction.message.content;
  const tourney_channel = env.TOUR_ANNOUNCE_ID; // oss-announcements
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
      output = await client.query(`UPDATE submissions SET status = 'accepted' WHERE id = ${id};`);
      output2 = await client.query(`SELECT * FROM submissions WHERE tournament_id = ${tourney_id} ORDER BY score DESC;`);
      const requested = output2.rows.filter((row) => row.status == 'requested');

      // if there are no more requested submissions, send leaderboard
      console.log(requested.length);
      if (requested.length == 0) {
        const leaderboard = output2.rows.filter((row) => row.status == 'accepted');
        console.log(leaderboard);
        await top3_leaderboard(env, leaderboard, client, tourney_id);
        return new JsonResponse({
          type: InteractionResponseType.UPDATE_MESSAGE,
          data: {
            content: content + "\nAdded submission for " + user + ". score: " + score + "\nAnd leaderboard sent to <#" + tourney_channel + ">",
            components:[]
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
          content: content + "\nAdded submission for " + user + ". score: " + score,
          components: []
        }
      });
    case "deny":
      // delete submission
      output = await client.query(`DELETE FROM submissions WHERE id = ${id};`);
      const denyresponse = await fetch(`https://discord.com/api/v10/channels/${dmchannel.id}/messages`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bot ${env.DISCORD_TOKEN}`,
        },
        method: 'POST',
        body: JSON.stringify({
          "content": "Your OSS " + tourney_id + " submission was denied.",
          "embeds": interaction.message.embeds,
        })
      });
      const denydata = await denyresponse.json();
      // console.log(denydata);
      output2 = await client.query(`SELECT * FROM submissions WHERE tournament_id = ${tourney_id} ORDER BY score DESC;`);
      // grab the next highest score and send it for approval
      const null_submissions = output2.rows.filter((row) => row.status == null);
      if (null_submissions.length != 0) {
        row = null_submissions.rows[0];
        await client.query(`UPDATE submissions SET status = 'requested' WHERE id = ${row.id};`);
        client.end();
        await handleSubmission(env, row.id, row.score, row.team_members, row.tournament_id, row.link);
        return new JsonResponse({
          type: InteractionResponseType.UPDATE_MESSAGE,
          data: {
            content: content + "\nDeleted submission for <@" + user + ">. " + " score: " + score + "\nAnd requested next submission.",
            components: []
          }
        });
      }
      // if there are no more non-requested or accepted submissions, check if there are any requested submissions
      const requested_submissions = output2.rows.filter((row) => row.status == 'requested');
      // if there are still requested submissions, wait for them to be approved or denied
      if (requested_submissions.length != 0) {
        client.end();
        return new JsonResponse({
          type: InteractionResponseType.UPDATE_MESSAGE,
          data: {
            content: content + "\nDeleted submission for <@" + user + ">. " + " score: " + score,
            components: []
          }
        });
      }
      // if there are no more submissions, send leaderboard
      const leaderboard = output2.rows.filter((row) => row.status == 'accepted');
      if (leaderboard.length > 0) {
        await top3_leaderboard(env, leaderboard, client,tourney_id);
        client.end();
      } else { // the only submissions were denied
        client.end();
        const response = await fetch(`https://discord.com/api/v10/channels/${tourney_channel}/messages`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bot ${env.DISCORD_TOKEN}`,
          },
          method: 'POST',
          body: JSON.stringify({
            "content": `Unfortunately, **One Shot Showdown ${interaction.message.embeds[0].fields[3].value}** did not have any submissions. We'll see you in the next one!`
          })
        });
        // const data = await response.json();
        // console.log(data);
        return new JsonResponse({
          type: InteractionResponseType.UPDATE_MESSAGE,
          data: {
            content: content + "\nDeleted submission for <@" + user + ">. " + " score: " + score + "\nNo submissions were valid.",
            components: []
          }
        });
      }
      return new JsonResponse({
        type: InteractionResponseType.UPDATE_MESSAGE,
        data: {
          content: content + "\nDeleted submission for <@" + user + ">. " + " score: " + score + "\nAnd leaderboard sent to <#" + tourney_channel + ">",
          components: []
        }
      });
  }
  score = Number(interaction.message.embeds[0].fields[2].value);
  if (interaction.data.custom_id.toLowerCase().includes('sub')) {
    score -= Number(interaction.data.custom_id.split(' ')[1]);
    output = await client.query(`UPDATE submissions SET score = ${score} WHERE id = ${id};`);
    interaction.message.embeds[0].fields[2].value = score;
    return new JsonResponse({
      type: InteractionResponseType.UPDATE_MESSAGE,
      data: {
        content: content + "\nUpdated score: " + score,
        embeds: interaction.message.embeds
      }
    });
  } else if (interaction.data.custom_id.toLowerCase().includes('add')) {
    score += Number(interaction.data.custom_id.split(' ')[1]);
    output = await client.query(`UPDATE submissions SET score = ${score} WHERE id = ${id};`);
    interaction.message.embeds[0].fields[2].value = score;
    return new JsonResponse({
      type: InteractionResponseType.UPDATE_MESSAGE,
      data: {
        content: content + "\nUpdated score: " + score,
        embeds: interaction.message.embeds
      }
    });
  }
}
// leaderboard helper function
async function top3_leaderboard(env, leaderboard, client, tourney_id) {
  let leaderboardstring = '';
  const place = ['🥇 1st', '🥈 2nd', '🥉 3rd'];
  const oss_cols = ['oss_1st', 'oss_2nd', 'oss_3rd'];
  let prevScore = 0;
  let i = 0;
  let p = 0; // place index
  while (i < leaderboard.length) {
    let members = leaderboard[i].team_members.map((member) => "<@" + member + ">").join(", ");

    let score = Number(leaderboard[i].score);
    if (score !== prevScore) {
      if (i > 2) {
        break; // at least 3 scores have already been added and no more ties
      }
      p = i;
      prevScore = score;
      leaderboardstring += `\n${place[p]}\n<:OFS4a_goldenegg:737492285998104688> x **${score}**\nTeam Members: ${members}\n`
    } else {
      // if the score is the same as the 3rd place score, add it to the leaderboard even if there are already 3 teams
      leaderboardstring += `<:OFS4a_goldenegg:737492285998104688> x **${score}**\nTeam Members: ${members}\n`;
    }
    for (let j in leaderboard[i].team_members) {
      // console.log(`UPDATE users SET ${oss_cols[i]} = ${oss_cols[i]} + 1 WHERE id = ${j}`);
      let output3 = await client.query(`UPDATE users SET ${oss_cols[p]} = ${oss_cols[p]} + 1 WHERE id = ${leaderboard[i].team_members[j]}`);
      // hope this isn't as jank as it feels
      try{let output4 = await client.query(`INSERT INTO users (id,${oss_cols[i]}) VALUES (${leaderboard[i].team_members[j]},1);`)}
      catch(error){

      }
    }
    i++;
  }
  leaderboardstring = `## Top ${i} for One Shot Showdown ${tourney_id}${leaderboardstring}`;
  const tourney_channel = env.TOUR_ANNOUNCE_ID; // oss-announcements
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
      map_event_field = data.mapfields.s3
      break;
    case REQUEST_SCORE_COMMAND.options[1].name.toLowerCase(): //s2
      map_event_field = data.mapfields.s2
      break;
    case REQUEST_SCORE_COMMAND.options[2].name.toLowerCase(): //bigrun
      map_event_field = data.mapfields.bigrun
      break;
    case REQUEST_SCORE_COMMAND.options[3].name.toLowerCase(): //eggstra
      map_event_field = data.mapfields.eggstra
      break;
  }
  return map_event_field;
}

function componentMaker(subcommand,score,rot_type,stage){
  const approverow = data.componentrows.approverow;
  const scorerow = data.componentrows.scorerow;
  if (subcommand == "tourney") {
    return ([approverow, scorerow]);
  }
  const subcommandrow = data.componentrows.subcommandrow;
  const stagerow = mapField(subcommand.toLowerCase());
  const rotationrow = data.componentrows.rotationrow;

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
    const old = await client.query(`SELECT ${column} from ${table} where id = ${user};`);
    if(old.rows.length <= 0){
      old_score = 0;
      await client.query(`INSERT INTO ${table} (id,${column}) VALUES (${user},${score});`);
    } else {
      try{
        await client.query(`UPDATE ${table} set ${column} = ${score} where id = ${user};`);
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
  if (!interaction.member.roles.includes("1164999939730972773") && !interaction.member.roles.includes("737371594686595182")){
    return new JsonResponse({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        "content": "You do not have permissions to use this command.",
        "flags": 1000000
      }
    });
  }
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
  if(link.substring(0,29) === "https://discord.com/channels/" || link.substring(0,33) === "https://ptb.discord.com/channels/" || link.substring(0,36) === "https://canary.discord.com/channels/"  ){
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
  } else if (link.substring(0, 27) == "https://cdn.discordapp.com/") {
    real = 200;
  } else if  (link.substring(0, 29) == "https://media.discordapp.net/") {
    real = 200;
  } else {
    const img = await fetch(link);
    real = img.status;
  }
  if (real != 200) {
    console.log(`broken link: ${link}; ${real}`);
    return new JsonResponse({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        "content": "Please link a valid image",
        "flags": 1000000
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
  if (interaction.member.user.id!=id && !interaction.member.roles.includes("1164999939730972773") && !interaction.member.roles.includes("737371594686595182")){
    return new JsonResponse({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        "content": "You do not have permissions to use this command.",
        "flags": 1000000
      }
    });
  }
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
  // console.log("?");
  const old = await client.query(`SELECT * from ${table} where id = ${id};`);
  // console.log(old);
  let hits = 0;
  if(old.rows.length <= 0){
    query = `INSERT INTO ${table} (id,`;
    vals = `VALUES (${id},`;
    for(let i in user.roles){
      const pair = data.roleid_mapscores[user.roles[i]];
      if(pair!=undefined){
        query = query + `${pair[0]}, `;
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
  // console.log(query);
  const response = await client.query(query);
  // console.log(response);
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

// handles all OSS TO commands
async function oss(interaction,env){
  // TO role id: 1330632415181279303
  if (!interaction.member.roles.includes("1330632415181279303")) {
    return new JsonResponse({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        "content": "You do not have permission to use this command.",
        "flags": 1000000
      }
    });
  }
  const subcommand = interaction.data.options[0].name.toLowerCase();
  switch(subcommand){
    case 'start':
      return startTourney(interaction,env);
    case 'check':
      return checkTourney(interaction,env);
    case 'stop':
      return stopTourney(interaction,env);
    case 'extend':
      return extendTour(interaction,env);
    case 'delete':
      return deleteSubmission(interaction,env);
    case 'cancel':
      return cancelTourney(interaction,env);
  }
}

// scenario code checker
function checkCode(scenario){
  scenario = scenario.toUpperCase();
  const validDashedFormat = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
  const validUndashedFormat = /^[A-Z0-9]{16}$/;
  if (validUndashedFormat.test(scenario)) {
    scenario = scenario.match(/.{4}/g).join("-");
  } else if (!validDashedFormat.test(scenario)) {
    return false;
  }
  return scenario;
}

// starts tournament, sends message in tournament channel
async function startTourney(interaction, env) {
  const client = new Client({
    user: env.PG_USER,
    password: env.PG_PW,
    host: env.PG_HOST,
    port: 6543,
    database: env.PG_NAME
  });
  await client.connect();
  // database has a table called tournaments with columns id, scenario, start_time, and status.
  let output = await client.query(`SELECT * from tournaments ORDER BY start_time DESC LIMIT 1`);
  if (output.rows.length <= 0) {
    client.end();
    return new JsonResponse({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        "content": "Error: no tournament found in database.",
        "flags": 1000000
      }
    });
  }
  let output2;
  const tour_announcement_channel = env.TOUR_ANNOUNCE_ID; // oss-announcements
  // const test = env.DISCORD_APPLICATION_ID == "1173198500931043390";

  const date = new Date();
  if (output.rows[0].status != 'awaiting' && interaction.data.options[0].options.length > 0) {
    return new JsonResponse({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        "content": msg1 + '\n' + "Only provide scenario code when tournament is about to begin. If you want to start a new tournament or end the queueing phase, please rerun this command with only /start.",
        "flags": 1000000
      }
    });
  } else if (output.rows[0].status == 'awaiting' && interaction.data.options[0].options.length == 0) {
    return new JsonResponse({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        "content": "Please provide the scenario code for the tournament.",
        "flags": 1000000
      }
    });
  }
  switch (output.rows[0].status) {
    case 'ended':
      // if the latest tournament has ended, start a new one
      output2 = await client.query(`INSERT INTO tournaments (status) VALUES ($1) RETURNING id;`, ['queueing']);
      // send message to tournament channel
      const response = await fetch(`https://discord.com/api/v10/channels/${tour_announcement_channel}/messages`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bot ${env.DISCORD_TOKEN}`,
        },
        method: 'POST',
        body: JSON.stringify({
          "content": `**One Shot Showdown ${output2.rows[0].id}**${data.oss_messages.queueing}`
        })
      });
      // const data = await response.json();
      // console.log(data);
      client.end();
      return new JsonResponse({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          "content": "Tournament queueing started!",
          "flags": 1000000
        }
      });
    case 'queueing':
      // if the latest tournament is queueing, advance to awaiting
      let output3 = await client.query(`SELECT user_group FROM queue WHERE tournament_id = ${output.rows[0].id} ORDER BY id ASC ;`);
      const rows = output3.rows;
      let team_message = "";
      try {
        team_message = queueAssignment(rows);
      } catch (error) {
        console.error(error);
        return new JsonResponse({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            "content": "Error: something went wrong with queue assignment.",
            "flags": 1000000
          }
        });
      }
      // send message to tournament channel
      output2 = await client.query(`UPDATE tournaments SET status = 'awaiting' WHERE id = ${output.rows[0].id};`);
      const response2 = await fetch(`https://discord.com/api/v10/channels/${tour_announcement_channel}/messages`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bot ${env.DISCORD_TOKEN}`,
        },
        method: 'POST',
        body: JSON.stringify({
          "content": `**One Shot Showdown ${output.rows[0].id}** will be starting in a few minutes! Queueing has ended; ${team_message}${data.oss_messages.awaiting}`
        })
      });
      const response2b = await fetch(`https://discord.com/api/v10/channels/${tour_announcement_channel}/messages`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bot ${env.DISCORD_TOKEN}`,
        },
        method: 'POST',
        body: JSON.stringify({
          "content": `_ _`
        })
      });
      // const data2 = await response2.json();
      // console.log(data2);
      client.end();
      return new JsonResponse({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          "content": "Tournament queueing ended and teams assigned. Awaiting scenario code.",
          "flags": 1000000
        }
      });
    case 'awaiting':
      // if the latest tournament is awaiting, start the tournament
      // check if the scenario is in the correct format
      let scenario = checkCode(interaction.data.options[0].options[0].value);
      if (!scenario) {
        return new JsonResponse({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            "content": "Invalid scenario format. Please use the format XXXX-XXXX-XXXX-XXXX or XXXXXXXXXXXXXXXXXX.",
            "flags": 1000000
          }
        });
      }

      // if there's no ongoing tournament, start a new one
      // insert the new tournament into the database
      try {
        output2 = await client.query(`UPDATE tournaments SET scenario = $1, start_time = $2, status = $3 WHERE id = ${output.rows[0].id};`, [scenario, date, 'ongoing']);
      } catch (error) {
        // will error if the scenario has been used before
        console.error(error);
        return new JsonResponse({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            "content": "The scenario has been used before in a previous tournament. Please use a different scenario. In the future, you can check the validity of the scenario beforehand with /oss check.",
            "flags": 1000000
          }
        });
      }
      // the date tourney_length from now with discord timestamps
      const date_end = "<t:" + (BigInt(date.getTime()) + tourney_length) / BigInt(1000) + ":R>";
      const response3 = await fetch(`https://discord.com/api/v10/channels/${tour_announcement_channel}/messages`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bot ${env.DISCORD_TOKEN}`,
        },
        method: 'POST',
        body: JSON.stringify({
          "content": `**\u00a0\nOne Shot Showdown ${output.rows[0].id}** has started! You'll have until ${date_end} to complete the following scenario: **${scenario}** and submit it.${data.oss_messages.start}`
        })
      });
      // const data = await response3.json();
      // console.log(data);
      client.end();
      return new JsonResponse({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          "content": "Tournament started!",
          "flags": 1000000
        }
      });
    case 'ongoing':
      return new JsonResponse({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          "content": "There is already an ongoing tournament. Please wait until it ends before starting a new one.",
          "flags": 1000000
        }
      });
      
  }
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// handles assignment of teams from the queue, returns a message with the team assignments
function queueAssignment(rows) {
  const teams = [];
  let configs = [];
  const unique_configs = new Set();
  // each row in the config array is a different config with: excess, # of 3-1 groups, # of 2-2 groups, # of 2-1-1 groups, # of 1-1-1-1 groups
  let triplets = [];
  let pairs = [];
  let singles = [];
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].user_group.length == 3) {
      triplets.push(rows[i].user_group);
    } else if (rows[i].user_group.length == 2) {
      pairs.push(rows[i].user_group);
    } else {
      singles.push(rows[i].user_group);
    }
  }
  
  // first config: group trios to singles, group pairs, group pairs to singles, group singles
  let num_trips = Math.min(triplets.length, singles.length);
  let trips_excess = 0;
  let single_ind = num_trips;
  let config = {excess: 0, trips: num_trips, pairs: 0, pair_singles: 0, singles: 0};
  if (triplets.length > singles.length) {
    config.excess = 3 * (triplets.length - singles.length);
    trips_excess = config.excess;
  }
  config.pairs = Math.floor(pairs.length / 2);
  if (pairs.length % 2 == 1) {
    if (singles.length - single_ind > 1) {
      config.pair_singles = 1;
      single_ind += 2;
    } else {
      config.excess += 2;
    }
  }
  config.singles = Math.floor((singles.length - single_ind) / 4);
  config.excess += (singles.length - single_ind) % 4;
  unique_configs.add(`${config.trips}_${config.pairs}_${config.pair_singles}_${config.singles}`);
  configs.push(config);
  // second config: group trios to singles, group pairs, group singles
  // only needs to be done if there are nonzero pair_singles
  if (config.pair_singles > 0) {
    config = {excess: trips_excess, trips: num_trips, pairs: 0, pair_singles: 0, singles: 0};
    config.pairs = Math.floor(pairs.length / 2);
    if (pairs.length % 2 == 1) {
      config.excess += 2;
    }
    config.singles = Math.floor((singles.length - num_trips) / 4);
    config.excess += (singles.length - num_trips) % 4;
    unique_configs.add(`${config.trips}_${config.pairs}_${config.pair_singles}_${config.singles}`);
    configs.push(config);
  }
  // third config: group trios to singles, group pairs except for x = 2 pairs, group pairs to singles, group singles. repeat, incrementing x by 2, until no more teams made of 2 pairs
  let x = 2;
  // doesn't need to be done if there are 0 pairs
  if (pairs.length != 0) {
    while (true) {
      single_ind = num_trips;
      config = {excess: trips_excess, trips: num_trips, pairs: 0, pair_singles: 0, singles: 0};
      config.pairs = Math.floor((pairs.length - x) / 2);
      if (config.pairs < 0) {
        config.pairs = 0;
      }
      let pairs_left = pairs.length - config.pairs * 2;
      while (pairs_left > 0 && singles.length - single_ind > 1) {
        config.pair_singles += 1;
        single_ind += 2;
        pairs_left -= 1;
      }
      config.excess += pairs_left * 2;
      config.singles = Math.floor((singles.length - single_ind) / 4);
      config.excess += (singles.length - single_ind) % 4;
      x += 2;
      const key = `${config.trips}_${config.pairs}_${config.pair_singles}_${config.singles}`;
      if (!unique_configs.has(key)) {
        unique_configs.add(key);
        configs.push(config);
      }
      if (config.pairs == 0) {
        break;
      }
    }
  }
  // fourth through sixth configs are unnecessary if there are no triplet teams, or if there is already at least one triplet team in excess
  if (num_trips != 0 && num_trips == triplets.length) {
    // fourth config: group trios to singles except for one, group pairs, group pairs to singles, group singles
    num_trips -= 1;
    single_ind = num_trips;
    config = {excess: 3, trips: num_trips, pairs: 0, pair_singles: 0, singles: 0};
    config.pairs = Math.floor(pairs.length / 2);
    if (pairs.length % 2 == 1) {
      if (singles.length - single_ind > 1) {
        config.pair_singles = 1;
        single_ind += 2;
      } else {
        config.excess += 2;
      }
    }
    config.singles = Math.floor((singles.length - single_ind) / 4);
    config.excess += (singles.length - single_ind) % 4;
    unique_configs.add(`${config.trips}_${config.pairs}_${config.pair_singles}_${config.singles}`);
    configs.push(config);
    // fifth config: group trios to singles except for one, group pairs, group singles
    if (config.pair_singles > 0) {
      config = {excess: 3, trips: num_trips, pairs: 0, pair_singles: 0, singles: 0};
      config.pairs = Math.floor(pairs.length / 2);
      if (pairs.length % 2 == 1) {
        config.excess += 2;
      }
      config.singles = Math.floor((singles.length - num_trips) / 4);
      config.excess += (singles.length - num_trips) % 4;
      unique_configs.add(`${config.trips}_${config.pairs}_${config.pair_singles}_${config.singles}`);
      configs.push(config);
    }
    // sixth config: group trios to singles except for one, group pairs except for x = 2 pairs, group pairs to singles, group singles. repeat, incrementing x by 2, until no more teams made of 2 pairs
    x = 2;
    if (pairs.length != 0) {
      while (true) {
        single_ind = num_trips;
        config = {excess: 3, trips: num_trips, pairs: 0, pair_singles: 0, singles: 0};
        config.pairs = Math.floor((pairs.length - x) / 2);
        if (config.pairs < 0) {
          config.pairs = 0;
        }
        let pairs_left = pairs.length - config.pairs * 2;
        while (pairs_left > 0 && singles.length - single_ind > 1) {
          config.pair_singles += 1;
          single_ind += 2;
          pairs_left -= 1;
        }
        config.excess += pairs_left * 2;
        config.singles = Math.floor((singles.length - single_ind) / 4);
        config.excess += (singles.length - single_ind) % 4;
        const key = `${config.trips}_${config.pairs}_${config.pair_singles}_${config.singles}`;
        if (!unique_configs.has(key)) {
          unique_configs.add(key);
          configs.push(config);
        }
        if (config.pairs == 0) {
          break;
        }
        x += 2;
      }
    }
  }
  // determine min excess
  let min_excess = configs[0].excess;
  for (let i = 1; i < configs.length; i++) {
    if (configs[i].excess < min_excess) {
      min_excess = configs[i].excess;
    }
  }
  configs = configs.filter((c) => c.excess == min_excess);

  // choose one of the remaining configs at random
  const config_f = configs[Math.floor(Math.random() * configs.length)];
  // using number of each group, determine which groups are a part of the excess, and separate them
  let triplets_excess = triplets.slice(config_f.trips);
  let pairs_excess = pairs.slice(config_f.pairs * 2 + config_f.pair_singles);
  let singles_excess = singles.slice(config_f.singles * 4 + config_f.pair_singles * 2 + config_f.trips);
  let total_excess = triplets_excess.length * 3 + pairs_excess.length * 2 + singles_excess.length;
  triplets = triplets.slice(0, config_f.trips);
  pairs = pairs.slice(0, config_f.pairs * 2 + config_f.pair_singles);
  singles = singles.slice(0, config_f.singles * 4 + config_f.pair_singles * 2 + config_f.trips);
  // assign teams based on the chosen config
  triplets = shuffle(triplets);
  pairs = shuffle(pairs);
  singles = shuffle(singles);
  for (let i = 0; i < config_f.trips; i++) {
    teams.push([...triplets.pop(), ...singles.pop()]);
  }
  for (let i = 0; i < config_f.pairs; i++) {
    teams.push([...pairs.pop(), ...pairs.pop()]);
  }
  for (let i = 0; i < config_f.pair_singles; i++) {
    teams.push([...pairs.pop(), ...singles.pop(), ...singles.pop()]);
  }
  for (let i = 0; i < config_f.singles; i++) {
    teams.push([...singles.pop(), ...singles.pop(), ...singles.pop(), ...singles.pop()]);
  }

  // write team assignment message
  let team_message = 'no players queued.\n';
  if (teams.length > 0) {
    team_message = "here are your **team assignments**:\n";
    let captain_message = `**${teams.length == 1 ? "Captain" : "Captains"}:**\n`;
    for (let i = 0; i < teams.length; i++) {
      team_message += `- ${teams[i].map((member) => "<@" + member + ">").join(", ")}\n`;
      captain_message += `<@${teams[i][0]}>, `;
    }
    team_message += captain_message.substring(0, captain_message.length - 2) + data.oss_messages.captain;
  }
  // if there are any remaining players, add them as subs
  // cases: 1-3 singles, 1 pair 1 single, 1 triplet, multiple triplets, 1 pair and any # of triplets
  if (total_excess > 0 && teams.length == 0) {
    team_message = "a full team could not be created.\n";
  }
  if (total_excess > 4) {
    // if there are more than 4 players in the remainder, suggest in the message that they can form their own team
    // singles can't exist in any case where there would be more than 4 players in the remainder
    team_message += `\n**Remaining players:**\n`;
    for (let i = 0; i < triplets_excess.length; i++) {
      team_message += `- ${triplets_excess[i].map((member) => "<@" + member + ">").join(", ")}\n`;
    }
    if (pairs_excess.length == 1) {
      team_message += `- ${pairs_excess[0].map((member) => "<@" + member + ">").join(", ")}\n`;
    }
    team_message += 'The groups worked out to be uneven. If you would like to form your own team between your groups, please do so. You may act as subs for another team as well.\n';
  } else if (total_excess > 1) {
    // 2-3 remaining players (so they could theoretically play together just by themselves if they wanted to)
    team_message += `\n**Remaining players:**\n`;
    if (triplets_excess.length == 1) {
      team_message += `- ${triplets_excess[0].map((member) => "<@" + member + ">").join(", ")}\n`;
    }
    if (pairs_excess.length == 1) {
      team_message += `- ${pairs_excess[0].map((member) => "<@" + member + ">").join(", ")}\n`;
    }
    for (let i = 0; i < singles_excess.length; i++) {
      team_message += `- <@${singles_excess[i][0]}>\n`;
    }
    team_message += 'You may act as subs for another team, or you may also participate with less than 4 people, if you\'d like.\n';          
  } else if (total_excess == 1) {
    // 1 remaining player
    team_message += `\n**Remaining player:**\n- <@${singles_excess[0][0]}>\n`;
    team_message += 'You may act as a sub for another team.\n';
  }
  
  return team_message;
}

// only check if scenario has been used before
async function checkTourney(interaction, env) {
  let client = new Client({
    user: env.PG_USER,
    password: env.PG_PW,
    host: env.PG_HOST,
    port: 6543,
    database: env.PG_NAME
  });
  await client.connect();
  const scenario = checkCode(interaction.data.options[0].options[0].value);
  if (!scenario) {
    client.end();
    return new JsonResponse({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        "content": "Invalid scenario format. Please use the format XXXX-XXXX-XXXX-XXXX or XXXXXXXXXXXXXXXXXX.",
        "flags": 1000000
      }
    });
  }
  let output = await client.query(`SELECT 1 from tournaments WHERE scenario = $1;`, [scenario]);
  client.end();
  if (output.rows.length > 0) {
    return new JsonResponse({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        "content": "Scenario already used before in OSS " + output.rows[0].id + ".",
        "flags": 1000000
      }
    });
  } else {
    return new JsonResponse({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        "content": "Scenario is valid.",
        "flags": 1000000
      }
    });
  }
}

// stops tournament, sends the 3 fastest times in secret channel for approval

async function stopTourney(interaction, env) {
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
        "content": "Error: no tournament found in database.",
        "flags": 1000000
      }
    });
  }
  if (output.rows[0].status != 'ongoing') {
    client.end();
    return new JsonResponse({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        "content": "There is no ongoing tournament.",
        "flags": 1000000
      }
    });
  }
  if (BigInt(date - output.rows[0].start_time) < tourney_length) {
    client.end();
    const mins = tourney_length / 60000n;
    return new JsonResponse({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        "content": "One Shot Showdown " + tourney_id + "'s submission deadline has not been reached. Please wait until " + mins + " minutes have passed.",
        "flags": 1000000
      }
    });
  }

  // end the tournament

  // get the top 3 scores
  const top3 = await client.query(`SELECT * from submissions WHERE tournament_id = ${tourney_id} ORDER BY score DESC;`);
  // console.log(top3.rows.length);
  let output2 = await client.query(`UPDATE tournaments SET status = 'ended' WHERE id = ${tourney_id};`);
  if (top3.rows.length == 0) {
    client.end();
    const tourney_channel = env.TOUR_ANNOUNCE_ID; // oss-announcements
    const response = await fetch(`https://discord.com/api/v10/channels/${tourney_channel}/messages`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bot ${env.DISCORD_TOKEN}`,
      },
      method: 'POST',
      body: JSON.stringify({
        "content": `Unfortunately, **One Shot Showdown ${tourney_id}** did not have any submissions. We'll see you in the next one!`
      })
    });
    return new JsonResponse({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        "content": "No submissions have been made for One Shot Showdown " + tourney_id + ".",
        "flags": 1000000
      }
    });
  }
  let min_score = 0;
  if (top3.rows.length > 2) {
    min_score = top3.rows[2].score;
  }
  let num_sent = 0;
  for (let i = 0; i < top3.rows.length; i++) {
    if (i > 2 && top3.rows[i].score < min_score) {
      break;
    }
    const team = top3.rows[i].team_members;
    const score = top3.rows[i].score;
    const link = top3.rows[i].link;
    const id = top3.rows[i].id;
    // console.log("a");
    await client.query(`UPDATE submissions SET status = 'requested' WHERE id = ${id};`);
    await handleSubmission(env, id, score, team, tourney_id, link);
    num_sent++;
  }

  client.end();
  return new JsonResponse({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      "content": "Tournament ended. The top " + num_sent + " scores have been sent for approval.",
      "flags": 1000000
    }
  });
}

async function extendTour(interaction,env){
  const mins = BigInt(interaction.data.options[0].options[0].value);
  const client = new Client({
    user: env.PG_USER,
    password: env.PG_PW,
    host: env.PG_HOST,
    port: 6543,
    database: env.PG_NAME
  });
  await client.connect();
  let output = await client.query(`SELECT * from tournaments ORDER BY start_time DESC LIMIT 1`);
  if (output.rows.length <= 0) {
    client.end();
    return new JsonResponse({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        "content": "Error: no tournament found in database.",
        "flags": 1000000
      }
    });
  }
  if (output.rows[0].status != 'ongoing') {
    client.end();
    return new JsonResponse({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        "content": "There is no ongoing tournament.",
        "flags": 1000000
      }
    });
  }
  const tourney_id = output.rows[0].id;
  const date = output.rows[0].start_time;
  date.setMinutes(date.getMinutes() + Number(mins));
  const date_end = `<t:${(BigInt(date.getTime()) + tourney_length)/1000n}:R>`
  try {
    const output2 = await client.query(`UPDATE tournaments SET start_time = $1 WHERE id = ${tourney_id}`,[date])
  } catch(e) {
    client.end();
    console.error(e);
    // console.log(`UPDATE tournaments SET start_time = $1 WHERE id = ${tourney_id}`)
    return new JsonResponse({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        "content": "Failed to extend tournament.",
        "flags": 1000000
      }
    });
  }
  const response = await fetch(`https://discord.com/api/v10/channels/${env.TOUR_ANNOUNCE_ID}/messages`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bot ${env.DISCORD_TOKEN}`,
    },
    method: 'POST',
    body: JSON.stringify({
      "content": `**One Shot Showdown ${output.rows[0].id}**has been extended by ${mins} ${(mins ==1)? "minute":"minutes"}. It will instead end ${date_end}. <@&1330632674477473883>`
    })
  });
  return new JsonResponse({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      "content": `Successfully extended tournament by ${mins} ${(mins ==1)? "minute":"minutes"}. The tournament will instead end ${date_end}.`,
      "flags": 1000000
    }
  });

}

async function deleteSubmission(interaction, env) {
  let teammate_id = interaction.data.options[0].options[0].value;
  const client = new Client({
    user: env.PG_USER,
    password: env.PG_PW,
    host: env.PG_HOST,
    port: 6543,
    database: env.PG_NAME
  });
  client.connect();
  const output = await client.query(`SELECT * from tournaments ORDER BY start_time DESC LIMIT 1`);
  if (output.rows.length <= 0) {
    client.end();
    return new JsonResponse({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        "content": "Error: no tournament found in database.",
        "flags": 1000000
      }
    });
  }

  if (output.rows[0].status != 'ongoing') {
    client.end();
    return new JsonResponse({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        "content": "Submissions can only be deleted during an ongoing tournament.",
        "flags": 1000000
      }
    });
  }

  const tourney_id = output.rows[0].id;
  // console.log(`DELETE FROM submissions WHERE tournament_id = ${tourney_id} AND ${teammate_id.toString()} = ANY(team_members) RETURNING *;`);
  const output2 = await client.query(`DELETE FROM submissions WHERE tournament_id = ${tourney_id} AND '${teammate_id.toString()}' = ANY(team_members) RETURNING *;`);
  if (output2.rows.length <= 0) {
    client.end();
    return new JsonResponse({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        "content": "No submission found for <@" + teammate_id + ">.",
        "flags": 1000000
      }
    });
  }
  const submission = output2.rows[0];
  const response = await fetch(`https://discord.com/api/v10/users/@me/channels`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bot ${env.DISCORD_TOKEN}`,
    },
    method: 'POST',
    body: JSON.stringify({
      "recipient_id": submission.team_members[0]
    })
  });
  const dmchannel = await response.json();
  const delete_response = await fetch(`https://discord.com/api/v10/channels/${dmchannel.id}/messages`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bot ${env.DISCORD_TOKEN}`,
    },
    method: 'POST',
    body: JSON.stringify({
      "content": `Your OSS ${tourney_id} submission has been deleted.`,
      // "embeds": interaction.message.embeds,
    })
  });
  const delete_data = await delete_response.json();
  // console.log(delete_data);
  // const content = interaction.message.content;
  client.end();
  await handleSubmission(env, submission.team_members[0], submission.score, submission.team_members, tourney_id, submission.link,interaction.member.user.id)
  return new JsonResponse({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      "content": "Deleted submission for <@" + teammate_id + ">. Message sent to original submitter <@" + submission.team_members[0] + ">.",
      "flags": 1000000
    }
  });
}

// cancels tourney and reverts the tourney id

async function cancelTourney(interaction, env) {
  const client = new Client({
    user: env.PG_USER,
    password: env.PG_PW,
    host: env.PG_HOST,
    port: 6543,
    database: env.PG_NAME
  });
  await client.connect();
  let output = await client.query(`SELECT * from tournaments ORDER BY start_time DESC LIMIT 1`);
  if (output.rows.length <= 0) {
    client.end();
    return new JsonResponse({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        "content": "Error: no tournament found in database.",
        "flags": 1000000
      }
    });
  }
  if (output.rows[0].status == 'ended') {
    client.end();
    return new JsonResponse({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        "content": "There is no tournament to cancel.",
        "flags": 1000000
      }
    });
  }
  const tourney_id = output.rows[0].id;
  // remove all submissions for the tournament
  await client.query(`DELETE FROM submissions WHERE tournament_id = ${tourney_id};`);
  // remove all queue entries for the tournament
  await client.query(`DELETE FROM queue WHERE tournament_id = ${tourney_id};`);
  // remove the tournament from the database and revert the tourney id
  await client.query(`DELETE FROM tournaments WHERE id = ${tourney_id};`);
  await client.query(`SELECT setval('tournaments_id_seq', ${tourney_id} - 1);`);
  return new JsonResponse({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      "content": "Tournament canceled. Please send a relevant message to the announcements channel explaining why it was canceled.",
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
  const is_active = output.rows[0].status == 'ongoing';
  const tourney_id = output.rows[0].id;
  if (!is_active || BigInt(date - start_time) > tourney_length) {
    client.end();
    return new JsonResponse({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        "content": "One Shot Showdown " + tourney_id + " has ended. Please wait until the next event starts before submitting a score.",
        "flags": 1000000
      }
    });
  }
  // team has 2-4 members
  let team = [interaction.member.user.id, interaction.data.options[2].value];
  if (interaction.data.options.length > 3) {
    team.push(interaction.data.options[3].value);
  }
  if (interaction.data.options.length > 4) {
    team.push(interaction.data.options[4].value);
  }
  console.log(team.length);
  //check if any teammates are duplicates
  const teamset = new Set(team);
  console.log(teamset.size);
  if(!(teamset.size === team.length)){
    client.end();
    return new JsonResponse({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        "content": "Your team has non-unique members. Make sure you aren't @'ing yourself, and only your teammates.",
        "flags": 1000000
      }
    });
  }

  // check if the user or any teammates have already submitted a score
  const team_members = team.join('\', \'') //formatting for sql query
  let output2 = await client.query(`SELECT * FROM submissions WHERE tournament_id = ${tourney_id} AND team_members && ARRAY['${team_members}'];`);
  if (output2.rows.length > 0) {
    client.end();
    return new JsonResponse({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        "content": "You or one of your teammates have already submitted a score for this event. If you believe this is an error, please ping the OSS Organizer for help.",
        "flags": 1000000
      }
    });
  }
  const score = interaction.data.options[0].value;
  const image = interaction.data.options[1].value;
  
  // only image attachment is allowed, so unsure if additional checks are needed like checking undefined
  let link;
  if (interaction.data.resolved.attachments[image].content_type && interaction.data.resolved.attachments[image].content_type.substring(0, 5) === "image") {
      link = interaction.data.resolved.attachments[image].url;
  } else {
      return new JsonResponse({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
              "content": "Please only attach images.",
              "flags": 1000000
          }
      });
  }
  let real;
  if (link.substring(0, 27) == "https://cdn.discordapp.com/") {
    real = 200;
  } else if  (link.substring(0, 29) == "https://media.discordapp.net/") {
    real = 200;
  } else {
    const img = await fetch(link);
    real = img.status;
  }
  if (real != 200) {
    console.log(`broken link: ${link}`);
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
  output = await client.query(`INSERT INTO submissions (tournament_id, team_members, score, link) VALUES (${tourney_id}, ARRAY['${team_members}'], ${score}, '${link}');`);
  client.end();

  return new JsonResponse({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
      "content": "Score submitted successfully!",
      "flags": 1000000
      }
  });
}

// handles joining the queue for a tournament, user can join solo or with up to 2 teammates
async function joinTourney(interaction, env) {
  const client = new Client({
    user: env.PG_USER,
    password: env.PG_PW,
    host: env.PG_HOST,
    port: 6543,
    database: env.PG_NAME
  });
  await client.connect();
  let output = await client.query(`SELECT * from tournaments ORDER BY start_time DESC LIMIT 1`);
  if (output.rows.length <= 0) {
    client.end();
    return new JsonResponse({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        "content": "Error: no tournament found in database.",
        "flags": 1000000
      }
    });
  }
  if (output.rows[0].status != 'queueing') {
    client.end();
    return new JsonResponse({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        "content": "There is no tournament with a joinable queue.",
        "flags": 1000000
      }
    });
  }
  const tourney_id = output.rows[0].id;
  const user = interaction.member.user.id;
  const teammate1 = Object.hasOwn(interaction.data, "options") ? interaction.data.options[0].value : null;
  const teammate2 = Object.hasOwn(interaction.data, "options") && interaction.data.options.length > 1 ? interaction.data.options[1].value : null;
  const group = [user, teammate1, teammate2].filter((member) => member != null);
  const groupset = new Set(group);
  if (groupset.size != group.length) {
    client.end();
    return new JsonResponse({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        "content": "You have duplicate teammates. Make sure you aren't @'ing yourself, and only your teammate(s).",
        "flags": 1000000
      }
    });
  }
  const group_members = group.join('\', \'') //formatting for sql query
  // gets all users who are in the queue for the same tournament and have any of the same teammates
  const output2 = await client.query(`SELECT array_agg(DISTINCT u) AS conflicting
    FROM ( 
      SELECT unnest(user_group) AS u
      FROM queue
      WHERE tournament_id = ${tourney_id}
      AND user_group && ARRAY['${group_members}']
    ) sub`);
  const conflicting = output2.rows[0]?.conflicting || [];
  const matching = group.filter((member) => conflicting.includes(member));
  if (matching.length > 0) {
    client.end();
    const standard = `already in the queue for One Shot Showdown ${output.rows[0].id}. Please `;
    const standard1 = 'use leave, then you can rejoin the queue.'
    const standard2 = ' You may need to have your teammates use /leave as well, if they are in different groups.';
    let msg;
    if (matching.includes(user)) {
      msg = "You";
      if (matching.length == 2) {
        msg += " and " + `<@${teammate1}> are `;
      } else if (matching.length == 3) {
        msg += ", " + `<@${teammate1}>` + ", and " + `<@${teammate2}> are `;
      } else {
        msg += " are ";
      }
      msg += ` ${standard}${standard1}${conflicting.length == 1 ? "" : standard2}`;
    } else {
      if (matching.length == 1) {
        msg = `<@${matching[0]}> is `;
      } else {
        // if user is not included, there can only be 2 matching teammates
        msg = `<@${matching[0]}> and <@${matching[1]}> are `;
      }
      msg += ` ${standard}have them ${standard1}${conflicting.length == 1 ? "" : standard2}`;
    }
    return new JsonResponse({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        "content": msg,
        "flags": 1000000
      }
    });
  } else {
    const output3 = await client.query(`INSERT INTO queue (tournament_id, user_group) VALUES (${tourney_id}, ARRAY['${group_members}']) RETURNING id;`);
    const output4 = await client.query(`SELECT user_group FROM queue WHERE tournament_id = ${tourney_id};`);
    client.end();
    let total = 0;
    for (let i = 0; i < output2.rows.length; i++) {
      total += output2.rows[i].user_group.length;
    }
    return new JsonResponse({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        "content": `Added to the queue. There ${total == 1 ? "is" : "are"} now ${total} player${total == 1 ? "" : "s"} in the queue for One Shot Showdown ${tourney_id}.`,
        "flags": 1000000
      }
    });
  }
}

// returns to the user an ephemeral message indicating how many total people are in the queue (including teammates)
async function queueStatus(interaction, env) {
  const client = new Client({
    user: env.PG_USER,
    password: env.PG_PW,
    host: env.PG_HOST,
    port: 6543,
    database: env.PG_NAME
  });
  await client.connect();
  let output = await client.query(`SELECT * from tournaments ORDER BY start_time DESC LIMIT 1`);
  if (output.rows.length <= 0) {
    client.end();
    return new JsonResponse({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        "content": "Error: no tournament found in database.",
        "flags": 1000000
      }
    });
  }
  if (output.rows[0].status != 'queueing') {
    client.end();
    return new JsonResponse({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        "content": "There is no tournament with an active queue.",
        "flags": 1000000
      }
    });
  }
  const tourney_id = output.rows[0].id;
  const output2 = await client.query(`SELECT user_group FROM queue WHERE tournament_id = ${tourney_id};`);
  client.end();
  let total = 0;
  for (let i = 0; i < output2.rows.length; i++) {
    total += output2.rows[i].user_group.length;
  }
  return new JsonResponse({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      "content": `There ${total == 1 ? "is" : "are"} ${total} player${total == 1 ? "" : "s"} in the queue for One Shot Showdown ${tourney_id}.`,
      "flags": 1000000
    }
  });
}


async function leaveTourney(interaction, env) {
  const client = new Client({
    user: env.PG_USER,
    password: env.PG_PW,
    host: env.PG_HOST,
    port: 6543,
    database: env.PG_NAME
  });
  await client.connect();
  let output = await client.query(`SELECT * from tournaments ORDER BY start_time DESC LIMIT 1`);
  if (output.rows.length <= 0) {
    client.end();
    return new JsonResponse({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        "content": "Error: no tournament found in database.",
        "flags": 1000000
      }
    });
  }
  if (output.rows[0].status != 'queueing') {
    client.end();
    return new JsonResponse({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        "content": "There is no tournament with an active queue.",
        "flags": 1000000
      }
    });
  }
  const tourney_id = output.rows[0].id;
  const user = interaction.member.user.id;
  const output2 = await client.query(`DELETE FROM queue WHERE tournament_id = ${tourney_id} AND '${user}' = ANY(user_group) RETURNING *;`);
  client.end();
  if (output2.rows.length == 0) {
    return new JsonResponse({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        "content": "You are not in the queue for One Shot Showdown " + tourney_id + ". If you'd like to join, use /join.",
        "flags": 1000000
      }
    });
  }
  // direct message the teammates, if there are any
  const teammates = output2.rows[0].user_group.filter((member) => member != user);
  if (teammates.length > 0) {
    const response = await fetch(`https://discord.com/api/v10/users/@me/channels`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bot ${env.DISCORD_TOKEN}`,
      },
      method: 'POST',
      body: JSON.stringify({
        "recipient_id": teammates[0]
      })
    });
    const dmchannel = await response.json();
    const delete_response = await fetch(`https://discord.com/api/v10/channels/${dmchannel.id}/messages`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bot ${env.DISCORD_TOKEN}`,
      },
      method: 'POST',
      body: JSON.stringify({
        "content": `Your teammate <@${user}> has left the queue for OSS ${tourney_id}, so you were also removed from the queue. If you wish, you may rejoin it with /join.`
      })
    });
    const delete_data = await delete_response.json();
    // console.log(delete_data);
    if (teammates.length > 1) {
      const response2 = await fetch(`https://discord.com/api/v10/users/@me/channels`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bot ${env.DISCORD_TOKEN}`,
        },
        method: 'POST',
        body: JSON.stringify({
          "recipient_id": teammates[1]
        })
      });
      const dmchannel2 = await response2.json();
      const delete_response2 = await fetch(`https://discord.com/api/v10/channels/${dmchannel2.id}/messages`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bot ${env.DISCORD_TOKEN}`,
        },
        method: 'POST',
        body: JSON.stringify({
          "content": `Your teammate <@${user}> has left the queue for OSS ${tourney_id}, so you were also removed from the queue. If you wish, you may rejoin it with /join.`
        })
      });
      const delete_data2 = await delete_response2.json();
      // console.log(delete_data2);
    }
  }
  let msg = teammates.length > 0 ? teammates.length == 1 ? ` along with your teammate <@${teammates[0]}>, who was notified.` : ` along with your teammates <@${teammates[0]}> and <@${teammates[1]}>, who were notified.` : ".";
  return new JsonResponse({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      "content": "Removed from the queue for One Shot Showdown " + tourney_id + msg,
      "flags": 1000000
    }
  });
}

async function handleSubmission(env, id, score, team, tourney_id, link,deleter=false) {
  // const test = env.DISCORD_APPLICATION_ID == "1173198500931043390";
  // console.log(team);
  const channel_id = env.TOUR_CHANNEL_ID
  let msg = `<@${team[1]}>`;
  if (team.length == 3) {
    msg += ` and <@${team[2]}>`;
  } else if (team.length == 4) {
    msg += `, <@${team[2]}>, and <@${team[3]}>`;
  }
  const content = `<@${team[0]}> submitted ${score} for OSS${tourney_id} with ${msg}.\n${link}`;
  let fields = [
    {
      "name": "id",
      "value": id
    },
    {
      "name": "submitter",
      "value": `<@${team[0]}>`
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
      "value": `${team.map((member) => "<@" + member + ">").join(", ")}`
    }
  ]
  if(deleter){
    fields.push({
      "name":"deleter",
      "value": `<@${deleter}>`
    });
  }
  const embeds = [
    {
      "author": {
        "name": ""
      },
      "image": {
        "url": link
      },
      "fields": fields
    }
  ];
  // console.log(embeds);

  const components = deleter?[]:componentMaker("tourney", score, null, null);
  // console.log("a");
  const response = await fetch(`https://discord.com/api/v10/channels/${channel_id}/messages`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bot ${env.DISCORD_TOKEN}`,
    },
    method: 'POST',
    body: JSON.stringify({
      "content": content,
      "embeds": embeds,
      "components": components,
      // "attachments": []
    })
  });

  const data = await response.json();
  // console.log(JSON.stringify(data));
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
  let output;
  if (Object.hasOwn(interaction.data, "options")) {
    tourney_id = interaction.data.options[0].value;
  } else {
    output = await client.query(`SELECT * from tournaments ORDER BY start_time DESC LIMIT 1`);
    tourney_id = output.rows[0].id;
  }
  output = await client.query(`SELECT * from submissions WHERE tournament_id = ${tourney_id} ORDER BY score DESC;`);
  let output2 = await client.query(`SELECT * from tournaments WHERE id = ${tourney_id};`);
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
  let content = `## Unofficial leaderboard for OSS ${tourney_id}\nScenario code: **${output2.rows[0].scenario}**\n\`\`\``;
  let prev_score = 0;

  for (let i = 0; i < output.rows.length; i++) {
    let score = Number(output.rows[i].score);
    if (score !== prev_score) {
      content += `${i + 1}. ${score}\n`;
      prev_score = score;
    } else {
      let spaces = ' '.repeat((i + 1).toString().length + 2);
      content += spaces + score + '\n';
    }
  }
  content += "\`\`\`";
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
  scheduled: async function (controller,env,ctx){
    console.log("cron processed");
    const client = new Client({
      user: env.PG_USER,
      password: env.PG_PW,
      host: env.PG_HOST,
      port: 6543,
      database: env.PG_NAME
    });
    await client.connect();
    let output = await client.query(`SELECT * from tournaments ORDER BY start_time DESC LIMIT 1`);
    if (output.rows.length <= 0) {
      return;
    }
    switch (output.rows[0].status) {
      case 'ended':
        console.log(`No tournament waiting to start. date():${BigInt((new Date()).getTime())} start_time: ${output.rows[0].start_time}`);
        return;
      case 'queueing':
        console.log(`A tournament is queuing. date():${BigInt((new Date()).getTime())} start_time: ${output.rows[0].start_time}`)
        return;
        // // if the latest tournament is queueing, advance to awaiting
        // let output3 = await client.query(`SELECT user_group FROM queue WHERE tournament_id = ${output.rows[0].id} ORDER BY id ASC ;`);
        // const rows = output3.rows;
        // let team_message = "";
        // try {
        //   team_message = queueAssignment(rows);
        // } catch (error) {
        //   console.error(error);
        //   return new JsonResponse({
        //     type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        //     data: {
        //       "content": "Error: something went wrong with queue assignment.",
        //       "flags": 1000000
        //     }
        //   });
        // }
        // // send message to tournament channel
        // output2 = await client.query(`UPDATE tournaments SET status = 'awaiting' WHERE id = ${output.rows[0].id};`);
        // const response2 = await fetch(`https://discord.com/api/v10/channels/${tour_announcement_channel}/messages`, {
        //   headers: {
        //     'Content-Type': 'application/json',
        //     Authorization: `Bot ${env.DISCORD_TOKEN}`,
        //   },
        //   method: 'POST',
        //   body: JSON.stringify({
        //     "content": `**One Shot Showdown ${output.rows[0].id}** will be starting in a few minutes! Queueing has ended; ${team_message}${data.oss_messages.awaiting}`
        //   })
        // });
        // // const data2 = await response2.json();
        // // console.log(data2);
        // client.end();
        // return new JsonResponse({
        //   type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        //   data: {
        //     "content": "Tournament queueing ended and teams assigned. Awaiting scenario code.",
        //     "flags": 1000000
        //   }
        // });
      case 'awaiting':
        console.log(`A tournament is ready to start. date():${BigInt((new Date()).getTime())} start_time: ${output.rows[0].start_time}`)
        return;
        // // if the latest tournament is awaiting, start the tournament
        // // check if the scenario is in the correct format
        // let scenario = checkCode(interaction.data.options[0].options[0].value);
        // if (!scenario) {
        //   return new JsonResponse({
        //     type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        //     data: {
        //       "content": "Invalid scenario format. Please use the format XXXX-XXXX-XXXX-XXXX or XXXXXXXXXXXXXXXXXX.",
        //       "flags": 1000000
        //     }
        //   });
        // }
  
        // // if there's no ongoing tournament, start a new one
        // // insert the new tournament into the database
        // try {
        //   output2 = await client.query(`UPDATE tournaments SET scenario = $1, start_time = $2, status = $3 WHERE id = ${output.rows[0].id};`, [scenario, date, 'ongoing']);
        // } catch (error) {
        //   // will error if the scenario has been used before
        //   console.error(error);
        //   return new JsonResponse({
        //     type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        //     data: {
        //       "content": "The scenario has been used before in a previous tournament. Please use a different scenario. In the future, you can check the validity of the scenario beforehand with /oss check.",
        //       "flags": 1000000
        //     }
        //   });
        // }
        // // the date tourney_length from now with discord timestamps
        // const date_end = "<t:" + (BigInt(date.getTime()) + tourney_length) / BigInt(1000) + ":R>";
        // const response3 = await fetch(`https://discord.com/api/v10/channels/${tour_announcement_channel}/messages`, {
        //   headers: {
        //     'Content-Type': 'application/json',
        //     Authorization: `Bot ${env.DISCORD_TOKEN}`,
        //   },
        //   method: 'POST',
        //   body: JSON.stringify({
        //     "content": `**One Shot Showdown ${output.rows[0].id}** has started! You'll have until ${date_end} to complete the following scenario: **${scenario}** and submit it.${data.oss_messages.start}`
        //   })
        // });
        // // const data = await response3.json();
        // // console.log(data);
        // client.end();
        
        // console.log("Tournament started!");
        
      case 'ongoing':
        console.log(`There is an ongoing tournament. date():${BigInt((new Date()).getTime())} start_time: ${output.rows[0].start_time}`);
    }
    // const response = await fetch(`https://discord.com/api/v10/channels/${env.TOUR_ANNOUNCE_ID}/messages`, {
    //   headers: {
    //     'Content-Type': 'application/json',
    //     Authorization: `Bot ${env.DISCORD_TOKEN}`,
    //   },
    //   method: 'POST',
    //   body: JSON.stringify({
    //     "content": `test`
    //   })
    // });
    // return response;
    return;
  }
};
export default server;
