'use strict';
/* Kids Workout Coach program: the move pool and the session builder.
 *
 * Source of truth: Ask AI's synthesis (warm-up, main, cool-down tables,
 * the session rule, the 3-level progression, and the safety notes).
 * Names, descriptions, and YouTube URLs come from Ask AI's checked
 * exercises-kids.json pool (48 moves). URLs are used as given.
 *
 * Doses are [Starter, Stronger, Superhero]. null means the move is not
 * offered at that level. workSec is an estimate for a reps move (about
 * 3.5 seconds a controlled kid rep, both sides for per-leg moves, about
 * 5 seconds for a rep with a 2-second hold) and only feeds the time
 * estimate. Bodyweight only, no yoga, a grown-up nearby. */
(function (root) {
  const SE = root.SessionEngine || (typeof require === 'function' ? require('./session-engine.js') : null);

  const TARGET_MINUTES = 20;
  /* Round-2 play move is dropped when the projection passes 20:30. */
  const DROP_PLAY_OVER_SEC = 20.5 * 60;
  /* Setup per screen, from the synthesis timing check: 8 s, plus 8 s to
   * watch the demo on round 1 of main, and 4 s on round 2 (no demo). */
  const TRANSITION_SEC = 8;
  const ROUND1_SETUP_SEC = 16;
  const ROUND2_SETUP_SEC = 4;
  const WARMUP_REST_SEC = 10;
  const COOLDOWN_REST_SEC = 10;
  const ROUND_BREAK_SEC = 30;
  /* Main rest per level, from the progression table. */
  const MAIN_REST_SEC = { 1: 25, 2: 20, 3: 15 };

  const LEVELS = [
    { id: 1, name: 'Starter' },
    { id: 2, name: 'Stronger' },
    { id: 3, name: 'Superhero' },
  ];

  const t = (seconds, label) => ({ kind: 'time', seconds: seconds, label: label || seconds + ' sec' });
  const tSides = (each, label) => ({ kind: 'time', seconds: each * 2, perSide: true, label: label || each + ' sec each leg' });
  const r = (reps, label, workSec) => ({ kind: 'reps', reps: reps, label: label, workSec: workSec });

  /* role: which slot of the session rule may draw the move.
   *   pulse, shoulder, coord, warm-extra   warm-up
   *   squat, single-leg, hold-hop, posture, crab, play   main
   *   cooldown   fixed cool-down
   *   library    in Ask AI's pool, not drawn by the session rule
   * hopFrom: the level where the move's dose becomes a hop or jump. */
  const MOVES = [
    /* ---- Warm-up (synthesis table) ---- */
    { id: 'step-jacks', name: 'Step Jacks', phase: 'warmup', focus: 'Heat-up', roles: ['pulse'],
      cue: 'Step one foot out, arms up, step back, stand tall.',
      doses: [t(30), t(40), t(40)],
      description: 'Step one foot out to the side and back while the arms go up and down. Keep the chest tall and the feet quiet, with no jump.',
      url: 'https://www.youtube.com/watch?v=92riZhCgkjw' },
    { id: 'high-knees', name: 'High Knees', jsonName: 'High Knees March', phase: 'warmup', focus: 'Heat-up, thighs', roles: ['pulse'],
      cue: 'Knees toward belly-button height, chest tall.',
      doses: [t(20, '20 sec, marching'), t(30, '30 sec, quicker knees'), t(30, '30 sec, fast high knees')],
      description: 'March in place and lift the knees toward belly-button height. Stand tall and do not lean backward.',
      url: 'https://www.youtube.com/watch?v=CvQkGTuG2hM' },
    { id: 'invisible-jump-rope', name: 'Invisible Jump Rope', phase: 'warmup', focus: 'Calves, rhythm', roles: ['pulse'], hopFrom: 2,
      cue: 'Tall chest, wrists turn the rope, quiet feet.',
      doses: [t(20, '20 sec, march and turn the wrists'), t(30, '30 sec, tiny quiet hops'), t(40, '40 sec, tiny quiet hops')],
      description: 'Turn the wrists as if you are swinging a rope and stay light on your feet. March on Starter, and use tiny hops only when landings are quiet.',
      url: 'https://www.youtube.com/watch?v=bB_FpK_c_Oc' },
    { id: 'hopscotch', name: 'Hopscotch', phase: 'warmup', focus: 'Balance, single-leg', roles: ['coord', 'play'], hopFrom: 2,
      cue: 'Land on the ball of the foot, soft knee, tall between hops.',
      doses: [t(30, '30 sec, stepping'), t(30, '30 sec, soft hops'), t(40, '40 sec, soft hops')],
      description: 'Hop or step through an imaginary or drawn pattern, landing softly on one foot or two. Stand tall between hops.',
      url: 'https://www.youtube.com/watch?v=hilyMjNXilA' },
    { id: 'arm-circles', name: 'Arm Circles', phase: 'warmup', focus: 'Shoulders, posture', roles: ['shoulder'],
      cue: 'Smooth circles, shoulders down, neck long.',
      doses: [r(12, '6 forward + 6 back', 24), r(16, '8 forward + 8 back', 32), r(20, '10 forward + 10 back', 40)],
      description: 'Make smooth circles with the arms, first forward and then back. Keep the shoulders down and the neck long.',
      url: 'https://www.youtube.com/watch?v=DQ5k_nwZe-E' },
    { id: 'windmills', name: 'Windmills', phase: 'warmup', focus: 'Hamstrings, trunk', roles: ['coord'],
      cue: 'Push hips back, back flat, soft knees, eyes forward.',
      doses: [r(6, '6 alternating', 21), r(8, '8 alternating', 28), r(10, '10 alternating', 35)],
      description: 'Hinge at the hips with a flat back and soft knees, reaching toward the opposite shin. Do not round the back or force a toe-touch.',
      url: 'https://www.youtube.com/watch?v=a-KqiYR7CZc' },
    { id: 'hand-walk-outs', name: 'Hand Walk-Outs', phase: 'warmup', focus: 'Core, shoulders', roles: ['coord'],
      cue: 'Walk hands to a straight line, walk feet in, stand tall.',
      caution: 'Optional: skip it if wrists hurt.',
      doses: [r(3, '3 walk-outs', 27), r(4, '4 walk-outs', 36), r(6, '6 walk-outs', 54)],
      description: 'Walk the hands out to a straight plank line, then walk the feet in and stand tall. Do not hold a downward-dog shape.',
      url: 'https://www.youtube.com/watch?v=SCJ9qcNPEOQ' },

    /* ---- Main (synthesis table and progression) ---- */
    { id: 'sit-to-stand', name: 'Sit-to-Stand', phase: 'main', focus: 'Thighs', roles: ['squat'],
      cue: 'Nose over toes, stand with no hands, sit slowly.',
      caution: 'Use a sturdy chair that will not slide.',
      doses: [r(8, '8 reps', 28), r(10, '10 reps', 35), null],
      description: 'Sit on a sturdy chair and stand up without using the hands, then sit down slowly. Keep the chest tall and the knees tracking over the toes.',
      url: 'https://www.youtube.com/watch?v=qveKmiXEkIQ' },
    { id: 'bodyweight-squat', name: 'Bodyweight Squat', phase: 'main', focus: 'Thighs', roles: ['squat'],
      cue: 'Sit back toward an imaginary chair, heels down, knees follow toes.',
      doses: [null, r(8, '8 reps', 28), r(12, '12 reps, 2-second pause at the bottom', 66)],
      description: 'Sit the hips back as if lowering toward a chair, then stand tall. Keep the heels down and the knees following the toes.',
      url: 'https://www.youtube.com/watch?v=GD2F5sqsK1o' },
    { id: 'low-step-up', name: 'Low Step-Up', phase: 'main', focus: 'Thighs, balance', roles: ['single-leg'],
      cue: 'Whole foot on the step, push through the heel, step down slowly.',
      caution: 'Use a low, stable step, like the bottom stair next to a rail.',
      doses: [r(4, '4 each leg', 28), r(6, '6 each leg', 42), r(8, '8 each leg', 56)],
      description: 'Step onto a low, stable step with the whole foot, stand tall, and step down slowly. Push through the heel.',
      url: 'https://www.youtube.com/watch?v=gDQ2SBV_UqA' },
    { id: 'wall-sit', name: 'Wall Sit', phase: 'main', focus: 'Thigh endurance, posture', roles: ['hold-hop'],
      cue: 'Back on the wall, comfortable bend, knees over ankles.',
      caution: 'Keep breathing. No breath-holding.',
      doses: [t(10), t(20), t(30)],
      description: 'Lean the back against a wall and bend the knees to a comfortable depth. Keep breathing and hold for a short time.',
      url: 'https://www.youtube.com/watch?v=eb7vLD6V-iU' },
    { id: 'supported-reverse-lunge', name: 'Supported Reverse Lunge', phase: 'main', focus: 'Thighs, balance', roles: ['single-leg'],
      cue: 'Short step back, back knee hovers, torso tall, front knee over mid-foot.',
      caution: 'Hold a wall or chair.',
      doses: [null, r(6, '6 each leg', 42), r(8, '8 each leg', 56)],
      description: 'Hold a wall or chair, take a short step back, and lower until the back knee hovers. Keep the torso tall.',
      url: 'https://www.youtube.com/watch?v=ihvCffrRIbM' },
    { id: 'frog-jumps', name: 'Frog Jumps', phase: 'main', focus: 'Thigh power', roles: ['hold-hop'], hopFrom: 2,
      cue: 'Squat, jump forward, land softly on both feet and stick it.',
      caution: 'Soft, quiet two-foot landings on a non-slip floor. Skip it if landings get loud.',
      doses: [null, r(4, '4 jumps', 18), r(6, '6 jumps', 27)],
      description: 'Squat, jump forward, and land softly on both feet with bent knees. Stick the landing and keep it quiet.',
      url: 'https://www.youtube.com/watch?v=GvTeWVyJKNE' },
    { id: 'star-jumps', name: 'Star Jumps', phase: 'main', focus: 'Thigh power', roles: ['hold-hop'], hopFrom: 3,
      cue: 'Crouch, jump wide, arms make a star, quiet landing.',
      caution: 'Soft, quiet landings on a non-slip floor. Clear the space overhead.',
      doses: [null, null, r(6, '6 to 8 jumps', 28)],
      description: 'Crouch, then jump with the arms and legs wide like a star. Land quietly with soft knees.',
      url: 'https://www.youtube.com/watch?v=Sh8JdIFZdv8' },
    { id: 'bear-crawl', name: 'Bear Crawl', phase: 'main', focus: 'Full body, posture', roles: ['play'],
      cue: 'Back flat like a table, small opposite hand and foot steps.',
      caution: 'Short distances. Skip it if wrists hurt.',
      doses: [t(10, '10 sec, knees down is OK'), t(15), t(20)],
      description: 'With a flat back like a table, take small steps with opposite hand and foot. Starter may keep the knees down.',
      url: 'https://www.youtube.com/watch?v=fTJtkQh3IsU' },
    { id: 'crab-walk', name: 'Crab Walk', phase: 'main', focus: 'Shoulders, hips, posture', roles: ['crab', 'play'],
      cue: 'Hips high, chest to the ceiling, do not hang the head back.',
      caution: 'Skip it if wrists or shoulders hurt.',
      doses: [t(10), t(15), t(20)],
      description: 'Lift the hips and walk on hands and feet with the chest facing up. Keep the hips high and the head in line.',
      url: 'https://www.youtube.com/watch?v=lZ2YmEHbfkQ' },
    { id: 'bird-dog', name: 'Bird Dog', phase: 'main', focus: 'Posture, core', roles: ['posture'],
      cue: 'Flat back, reach long not high, hips level.',
      doses: [r(4, '4 each side', 28), r(6, '6 each side, 2-second hold', 60), r(8, '8 each side, 2-second hold', 80)],
      description: 'From hands and knees, reach one arm and the opposite leg long, not high. Keep the back flat and the hips level.',
      url: 'https://www.youtube.com/watch?v=xEDnlOxeJH4' },
    { id: 'superkid', name: 'Superkid', phase: 'main', focus: 'Back, posture', roles: ['posture'],
      cue: 'Eyes on the floor, long neck, lift only a little.',
      caution: 'Lift low and keep the neck long. Short lifts, no long holds.',
      doses: [r(5, '5 short lifts', 15), r(8, '8 short lifts', 24), r(10, '10 short lifts', 30)],
      description: 'Lie on the belly and lift the arms and legs just a little, then lower. Keep the eyes on the floor and the neck long.',
      url: 'https://www.youtube.com/watch?v=g0Kr9Wd3CeQ' },
    { id: 'belly-down-yt-lifts', name: 'Belly-Down Y/T Lifts', phase: 'main', focus: 'Upper back, posture', roles: ['posture'],
      cue: 'Forehead down, thumbs up, squeeze the shoulder blades.',
      caution: 'Lift low and keep the neck long.',
      /* Starter keeps to Bird Dog or Superkid; Y/T joins at Stronger. */
      doses: [null, r(12, '6 Y + 6 T', 36), r(16, '8 Y + 8 T', 48)],
      description: 'Lie on the belly and lift the arms into a Y, then a T, with the thumbs up. Keep the forehead down and the neck long.',
      url: 'https://www.youtube.com/watch?v=QdGTI4Lshg4' },

    /* ---- Cool-down: 4 fixed standing moves ---- */
    { id: 'slow-march', name: 'Slow March', phase: 'cooldown', focus: 'Heart rate down', roles: ['cooldown'],
      cue: 'Walk slowly, easy arm swing, breathe in and out.',
      doses: [t(30), t(30), t(30)],
      description: 'March slowly in place with an easy arm swing. Breathe in and out and let the heart rate come down.',
      url: 'https://www.youtube.com/watch?v=Ac8M_Osjy6s' },
    { id: 'wall-stand', name: 'Wall Stand', phase: 'cooldown', focus: 'Tall posture', roles: ['cooldown'],
      cue: 'Heels, bottom, shoulders, and head touch the wall, chin level.',
      doses: [t(20), t(30), t(40)],
      description: 'Stand with heels, bottom, shoulders, and head lightly touching a wall. Keep the chin level and breathe normally.',
      url: 'https://www.youtube.com/watch?v=eD70Re3F3oI' },
    { id: 'wall-angels', name: 'Wall Angels', phase: 'cooldown', focus: 'Posture, shoulders', roles: ['cooldown'],
      cue: 'Back and head stay on the wall; slide arms only as far as they can.',
      doses: [r(5, '5 slow reps', 25), r(8, '8 slow reps', 40), r(10, '10 slow reps', 50)],
      description: 'With the back and head on a wall, slide the arms up and down slowly. Move only as far as the back and head can stay on the wall.',
      url: 'https://www.youtube.com/watch?v=pd_AhqgFA7E' },
    { id: 'flamingo-balance', name: 'Flamingo Balance', phase: 'cooldown', focus: 'Single-leg balance', roles: ['cooldown'],
      cue: 'One knee up, hands on hips, eyes on a spot, fingertip on the wall if needed.',
      doses: [tSides(15), tSides(20), tSides(30)],
      description: 'Stand on one leg with the other knee up and the hands on the hips. Look at one spot, and touch a wall with a fingertip if needed.',
      url: 'https://www.youtube.com/watch?v=PY12LSNWuYo' },

    /* ---- Extra warm-up moves from Ask AI's pool. Not in the synthesis
     * tables; doses are app defaults. They fill the 4th warm-up spot. ---- */
    { id: 'step-touches', name: 'Step Touches', phase: 'warmup', focus: 'Heat-up', roles: ['warm-extra'],
      doses: [t(30), t(30), t(30)],
      description: 'Step side to side and tap the other foot in, swinging the arms comfortably. Stay tall and keep the steps light.',
      url: 'https://www.youtube.com/watch?v=kdvD6ybN8HA' },
    { id: 'toe-walks', name: 'Toe Walks', phase: 'warmup', focus: 'Calves, balance', roles: ['warm-extra'],
      doses: [t(20), t(30), t(30)],
      description: 'Walk forward on the balls of the feet, keeping the heels off the floor. Stand tall and take small steps.',
      url: 'https://www.youtube.com/watch?v=BTrDSCZZei4' },
    { id: 'heel-walks', name: 'Heel Walks', phase: 'warmup', focus: 'Shins, balance', roles: ['warm-extra'],
      doses: [t(20), t(30), t(30)],
      description: 'Walk forward on the heels, keeping the toes up. Stand tall and go slowly.',
      url: 'https://www.youtube.com/watch?v=ZRI899Xv8PE' },
    { id: 'skater-steps', name: 'Skater Steps', phase: 'warmup', focus: 'Hips, balance', roles: ['warm-extra'],
      doses: [t(20), t(30), t(30)],
      description: 'Step side to side in a small skating pattern without jumping. Reach the back foot lightly behind and stay tall.',
      url: 'https://www.youtube.com/watch?v=ZW1G5aWLqXc' },
    { id: 'side-shuffles', name: 'Side Shuffles', phase: 'warmup', focus: 'Heat-up, hips', roles: ['warm-extra'],
      doses: [t(20), t(30), t(30)],
      description: 'Shuffle sideways with soft knees and quick, small steps. Do not bounce or cross the feet.',
      url: 'https://www.youtube.com/watch?v=paH4kxHBuoc' },
    { id: 'butt-kicks', name: 'Butt Kicks', phase: 'warmup', focus: 'Heat-up, thighs', roles: ['warm-extra'],
      doses: [t(20, '20 sec, marching'), t(30), t(30)],
      description: 'Jog or march in place and kick the heels toward the seat. Stay tall and land softly.',
      url: 'https://www.youtube.com/watch?v=O1xVzt6u6L4' },
    { id: 'fast-feet', name: 'Fast Feet', phase: 'warmup', focus: 'Heat-up, quick feet', roles: ['warm-extra'],
      doses: [t(15), t(20), t(20)],
      description: 'Tap the feet quickly in place as if the floor is hot. Stay light, keep the chest tall, and keep the steps small.',
      url: 'https://www.youtube.com/watch?v=eT5M1goPDhY' },
    { id: 'ankle-circles', name: 'Ankle Circles', phase: 'warmup', focus: 'Ankles', roles: ['warm-extra'],
      doses: [r(20, '5 each way, each foot', 30), r(20, '5 each way, each foot', 30), r(20, '5 each way, each foot', 30)],
      description: 'Hold a wall and draw slow circles with the toes, then switch direction and switch feet. Keep the standing leg tall.',
      url: 'https://www.youtube.com/watch?v=F9J-SACa2Z0' },
    { id: 'step-toe-taps', name: 'Step Toe Taps', phase: 'warmup', focus: 'Heat-up, balance', roles: ['warm-extra'],
      caution: 'Use a low, stable step.',
      doses: [t(20), t(30), t(30)],
      description: 'Stand facing a low step and tap one foot, then the other, on top of the step. Stay tall and keep the taps light.',
      url: 'https://www.youtube.com/watch?v=TvppoqEGlD8' },
    { id: 'heel-to-toe-walk', name: 'Heel-to-Toe Walk', phase: 'warmup', focus: 'Balance', roles: ['warm-extra'],
      doses: [t(30), t(30), t(30)],
      description: 'Walk in a straight line, placing the heel of one foot just in front of the toes of the other. Stand tall and look ahead.',
      url: 'https://www.youtube.com/watch?v=z_GKdFf3qv4' },
    { id: 'backward-walk', name: 'Backward Walk', phase: 'warmup', focus: 'Balance', roles: ['warm-extra'],
      caution: 'Clear space only. A grown-up watches behind.',
      doses: [t(20), t(30), t(30)],
      description: 'Walk backward in a clear space, stepping carefully and standing tall. Look over the shoulder to check the space.',
      url: 'https://www.youtube.com/watch?v=Kaxp9nvj1QM' },
    { id: 'arm-swings', name: 'Arm Swings', phase: 'warmup', focus: 'Shoulders', roles: ['warm-extra'],
      doses: [t(20), t(30), t(30)],
      description: 'Swing the arms forward and back in a relaxed rhythm. Keep the shoulders down and the chest tall.',
      url: 'https://www.youtube.com/watch?v=dqGhldSMYP8' },
    /* Superhero only: the warm-up impact row allows jacks at that level. */
    { id: 'jumping-jacks', name: 'Jumping Jacks', phase: 'warmup', focus: 'Heat-up', roles: ['warm-extra'], hopFrom: 3,
      caution: 'Soft, quiet landings. Use Step Jacks if landings get loud.',
      doses: [null, null, t(30)],
      description: 'Jump the feet out and in while the arms go up and down. Land softly, and use Step Jacks instead if landings get noisy.',
      url: 'https://www.youtube.com/watch?v=v-uFImyXIM4' },

    /* ---- Library: in Ask AI's pool, not drawn by the synthesis session
     * rule (no slot names them), so no dose is set. ---- */
    { id: 'calf-raises', name: 'Calf Raises', phase: 'main', focus: 'Calves', roles: ['library'],
      description: 'Rise onto the balls of both feet, then lower slowly. Stand tall and hold a wall if you need balance.',
      url: 'https://www.youtube.com/watch?v=k8ipHzKeAkQ' },
    { id: 'glute-bridge', name: 'Glute Bridge', phase: 'main', focus: 'Hips, back of the legs', roles: ['library'],
      description: 'Lie on the back with bent knees and lift the hips, then lower slowly. Squeeze the seat at the top and do not arch the back.',
      url: 'https://www.youtube.com/watch?v=QqNzshh0FZ4' },
    { id: 'standing-side-leg-lifts', name: 'Standing Side Leg Lifts', phase: 'main', focus: 'Hips, balance', roles: ['library'],
      description: 'Stand tall, hold a wall, and lift one leg out to the side, then lower slowly. Keep the toes forward and the torso still.',
      url: 'https://www.youtube.com/watch?v=l_U2uoePtS4' },
    { id: 'dead-bug', name: 'Dead Bug', phase: 'main', focus: 'Core', roles: ['library'],
      description: 'Lie on the back with arms up and knees bent, then lower one arm and the opposite leg without arching the back. Switch sides slowly.',
      url: 'https://www.youtube.com/watch?v=h4e6dHOIPJg' },
    { id: 'wall-push-ups', name: 'Wall Push-Ups', phase: 'main', focus: 'Arms, chest', roles: ['library'],
      description: 'Place the hands on a wall and bend the elbows to bring the chest toward the wall, then press back. Keep the body straight.',
      url: 'https://www.youtube.com/watch?v=o0e_ZNsmO2c' },
    { id: 'shoulder-blade-squeezes', name: 'Shoulder Blade Squeezes', phase: 'main', focus: 'Upper back, posture', roles: ['library'],
      description: 'Sit or stand tall and squeeze the shoulder blades together, then relax. Do not shrug the shoulders.',
      url: 'https://www.youtube.com/watch?v=QN1oZVMMRjE' },
    { id: 'standing-y-raises', name: 'Standing Y Raises', phase: 'main', focus: 'Upper back, posture', roles: ['library'],
      description: 'Raise the arms up and out into a Y shape, then lower slowly. Keep the thumbs slightly up and the shoulders down.',
      url: 'https://www.youtube.com/watch?v=1GtxQGEJvVk' },
    { id: 'bodyweight-good-morning', name: 'Bodyweight Good Morning', phase: 'main', focus: 'Hips, hamstrings', roles: ['library'],
      description: 'Put the hands on the hips or across the chest, push the hips back, then stand tall. Keep a flat back and soft knees.',
      url: 'https://www.youtube.com/watch?v=61zbhuRiwQg' },
    { id: 'short-plank', name: 'Short Plank', phase: 'main', focus: 'Core', roles: ['library'],
      description: 'Hold a straight line from head to heels or knees for a short time. Do not let the hips sag, and keep breathing.',
      url: 'https://www.youtube.com/watch?v=qMZ7Df_sy3E' },
    { id: 'tabletop-shoulder-taps', name: 'Tabletop Shoulder Taps', phase: 'main', focus: 'Core, shoulders', roles: ['library'],
      description: 'From hands and knees, tap one shoulder with the opposite hand, then switch. Keep the hips still and the back flat.',
      url: 'https://www.youtube.com/watch?v=Xdpmqvbd854' },
    { id: 'hip-hinge', name: 'Hip Hinge', phase: 'main', focus: 'Hips, hamstrings', roles: ['library'],
      description: 'Push the hips back as if closing a car door with your seat, then stand tall. Keep the back flat and the knees soft.',
      url: 'https://www.youtube.com/watch?v=elNw8Fnk1Wk' },
    { id: 'standing-calf-stretch', name: 'Standing Calf Stretch', phase: 'cooldown', focus: 'Calves', roles: ['library'],
      description: 'Stand facing a wall with the back heel down and lean forward gently. Stop at a mild stretch and do not bounce.',
      url: 'https://www.youtube.com/watch?v=LoWfpR9y6rs' },
  ];

  const SAFETY_NOTES = [
    'A grown-up stays in the room.',
    'Clear about 2 meters of floor. Use a non-slip surface and bare feet or grippy shoes.',
    'Stop for pain, dizziness, limping, or losing balance again and again.',
    'Jumps are soft, quiet, and two-footed. Starter has none.',
  ];

  const BY_ID = new Map(MOVES.map(m => [m.id, m]));

  function normalizeLevel(level) {
    const n = Number(level);
    return n === 1 || n === 2 || n === 3 ? n : 1;
  }
  function doseAt(move, level) {
    return move.doses ? move.doses[normalizeLevel(level) - 1] : null;
  }
  function offered(move, level) { return !!doseAt(move, level); }
  function hopsAt(move, level) { return typeof move.hopFrom === 'number' && normalizeLevel(level) >= move.hopFrom; }
  function withRole(role, level) { return MOVES.filter(m => m.roles.indexOf(role) !== -1 && offered(m, level)); }

  function pick(list, rand) {
    if (!list.length) throw new Error('no move available for this slot');
    return list[Math.floor(rand() * list.length)];
  }

  /* Warm-up: a pulse raiser, a shoulder move, a coordination move, and one
   * more warm-up move. Starter never hops (the hop moves are marches or
   * stepping there). Higher levels allow at most one hopping move. Wall
   * Stand is left out of the warm-up because the fixed cool-down uses it. */
  function pickWarmup(level, rand) {
    const chosen = [];
    const hops = () => chosen.filter(m => hopsAt(m, level)).length;
    const fits = m => chosen.indexOf(m) === -1 && (!hopsAt(m, level) || hops() === 0);
    chosen.push(pick(withRole('pulse', level).filter(fits), rand));
    chosen.push(pick(withRole('shoulder', level).filter(fits), rand));
    chosen.push(pick(withRole('coord', level).filter(fits), rand));
    const extraPool = MOVES.filter(m => m.phase === 'warmup' && offered(m, level) &&
      m.roles.some(role => role === 'pulse' || role === 'coord' || role === 'warm-extra'));
    const extra = pick(extraPool.filter(fits), rand);
    /* Pulse raiser first, then the extra move, then shoulders, then the
     * coordination move. */
    return [chosen[0], extra, chosen[1], chosen[2]];
  }

  /* Main round: squat pattern, single-leg, hold or hop, posture, posture
   * or Crab Walk, then a play move. Standing moves first, floor last. */
  function pickMainRound(level, rand, warmup) {
    const L = normalizeLevel(level);
    const used = warmup || [];
    const squat = BY_ID.get(L === 1 ? 'sit-to-stand' : 'bodyweight-squat');
    const single = pick(withRole('single-leg', L), rand);
    const holdHop = pick(withRole('hold-hop', L), rand);
    const posture = withRole('posture', L);
    const p1 = pick(posture, rand);
    const p2 = pick(posture.filter(m => m !== p1).concat(withRole('crab', L)), rand);
    const play = pick(withRole('play', L).filter(m => m !== p2 && used.indexOf(m) === -1), rand);
    return [squat, single, holdHop, p1, p2, play];
  }

  function slotFor(move, level, extra) {
    const dose = doseAt(move, level);
    return Object.assign({
      id: move.id,
      name: move.name,
      phase: move.phase,
      focus: move.focus,
      equipment: ['bodyweight'],
      dose: { kind: dose.kind, reps: dose.reps, seconds: dose.seconds, label: dose.label, perSide: dose.perSide === true },
      workSec: dose.workSec,
      demoUrl: move.url,
      note: move.cue || move.description,
      caution: move.caution || '',
    }, extra || {});
  }

  /* One session as a linear slot list: 4 warm-up, 6 main x 2 rounds, then
   * the fixed 4-move cool-down. Round 2 repeats round 1 with no demo
   * (synthesis: demos on round 1 only). A 30-second water break is added
   * to the rest after round 1. When the projection passes 20:30, round 2 drops its play move. */
  function buildSession(options) {
    const opts = options || {};
    const level = normalizeLevel(opts.level);
    const rand = typeof opts.rand === 'function' ? opts.rand : Math.random;
    const mainRest = MAIN_REST_SEC[level];
    const warmMoves = pickWarmup(level, rand);
    const warm = warmMoves.map(m => slotFor(m, level, { restSec: WARMUP_REST_SEC }));
    /* Hopscotch is both a warm-up and a play move; it is never drawn twice. */
    const round = pickMainRound(level, rand, warmMoves);
    const round1 = round.map((m, i) => slotFor(m, level, {
      id: m.id + '-r1',
      phase: 'main',
      setupSec: ROUND1_SETUP_SEC,
      restSec: i === round.length - 1 ? mainRest + ROUND_BREAK_SEC : mainRest,
      restLabel: i === round.length - 1 ? 'Water break' : '',
    }));
    let round2 = round.map(m => slotFor(m, level, { id: m.id + '-r2', phase: 'main', setupSec: ROUND2_SETUP_SEC, restSec: mainRest, demoUrl: '', note: 'Round 2. ' + (m.cue || '') }));
    const cool = ['slow-march', 'wall-stand', 'wall-angels', 'flamingo-balance']
      .map(id => slotFor(BY_ID.get(id), level, { restSec: COOLDOWN_REST_SEC }));
    const levelName = LEVELS[level - 1].name;
    const plan = slots => ({
      id: 'kids-level-' + level + '-' + Math.floor(rand() * 1e9).toString(36),
      title: 'Level ' + level + ': ' + levelName + ' workout',
      targetMinutes: TARGET_MINUTES,
      transitionSec: TRANSITION_SEC,
      notes: SAFETY_NOTES,
      slots: slots,
    });
    let out = plan(warm.concat(round1, round2, cool));
    if (SE.estimateSeconds(out) > DROP_PLAY_OVER_SEC) {
      round2 = round2.slice(0, -1);
      out = plan(warm.concat(round1, round2, cool));
    }
    return out;
  }

  /* Deterministic generator for tests and previews. */
  function seeded(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let x = a;
      x = Math.imul(x ^ (x >>> 15), x | 1);
      x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }

  const KidsProgram = {
    TARGET_MINUTES: TARGET_MINUTES,
    MAIN_REST_SEC: MAIN_REST_SEC,
    LEVELS: LEVELS,
    MOVES: MOVES,
    SAFETY_NOTES: SAFETY_NOTES,
    doseAt: doseAt,
    hopsAt: hopsAt,
    buildSession: buildSession,
    seeded: seeded,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = KidsProgram;
  else root.KidsProgram = KidsProgram;
})(typeof window !== 'undefined' ? window : globalThis);
