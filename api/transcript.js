module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { videoId } = req.query;
  if (!videoId) return res.status(400).json({ error: 'Missing videoId' });

  try {
    const response = await fetch(`https://api.supadata.ai/v1/youtube/transcript?videoId=${videoId}&text=false`, {
      headers: {
        'x-api-key': 'sd_6ae5ac1abbe71ee9b3bc53f1a0fbf73b'
      }
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      throw new Error(data.error || 'Could not fetch transcript');
    }

    if (!data.content || data.content.length === 0) {
      throw new Error('No transcript available for this video.');
    }

    const lines = data.content.map(item => {
      const secs = Math.floor((item.offset || 0) / 1000);
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      return `[${m}:${s.toString().padStart(2, '0')}] ${item.text.trim()}`;
    }).filter(Boolean);

    return res.status(200).json({ transcript: lines.join('\n') });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Transcription failed' });
  }
};
