(function (global) {
  "use strict";

  var STOP_WORDS = {
    a: 1,
    an: 1,
    and: 1,
    are: 1,
    at: 1,
    be: 1,
    can: 1,
    do: 1,
    for: 1,
    how: 1,
    i: 1,
    if: 1,
    in: 1,
    is: 1,
    it: 1,
    me: 1,
    my: 1,
    of: 1,
    on: 1,
    or: 1,
    the: 1,
    to: 1,
    we: 1,
    what: 1,
    when: 1,
    where: 1,
    who: 1,
    why: 1,
    you: 1,
    your: 1,
  };

  var TYPO_MAP = {
    chuch: "church",
    churh: "church",
    chruch: "church",
    churhc: "church",
    chirstian: "christian",
    chistian: "christian",
    cristian: "christian",
    christain: "christian",
    banglore: "bangalore",
    banaglore: "bangalore",
    bangaluru: "bangalore",
    volunter: "volunteer",
    volnteer: "volunteer",
    volenteer: "volunteer",
    counsiling: "counselling",
    counseling: "counselling",
    couneling: "counselling",
    lonley: "lonely",
    lonley: "lonely",
    visiter: "visitor",
    vist: "visit",
    visting: "visiting",
    prayr: "prayer",
    preyer: "prayer",
    paryer: "prayer",
    kidz: "kids",
    childrens: "children",
    ministery: "ministry",
    minstry: "ministry",
    felowship: "fellowship",
    followship: "fellowship",
    sundy: "sunday",
    sevice: "service",
    servise: "service",
    memeber: "member",
    memebership: "membership",
    baptisim: "baptism",
    comunty: "community",
    commuity: "community",
    intrduce: "introduce",
    regster: "register",
    registraion: "registration",
  };

  var SEARCH_INTENTS = [
    {
      triggers: ["first time", "first visit", "new here", "what to expect", "what expect", "visitor", "walk in"],
      keywords: ["visit", "first", "expect", "wear", "walk", "welcome", "register", "observe"],
      topics: ["visiting"],
    },
    {
      triggers: ["not christian", "non christian", "non-christian", "hindu", "muslim", "atheist", "other faith", "believe before"],
      keywords: ["christian", "believe", "explore", "curious", "faith", "pace"],
      topics: ["faith-questions", "visiting"],
    },
    {
      triggers: ["lonely", "alone", "no friends", "make friends", "connect", "community", "belong", "invisible", "homesick"],
      keywords: ["friend", "lonely", "connect", "belong", "community", "relationship"],
      topics: ["belonging-community"],
    },
    {
      triggers: ["kids", "children", "childcare", "river kids", "my child", "parent", "family"],
      keywords: ["child", "kids", "parent", "family", "ministry", "program"],
      topics: ["families-kids"],
    },
    {
      triggers: ["volunteer", "serve", "serving", "ministry team", "worship team", "join team", "purpose"],
      keywords: ["volunteer", "serve", "worship", "team", "ministry", "calling"],
      topics: ["serving-ministry"],
    },
    {
      triggers: ["pray", "prayer", "counselling", "counseling", "pastor", "talk to someone", "crisis", "grief", "support"],
      keywords: ["pray", "counsell", "support", "pastor", "hope", "help"],
      topics: ["prayer-support"],
    },
    {
      triggers: ["bangalore", "hsr", "location", "address", "where", "find church", "near me"],
      keywords: ["bangalore", "hsr", "find", "church", "moved", "layout"],
      topics: ["visiting"],
    },
    {
      triggers: ["sunday", "service time", "worship service", "when", "timing"],
      keywords: ["sunday", "service", "worship", "time", "attend"],
      topics: ["visiting", "general"],
    },
    {
      triggers: ["member", "membership", "join church", "become member"],
      keywords: ["member", "membership", "join", "belong", "community"],
      topics: ["belonging-community", "general"],
    },
    {
      triggers: ["cell fellowship", "small group", "midweek", "bible study group"],
      keywords: ["cell", "fellowship", "group", "midweek", "connect"],
      topics: ["belonging-community", "general"],
    },
  ];

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function levenshtein(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;

    var row = [];
    var i;
    var j;

    for (i = 0; i <= b.length; i++) row[i] = i;

    for (i = 1; i <= a.length; i++) {
      var prev = i - 1;
      row[0] = i;
      for (j = 1; j <= b.length; j++) {
        var tmp = row[j];
        var cost = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
        row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost);
        prev = tmp;
      }
    }

    return row[b.length];
  }

  function fixTypo(word) {
    var lower = word.toLowerCase();
    return TYPO_MAP[lower] || word;
  }

  function tokenize(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[^\w\s']/g, " ")
      .split(/\s+/)
      .map(function (word) {
        return fixTypo(word.replace(/'/g, ""));
      })
      .filter(function (word) {
        return word.length > 1 && !STOP_WORDS[word];
      });
  }

  function uniqueTokens(list) {
    var seen = {};
    var out = [];
    list.forEach(function (token) {
      if (!seen[token]) {
        seen[token] = true;
        out.push(token);
      }
    });
    return out;
  }

  function expandQuery(rawQuery) {
    var normalized = String(rawQuery || "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ");
    var tokens = tokenize(normalized);
    var expandedTokens = uniqueTokens(tokens.slice());
    var intents = [];

    tokens.forEach(function (token) {
      Object.keys(TYPO_MAP).forEach(function (typo) {
        if (levenshtein(token, typo) <= 1) expandedTokens.push(TYPO_MAP[typo]);
      });
    });

    SEARCH_INTENTS.forEach(function (intent) {
      var matched = intent.triggers.some(function (trigger) {
        return normalized.indexOf(trigger) !== -1 || fuzzyPhraseMatch(normalized, trigger) >= 0.82;
      });

      if (!matched) {
        matched = intent.triggers.some(function (trigger) {
          return tokenOverlapScore(tokenize(trigger), tokens) >= 0.5;
        });
      }

      if (matched) {
        intents.push(intent);
        intent.keywords.forEach(function (keyword) {
          expandedTokens.push(keyword);
        });
      }
    });

    tokens.forEach(function (token) {
      SEARCH_INTENTS.forEach(function (intent) {
        intent.keywords.forEach(function (keyword) {
          if (fuzzyWordScore(token, keyword) >= 0.78) {
            intents.push(intent);
            expandedTokens.push(keyword);
          }
        });
      });
    });

    return {
      raw: normalized,
      tokens: uniqueTokens(expandedTokens),
      intents: intents,
    };
  }

  function fuzzyWordScore(a, b) {
    if (!a || !b) return 0;
    if (a === b) return 1;
    if (a.length >= 3 && b.indexOf(a) !== -1) return 0.9;
    if (b.length >= 3 && a.indexOf(b) !== -1) return 0.88;

    var dist = levenshtein(a, b);
    var maxLen = Math.max(a.length, b.length);
    if (maxLen <= 4) return dist <= 1 ? 0.75 : 0;
    var ratio = 1 - dist / maxLen;
    return ratio >= 0.68 ? ratio : 0;
  }

  function fuzzyPhraseMatch(phrase, target) {
    var phraseTokens = tokenize(phrase);
    var targetTokens = tokenize(target);
    if (!phraseTokens.length || !targetTokens.length) return 0;
    return tokenOverlapScore(targetTokens, phraseTokens);
  }

  function tokenOverlapScore(needles, haystack) {
    if (!needles.length) return 0;
    var hits = 0;
    needles.forEach(function (needle) {
      var best = 0;
      haystack.forEach(function (token) {
        best = Math.max(best, fuzzyWordScore(needle, token));
      });
      if (best >= 0.72) hits += best;
    });
    return hits / needles.length;
  }

  function phraseSequenceScore(text, query) {
    var textTokens = tokenize(text);
    var queryTokens = tokenize(query);
    if (!queryTokens.length || !textTokens.length) return 0;

    var best = 0;
    for (var i = 0; i < textTokens.length; i++) {
      var matched = 0;
      var qi = 0;
      for (var j = i; j < textTokens.length && qi < queryTokens.length; j++) {
        if (fuzzyWordScore(textTokens[j], queryTokens[qi]) >= 0.72) {
          matched += 1;
          qi += 1;
        }
      }
      best = Math.max(best, matched / queryTokens.length);
    }
    return best;
  }

  function bestTokenMatchScore(queryTokens, textTokens, questionWeight) {
    var score = 0;
    queryTokens.forEach(function (queryToken) {
      var best = 0;
      textTokens.forEach(function (textToken) {
        best = Math.max(best, fuzzyWordScore(queryToken, textToken));
      });
      if (best >= 0.72) score += best * questionWeight;
    });
    return score;
  }

  function scoreFaq(faq, rawQuery, expanded) {
    var query = expanded.raw;
    if (!query) return 0;

    var question = String(faq.question || "").toLowerCase();
    var answer = String(faq.answer || "").toLowerCase();
    var topicLabel = String(faq.topicLabel || faq.topic || "").toLowerCase();
    var blob = question + " " + answer + " " + topicLabel;
    var questionTokens = tokenize(question);
    var answerTokens = tokenize(answer);
    var score = 0;

    if (question.indexOf(query) !== -1) score += 220;
    else if (answer.indexOf(query) !== -1) score += 90;

    score += phraseSequenceScore(question, query) * 160;
    score += phraseSequenceScore(answer, query) * 45;

    score += bestTokenMatchScore(expanded.tokens, questionTokens, 34);
    score += bestTokenMatchScore(expanded.tokens, answerTokens, 12);
    score += tokenOverlapScore(expanded.tokens, tokenize(blob)) * 40;

    expanded.intents.forEach(function (intent) {
      if (intent.topics.indexOf(faq.topic) !== -1) score += 28;
      intent.keywords.forEach(function (keyword) {
        if (blob.indexOf(keyword) !== -1) score += 12;
      });
    });

    if (topicLabel.indexOf(query) !== -1) score += 55;

    score += (faq.priority || 0) * 3;
    score -= Math.min(faq.sortOrder || 0, 150) * 0.02;

    return score;
  }

  function minScoreForQuery(query) {
    var len = String(query || "").trim().length;
    if (len <= 2) return 22;
    if (len <= 4) return 16;
    return 12;
  }

  function rankFaqs(faqs, state, options) {
    var topic = state.category || "all";
    var query = String(state.q || "").trim();
    var pool = faqs.filter(function (faq) {
      return topic === "all" || faq.topic === topic;
    });

    if (!query) {
      return pool.map(function (faq) {
        return { faq: faq, score: 0 };
      });
    }

    var expanded = expandQuery(query);
    var minScore = (options && options.minScore) || minScoreForQuery(query);

    return pool
      .map(function (faq) {
        return { faq: faq, score: scoreFaq(faq, query, expanded) };
      })
      .filter(function (result) {
        return result.score >= minScore;
      })
      .sort(function (a, b) {
        return b.score - a.score || (a.faq.sortOrder || 0) - (b.faq.sortOrder || 0);
      });
  }

  function searchFaqs(faqs, state) {
    return rankFaqs(faqs, state).map(function (result) {
      return result.faq;
    });
  }

  function getSuggestions(faqs, state, limit) {
    var max = limit || 6;
    var query = String(state.q || "").trim();
    if (query.length < 2) return [];

    var ranked = rankFaqs(faqs, state, { minScore: Math.max(8, minScoreForQuery(query) - 6) });
    if (!ranked.length) {
      ranked = rankFaqs(faqs, Object.assign({}, state, { category: "all" }), { minScore: 8 });
    }

    return ranked.slice(0, max).map(function (result) {
      return {
        faq: result.faq,
        score: result.score,
        label: result.faq.question,
      };
    });
  }

  function highlightSmart(text, rawQuery) {
    if (!rawQuery) return escapeHtml(text);
    var expanded = expandQuery(rawQuery);
    var source = String(text);
    var lower = source.toLowerCase();
    var ranges = [];

    if (lower.indexOf(expanded.raw) !== -1) {
      ranges.push({ start: lower.indexOf(expanded.raw), end: lower.indexOf(expanded.raw) + expanded.raw.length });
    }

    expanded.tokens.forEach(function (token) {
      if (token.length < 3) return;
      var pattern = new RegExp("\\b" + escapeRegExp(token) + "\\w*", "gi");
      var match;
      while ((match = pattern.exec(source))) {
        ranges.push({ start: match.index, end: match.index + match[0].length });
      }
    });

    if (!ranges.length) {
      return escapeHtml(source);
    }

    ranges.sort(function (a, b) {
      return a.start - b.start;
    });

    var merged = [];
    ranges.forEach(function (range) {
      var last = merged[merged.length - 1];
      if (!last || range.start > last.end) merged.push(range);
      else last.end = Math.max(last.end, range.end);
    });

    var html = "";
    var cursor = 0;
    merged.forEach(function (range) {
      html += escapeHtml(source.slice(cursor, range.start));
      html += '<mark class="faq-highlight">' + escapeHtml(source.slice(range.start, range.end)) + "</mark>";
      cursor = range.end;
    });
    html += escapeHtml(source.slice(cursor));
    return html;
  }

  global.FAQSearch = {
    expandQuery: expandQuery,
    scoreFaq: scoreFaq,
    searchFaqs: searchFaqs,
    getSuggestions: getSuggestions,
    highlightSmart: highlightSmart,
  };
})(window);
