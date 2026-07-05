const { createClient } = require('@supabase/supabase-js');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Initialiser Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Mapper les réponses aux segments vidéo
const videoSegments = {
  intro: 'intro.mp4',
  age: {
    '18-24': 'age_18-24.mp4',
    '25-34': 'age_25-34.mp4',
    '35-44': 'age_35-44.mp4',
    '45+': 'age_45+.mp4'
  },
  sexe: {
    'homme': 'sexe_homme.mp4',
    'femme': 'sexe_femme.mp4'
  },
  niveau: {
    'débutant': 'niveau_debutant.mp4',
    'intermédiaire': 'niveau_intermediaire.mp4',
    'avancé': 'niveau_avance.mp4'
  },
  objectif: {
    'perdre_poids_h': 'objectif_perdre_poids_h.mp4',
    'mincir_f': 'objectif_mincir_f.mp4',
    'galber_f': 'objectif_galber_f.mp4',
    'muscle_h': 'objectif_muscle_h.mp4',
    'recomposition_h': 'objectif_recomposition_h.mp4',
    'tonifier_f': 'objectif_tonifier_f.mp4'
  },
  location: {
    'maison': 'location_maison.mp4',
    'salle': 'location_salle.mp4'
  },
  sessions: {
    '3': 'sessions_3.mp4',
    '4': 'sessions_4.mp4',
    '5': 'sessions_5.mp4',
    '6': 'sessions_6.mp4'
  },
  outro: 'outro.mp4'
};

async function downloadSegment(filename) {
  try {
    const { data, error } = await supabase.storage
      .from('club21-profile-videos')
      .download(filename);

    if (error) throw error;

    const tempFile = path.join(os.tmpdir(), filename);
    const arrayBuffer = await data.arrayBuffer();
    fs.writeFileSync(tempFile, Buffer.from(arrayBuffer));

    return tempFile;
  } catch (error) {
    console.error(`Erreur téléchargement ${filename}:`, error);
    throw error;
  }
}

async function createPersonalizedVideo(answers, prenom) {
  const tempDir = os.tmpdir();
  const videoId = `${prenom}_${Date.now()}`;
  const outputPath = path.join(tempDir, `${videoId}.mp4`);
  const concatFile = path.join(tempDir, `concat_${videoId}.txt`);

  try {
    // Déterminer les segments à télécharger
    const segments = [
      videoSegments.intro,
      videoSegments.age[answers.age],
      videoSegments.sexe[answers.sexe],
      videoSegments.niveau[answers.niveau],
      videoSegments.objectif[answers.objectif],
      videoSegments.location[answers.location],
      videoSegments.sessions[answers.sessions],
      videoSegments.outro
    ];

    console.log(`Téléchargement de ${segments.length} segments...`);
    
    // Télécharger tous les segments
    const downloadedPaths = [];
    for (const segment of segments) {
      const filePath = await downloadSegment(segment);
      downloadedPaths.push(filePath);
    }

    // Créer fichier concat pour FFmpeg
    const concatContent = downloadedPaths
      .map(p => `file '${p}'`)
      .join('\n');
    fs.writeFileSync(concatFile, concatContent);

    console.log('Concaténation vidéo en cours...');

    // Utiliser FFmpeg pour concaténer
    return new Promise((resolve, reject) => {
      ffmpeg()
        .input(`concat:${downloadedPaths.join('|')}`)
        .outputOptions([
          '-c copy',
          '-bsf:a aac_adtstoasc'
        ])
        .output(outputPath)
        .on('end', async () => {
          console.log('Vidéo créée, upload en cours...');

          // Upload vers Supabase Storage
          const videoBuffer = fs.readFileSync(outputPath);
          const { data, error } = await supabase.storage
            .from('club21-videos-generated')
            .upload(`${videoId}.mp4`, videoBuffer, {
              contentType: 'video/mp4',
              upsert: true
            });

          if (error) {
            reject(new Error(`Erreur upload: ${error.message}`));
            return;
          }

          // Générer URL publique
          const { data: publicUrl } = supabase.storage
            .from('club21-videos-generated')
            .getPublicUrl(`${videoId}.mp4`);

          // Nettoyer fichiers temporaires
          downloadedPaths.forEach(p => {
            try { fs.unlinkSync(p); } catch (e) {}
          });
          try { fs.unlinkSync(concatFile); } catch (e) {}
          try { fs.unlinkSync(outputPath); } catch (e) {}

          resolve({
            success: true,
            videoId,
            videoUrl: publicUrl.publicUrl,
            prenom
          });
        })
        .on('error', (err) => {
          // Nettoyer en cas d'erreur
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
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    const body = JSON.parse(event.body);
    const { prenom, answers } = body;

    if (!prenom || !answers) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Manque prenom ou answers'
        })
      };
    }

    console.log(`Création vidéo pour ${prenom}...`);
    const result = await createPersonalizedVideo(answers, prenom);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    };
  } catch (error) {
    console.error('Erreur:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message,
        details: 'Erreur lors de la création de la vidéo'
      })
    };
  }
};
