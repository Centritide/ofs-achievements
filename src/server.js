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
import {UPDATE_EVENT_COMMAND,DISPLAY_PROFILE_COMMAND, IMPORT_FROM_ROLES_COMMAND,REQUEST_SCORE_COMMAND,IMPORT_USER} from './commands.js';
const data = require("./data/data.json");
const dict = data.dict;
const event_thresholds = data.event_thresholds;
const table = "users";
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
    return await componentResponse(interaction,env);
  } 
  console.error('Unknown Type');
  return new JsonResponse({ error: 'Unknown Type' }, { status: 400 });
});
router.all('*', () => new Response('Not Found.', { status: 404 }));


// holy hell. what the hell. AAAAAAAA

async function showProfile(interaction,env){
  const user = interaction.data.options[0].value;


  let avi_url;
  if(interaction.data.resolved.users[user].avatar === null){
    avi_url = 'https://cdn.wikimg.net/en/splatoonwiki/images/2/2a/S3_Stage_Random.png?20230909072647';
  }else if(interaction.data.resolved.users[user].avatar.substring(0,2) == "a_"){
    avi_url = "https://cdn.discordapp.com/avatars/"+user+"/"+interaction.data.resolved.users[user].avatar+".gif";
  }else{
    avi_url = "https://cdn.discordapp.com/avatars/"+user+"/"+interaction.data.resolved.users[user].avatar+".png";
  }
  const page = (interaction.data.options.length>=2) ? interaction.data.options[1].value : 0;
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

      layout = layout.concat(data.col_groups[i]);
      for(let j = 0; data.col_groups[i].length%3>0 && j<(3-(data.col_groups[i].length%3));j++){
        layout.push("");
      }
    }
    for(let i of layout){
      const value = row[i];
      if(i == ""){
        fields.push({
          "name": "​", //this too
          "value": "​",
          "inline":true 
        })
      } else { //TODO there should be some logic for adding badges to scores
        fields.push({
          "name": dict[i], 
          "value": value==0?"-":value,
          "inline":true
        })
      }
    }
  }
  client.end();
  console.log(fields)
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
            "text": "what should i write here 😔",
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
      ]
    }]
  }
  const scorerow = {
    type:1,
    components:[
      {
        type:2,
        label:"-1",
        style:2,
        custom_id:"sub 1"
      },
      {
        type:2,
        label:"-2",
        style:2,
        custom_id:"sub 2"
      },
      {
        type:2,
        label:"-5",
        style:2,
        custom_id:"sub 5"
      },
      {
        type:2,
        label:"-10",
        style:2,
        custom_id:"sub 10"
      },
      {
        type:2,
        label:"+10",
        style:2,
        custom_id:"add 10"
      }
    ]
  };
  
  
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
        console.log(await client.query(`UPDATE ${table} set ${column} = ${score} where id = ${user};`));
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
    real = await img.status;
  } else if(link.substring(0,27)=="https://cdn.discordapp.com/"){
    real = 200; 
  } else {
    const img = await fetch(link);
    real = await img.status;
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
  const test = env.DISCORD_APPLICATION_ID == "1173198500931043390";
  const channel_id = (test) ? "1142653555895971943" : "1178115595296841848";

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
