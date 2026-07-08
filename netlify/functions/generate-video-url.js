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

    // MAPPINGS
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

    const objectifMapFemme = {
      'Mincir': 'mincir_f',
      'Me galber / me tonifier': 'galber_f',
      'Mix complet': 'tonifier_f'
    };

    const objectifMapHomme = {
      'Sécher / mincir': 'perdre_poids_h',
      'Prendre du muscle': 'muscle_h',
      'Mix complet': 'recomposition_h'
    };

    const lieuMap = {
      'En salle de sport': 'salle',
      'À domicile': 'maison'
    };

    const seancesMap = {
      '0 (je débute)': '3',
      '1 à 2': '3',
      '3 à 4': '4',
      '5 et +': '6'
    };

    const blessureMap = {
      'Le dos': 'generique',
      'Les genoux': 'generique',
      'Les épaules': 'generique',
      'Post-grossesse': 'generique',
      'Aucune': 'aucune'
    };

    const nourritureMap = {
      'Je mange plutôt équilibré': 'equilibre',
      'Je grignote dès que je stresse': 'stress',
      'J\'ai des fringales le soir': 'fringales_soir',
      'Je mange mes émotions': 'emotions',
      'C\'est compliqué': 'complique'
    };

    // TRADUIRE
    const age = ageMap[answers.age] || '25_34';
    const sexe = sexeMap[answers.sexe] || 'femme';
    const niveau = niveauMap[answers.niveau] || 'avance';
    const objectif = (sexe === 'femme' ? objectifMapFemme : objectifMapHomme)[answers.objectif] || 'tonifier_f';
    const lieu = lieuMap[answers.lieu] || 'salle';
    const seances = seancesMap[answers.seances] || '4';
    const blessure = blessureMap[answers.blessure] || 'aucune';
    const nourriture = nourritureMap[answers.nourriture] || 'equilibre';

    // PHYSIQUE : traduction dynamique selon sexe + objectif (comme le quiz)
    let physique = 'equilibre';
    if (answers.physique) {
      let cat;
      if (sexe === 'femme') {
        if (answers.objectif && answers.objectif.includes('Mincir')) cat = 'composition_f';
        else if (answers.objectif && (answers.objectif.includes('galber') || answers.objectif.includes('tonifier'))) cat = 'mince_f';
        else cat = 'equilibre';
      } else {
        if (answers.objectif && (answers.objectif.includes('Sécher') || answers.objectif.includes('mincir'))) cat = 'composition_h';
        else if (answers.objectif && answers.objectif.includes('muscle')) cat = 'mince_h';
        else cat = 'equilibre';
      }
      physique = cat;
    }

    // SOMMEIL : traduire slider 0-100 en catégorie
    let sommeil = 'moyen';
    if (answers.sommeil) {
      const v = parseInt(answers.sommeil, 10);
      if (v <= 33) sommeil = 'tres_mal';
      else if (v <= 66) sommeil = 'moyen';
      else sommeil = 'tres_bien';
    }

    // ENTRAINEMENT : location_sexe_sessions
    const entrainement = `${lieu}_${sexe.charAt(0)}_${seances}`;

    // CONSTRUIRE L'URL AVEC 9 SEGMENTS
    const segments = [
      `segments:age:${age}`,
      `segments:sexe:${sexe}`,
      `segments:niveau:${niveau}`,
      `segments:objectif:${objectif}`,
      `segments:physique:${physique}`,
      `segments:entrainement:${entrainement}`,
      `segments:nourriture:${nourriture}`,
      `segments:sommeil:${sommeil}`,
      `segments:blessure:${blessure}`
    ];

    let transformations = 'w_1080,h_1920,c_pad,b_black';
    for (const seg of segments) {
      transformations += `/fl_splice,l_video:${seg},w_1080,h_1920,c_pad,b_black/fl_layer_apply`;
    }

    const videoUrl = `https://res.cloudinary.com/muai6pwk/video/upload/${transformations}/v1/segments/intro.mp4`;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        videoUrl,
        prenom: answers.prenom || 'Utilisateur',
        debug: { age, sexe, niveau, objectif, physique, entrainement, nourriture, sommeil, blessure }
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
