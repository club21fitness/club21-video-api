const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

console.log('Initializing Supabase...');
const supabase = createClient(supabaseUrl, supabaseKey);

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const body = JSON.parse(event.body);
    const { prenom, answers } = body;

    if (!prenom || !answers) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing prenom or answers' })
      };
    }

    console.log(`Request received for ${prenom}`);

    // Simply create a mock response without touching Supabase
    const videoId = `${prenom}_${Date.now()}`;
    const mockVideoUrl = `https://sparkly-gnome-417145.netlify.app/mock-video/${videoId}.mp4`;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        videoId,
        videoUrl: mockVideoUrl,
        prenom,
        message: '✅ TEST MODE - Vidéo simulée (pas de FFmpeg)',
        timestamp: new Date().toISOString(),
        answers
      })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message,
        details: 'Error processing request'
      })
    };
  }
};
