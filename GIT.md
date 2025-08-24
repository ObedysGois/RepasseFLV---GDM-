# Guia de Gerenciamento do Repositório Git para RepasseList GDM

Este guia fornece instruções passo a passo para gerenciar o repositório Git do projeto RepasseList GDM.

## Configuração Inicial

### 1. Instalação do Git

Se você ainda não tem o Git instalado:

1. Baixe o Git em [git-scm.com](https://git-scm.com/downloads)
2. Instale seguindo as instruções para seu sistema operacional
3. Verifique a instalação com o comando:
   ```
   git --version
   ```

### 2. Configuração da sua identidade no Git

```bash
git config --global user.name "Seu Nome"
git config --global user.email "seu.email@exemplo.com"
```

## Clonando o Repositório

Para obter uma cópia local do repositório:

```bash
git clone https://github.com/ObedysGois/RepasseFLV---GDM-.git
cd RepasseFLV---GDM-
```

## Fluxo de Trabalho Básico

### 1. Verificando o Status

Verifique o status atual do seu repositório:

```bash
git status
```

### 2. Atualizando seu Repositório Local

Antes de começar a trabalhar, atualize seu repositório local:

```bash
git pull origin main
```

### 3. Criando uma Branch para Desenvolvimento

Crie uma nova branch para desenvolver uma funcionalidade:

```bash
git checkout -b nome-da-funcionalidade
```

### 4. Adicionando Alterações

Adicione arquivos modificados ao stage:

```bash
# Adicionar um arquivo específico
git add caminho/para/arquivo

# Adicionar todos os arquivos modificados
git add .
```

### 5. Commitando Alterações

Commite as alterações com uma mensagem descritiva:

```bash
git commit -m "Descrição clara das alterações realizadas"
```

Boas práticas para mensagens de commit:
- Use verbos no imperativo ("Adiciona", "Corrige", "Atualiza")
- Seja claro e conciso
- Inclua o número da issue se aplicável ("Fix #123: Corrige problema de login")

### 6. Enviando Alterações para o Repositório Remoto

```bash
# Primeira vez que envia a branch
git push -u origin nome-da-funcionalidade

# Próximas vezes
git push
```

### 7. Criando um Pull Request

1. Acesse [https://github.com/ObedysGois/RepasseFLV---GDM-/pulls](https://github.com/ObedysGois/RepasseFLV---GDM-/pulls)
2. Clique em "New pull request"
3. Selecione sua branch como "compare" e "main" como "base"
4. Clique em "Create pull request"
5. Adicione um título e descrição detalhada
6. Clique em "Create pull request" novamente

## Comandos Git Úteis

### Visualizando o Histórico

```bash
# Histórico completo
git log

# Histórico resumido em uma linha por commit
git log --oneline

# Histórico com gráfico
git log --graph --oneline --all
```

### Trabalhando com Branches

```bash
# Listar branches locais
git branch

# Listar todas as branches (locais e remotas)
git branch -a

# Mudar para outra branch
git checkout nome-da-branch

# Criar e mudar para uma nova branch
git checkout -b nome-da-nova-branch

# Excluir uma branch local
git branch -d nome-da-branch
```

### Desfazendo Alterações

```bash
# Descartar alterações não commitadas em um arquivo
git checkout -- caminho/para/arquivo

# Desfazer o último commit mantendo as alterações
git reset --soft HEAD~1

# Desfazer o último commit descartando as alterações
git reset --hard HEAD~1
```

### Resolvendo Conflitos

Quando ocorrer um conflito durante um merge ou rebase:

1. Abra os arquivos com conflitos (marcados com `<<<<<<<`, `=======`, `>>>>>>>`) em seu editor
2. Edite os arquivos para resolver os conflitos
3. Adicione os arquivos resolvidos com `git add`
4. Continue o merge com `git merge --continue` ou o rebase com `git rebase --continue`

## Sincronizando com o Repositório Original

Se você estiver trabalhando em um fork:

```bash
# Adicionar o repositório original como remote
git remote add upstream https://github.com/ObedysGois/RepasseFLV---GDM-.git

# Buscar alterações do repositório original
git fetch upstream

# Mesclar alterações do repositório original na sua branch local
git merge upstream/main
```

## Boas Práticas

1. **Commits frequentes**: Faça commits pequenos e frequentes que representem uma unidade lógica de trabalho
2. **Pull antes de Push**: Sempre faça `git pull` antes de `git push` para evitar conflitos
3. **Branches**: Use branches para desenvolver funcionalidades ou corrigir bugs
4. **Mensagens de commit**: Escreva mensagens claras e descritivas
5. **Testes**: Certifique-se de que o código passa em todos os testes antes de fazer commit
6. **Documentação**: Atualize a documentação quando necessário

## Recursos Adicionais

- [Documentação oficial do Git](https://git-scm.com/doc)
- [GitHub Guides](https://guides.github.com/)
- [Git Cheat Sheet](https://education.github.com/git-cheat-sheet-education.pdf)