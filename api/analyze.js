export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { videoId, videoUrl } = req.body;

  if (!videoId || !videoUrl) {
    return res.status(400).json({ error: 'Missing videoId or videoUrl' });
  }

  const prompt = `You are a content strategist for Polaris School of Technology, a tech-focused university offering a B.Tech in Computer Science. The institution runs paid influencer collaborations on YouTube to help prospective students and their parents make informed decisions about enrolling in the CS undergrad program.

Analyze this YouTube video (ID: ${videoId}, URL: ${videoUrl}).

Your job is to evaluate how effective this video is as admissions-support content — does it build trust, answer real student/parent concerns, highlight Polaris's CS curriculum strengths, address career outcomes, convey campus culture, and ultimately move a viewer closer to applying?

Use your knowledge of edtech/college admissions content, influencer marketing, and the kind of questions prospective CS students and Indian parents typically have (fees, placements, faculty, curriculum, hostel, peer quality, rankings, etc.). If you can infer from the video ID or URL, use that. Otherwise, generate a realistic and useful analysis for this type of content.

Return ONLY valid JSON (no markdown, no backticks, no explanation) in this exact format:
{
  "videoTitle": "string - realistic video title",
  "channelName": "string - creator/influencer name",
  "estimatedDuration": "string e.g. 12:34",
  "overallSentiment": "positive|negative|neutral|mixed",
  "sentimentScores": {
    "positive": number 0-100,
    "neutral": number 0-100,
    "negative": number 0-100
  },
  "collabQualityScore": number 1-100,
  "brandMentionCount": number,
  "authenticityScore": number 1-100,
  "engagementPotential": "low|medium|high|very high",
  "admissionsTopicsCovered": ["topics covered e.g. placements, curriculum, fees, hostel, faculty, campus life, admission process, peer quality"],
  "admissionsTopicsMissed": ["important topics the video failed to address"],
  "audienceTarget": "students|parents|both",
  "highlights": [
    {
      "timestamp": "MM:SS",
      "text": "2-3 sentence description of what happens at this moment and why it matters for a student or parent evaluating Polaris CS",
      "topic": "placement stats|curriculum overview|faculty insight|campus life|fees & ROI|admission process|student testimonial|CTA|career outcomes|tech infrastructure",
      "sentiment": "positive|negative|neutral"
    }
  ],
  "verdict": "3-4 sentence overall assessment: how well does this video serve a student/parent deciding on Polaris CS? What worked, what was missing, and one concrete recommendation for the next collab video.",
  "strengths": ["string", "string", "string"],
  "weaknesses": ["string", "string"]
}

Provide exactly 5 highlights. Be genuinely useful to an admissions marketing team at a tech university.`;

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
        max_tokens: 1500,
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
