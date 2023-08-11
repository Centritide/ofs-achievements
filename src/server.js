/**
 * The core server that runs on a Cloudflare worker.
 */

import { Router } from 'itty-router';
import {Client,connect} from '@planetscale/database';
// import {fetch} from 'undici';
import {
  InteractionResponseType,
  InteractionType,
  verifyKey,
} from 'discord-interactions';
import {UPDATE_EVENT_COMMAND,UPDATE_SCORE_COMMAND,DISPLAY_PROFILE_COMMAND, UPDATE_SCORE_COMMAND_2} from './commands.js';
import { InteractionResponseFlags } from 'discord-interactions';
const dict = {
  "map0":"SG",
  "map1":"MB",
  "map2":"LO",
  "map3":"SS",
  "map4":"AP",
  "map5":"SSt",
  "map6":"GFH",
  "map7":"JSJ",
  "map8":"",
  "map9":"",
  "map10":"",
  "map11":"",
  "map0day":"SG☀️",
  "map1day":"MB☀️",
  "map2day":"LO☀️",
  "map3day":"SS☀️",
  "map4day":"AP☀️",
  "map5day":"SSt☀️",
  "map6day":"GFH☀️",
  "map7day":"JSJ☀️",
  "map8day":"",
  "map9day":"",
  "map10day":"",
  "map11day":"",
  "princess":"Princess",
  "br0":"BR1 - Wahoo World",
  "br1":"BR2 - Inkblot Art Academy",
  "br2":"BR3 - Undertow Spillway",
  "br3":"",
  "br4":"",
  "br5":"",
  "br6":"",
  "br7":"",
  "br8":"",
  "br9":"",
  "br10":"",
  "br11":"",
  "br12":"",
  "ew0":"EW1 - SSt",
  "ew1":"EW2 - GFH",
  "ew2":"",
  "ew3":"",
  "ew4":"",
  "ew5":"",
  "ew6":"",
  "ew7":"",
  "ew8":"",
  "ew9":"",
  "ew10":"",
  "ew11":"",
  "ew12":"",
  "s2map0":"SG (s2)",
  "s2map1":"MB (s2)",
  "s2map2":"LO (s2)",
  "s2map3":"SS (s2)",
  "s2map4":"AP (s2)", 
  "s2map0day":"SG☀️ (s2)",
  "s2map1day":"MB☀️ (s2)",
  "s2map2day":"LO☀️ (s2)",
  "s2map3day":"SS☀️ (s2)",
  "s2map4day":"AP☀️ (s2)",
  "s2princess":"Princess (s2)",
  "":""
}
const event_thresholds = {
  "br0": 137,
  "br1": 141,
  "br2": 150,
  "ew0": 203,
  "ew1": 217
}
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
  console.log(interaction)
  if (interaction.type === InteractionType.PING) {
    // The `PING` message is used during the initial webhook handshake, and is
    // required to configure the webhook in the developer portal.
    return new JsonResponse({
      type: InteractionResponseType.PONG,
    });
  }

  if (interaction.type === InteractionType.APPLICATION_COMMAND) {
    // Most user commands will come as `APPLICATION_COMMAND`.
    let user;
    let score;
    let stage;
    let column = '';
    let dayonly;
    // console.log(interaction.data.name.toLowerCase() ==UPDATE_SCORE_COMMAND_2.name.toLowerCase());
    switch (interaction.data.name.toLowerCase()) {
      case DISPLAY_PROFILE_COMMAND.name.toLowerCase():
        user = interaction.data.options[0].value;
        // console.log(interaction.guild);
        let avi_url;
        if(interaction.data.resolved.users[user].avatar.substring(0,2) == "a_"){
          avi_url = "https://cdn.discordapp.com/avatars/"+user+"/"+interaction.data.resolved.users[user].avatar+".gif";
        }else{
          // console.log("test")
          avi_url = "https://cdn.discordapp.com/avatars/"+user+"/"+interaction.data.resolved.users[user].avatar+".png";
        }
        // console.log(avi_url);
        const config = {
          host: env.DATABASE_HOST,
          username: env.DATABASE_USERNAME,
          password: env.DATABASE_PASSWORD
        }
        const conn = connect(config);
        const output = await conn.execute("SELECT * from users where id = ?;", [user]);
        // console.log(output);
        // const old = await conn.execute("SELECT map2day from users where id = ?;", [user],{as:'array'});
        // console.log(old);
        let row;
        if(output.rows.length >0){
          row = output.rows[0];
        } else {
          return new JsonResponse({type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: "No profile detected for user <@"+user+">",
              flags: 1000000
          }});
        }
        delete row.id;
        // const keys = Object.keys(row);
        // const values = Object.values(row);
        let fields = [];
        // console.log(keys);
        // console.log(values);
        const layout = ["map5", "map6","map0",
        "map5day","map6day","map0day",
        "map1","map7","princess",
        "map1day", "map7day",""]
        for(let i in layout){
          // console.log(layout[i]);
          const value = row[layout[i]];
          if(value >= 150){
            fields.push({
              "name": dict[layout[i]],
              "value": value,
              "inline":true
            })
          } else {
            fields.push({
              "name": dict[layout[i]],
              "value": "​",
              "inline":true 
            })
          }
        }
        const events = ["br0", "br1","br2","ew0","ew1"]
        let awards = "​";
        let first = true;
        for(let i in events){
          console.log(row[events[i]]>=event_thresholds[events[i]]);
          // console.log(events[i]);

          // console.log(dict["br1"])
          if(row[events[i]]>=event_thresholds[events[i]]){
            console.log(events[i]);
            console.log(dict[events[i]])
            awards = awards + (first ? "" : ", ")+  dict[events[i]];
            first = false;
          }
        }
        console.log(awards);
        //TODO add awards logic
        fields.push({
          "name":"Top 5% events",
          "value": awards,
          "inline": false
        });
        
        const layout2 = ["s2map0", "s2map1","s2map2",
        "s2map0day","s2map1day","s2map2day",
        "s2map3","s2map4","s2princess",
        "s2map3day", "s2map4day",""]
        for(let i in layout2){
          // console.log(layout[i]);
          const value = row[layout2[i]];
          if(value >= 150){
            fields.push({
              "name": dict[layout2[i]],
              "value": value,
              "inline":true
            })
          } else {
            fields.push({
              "name": dict[layout2[i]],
              "value": "​",
              "inline":true 
            })
          }
        }
        // update when added to OFS
        // const guilds = await fetch("https://discord.com/api/v10/users/@me/guilds",{headers: {
        //   'Content-Type': 'application/json',
        //   Authorization: `Bot ${env.DISCORD_TOKEN}`,
        // }}).then(response => response.json());
        // const guild = guilds.find(guild => guild.id === "OFS ID")
        // console.log(guild); 
        // const guild_icon = "https://cdn.discordapp.com/icons/" + guild.id + "/" + guild.icon + ".png";
        // console.log(guild_icon);
        return new JsonResponse({type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            "content": "",
            "tts": false,
            "embeds": [
              {
                "id": 652627557,
                "title": "",
                "description": "<@" + user + ">'s scores (<t:"+Math.floor((Date.now()/1000))+":d>)",
                "color": 11714851,
                "fields": fields,
                "author": {
                  "name": "OF Scorecard",
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
                  "text": "what should i write here",
                  "icon_url": ""
                },
                // "timestamp": "<t:"+Date.now()":d>"
              }
            ]
          }});
      case UPDATE_EVENT_COMMAND.name.toLowerCase():
        const subcommand = interaction.data.options[0].name.toLowerCase();
        user = interaction.data.options[0].options[0].value;
        const event = interaction.data.options[0].options[1].value;
        score = interaction.data.options[0].options[2].value;
        //const dayonly = (interaction.data.options[0].options.length >=4) ? interaction.data.options[0].options[3].value : false;
        
        
        if (subcommand == UPDATE_EVENT_COMMAND.options[0].name.toLowerCase()){
            column = 'br';
        }else { 
            column = 'ew';
        }
        // console.log(subcommand);
        // console.log(UPDATE_EVENT_COMMAND.options[1].name.toLowerCase());
        column = column + event;
        const new_event_score = await updateScore(user, score, column,env);
        
        return new JsonResponse({type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: "Updated " + column + " score for <@"+user + ">: "  + new_event_score,
            flags: 1000000
        }});
      case UPDATE_SCORE_COMMAND.name.toLowerCase():
        user = interaction.data.options[0].value;
        stage = interaction.data.options[1].value;
        score = interaction.data.options[2].value;
        dayonly = (interaction.data.options.length >=4) ? interaction.data.options[3].value : false;
        
        switch (stage){
          case 100:
            column = 'princess';
          default:
            column = 'map' + stage;
        }
        // console.log("here");
        const new_score = await updateScore(user,score,column,env);
        // console.log(content);
        let content = "Updated " + column + " score for <@"+user + ">: "  + new_score;
        // console.log(content);
        if(stage !=100 && dayonly){
          column = column + 'day';
          // console.log(column);
          const day_new = await updateScore(user,score,column,env);
          // console.log(day_new);
          content =  content +  "\nUpdated " + column + " score for <@"+user + ">: "  + day_new;
        }
        // console.log(content);
        return new JsonResponse({type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: content,
            flags: 1000000
        }});
      case UPDATE_SCORE_COMMAND_2.name.toLowerCase():
        // console.log(command);
        user = interaction.data.options[0].value;
        stage = interaction.data.options[1].value;
        score = interaction.data.options[2].value;
        dayonly = (interaction.data.options.length >=4) ? interaction.data.options[3].value : false;

        switch (stage){
          case 100:
            column = 'princess';
          default:
            column = 'map' + stage;
        }
        column = 's2' + column;
        
        
        console.log(column);
        const new_score2 = await updateScore(user,score,column,env);
        // console.log(content);
        let content2 = "Updated " + column + " score for <@"+user + ">: "  + new_score2;
        // console.log(content);
        if(stage !=100 && dayonly){
          column = column + 'day';
          // console.log(column);
          const day_new = await updateScore(user,score,column,env);
          // console.log(day_new);
          content2 =  content2 +  "\nUpdated " + column + " score for <@"+user + ">: "  + day_new;
        }
        //  console.log(content2);
        return new JsonResponse({type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: content2,
            flags: 1000000
        }})
      default:
        return new JsonResponse({ error: 'Unknown Type' + interaction.data.name.toLowerCase() }, { status: 400 });
    }
  }

  console.error('Unknown Type');
  return new JsonResponse({ error: 'Unknown Type' }, { status: 400 });
});
router.all('*', () => new Response('Not Found.', { status: 404 }));

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

async function updateScore(user,score,column,env){
  const config = {
    host: env.DATABASE_HOST,
    username: env.DATABASE_USERNAME,
    password: env.DATABASE_PASSWORD,
        fetch: (url, init) => {
        delete (init)["cache"];
        return fetch(url, init);
    }
  }
  // console.log("what");
  // console.log(user +" " + score+ " " + column);
  const client = new Client(config);
  // console.log("hmm?");
  const conn = client.connection();
  // const check = await conn.execute("select if(exists (select * from users where id =?),true, false);",[user],{as:'array'});
  // let query = "INSERT INTO users (id," + column + ") VALUES (" + user + "," + score + ");";
  // console.log(check.rows[0][0]==1);
  const old = await conn.execute("SELECT "+column+" from users where id = ?;", [user],{as:"array"});
  // console.log(old);
  let old_score = 0;
  // console.log(old.rows.length>0);
  if(old.rows.length>0 && (old.rows[0][0]<score)){
    try{
      console.log(await conn.execute("UPDATE users set "+ column +" = " + score + " where id = "+ user +";"));
      old_score = old.rows[0][0];
    } catch{
      console.error("what");
    }
  } else if (old.rows.length > 0){
    old_score = old.rows[0][0];
    console.log(old_score);
  }else {
    old_score = 0;
    await conn.execute("INSERT INTO users (id,"+ column+ ") VALUES ("+ user +","+ score +");",{column:column,score:score,user:user});
  };
  // console.log(Math.max(old_score,score));
  // try{
  //   console.log(await conn.execute(query));
  // }catch (e){
  //   console.error(e);
  // }
  return Math.max(old_score,score);
}
export default server;
