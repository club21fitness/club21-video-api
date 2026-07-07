const { createClient } = require('@supabase/supabase-js');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const os = require('os');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Mapper les réponses aux fichiers vidéo (chemins exacts Supabase)
function getVideoSegments(answers) {
  return [
    'segments/intro.mp4',
    
    // Âge
    `segments/age/${answers.age}.mp4`,
    
    // Sexe
    `segments/sexe/${answers.sexe}.mp4`,
    
    // Niveau
    `segments/niveau/${answers.niveau}.mp4`,
    
    // Objectif
    `segments/objectif/${answers.objectif}.mp4`,
    
    // Physique
    `segments/physique/${answers.physique}.mp4`,
    
    // Entraînement (location_sexe_sessions)
    `segments/entrainement/${answers.location}_${answers.sexe}_${answers.sessions}.mp4`,
    
    // Nourriture
    `segments/nourriture/${answers.nourriture}.mp4`,
    
    // Sommeil
    `segments/sommeil/${answers.sommeil}.mp4`,
    
    // Blessure
    `segments/blessure/${answers.blessure}.mp4`,
    
    'segments/outro.mp4'
  ];
}

async function downloadSegment(filename) {
  try {
    const { data, error } = await supabase.storage
      .from('club21-profile-videos')
      .download(filename);

    if (error) throw error;

    const tempFile = path.join(os.tmpdir(), path.basename(filename));
    const arrayBuffer = await data.arrayBuffer();
    fs.writeFileSync(tempFile, Buffer.from(arrayBuffer));

    return tempFile;
  } catch (error) {
    console.error(`Error downloading ${filename}:`, error);
    throw error;
  }
}

async function createPersonalizedVideo(answers, prenom) {
  const tempDir = os.tmpdir();
  const videoId = `${prenom}_${Date.now()}`;
  const outputPath = path.join(tempDir, `${videoId}.mp4`);
  const concatFile = path.join(tempDir, `concat_${videoId}.txt`);

  try {
    const segments = getVideoSegments(answers);
    console.log(`Downloading ${segments.length} segments...`);

    const downloadedPaths = [];
    for (const segment of segments) {
      const filePath = await downloadSegment(segment);
      downloadedPaths.push(filePath);
    }

    // Create concat file for FFmpeg
    const concatContent = downloadedPaths
      .map(p => `file '${p}'`)
      .join('\n');
    fs.writeFileSync(concatFile, concatContent);

    console.log('Concatenating video...');

    return new Promise((resolve, reject) => {
      ffmpeg()
        .input(`concat:${downloadedPaths.join('|')}`)
        .outputOptions([
          '-c copy',
          '-bsf:a aac_adtstoasc'
        ])
        .output(outputPath)
        .on('end', async () => {
          console.log('Video created, uploading...');

          const videoBuffer = fs.readFileSync(outputPath);
          const { data, error } = await supabase.storage
            .from('club21-videos-generated')
            .upload(`${videoId}.mp4`, videoBuffer, {
              contentType: 'video/mp4',
              upsert: true
            });

          if (error) {
            reject(new Error(`Upload error: ${error.message}`));
            return;
          }

          const { data: publicUrl } = supabase.storage
            .from('club21-videos-generated')
            .getPublicUrl(`${videoId}.mp4`);

          // Cleanup
          downloadedPaths.forEach(p => {
            try { fs.unlinkSync(p); } catch (e) {}
          });
          try { fs.unlinkSync(concatFile); } catch (e) {}
          try { fs.unlinkSync(outputPath); } catch (e) {}

          resolve({
            success: true,
            videoId,
            videoUrl: publicUrl.publicUrl,
            prenom,
            message: '✅ Vidéo créée avec succès'
          });
        })
        .on('error', (err) => {
          downloadedPaths.forEach(p => {
            try { fs.unlinkSync(p); } catch (e) {}
          });
          reject(err);
        })
        .run();
    });
  } catch (error) {
    throw error;
  }
}

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

    console.log(`Creating video for ${prenom}...`);
    const result = await createPersonalizedVideo(answers, prenom);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message,
        details: 'Error creating video'
      })
    };
  }
};
