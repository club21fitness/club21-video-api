exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  // Afficher les variables d'env
  const diagnosis = {
    timestamp: new Date().toISOString(),
    supabaseUrl: process.env.SUPABASE_URL || 'NOT FOUND',
    supabaseKeyExists: !!process.env.SUPABASE_KEY,
    supabaseKeyLength: process.env.SUPABASE_KEY ? process.env.SUPABASE_KEY.length : 0,
    supabaseKeyPreview: process.env.SUPABASE_KEY ? process.env.SUPABASE_KEY.substring(0, 20) + '...' : 'N/A',
    allEnvVars: Object.keys(process.env)
      .filter(key => key.includes('SUPABASE') || key.includes('supabase'))
      .reduce((acc, key) => {
        acc[key] = process.env[key] ? 'EXISTS' : 'MISSING';
        return acc;
      }, {})
  };

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(diagnosis, null, 2)
  };
};
