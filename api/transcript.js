const FormData = require('form-data');
const fetch = require('node-fetch');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { videoId } = req.query;
  if (!videoId) return res.status(400).json({ error: 'Missing videoId' });

  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_KEY) return res.status(500).json({ error: 'Missing OpenAI API key' });

  try {
    const ytdl = require('@distube/ytdl-core');

    const audioStream = ytdl(`https://www.youtube.com/watch?v=${videoId}`, {
      filter: 'audioonly',
      quality: 'lowestaudio',
    });

    const chunks = [];
    await new Promise((resolve, reject) => {
      audioStream.on('data', chunk => chunks.push(chunk));
      audioStream.on('end', resolve);
      audioStream.on('error', reject);
    });

    const audioBuffer = Buffer.concat(chunks);

    const form = new FormData();
    form.append('file', audioBuffer, { filename: 'audio.mp4', contentType: 'audio/mp4' });
    form.append('model', 'whisper-1');
    form.append('response_format', 'verbose_json');
    form.append('timestamp_granularities[]', 'segment');

    const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_KEY}`, ...form.getHeaders() },
      body: form
    });

    const whisperData = await whisperRes.json();
    if (whisperData.error) throw new Error(whisperData.error.message);

    const lines = (whisperData.segments || []).map(seg => {
      const m = Math.floor(seg.start / 60);
      const s = Math.floor(seg.start % 60);
      return `[${m}:${s.toString().padStart(2, '0')}] ${seg.text.trim()}`;
    });

    return res.status(200).json({ transcript: lines.join('\n') });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Transcription failed' });
  }
};
