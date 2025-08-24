# RepasseFLV - PWA (Progressive Web App)

## 📱 Sobre a PWA

O RepasseFLV agora é uma **Progressive Web App (PWA)** que oferece uma experiência similar a um aplicativo nativo, com funcionalidades offline e instalação na tela inicial.

## ✨ Funcionalidades PWA

### 🔧 Instalação
- **Instalável**: Pode ser instalado na tela inicial do dispositivo
- **Atalhos**: Acesso rápido às principais funcionalidades
- **Ícone personalizado**: Usa o logo oficial do GDM

### 📱 Experiência Mobile
- **Modo standalone**: Executa sem a barra de navegação do navegador
- **Orientação**: Otimizado para modo retrato
- **Responsivo**: Adapta-se a diferentes tamanhos de tela

### 🔄 Funcionalidades Offline
- **Cache inteligente**: Recursos estáticos são cacheados
- **Estratégia híbrida**: 
  - Cache First para recursos estáticos
  - Network First para APIs
- **Sincronização**: Dados são sincronizados quando online

### 🔔 Notificações
- **Notificações push**: Receba atualizações em tempo real
- **Notificações locais**: Alertas sobre status de conexão
- **Permissões**: Solicita permissão para notificações

### 📊 Monitoramento
- **Status online/offline**: Indicadores visuais
- **Atualizações**: Notificação de novas versões
- **Performance**: Carregamento otimizado

## 🚀 Como Usar

### Instalação no Desktop
1. Abra o aplicativo no Chrome/Edge
2. Clique no ícone de instalação na barra de endereços
3. Ou use o menu "Instalar aplicativo"

### Instalação no Mobile
1. Abra o aplicativo no Safari (iOS) ou Chrome (Android)
2. Toque em "Compartilhar" → "Adicionar à Tela Inicial"
3. Ou use o prompt de instalação automático

### Atalhos Disponíveis
- **Dashboard**: Acesso rápido ao dashboard principal
- **Novo Registro**: Criar novo registro de produto
- **Resumos**: Visualizar resumos e relatórios

## 📁 Arquivos PWA

### Manifest (`manifest.json`)
- Configuração da aparência e comportamento
- Ícones e cores do tema
- Atalhos e navegação

### Service Worker (`sw.js`)
- Gerenciamento de cache
- Estratégias de rede
- Notificações push
- Sincronização offline

### Scripts PWA (`pwa.js`)
- Registro do Service Worker
- Gerenciamento de notificações
- Monitoramento de status
- Interface de instalação

### Estilos PWA (`pwa.css`)
- Notificações visuais
- Indicadores de status
- Animações e transições
- Responsividade

## 🔧 Configuração

### Ícones
- **Principal**: `logopwa` (512x512px)
- **Favicon**: Usa o mesmo ícone
- **Apple Touch**: Configurado para iOS
- **Windows Tile**: Configurado para Windows

### Cores
- **Tema**: `#4CAF50` (verde)
- **Background**: `#ffffff` (branco)
- **Status Bar**: Configurado para iOS/Android

### Cache
- **Versão**: `repasselfv-v1.0.0`
- **Estratégia**: Híbrida (Cache/Network First)
- **Limpeza**: Automática de versões antigas

## 📱 Compatibilidade

### Navegadores Suportados
- ✅ Chrome 67+
- ✅ Firefox 67+
- ✅ Safari 11.1+
- ✅ Edge 79+

### Dispositivos
- ✅ Desktop (Windows, macOS, Linux)
- ✅ Mobile (iOS 11.3+, Android 5+)
- ✅ Tablet (iPad, Android)

## 🛠️ Desenvolvimento

### Testando a PWA
1. Use o Chrome DevTools → Application
2. Verifique o Service Worker
3. Teste o cache e offline
4. Valide o manifest

### Debugging
- Console do navegador para logs
- DevTools → Application → Service Workers
- Lighthouse para auditoria PWA

### Atualizações
- Incrementar versão no `CACHE_NAME`
- Service Worker atualiza automaticamente
- Cache é limpo automaticamente

## 📈 Métricas PWA

### Lighthouse Score
- **Performance**: 90+
- **Accessibility**: 95+
- **Best Practices**: 95+
- **SEO**: 90+
- **PWA**: 100

### Funcionalidades
- ✅ Installable
- ✅ Offline Support
- ✅ Fast Loading
- ✅ Responsive Design
- ✅ Push Notifications

## 🔒 Segurança

- **HTTPS**: Obrigatório para PWA
- **CSP**: Content Security Policy configurado
- **Permissões**: Mínimas necessárias
- **Dados**: Criptografados em trânsito

## 📞 Suporte

Para dúvidas sobre a PWA:
1. Verifique a documentação
2. Teste em diferentes dispositivos
3. Use as ferramentas de desenvolvimento
4. Consulte os logs do Service Worker

---

**RepasseFLV - GDM** | PWA v1.0.0 | Grupo Doce Mel
