/**
 * Add Personal Caring FAQs to faqs-source-v2.csv (idempotent by ID).
 */
const { loadV2Rows, writeV2Rows, updateDedupSummary } = require("./faq-v2-utils");

const NEW_FAQS = [
  {
    ID: "Q0464",
    Question: "What does ROLCC believe about salvation?",
    Answer:
      "Salvation is a gift from God. It cannot be earned. Because of God's love, He sent His Son, Jesus, to die for the sin that separates us from Him, and Jesus rose again in victory over sin and death. We receive this gift by faith in Jesus Christ.",
    Category: "Faith & Exploring Christianity",
    Scripture: "",
    "Suggested Page": "salvation",
    MergeGroup: "pcare-salvation",
  },
  {
    ID: "Q0465",
    Question: "Why is following Jesus so important?",
    Answer:
      "God made people to live in relationship with Him. Following Jesus is how you were created to live. Until we surrender our lives to God and live according to His Word, we remain separated from Him and misaligned from our purpose.",
    Category: "Faith & Exploring Christianity",
    Scripture: "",
    "Suggested Page": "salvation",
    MergeGroup: "pcare-salvation",
  },
  {
    ID: "Q0466",
    Question: "Why did Jesus need to die for my sins?",
    Answer:
      "Sin separates us from God, and the penalty for sin requires a perfect sacrifice. Jesus came as a human, lived a perfect life, and gave Himself so we no longer have to be separated from God.",
    Category: "Faith & Exploring Christianity",
    Scripture: "",
    "Suggested Page": "salvation",
    MergeGroup: "pcare-salvation",
  },
  {
    ID: "Q0467",
    Question: "Where do I start reading the Bible?",
    Answer:
      "Start with the Gospel of John. It clearly shows who Jesus is and what it means to believe in Him. You can also explore our Bible Study pages for guided passages and discussion.",
    Category: "Faith & Exploring Christianity",
    Scripture: "",
    "Suggested Page": "salvation",
    MergeGroup: "pcare-salvation",
  },
  {
    ID: "Q0468",
    Question: "What should I do after I decide to follow Jesus?",
    Answer:
      "Tell someone you trust at church, keep reading the Bible (start with John), and take your next steps in community—Sunday worship, Cell Fellowship, and baptism when you are ready. Our pastors and Caring Team are glad to walk with you.",
    Category: "Faith & Exploring Christianity",
    Scripture: "",
    "Suggested Page": "salvation",
    MergeGroup: "pcare-salvation",
  },
  {
    ID: "Q0469",
    Question: "Can someone pray with me even if I am new to church?",
    Answer:
      "Yes. You are welcome to ask for prayer whether you have attended once or for many years. You do not need to have everything figured out first.",
    Category: "Care & Hope",
    Scripture: "",
    "Suggested Page": "prayer-request",
    MergeGroup: "pcare-prayer",
  },
  {
    ID: "Q0470",
    Question: "Will my prayer request stay private?",
    Answer:
      "We treat prayer needs with care. Prayer requests are shared with the pastor, the Prayer Team Leader, and co-ordinators who help carry the request in prayer. Share only what you are comfortable sharing. If you prefer limited circulation, tell us when you send your request.",
    Category: "Care & Hope",
    Scripture: "",
    "Suggested Page": "prayer-request",
    MergeGroup: "pcare-prayer",
  },
  {
    ID: "Q0471",
    Question: "How do I send a prayer request?",
    Answer:
      'Use the Contact page and choose "Prayer Request" as the topic, or use the Prayer Request page. You can also speak with a pastor after Sunday service.',
    Category: "Care & Hope",
    Scripture: "",
    "Suggested Page": "prayer-request",
    MergeGroup: "pcare-prayer",
  },
  {
    ID: "Q0472",
    Question: "What if I need more than prayer?",
    Answer:
      "We can help connect you with pastoral counselling, Cell Fellowship, or other church care. Prayer is often the first step, not the only one.",
    Category: "Care & Hope",
    Scripture: "",
    "Suggested Page": "prayer-request",
    MergeGroup: "pcare-prayer",
  },
  {
    ID: "Q0473",
    Question: "Does baptism save me?",
    Answer:
      "No. Salvation is a gift from God through faith in Jesus Christ. Baptism does not save you. It is the public declaration of a decision you have already made to follow Him.",
    Category: "Faith & Exploring Christianity",
    Scripture: "",
    "Suggested Page": "baptism",
    MergeGroup: "pcare-baptism",
  },
  {
    ID: "Q0474",
    Question: "Who can be baptised at ROLCC?",
    Answer:
      "We practise believer's baptism by immersion. Baptism is for those who understand the gospel, have personally placed their faith in Jesus, and want to publicly declare that decision. We do not baptise infants or young children who cannot yet understand and take this step for themselves. Our pastoral team will talk with you during preparation to make sure this step is clear and meaningful.",
    Category: "Faith & Exploring Christianity",
    Scripture: "",
    "Suggested Page": "baptism",
    MergeGroup: "pcare-baptism",
  },
  {
    ID: "Q0475",
    Question: "How do I arrange a baptism?",
    Answer:
      "Contact us and share that you would like to be baptised. We will follow up with preparation details, timing, and pastoral guidance for the ceremony.",
    Category: "Faith & Exploring Christianity",
    Scripture: "",
    "Suggested Page": "baptism",
    MergeGroup: "pcare-baptism",
  },
  {
    ID: "Q0476",
    Question: "I am not sure about salvation yet. Where should I start?",
    Answer:
      "Start with the Salvation page. Baptism comes after a decision to follow Jesus. We would be glad to talk with you, pray with you, and help you take that first step.",
    Category: "Faith & Exploring Christianity",
    Scripture: "",
    "Suggested Page": "baptism",
    MergeGroup: "pcare-baptism",
  },
  {
    ID: "Q0477",
    Question: 'What does "a three-strand cord" mean for marriage?',
    Answer:
      "Ecclesiastes 4:12 points to strength in unity. In Christian marriage, husband and wife walk together, and Christ is the third strand. When God is at the centre, the covenant has a strength that hardship alone cannot easily break.",
    Category: "Young Families & Couples",
    Scripture: "Ecclesiastes 4:12",
    "Suggested Page": "marriage",
    MergeGroup: "pcare-marriage",
  },
  {
    ID: "Q0478",
    Question: "Can ROLCC help with our wedding?",
    Answer:
      "Yes. We host wedding ceremonies and collaborate with the bride, groom, and their families on arrangements. We also offer pre-marital counselling. For church members, we can support weddings in Bangalore and outside Bangalore, depending on timing and pastoral availability. Contact us early with your preferred timeline so our team can guide you.",
    Category: "Young Families & Couples",
    Scripture: "",
    "Suggested Page": "marriage",
    MergeGroup: "pcare-marriage",
  },
  {
    ID: "Q0479",
    Question: "Do you offer pre-marital counselling?",
    Answer:
      "Yes. Our counselling ministry includes pre-marital support. Sessions are confidential and focused on helping couples prepare well in faith and practical life together.",
    Category: "Young Families & Couples",
    Scripture: "",
    "Suggested Page": "marriage",
    MergeGroup: "pcare-marriage",
  },
  {
    ID: "Q0480",
    Question: "What if we are already married and need help?",
    Answer:
      "You are welcome. Reach out through Contact or Counselling. We will listen, pray with you, and help you find pastoral support for the season you are in.",
    Category: "Young Families & Couples",
    Scripture: "",
    "Suggested Page": "marriage",
    MergeGroup: "pcare-marriage",
  },
  {
    ID: "Q0481",
    Question: "How do I become a member at ROLCC?",
    Answer:
      "Membership is a thoughtful next step, not a rushed decision. We ask you to attend for a season, participate actively in church life, and then be onboarded by the Director of the Caring Team, who will walk you through what the church does for a member and what membership means in our family. When you are ready, contact us or speak with a pastor after Sunday service.",
    Category: "Belonging & Loneliness",
    Scripture: "",
    "Suggested Page": "membership",
    MergeGroup: "pcare-membership",
  },
  {
    ID: "Q0482",
    Question: "What does membership include at ROLCC?",
    Answer:
      "Membership is a way of saying “this is my church family.” It helps us care for you well and opens clearer pathways for pastoral support around life's milestones—such as baptism, weddings, dedications, and other church care—alongside belonging, accountability, and shared responsibility in the life of the church. The Director of the Caring Team will explain the full picture during onboarding.",
    Category: "Belonging & Loneliness",
    Scripture: "",
    "Suggested Page": "membership",
    MergeGroup: "pcare-membership",
  },
];

function main() {
  const rows = loadV2Rows();
  const byId = new Map(rows.map((r) => [r.ID.trim(), r]));
  let added = 0;
  let updated = 0;

  NEW_FAQS.forEach((faq) => {
    const row = {
      ID: faq.ID,
      Answer: faq.Answer,
      Category: faq.Category,
      Confidence: "High",
      "Needs Review": "",
      Question: faq.Question,
      "Review Question": "",
      Scripture: faq.Scripture || "",
      Status: "Approved",
      "Suggested Page": faq["Suggested Page"] || "",
      MergeGroup: faq.MergeGroup || "",
      CanonicalID: faq.ID,
      AltQuestions: "",
      Publish: "Yes",
    };

    if (byId.has(faq.ID)) {
      const existing = byId.get(faq.ID);
      Object.assign(existing, row);
      updated += 1;
    } else {
      rows.push(row);
      byId.set(faq.ID, row);
      added += 1;
    }
  });

  writeV2Rows(rows);
  const summary = updateDedupSummary(rows);
  console.log(
    `Personal Caring FAQs: added ${added}, updated ${updated}. Published total: ${summary.publishedFaqs}`
  );
}

main();
