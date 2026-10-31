'use strict';
/* KIDS VIDEO LIBRARY
 *
 * The single place where demo videos live. To change an exercise's videos,
 * change only its demo_ids list in docs/app.js. To change a whole topic's
 * videos, change only the videos list below. Never edit app logic to
 * change videos. Demo URLs are only added when verified: each video below
 * was opened and checked as kid friendly, with the creator and move
 * confirmed, and the top pick per move was added at the user's request on
 * 2026-10-31. Never invent a URL here.
 *
 * Plain browser script: no modules, no build step. Loaded via a script
 * tag before app.js in docs/index.html.
 */
const VIDEO_LIBRARY = {
  topics: [
    {
      id: 'kids-moves',
      name: 'Kids moves',
      description: 'Verified kid-friendly demo videos for the Kids Workout Coach moves.'
    }
  ],
  videos: [
    {
      id: 'v-bodycoach-kids-move',
      topic: 'kids-moves',
      title: '5 Minute Move | Kids Workout 1',
      creator: 'The Body Coach TV (Joe Wicks)',
      handle: '',
      description: 'Joe Wicks 5-minute kids workout: march in place and star jumps.',
      url: 'https://www.youtube.com/watch?v=d3LPrhI0v-w'
    },
    {
      id: 'v-kidsfitmotion-shorts',
      topic: 'kids-moves',
      title: 'Kids frog jumps and bear crawl',
      creator: 'KidsFitMotion',
      handle: '',
      description: 'Kids short: little frog jumps and bear crawl.',
      url: 'https://www.youtube.com/shorts/SoM7xC60Loc'
    },
    {
      id: 'v-sammy-frog-squats',
      topic: 'kids-moves',
      title: 'Frog squats',
      creator: 'Sammy and Sonna',
      handle: '',
      description: 'Animated frog squats clip. Note: the clip carries a site watermark throughout.',
      url: 'https://www.instagram.com/reel/Ddm1WwpRBLQ/'
    },
    {
      id: 'v-trevorrow-wall-sit',
      topic: 'kids-moves',
      title: 'Wall sit',
      creator: 'Joshua Trevorrow',
      handle: '',
      description: 'Wall sit demo.',
      url: 'https://www.instagram.com/reel/Dav5QCYyiK9/'
    },
    {
      id: 'v-gmb-horse-stance',
      topic: 'kids-moves',
      title: 'Horse stance',
      creator: 'GMB Fitness',
      handle: '',
      description: 'Horse stance video on the GMB page: open the page and play the video.',
      url: 'https://gmb.io/horse-stance/'
    },
    {
      id: 'v-catalyst-glute-bridge',
      topic: 'kids-moves',
      title: 'Glute bridge',
      creator: 'Catalyst Athletics',
      handle: '',
      description: 'Glute bridge demo video on the Catalyst Athletics page.',
      url: 'https://www.catalystathletics.com/exercise/730/Glute-Bridge/'
    },
    {
      id: 'v-simplyyoung-plank-knees',
      topic: 'kids-moves',
      title: 'Plank on knees',
      creator: 'Simply Young',
      handle: '',
      description: 'Plank on knees demo. General demo, not kid-specific.',
      url: 'https://www.youtube.com/watch?v=4HQoS-Z3rWU'
    },
    {
      id: 'v-catalyst-superman',
      topic: 'kids-moves',
      title: 'Superman hold',
      creator: 'Catalyst Athletics',
      handle: '',
      description: 'Superman hold demo.',
      url: 'https://www.youtube.com/watch?v=r7u7aofrP3g'
    },
    {
      id: 'v-bodyfix-wall-angels',
      topic: 'kids-moves',
      title: 'Wall angels',
      creator: 'BodyFix Chiropractic',
      handle: '',
      description: 'Wall angels demo. General demo, not kid-specific.',
      url: 'https://www.youtube.com/watch?v=B28zZ0QrIOI'
    },
    {
      id: 'v-wufshanti-butterfly',
      topic: 'kids-moves',
      title: 'Butterfly stretch',
      creator: 'Wuf Shanti',
      handle: '',
      description: 'Butterfly stretch for kids.',
      url: 'https://www.youtube.com/watch?v=Z47WQylFRmM'
    },
    {
      id: 'v-luna-tall-giraffe',
      topic: 'kids-moves',
      title: 'Tall Giraffe Flow',
      creator: "Luna's Magic Mat",
      handle: '',
      description: 'Tall Giraffe Flow: a tall stretch for kids.',
      url: 'https://www.youtube.com/watch?v=VutXpPte0r0'
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
