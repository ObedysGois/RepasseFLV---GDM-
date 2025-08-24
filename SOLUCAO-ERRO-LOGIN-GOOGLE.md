# Solução para o Erro de Login com Google

O erro `Missing required parameter: client_id` ocorre porque o projeto no Google Cloud Console não está configurado corretamente para autenticação OAuth.

## Passos para resolver o problema:

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/)

2. Selecione o projeto "projeto-app-repasselist-gdm" ou crie um novo projeto

3. No menu lateral, vá para "APIs e Serviços" > "Credenciais"

4. Verifique se existe um ID de cliente OAuth 2.0 configurado. Se não existir, clique em "Criar Credenciais" > "ID do cliente OAuth"

5. Configure o tipo de aplicativo como "Aplicativo da Web"

6. Adicione os seguintes URIs de redirecionamento autorizados:
   - `http://localhost:3000/api/auth/google/callback`
   - `https://seu-dominio-de-producao.com/api/auth/google/callback` (se aplicável)

7. Clique em "Criar" e anote o Client ID e Client Secret

8. Substitua as credenciais no arquivo `google_oauth.json` na raiz do projeto:

```json
{
  "web": {
    "client_id": "SEU_CLIENT_ID_AQUI",
    "client_secret": "SEU_CLIENT_SECRET_AQUI",
    "redirect_uris": ["http://localhost:3000/api/auth/google/callback"],
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token"
  }
}
```

9. No menu lateral do Google Cloud Console, vá para "APIs e Serviços" > "Biblioteca"

10. Ative as seguintes APIs (se ainda não estiverem ativas):
    - Google People API
    - Google+ API (se disponível)
    - Google OAuth2 API

11. No menu "OAuth consent screen", configure:
    - Tipo de usuário: Externo
    - Nome do aplicativo: RepasseList GDM
    - E-mail de suporte: seu-email@exemplo.com
    - Domínios autorizados: adicione seu domínio de produção
    - Escopos autorizados: email, profile, openid

12. Reinicie o servidor após fazer essas alterações

## Alternativa: Usar variáveis de ambiente

Se preferir não usar o arquivo `google_oauth.json`, você pode configurar as variáveis de ambiente no arquivo `.env`:

```
GOOGLE_CLIENT_ID=seu-client-id-aqui
GOOGLE_CLIENT_SECRET=seu-client-secret-aqui
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
```

Depois, reinicie o servidor para aplicar as alterações.