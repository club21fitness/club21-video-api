exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const body = JSON.parse(event.body);
    const answers = body.answers;

    if (!answers || !answers.age || !answers.sexe) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Réponses incomplètes' })
      };
    }

    const ageMap = {
      '18 - 24 ans': '18_24',
      '25 - 34 ans': '25_34',
      '35 - 44 ans': '35_44',
      '45 - 54 ans': '45_plus',
      '+ de 55 ans': '45_plus'
    };

    const niveauMap = {
      'Débutante': 'debutant',
      'Intermédiaire': 'intermediaire',
      'Confirmée': 'avance'
    };

    const sexeMap = {
      'femme': 'femme',
      'Femme': 'femme',
      'homme': 'homme',
      'Homme': 'homme'
    };

    const age = ageMap[answers.age] || '25_34';
    const sexe = sexeMap[answers.sexe] || 'femme';
    const niveau = niveauMap[answers.niveau] || 'avance';

    const videoUrl = `https://res.cloudinary.com/muai6pwk/video/upload/w_1080,h_1920,c_pad,b_black/fl_splice,l_video:segments:age:${age},w_1080,h_1920,c_pad,b_black/fl_layer_apply/fl_splice,l_video:segments:sexe:${sexe},w_1080,h_1920,c_pad,b_black/fl_layer_apply/v1/segments/intro.mp4`;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        videoUrl,
        prenom: answers.prenom || 'Utilisateur'
      })
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
