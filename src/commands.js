/**
 * Share command metadata from a common spot to be used for both runtime
 * and registration.
 */

// export const UPDATE_SCORE_COMMAND = {
//   name: 'score',
//   type:1,
//   default_member_permissions:"32",
//   dm_permission:"false",
//   description: 'update a user\'s score',
//   options: [
//     {
//       name:"user",
//       description:"user",
//       type:6,
//       required:true
//     },
//     {
//       name:"stage",
//       description:"stage",
//       type:4,
//       required: true,
//       choices: [
//         {
//           name:"Spawning Grounds",
//           value:0
//         },
//         {
//           name:"Marooner's Bay",
//           value:1
//         },
//         {
//           name:"Sockeye Station",
//           value:5
//         },
//         {
//           name:"Gone Fission Hydroplant",
//           value:6
//         },
//         {
//           name:"Jammin' Salmon Junction",
//           value:7
//         },
//         {
//           name:"Princess",
//           value:100
//         }
//       ]
//     },
//     {
//       name:"score",
//       description:"score",
//       type:4,
//       required: true
//     },
//     {
//       name:"dayonly",
//       description:"true if day only",
//       type:5
//     }
    
//   ]
// };

// export const UPDATE_SCORE_COMMAND_2 = {
//   name: 'score_s2',
//   type:1,
//   default_member_permissions:"32",
//   dm_permission:"false",
//   description: 'update a user\'s score (s2)',
//   options: [
//     {
//       name:"user",
//       description:"user",
//       type:6,
//       required:true
//     },
//     {
//       name:"stage",
//       description:"stage",
//       type:4,
//       required: true,
//       choices: [
//         {
//           name:"Spawning Grounds",
//           value:0
//         },
//         {
//           name:"Marooner's Bay",
//           value:1
//         },
//         {
//           name:"Lost Outpost",
//           value:2
//         },
//         {
//           name:"Salmonid Smokeyard",
//           value:3
//         },
//         {
//           name:"Ruins of Ark Polaris",
//           value:4
//         },
//         {
//           name:"Princess",
//           value:100
//         }
//       ]
//     },
//     {
//       name:"score",
//       description:"score",
//       type:4,
//       required: true
//     },
//     {
//       name:"dayonly",
//       description:"true if day only",
//       type:5
//     }
//   ]
// }

export const UPDATE_EVENT_COMMAND = {
  name: 'score',
  type:1,
  default_member_permissions:"32",
  dm_permission:"false",
  description: 'update a user\'s event achievement',
  options: [
    {
      name: 's3',
      type:1,
      default_member_permissions:"32",
      dm_permission:"false",
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
          type:3,
          required: true,
          choices: [
            {
              name:"Spawning Grounds",
              value:"sg"
            },
            {
              name:"Marooner's Bay",
              value:"mb"
            },
            {
              name:"Salmonid Smokeyard",
              value:"ssy"
            },
            {
              name:"Sockeye Station",
              value:"sst"
            },
            {
              name:"Gone Fission Hydroplant",
              value:"gfh"
            },
            {
              name:"Jammin' Salmon Junction",
              value:"jsj"
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
          name:"rot_type",
          required:true,
          description:"Choose rotation type",
          type:3,
          choices:[
            {
              name:"Normal",
              value:"normal"
            },
            {
              name:"All Green Random",
              value:"green_random"
            },
            {
              name:"One Green Random",
              value:"single_random"
            },
            {
              name:"All Gold Random",
              value:"golden_random"
            },
            {
              name:"Normal (Day Only)",
              value:"normalday"
            },
            {
              name:"All Green Random (Day Only)",
              value:"green_randomday"
            },
            {
              name:"One Green Random (Day Only)",
              value:"single_randomday"
            },
            {
              name:"All Gold Random (Day Only)",
              value:"golden_randomday"
            },
            {
              name:"Princess",
              value:"princess"
            }
          ]
        }
        
      ]
    },
    {
      name: 's2',
      type:1,
      default_member_permissions:"32",
      dm_permission:"false",
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
          type:3,
          required: true,
          choices: [
            {
              name:"Spawning Grounds",
              value:"s2sg"
            },
            {
              name:"Marooner's Bay",
              value:"s2mb"
            },
            {
              name:"Lost Outpost",
              value:"s2lo"
            },
            {
              name:"Salmonid Smokeyard",
              value:"s2ss"
            },
            {
              name:"Ruins of Ark Polaris",
              value:"s2ap"
            },
            {
              name:"Princess",
              value:"s2princess"
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
          name:"rot_type",
          required:true,
          description:"Choose rotation type",
          type:3,
          choices:[
            {
              name:"Normal",
              value:"normal"
            },
            {
              name:"All Green Random",
              value:"green_random"
            },
            {
              name:"One Green Random",
              value:"single_random"
            },
            {
              name:"All Gold Random",
              value:"golden_random"
            },
            {
              name:"Normal (Day Only)",
              value:"normalday"
            },
            {
              name:"All Green Random (Day Only)",
              value:"green_randomday"
            },
            {
              name:"One Green Random (Day Only)",
              value:"single_randomday"
            },
            {
              name:"All Gold Random (Day Only)",
              value:"golden_randomday"
            },
            {
              name:"Princess",
              value:"princess"
            }
          ]
        }
      ]
    },
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
          type:3,
          required:true,
          choices:[
            {
              name:"Wahoo World",
              value:"br1"
            },
            {
              name:"Inkblot Art Academy",
              value:"br2"
            },
            {
              name:"Undertow Spillway",
              value:"br3"
            },
            {
              name:"Umam'i Ruins",
              value:"br4"
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
          type:3,
          required:true,
          choices:[
            {
              name:"1 - Sockeye Station",
              value:"ew1"
            },
            {
              name:"2 - Gone Fission Hydroplant",
              value:"ew2"
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
    
  ]
};

export const DISPLAY_PROFILE_COMMAND = {
  name:"profile",
  type:1,
  dm_permission:"false",
  description:"see user profile",
  options:[
    {
      name:"user",
      description:"user to search",
      type:6,
      required:true
    },
    // {
    //   name:"profile type",
    //   description:"which scores to show",
    //   type:4,
    //   required:false,
    //   choices:[
    //     {
    //       "name":"All",
    //       value:0
    //     },
    //     {
    //       "name":"S3",
    //       value:1
    //     },
    //     {
    //       "name":"S3 day",
    //       value:2
    //     },
    //     {
    //       "name":"S3 no events",
    //       value:3
    //     },
    //     {
    //       "name": "S2",
    //       value:4
    //     },
    //     {
    //       "name": "S2 day",
    //       value:5
    //     },
    //     {
    //       "name":"Special",
    //       value:6
    //     }
    //   ]
    // }    
  ]
}

export const IMPORT_FROM_ROLES_COMMAND = {
  name:"import",
  description:"import scores from your roles",
  dm_permission:"false",
  type:1
}
export const IMPORT_USER = {
  name:"forceimport",
  default_member_permissions:"32",
  description:"import scores from a user's roles",
  dm_permission:"false",
  type:1,
  options:[{
    name:"user",
    description:"user to search",
    type:6,
    required:true
  }]
}

export const REQUEST_SCORE_COMMAND = {
  name:"request",
  type:1,
  dm_permission:false,
  description:"request a score with a message link",
  options: [
    {
      name: 's3',
      type:1,
      // default_member_permissions:"32",
      dm_permission:"false",
      description: 'request an s3 score',
      options: [
        {
          name:"stage",
          description:"stage",
          type:3,
          required: true,
          choices: [
            {
              name:"Spawning Grounds",
              value:"sg"
            },
            {
              name:"Marooner's Bay",
              value:"mb"
            },
            {
              name:"Salmonid Smokeyard",
              value:"ss"
            },
            {
              name:"Sockeye Station",
              value:"sst"
            },
            {
              name:"Gone Fission Hydroplant",
              value:"gfh"
            },
            {
              name:"Jammin' Salmon Junction",
              value:"jsj"
            },
            {
              name:"Princess",
              value:"princess"
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
          name:"rot_type",
          description:"Choose rotation type",
          type:3,
          required:true,
          choices:[
            {
              name:"Normal",
              value:"normal"
            },
            {
              name:"All Green Random",
              value:"green_random"
            },
            {
              name:"One Green Random",
              value:"single_random"
            },
            {
              name:"All Gold Random",
              value:"golden_random"
            },
            {
              name:"Normal (Day Only)",
              value:"normalday"
            },
            {
              name:"All Green Random (Day Only)",
              value:"green_randomday"
            },
            {
              name:"One Green Random (Day Only)",
              value:"single_randomday"
            },
            {
              name:"All Gold Random (Day Only)",
              value:"golden_randomday"
            },
          ]
        },
        {
          name:"link",
          description:"link to image proof",
          type:3,
          required:false
        },
        {
          name:"attachment",
          description:"link to image proof",
          type:11,
          required:false
        },        
      ]
    },
    {
      name: 's2',
      type:1,
      // default_member_permissions:"32",
      dm_permission:"false",
      description: 'request an s2 score',
      options: [
        
        {
          name:"stage",
          description:"stage",
          type:3,
          required: true,
          choices: [
            {
              name:"Spawning Grounds",
              value:"s2sg"
            },
            {
              name:"Marooner's Bay",
              value:"s2mb"
            },
            {
              name:"Lost Outpost",
              value:"s2lo"
            },
            {
              name:"Salmonid Smokeyard",
              value:"s2ss"
            },
            {
              name:"Ruins of Ark Polaris",
              value:"s2ap"
            },
            {
              name:"Princess",
              value:"s2princess"
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
          name:"rot_type",
          description:"Choose rotation type",
          type:3,
          required:true,
          choices:[
            {
              name:"Normal",
              value:"normal"
            },
            {
              name:"All Green Random",
              value:"green_random"
            },
            {
              name:"One Green Random",
              value:"single_random"
            },
            {
              name:"All Gold Random",
              value:"golden_random"
            },
            {
              name:"Normal (Day Only)",
              value:"normalday"
            },
            {
              name:"All Green Random (Day Only)",
              value:"green_randomday"
            },
            {
              name:"One Green Random (Day Only)",
              value:"single_randomday"
            },
            {
              name:"All Gold Random (Day Only)",
              value:"golden_randomday"
            },
          ]
        },
        {
          name:"link",
          description:"link to image proof",
          type:3,
          required:false
        },
        {
          name:"attachment",
          description:"link to image proof",
          type:11,
          required:false
        },
      ]
    },
    {
      name:"bigrun",
      description: 'request a big run achievement',
      type:1,
      options:[
        
        {
          name:"stage",
          description:"map",
          type:3,
          required:true,
          choices:[
            {
              name:"Wahoo World",
              value:"br1"
            },
            {
              name:"Inkblot Art Academy",
              value:"br2"
            },
            {
              name:"Undertow Spillway",
              value:"br3"
            },
            {
              name:"Umam'i Ruins",
              value:"br4"
            }
          ]
        },  
        {
          name:"score",
          description:"score",
          type:4,
          required:true
        },
        {
          name:"link",
          description:"link to image proof",
          type:3,
          required:false
        },
        {
          name:"attachment",
          description:"link to image proof",
          type:11,
          required:false
        },
      ]
    },
    {
      name:"eggstra",
      description: 'request an eggstra achievement',
      type:1,
      options:[
        
        {
          name:"stage",
          description:"event",
          type:3,
          required:true,
          choices:[
            {
              name:"1 - Sockeye Station",
              value:"ew1"
            },
            {
              name:"2 - Gone Fission Hydroplant",
              value:"ew2"
            }
          ]
        },
        {
          name:"score",
          description:"score",
          type:4,
          required:true
        },
        {
          name:"link",
          description:"link to image proof",
          type:3,
          required:false
        },
        {
          name:"attachment",
          description:"image proof file",
          type:11,
          required:false
        },
      ]
    },
  ]
}

// export const PROFILE_TO_ROLES_COMMAND = {
//   name:"role",
//   description:"add/remove badge based on profile",
//   dm_permission:"false",
//   default_member_permissions:"0",
//   type:1,
//   guild_id:737359708276654121,
//   options:[
//     {
//       name: 's3',
//       type:1,
//       default_member_permissions:"32",
//       dm_permission:"false",
//       description: 'update a user\'s score',
//       options: [
//         {
//           name:"stage",
//           description:"stage",
//           type:4,
//           required: true,
//           choices: [
//             {
//               name:"Spawning Grounds",
//               value:0
//             },
//             {
//               name:"Marooner's Bay",
//               value:1
//             },
//             {
//               name:"Sockeye Station",
//               value:5
//             },
//             {
//               name:"Gone Fission Hydroplant",
//               value:6
//             },
//             {
//               name:"Jammin' Salmon Junction",
//               value:7
//             },
//             {
//               name:"Princess",
//               value:100
//             }
//           ]
//         },
//         {
//           name:"dayonly",
//           description:"true if day only",
//           type:5
//         }
        
//       ]
//     },
//     {
//       name: 's2',
//       type:1,
//       default_member_permissions:"32",
//       dm_permission:"false",
//       description: 'update a user\'s score (s2)',
//       options: [
//         {
//           name:"stage",
//           description:"stage",
//           type:4,
//           required: true,
//           choices: [
//             {
//               name:"Spawning Grounds",
//               value:0
//             },
//             {
//               name:"Marooner's Bay",
//               value:1
//             },
//             {
//               name:"Lost Outpost",
//               value:2
//             },
//             {
//               name:"Salmonid Smokeyard",
//               value:3
//             },
//             {
//               name:"Ruins of Ark Polaris",
//               value:4
//             },
//             {
//               name:"Princess",
//               value:100
//             }
//           ]
//         },
//         {
//           name:"dayonly",
//           description:"true if day only",
//           type:5
//         }
//       ]
//     },
//     {
//       name:"bigrun",
//       description: 'update a user\'s big run achievement',
//       type:1,
//       options:[
//         {
//           name:"event",
//           description:"map",
//           type:4,
//           required:true,
//           choices:[
//             {
//               name:"Wahoo World",
//               value:0
//             },
//             {
//               name:"Inkblot Art Academy",
//               value:1
//             },
//             {
//               name:"Undertow Spillway",
//               value:2
//             }
//           ]
//         },
//       ]
//     },
//     {
//       name:"eggstra",
//       description: 'update a user\'s big run achievement',
//       type:1,
//       options:[
//         {
//           name:"event",
//           description:"event",
//           type:4,
//           required:true,
//           choices:[
//             {
//               name:"1 - Sockeye Station",
//               value:0
//             },
//             {
//               name:"2 - Gone Fission Hydroplant",
//               value:1
//             }
//           ]
//         }
//       ]
//     },
    
//   ]
// }

// export const TEST_COMMAND = {
//   name:"test",
//   default_member_permissions:0,
//   dm_permission:false,
//   description:"test",
//   type:1,
//   options:[
//     {
//       name:"attach",
//       description:"attach",
//       type:11
//     }
//   ]
// }

// export const REMOVE_SCORE_COMMAND = {
//   name:"remove_score",
//   type:1,
//   description:"remove my scores",
//   options:[
//     {
//       name:"scores",
//       description:"scores to remove",
//       type:4,
//       required:true,
//       choices:[
//         {
//           name:"all",
//           value:0
//         },
//         {
//           name:"all s3",
//           value:1
//         },
//         {
//           name:"all s2",
//           value:2
//         },
//         {
//           name:"all events",
//           value:3
//         },
//         {
//           name:"all s3 except events",
//           value:4
//         },
//         {
//           name:"specific score",
//           value:5
//         }
//       ]
//     },
//     {
//       name:"specific score",
//       description:"specific map/event score to remove",
//       type:3,
//       required:false,
//       choices:[
//         {
//           name:"not implemented yet",
//           value:"br1"
//         }
//       ]
//     }
//   ]
// }

// export const LOCK_PERMISSIONS_COMMAND = {
//   name:"lock",
//   description:"set permissions for score update commands",
//   type:1,
//   options:[
//     {
//       name:"role",
//       description:"the role being allowed/disallowed from using the command"
//     }
//   ]
// }