/**
 * Events Calendar - populate tables and add-to-calendar
 */
(function () {
  var LOCATION = "ROLCC HSR Layout";

  var RECURRING_EVENTS = [
    { title: "Sunday Worship English", time: "10:00 AM", frequency: "Every Sunday", rrule: "FREQ=WEEKLY;BYDAY=SU", day: 0, hour: 10, min: 0, duration: 90, link: "services.html", linkLabel: "Worship Services" },
    { title: "Sunday Worship Tamil", time: "8:00 AM", frequency: "Every Sunday", rrule: "FREQ=WEEKLY;BYDAY=SU", day: 0, hour: 8, min: 0, duration: 90, link: "services.html", linkLabel: "Worship Services" },
    { title: "Holy Communion", time: "10:00 AM", frequency: "1st Sunday (Monthly)", rrule: "FREQ=MONTHLY;BYDAY=1SU", day: 0, hour: 10, min: 0, duration: 90, link: "membership.html", linkLabel: "Membership" },
    { title: "Worship Evening", time: "7:00 PM", frequency: "3rd Saturday", rrule: "FREQ=MONTHLY;BYDAY=3SA", day: 6, hour: 19, min: 0, duration: 120, link: "services.html", linkLabel: "Worship Services" },
    { title: "Fasting Prayer", time: "11:00 AM", frequency: "Every Friday", rrule: "FREQ=WEEKLY;BYDAY=FR", day: 5, hour: 11, min: 0, duration: 60 },
    { title: "Mid Week Fellowship", time: "8:00 PM", frequency: "Every Wednesday", rrule: "FREQ=WEEKLY;BYDAY=WE", day: 3, hour: 20, min: 0, duration: 120, link: "fellowship.html", linkLabel: "Cell Fellowship" },
    { title: "Cottage Prayer", time: "8:00 PM", frequency: "Every Tuesday (slots)", rrule: "FREQ=WEEKLY;BYDAY=TU", day: 2, hour: 20, min: 0, duration: 90, link: "fellowship.html", linkLabel: "Cell Fellowship" },
    { title: "River Kids", time: "3:00 PM & 5:00 PM", frequency: "Every Saturday", rrule: "FREQ=WEEKLY;BYDAY=SA", day: 6, hour: 15, min: 0, duration: 90, link: "river-kids.html", linkLabel: "River Kids" },
    { title: "Online Cell (Eden Stream)", time: "11:00 AM", frequency: "Every Saturday", rrule: "FREQ=WEEKLY;BYDAY=SA", day: 6, hour: 11, min: 0, duration: 60, link: "fellowship.html", linkLabel: "Cell Fellowship" },
    { title: "Watch Night Fellowship", time: "9:00 PM", frequency: "Mid-month (Monthly)", rrule: "FREQ=MONTHLY", day: 0, hour: 21, min: 0, duration: 120, link: "fellowship.html", linkLabel: "Cell Fellowship" },
    { title: "Badminton Fellowship", time: "4:00 PM", frequency: "Yearly twice", rrule: "", day: 6, hour: 16, min: 0, duration: 120, link: "fellowship.html", linkLabel: "Cell Fellowship" },
    { title: "Grand Bible Quiz", time: "2:00 PM", frequency: "Yearly once", rrule: "", day: 0, hour: 14, min: 0, duration: 180, link: "services.html", linkLabel: "Worship Services" }
  ];

  var ANNUAL_EVENTS = [
    { title: "Kids Summer Camp", time: "TBD", frequency: "May (3rd week)", link: "river-kids.html", linkLabel: "River Kids" },
    { title: "ROL's School of Music Annual Day", time: "TBD", frequency: "4 July" },
    { title: "Movie Night", time: "TBD", frequency: "14 August", link: "fellowship.html", linkLabel: "Cell Fellowship" },
    { title: "Brisket Day", time: "6:00 PM", frequency: "28 October", link: "fellowship.html", linkLabel: "Cell Fellowship" },
    { title: "Holy Spirit Renewal Conference", time: "TBD", frequency: "20–21 November", link: "services.html", linkLabel: "Worship Services" },
    { title: "ROLF Jr Christmas Celebration", time: "TBD", frequency: "12 December", link: "rolf.html", linkLabel: "ROLF" },
    { title: "Christmas Celebration", time: "TBD", frequency: "20 December", link: "services.html", linkLabel: "Worship Services" },
    { title: "New Year Watch Night Service", time: "TBD", frequency: "31 December", link: "fellowship.html", linkLabel: "Cell Fellowship" },
    { title: "ROLF Kids Christmas Celebration", time: "TBD", frequency: "December", link: "rolf.html", linkLabel: "ROLF" },
    { title: "Church Day", time: "TBD", frequency: "Annual" },
    { title: "Resurrection Sunday", time: "TBD", frequency: "Easter", link: "services.html", linkLabel: "Worship Services" },
    { title: "Women's Sunday", time: "TBD", frequency: "Annual" },
    { title: "Father's Day", time: "TBD", frequency: "21 June" },
    { title: "Mother's Day", time: "TBD", frequency: "10 May" },
    { title: "Good Friday", time: "TBD", frequency: "Easter weekend", link: "services.html", linkLabel: "Worship Services" }
  ];

  function pad2(n) { return (n < 10 ? "0" : "") + n; }

  function getNextOccurrence(ev) {
    var d = new Date();
    var targetDay = ev.day;
    var targetHour = ev.hour || 10;
    var targetMin = ev.min || 0;
    if (ev.month) {
      d.setMonth(ev.month - 1);
      d.setDate(15);
    }
    if (ev.rrule && ev.rrule.indexOf("BYDAY=1SU") >= 0) {
      d.setDate(1);
      while (d.getDay() !== 0) d.setDate(d.getDate() + 1);
    } else if (ev.rrule && ev.rrule.indexOf("BYDAY=3SA") >= 0) {
      d.setDate(1);
      var satCount = 0;
      while (satCount < 3) {
        if (d.getDay() === 6) satCount++;
        if (satCount < 3) d.setDate(d.getDate() + 1);
      }
    } else if (targetDay !== undefined) {
      var diff = (targetDay + 7 - d.getDay()) % 7;
      if (diff === 0 && d.getDay() !== targetDay) diff = 7;
      d.setDate(d.getDate() + diff);
    }
    d.setHours(targetHour, targetMin, 0, 0);
    if (d <= new Date()) {
      if (ev.rrule && ev.rrule.indexOf("WEEKLY") >= 0) d.setDate(d.getDate() + 7);
      else if (ev.rrule && ev.rrule.indexOf("MONTHLY") >= 0) d.setMonth(d.getMonth() + 1);
    }
    return d;
  }

  function toGoogleDate(d) {
    return d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate()) + "T" + pad2(d.getHours()) + pad2(d.getMinutes()) + "00";
  }

  function toICSDate(d) {
    return d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate()) + "T" + pad2(d.getHours()) + pad2(d.getMinutes()) + "00";
  }

  function openGoogleCalendar(ev) {
    var d = getNextOccurrence(ev);
    var end = new Date(d.getTime() + (ev.duration || 60) * 60000);
    var base = "https://calendar.google.com/calendar/render?action=TEMPLATE";
    var params = [
      "text=" + encodeURIComponent(ev.title),
      "dates=" + toGoogleDate(d) + "/" + toGoogleDate(end),
      "details=" + encodeURIComponent(ev.frequency + " at ROLCC. " + (ev.time || "")),
      "location=" + encodeURIComponent(LOCATION)
    ];
    window.open(base + "&" + params.join("&"), "_blank", "noopener");
  }

  function generateICS(ev) {
    var d = getNextOccurrence(ev);
    var end = new Date(d.getTime() + (ev.duration || 60) * 60000);
    var ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//ROLCC//Events//EN",
      "BEGIN:VEVENT",
      "DTSTART:" + toICSDate(d),
      "DTEND:" + toICSDate(end),
      "SUMMARY:" + ev.title.replace(/\n/g, " "),
      "DESCRIPTION:" + (ev.frequency + " at ROLCC. " + (ev.time || "")).replace(/\n/g, " "),
      "LOCATION:" + LOCATION
    ];
    if (ev.rrule) ics.push("RRULE:" + ev.rrule);
    ics.push("END:VEVENT", "END:VCALENDAR");
    var blob = new Blob([ics.join("\r\n")], { type: "text/calendar;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = ev.title.replace(/[^a-z0-9]/gi, "-") + ".ics";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function renderAddToCalendar(ev, isRecurring) {
    var div = document.createElement("div");
    div.className = "flex flex-wrap items-center gap-2";
    var gBtn = document.createElement("button");
    gBtn.type = "button";
    gBtn.className = "text-xs font-medium text-accent hover:text-accentSoft transition";
    gBtn.textContent = "Google";
    gBtn.addEventListener("click", function () { openGoogleCalendar(ev); });
    var iBtn = document.createElement("button");
    iBtn.type = "button";
    iBtn.className = "text-xs font-medium text-accent hover:text-accentSoft transition";
    iBtn.textContent = "Download .ics";
    iBtn.addEventListener("click", function () { generateICS(ev); });
    div.appendChild(gBtn);
    div.appendChild(document.createTextNode(" · "));
    div.appendChild(iBtn);
    if (ev.link) {
      var sep = document.createElement("span");
      sep.className = "text-slate-300";
      sep.textContent = " · ";
      div.appendChild(sep);
      var knowMore = document.createElement("a");
      knowMore.href = ev.link;
      knowMore.className = "text-xs font-medium text-accent hover:text-accentSoft transition";
      knowMore.textContent = "Know more";
      knowMore.setAttribute("aria-label", "Learn more about " + (ev.linkLabel || ev.title));
      div.appendChild(knowMore);
    }
    return div;
  }

  function renderRecurringRow(ev) {
    var tr = document.createElement("tr");
    tr.className = "border-b border-slate-100 hover:bg-slate-50/50 transition";
    tr.innerHTML =
      "<td class=\"py-3 px-2 text-sm font-medium text-slate-900\">" + ev.title + "</td>" +
      "<td class=\"py-3 px-2 text-sm text-slate-600\">" + ev.time + "</td>" +
      "<td class=\"py-3 px-2 text-sm text-slate-600\">" + ev.frequency + "</td>" +
      "<td class=\"py-3 px-2\"></td>";
    var addCell = tr.querySelector("td:last-child");
    if (ev.day !== undefined || ev.month) {
      addCell.appendChild(renderAddToCalendar(ev, true));
    } else {
      addCell.innerHTML = "<span class=\"text-xs text-slate-400\">—</span>";
    }
    return tr;
  }

  function renderAnnualRow(ev) {
    var tr = document.createElement("tr");
    tr.className = "border-b border-slate-100 hover:bg-slate-50/50 transition";
    var simpleEv = { title: ev.title, time: ev.time, frequency: ev.frequency, day: 0, hour: 10, min: 0, duration: 60 };
    if (ev.frequency === "December") simpleEv.month = 12;
    if (ev.frequency === "June") simpleEv.month = 6;
    if (ev.frequency === "May") simpleEv.month = 5;
    if (ev.link) { simpleEv.link = ev.link; simpleEv.linkLabel = ev.linkLabel; }
    tr.innerHTML =
      "<td class=\"py-3 px-2 text-sm font-medium text-slate-900\">" + ev.title + "</td>" +
      "<td class=\"py-3 px-2 text-sm text-slate-600\">" + ev.time + "</td>" +
      "<td class=\"py-3 px-2 text-sm text-slate-600\">" + ev.frequency + "</td>" +
      "<td class=\"py-3 px-2\"></td>";
    tr.querySelector("td:last-child").appendChild(renderAddToCalendar(simpleEv, false));
    return tr;
  }

  document.addEventListener("DOMContentLoaded", function () {
    var recurringBody = document.getElementById("recurring-events-body");
    var annualBody = document.getElementById("annual-events-body");
    if (recurringBody) {
      RECURRING_EVENTS.forEach(function (ev) {
        recurringBody.appendChild(renderRecurringRow(ev));
      });
    }
    if (annualBody) {
      ANNUAL_EVENTS.forEach(function (ev) {
        annualBody.appendChild(renderAnnualRow(ev));
      });
    }

    // Tab switching
    var tabs = document.querySelectorAll(".events-tab");
    var panels = document.querySelectorAll(".events-panel");
    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        var target = tab.getAttribute("data-tab");
        tabs.forEach(function (t) {
          t.classList.toggle("is-active", t.getAttribute("data-tab") === target);
          t.classList.toggle("border-accent", t.getAttribute("data-tab") === target);
          t.classList.toggle("bg-accent/5", t.getAttribute("data-tab") === target);
          t.classList.toggle("border-slate-200", t.getAttribute("data-tab") !== target);
        });
        panels.forEach(function (p) {
          p.classList.toggle("hidden", p.id !== "panel-" + target);
        });
      });
    });
    if (tabs[0]) {
      tabs[0].classList.add("border-accent", "bg-accent/5");
      tabs[1].classList.add("border-slate-200");
    }
  });
})();
