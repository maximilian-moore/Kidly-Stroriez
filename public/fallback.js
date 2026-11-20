// Offline demo story (NFR-02): used when there is no network or no AI key, so the
// demo always works. {hero} is replaced with the chosen hero's name.
window.FALLBACK = {
  plan: {
    safe: true,
    title: "The Shiny Red Kite",
    theme: "Sharing and taking turns",
    lesson: "Sharing makes fun bigger, and when we get it wrong we can say sorry and try again.",
    setting: "Willow Meadow on a breezy afternoon, under the old oak tree.",
    echo: "Like today, the hero and a friend both want the same toy. Your child gets to decide what happens next.",
    choices: ["Who gets to fly the kite first", "What to do when the friend looks sad"],
  },
  parts: [
    {
      text: "One breezy afternoon, {hero} skipped into Willow Meadow. Under the old oak tree lay something wonderful: a shiny red kite with a long, twirly tail. \"Ooh!\" said {hero}. But just then, Moss the hedgehog came bustling up the path. \"Ooh!\" said Moss, at exactly the same moment. They both looked at the kite. Then they looked at each other. They both wanted to fly it. The wind tugged at the kite's tail, as if it was saying, \"Hurry up and decide!\"",
      options: ["Grab the kite and run off with it", "Ask Moss if they can take turns", "Hold on tight and shout \"It's mine!\""],
    },
  ],
  middles: [
    "{hero} grabbed the kite and ran. Up it went, swooping and dipping! But flying it alone was strangely quiet. Back by the oak tree, Moss sat very still with a wobbly lip. {hero}'s tummy felt funny, like a tiny knot inside. The kite flapped in the wind, waiting.",
    "\"Moss,\" said {hero}, \"shall we take turns?\" Moss's prickles relaxed. \"Yes, please! You can go first.\" Up went the kite, swooping and dipping, while Moss cheered. When it was Moss's turn, the wind dropped and the kite flopped down. Moss's face fell. \"Oh no,\" said Moss quietly.",
    "\"It's mine!\" shouted {hero}, holding on tight. \"Mine!\" said Moss, holding on too. They tugged and pulled until RIIIP! A little tear appeared in the kite's tail. They both let go. Moss looked at the ground, and {hero}'s cheeks felt hot and prickly. Nobody was having any fun at all.",
  ],
  secondOptions: ["Say sorry and offer to share", "Keep the kite all to themselves", "Ask Moss to fly it together"],
  endings: [
    "{hero} took a deep breath. \"I'm sorry, Moss. Let's share.\" Moss smiled the biggest smile. They took turns, and the kite danced across the pink evening sky. When the sun began to sleep, they walked home side by side, yawning happy yawns. {hero} snuggled into bed thinking: sharing made the fun twice as big.",
    "{hero} kept the kite. It flew high, but it felt lonely up there, and so did {hero}. Moss walked slowly home. {hero} thought about Moss's sad face, then ran after Moss. \"Wait! I'm sorry. Will you fly it with me tomorrow?\" Moss nodded. That night {hero} fell asleep with a warm, light heart, because saying sorry had put things right.",
    "\"Let's fly it together!\" said {hero}. They held the string side by side, four paws on one line. The kite soared higher than ever, right up to where the first star was blinking. \"Best kite day ever,\" whispered Moss. Later, tucked in bed, {hero} smiled sleepily. Doing things together made everything better.",
  ],
  lesson: "Sharing makes fun bigger, and if we get it wrong, we can say sorry and try again.",
  questions: [
    "Was there a time today when you and someone else wanted the same thing?",
    "How do you think Moss felt in the story?",
    "What could you try next time, like the hero did?",
  ],
};
