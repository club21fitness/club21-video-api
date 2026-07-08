// ============================================================
//  CLUB21 - Génération d'URL Cloudinary à partir du quiz
//  Reçoit les réponses du quiz, retourne l'URL de la vidéo perso
// ============================================================

// Mapping des réponses du quiz → valeurs Cloudinary
const MAPPING = {
  age: {
    '18 - 24 ans': '18_24',
    '25 - 34 ans': '25_34',
    '35 - 44 ans': '35_44',
    '45 - 54 ans': '45_plus', // Note: le quiz dit 45-54, on mappe à 45+
    '+ de 55 ans': '45_plus'
  },
  niveau: {
    'Débutante': 'debutant',
    'Intermédiaire': 'intermediaire',
    'Confirmée': 'avance'
  },
  sexe: {
    'Femme': 'femme',
    'femme': 'femme',
    'Homme': 'homme',
    'homme': 'homme'
  },
  objectif_femme: {
    'Mincir': 'mincir_f',
    'Me galber / me tonifier': 'galber_f',
    'Mix complet': 'tonifier_f'
  },
  objectif_homme: {
    'Sécher / mincir': 'perdre_poids_h',
    'Prendre du muscle': 'muscle_h',
    'Mix complet': 'recomposition_h'
  },
  // Physique est calculé dynamiquement selon sexe + objectif
  // Voir mapPhysique() ci-dessous
  lieu: {
    'En salle de sport': 'salle',
    'salle': 'salle',
    'À domicile': 'maison',
    'maison': 'maison'
  },
  seances: {
    '0 (je débute)': '3', // Par défaut 3 séances pour débuter
    '1 à 2': '3',
    '3 à 4': '4',
    '5 et +': '6'
  },
  blessure: {
    'Le dos': 'generique',
    'Les genoux': 'generique',
    'Les épaules': 'generique',
    'Post-grossesse': 'generique',
    'Aucune': 'aucune'
  },
  nourriture: {
    'Je mange plutôt équilibré': 'equilibre',
    'Je grignote dès que je stresse': 'stress',
    'J\'ai des fringales le soir': 'fringales_soir',
    'Je mange mes émotions': 'emotions',
    'C\'est compliqué': 'complique'
  },
  sommeil: {
    // Slider 0-100 → 3 catégories
    // 0-33 = très mal, 34-66 = moyen, 67-100 = très bien
    'very_bad': 'tres_mal',
    'bad': 'tres_mal',
    'medium': 'moyen',
    'good': 'tres_bien',
    'very_good': 'tres_bien'
  }
};

// Helper pour traduire le slider en catégorie
function mapSleepValue(value) {
  const v = parseInt(value, 10);
  if (v <= 33) return 'tres_mal';
  if (v <= 66) return 'moyen';
  return 'tres_bien';
}

// Helper pour traduire physique_0/1/2 en segment Cloudinary
// Recalcule la catégorie (curvy/skinny/mix) selon sexe + objectif, comme le quiz le fait
function mapPhysique(physique_index, sexe, objectif) {
  // Déterminer la catégorie selon sexe + objectif
  let cat;
  if (sexe === 'femme') {
    if (objectif && objectif.includes('Mincir')) cat = 'curvy';
    else if (objectif && (objectif.includes('galber') || objectif.includes('tonifier'))) cat = 'skinny';
    else cat = 'mix';
  } else {
    if (objectif && (objectif.includes('Sécher') || objectif.includes('mincir'))) cat = 'curvy';
    else if (objectif && objectif.includes('muscle')) cat = 'skinny';
    else cat = 'mix';
  }

  // Mapper catégorie + sexe → segment Cloudinary
  const segment_map = {
    'curvy_femme': 'composition_f',
    'curvy_homme': 'composition_h',
    'skinny_femme': 'mince_f',
    'skinny_homme': 'mince_h',
    'mix_femme': 'equilibre',
    'mix_homme': 'equilibre'
  };

  return segment_map[`${cat}_${sexe}`] || 'equilibre';
}

// Fonction principale : construire l'URL Cloudinary
function buildCloudinaryUrl(answers) {
  // Vérifications basiques
  if (!answers.age || !answers.sexe || !answers.niveau) {
    throw new Error('Réponses incomplètes : âge, sexe, niveau requis');
  }

  // Traductions
  const age = MAPPING.age[answers.age];
  const sexe = MAPPING.sexe[answers.sexe];
  const niveau = MAPPING.niveau[answers.niveau];
  const lieu = MAPPING.lieu[answers.lieu] || 'salle';
  const seances = MAPPING.seances[answers.seances] || '4';
  const blessure = MAPPING.blessure[answers.blessure] || 'aucune';
  const nourriture = MAPPING.nourriture[answers.nourriture] || 'equilibre';
  const sommeil = mapSleepValue(answers.sommeil);

  // Objectif dépend du sexe
  let objectif;
  if (sexe === 'femme') {
    objectif = MAPPING.objectif_femme[answers.objectif];
  } else {
    objectif = MAPPING.objectif_homme[answers.objectif];
  }
  if (!objectif) objectif = 'tonifier_f'; // fallback

  // Physique : traduire physique_0/1/2 en segment Cloudinary selon sexe + objectif
  let physique = 'equilibre'; // fallback
  if (answers.physique) {
    physique = mapPhysique(answers.physique, sexe, answers.objectif);
  }

  // Les 11 segments à concaténer
  const segments = [
    { id: `segments:age:${age}` },
    { id: `segments:sexe:${sexe}` },
    { id: `segments:niveau:${niveau}` },
    { id: `segments:objectif:${objectif}` },
    { id: `segments:physique:${physique}` },
    { id: `segments:entrainement:${lieu}_${sexe.charAt(0)}_${seances}` },
    { id: `segments:nourriture:${nourriture}` },
    { id: `segments:sommeil:${sommeil}` },
    { id: `segments:blessure:${blessure}` }
  ];

  // Construire la transformation Cloudinary
  const transformations = [];
  
  // Ajouter chaque segment avec normalisation taille
  for (const seg of segments) {
    transformations.push(`fl_splice,l_video:${seg.id},w_1080,h_1920,c_pad,b_black`);
    transformations.push('fl_layer_apply');
  }

  // Construire l'URL
  const baseUrl = 'https://res.cloudinary.com/muai6pwk/video/upload';
  const transformation = transformations.join('/');
  const finalUrl = `${baseUrl}/w_1080,h_1920,c_pad,b_black/${transformation}/v1/segments/intro.mp4`;

  return finalUrl;
}

// Export pour utilisation côté serveur
module.exports = { buildCloudinaryUrl };

// ============================================================
//  EXEMPLE NETLIFY FUNCTION (à créer en netlify/functions/)
// ============================================================

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
    const { answers } = body; // Les réponses du quiz

    if (!answers) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Manque les réponses du quiz' })
      };
    }

    const videoUrl = buildCloudinaryUrl(answers);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        videoUrl,
        prenom: answers.prenom,
        message: '✅ Vidéo personnalisée générée'
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message,
        details: 'Erreur lors de la génération de l\'URL'
      })
    };
  }
};
