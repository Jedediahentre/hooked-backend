import { YoutubeTranscript } from 'youtube-transcript';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { videoId } = req.query;
  if (!videoId) return res.status(400).json({ error: 'Missing videoId' });

  try {
    const raw = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'en' });
    const lines = raw.map(item => {
      const secs = Math.floor(item.offset / 1000);
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      return `[${m}:${s.toString().padStart(2, '0')}] ${item.text.replace(/\n/g, ' ').trim()}`;
    }).filter(Boolean);

    return res.status(200).json({ transcript: lines.join('\n') });
  } catch (e) {
    try {
      const raw = await YoutubeTranscript.fetchTranscript(videoId);
      const lines = raw.map(item => {
        const secs = Math.floor(item.offset / 1000);
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `[${m}:${s.toString().padStart(2, '0')}] ${item.text.replace(/\n/g, ' ').trim()}`;
      }).filter(Boolean);
      return res.status(200).json({ transcript: lines.join('\n') });
    } catch (e2) {
      return res.status(500).json({ error: e2.message || 'Could not fetch transcript' });
    }
  }
}
