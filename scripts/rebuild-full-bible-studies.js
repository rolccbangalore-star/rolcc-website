const fs = require("fs");
const path = require("path");
const { shuffleQuizItem, hashSeed } = require("./article-config");
const { splitSourceIntoSections, splitStructuredBody, readStudySourceFile } = require("./bible-study-sections");

const DATA_DIR = path.join(__dirname, "..", "data", "articles", "back-to-bible");

function cleanSource(text) {
  return String(text || "")
    .replace(/\r/g, "")
    .replace(/--\s*\d+\s+of\s+\d+\s*--/g, "")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
    .replace(/\uFFFD/g, "")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function writeStudy(slug, data) {
  data.quiz = (data.quiz || []).map((item) =>
    shuffleQuizItem(item, hashSeed(slug + "|" + item.question))
  );
  fs.writeFileSync(path.join(DATA_DIR, slug + ".json"), JSON.stringify(data, null, 2) + "\n", "utf8");
  console.log("Wrote", slug);
}

const studies = {
  "2-kings-4-widows-oil": {
    title: "2 Kings 4:1-7 — The Widow's Oil & God's Provision",
    description:
      "A Back to the Bible cell fellowship study on God's provision through faith and obedience — walking through each scene in 2 Kings 4:1-7.",
    passage: "2 Kings 4:1-7",
    tags: ["Bible Study", "Faith"],
    date: "2026-07-10",
    sections: [
      {
        heading: "Observe",
        body: cleanSource(`
1. THE WIDOW'S CRY FOR HELP (2 Kings 4:1)

What's happening:
A widow comes to Elisha crying for help. Her husband was one of the "sons of the prophets." He has died and left debt behind. Now the creditor wants to take her two sons as servants.

Important background:
In Bible times, creditors could take children to work until the debt was paid (Exodus 21:2; Leviticus 25:39).

Main point:
This is not only a money problem — it is a family crisis.

2. ELISHA ASKS A QUESTION (2 Kings 4:2)

"What shall I do for you? Tell me, what do you have in the house?"

What's happening:
Elisha asks the widow what she already has. She replies that she has only a small jar of oil.

Important lesson:
God often begins with what we already have, even if it seems small (Exodus 4:2).

3. THE INSTRUCTION TO BORROW VESSELS (2 Kings 4:3)

"Borrow vessels from everywhere… empty vessels; do not gather just a few."

What's happening:
Elisha tells her to borrow many empty jars from neighbours. This required humility, faith, and expectation.

Important insight:
The widow had to prepare before the miracle happened.

Main lesson:
Faith prepares room for God's blessing.

4. SHUT THE DOOR (2 Kings 4:4)

"Go in and shut the door behind you and your sons."

What's happening:
Elisha tells her to pour the oil privately inside the house.

Possible reasons:
- To remove fear and distraction
- To build private faith
- To focus completely on God

Important lesson:
Many miracles begin in private before becoming public (Matthew 6:6; Mark 5:40).

5. THE OIL BEGINS TO FLOW (2 Kings 4:5)

"She poured it out."

What's happening:
The widow obeys Elisha exactly. As she pours, the oil keeps multiplying.

Important lesson:
The miracle began after obedience (James 2:17).

6. THE VESSELS ARE FILLED (2 Kings 4:6)

"Bring me another vessel."

What's happening:
Every vessel becomes full. Finally there are no more empty vessels. Then: "The oil ceased."

Important insight:
The oil stopped only when there were no more vessels.

Main lesson:
God's power was not limited — the vessels were limited.

Spiritual meaning:
Empty vessels can represent hearts ready for God (Ephesians 3:20).

7. THE DEBT IS PAID (2 Kings 4:7)

"Go, sell the oil and pay your debt."

What's happening:
The widow tells Elisha what happened. He tells her to sell the oil, pay the debt, and live on the remaining money.

Important lesson:
God's provision was more than enough. God did not only solve the immediate problem — He also provided for the future (Philippians 4:19).
        `),
      },
      {
        heading: "Interpret",
        body: cleanSource(`
MAIN THEMES OF THE PASSAGE

GOD CARES FOR ORDINARY PEOPLE
This miracle shows that God cares about family struggles, financial problems, and daily needs (1 Peter 5:7).

GOD USES SMALL THINGS
The widow had only a small jar of oil, but God used it for a great miracle (Zechariah 4:10).

OBEDIENCE BRINGS BLESSING
The miracle happened when the widow obeyed (James 1:22).

FAITH MAKES ROOM FOR MIRACLES
Borrowing many vessels showed expectation and faith (Hebrews 11:6).

GOD'S PROVISION NEVER FAILS
God provided debt payment, family protection, and future provision (Psalm 37:25).

What does oil symbolize in the Bible?
Oil often represents God's blessing, Spirit, and provision. Empty vessels represent hearts ready for God to fill.
        `),
      },
      {
        heading: "Apply",
        body: cleanSource(`
FINAL CONCLUSION

The story of the widow's oil teaches us:
- God sees our pain
- God can use small things
- Faith requires obedience
- God's provision is more than enough

A small jar of oil became the answer to a great crisis because God's power was working through it. When human resources ended, God's provision began.

Have you ever experienced God's provision? Why does God sometimes use small things? To show that His power is greater than human strength.
        `),
      },
    ],
    discussionQuestions: [
      "Who was the prophet in this story, and what crisis did the widow face?",
      "Why did Elisha ask her to borrow vessels — and why 'not a few'?",
      "Why was the door shut before the oil began to flow?",
      "When did the miracle begin, and when did the oil stop flowing?",
      "What do empty vessels represent spiritually in this story?",
      "Have you ever experienced God's provision in a season of need?",
    ],
    quiz: [
      {
        question: "Who was the prophet in this story?",
        options: ["Elisha", "Elijah", "Isaiah", "Samuel"],
        correctIndex: 0,
        explanation: "The widow came to Elisha for help.",
      },
      {
        question: "What did the widow have in her house?",
        options: ["A small jar of oil", "Ten silver coins", "A bag of grain", "Nothing at all"],
        correctIndex: 0,
        explanation: "God began with what she already had.",
      },
      {
        question: "Why did Elisha say 'not a few' vessels?",
        options: [
          "Because God wanted her to expect a great blessing",
          "Because the neighbours demanded it",
          "Because the oil was impure",
          "Because Elisha needed containers for himself",
        ],
        correctIndex: 0,
        explanation: "Faith prepares room for God's blessing.",
      },
      {
        question: "When did the oil stop flowing?",
        options: [
          "When there were no more empty vessels",
          "After one hour",
          "When Elisha arrived",
          "When the creditor left",
        ],
        correctIndex: 0,
        explanation: "God's power was not limited — the vessels were limited.",
      },
      {
        question: "What is one main lesson from this passage?",
        options: [
          "God can provide for every need when we trust and obey Him",
          "God only helps those with many resources",
          "Miracles happen without obedience",
          "Debt should be ignored",
        ],
        correctIndex: 0,
        explanation: "Obedience and faith opened the way for provision.",
      },
    ],
  },
};

// Load source files for remaining studies
const sources = {
  "matthew-25-parable-of-the-talents": fs.readFileSync(
    path.join(__dirname, "..", "data", "_source-parable-of-the-talents.txt"),
    "utf8"
  ),
  "mark-6-five-loaves-two-fish": fs.readFileSync(
    path.join(__dirname, "..", "data", "_source-miracle-in-5-bread-2-fish-back-to-bible.txt"),
    "utf8"
  ),
  "mountains-in-the-bible": fs.readFileSync(path.join(__dirname, "..", "data", "_source-mountains.txt"), "utf8"),
  "armor-fruit-gifts-spirit": fs.readFileSync(path.join(__dirname, "..", "data", "_source-armor.txt"), "utf8"),
};

function splitByMarkers(text, markers) {
  const parts = {};
  let rest = cleanSource(text);
  for (let i = 0; i < markers.length; i++) {
    const start = markers[i];
    const end = markers[i + 1];
    const startIdx = rest.indexOf(start.label);
    if (startIdx < 0) continue;
    const sliceStart = startIdx + start.label.length;
    const sliceEnd = end ? rest.indexOf(end.label, sliceStart) : rest.length;
    parts[start.key] = rest.slice(sliceStart, sliceEnd < 0 ? rest.length : sliceEnd).trim();
  }
  return parts;
}

// Matthew 25 — map source sections
const talentsSource = cleanSource(sources["matthew-25-parable-of-the-talents"]);
const talentsRewardIdx = talentsSource.search(/REWARD FOR FAITHFULNESS/i);
const talentsProblemIdx = talentsSource.search(/\bPROBLEM\b/);
studies["matthew-25-parable-of-the-talents"] = {
  title: "Matthew 25:14-30 — The Parable of the Talents",
  description:
    "A Back to the Bible study on faithfulness with what God has given — gifts, time, opportunities, and calling.",
  passage: "Matthew 25:14-30",
  tags: ["Bible Study", "Stewardship"],
  date: "2026-07-01",
  sections: [
    {
      heading: "Observe",
      body: talentsRewardIdx > 0 ? talentsSource.slice(0, talentsRewardIdx).trim() : talentsSource,
    },
    {
      heading: "Interpret",
      body:
        talentsRewardIdx > 0 && talentsProblemIdx > talentsRewardIdx
          ? talentsSource.slice(talentsRewardIdx, talentsProblemIdx).trim()
          : "",
    },
    {
      heading: "Apply",
      body: talentsProblemIdx > 0 ? talentsSource.slice(talentsProblemIdx).trim() : "",
    },
  ],
  discussionQuestions: [
    "What talents has God given me?",
    "Am I using or hiding my gifts?",
    "Am I faithful in small things?",
    "Is fear stopping my obedience?",
    "What can I invest for God's kingdom today?",
  ],
  quiz: [
    {
      question: "How many talents did the first faithful servant receive?",
      options: ["Five", "Two", "One", "Ten"],
      correctIndex: 0,
      explanation: "Matthew 25:15 — each received according to his ability.",
    },
    {
      question: "What did the servant with one talent do?",
      options: ["He hid it in the ground", "He invested it with bankers", "He gave it away", "He doubled it"],
      correctIndex: 0,
      explanation: "Fear led him to bury his talent.",
    },
    {
      question: "What did the master say to the faithful servants?",
      options: [
        "Well done, good and faithful servant",
        "You should have hidden more",
        "Return only what you received",
        "You received too much",
      ],
      correctIndex: 0,
      explanation: "Both faithful servants received the same praise.",
    },
    {
      question: "What kept the unfaithful servant from acting?",
      options: ["Fear", "Lack of ability", "Sickness", "Travel"],
      correctIndex: 0,
      explanation: "He said he was afraid and hid the talent.",
    },
    {
      question: "What happens to unused gifts in this parable?",
      options: [
        "They can be taken away and given to the faithful",
        "They remain safely buried",
        "They automatically double",
        "They are never examined",
      ],
      correctIndex: 0,
      explanation: "Matthew 25:28-29 — faithfulness increases capacity.",
    },
  ],
};

// Mark 6 — split observe/interpret/apply
const markSource = cleanSource(sources["mark-6-five-loaves-two-fish"]);
studies["mark-6-five-loaves-two-fish"] = {
  title: "Mark 6:35-44 — Five Loaves and Two Fish",
  description:
    "A cell fellowship study on Jesus feeding the five thousand — how God sees provision where we see shortage.",
  passage: "Mark 6:35-44",
  tags: ["Bible Study", "Faith"],
  date: "2026-07-08",
  sections: [
    {
      heading: "Observe",
      body: markSource.split("BONUS INSIGHT")[0].trim(),
    },
    {
      heading: "Interpret",
      body: cleanSource(`
The disciples saw a problem before they saw possibility. Jesus challenged them to give what they did not think they had, then asked what was already in their hands. He brought order, blessed what was surrendered, broke it, and gave it through the disciples. Everyone ate and was filled, and twelve baskets remained.

The size of the miracle: about five thousand men were fed — and including women and children, the crowd may have been much larger. Nothing is impossible for Jesus; the size of the need does not limit God's power.
      `),
    },
    {
      heading: "Apply",
      body: cleanSource(markSource.split("BONUS INSIGHT")[1] || ""),
    },
  ],
  discussionQuestions: [
    "Where do you tend to see shortage before you see God's provision?",
    "What has God already placed in your hands that you may be overlooking?",
    "What would surrender look like for you this week?",
    "Why do you think the disciples' hearts were hardened even after the miracle of the loaves?",
  ],
  quiz: [
    {
      question: "What did the disciples want to do when evening came?",
      options: [
        "Send the crowd away to buy food",
        "Pray on the mountain",
        "Buy bread themselves immediately",
        "Leave Jesus and return to Capernaum",
      ],
      correctIndex: 0,
      explanation: "They saw only lack in a deserted place.",
    },
    {
      question: "How many loaves and fish did the disciples find?",
      options: ["Five loaves and two fish", "Seven loaves", "Twelve loaves", "Two loaves and five fish"],
      correctIndex: 0,
      explanation: "Jesus started with what they had.",
    },
    {
      question: "What did Jesus do before the food was distributed?",
      options: [
        "He blessed and broke the loaves",
        "He sent the crowd home",
        "He bought bread from a village",
        "He told the disciples to fast",
      ],
      correctIndex: 0,
      explanation: "Blessing came before multiplication.",
    },
    {
      question: "How much food was left after everyone ate?",
      options: ["Twelve baskets of fragments", "None", "Five baskets", "One basket"],
      correctIndex: 0,
      explanation: "God's provision overflowed.",
    },
    {
      question: "Why were the disciples amazed on the sea (Mark 6:52)?",
      options: [
        "They had not understood about the loaves",
        "They had too much food",
        "They refused to enter the boat",
        "They did not see Jesus",
      ],
      correctIndex: 0,
      explanation: "Their hearts were hardened to the lesson of the miracle.",
    },
  ],
};

// Mountains — observe gets almost all source; interpret symbols; apply summary
const mountainsSource = cleanSource(sources["mountains-in-the-bible"]);
const mountainsSymbolIdx = mountainsSource.search(/WHAT DO MOUNTAINS SYMBOL/i);
const mountainsSummaryIdx = mountainsSource.search(/\bSUMMARY\b/);
studies["mountains-in-the-bible"] = {
  title: "Mountains in the Bible — Places of Revelation and God's Presence",
  description:
      "A Back to the Bible overview study on key mountains in Scripture — where God met His people, revealed His glory, and shaped salvation history.",
  passage: "Selected passages across the Old and New Testaments",
  tags: ["Bible Study", "Teaching"],
  date: "2026-07-03",
  sections: [
    {
      heading: "Observe",
      body: mountainsSymbolIdx > 0 ? mountainsSource.slice(0, mountainsSymbolIdx).trim() : mountainsSource,
    },
    {
      heading: "Interpret",
      body:
        mountainsSymbolIdx > 0 && mountainsSummaryIdx > mountainsSymbolIdx
          ? mountainsSource.slice(mountainsSymbolIdx, mountainsSummaryIdx).trim()
          : "",
    },
    {
      heading: "Apply",
      body: cleanSource(`
${mountainsSummaryIdx > 0 ? mountainsSource.slice(mountainsSummaryIdx) : ""}

We all need mountain moments — times of prayer, Bible reading, worship, and quiet with God. But God does not take us to the mountain to escape life. He prepares us there for the valley.

Icebreaker: Can anybody say a Bible verse that mentions a mountain?
      `),
    },
  ],
  discussionQuestions: [
    "Can you name a Bible verse that mentions a mountain?",
    "Which mountain story in Scripture speaks to you most, and why?",
    "Where do you go — or could you go — for quiet time with God?",
    "How does Jesus' use of mountains shape the way you think about prayer and teaching?",
  ],
  quiz: [
    {
      question: "On which mountain did Noah's ark come to rest?",
      options: ["Mount Ararat", "Mount Sinai", "Mount Carmel", "Mount Zion"],
      correctIndex: 0,
      explanation: "Genesis 8:4 — keyword: New Beginning.",
    },
    {
      question: "What significant event happened at Mount Moriah?",
      options: [
        "Abraham offered Isaac and God provided a ram",
        "The Ten Commandments were given",
        "Elijah challenged Baal's prophets",
        "Jesus gave the Great Commission",
      ],
      correctIndex: 0,
      explanation: "Moriah points to sacrifice and God's provision.",
    },
    {
      question: "Where was Jesus crucified?",
      options: ["Golgotha (Calvary)", "Mount Tabor", "Mount Nebo", "Mount Carmel"],
      correctIndex: 0,
      explanation: "Golgotha — keyword: Redemption.",
    },
    {
      question: "What do mountains often symbolise in Scripture?",
      options: [
        "God's presence, worship, and revelation",
        "Human achievement alone",
        "Escape from obedience",
        "Political power only",
      ],
      correctIndex: 0,
      explanation: "Mountains are places where God met His people.",
    },
    {
      question: "At Mount Carmel, what did God prove?",
      options: [
        "He alone is the true God",
        "Israel needed no covenant",
        "Ba'al was equally powerful",
        "Elijah should flee",
      ],
      correctIndex: 0,
      explanation: "1 Kings 18 — keyword: Victory.",
    },
  ],
};

// Armor — full source in observe/interpret/apply split
const armorSource = cleanSource(sources["armor-fruit-gifts-spirit"]);
const armorFunctionalIdx = armorSource.search(/FUNCTIONAL ASPECTS/i);
const armorCompareIdx = armorSource.search(/PRACTICAL COMPARISON/i);
studies["armor-fruit-gifts-spirit"] = {
  title: "Armor of God, Fruit of the Spirit, Gifts of the Spirit",
  description:
    "A Back to the Bible study comparing three essential aspects of the Christian life — standing firm, growing in character, and serving others.",
  passage: "Ephesians 6:10-18; Galatians 5:22-23; 1 Corinthians 12:7-11",
  tags: ["Bible Study", "Holy Spirit"],
  date: "2026-07-05",
  sections: [
    {
      heading: "Observe",
      body: armorFunctionalIdx > 0 ? armorSource.slice(0, armorFunctionalIdx).trim() : armorSource,
    },
    {
      heading: "Interpret",
      body:
        armorFunctionalIdx > 0 && armorCompareIdx > armorFunctionalIdx
          ? armorSource.slice(armorFunctionalIdx, armorCompareIdx).trim()
          : "",
    },
    {
      heading: "Apply",
      body: armorCompareIdx > 0 ? armorSource.slice(armorCompareIdx).trim() : "",
    },
  ],
  discussionQuestions: [
    "Which of the three areas — armor, fruit, or gifts — do you focus on most?",
    "Which area do you tend to neglect?",
    "Can someone have spiritual gifts without spiritual maturity?",
    "How do the armor, fruit, and gifts work together in the life of a believer?",
  ],
  quiz: [
    {
      question: "What is the main purpose of the armor of God?",
      options: ["To stand against the enemy", "To become famous", "To replace prayer", "To earn salvation"],
      correctIndex: 0,
      explanation: "Ephesians 6:11 — to stand against the wiles of the devil.",
    },
    {
      question: "What is the fruit of the Spirit meant to produce?",
      options: ["Christlike character", "Public recognition", "Financial increase", "Freedom from all conflict"],
      correctIndex: 0,
      explanation: "Galatians 5 — inward transformation.",
    },
    {
      question: "Why are spiritual gifts given according to 1 Corinthians 12:7?",
      options: ["For the profit of all", "For personal status", "To avoid serving", "Only for leaders"],
      correctIndex: 0,
      explanation: "Gifts build up the body of Christ.",
    },
    {
      question: "In the soldier analogy, what does the fruit of the Spirit represent?",
      options: ["The soldier's character", "The soldier's weapons", "The soldier's orders", "The soldier's uniform"],
      correctIndex: 0,
      explanation: "Fruit shapes who the believer is becoming.",
    },
    {
      question: "What does a mature believer need according to this study?",
      options: [
        "Armor, fruit, and gifts together",
        "Gifts without character",
        "Only one of the three areas",
        "Avoiding spiritual warfare",
      ],
      correctIndex: 0,
      explanation: "God desires believers who are protected, transformed, and empowered.",
    },
  ],
};

// Matthew 17 — expand from docx structure
studies["matthew-17-mount-of-transfiguration"] = {
  title: "Matthew 17:1-9 — The Mount of Transfiguration",
  description:
    "A cell fellowship study on seeing Jesus clearly, hearing Him fully, and following Him faithfully.",
  passage: "Matthew 17:1-9",
  tags: ["Bible Study", "Discipleship"],
  date: "2026-06-17",
  sections: [
    {
      heading: "Observe",
      body: cleanSource(`
THE MOUNT OF TRANSFIGURATION
Seeing Jesus Clearly · Listening to Jesus Fully · Following Jesus Faithfully

Main Scripture: Matthew 17:1-9
Theme Verse: "This is My beloved Son, in whom I am well pleased. Hear Him!" — Matthew 17:5

Icebreaker: If Jesus invited you to spend one whole day alone with Him, what would you ask Him?

WHAT IS THE TRANSFIGURATION?
A change in appearance that reveals true glory. Jesus did not become someone else. For a moment, the disciples saw His divine glory.

THE PEOPLE ON THE MOUNTAIN
Jesus — The Son of God
Peter — Human enthusiasm
James — Faithful witness
John — The beloved disciple
Moses — The Law
Elijah — The Prophets
God the Father — Divine confirmation

THREE GREAT REVELATIONS
1. Jesus is the Son of God.
2. Jesus is greater than everything else.
3. Jesus must be heard.

THE MOUNTAIN EXPERIENCE
God separates us from distractions before giving us revelation. We all need prayer, Bible reading, worship, and quiet time.

THE VALLEY EXPERIENCE
God does not take us to the mountain to escape life. He takes us there to prepare us for life.

PETER'S RESPONSE
Peter wanted to build three tabernacles. God corrected him and pointed everyone to Jesus.

THE MOST BEAUTIFUL MOMENT
Jesus came and touched the fearful disciples and comforted them.
      `),
    },
    {
      heading: "Interpret",
      body: cleanSource(`
The transfiguration was not Jesus becoming someone else — for a moment, the disciples saw His true divine glory. Moses (the Law) and Elijah (the Prophets) pointed to Jesus as the fulfilment of all Scripture. God's command to hear Jesus means He is greater than every other voice.

The mountain experience was not an escape from life but preparation for the valley ahead. Peter's instinct to build tabernacles shows how easily we try to preserve a spiritual moment instead of obeying what God is saying.

PRACTICAL LIFE LESSONS FROM THE PASSAGE
- Worship Jesus.
- Trust Him.
- Put Him first.
- Obey His Word.
- Spend time with God.
- Walk with Jesus daily.
- Face challenges with faith.
      `),
    },
    {
      heading: "Apply",
      body: cleanSource(`
CONCLUSION
The Mount of Transfiguration was not about changing Jesus. It was about changing the disciples' understanding of Jesus.

God often separates us from distractions before He gives revelation. We need prayer, Bible reading, worship, and quiet time — not only on special days, but as a way of life. Worship Jesus. Trust Him. Put Him first. Obey His Word. Walk with Him daily, and face your challenges with faith.
      `),
    },
  ],
  discussionQuestions: [
    "If Jesus invited you to spend one whole day alone with Him, what would you ask Him?",
    "What part of this story impacted you most?",
    "What voice distracts you most from hearing Jesus?",
    "What mountain experience has strengthened your faith?",
    "What valley are you currently facing, and what is one thing Jesus is asking you to obey this week?",
  ],
  activities: [
    {
      title: "Closing prayer",
      body: "Lord Jesus, open our eyes to see You more clearly, open our ears to hear You more faithfully, and give us hearts that will follow You completely. Amen.",
    },
  ],
  quiz: [
    {
      question: "Who appeared with Jesus on the mountain?",
      options: ["Moses and Elijah", "Peter and John", "Angels from heaven", "David and Solomon"],
      correctIndex: 0,
      explanation: "Moses and Elijah talked with Jesus.",
    },
    {
      question: "What did God's voice from the cloud say?",
      options: [
        "This is My beloved Son; hear Him!",
        "Build three tabernacles here",
        "Return to Jerusalem at once",
        "The kingdom has fully come",
      ],
      correctIndex: 0,
      explanation: "The Father confirmed Jesus' identity.",
    },
    {
      question: "What was Peter's response on the mountain?",
      options: [
        "He offered to build three shelters",
        "He ran down the mountain",
        "He denied knowing Jesus",
        "He fell asleep",
      ],
      correctIndex: 0,
      explanation: "Peter wanted to preserve the moment.",
    },
    {
      question: "What did Jesus do when the disciples were afraid?",
      options: [
        "He touched them and told them not to be afraid",
        "He sent them away alone",
        "He rebuked them harshly",
        "He hid from them",
      ],
      correctIndex: 0,
      explanation: "Jesus comforted them with His presence.",
    },
    {
      question: "What is the main purpose of the transfiguration for the disciples?",
      options: [
        "To reveal who Jesus truly is before the cross",
        "To escape ministry demands",
        "To replace the need for faith",
        "To begin a new religion",
      ],
      correctIndex: 0,
      explanation: "The event prepared them to understand Jesus' glory.",
    },
  ],
};

const sourceSectionFiles = {
  "2-kings-4-widows-oil": "_source-back-to-bible.txt",
  "matthew-25-parable-of-the-talents": "_source-parable-of-the-talents.txt",
  "mark-6-five-loaves-two-fish": "_source-miracle-in-5-bread-2-fish-back-to-bible.txt",
  "mountains-in-the-bible": "_source-mountains.txt",
  "armor-fruit-gifts-spirit": "_source-armor.txt",
};

Object.entries(sourceSectionFiles).forEach(([slug, fileName]) => {
  if (!studies[slug]) return;
  const filePath = path.join(__dirname, "..", "data", fileName);
  if (!fs.existsSync(filePath)) return;
  studies[slug].sections = splitSourceIntoSections(readStudySourceFile(filePath));
});

if (studies["matthew-17-mount-of-transfiguration"]) {
  const combined = studies["matthew-17-mount-of-transfiguration"].sections.map((section) => section.body).join("\n\n");
  studies["matthew-17-mount-of-transfiguration"].sections = splitStructuredBody(combined);
}

for (const [slug, data] of Object.entries(studies)) {
  writeStudy(slug, {
    author: "ROLCC Fellowship Team",
    category: "Bible Study",
    thumbnail: "/images/og-image.jpg",
    featured: false,
    includeQuiz: true,
    publish: true,
    activities: data.activities || [],
    ...data,
  });
}
