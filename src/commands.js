/**
 * Share command metadata from a common spot to be used for both runtime
 * and registration.
 */

export const UPDATE_SCORE_COMMAND = {
  name: 'score',
  type:1,
  description: 'update a user\'s score',
  options: [
    {
      name:"user",
      description:"user",
      type:6,
      required:true
    },
    {
      name:"stage",
      description:"stage",
      type:4,
      required: true,
      choices: [
        {
          name:"Spawning Grounds",
          value:0
        },
        {
          name:"Marooner's Bay",
          value:1
        },
        {
          name:"Sockeye Station",
          value:5
        },
        {
          name:"Gone Fission Hydroplant",
          value:6
        },
        {
          name:"Jammin' Salmon Junction",
          value:7
        },
        {
          name:"Princess",
          value:100
        }
      ]
    },
    {
      name:"score",
      description:"score",
      type:4,
      required: true
    },
    {
      name:"dayonly",
      description:"true if day only",
      type:5
    }
    
  ]
};

export const UPDATE_SCORE_COMMAND_2 = {
  name: 'score_s2',
  type:1,
  description: 'update a user\'s score (s2)',
  options: [
    {
      name:"user",
      description:"user",
      type:6,
      required:true
    },
    {
      name:"stage",
      description:"stage",
      type:4,
      required: true,
      choices: [
        {
          name:"Spawning Grounds",
          value:0
        },
        {
          name:"Marooner's Bay",
          value:1
        },
        {
          name:"Lost Outpost",
          value:2
        },
        {
          name:"Salmonid Smokeyard",
          value:3
        },
        {
          name:"Ruins of Ark Polaris",
          value:4
        },
        {
          name:"Princess",
          value:100
        }
      ]
    },
    {
      name:"score",
      description:"score",
      type:4,
      required: true
    },
    {
      name:"dayonly",
      description:"true if day only",
      type:5
    }
  ]
}

export const UPDATE_EVENT_COMMAND = {
  name: 'event',
  type:1,
  description: 'update a user\'s event achievement',
  options: [
    {
      name:"bigrun",
      description: 'update a user\'s big run achievement',
      type:1,
      options:[
        {
          name:"user",
          description:"user",
          type:6,
          required:true
        },
        {
          name:"event",
          description:"map",
          type:4,
          required:true,
          choices:[
            {
              name:"Wahoo World",
              value:0
            },
            {
              name:"Inkblot Art Academy",
              value:1
            },
            {
              name:"Undertow Spillway",
              value:2
            }
          ]
        },
        
        {
          name:"score",
          description:"score",
          type:4,
          required:true
        }
      ]
    },
    {
      name:"eggstra",
      description: 'update a user\'s big run achievement',
      type:1,
      options:[
        {
          name:"user",
          description:"user",
          type:6,
          required:true
        },
        {
          name:"event",
          description:"event",
          type:4,
          required:true,
          choices:[
            {
              name:"1 - Sockeye Station",
              value:0
            },
            {
              name:"2 - Gone Fission Hydroplant",
              value:1
            }
          ]
        },
        
        {
          name:"score",
          description:"score",
          type:4,
          required:true
        }
      ]
    }
  ]
};

export const DISPLAY_PROFILE_COMMAND = {
  name:"profile",
  type:1,
  description:"see user profile",
  options:[
    {
      name:"user",
      description:"user to search",
      type:6,
      required:true
    }
  ]
}