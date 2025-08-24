// src/googleAuth.js
const path = require('path');
const { OAuth2Client } = require('google-auth-library');

function loadConf() {
  // 1) tenta ler google_oauth.json na raiz (formato do Google com a chave "web")
  try {
    const confRaw = require(path.join(__dirname, '..', 'google_oauth.json'));
    const web = confRaw.web || confRaw;
    const redirect = Array.isArray(web.redirect_uris) ? web.redirect_uris[0] : web.redirect_uri;
    return {
      client_id: web.client_id,
      client_secret: web.client_secret,
      redirect_uri: redirect || 'http://localhost:3000/api/auth/google/callback'
    };
  } catch {
    // 2) fallback para variáveis de ambiente
    return {
      client_id: process.env.GOOGLE_CLIENT_ID, 
      client_secret: process.env.GOOGLE_CLIENT_SECRET, 
      redirect_uri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback'
    };
  }
}

const conf = loadConf();
if (!conf.client_id || !conf.client_secret) {
  console.error('Credenciais Google OAuth ausentes. Configure google_oauth.json na raiz ou variáveis de ambiente.');
}

const client = new OAuth2Client(conf.client_id, conf.client_secret, conf.redirect_uri);

function getAuthUrl() {
  return client.generateAuthUrl({
    access_type: 'offline',
    scope: ['openid', 'email', 'profile'],
    prompt: 'consent'
  });
}

async function getUserFromCode(code) {
  try {
    console.log('Obtendo token a partir do código de autorização');
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    // Valida o id_token e extrai o perfil
    console.log('Verificando id_token');
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: conf.client_id
    });
    const payload = ticket.getPayload();
    console.log('Payload do token obtido com sucesso');

  return {
    googleId: payload.sub,
    email: payload.email,
    name: payload.name,
    usuario: payload.name || (payload.email ? payload.email.split('@')[0] : 'usuario'),
    picture: payload.picture
  };
  } catch (error) {
    console.error('Erro ao obter informações do usuário a partir do código:', error);
    throw error;
  }
}

module.exports = { getAuthUrl, getUserFromCode };
