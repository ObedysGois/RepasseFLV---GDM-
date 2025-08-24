# Sincronização Google Sheets → Supabase

## Problema Resolvido

Foi identificado que alguns registros adicionados via API não estavam sendo corretamente exportados para o Supabase. Isso ocorria porque o sistema estava tentando atualizar registros que ainda não existiam no Supabase, em vez de inseri-los.

## Solução Implementada

Foi criado um script de sincronização (`sincronizar-supabase.js`) que:

1. Busca todos os registros do Google Sheets
2. Busca todos os registros do Supabase para comparação
3. Para cada registro do Google Sheets:
   - Verifica se o registro já existe no Supabase (pelo ID)
   - Se existir, atualiza o registro
   - Se não existir, insere o registro

O script normaliza os dados antes de enviá-los ao Supabase, tratando campos vazios, convertendo `família` para `familia` (sem acento), e garantindo que campos numéricos e de data vazios sejam `null`.

## Como Usar

### Sincronização Manual

Para executar a sincronização manualmente:

```bash
node sincronizar-supabase.js
```

### Sincronização Automática

Para automatizar a sincronização, você pode configurar uma tarefa agendada:

#### No Windows (usando Task Scheduler)

1. Abra o Task Scheduler (Agendador de Tarefas)
2. Clique em "Create Basic Task" (Criar Tarefa Básica)
3. Dê um nome como "Sincronização Repasse Google Sheets → Supabase"
4. Escolha a frequência (diária, semanal, etc.)
5. Escolha "Start a program" (Iniciar um programa)
6. Em "Program/script", insira o caminho para o Node.js (ex: `C:\Program Files\nodejs\node.exe`)
7. Em "Add arguments", insira o caminho para o script (ex: `C:\caminho\para\sincronizar-supabase.js`)
8. Em "Start in", insira o diretório do projeto (ex: `C:\caminho\para\RepasseList - GDM NOVA 2025`)

#### No Linux/Mac (usando cron)

1. Abra o terminal e digite `crontab -e`
2. Adicione uma linha como:
   ```
   0 * * * * cd /caminho/para/RepasseList-GDM-NOVA-2025 && /usr/bin/node sincronizar-supabase.js >> /caminho/para/logs/sincronizacao.log 2>&1
   ```
   (Isso executará a sincronização a cada hora)

## Verificação

Para verificar se um registro específico existe no Supabase, você pode usar o script `verificar-registro.js`:

```bash
node verificar-registro.js
```

Você pode modificar o ID do registro a ser verificado editando a variável `registroId` no script.

## Recomendações

1. **Sincronização Periódica**: Configure a sincronização para ser executada periodicamente (a cada hora ou a cada dia, dependendo da frequência de atualizações).

2. **Logs**: Considere adicionar logs mais detalhados ao script de sincronização para facilitar a depuração.

3. **Notificações**: Considere adicionar notificações por e-mail ou outro meio em caso de falha na sincronização.

4. **Backup**: Faça backups regulares do Google Sheets e do Supabase para evitar perda de dados.

5. **Monitoramento**: Monitore o processo de sincronização para garantir que está funcionando corretamente.