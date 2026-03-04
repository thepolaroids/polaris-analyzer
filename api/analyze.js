export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { videoId, videoUrl } = req.body;
  if (!videoId || !videoUrl) {
    return res.status(400).json({ error: 'Missing videoId or videoUrl' });
  }

  // --- Step 1: Try to fetch real transcript ---
  let transcript = null;
  let transcriptSource = 'none';

  try {
    // Fetch the YouTube page to get caption track URLs
    const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: { 'Accept-Language': 'en-US,en;q=0.9', 'User-Agent': 'Mozilla/5.0' }
    });
    const html = await pageRes.text();

    // Extract caption track URL from ytInitialPlayerResponse
    const captionMatch = html.match(/"captionTracks":\s*(\[.*?\])/s);
    if (captionMatch) {
      const tracks = JSON.parse(captionMatch[1].replace(/\\u0026/g, '&'));
      // Prefer English auto-generated or manual captions
      const track = tracks.find(t => t.languageCode === 'en' && t.kind === 'asr')
                 || tracks.find(t => t.languageCode === 'en')
                 || tracks[0];

      if (track?.baseUrl) {
        const captionRes = await fetch(track.baseUrl + '&fmt=json3');
        const captionData = await captionRes.json();

        // Build transcript with real timestamps
        if (captionData?.events) {
          const lines = captionData.events
            .filter(e => e.segs)
            .map(e => {
              const startSec = Math.floor((e.tStartMs || 0) / 1000);
              const mm = String(Math.floor(startSec / 60)).padStart(2, '0');
              const ss = String(startSec % 60).padStart(2, '0');
              const text = e.segs.map(s => s.utf8 || '').join('').replace(/\n/g, ' ').trim();
              return `[${mm}:${ss}] ${text}`;
            })
            .filter(l => l.length > 10);

          transcript = lines.join('\n');
          transcriptSource = track.kind === 'asr' ? 'auto-generated captions' : 'manual captions';
        }
      }
    }
  } catch (e) {
    // Transcript fetch failed silently — fallback will handle it
    transcript = null;
  }

  // --- Step 2: Build prompt based on whether we have transcript ---
  let prompt;

  if (transcript && transcript.length > 200) {
    prompt = `You are a content strategist for Polaris School of Technology, a tech-focused university offering a B.Tech in Computer Science. The institution runs paid influencer collaborations on YouTube to help prospective students and their parents decide on enrolling in the CS undergrad program.

You have been given the REAL transcript (with timestamps) of this YouTube video (ID: ${videoId}):

--- TRANSCRIPT START ---
${transcript.slice(0, 12000)}
--- TRANSCRIPT END ---

Analyze this transcript carefully and evaluate how effective this video is as admissions-support content for Polaris CS. Base ALL timestamps, highlights, and sentiment analysis strictly on what is actually said in the transcript above. Do not invent or hallucinate content.

Return ONLY valid JSON (no markdown, no backticks, no explanation):
{
  "transcriptAvailable": true,
  "transcriptSource": "${transcriptSource}",
  "videoTitle": "infer from transcript content",
  "channelName": "infer if mentioned, else Unknown",
  "estimatedDuration": "infer from last timestamp in transcript",
  "overallSentiment": "positive|negative|neutral|mixed",
  "sentimentScores": { "positive": number 0-100, "neutral": number 0-100, "negative": number 0-100 },
  "collabQualityScore": number 1-100,
  "brandMentionCount": number,
  "authenticityScore": number 1-100,
  "engagementPotential": "low|medium|high|very high",
  "admissionsTopicsCovered": ["topics actually discussed in transcript"],
  "admissionsTopicsMissed": ["important admissions topics not mentioned at all"],
  "audienceTarget": "students|parents|both",
  "highlights": [
    {
      "timestamp": "MM:SS from transcript",
      "quote": "exact short quote from transcript at this moment",
      "text": "2-3 sentence explanation of why this moment matters for a student/parent evaluating Polaris CS",
      "topic": "placement stats|curriculum overview|faculty insight|campus life|fees & ROI|admission process|student testimonial|CTA|career outcomes|tech infrastructure",
      "sentiment": "positive|negative|neutral"
    }
  ],
  "verdict": "3-4 sentence assessment based on actual transcript content. What worked, what was missing, and one concrete recommendation for the next brief.",
  "strengths": ["based on actual transcript content"],
  "weaknesses": ["based on gaps in actual transcript content"]
}

Pick the 5 most impactful moments from the transcript as highlights. Be brutally honest — this is for an internal marketing team, not for public consumption.`;

  } else {
    // Honest fallback — no fake timestamps
    prompt = `You are a content strategist for Polaris School of Technology, a tech-focused university offering a B.Tech in Computer Science.

You could NOT retrieve the transcript for YouTube video ID: ${videoId} (${videoUrl}).

Without transcript access, you cannot provide accurate timestamps or quote real content. Be completely honest about this limitation.

Return ONLY valid JSON (no markdown, no backticks, no explanation):
{
  "transcriptAvailable": false,
  "transcriptSource": "none",
  "videoTitle": "Unknown — transcript unavailable",
  "channelName": "Unknown",
  "estimatedDuration": "Unknown",
  "overallSentiment": "unknown",
  "sentimentScores": { "positive": 0, "neutral": 100, "negative": 0 },
  "collabQualityScore": null,
  "brandMentionCount": null,
  "authenticityScore": null,
  "engagementPotential": "unknown",
  "admissionsTopicsCovered": [],
  "admissionsTopicsMissed": [],
  "audienceTarget": "unknown",
  "highlights": [],
  "verdict": "Transcript could not be retrieved for this video — this may be because captions are disabled, the video is too new, or it is region-restricted. No meaningful analysis can be provided without transcript data. Please ensure the video has captions enabled and try again.",
  "strengths": [],
  "weaknesses": ["Transcript unavailable — analysis not possible"]
}`;
  }

  // --- Step 3: Call Claude ---
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      return res.status(response.status).json({ error: data.error?.message || 'Anthropic API error' });
    }

    const text = data.content.map(b => b.text || '').join('');
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    return res.status(200).json(parsed);

  } catch (err) {
    console.error('Proxy error:', err);
    return res.status(500).json({ error: 'Internal server error. Please try again.' });
  }
}
