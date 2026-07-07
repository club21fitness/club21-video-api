// Function de diagnostic - montre exactement les chemins cherchés
// CORRIGÉE: sexe converti en h/f pour l'entraînement

function getVideoSegments(answers) {
  // Convertir sexe: "homme" → "h", "femme" → "f"
  const sexeAbbrev = answers.sexe === 'homme' ? 'h' : 'f';

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
    
    // Entraînement (location_h/f_sessions) - CORRIGÉ
    `segments/entrainement/${answers.location}_${sexeAbbrev}_${answers.sessions}.mp4`,
    
    // Nourriture
    `segments/nourriture/${answers.nourriture}.mp4`,
    
    // Sommeil
    `segments/sommeil/${answers.sommeil}.mp4`,
    
    // Blessure
    `segments/blessure/${answers.blessure}.mp4`,
    
    'segments/outro.mp4'
  ];
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

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

    const segments = getVideoSegments(answers);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        prenom,
        answers,
        segments: segments,
        message: 'Voici les 11 segments cherchés (dans l\'ordre d\'imbrication)'
      }, null, 2)
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message
      })
    };
  }
};
