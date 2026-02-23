export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { videoId } = req.query;
  if (!videoId) return res.status(400).json({ error: 'Missing videoId' });

  try {
    const transcript = await getTranscript(videoId);
    return res.status(200).json({ transcript });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Could not fetch transcript' });
  }
}

async function getTranscript(videoId) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  };

  const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, { headers });
  const html = await pageRes.text();

  // Find caption tracks directly in the raw HTML
  const captionMatch = html.match(/"captionTracks":(\[.*?\])/);
  if (!captionMatch) {
    throw new Error('No captions found. This video may have captions disabled or may be age-restricted.');
  }

  let captionTracks;
  try { captionTracks = JSON.parse(captionMatch[1]); }
  catch { throw new Error('Could not parse caption data.'); }

  if (!captionTracks || captionTracks.length === 0) {
    throw new Error('No captions available for this video.');
  }

  // Prefer English, fall back to first available
  const track = captionTracks.find(t => t.languageCode === 'en')
    || captionTracks.find(t => t.languageCode?.startsWith('en'))
    || captionTracks[0];

  const captionUrl = track.baseUrl + '&fmt=json3';
  const captionRes = await fetch(captionUrl, { headers });
  const captionData = await captionRes.json();

  if (!captionData.events || captionData.events.length === 0) {
    throw new Error('Transcript was empty for this video.');
  }

  const lines = captionData.events
    .filter(e => e.segs)
    .map(e => {
      const secs = Math.floor((e.tStartMs || 0) / 1000);
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      const text = e.segs.map(s => s.utf8 || '').join('').replace(/\n/g, ' ').trim();
      return text ? `[${m}:${s.toString().padStart(2, '0')}] ${text}` : null;
    })
    .filter(Boolean);

  if (lines.length === 0) throw new Error('Transcript appears empty.');
  return lines.join('\n');
}
