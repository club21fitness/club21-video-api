const { createClient } = require('@supabase/supabase-js');

// Initialiser Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

console.log('SUPABASE_URL:', supabaseUrl);
console.log('SUPABASE_KEY exists:', !!supabaseKey);

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
        body: JSON.stringify({ error: 'Manque prenom ou answers' })
      };
    }

    console.log(`✅ Request reçu pour ${prenom}`);
    console.log('Answers:', answers);

    // Test 1: Vérifier la connection Supabase
    console.log('Test 1: Vérifier connection Supabase...');
    const { data: testData, error: testError } = await supabase
      .from('video_queue')
      .select('count()', { count: 'exact', head: true });

    if (testError) {
      console.error('Erreur Supabase:', testError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Supabase connection failed',
          details: testError.message
        })
      };
    }

    console.log('✅ Connection Supabase OK');

    // Test 2: Simuler la création de vidéo
    const videoId = `${prenom}_${Date.now()}`;
    const mockVideoUrl = `https://sparkly-gnome-417145.netlify.app/mock-video/${videoId}.mp4`;

    console.log(`✅ Vidéo simulée créée: ${videoId}`);

    // Test 3: Insérer dans la BD (optionnel)
    try {
      const { error: insertError } = await supabase
        .from('video_queue')
        .insert([
          {
            prenom,
            answers: JSON.stringify(answers),
            status: 'completed',
            video_url: mockVideoUrl,
            created_at: new Date().toISOString()
          }
        ]);

      if (insertError) {
        console.warn('Warning insert:', insertError.message);
      } else {
        console.log('✅ Enregistrement inséré dans BD');
      }
    } catch (e) {
      console.warn('Warning BD:', e.message);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        videoId,
        videoUrl: mockVideoUrl,
        prenom,
        message: '✅ TEST MODE - Vidéo simulée (pas de FFmpeg)',
        answers
      })
    };
  } catch (error) {
    console.error('Erreur complète:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message,
        details: 'Erreur lors du test de la Function'
      })
    };
  }
};
