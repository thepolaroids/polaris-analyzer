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
  "engagement
