// ============================================================
//  CLUB21 - Netlify Function: Génère l'URL Cloudinary perso
// ============================================================

// Mapping des réponses du quiz → valeurs Cloudinary
const MAPPING = {
  age: {
    '18 - 24 ans': '18_24',
    '25 - 34 ans': '25_34',
    '35 - 44 ans': '35_44',
    '45 - 54 ans': '45_plus',
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
  lieu: {
    'En salle de sport': 'salle',
    'salle': 'salle',
    'À domicile': 'maison',
    'maison': 'maison'
  },
  seances: {
    '0 (je débute)': '3',
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
  }
};

// Helpers
function mapSleepValue(value) {
  const v = parseInt(value, 10);
  if (v <= 33) return 'tres_mal';
  if (v <= 66) return 'moyen';
  return 'tres_bien';
}

function mapPhysique(physique_index, sexe, objectif) {
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

function buildCloudinaryUrl(answers) {
  if (!answers.age || !answers.sexe || !answers.niveau) {
    throw new Error('Réponses incomplètes : âge, sexe, niveau requis');
  }

  const age = MAPPING.age[answers.age];
  const sexe = MAPPING.sexe[answers.sexe];
  const niveau = MAPPING.niveau[answers.niveau];
  const lieu = MAPPING.lieu[answers.lieu] || 'salle';
  const seances = MAPPING.seances[answers.seances] || '4';
  const blessure = MAPPING.blessure[answers.blessure] || 'aucune';
  const nourriture = MAPPING.nourriture[answers.nourriture] || 'equilibre';
  const sommeil = mapSleepValue(answers.sommeil);

  let objectif;
  if (sexe === 'femme') {
    objectif = MAPPING.objectif_femme[answers.objectif];
  } else {
    objectif = MAPPING.objectif_homme[answers.objectif];
  }
  if (!objectif) objectif = 'tonifier_f';

  let physique = 'equilibre';
  if (answers.physique) {
    physique = mapPhysique(answers.physique, sexe, answers.objectif);
  }

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

  const transformations = [];
  for (const seg of segments) {
    transformations.push(`fl_splice,l_video:${seg.id},w_1080,h_1920,c_pad,b_black`);
    transformations.push('fl_layer_apply');
  }

  const baseUrl = 'https://res.cloudinary.com/muai6pwk/video/upload';
  const transformation = transformations.join('/');
  const
