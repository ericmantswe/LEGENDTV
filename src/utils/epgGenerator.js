/**
 * EPG Utility
 * Only returns program info if provided by the channel/API.
 * If the API does not provide EPG data, returns null — NO mock/fake data.
 */

export function formatXfinityTime(date) {
  let h = date.getHours() % 12 || 12;
  let m = date.getMinutes().toString().padStart(2, '0');
  let ap = date.getHours() >= 12 ? 'p' : 'a';
  return `${h}:${m} ${ap}`;
}

export function formatTimeRange(start, end) {
  if (!start) return '';
  const f = (d) => {
    const date = new Date(d);
    let h = date.getHours() % 12 || 12;
    let m = date.getMinutes().toString().padStart(2, '0');
    let ap = date.getHours() >= 12 ? 'p' : 'a';
    return `${h}:${m} ${ap}`;
  };
  return end ? `${f(start)} - ${f(end)}` : f(start);
}

/**
 * Returns programs only if genuine program/epg data exists on the channel.
 */
export function getChannelPrograms(channel) {
  if (!channel) return [];
  if (Array.isArray(channel.programs) && channel.programs.length > 0) {
    return channel.programs;
  }
  if (Array.isArray(channel.epg) && channel.epg.length > 0) {
    return channel.epg;
  }
  return [];
}

/**
 * Get current and next program for info banners.
 * Returns null if no real EPG data is provided by the API.
 */
export function getCurrentAndNextProgram(channel, now = new Date()) {
  if (!channel) return null;

  const programs = getChannelPrograms(channel);
  if (!programs || programs.length === 0) {
    // API does not provide EPG data for this channel
    return null;
  }

  const nowMs = now.getTime();
  let current = null;
  let next = null;

  for (let i = 0; i < programs.length; i++) {
    const prog = programs[i];
    const s = new Date(prog.startTime || prog.start).getTime();
    const e = new Date(prog.endTime || prog.end).getTime();

    if (nowMs >= s && nowMs < e) {
      current = {
        title: prog.title,
        description: prog.description || prog.desc || '',
        startTime: new Date(s),
        endTime: new Date(e),
      };
      if (programs[i + 1]) {
        const nextProg = programs[i + 1];
        next = {
          title: nextProg.title,
          description: nextProg.description || nextProg.desc || '',
          startTime: new Date(nextProg.startTime || nextProg.start),
          endTime: new Date(nextProg.endTime || nextProg.end),
        };
      }
      break;
    }
  }

  if (!current) {
    return null;
  }

  const total = current.endTime.getTime() - current.startTime.getTime();
  const elapsed = Math.max(0, Math.min(total, nowMs - current.startTime.getTime()));
  const progressPercent = Math.round((elapsed / total) * 100);
  const remainingMinutes = Math.max(0, Math.round((current.endTime.getTime() - nowMs) / 60000));

  return {
    current,
    next,
    progressPercent,
    remainingMinutes,
  };
}
