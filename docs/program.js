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
      doses: [r(8, '8 reps', 24), r(10, '10 reps', 30), r(12, '12 reps', 36)],
      cue: 'Rise tall, lower slowly, hold a wall if you need balance.',
      description: 'Rise onto the balls of both feet, then lower slowly. Stand tall and hold a wall if you need balance.',
      url: 'https://www.youtube.com/watch?v=k8ipHzKeAkQ' },
    { id: 'glute-bridge', name: 'Glute Bridge', phase: 'main', focus: 'Hips, back of the legs', roles: ['library'],
      doses: [r(6, '6 reps', 24), r(8, '8 reps', 32), r(10, '10 reps', 40)],
      cue: 'Lift the hips, squeeze the seat, do not arch the back.',
      description: 'Lie on the back with bent knees and lift the hips, then lower slowly. Squeeze the seat at the top and do not arch the back.',
      url: 'https://www.youtube.com/watch?v=QqNzshh0FZ4' },
    { id: 'standing-side-leg-lifts', name: 'Standing Side Leg Lifts', phase: 'main', focus: 'Hips, balance', roles: ['library'],
      doses: [r(4, '4 each leg', 28), r(6, '6 each leg', 42), r(8, '8 each leg', 56)],
      cue: 'Hold a wall, lift one leg to the side, toes forward, torso still.',
      description: 'Stand tall, hold a wall, and lift one leg out to the side, then lower slowly. Keep the toes forward and the torso still.',
      url: 'https://www.youtube.com/watch?v=l_U2uoePtS4' },
    { id: 'dead-bug', name: 'Dead Bug', phase: 'main', focus: 'Core', roles: ['library'],
      doses: [r(4, '4 each side', 28), r(6, '6 each side', 42), r(8, '8 each side', 56)],
      cue: 'Lower the opposite arm and leg, keep the back flat, switch slowly.',
      description: 'Lie on the back with arms up and knees bent, then lower one arm and the opposite leg without arching the back. Switch sides slowly.',
      url: 'https://www.youtube.com/watch?v=h4e6dHOIPJg' },
    { id: 'wall-push-ups', name: 'Wall Push-Ups', phase: 'main', focus: 'Arms, chest', roles: ['library'],
      doses: [r(6, '6 reps', 24), r(8, '8 reps', 32), r(10, '10 reps', 40)],
      cue: 'Hands on the wall, body straight, bend and press back.',
      description: 'Place the hands on a wall and bend the elbows to bring the chest toward the wall, then press back. Keep the body straight.',
      url: 'https://www.youtube.com/watch?v=o0e_ZNsmO2c' },
    { id: 'shoulder-blade-squeezes', name: 'Shoulder Blade Squeezes', phase: 'main', focus: 'Upper back, posture', roles: ['library'],
      doses: [r(8, '8 squeezes', 24), r(10, '10 squeezes', 30), r(12, '12 squeezes', 36)],
      cue: 'Stand tall, squeeze the shoulder blades, do not shrug.',
      description: 'Sit or stand tall and squeeze the shoulder blades together, then relax. Do not shrug the shoulders.',
      url: 'https://www.youtube.com/watch?v=QN1oZVMMRjE' },
    { id: 'standing-y-raises', name: 'Standing Y Raises', phase: 'main', focus: 'Upper back, posture', roles: ['library'],
      doses: [r(6, '6 reps', 24), r(8, '8 reps', 32), r(10, '10 reps', 40)],
      cue: 'Raise the arms into a Y, thumbs up, shoulders down.',
      description: 'Raise the arms up and out into a Y shape, then lower slowly. Keep the thumbs slightly up and the shoulders down.',
      url: 'https://www.youtube.com/watch?v=1GtxQGEJvVk' },
    { id: 'bodyweight-good-morning', name: 'Bodyweight Good Morning', phase: 'main', focus: 'Hips, hamstrings', roles: ['library'],
      description: 'Put the hands on the hips or across the chest, push the hips back, then stand tall. Keep a flat back and soft knees.',
      url: 'https://www.youtube.com/watch?v=61zbhuRiwQg' },
    { id: 'short-plank', name: 'Short Plank', phase: 'main', focus: 'Core', roles: ['library'],
      doses: [t(10, '10 sec, knees down is OK'), t(15), t(20)],
      cue: 'Straight line from head to heels or knees, keep breathing.',
      caution: 'Drop the knees if you need to.',
      description: 'Hold a straight line from head to heels or knees for a short time. Do not let the hips sag, and keep breathing.',
      url: 'https://www.youtube.com/watch?v=qMZ7Df_sy3E' },
    { id: 'tabletop-shoulder-taps', name: 'Tabletop Shoulder Taps', phase: 'main', focus: 'Core, shoulders', roles: ['library'],
      doses: [r(6, '6 taps each side', 36), r(8, '8 taps each side', 48), r(10, '10 taps each side', 60)],
      cue: 'Hands and knees, tap the opposite shoulder, hips still.',
      caution: 'Skip it if wrists hurt.',
      description: 'From hands and knees, tap one shoulder with the opposite hand, then switch. Keep the hips still and the back flat.',
      url: 'https://www.youtube.com/watch?v=Xdpmqvbd854' },
    { id: 'hip-hinge', name: 'Hip Hinge', phase: 'main', focus: 'Hips, hamstrings', roles: ['library'],
      description: 'Push the hips back as if closing a car door with your seat, then stand tall. Keep the back flat and the knees soft.',
      url: 'https://www.youtube.com/watch?v=elNw8Fnk1Wk' },
    { id: 'standing-calf-stretch', name: 'Standing Calf Stretch', phase: 'cooldown', focus: 'Calves', roles: ['library'],
      doses: [tSides(15), tSides(20), tSides(20)],
      cue: 'Heel down, mild stretch only, no bouncing.',
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

  const DEFAULT_THEME = 'animal-parade';

  function line(name, text) { return { name: name, line: text }; }

  /* Each theme is a story wrapped around a body focus. Warm-up and
   * cool-down lists are ids from the pool. mainSlots describes the six
   * unique main moves. focusIds is the set that counts toward "mostly
   * from this body focus." */
  const THEMES = [
    {
      id: 'jungle-explorer',
      name: 'Jungle Explorer',
      focus: 'Strong legs',
      intro: 'Trek through the jungle. Strong legs carry you over roots and vines.',
      warmup: {
        pulse: ['high-knees', 'step-jacks', 'invisible-jump-rope'],
        extra: ['toe-walks', 'skater-steps', 'step-touches', 'heel-walks'],
        shoulder: ['arm-circles', 'arm-swings'],
        coord: ['windmills', 'hand-walk-outs', 'hopscotch'],
      },
      cooldown: ['slow-march', 'wall-stand', 'standing-calf-stretch', 'flamingo-balance'],
      mainSlots: [
        { kind: 'squat' },
        { from: ['low-step-up', 'supported-reverse-lunge'] },
        { from: ['wall-sit', 'frog-jumps', 'star-jumps'] },
        { from: ['calf-raises', 'glute-bridge'] },
        { from: ['bird-dog'] },
        { from: ['bear-crawl'] },
      ],
      focusIds: ['sit-to-stand', 'bodyweight-squat', 'low-step-up', 'supported-reverse-lunge', 'wall-sit', 'frog-jumps', 'star-jumps', 'calf-raises', 'glute-bridge'],
      lines: {
        'step-jacks': line('Trail Steps', 'Step out and back along the path, arms reaching for the canopy.'),
        'high-knees': line('Vine March', 'March through the vines with knees high and a tall chest.'),
        'invisible-jump-rope': line('Vine Swing', 'Turn the wrists as if swinging on a vine and keep the feet quiet.'),
        'hopscotch': line('Stone Path', 'Step or hop from stone to stone and stick each landing.'),
        'arm-circles': line('Canopy Circles', 'Draw big, smooth circles like you are stirring the leaves.'),
        'arm-swings': line('Vine Swings', 'Swing the arms forward and back like hanging vines.'),
        'windmills': line('Low Branch Reach', 'Push the hips back and reach toward the opposite shin, like a low branch.'),
        'hand-walk-outs': line('Log Walk-Outs', 'Walk the hands out along a fallen log, then walk the feet in.'),
        'toe-walks': line('Quiet Jungle Toes', 'Walk on your toes so the jungle floor stays quiet.'),
        'heel-walks': line('Quiet Jungle Heels', 'Walk on your heels and stay tall between the roots.'),
        'skater-steps': line('Side Trail Steps', 'Step side to side along a narrow trail, with no jump.'),
        'step-touches': line('Path Taps', 'Step side to side and tap the path with light feet.'),
        'sit-to-stand': line('Stump Stand', 'Stand up from a tree stump with no hands, then sit slowly.'),
        'bodyweight-squat': line('Root Squat', 'Sit back toward an imaginary stump, then stand tall.'),
        'low-step-up': line('Fallen Log Steps', 'Step onto a fallen log, stand tall, and step down slowly.'),
        'wall-sit': line('Tree Trunk Hold', 'Lean on a tree trunk, bend the knees a little, and keep breathing.'),
        'supported-reverse-lunge': line('Vine Lunge', 'Hold a vine or tree, take a short step back, and stay tall.'),
        'frog-jumps': line('Frog Leap', 'Leap over a fallen log and land softly on both feet.'),
        'star-jumps': line('Canopy Star Leap', 'Jump wide like a star in a clearing and land quietly.'),
        'bear-crawl': line('Jaguar Crawl', 'Crawl like a jaguar with a flat back and small, quiet steps.'),
        'bird-dog': line('Tree Reach', 'Reach one arm and the opposite leg long, like a branch, and keep the hips level.'),
        'calf-raises': line('Tip-Toe Over Roots', 'Rise onto your toes to peek over the roots, then lower slowly.'),
        'glute-bridge': line('Bridge the Stream', 'Lift the hips to make a bridge over a tiny stream, then lower slowly.'),
        'slow-march': line('Walk Back to Camp', 'Walk slowly back to camp and let the breathing settle.'),
        'wall-stand': line('Tall Tree Stand', 'Stand tall like a tree, with heels, seat, shoulders, and head lightly on a wall.'),
        'standing-calf-stretch': line('Stretch at the Tree', 'Lean gently toward a tree with the back heel down. No bouncing.'),
        'flamingo-balance': line('Toucan Stand', 'Stand on one leg like a toucan, eyes on a spot, fingertip on a tree if you need it.'),
      },
    },
    {
      id: 'superhero-training',
      name: 'Superhero Training',
      focus: 'Tall posture',
      intro: 'Train like a superhero. Stand tall, reach long, and keep a strong back.',
      warmup: {
        pulse: ['high-knees', 'step-jacks'],
        extra: ['arm-swings', 'step-touches'],
        shoulder: ['arm-circles'],
        coord: ['hand-walk-outs', 'windmills'],
      },
      cooldown: ['slow-march', 'wall-stand', 'wall-angels', 'flamingo-balance'],
      mainSlots: [
        { kind: 'squat' },
        { from: ['wall-sit'] },
        { from: ['bird-dog'] },
        { from: ['superkid'] },
        { from: ['belly-down-yt-lifts', 'standing-y-raises', 'shoulder-blade-squeezes'] },
        { from: ['crab-walk', 'bear-crawl'] },
      ],
      focusIds: ['wall-sit', 'bird-dog', 'superkid', 'belly-down-yt-lifts', 'standing-y-raises', 'shoulder-blade-squeezes', 'crab-walk', 'bear-crawl', 'wall-stand', 'wall-angels'],
      lines: {
        'high-knees': line('Hero March', 'March tall, like a hero on the way to the training hall.'),
        'step-jacks': line('Hero Steps', 'Step out and in with the arms up, chest tall, no jump.'),
        'arm-swings': line('Cape Swings', 'Swing the arms as if a cape is settling behind you.'),
        'step-touches': line('Ready Steps', 'Step side to side and stay ready, chest tall.'),
        'arm-circles': line('Power Circles', 'Make smooth arm circles and keep the shoulders down.'),
        'hand-walk-outs': line('Hero Walk-Outs', 'Walk the hands out to a strong, straight line, then walk back in.'),
        'windmills': line('Reach and Recover', 'Hinge with a flat back and reach, then stand tall again.'),
        'sit-to-stand': line('Ready Stand', 'Stand up tall from a chair with no hands, like answering the call.'),
        'bodyweight-squat': line('Power Squat', 'Sit back, then stand tall as if lifting a small earth.'),
        'wall-sit': line('Hero Hold', 'Hold a comfortable wall sit and keep a tall, proud chest.'),
        'bird-dog': line('Long Reach', 'Reach one arm and the opposite leg long, not high, like a hero in flight.'),
        'superkid': line('Take Flight', 'Lie on your belly and lift only a little, eyes on the floor, neck long.'),
        'belly-down-yt-lifts': line('Signal Lights', 'Lift the arms into a Y, then a T, like sending a quiet signal.'),
        'standing-y-raises': line('Victory Y', 'Raise the arms into a Y and lower slowly, shoulders down.'),
        'shoulder-blade-squeezes': line('Armor Squeeze', 'Squeeze the shoulder blades together, then relax. No shrugging.'),
        'crab-walk': line('Crab Shield', 'Lift the hips, chest to the ceiling, and walk without hanging the head back.'),
        'bear-crawl': line('Strong-Back Crawl', 'Crawl with a flat, strong back and small opposite steps.'),
        'slow-march': line('Cool-Down Patrol', 'Walk slowly and let the hero work settle.'),
        'wall-stand': line('Hero Posture', 'Heels, seat, shoulders, and head touch the wall. Chin level.'),
        'wall-angels': line('Cape Waves', 'Slide the arms up and down the wall, only as far as the back can stay on it.'),
        'flamingo-balance': line('Lookout Stand', 'Stand on one leg, hands on hips, eyes on a spot in the distance.'),
      },
    },
    {
      id: 'space-mission',
      name: 'Space Mission',
      focus: 'Balance',
      intro: 'You are on a spacewalk. Slow, steady steps keep you steady out there.',
      warmup: {
        pulse: ['high-knees'],
        extra: ['heel-to-toe-walk', 'toe-walks', 'heel-walks', 'backward-walk', 'ankle-circles', 'step-toe-taps'],
        shoulder: ['arm-circles'],
        coord: ['windmills', 'hand-walk-outs'],
      },
      cooldown: ['slow-march', 'wall-stand', 'wall-angels', 'flamingo-balance'],
      mainSlots: [
        { kind: 'squat' },
        { from: ['low-step-up', 'supported-reverse-lunge'] },
        { from: ['standing-side-leg-lifts'] },
        { from: ['wall-sit'] },
        { from: ['bird-dog'] },
        { from: ['toe-walks', 'heel-walks', 'backward-walk', 'step-toe-taps'] },
      ],
      /* Flamingo is in the cool-down, so the main block uses other balance work. */
      focusIds: ['low-step-up', 'supported-reverse-lunge', 'standing-side-leg-lifts', 'wall-sit', 'flamingo-balance', 'heel-to-toe-walk', 'toe-walks', 'heel-walks', 'backward-walk', 'ankle-circles', 'step-toe-taps'],
      lines: {
        'step-jacks': line('Airlock Steps', 'Step out and in slowly, as if moving through an airlock.'),
        'high-knees': line('Cabin March', 'March in place inside the cabin, knees up, chest tall.'),
        'heel-to-toe-walk': line('Narrow Gangway', 'Walk heel to toe along a narrow gangway and look ahead.'),
        'toe-walks': line('Soft Moon Walk', 'Walk on your toes as if the floor is a quiet moon surface.'),
        'heel-walks': line('Boot Heels', 'Walk on your heels in heavy space boots, slow and tall.'),
        'backward-walk': line('Reverse Docking', 'Walk backward carefully. A grown-up watches the space behind you.'),
        'ankle-circles': line('Boot Circles', 'Draw slow circles with each foot to warm the ankles.'),
        'step-toe-taps': line('Hatch Taps', 'Tap a low step as if checking a hatch, light and tall.'),
        'arm-circles': line('Suit Circles', 'Make smooth arm circles inside a roomy space suit.'),
        'hopscotch': line('Star Stepping', 'Step or hop from star to star and stick each landing.'),
        'windmills': line('Antenna Reach', 'Hinge and reach toward the opposite shin, then stand tall.'),
        'hand-walk-outs': line('Hatch Walk-Outs', 'Walk the hands out to a straight line, then walk the feet in and stand tall.'),
        'sit-to-stand': line('Launch Chair Stand', 'Stand up from the launch chair with no hands, then sit slowly.'),
        'bodyweight-squat': line('Low Orbit Squat', 'Sit back as if into a seat, then stand tall in zero rush.'),
        'low-step-up': line('Ladder Step', 'Step onto a low rung with the whole foot and step down slowly.'),
        'supported-reverse-lunge': line('Docking Lunge', 'Hold a rail, take a short step back, and stay steady.'),
        'standing-side-leg-lifts': line('Side Thrusters', 'Hold a wall and lift one leg to the side, then lower slowly.'),
        'wall-sit': line('Steady Orbit Hold', 'Hold a comfortable wall sit and keep breathing in the quiet.'),
        'bird-dog': line('Tether Reach', 'Reach one arm and the opposite leg long, like a safety tether, hips level.'),
        'slow-march': line('Return Walk', 'Walk slowly back to the cabin and let the breathing settle.'),
        'wall-stand': line('Upright in the Cabin', 'Stand tall against the wall, chin level, as the ship steadies.'),
        'wall-angels': line('Signal Arms', 'Slide the arms up and down the wall, slow and controlled.'),
        'flamingo-balance': line('One-Leg Float', 'Stand on one leg as if floating, eyes on a star, fingertip on the wall if needed.'),
      },
    },
    {
      id: 'animal-parade',
      name: 'Animal Parade',
      focus: 'Whole-body mix',
      intro: 'Join the animal parade. Move like a different animal in each part of the walk.',
      warmup: {
        pulse: ['step-jacks', 'high-knees', 'invisible-jump-rope'],
        extra: ['skater-steps', 'step-touches', 'butt-kicks', 'side-shuffles'],
        shoulder: ['arm-circles'],
        coord: ['hopscotch', 'windmills', 'hand-walk-outs'],
      },
      cooldown: ['slow-march', 'wall-stand', 'wall-angels', 'flamingo-balance'],
      mainSlots: [
        { kind: 'squat' },
        { from: ['low-step-up', 'supported-reverse-lunge'] },
        { from: ['wall-sit', 'frog-jumps', 'star-jumps'] },
        { from: ['bird-dog', 'superkid', 'belly-down-yt-lifts'] },
        { from: ['bird-dog', 'superkid', 'belly-down-yt-lifts', 'crab-walk'] },
        { from: ['bear-crawl', 'crab-walk', 'hopscotch'] },
      ],
      /* Mix theme: the usual 3 thigh, 2 posture, 1 play shape is the focus. */
      focusIds: ['sit-to-stand', 'bodyweight-squat', 'low-step-up', 'supported-reverse-lunge', 'wall-sit', 'frog-jumps', 'star-jumps', 'bird-dog', 'superkid', 'belly-down-yt-lifts', 'crab-walk', 'bear-crawl', 'hopscotch'],
      lines: {
        'step-jacks': line('Penguin Steps', 'Step out and in like a penguin, arms up, no jump.'),
        'high-knees': line('Pony March', 'March like a pony, knees up, chest tall.'),
        'invisible-jump-rope': line('Kangaroo Rope', 'Turn the wrists and stay light, like a kangaroo skipping.'),
        'skater-steps': line('Otter Steps', 'Step side to side like an otter on a bank, with no jump.'),
        'step-touches': line('Duck Waddle Taps', 'Step side to side and tap, easy and light.'),
        'butt-kicks': line('Pony Heel Kicks', 'March and kick the heels toward the seat, tall and soft.'),
        'side-shuffles': line('Crab Shuffle', 'Shuffle sideways with soft knees and small steps.'),
        'arm-circles': line('Bird Circles', 'Make smooth wing circles, shoulders down.'),
        'hopscotch': line('Bunny Hopscotch', 'Step or hop through the squares like a bunny and land softly.'),
        'windmills': line('Elephant Reach', 'Hinge and reach toward the opposite shin, like a trunk, back flat.'),
        'hand-walk-outs': line('Caterpillar Walk', 'Walk the hands out and the feet in, then stand tall. No downward-dog hold.'),
        'sit-to-stand': line('Puppy Sit to Stand', 'Sit and stand from a sturdy chair, no hands, like a puppy learning to stand.'),
        'bodyweight-squat': line('Frog Squat', 'Sit back like a frog on a lily pad, then stand tall.'),
        'low-step-up': line('Goat Steps', 'Step onto a low rock like a sure-footed goat, then step down slowly.'),
        'supported-reverse-lunge': line('Heron Lunge', 'Hold a rail, step back, and stay tall like a heron.'),
        'wall-sit': line('Meerkat Hold', 'Hold a comfortable wall sit and look out like a meerkat.'),
        'frog-jumps': line('Frog Leap', 'Squat, jump forward, and land softly like a frog.'),
        'star-jumps': line('Flying Squirrel Star', 'Jump wide like a flying squirrel and land quietly.'),
        'bird-dog': line('Pointer Dog', 'Reach one arm and the opposite leg long, hips level, like a pointing dog.'),
        'superkid': line('Superman Lizard', 'Lift arms and legs just a little, eyes on the floor, like a lizard sunning.'),
        'belly-down-yt-lifts': line('Stingray Wings', 'Lift the arms into a Y, then a T, like a stingray gliding.'),
        'crab-walk': line('Crab Walk', 'Hips high, chest up, walk like a crab. Do not hang the head back.'),
        'bear-crawl': line('Bear Crawl', 'Walk like a bear with a flat back and small opposite steps.'),
        'slow-march': line('Parade Home', 'March slowly as the parade heads home.'),
        'wall-stand': line('Tall Giraffe', 'Stand tall like a giraffe, with the back lightly on a wall.'),
        'wall-angels': line('Swan Wings', 'Slide the arms up and down the wall like slow swan wings.'),
        'flamingo-balance': line('Flamingo Balance', 'Stand on one leg like a flamingo, eyes on a spot, fingertip on the wall if needed.'),
      },
    },
    {
      id: 'ocean-adventure',
      name: 'Ocean Adventure',
      focus: 'Strong arms and a steady body',
      intro: 'Dive in and move through the waves. Strong arms and a steady body help you swim.',
      warmup: {
        pulse: ['step-jacks', 'high-knees'],
        extra: ['arm-swings', 'step-touches'],
        shoulder: ['arm-circles'],
        coord: ['hand-walk-outs', 'windmills'],
      },
      cooldown: ['slow-march', 'wall-stand', 'wall-angels', 'flamingo-balance'],
      mainSlots: [
        { kind: 'squat' },
        { from: ['wall-push-ups'] },
        { from: ['crab-walk'] },
        { from: ['short-plank', 'tabletop-shoulder-taps', 'dead-bug'] },
        { from: ['bird-dog', 'superkid', 'belly-down-yt-lifts'] },
        { from: ['bear-crawl'] },
      ],
      focusIds: ['wall-push-ups', 'crab-walk', 'short-plank', 'tabletop-shoulder-taps', 'dead-bug', 'bird-dog', 'superkid', 'belly-down-yt-lifts', 'bear-crawl', 'hand-walk-outs', 'arm-circles', 'arm-swings'],
      lines: {
        'step-jacks': line('Wave Steps', 'Step out and in with the arms, like a small wave, no jump.'),
        'high-knees': line('Paddle March', 'March and lift the knees as if paddling through shallow water.'),
        'arm-swings': line('Swim Swings', 'Swing the arms forward and back like an easy swim stroke.'),
        'step-touches': line('Shore Taps', 'Step side to side on the shore and tap lightly.'),
        'arm-circles': line('Stroke Circles', 'Make smooth arm circles, like getting ready to swim.'),
        'hand-walk-outs': line('Shore Walk-Outs', 'Walk the hands out into the shallows, then walk the feet in.'),
        'windmills': line('Net Reach', 'Hinge and reach toward the opposite shin, back flat, like lifting a small net.'),
        'sit-to-stand': line('Up from the Tide', 'Stand up from a seat as the tide comes in, no hands, then sit slowly.'),
        'bodyweight-squat': line('Tide Squat', 'Sit back as a wave slides out, then stand tall.'),
        'wall-push-ups': line('Push the Wave', 'Press away from the wall as if pushing a wave back, body straight.'),
        'crab-walk': line('Sideways Crab', 'Walk sideways like a crab, hips high, chest up.'),
        'short-plank': line('Surfboard Hold', 'Hold a straight, short plank like a surfboard on still water.'),
        'tabletop-shoulder-taps': line('Boat Taps', 'From hands and knees, tap a shoulder, then the other, hips still like a steady boat.'),
        'dead-bug': line('Floating Bug', 'Lie on your back and lower the opposite arm and leg, slow, like floating.'),
        'bird-dog': line('Sea Star Reach', 'Reach one arm and the opposite leg long, like a sea star, hips level.'),
        'superkid': line('Gliding Ray', 'Lift just a little, eyes on the floor, like a ray gliding over sand.'),
        'belly-down-yt-lifts': line('Fin Lifts', 'Lift the arms into a Y, then a T, like slow fins.'),
        'bear-crawl': line('Sea-Lion Walk', 'Walk on hands and feet with a flat back, like a sea lion on the shore.'),
        'slow-march': line('Walk Up the Beach', 'Walk slowly up the beach and let the breathing settle.'),
        'wall-stand': line('Lighthouse Stand', 'Stand tall and still, like a lighthouse, back lightly on a wall.'),
        'wall-angels': line('Wave Arms', 'Slide the arms up and down the wall like a slow wave.'),
        'flamingo-balance': line('Heron Watch', 'Stand on one leg like a heron watching the water.'),
      },
    },
    {
      id: 'playground-games',
      name: 'Playground Games',
      focus: 'Coordination and play',
      intro: 'Recess is on. Play the games, keep the landings quiet, and have fun.',
      warmup: {
        pulse: ['step-jacks', 'high-knees', 'invisible-jump-rope'],
        extra: ['fast-feet', 'side-shuffles', 'skater-steps', 'jumping-jacks'],
        shoulder: ['arm-circles'],
        coord: ['hopscotch', 'windmills'],
      },
      cooldown: ['slow-march', 'wall-stand', 'wall-angels', 'flamingo-balance'],
      mainSlots: [
        { kind: 'squat' },
        { from: ['low-step-up', 'supported-reverse-lunge'] },
        { from: ['wall-sit', 'frog-jumps', 'star-jumps'] },
        { from: ['bear-crawl'] },
        { from: ['crab-walk'] },
        { from: ['hopscotch', 'fast-feet', 'side-shuffles', 'skater-steps'] },
      ],
      focusIds: ['hopscotch', 'frog-jumps', 'star-jumps', 'bear-crawl', 'crab-walk', 'fast-feet', 'side-shuffles', 'skater-steps', 'invisible-jump-rope', 'step-jacks', 'jumping-jacks', 'wall-sit'],
      lines: {
        'step-jacks': line('Playground Jacks', 'Step out and in, arms up, like the start of a playground game.'),
        'high-knees': line('Race-in-Place March', 'March in place as if lining up for a race, chest tall.'),
        'invisible-jump-rope': line('Recess Rope', 'Turn the wrists and stay light. March at Starter, tiny hops later if they stay quiet.'),
        'fast-feet': line('Hot Lava Feet', 'Tap the feet quickly as if the playground is hot lava. Stay light and tall.'),
        'side-shuffles': line('Sideline Shuffle', 'Shuffle sideways along the sideline, soft knees, no crossing the feet.'),
        'skater-steps': line('Playground Skaters', 'Step side to side in a small skating pattern, with no jump.'),
        'jumping-jacks': line('Full Jacks', 'Jump the feet out and in and land softly. Use Step Jacks if landings get loud.'),
        'arm-circles': line('Warm-Up Circles', 'Make smooth arm circles before the games start.'),
        'hopscotch': line('Hopscotch Game', 'Step or hop through the squares and stick the landing, tall between hops.'),
        'windmills': line('Toe-Line Reach', 'Hinge and reach toward the opposite shin, back flat, at the toe line.'),
        'sit-to-stand': line('Bench Stand', 'Stand up from the playground bench with no hands, then sit slowly.'),
        'bodyweight-squat': line('Bench Squat', 'Sit back toward an imaginary bench, then stand tall.'),
        'low-step-up': line('Stair Game', 'Step onto a low stair with the whole foot and step down slowly.'),
        'supported-reverse-lunge': line('Rail Lunge', 'Hold a rail, take a short step back, and stay tall.'),
        'wall-sit': line('Wall Wait', 'Hold a comfortable wall sit while you wait for the next game, and keep breathing.'),
        'frog-jumps': line('Playground Frog Jumps', 'Squat, jump forward, and land softly on both feet.'),
        'star-jumps': line('Star Jumps', 'Crouch, jump wide with the arms like a star, and land quietly.'),
        'bear-crawl': line('Bear Race', 'Crawl a short bear-walk race with a flat back and small steps.'),
        'crab-walk': line('Crab Race', 'Walk on hands and feet, hips high, in a short crab race.'),
        'slow-march': line('Walk to the Gate', 'Walk slowly toward the gate and let the breathing settle.'),
        'wall-stand': line('Line-Up Stand', 'Stand tall at the wall as if lining up, chin level.'),
        'wall-angels': line('Quiet Arm Slides', 'Slide the arms slowly on the wall, back and head staying put.'),
        'flamingo-balance': line('Statue Game', 'Stand on one leg like a statue, eyes on a spot, fingertip on the wall if needed.'),
      },
    },
  ];

  const THEME_BY_ID = new Map(THEMES.map(t => [t.id, t]));

  function normalizeTheme(id) {
    return THEME_BY_ID.has(id) ? id : DEFAULT_THEME;
  }
  function themeById(id) { return THEME_BY_ID.get(normalizeTheme(id)); }

  function squatMove(level) {
    return BY_ID.get(normalizeLevel(level) === 1 ? 'sit-to-stand' : 'bodyweight-squat');
  }

  function flavorName(theme, move) {
    const flav = theme.lines[move.id];
    return flav && flav.name ? flav.name + ' (' + move.name + ')' : move.name;
  }
  function flavorNote(theme, move, prefix) {
    const flav = theme.lines[move.id];
    const line = (flav && flav.line) || move.cue || move.description || '';
    return (prefix || '') + line;
  }

  function themedSlot(theme, move, level, extra) {
    const base = slotFor(move, level, extra);
    base.name = flavorName(theme, move);
    const prefix = /-r2$/.test((extra && extra.id) || '') ? 'Round 2. ' : '';
    base.note = flavorNote(theme, move, prefix);
    return base;
  }

  function pickFromIds(ids, level, rand, used, hopCount) {
    const hops = hopCount || 0;
    const allowed = m => m && offered(m, level) && used.indexOf(m) === -1;
    let pool = ids.map(id => BY_ID.get(id)).filter(m => allowed(m) && (!hopsAt(m, level) || hops === 0));
    if (!pool.length) pool = ids.map(id => BY_ID.get(id)).filter(allowed);
    if (!pool.length) throw new Error('no move available for this slot: ' + ids.join(', '));
    return pick(pool, rand);
  }

  function pickThemedWarmup(theme, level, rand) {
    const chosen = [];
    const hopCount = () => chosen.filter(m => hopsAt(m, level)).length;
    const take = ids => {
      const m = pickFromIds(ids, level, rand, chosen, hopCount());
      chosen.push(m);
      return m;
    };
    const pulse = take(theme.warmup.pulse);
    const extra = take(theme.warmup.extra);
    const shoulder = take(theme.warmup.shoulder);
    const coord = take(theme.warmup.coord);
    return [pulse, extra, shoulder, coord];
  }

  function pickThemedMain(theme, level, rand, warmup) {
    const used = (warmup || []).slice();
    return theme.mainSlots.map(slot => {
      let move;
      if (slot.kind === 'squat') move = squatMove(level);
      else move = pickFromIds(slot.from, level, rand, used, 0);
      used.push(move);
      return move;
    });
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

  /* One themed session as a linear slot list: 4 warm-up, 6 main x 2 rounds,
   * then 4 cool-down moves. Round 2 repeats round 1 with no demo. A
   * 30-second water break is added to the rest after round 1. When the
   * projection passes 20:30, round 2 drops its last move. */
  function buildSession(options) {
    const opts = options || {};
    const level = normalizeLevel(opts.level);
    const theme = themeById(opts.theme);
    const rand = typeof opts.rand === 'function' ? opts.rand : Math.random;
    const mainRest = MAIN_REST_SEC[level];
    const warmMoves = pickThemedWarmup(theme, level, rand);
    const warm = warmMoves.map(m => themedSlot(theme, m, level, { restSec: WARMUP_REST_SEC }));
    const round = pickThemedMain(theme, level, rand, warmMoves);
    const round1 = round.map((m, i) => themedSlot(theme, m, level, {
      id: m.id + '-r1',
      phase: 'main',
      setupSec: ROUND1_SETUP_SEC,
      restSec: i === round.length - 1 ? mainRest + ROUND_BREAK_SEC : mainRest,
      restLabel: i === round.length - 1 ? 'Water break' : '',
    }));
    let round2 = round.map(m => themedSlot(theme, m, level, {
      id: m.id + '-r2',
      phase: 'main',
      setupSec: ROUND2_SETUP_SEC,
      restSec: mainRest,
      demoUrl: '',
    }));
    const cool = theme.cooldown.map(id => themedSlot(theme, BY_ID.get(id), level, { restSec: COOLDOWN_REST_SEC }));
    const levelName = LEVELS[level - 1].name;
    const plan = slots => ({
      id: 'kids-' + theme.id + '-level-' + level + '-' + Math.floor(rand() * 1e9).toString(36),
      title: theme.name + ': ' + levelName + ' workout',
      targetMinutes: TARGET_MINUTES,
      theme: theme.id,
      focus: theme.focus,
      intro: theme.intro,
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
    THEMES: THEMES,
    DEFAULT_THEME: DEFAULT_THEME,
    SAFETY_NOTES: SAFETY_NOTES,
    doseAt: doseAt,
    hopsAt: hopsAt,
    normalizeTheme: normalizeTheme,
    themeById: themeById,
    buildSession: buildSession,
    seeded: seeded,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = KidsProgram;
  else root.KidsProgram = KidsProgram;
})(typeof window !== 'undefined' ? window : globalThis);
