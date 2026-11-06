/**
 * Dynamic EPG Generator matching Xfinity X1 Guide layout & timing
 */

const SHOW_CATALOG = {
  News: [
    { title: "The Rachel Maddow Show", desc: "In-depth political analysis, investigative reporting and policy debate.", dur: 60, rating: "TV-PG" },
    { title: "Morning Edition Live", desc: "Top breaking national and international headlines with field correspondents.", dur: 60, rating: "TV-PG" },
    { title: "World News Roundup", desc: "Comprehensive international news, economics and global market updates.", dur: 30, rating: "TV-PG" },
    { title: "Prime Headlines Tonight", desc: "Rolling evening coverage with expert roundtable analysis.", dur: 60, rating: "TV-14" },
    { title: "Global Market Pulse", desc: "Stock exchange closing bells, currency movements and tech earnings.", dur: 30, rating: "TV-G" },
    { title: "Special Investigative Report", desc: "Exclusive deep dives and whistle-blower interviews.", dur: 60, rating: "TV-14" }
  ],
  Sports: [
    { title: "The Golf Fix", desc: "Top teaching pros break down swing mechanics, putting drills and course strategy.", dur: 30, rating: "TV-G" },
    { title: "Action Sports Showcase", desc: "Extreme downhill biking, motocross stunts, and big wave surfing.", dur: 60, rating: "TV-14" },
    { title: "Live From the Red Carpet: Primetime", desc: "Pre-game arrivals, player interviews and exclusive backstage access.", dur: 60, rating: "TV-PG" },
    { title: "Championship Tour Highlights", desc: "Every clutch buzzer beater and top 10 plays from this week.", dur: 30, rating: "TV-PG" },
    { title: "College Gameday Live", desc: "Live preview analysis, weather conditions and keys to victory.", dur: 90, rating: "TV-PG" }
  ],
  Movies: [
    { title: "Dr. Seuss' The Lorax", desc: "A 12-year-old boy searches for the one thing that will enable him to win the affection of the girl of his dreams: a real Truffula tree.", dur: 60, rating: "TV-PG" },
    { title: "ParaNorman", desc: "A misunderstood local boy takes on ghosts, zombies and full-grown adults to save his town from a centuries-old curse.", dur: 60, rating: "TV-PG" },
    { title: "Face Off", desc: "Talented special effects makeup artists compete in elaborate sci-fi and horror creature challenges.", dur: 60, rating: "TV-14" },
    { title: "2000s Classic Cinema", desc: "Blockbuster action feature from the golden decade of practical stunts.", dur: 90, rating: "TV-MA" },
    { title: "Midnight Action Feature", desc: "Elite operatives navigate hostile territory to rescue hostages.", dur: 120, rating: "TV-14" }
  ],
  Animation: [
    { title: "Dr. Seuss' The Lorax", desc: "Animated classic following the guardian of the forest.", dur: 60, rating: "TV-PG" },
    { title: "ParaNorman", desc: "Stop-motion comedy thriller about a boy who speaks with the supernatural.", dur: 60, rating: "TV-PG" },
    { title: "Classic Anime Block", desc: "Supernatural ninja battles, cosmic tournaments, and legendary mechas.", dur: 60, rating: "TV-14" },
    { title: "Saturday Morning Legends", desc: "Timeless slapstick animation and wacky animated adventures.", dur: 30, rating: "TV-Y7" }
  ],
  Kids: [
    { title: "Dr. Seuss' The Lorax", desc: "Heartwarming musical adaptation of Dr. Seuss' timeless ecological fable.", dur: 60, rating: "TV-G" },
    { title: "ParaNorman", desc: "A young hero uses his supernatural gifts to protect his neighborhood.", dur: 60, rating: "TV-Y7" },
    { title: "Kids Pop Music Hour", desc: "High-energy dance music videos, sing-alongs and animated dance routines.", dur: 30, rating: "TV-Y" },
    { title: "Nature Explorers Club", desc: "Discover fascinating wildlife and animal habitats across the globe.", dur: 30, rating: "TV-G" }
  ],
  Documentary: [
    { title: "NASA ISS Live: Earth Orbit", desc: "Spectacular ultra-HD views of planet Earth from space station cameras.", dur: 90, rating: "TV-G" },
    { title: "Cosmic Odyssey: Deep Space", desc: "James Webb Telescope discoveries exploring the earliest galaxies.", dur: 60, rating: "TV-G" },
    { title: "Mediterranean Scenic Journey", desc: "Pristine coastlines, coastal sunsets and mountain panoramas.", dur: 60, rating: "TV-G" }
  ],
  Music: [
    { title: "Live From the Red Carpet: Emmy Awards", desc: "Celebrity interviews, fashion arrivals and pre-show buzz.", dur: 90, rating: "TV-PG" },
    { title: "1HD Global Video Countdown", desc: "The top 20 international chart-topping hits and electronic music sets.", dur: 60, rating: "TV-14" },
    { title: "Acoustic Sunset Sessions", desc: "Intimate acoustic performances and tranquil chillout melodies.", dur: 60, rating: "TV-G" }
  ],
  Comedy: [
    { title: "Ridiculous Epic Fails", desc: "Viral stunts gone wrong, caught-on-camera moments and laughs.", dur: 30, rating: "TV-14" },
    { title: "Classic Sitcom Hour", desc: "Beloved ensemble comedy filled with quick banter and timeless gags.", dur: 30, rating: "TV-PG" }
  ],
  Entertainment: [
    { title: "Face Off", desc: "Contestants tackle intricate makeup challenges to create living creatures.", dur: 60, rating: "TV-14" },
    { title: "Live From the Red Carpet", desc: "Glitz, glamour, interviews and awards show previews.", dur: 60, rating: "TV-PG" },
    { title: "Prime Time Spotlight", desc: "Exclusive behind-the-scenes looks at upcoming Hollywood releases.", dur: 30, rating: "TV-PG" }
  ]
};

/**
 * Format time slot matching Xfinity X1 guide:
 * e.g. "6:00 p", "6:30 p", "7:00 p", "7:30 p", "8:00 p"
 */
export function formatXfinityTime(date) {
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'p' : 'a';
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${ampm}`;
}

/**
 * Returns time slot objects starting from the nearest half hour:
 * [{ date, label: "6:00 p", timestamp }]
 */
export function getXfinityTimeSlots(referenceDate = new Date(), totalSlots = 6) {
  const slots = [];
  const start = new Date(referenceDate);
  const minutes = start.getMinutes();
  const roundedMin = minutes >= 30 ? 30 : 0;
  start.setMinutes(roundedMin, 0, 0);

  for (let i = 0; i < totalSlots; i++) {
    const slotTime = new Date(start.getTime() + i * 30 * 60 * 1000);
    slots.push({
      date: slotTime,
      timestamp: slotTime.getTime(),
      label: formatXfinityTime(slotTime)
    });
  }
  return slots;
}

/**
 * Generate full program schedule for a channel
 */
export function getChannelPrograms(channel, referenceDate = new Date()) {
  const category = SHOW_CATALOG[channel.category] ? channel.category : 'News';
  const catalog = SHOW_CATALOG[category] || SHOW_CATALOG['News'];

  // Specific canonical programs for specific channels matching the Xfinity photo
  if (channel.number === 1) {
    catalog.unshift(
      { title: "Dr. Seuss' The Lorax", desc: "A 12-year-old boy searches for the one thing that will enable him to win the affection of the girl of his dreams: a real Truffula tree.", dur: 60, rating: "TV-PG" }
    );
  } else if (channel.number === 2) {
    catalog.unshift(
      { title: "Face Off", desc: "Talented special effects makeup artists compete in elaborate creature challenges.", dur: 60, rating: "TV-14" }
    );
  } else if (channel.number === 3) {
    catalog.unshift(
      { title: "Live From the Red Carpet: The 2012 Primetime Emmy...", desc: "Red carpet arrivals, fashion highlights and pre-show interviews.", dur: 60, rating: "TV-PG" }
    );
  } else if (channel.number === 4) {
    catalog.unshift(
      { title: "The Golf Fix", desc: "Breed helps golfers improve their swings with simple, effective drills.", dur: 30, rating: "TV-G" }
    );
  } else if (channel.number === 5) {
    catalog.unshift(
      { title: "The Rachel Maddow Show", desc: "Smart, in-depth political commentary, critical news analysis and interviews.", dur: 60, rating: "TV-PG" }
    );
  } else if (channel.number === 6) {
    catalog.unshift(
      { title: "ParaNorman", desc: "A misunderstood boy takes on ghosts, zombies and adults to save his town.", dur: 60, rating: "TV-PG" }
    );
  }

  const seed = (channel.number || 1) * 37;
  const programs = [];

  // Start 2 hours before referenceDate
  const baseTime = new Date(referenceDate);
  const m = baseTime.getMinutes() >= 30 ? 30 : 0;
  baseTime.setMinutes(m, 0, 0);
  baseTime.setHours(baseTime.getHours() - 2);

  let currentBlockStart = new Date(baseTime);

  let idx = seed % catalog.length;
  // Generate 8 hours of programming
  const maxHours = 8 * 60 * 60 * 1000;
  const endLimit = baseTime.getTime() + maxHours;

  while (currentBlockStart.getTime() < endLimit) {
    const template = catalog[idx % catalog.length];
    const durMs = template.dur * 60 * 1000;
    const blockEnd = new Date(currentBlockStart.getTime() + durMs);

    programs.push({
      id: `${channel.id}-${currentBlockStart.getTime()}`,
      title: template.title,
      description: template.desc,
      rating: template.rating || channel.rating || 'TV-PG',
      category: channel.category,
      startTime: new Date(currentBlockStart),
      endTime: blockEnd,
      durationMins: template.dur,
    });

    currentBlockStart = blockEnd;
    idx++;
  }

  return programs;
}

/**
 * Returns program blocks neatly partitioned to fit within visible time slots
 */
export function getVisibleGridPrograms(channel, timeSlots) {
  if (!timeSlots || timeSlots.length === 0) return [];

  const gridStartMs = timeSlots[0].timestamp;
  const slotDurationMs = 30 * 60 * 1000;
  const gridEndMs = gridStartMs + timeSlots.length * slotDurationMs;

  const allProgs = getChannelPrograms(channel, timeSlots[0].date);
  const visible = [];

  for (const prog of allProgs) {
    const progStartMs = prog.startTime.getTime();
    const progEndMs = prog.endTime.getTime();

    // Check if overlaps with grid window
    if (progEndMs <= gridStartMs || progStartMs >= gridEndMs) {
      continue;
    }

    // Clip to visible window
    const clampedStart = Math.max(progStartMs, gridStartMs);
    const clampedEnd = Math.min(progEndMs, gridEndMs);

    // Calculate slot span (how many 30m slots)
    const span = Math.max(1, Math.round((clampedEnd - clampedStart) / slotDurationMs));

    visible.push({
      ...prog,
      clampedStart,
      clampedEnd,
      span,
      isOngoing: progStartMs < gridStartMs,
    });
  }

  return visible;
}

/**
 * Get current and next program for info banners
 */
export function getCurrentAndNextProgram(channel, now = new Date()) {
  const programs = getChannelPrograms(channel, now);
  const nowMs = now.getTime();

  let current = null;
  let next = null;

  for (let i = 0; i < programs.length; i++) {
    const prog = programs[i];
    if (nowMs >= prog.startTime.getTime() && nowMs < prog.endTime.getTime()) {
      current = prog;
      next = programs[i + 1] || null;
      break;
    }
  }

  if (!current && programs.length > 0) {
    current = programs[0];
    next = programs[1] || null;
  }

  if (!current) {
    const defaultStart = new Date(now);
    defaultStart.setMinutes(defaultStart.getMinutes() - (defaultStart.getMinutes() % 30), 0, 0);
    const defaultEnd = new Date(defaultStart.getTime() + 60 * 60 * 1000);
    current = {
      title: `${channel.name} Broadcast`,
      description: channel.description || "Live high-definition cable broadcast.",
      rating: channel.rating || "TV-PG",
      startTime: defaultStart,
      endTime: defaultEnd,
      durationMins: 60
    };
  }

  const total = current.endTime.getTime() - current.startTime.getTime();
  const elapsed = Math.max(0, Math.min(total, nowMs - current.startTime.getTime()));
  const progressPercent = Math.round((elapsed / total) * 100);
  const remainingMinutes = Math.max(0, Math.round((current.endTime.getTime() - nowMs) / 60000));

  return {
    current,
    next,
    progressPercent,
    remainingMinutes
  };
}

export function formatTimeRange(start, end) {
  const f = (d) => {
    let h = d.getHours() % 12 || 12;
    let m = d.getMinutes().toString().padStart(2, '0');
    let ap = d.getHours() >= 12 ? 'p' : 'a';
    return `${h}:${m} ${ap}`;
  };
  return `${f(start)} - ${f(end)}`;
}
