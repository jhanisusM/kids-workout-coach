'use strict';
/* KIDS VIDEO LIBRARY
 *
 * The single place where demo videos live. To change an exercise's videos,
 * change only its demo_ids list in docs/app.js. To change a whole topic's
 * videos, change only the videos list below. Never edit app logic to
 * change videos. Demo URLs are only added when verified: each video below
 * was opened and checked, and no URL here was invented. Never add a
 * search-result URL here.
 *
 * Plain browser script: no modules, no build step. Loaded via a script
 * tag before app.js in docs/index.html.
 */
const VIDEO_LIBRARY = {
  topics: [
    {
      id: 'kids-moves',
      name: 'Kids moves',
      description: 'Verified demo videos for the Kids Workout Coach moves.'
    }
  ],
  videos: [
    {
      id: 'v-little-sports-easy20',
      topic: 'kids-moves',
      title: 'Easy 20 Min Kids Workout: Fun Beginner Exercises At Home',
      creator: 'Little Sports',
      handle: '',
      description: 'Kids beginner workout video: Hopscotch chapter at 0:00, Step Jacks chapter at 0:25. One full workout video shared by both moves, not a dedicated demo per move.',
      url: 'https://www.youtube.com/watch?v=1ZDXv_73zJ8'
    },
    {
      id: 'v-crossrope-bear-crawl',
      topic: 'kids-moves',
      title: 'How-To: Bear Crawl',
      creator: 'Crossrope Jump Ropes',
      handle: '',
      description: 'Bear crawl how-to: wrists under shoulders, knees off the floor, left hand with right leg together.',
      url: 'https://www.youtube.com/shorts/-9L3rTrYo4Q'
    },
    {
      id: 'v-nursedeon-frog-jump',
      topic: 'kids-moves',
      title: 'The Frog Jump Challenge! Fun Exercise for Kids',
      creator: 'Nurse Deon - Health & Wellness Videos for Kids',
      handle: '',
      description: 'Kids frog jump challenge: squat low, jump high like a frog.',
      url: 'https://www.youtube.com/shorts/xvFlSThUpgw'
    },
    {
      id: 'v-funtobefit-star-jumps',
      topic: 'kids-moves',
      title: 'Can You Do Star Jumps? | Fun To Be Fit Kids',
      creator: 'Fun to be Fit Kids',
      handle: '',
      description: 'Kids star jumps with Ms. Adrianne: jump up, spread arms and legs wide like a star.',
      url: 'https://www.youtube.com/shorts/t_B2U4apoxc'
    },
    {
      id: 'v-xhit-high-knee',
      topic: 'kids-moves',
      title: 'High Knee - XFit Daily',
      creator: 'XHIT Daily',
      handle: '',
      description: 'High knee demo from an adult fitness channel, not kid-specific. Flagged to the user as the weakest pick.',
      url: 'https://www.youtube.com/watch?v=oDdkytliOqE'
    },
    {
      id: 'v-allina-arm-burners',
      topic: 'kids-moves',
      title: 'Arm Burners HPK',
      creator: 'Allina Health',
      handle: '',
      description: 'Arm circles demo: arms out at the sides, tiny circles, then reverse.',
      url: 'https://www.youtube.com/watch?v=eUHmwH5arHI'
    },
    {
      id: 'v-boardgains-invisible-rope',
      topic: 'kids-moves',
      title: 'How to Do Invisible Jump Rope With Proper Form',
      creator: 'BoardGains Fitness Game',
      handle: '',
      description: 'Invisible jump rope: feet together, small jumps, wrist circles as if holding a rope.',
      url: 'https://www.youtube.com/watch?v=bB_FpK_c_Oc'
    },
    {
      id: 'v-spaceninja-flamingo',
      topic: 'kids-moves',
      title: 'Flamingo Balancing',
      creator: 'Space Ninja School',
      handle: '',
      description: 'Kids flamingo balance: stand on one leg like a proud pink flamingo.',
      url: 'https://www.youtube.com/watch?v=iJvhUhtvUwU'
    },
    {
      id: 'v-kidsfitmotion-crab-walk',
      topic: 'kids-moves',
      title: '3 Animal Walks for Kids | Frog Jump, Crab Walk & Bear Walk | Fun Fitness Activity!',
      creator: 'Sushil Pro Fitness',
      handle: '',
      description: 'Kids animal walks video including Crab Walk.',
      url: 'https://www.youtube.com/shorts/SoM7xC60Loc'
    },
    {
      id: 'v-little-sports-donkey-kicks',
      topic: 'kids-moves',
      title: '15-MINUTE FULL BODY WORKOUT FOR KIDS: HOME EXERCISE',
      creator: 'Little Sports',
      handle: '',
      description: 'Kids workout compilation: Donkey Kicks Left chapter at 6:56, Donkey Kicks Right chapter at 7:48, not a standalone demo.',
      url: 'https://www.youtube.com/watch?v=dK5RsKPJKYg'
    },
    {
      id: 'v-impossible-superman',
      topic: 'kids-moves',
      title: 'Superman | IMPOSSIBLE Fitness',
      creator: 'IMPOSSIBLE Fitness',
      handle: '',
      description: 'Prone superman demo: lie on belly, lift arms and legs, hold. Clean general demo, not kid-specific.',
      url: 'https://www.youtube.com/watch?v=9sxoMGjICK4'
    },
    {
      id: 'v-howcast-inchworm',
      topic: 'kids-moves',
      title: 'How to Do an Inchworm | Abs Workout',
      creator: 'Howcast',
      handle: '',
      description: 'Inchworm how-to: hinge, walk hands out to plank, walk back. Clean general demo.',
      url: 'https://www.youtube.com/watch?v=VSp0z7Mp5IU'
    },
    {
      id: 'v-bugururia-komodo-run',
      topic: 'kids-moves',
      title: 'Komodo Chase Run | Brain Break for Kids',
      creator: 'Bu Guru Ria',
      handle: '',
      description: 'Kids running game: run in place is the core move, plus jump, duck, and freeze.',
      url: 'https://www.youtube.com/watch?v=PMRR8ds3Ho4'
    },
    {
      id: 'v-little-sports-windmills',
      topic: 'kids-moves',
      title: '12 Easy Exercises For Kids At Home',
      creator: 'Little Sports',
      handle: '',
      description: 'Kids exercises video; windmill is the first move.',
      url: 'https://www.youtube.com/watch?v=FB5-7tIiX-I'
    },
    {
      id: 'v-andy-kids-squat',
      topic: 'kids-moves',
      title: 'How to SQUAT - Active Moves for Kids!',
      creator: '519Andy',
      handle: '',
      description: 'Kids squat demo: sit the hips back and down, then stand tall.',
      url: 'https://www.youtube.com/watch?v=GD2F5sqsK1o'
    },
    {
      id: 'v-livelean-kids-strength',
      topic: 'kids-moves',
      title: '20 Minute Kids Strength Training Program At Home',
      creator: 'Live Lean TV',
      handle: '',
      description: 'One kids strength circuit shared by Low Step-Ups, Wall Sit, and Reverse Lunge. The video names step-ups and wall sits, and alternating lunges (the channel write-up calls those reverse lunges). Not a separate demo per move, and no chapter times are marked.',
      url: 'https://www.youtube.com/watch?v=zMSx6K3mcvY'
    },
    {
      id: 'v-cchmc-bird-dog',
      topic: 'kids-moves',
      title: 'HealthWorks! Youth Fitness 201 - Bird Dog',
      creator: "Cincinnati Children's",
      handle: '',
      description: 'Youth bird dog: hands and knees, opposite arm and leg, flat back, eyes down.',
      url: 'https://www.youtube.com/watch?v=kGPVyMPpEQo'
    }
  ]
};

const VIDEO_BY_ID = {};
VIDEO_LIBRARY.videos.forEach(function (v) { VIDEO_BY_ID[v.id] = v; });

/* Resolve a video id to its full video object. Unknown ids warn and return
 * null so one bad id is skipped instead of blanking the page. */
function resolveVideo(id) {
  const v = VIDEO_BY_ID[id];
  if (!v) {
    if (typeof console !== 'undefined' && console && typeof console.warn === 'function') {
      console.warn('unknown video id: ' + id);
    }
    return null;
  }
  return v;
}

/* Resolve an exercise's demo_ids into full video objects. Unknown ids are
 * skipped so one bad id cannot blank the page. */
function resolveDemoList(ids) {
  if (!Array.isArray(ids)) return [];
  const out = [];
  ids.forEach(function (id) {
    const v = resolveVideo(id);
    if (v) out.push(v);
  });
  return out;
}
