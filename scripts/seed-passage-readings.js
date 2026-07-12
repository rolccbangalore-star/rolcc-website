const fs = require("fs");
const path = require("path");

const READINGS = {
  "matthew-17-mount-of-transfiguration": {
    reference: "Matthew 17:1-9",
    text: `1 Now after six days Jesus took Peter, James, and John his brother, led them up on a high mountain by themselves;
2 and He was transfigured before them. His face shone like the sun, and His clothes became as white as the light.
3 And behold, Moses and Elijah appeared to them, talking with Him.
4 Then Peter answered and said to Jesus, "Lord, it is good for us to be here; if You wish, let us make here three tabernacles: one for You, one for Moses, and one for Elijah."
5 While he was still speaking, behold, a bright cloud overshadowed them; and suddenly a voice came out of the cloud, saying, "This is My beloved Son, in whom I am well pleased. Hear Him!"
6 And when the disciples heard it, they fell on their faces and were greatly afraid.
7 But Jesus came and touched them and said, "Arise, and do not be afraid."
8 When they had lifted up their eyes, they saw no one but Jesus only.
9 Now as they came down from the mountain, Jesus commanded them, saying, "Tell the vision to no one until the Son of Man is risen from the dead."`,
  },
  "2-kings-4-widows-oil": {
    reference: "2 Kings 4:1-7",
    text: `1 A certain woman of the wives of the sons of the prophets cried out to Elisha, saying, "Your servant my husband is dead, and you know that your servant feared the LORD. And the creditor is coming to take my two sons to be his slaves."
2 So Elisha said to her, "What shall I do for you? Tell me, what do you have in the house?" And she said, "Your maidservant has nothing in the house but a jar of oil."
3 Then he said, "Go, borrow vessels from everywhere, from all your neighbors—empty vessels; do not gather just a few.
4 And when you have come in, you shall shut the door behind you and your sons; then pour it into all those vessels, and set aside the full ones."
5 So she went from him and shut the door behind her and her sons, who brought the vessels to her; and she poured it out.
6 Now it came to pass, when the vessels were full, that she said to her son, "Bring me another vessel." And he said to her, "There is not another vessel." So the oil ceased.
7 Then she came and told the man of God. And he said, "Go, sell the oil and pay your debt; and you and your sons live on the rest."`,
  },
  "mark-6-five-loaves-two-fish": {
    reference: "Mark 6:35-41",
    text: `35 When the day was now far spent, His disciples came to Him and said, "This is a deserted place, and already the hour is late.
36 Send them away, that they may go into the surrounding country and villages and buy themselves bread; for they have nothing to eat."
37 But He answered and said to them, "You give them something to eat." And they said to Him, "Shall we go and buy two hundred denarii worth of bread and give them something to eat?"
38 But He said to them, "How many loaves do you have? Go and see." And when they found out they said, "Five, and two fish."
39 Then He commanded them to make them all sit down in groups on the green grass.
40 So they sat down in ranks, in hundreds and in fifties.
41 And when He had taken the five loaves and the two fish, He looked up to heaven, blessed and broke the loaves, and gave them to His disciples to set before them; and the two fish He divided among them all.`,
  },
  "matthew-25-parable-of-the-talents": {
    reference: "Matthew 25:14-21",
    text: `14 "For the kingdom of heaven is like a man traveling to a far country, who called his own servants and delivered his goods to them.
15 And to one he gave five talents, to another two, and to another one, to each according to his own ability; and immediately he went on a journey.
16 Then he who had received the five talents went and traded with them, and made another five talents.
17 And likewise he who had received two gained two more also.
18 But he who had received one went and dug in the ground, and hid his lord's money.
19 After a long time the lord of those servants came and settled accounts with them.
20 So he who had received five talents came and brought five other talents, saying, "Lord, you delivered to me five talents; look, I have gained five more talents besides them."
21 His lord said to him, "Well done, good and faithful servant; you were faithful over a few things, I will make you ruler over many things. Enter into the joy of your lord."`,
  },
  "armor-fruit-gifts-spirit": {
    reference: "Ephesians 6:10-17",
    text: `10 Finally, my brethren, be strong in the Lord and in the power of His might.
11 Put on the whole armor of God, that you may be able to stand against the wiles of the devil.
12 For we do not wrestle against flesh and blood, but against principalities, against powers, against the rulers of the darkness of this age, against spiritual hosts of wickedness in the heavenly places.
13 Therefore take up the whole armor of God, that you may be able to withstand in the evil day, and having done all, to stand.
14 Stand therefore, having girded your waist with truth, having put on the breastplate of righteousness,
15 and having shod your feet with the preparation of the gospel of peace;
16 above all, taking the shield of faith with which you will be able to quench all the fiery darts of the wicked one.
17 And take the helmet of salvation, and the sword of the Spirit, which is the word of God;`,
  },
  "mountains-in-the-bible": {
    reference: "Psalm 121:1-4",
    text: `1 I will lift up my eyes to the hills—From whence comes my help?
2 My help comes from the LORD, Who made heaven and earth.
3 He will not allow your foot to be moved; He who keeps you will not slumber.
4 Behold, He who keeps Israel Shall neither slumber nor sleep.`,
  },
};

const dir = path.join(__dirname, "..", "data", "articles", "back-to-bible");
for (const file of fs.readdirSync(dir)) {
  if (!file.endsWith(".json")) continue;
  const slug = file.replace(/\.json$/, "");
  const reading = READINGS[slug];
  if (!reading) continue;
  const full = path.join(dir, file);
  const data = JSON.parse(fs.readFileSync(full, "utf8"));
  data.passageReading = reading;
  if (!data.passage) data.passage = reading.reference;
  fs.writeFileSync(full, JSON.stringify(data, null, 2) + "\n", "utf8");
  console.log("Seeded passage reading:", slug);
}
