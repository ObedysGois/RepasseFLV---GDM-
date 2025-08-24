document.addEventListener('DOMContentLoaded', () => {
    // Determina a URL da API com base no ambiente
    const isProduction = window.location.hostname !== 'localhost';
    const apiUrl = isProduction ? '/api' : 'http://localhost:3000/api';

    // Cache de elementos do DOM
    let pages = document.querySelectorAll('.page');
    let navLinks = document.querySelectorAll('.nav-link');
    const themeToggle = document.getElementById('theme-toggle');
    const appContainer = document.getElementById('app-container');
    
    // Elementos para navegação mobile
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mainNav = document.getElementById('main-nav');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    
    // Formulário de Registro
    const registroForm = document.getElementById('registro-form');
    const registroIdInput = document.getElementById('registro-id');
    const dataRepasseInput = document.getElementById('data-repasse');
    const produtoSelect = document.getElementById('produto');
    const familiaInput = document.getElementById('familia');
    const usuarioOperacoesInput = document.getElementById('usuario-operacoes');

    // Formulário de Solicitação - removido
    // solicitacaoForm?.addEventListener('submit', handleSolicitacaoSubmit);
    // document.getElementById('cancelar-solicitacao')?.addEventListener('click', () => {
    //   if (solicitacaoFormContainer) solicitacaoFormContainer.style.display = 'none';
    // });
    // exibirRegistrosPendentes();

    // Tabela de Resumos
    const resumosTableBody = document.getElementById('resumos-table-body');

    // Helper para obter o tbody da tabela de resumos (compatível com ids antigos/novos)
    function getResumosTbody() {
        return document.getElementById('resumos-tbody') || document.getElementById('resumos-table-body');
    }

    // Estado da Aplicação
    let produtosData = [];
    let registrosCompletos = [];
    let historicoDeEdicoes = [];
    let relatoriosFilteredData = [];

    // Constantes para histórico
    const HISTORY_STORAGE_KEY = 'historicoLocal';
    const HISTORY_RETENTION_DAYS = 10;

    // Instâncias dos gráficos
    let vendedorPieChart, motivosBarChart, produtoBarChart, temporalLineChart;

    Chart.register(ChartDataLabels);

    // Autenticação - elementos de UI
    const loginScreen = document.getElementById('login-screen');
    const googleLoginBtn = document.getElementById('google-login');
    const customLoginForm = document.getElementById('custom-login-form');
    const signupForm = document.getElementById('signup-form');
    const logoutBtn = document.getElementById('logout-btn');

    const loginEmailInput = document.getElementById('login-email');
    const loginSenhaInput = document.getElementById('login-senha');
    const signupUsuarioInput = document.getElementById('signup-usuario');
    const signupEmailInput = document.getElementById('signup-email');
    const signupSenhaInput = document.getElementById('signup-senha');
    const signupTipoSelect = document.getElementById('signup-tipo');

    // Estado de bootstrap pós-login (para não duplicar inicialização)
    let appBootstrapped = false;

    // Sessão
    function getCurrentUser() {
      try { 
        const user = localStorage.getItem('user');
        console.log('Obtendo usuário do localStorage:', user);
        return user ? JSON.parse(user) : null; 
      } catch (error) { 
        console.error('Erro ao obter usuário do localStorage:', error);
        return null; 
      }
    }
    function isAuthenticated() {
      const user = getCurrentUser();
      console.log('Verificando autenticação do usuário:', user);
      return !!user;
    }

    // Mostrar/ocultar app completo (menus, páginas, rodapé)
    function setAppVisible(visible) {
      console.log('Definindo visibilidade do app:', visible);
      // Usar classes CSS para controle mais limpo
      if (visible) {
        document.body.classList.add('app-visible');
        document.body.classList.remove('login-active');
        
        // Mostrar apenas a primeira página (dashboard por padrão)
        pages = document.querySelectorAll('.page');
        pages.forEach((p, index) => {
          p.style.display = index === 0 ? 'block' : 'none';
        });
        
        // Ativar primeiro link de navegação
        navLinks.forEach((link, index) => {
          link.classList.toggle('active', index === 0);
        });
        
      } else {
        document.body.classList.remove('app-visible');
        document.body.classList.add('login-active');
        
        // Esconder todas as páginas
        document.querySelectorAll('.page').forEach(p => {
          p.style.display = 'none';
        });
      }
    }
    function showLoginScreen() {
      console.log('Mostrando tela de login');
      if (loginScreen) loginScreen.style.display = 'flex';
      if (logoutBtn) logoutBtn.style.display = 'none';
      setAppVisible(false);
    }
    function hideLoginScreen() {
      console.log('Escondendo tela de login');
      if (loginScreen) loginScreen.style.display = 'none';
      if (logoutBtn) logoutBtn.style.display = 'inline-block';
      setAppVisible(true);
    }
    function applyAuthState() { 
        const authenticated = isAuthenticated();
        console.log('Aplicando estado de autenticação:', authenticated);
        if (authenticated) {
          hideLoginScreen();
          applyRoleAccess();
          reapplyUserRestrictions();
        } else {
          showLoginScreen();
        }
    }

    // Funções auxiliares para histórico
    function isWithinRetentionPeriod(dateString) {
        const logDate = new Date(dateString);
        const retentionDate = new Date();
        retentionDate.setDate(retentionDate.getDate() - HISTORY_RETENTION_DAYS);
        return logDate >= retentionDate;
    }

    function loadHistoricoFromStorage() {
        try {
            const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
            if (stored) {
                const historico = JSON.parse(stored);
                // Filtrar apenas registros dentro do período de retenção
                historicoDeEdicoes = historico.filter(log => isWithinRetentionPeriod(log.data));
                
                // Salvar histórico filtrado de volta no localStorage
                saveHistoricoToStorage();
            }
        } catch (error) {
            console.error('Erro ao carregar histórico do localStorage:', error);
            historicoDeEdicoes = [];
        }
    }

    function saveHistoricoToStorage() {
        try {
            localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(historicoDeEdicoes));
        } catch (error) {
            console.error('Erro ao salvar histórico no localStorage:', error);
        }
    }

    async function saveHistoricoToSupabase(acao, detalhes) {
        try {
            const current = getCurrentUser();
            if (!current?.email) return;

            await apiFetch('/api/historico', {
                method: 'POST',
                body: JSON.stringify({
                    acao,
                    detalhes
                })
            });
        } catch (error) {
            console.error('Erro ao salvar histórico no Supabase:', error);
        }
    }

    // Boot do app após login
    async function afterLoginBoot() {
        if (appBootstrapped) return;

        // Carregar histórico local
        loadHistoricoFromStorage();

        await fetchProdutos();
        preencherCamposAutomaticos();

        // Limpeza de dados antigos do localStorage
        localStorage.removeItem('registrosPendentes');

        const data = await fetchRegistrosCompletos();
        if (data) {
            registrosCompletos = data;
            relatoriosFilteredData = [...registrosCompletos];

            renderResumosTable(registrosCompletos);
            populateResumosFilters();
            setupResumosFilters();

            populateDashboardFilters();
            setupDashboardFilters();
            updateDashboard(registrosCompletos);

            populateRelatoriosFilters();
            setupRelatoriosFilters();
        }

        appBootstrapped = true;
    }

    // Função para configurar menu mobile
    function closeMenu() {
        console.log('Fechando menu mobile');
        // Fechar o menu imediatamente para evitar problemas com a navegação
        mainNav.classList.remove('show');
        sidebarOverlay.classList.remove('show');
        mobileMenuBtn.classList.remove('active');
        mobileMenuBtn.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
    }
    
    // Função para navegar entre páginas
    function navigateToPage(pageId) {
        console.log('Navegando para a página:', pageId);
        // Esconder todas as páginas
        document.querySelectorAll('.page').forEach(page => {
            page.style.display = 'none';
        });
        
        // Mostrar a página alvo
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.style.display = 'block';
        }
        
        // Atualizar links ativos
        document.querySelectorAll('.nav-link').forEach(navLink => {
            navLink.classList.remove('active');
            if (navLink.getAttribute('href') === '#' + pageId) {
                navLink.classList.add('active');
            }
        });
        
        // Atualizar o hash da URL
        if (pageId && window.location.hash !== `#${pageId}`) {
            window.location.hash = `#${pageId}`;
        }
        
        // Carregar conteúdo dinâmico
        loadDynamicContent(pageId);
    }

    function setupMobileMenu() {
        console.log('Configurando menu mobile');
        console.log('mobileMenuBtn:', mobileMenuBtn);
        console.log('mainNav:', mainNav);
        console.log('sidebarOverlay:', sidebarOverlay);
        
        if (!mobileMenuBtn || !mainNav || !sidebarOverlay) {
            console.log('Um ou mais elementos do menu mobile não foram encontrados');
            return;
        }

        // Toggle menu mobile
        mobileMenuBtn.addEventListener('click', () => {
            console.log('Botão de menu clicado');
            const isOpen = mainNav.classList.toggle('show');
            console.log('Menu aberto:', isOpen);
            sidebarOverlay.classList.toggle('show', isOpen);
            mobileMenuBtn.classList.toggle('active', isOpen);
            mobileMenuBtn.setAttribute('aria-expanded', isOpen.toString());
            
            // Prevenir scroll do body quando menu aberto
            document.body.style.overflow = isOpen ? 'hidden' : '';
            console.log('Overflow do body:', document.body.style.overflow);
        });

        // Fechar menu ao clicar no overlay, mas não quando clicar em links
        sidebarOverlay.addEventListener('click', (e) => {
            // Verificar se o clique não foi em um link de navegação
            if (!e.target.closest('.nav-link') && !e.target.closest('.main-nav')) {
                closeMenu();
            }
        });
        
        // Adicionar evento de clique aos links do menu mobile
        const mobileNavLinks = mainNav.querySelectorAll('.nav-link');
        mobileNavLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Obter o href do link
                const href = link.getAttribute('href');
                const targetId = href.includes('#') ? href.split('#').pop() : href.replace('#', '');
                
                // Primeiro, navegar para a página
                // Esconder todas as páginas
                document.querySelectorAll('.page').forEach(page => {
                    page.style.display = 'none';
                });
                
                // Mostrar a página alvo
                const targetPage = document.getElementById(targetId);
                if (targetPage) {
                    targetPage.style.display = 'block';
                }
                
                // Atualizar links ativos
                document.querySelectorAll('.nav-link').forEach(navLink => {
                    navLink.classList.remove('active');
                });
                link.classList.add('active');
                
                // Depois de navegar, fechar o menu mobile
                closeMenu();
                    
                    // Atualizar o hash da URL
                    if (targetId && window.location.hash !== `#${targetId}`) {
                        window.location.hash = `#${targetId}`;
                    }
                    
                    // Carregar conteúdo dinâmico
                    loadDynamicContent(targetId);
            });
        });
        
        // Prevenir que cliques nos links sejam interceptados pelo overlay
        mainNav.addEventListener('click', (e) => {
            if (e.target.closest('.nav-link')) {
                e.stopPropagation();
                
                // Primeiro navegar para a página
                const href = e.target.closest('.nav-link').getAttribute('href');
                if (href) {
                    navigateToPage(href.replace('#', ''));
                }
                
                // Depois fechar o menu
                closeMenu();
                
                e.stopImmediatePropagation();
                console.log('Clique no menu interceptado e propagação parada');
                
                // Garantir que o clique no link seja processado corretamente
                // sem ser bloqueado pelo overlay ou pelo fechamento do menu
                const navLink = e.target.closest('.nav-link');
                if (navLink && navLink.href) {
                    console.log('Processando clique no link de navegação:', navLink.href);
                }
            }
        });
        
        // Garantir que cliques nos links de navegação funcionem corretamente
        navLinks.forEach(link => {
            // Adicionar event listeners para todos os tipos de eventos
            link.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                e.stopImmediatePropagation();
            });
            
            link.addEventListener('touchstart', (e) => {
                e.stopPropagation();
                e.stopImmediatePropagation();
            });
            
            link.addEventListener('pointerdown', (e) => {
                e.stopPropagation();
                e.stopImmediatePropagation();
            });
            
            // Garantir que o link seja clicável mesmo com overlay
            link.style.pointerEvents = 'auto';
            link.style.zIndex = '1005'; // Aumentar o z-index para garantir que fique acima do overlay
        });

        // Fechar menu ao redimensionar janela (evita bugs)
        window.addEventListener('resize', () => {
            if (window.innerWidth > 992) {
                closeMenu();
            }
        });

        // Fechar menu com tecla ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && mainNav.classList.contains('show')) {
                closeMenu();
            }
        });
    }

    // Função para melhorar a experiência das tabelas em mobile
    function setupTableEnhancements() {
        const tableContainers = document.querySelectorAll('.table-container');
        
        tableContainers.forEach(container => {
            const table = container.querySelector('table');
            if (!table) return;
            
            // Detectar se a tabela precisa de scroll horizontal
            function updateScrollIndicator() {
                const hasHorizontalScroll = container.scrollWidth > container.clientWidth;
                const isScrolledToEnd = container.scrollLeft >= (container.scrollWidth - container.clientWidth - 10);
                
                if (hasHorizontalScroll && !isScrolledToEnd) {
                    container.classList.remove('scrolled');
                } else {
                    container.classList.add('scrolled');
                }
            }
            
            // Adicionar event listeners
            container.addEventListener('scroll', updateScrollIndicator);
            window.addEventListener('resize', updateScrollIndicator);
            
            // Verificação inicial
            setTimeout(updateScrollIndicator, 100);
            
            // Touch feedback para mobile
            if ('ontouchstart' in window) {
                container.addEventListener('touchstart', () => {
                    container.style.overflowX = 'auto';
                });
            }
        });
    }

    // Função para otimizar gráficos em mobile
    function optimizeChartsForMobile() {
        const charts = [vendedorPieChart, motivosBarChart, produtoBarChart, temporalLineChart];
        const isMobile = window.innerWidth <= 768;
        
        charts.forEach(chart => {
            if (!chart) return;
            
            const options = chart.options;
            if (!options) return;
            
            // Ajustar responsive
            options.responsive = true;
            options.maintainAspectRatio = !isMobile;
            
            // Ajustar legendas
            if (options.plugins && options.plugins.legend) {
                options.plugins.legend.position = isMobile ? 'bottom' : 'right';
                options.plugins.legend.labels = {
                    ...options.plugins.legend.labels,
                    boxWidth: isMobile ? 12 : 20,
                    padding: isMobile ? 8 : 15,
                    font: {
                        size: isMobile ? 10 : 12
                    }
                };
            }
            
            // Ajustar tooltips
            if (options.plugins && options.plugins.tooltip) {
                options.plugins.tooltip.titleFont = {
                    size: isMobile ? 12 : 14
                };
                options.plugins.tooltip.bodyFont = {
                    size: isMobile ? 10 : 12
                };
            }
            
            // Atualizar gráfico
            chart.update('none');
        });
    }

    // Função para ajustar layout baseado no tamanho da tela
    function handleResponsiveLayout() {
        const isMobile = window.innerWidth <= 768;
        const isTablet = window.innerWidth <= 992;
        const isSmallMobile = window.innerWidth <= 480;
        
        // Ajustar tabelas
        setupTableEnhancements();
        
        // Otimizar gráficos
        optimizeChartsForMobile();
        
        // Ajustar cards do dashboard
        const dashboardCards = document.querySelector('.dashboard-cards');
        if (dashboardCards && isMobile) {
            dashboardCards.style.gridTemplateColumns = '1fr';
        }
        
        // Ajustar filtros
        const filtersContainer = document.querySelector('.filters-container');
        if (filtersContainer) {
            if (isMobile) {
                filtersContainer.classList.add('mobile-layout');
            } else {
                filtersContainer.classList.remove('mobile-layout');
            }
        }
        
        // Ajustar tela de perfil
        const perfilSection = document.getElementById('perfil');
        if (perfilSection) {
            const usersList = document.getElementById('users-list');
            if (usersList) {
                if (isSmallMobile) {
                    usersList.classList.add('compact-view');
                } else {
                    usersList.classList.remove('compact-view');
                }
            }
        }
    }

    // --- INICIALIZAÇÃO ---
    async function initialize() {
        console.log('Inicializando aplicativo');
        // Configuração inicial
        setupMobileMenu();
        setupNavigation();
        setupTheme();
        setupEventListeners();
        setupTableEnhancements();
        
        // Configurar clique na logo para recarregar o app e ir para o Dashboard
        const appLogo = document.querySelector('.app-logo');
        if (appLogo) {
            appLogo.style.cursor = 'pointer';
            appLogo.setAttribute('title', 'Ir para o Dashboard');
            appLogo.addEventListener('click', () => {
                window.location.href = 'index.html#dashboard';
                window.location.reload();
            });
        }
        
        // Setup responsivo
        handleResponsiveLayout();
        window.addEventListener('resize', handleResponsiveLayout);
        
        // Inicializar páginas
        pages = document.querySelectorAll('.page');
        
        // Gate de autenticação PRIMEIRO
        applyAuthState();
        
        if (!isAuthenticated()) {
            // Garantir que apenas login seja visível
            setAppVisible(false);
            return;
        }

        // Se já logado: mostrar app e inicializar dados
        setAppVisible(true);
        try {
            await afterLoginBoot();
        } catch (error) {
            console.error(error);
            const tbody = getResumosTbody();
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="11">${error.message}</td></tr>`;
            }
        }
    }
    
    // Função para reaplicar restrições de usuário
    function reapplyUserRestrictions() {
        console.log('Reaplicando restrições de usuário');
        // Reaplicar filtros e renderizar tabelas para garantir que as restrições sejam aplicadas
        if (document.getElementById('resumos') && document.getElementById('resumos').style.display !== 'none') {
            applyResumosFilters();
        }
    }

    async function fetchRegistrosCompletos() {
        try {
            const response = await fetch(`${apiUrl}/registros`);
            if (!response.ok) throw new Error('Não foi possível buscar os registros.');
            return await response.json();
        } catch (error) {
            console.error(error);
            if(resumosTableBody) resumosTableBody.innerHTML = `<tr><td colspan="10">${error.message}</td></tr>`;
            return null;
        }
    }

    // --- CONFIGURAÇÕES INICIAIS ---
    function setupNavigation() {
        // A navegação mobile já é configurada em setupMobileMenu()
        // Aqui configuramos apenas os clicks de navegação
        
        // Remover event listeners anteriores para evitar duplicação
        navLinks.forEach(link => {
            const newLink = link.cloneNode(true);
            link.parentNode.replaceChild(newLink, link);
        });
        
        // Recarregar os links após a clonagem
        navLinks = document.querySelectorAll('.nav-link');
        
        // Garantir que todos os links tenham o estilo de cursor correto
        navLinks.forEach(link => {
            // Aplicar estilo de cursor diretamente
            link.style.cursor = 'pointer';
            link.style.pointerEvents = 'auto';
            
            // Garantir que o link seja clicável em dispositivos touch
            link.style.touchAction = 'manipulation';
        });
        
        // Adicionar evento de clique a cada link
        navLinks.forEach(link => {
            // Usar apenas o evento de clique para simplificar
            link.addEventListener('click', handleNavigation);
            
            // Adicionar evento touchend para dispositivos móveis
            // Isso ajuda a garantir que o clique seja processado corretamente em dispositivos touch
            link.addEventListener('touchend', (e) => {
                e.preventDefault();
                handleNavigation(e);
            });
        });
    }
    
    // Função separada para lidar com a navegação
    function handleNavigation(e) {
        e.preventDefault();
        e.stopPropagation(); // Previne propagação para o overlay
        
        console.log('Link de navegação clicado:', e.currentTarget.href);
        console.log('Link clicado:', e.currentTarget.textContent.trim());
        
        // Usar currentTarget em vez de target.closest para garantir que pegamos o link correto
        const clickedLink = e.currentTarget;
        
        // Gate de autenticação
        if (!isAuthenticated()) {
            console.log('Usuário não autenticado, redirecionando para tela de login');
            showLoginScreen();
            return;
        }
        
        console.log('Usuário autenticado, prosseguindo com navegação');

        const href = clickedLink.getAttribute('href') || '';
        const targetId = href.includes('#') ? href.split('#').pop() : href.replace('#', '');
        console.log('Navegando para:', targetId);

        // Recalcular as páginas no momento do clique (garante NodeList atualizado)
        pages = document.querySelectorAll('.page');
        
        // Esconder todas as páginas e exibir a selecionada
        pages.forEach(page => {
            page.style.display = 'none';
        });
        
        const targetPage = document.getElementById(targetId);
        if (targetPage) {
            targetPage.style.display = 'block';
            console.log('Página alvo exibida:', targetId);
            
            // Forçar um reflow para garantir que a página seja exibida
            void targetPage.offsetWidth;
        } else {
            console.log('Página alvo não encontrada:', targetId);
        }

        // Atualizar links ativos
        navLinks.forEach(navLink => {
            navLink.classList.remove('active');
        });
        clickedLink.classList.add('active');

        // Atualizar o hash da URL para refletir a navegação
        if (targetId && window.location.hash !== `#${targetId}`) {
            window.location.hash = `#${targetId}`;
        }
        
        // Executar a navegação imediatamente e fechar o menu depois
        // Carregar conteúdo dinâmico das páginas
        loadDynamicContent(targetId);
        
        // Fechar o menu mobile se estiver em viewport mobile
        // Removido o setTimeout para garantir que a navegação ocorra imediatamente
        if (window.innerWidth <= 992) {
            console.log('Fechando menu mobile após navegação para:', targetId);
            // Fechar o menu diretamente, sem delay
            mainNav.classList.remove('show');
            sidebarOverlay.classList.remove('show');
            mobileMenuBtn.classList.remove('active');
            mobileMenuBtn.setAttribute('aria-expanded', 'false');
            document.body.style.overflow = '';
        }
    }
    
    // Função para carregar conteúdo dinâmico das páginas
    function loadDynamicContent(targetId) {
        // Carregar conteúdo dinâmico das páginas após um pequeno atraso
        // para garantir que a navegação básica já tenha acontecido
        setTimeout(() => {
            if (targetId === 'dashboard') {
                console.log('Atualizando dashboard');
                updateDashboard(registrosCompletos);
            } else if (targetId === 'relatorios') {
                console.log('Configurando página de relatórios');
                const relatoriosPage = document.getElementById('relatorios');
                if (relatoriosPage && !relatoriosPage.innerHTML.includes('<h2>')) {
                    relatoriosPage.innerHTML = `
                                <h2>Relatórios</h2>
                                <div class="filters-container mobile-friendly">
                                    <div class="filter-search-wrapper">
                                        <i class="fa-solid fa-search search-icon"></i>
                                        <input type="text" id="relatorios-search" placeholder="Buscar produtos, vendedores...">
                                    </div>

                                    <div class="filter-group-row">
                                        <div class="date-filters">
                                            <div class="filter-group">
                                                <label>Início</label>
                                                <input type="date" id="relatorios-data-inicio">
                                            </div>
                                            <div class="filter-group">
                                                <label>Fim</label>
                                                <input type="date" id="relatorios-data-fim">
                                            </div>
                                        </div>

                                        <div class="select-filters">
                                            <select id="relatorios-produto"><option value="">Todos os Produtos</option></select>
                                            <select id="relatorios-vendedor"><option value="">Todos os Vendedores</option></select>
                                            <select id="relatorios-motivo"><option value="">Todos os Motivos</option></select>
                                        </div>

                                        <div class="filter-actions">
                                            <button id="relatorios-limpar-filtros" class="button secondary-btn">
                                                <i class="fa-solid fa-eraser"></i>
                                                <span>Limpar</span>
                                            </button>

                                            <div class="predefined-periods">
                                                <button class="button period-btn" data-period="yesterday">
                                                    <i class="fa-solid fa-calendar-minus"></i>
                                                    <span>Ontem</span>
                                                </button>
                                                <button class="button period-btn" data-period="today">
                                                    <i class="fa-solid fa-calendar-day"></i>
                                                    <span>Hoje</span>
                                                </button>
                                                <button class="button period-btn" data-period="week">
                                                    <i class="fa-solid fa-calendar-week"></i>
                                                    <span>Semana</span>
                                                </button>
                                                <button class="button period-btn" data-period="month">
                                                    <i class="fa-solid fa-calendar"></i>
                                                    <span>Mês</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div class="relatorio-actions">
                                    <button id="gerar-relatorio-html">Gerar Relatório HTML</button>
                                    <button id="gerar-relatorio-csv">Gerar Relatório CSV</button>
                                </div>
                                <div id="relatorio-output"></div>
                            `;
                        }
                        populateRelatoriosFilters();
                        setupRelatoriosFilters();
                        setupReportEventListeners();
                    } else if (targetId === 'resumos') {
                        console.log('Aplicando filtros de resumos');
                        // Aplicar restrições de usuário quando navegar para a página de resumos
                        applyResumosFilters();
                    } else if (targetId === 'historico') {
                        console.log('Configurando página de histórico');
                        const historicoPage = document.getElementById('historico');
                        if (historicoPage && !historicoPage.innerHTML.includes('<h2>')) {
                            historicoPage.innerHTML = `
                                <h2>Histórico de Edição</h2>
                                <div class="historico-controls">
                                    <button id="carregar-historico-completo" class="button">Recarregar Histórico</button>
                                    <span class="historico-info">Carregando histórico...</span>
                                </div>
                                <div id="historico-lista"></div>
                            `;
                            
                            // Event listener para carregar histórico completo
                            document.getElementById('carregar-historico-completo')?.addEventListener('click', async () => {
                                await carregarHistoricoCompleto();
                            });
                            
                            // Carregar histórico do Supabase automaticamente
                            carregarHistoricoCompleto();
                        } else {
                            // Se a página já foi inicializada, apenas exibir o histórico
                            exibirHistorico();
                        }
                    }
                    
                    console.log('Navegação concluída');
                }, 50);
    }

    function setupTheme() {
        const dn = document.getElementById('dn');
        const savedTheme = localStorage.getItem('theme') || 'light-mode';
        
        // Aplicar tema inicial mantendo outras classes
        const existingClasses = document.body.className.split(' ').filter(cls => !cls.includes('mode'));
        document.body.className = [savedTheme, ...existingClasses].join(' ');
        
        if (dn) dn.checked = savedTheme === 'dark-mode';

        // Atualizar background do login
        updateLoginBackground();

        dn?.addEventListener('change', () => {
            const dark = dn.checked;
            const newTheme = dark ? 'dark-mode' : 'light-mode';
            
            // Manter outras classes e apenas trocar o tema
            const currentClasses = document.body.className.split(' ').filter(cls => !cls.includes('mode'));
            document.body.className = [newTheme, ...currentClasses].join(' ');
            
            localStorage.setItem('theme', newTheme);
            updateLoginBackground();
            
            // Apenas atualizar tema dos gráficos se dashboard estiver visível
            const dashboardSection = document.getElementById('dashboard');
            if (dashboardSection && dashboardSection.style.display !== 'none' && registrosCompletos.length > 0) {
                // Recriar apenas os gráficos com o novo tema
                if (typeof updateChartsTheme === 'function') {
                    updateChartsTheme();
                } else {
                    // Fallback: recriar dashboard apenas se necessário
                    setTimeout(() => updateDashboard(registrosCompletos), 100);
                }
            }
        });
    }
    
    function updateLoginBackground() {
        if (loginScreen) {
            const isDark = document.body.classList.contains('dark-mode');
            loginScreen.style.backgroundImage = isDark ? "url('temaescuro.png')" : "url('temaclaro.png')";
        }
    }

    async function fetchProdutos() {
        try {
            const response = await fetch('produtos.json');
            if (!response.ok) throw new Error('Falha ao carregar produtos.');
            produtosData = await response.json();
            produtoSelect.innerHTML =
              '<option value="">Selecione...</option>' +
              produtosData.map(p => `<option value="${p.Produtos}" data-familia="${p.Familia}">${p.Produtos}</option>`).join('') +
              `<option value="Outro (digitar)" data-familia="">Outro (digitar)</option>`;
        } catch (error) { console.error(error); }
    }

    function setupEventListeners() {
        registroForm?.addEventListener('submit', handleRegistroSubmit);
        produtoSelect?.addEventListener('change', () => {
          const selectedOption = produtoSelect.options[produtoSelect.selectedIndex];

          // Se usuário escolheu "Outro (digitar)" → pedir Produto e Família
          if (produtoSelect.value === 'Outro (digitar)') {
            const customProduto = window.prompt('Digite a descrição do produto:');
            if (!customProduto || !customProduto.trim()) {
              produtoSelect.value = '';
              familiaInput.value = '';
              return;
            }
            const customFamilia = window.prompt('Digite a Família do produto:');
            const val = customProduto.trim();

            // Cria/seleciona a opção de produto personalizada
            let opt = Array.from(produtoSelect.options).find(o => o.value === val);
            if (!opt) {
              opt = document.createElement('option');
              opt.value = val;
              opt.textContent = val;
              opt.setAttribute('data-familia', customFamilia || '');
              produtoSelect.appendChild(opt);
            } else {
              opt.setAttribute('data-familia', customFamilia || '');
            }
            produtoSelect.value = val;
            familiaInput.value = customFamilia || '';
            return;
          }

          // Fluxo normal: usar a família do dataset
          familiaInput.value = selectedOption?.dataset?.familia || '';
        });
        document.getElementById('data-recebimento')?.addEventListener('change', calcularTempo);

        const editModal = document.getElementById('edit-modal');
        const closeBtn = editModal?.querySelector('.close-btn');
        const editForm = document.getElementById('edit-form');

        if (closeBtn) closeBtn.onclick = () => { if (editModal) editModal.style.display = "none"; };
        window.onclick = (event) => {
            if (event.target == editModal) {
                editModal.style.display = "none";
            }
        }
        editForm?.addEventListener('submit', handleUpdateRegistro);

        setupReportEventListeners();

        // ===== Autenticação =====

        // Login tradicional
        customLoginForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = loginEmailInput?.value?.trim();
            const senha = loginSenhaInput?.value;
            if (!email || !senha) return;

            try {
                const resp = await fetch(`${apiUrl}/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, senha })
                });
                if (!resp.ok) {
                    const err = await resp.json().catch(() => ({}));
                    throw new Error(err.error || err.details || 'Falha no login');
                }
                const data = await resp.json();
                localStorage.setItem('user', JSON.stringify(data.user));
                applyAuthState();
                await afterLoginBoot();
                alert('Login realizado com sucesso!');
                // Redirecionar para a página de dashboard após o login
                window.location.href = 'index.html#dashboard';
            } catch (error) {
                alert(`Erro de login: ${error.message}`);
                console.error('Erro de login:', error);
            }
        });

        // Cadastro
        signupForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const usuario = signupUsuarioInput?.value?.trim();
            const email = signupEmailInput?.value?.trim();
            const senha = signupSenhaInput?.value;
            const tipo = 'operacao'; // Definido automaticamente como 'operacao'

            if (!usuario || !email || !senha) {
                alert('Por favor, preencha todos os campos.');
                return;
            }

            try {
                const resp = await fetch(`${apiUrl}/signup`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ usuario, email, senha, tipo })
                });
                if (!resp.ok) {
                    const err = await resp.json().catch(() => ({}));
                    throw new Error(err.error || err.details || 'Falha no cadastro');
                }
                const data = await resp.json();
                alert('Cadastro realizado com sucesso!');
            // Redirecionar para a página de login após o cadastro
            window.location.href = 'index.html#login';
            } catch (error) {
                alert(`Erro de cadastro: ${error.message}`);
                console.error('Erro de cadastro:', error);
            }
        });

        // Google (placeholder)
        googleLoginBtn?.addEventListener('click', () => {
            const w = 500, h = 600;
            const left = (screen.width - w) / 2;
            const top = (screen.height - h) / 2;
            window.open('/api/auth/google', 'googleAuth', `width=${w},height=${h},left=${left},top=${top}`);
        });

        // Logout
        logoutBtn?.addEventListener('click', () => {
            localStorage.removeItem('user');
            appBootstrapped = false;
            applyAuthState();
            alert('Você saiu da aplicação.');
        });

        window.addEventListener('message', async (event) => {
            const data = event.data;
            if (!data || data.source !== 'repasse-auth') return;
            if (data.status === 'success' && data.user) {
                localStorage.setItem('user', JSON.stringify(data.user));
                applyAuthState();
                await afterLoginBoot();
            } else {
                alert(`Erro no login Google: ${data.error || 'Falha desconhecida'}`);
            }
        });

        // Motivos (completo, baseado no promptAPPrepasse.txt)
        const MOTIVOS = [
          'Baixa Qualidade','Baixo Peso','Cicatrizes e/ou Manchas','Colar Data De Embalagem',
          'Colar Etiqueta e/ou Cinta','Danos','Danos Graves','Danos Leves','Desidratação',
          'Direcionado','Evoluindo','Maturacao','Morfo','Podridao','Podridao E Morfo',
          'Produto Velho','Tempo De Estoque','Outro (digitar)'
        ];

        function populateMotivoOptions() {
          const motivoSelect = document.getElementById('motivo');
          const editMotivoSelect = document.getElementById('edit-motivo');
          const optionsHtml = MOTIVOS.map(m => `<option value="${m}">${m}</option>`).join('');
          if (motivoSelect) motivoSelect.innerHTML = optionsHtml;
          if (editMotivoSelect) editMotivoSelect.innerHTML = optionsHtml;
        }

        function handleOutroMotivo(selectEl) {
          if (!selectEl) return;
          if (selectEl.value === 'Outro (digitar)') {
            const custom = window.prompt('Digite o motivo:');
            if (custom && custom.trim()) {
              const val = custom.trim();
              let opt = Array.from(selectEl.options).find(o => o.value === val);
              if (!opt) {
                opt = document.createElement('option');
                opt.value = val;
                opt.textContent = val;
                selectEl.appendChild(opt);
              }
              selectEl.value = val;
            } else {
              selectEl.value = '';
            }
          }
        }

        document.getElementById('motivo')?.addEventListener('change', (e) => handleOutroMotivo(e.target));
        document.getElementById('edit-motivo')?.addEventListener('change', (e) => handleOutroMotivo(e.target));

        familiaInput?.addEventListener('dblclick', () => {
          const customFamilia = window.prompt('Digite a Família do produto:');
          if (typeof customFamilia === 'string') {
            familiaInput.value = customFamilia.trim();
          }
        });
    }

    function setupReportEventListeners() {
        document.getElementById('gerar-relatorio-html')?.addEventListener('click', gerarRelatorioHtml);
        document.getElementById('gerar-relatorio-csv')?.addEventListener('click', gerarRelatorioCsv);
    }

    // --- TELA DE REGISTRO ---
    function preencherCamposAutomaticos() {
        dataRepasseInput.value = getBahiaTodayISO();
        const nextId = (parseInt(localStorage.getItem('lastId') || 0)) + 1;
        registroIdInput.value = `S-REP.${String(nextId).padStart(7, '0')}`;

        const current = getCurrentUser();
        if (usuarioOperacoesInput) {
            usuarioOperacoesInput.value = current?.email || 'operador@example.com';
        }
    }

    async function handleRegistroSubmit(e) {
        e.preventDefault();
        const novoRegistro = {
            id: registroIdInput.value,
            dataRepasse: dataRepasseInput.value,
            usuarioOperacoes: usuarioOperacoesInput.value,
            produto: produtoSelect.value,
            familia: familiaInput.value,
            motivo: document.getElementById('motivo').value,
            dataRecebimento: document.getElementById('data-recebimento').value,
            'tempo(dias)': document.getElementById('tempo').value,
            observacao: document.getElementById('observacao').value,
            // Fluxo novo (vai direto para Resumos)
            quantidadeSolicitada: null,
            quantidadeRepassada: null,
            vendedor: null,
            status: 'Pendente'
        };

        console.log('Tentando adicionar registro ao backend:', novoRegistro);

        try {
            const response = await fetch(`${apiUrl}/registros`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(novoRegistro)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Falha na requisição POST (Registro): ${response.status} - ${errorText}`);
                throw new Error(`Falha ao salvar registro na planilha: ${response.status} - ${errorText}`);
            }
            
            const responseData = await response.json();
            console.log('Resposta do backend (Registro):', responseData);

            // Removido: registrosPendentes.push(...) e alerta para tela Solicitação
            alert(`Registro ${novoRegistro.id} salvo com sucesso! Vá para a tela "Resumos" para completar os dados.`);
            localStorage.setItem('lastId', parseInt(novoRegistro.id.split('.')[1]));
            registroForm.reset();
            preencherCamposAutomaticos();
            
            // Atualiza os dados completos após adicionar um novo registro
            const data = await fetchRegistrosCompletos();
            if (data) {
                registrosCompletos = data;
                relatoriosFilteredData = [...registrosCompletos];
            }
            renderResumosTable(registrosCompletos);
            updateDashboard(registrosCompletos);

        } catch (error) {
            console.error('Erro ao processar registro:', error);
            alert(`Erro: ${error.message || 'Ocorreu um erro desconhecido ao salvar o registro.'}`);
        }
    }

    // --- TELA DE SOLICITAÇÃO --- (Removida conforme NOVAIMPLEMENTACAO)
    // function exibirRegistrosPendentes() { /* removido */ }
    // async function handleSolicitacaoSubmit(e) { /* removido */ }

    async function handleUpdateRegistro(e) {
        e.preventDefault();
        const id = document.getElementById('edit-id').value;
        const index = registrosCompletos.findIndex(r => r.id === id);
        if (index === -1) return;

        // Converta valores numéricos, tratando vazios como null
        const quantidadeSolicitada = document.getElementById('edit-quantidade-solicitada').value.trim() ? parseFloat(document.getElementById('edit-quantidade-solicitada').value) : null;
        const quantidadeRepassada = document.getElementById('edit-quantidade-repassada').value.trim() ? parseFloat(document.getElementById('edit-quantidade-repassada').value) : null;

        const updatedRegistro = {
            ...registrosCompletos[index],
            dataRepasse: document.getElementById('edit-data-repasse').value,
            produto: document.getElementById('edit-produto').value,
            motivo: document.getElementById('edit-motivo').value,
            dataRecebimento: document.getElementById('edit-data-recebimento').value,
            vendedor: document.getElementById('edit-vendedor').value,
            quantidadeSolicitada: quantidadeSolicitada,
            quantidadeRepassada: quantidadeRepassada,
            status: document.getElementById('edit-status-repasse').value,
            observacao: document.getElementById('edit-observacao').value,
        };

        console.log('Tentando atualizar registro via modal no backend:', updatedRegistro);

        try {
            const response = await fetch(`${apiUrl}/registros/${id}`, { // Usando PUT para atualizar
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedRegistro)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Falha na requisição PUT (Edição): ${response.status} - ${errorText}`);
                throw new Error(`Falha ao atualizar registro na planilha: ${response.status} - ${errorText}`);
            }
            
            const responseData = await response.json();
            console.log('Resposta do backend (Edição):', responseData);

            registrosCompletos[index] = updatedRegistro;
            adicionarLogHistorico('Edição', `Registro ${id} foi atualizado.`);
            applyResumosFilters();
            updateDashboard(registrosCompletos);
            document.getElementById('edit-modal').style.display = 'none';
            alert('Registro atualizado com sucesso!');

        } catch (error) {
            console.error('Erro ao processar atualização via modal:', error);
            alert(`Erro: ${error.message || 'Ocorreu um erro desconhecido ao atualizar o registro.'}`);
        }
    }

    // --- TELA DE RESUMOS ---
    function setupResumosFilters() {
        const searchInput = document.getElementById('resumos-search');
        const startDateInput = document.getElementById('resumos-data-inicio');
        const endDateInput = document.getElementById('resumos-data-fim');
        const produtoSelect = document.getElementById('resumos-produto');
        const vendedorSelect = document.getElementById('resumos-vendedor');
        const motivoSelect = document.getElementById('resumos-motivo');
        const clearButton = document.getElementById('resumos-limpar-filtros');
        const periodButtons = document.querySelectorAll('#resumos .period-btn');
        const shareAllButton = document.getElementById('share-all-btn');

        const allInputs = [searchInput, startDateInput, endDateInput, produtoSelect, vendedorSelect, motivoSelect];
        allInputs.forEach(input => {
            if(input) input.addEventListener('change', applyResumosFilters);
            if(input && input.tagName === 'INPUT' && input.type === 'text') input.addEventListener('input', applyResumosFilters);
        });

        if(clearButton) {
            clearButton.addEventListener('click', () => {
                allInputs.forEach(input => { if(input) input.value = ''; });
                applyResumosFilters();
            });
        }

        // Data padrão: hoje (Bahia)
        const todayIso = getBahiaTodayISO();
        if (startDateInput && endDateInput) { startDateInput.value = todayIso; endDateInput.value = todayIso; }

        periodButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const btn = e.currentTarget;
                const period = btn.dataset.period;
                
                // Usar getBahiaDateISO para calcular as datas corretamente
                let startDate, endDate;
                if (period === 'yesterday') {
                    startDate = getBahiaDateISO(-1); // ontem
                    endDate = startDate;
                } else if (period === 'today') {
                    startDate = getBahiaDateISO(0); // hoje
                    endDate = startDate;
                } else if (period === 'week') {
                    // Semana = últimos 7 dias (incluindo hoje)
                    startDate = getBahiaDateISO(-6); // 6 dias atrás
                    endDate = getBahiaDateISO(0); // hoje
                } else if (period === 'month') {
                    const today = getBahiaDate();
                    startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
                    endDate = getBahiaDateISO(0);
                }
                
                if (startDateInput && endDateInput) {
                    startDateInput.value = startDate;
                    endDateInput.value = endDate;
                }
                applyResumosFilters();
            });
        });

        // 1) Data padrão: hoje
        const todayR = getBahiaTodayISO();
        if (startDateInput && endDateInput) { startDateInput.value = todayR; endDateInput.value = todayR; }

        // 2) Reduzir tamanho base da tabela e permitir zoom
        let resumosZoom = 0.9; // menor que 1 por padrão
        function applyResumosZoom() {
            const tbl = document.getElementById('resumos-table');
            const size = Math.max(0.6, Math.min(1.6, resumosZoom));
            if (tbl) tbl.style.fontSize = `${0.85 * size}em`;
        }
        applyResumosZoom();
        document.getElementById('resumos-zoom-in')?.addEventListener('click', () => { resumosZoom += 0.1; applyResumosZoom(); });
        document.getElementById('resumos-zoom-out')?.addEventListener('click', () => { resumosZoom -= 0.1; applyResumosZoom(); });
        document.getElementById('resumos-zoom-reset')?.addEventListener('click', () => { resumosZoom = 1; applyResumosZoom(); });

        // Event listener para o botão de compartilhar todos os resumos
        if (shareAllButton) {
            shareAllButton.addEventListener('click', function() {
                // Usar os dados filtrados atuais para gerar o resumo consolidado
                const filteredData = getFilteredResumosData();
                gerarResumoConsolidado(filteredData);
            });
        }
        
        // Aplicar filtros de hoje no primeiro load
        applyResumosFilters();
    }

    function populateResumosFilters() {
        const produtos = [...new Set(registrosCompletos.map(r => r.produto).filter(Boolean))];
        const vendedores = [...new Set(registrosCompletos.map(r => r.vendedor).filter(Boolean))];
        const motivos = [...new Set(registrosCompletos.map(r => r.motivo).filter(Boolean))];

        const produtoSelect = document.getElementById('resumos-produto');
        const vendedorSelect = document.getElementById('resumos-vendedor');
        const motivoSelect = document.getElementById('resumos-motivo');

        if(produtoSelect) produtoSelect.innerHTML = '<option value="">Todos os Produtos</option>' + produtos.map(p => `<option value="${p}">${p}</option>`).join('');
        if(vendedorSelect) vendedorSelect.innerHTML = '<option value="">Todos os Vendedores</option>' + vendedores.map(v => `<option value="${v}">${v}</option>`).join('');
        if(motivoSelect) motivoSelect.innerHTML = '<option value="">Todos os Motivos</option>' + motivos.map(m => `<option value="${m}">${m}</option>`).join('');
    }

    function getFilteredResumosData() {
        const searchTerm = document.getElementById('resumos-search').value.toLowerCase();
        const startDate = document.getElementById('resumos-data-inicio').value;
        const endDate = document.getElementById('resumos-data-fim').value;
        const produto = document.getElementById('resumos-produto').value;
        const vendedor = document.getElementById('resumos-vendedor').value;
        const motivo = document.getElementById('resumos-motivo').value;

        return registrosCompletos.filter(r => {
            const searchMatch = !searchTerm || Object.values(r).some(val => String(val).toLowerCase().includes(searchTerm));
            const startDateMatch = !startDate || r.dataRepasse >= startDate;
            const endDateMatch = !endDate || r.dataRepasse <= endDate;
            const produtoMatch = !produto || r.produto === produto;
            const vendedorMatch = !vendedor || r.vendedor === vendedor;
            const motivoMatch = !motivo || r.motivo === motivo;
            return searchMatch && startDateMatch && endDateMatch && produtoMatch && vendedorMatch && motivoMatch;
        });
    }
    
    function applyResumosFilters() {
        console.log('Aplicando filtros de resumos');
        const filteredData = getFilteredResumosData();
        renderResumosTable(filteredData);
        updateResumosSummaryCards(filteredData);
    }

    function renderResumosTable(data) {
        // Buscar o tbody correto e proteger contra ausência de elemento
        const resumosTableBody = getResumosTbody();
        if (!resumosTableBody) {
            console.warn('Elemento #resumos-tbody não encontrado. Abortando renderResumosTable.');
            return;
        }

        resumosTableBody.innerHTML = '';

        if (!data || data.length === 0) {
            // Ajuste o colspan conforme a quantidade de colunas do seu header (11 no seu caso)
            resumosTableBody.innerHTML = '<tr><td colspan="11">Nenhum registro encontrado.</td></tr>';
            return;
        }

        // Verificar o tipo de usuário para aplicar restrições
        const currentUser = getCurrentUser();
        const userType = (currentUser?.tipo || '').toLowerCase();
        const isComercial = userType === 'comercial';
        const isGerencia = userType === 'gerencia';
        const isOperacao = userType === 'operacao' || userType === 'operação';

        data.forEach(registro => {
            const row = document.createElement('tr');
            const statusClass = (() => {
                const s = (registro.status || '').toLowerCase();
                if (s === 'pendente') return 'status-pendente';
                if (s === 'iniciado') return 'status-iniciado';
                if (s === '100% concluído') return 'status-completo';
                if (s === 'concluído parcialmente') return 'status-parcial';
                return '';
            })();
            
            // Se for usuário comercial ou gerencia, desabilitar o campo de quantidade repassada
            const qtdRepassadaInput = isComercial || isGerencia
                ? `<input type="number" class="qtd-repassada-input" data-id="${registro.id}" value="${registro.quantidadeRepassada ?? ''}" min="0" step="any" disabled />`
                : `<input type="number" class="qtd-repassada-input" data-id="${registro.id}" value="${registro.quantidadeRepassada ?? ''}" min="0" step="any" />`;
            
            // Se for usuário comercial, ocultar botões de edição e exclusão
            const actionButtons = isComercial
                ? `
                    <button class="share-btn button button-sm icon-btn" data-id="${registro.id}" title="Compartilhar WhatsApp"><span class="icon">📤</span></button>
                `
                : `
                    <button class="edit-btn button button-sm icon-btn" data-id="${registro.id}" title="Editar"><span class="icon">✏️</span></button>
                    <button class="share-btn button button-sm icon-btn" data-id="${registro.id}" title="Compartilhar WhatsApp"><span class="icon">📤</span></button>
                    <button class="delete-btn button button-sm icon-btn" data-id="${registro.id}" title="Excluir"><span class="icon">🗑️</span></button>
                `;

            row.innerHTML = `
                <td>${registro.id || ''}</td>
                <td>${registro.dataRepasse ? formatISOToPtBR(registro.dataRepasse) : ''}</td>
                <td>${registro.produto || ''}</td>
                <td>${registro.motivo || ''}</td>
                <td>${registro['tempo(dias)'] || ''}</td>
                <td>
                    ${isGerencia || isOperacao ? 
                    `<button class="quantidade-btn button button-sm" data-id="${registro.id}" title="Adicionar Quantidade" style="display: none;">
                        <span class="icon">➕</span>
                        <span>Quantidade</span>
                    </button>` : 
                    `<button class="quantidade-btn button button-sm" data-id="${registro.id}" title="Adicionar Quantidade">
                        <span class="icon">➕</span>
                        <span>Quantidade</span>
                    </button>`}
                </td>
                <td>${registro.quantidadeSolicitada ?? ''}</td>
                <td>
                    ${qtdRepassadaInput}
                </td>
                <td>${registro.vendedor || ''}</td>
                <td>
                    <span class="status-badge ${statusClass} status-toggle" data-id="${registro.id}" ${isComercial ? 'style="pointer-events: none;"' : ''}>
                        ${registro.status || 'Pendente'}
                    </span>
                </td>
                <td class="actions-cell">
                    ${actionButtons}
                </td>`;
            resumosTableBody.appendChild(row);
        });
        addResumoActionListeners();
    }

    function addResumoActionListeners() {
        // Verificar o tipo de usuário para aplicar restrições
        const currentUser = getCurrentUser();
        const userType = (currentUser?.tipo || '').toLowerCase();
        const isComercial = userType === 'comercial';
        const isGerencia = userType === 'gerencia';

        document.querySelectorAll('.delete-btn').forEach(btn => {
            // Ocultar botão de exclusão para usuários comerciais e gerencia
            if (isComercial || isGerencia) {
                btn.style.display = 'none';
                return;
            }
            
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.dataset.id;
                if (confirm(`Tem certeza que deseja excluir o registro ${id}?`)) {
                    await handleDeleteRegistro(id);
                }
            });
        });
        
        document.querySelectorAll('.share-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                const registro = registrosCompletos.find(r => r.id === id);
                if (registro) gerarResumoWhatsApp(registro);
            });
        });
        
        document.querySelectorAll('.edit-btn').forEach(btn => {
            // Ocultar botão de edição para usuários comerciais e gerencia
            if (isComercial || isGerencia) {
                btn.style.display = 'none';
                return;
            }
            
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                const registro = registrosCompletos.find(r => r.id === id);
                if (registro) openEditModal(registro);
            });
        });

        // Atualização de Qtd. Repassada com auto-status
        document.querySelectorAll('.qtd-repassada-input').forEach(inp => {
            // Desabilitar campo de quantidade repassada para usuários comerciais e gerencia
            if (isComercial || isGerencia) {
                inp.disabled = true;
                return;
            }
            
            inp.addEventListener('change', async (e) => {
                const id = e.currentTarget.dataset.id;
                const valRaw = e.currentTarget.value.trim();
                const value = valRaw === '' ? null : parseFloat(valRaw);
                
                // Buscar o registro para obter a quantidade solicitada
                const registro = registrosCompletos.find(r => r.id === id);
                if (!registro) return;
                
                // Determinar o novo status baseado na quantidade
                let newStatus = registro.status; // manter status atual por padrão
                const qtdSolicitada = parseFloat(registro.quantidadeSolicitada) || 0;
                
                if (value === null || value <= 0) {
                    // Se não há quantidade repassada ou é zero/negativa, não alterar status
                } else if (value >= qtdSolicitada && qtdSolicitada > 0) {
                    // Se quantidade repassada >= quantidade solicitada, status = 100% Concluído
                    newStatus = '100% Concluído';
                } else if (value > 0 && value < qtdSolicitada) {
                    // Se quantidade repassada > 0 e < quantidade solicitada, status = Concluído Parcialmente
                    newStatus = 'Concluído Parcialmente';
                }
                
                // Atualizar registro com nova quantidade e status (se mudou)
                const updateData = { quantidadeRepassada: value };
                if (newStatus !== registro.status) {
                    updateData.status = newStatus;
                }
                
                await updateRegistroById(id, updateData);
                applyResumosFilters();
                updateDashboard(registrosCompletos);
            });
        });

        // Toggle status clicável
        document.querySelectorAll('.status-toggle').forEach(span => {
            // Desabilitar toggle de status para usuários comerciais
            if (isComercial) {
                span.style.pointerEvents = 'none';
                return;
            }
            
            span.addEventListener('click', async (e) => {
                const id = e.currentTarget.dataset.id;
                const current = e.currentTarget.textContent.trim();
                const next = getNextStatus(current);
                await updateRegistroById(id, { status: next });
                applyResumosFilters(); // re-render para atualizar badge/classe
                updateDashboard(registrosCompletos);
            });
        });

        // Botão de quantidade
        document.querySelectorAll('.quantidade-btn').forEach(btn => {
            // Ocultar botão de quantidade para usuários gerencia e operacao
            if (isGerencia || isOperacao) {
                btn.style.display = 'none';
                return;
            }
            
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                const registro = registrosCompletos.find(r => r.id === id);
                if (registro) openQuantidadeModal(registro);
            });
        });

    }


    
    async function updateRegistroById(id, patch) {
        try {
            const originalIndex = registrosCompletos.findIndex(r => r.id === id);
            if (originalIndex === -1) throw new Error('Registro não encontrado localmente.');
            
            // Mesclar os dados existentes com os novos dados
            const body = { ...registrosCompletos[originalIndex], ...patch };
            
            // Limpar campos vazios para evitar erros no Supabase
            const cleanBody = {};
            for (const key in body) {
                if (body.hasOwnProperty(key)) {
                    // Converter campos numéricos vazios para null
                    if (key.includes('quantidade') && (body[key] === '' || body[key] === undefined)) {
                        cleanBody[key] = null;
                    } 
                    // Converter campos de data vazios para null
                    else if ((key.includes('data') || key.includes('Data')) && body[key] === '') {
                        cleanBody[key] = null;
                    }
                    // Manter outros valores como estão, exceto undefined
                    else if (body[key] !== undefined) {
                        cleanBody[key] = body[key];
                    }
                }
            }
            
            console.log(`[Frontend] Enviando atualização para registro ${id}:`, cleanBody);

            const resp = await fetch(`${apiUrl}/registros/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cleanBody)
            });
            
            if (!resp.ok) {
                const t = await resp.text();
                throw new Error(`Falha ao atualizar (${resp.status}): ${t}`);
            }
            
            const updated = await resp.json();
            registrosCompletos[originalIndex] = updated;
            
            // Adicionar log de histórico
            adicionarLogHistorico('Edição', `Registro ${id} atualizado (${Object.keys(patch).join(', ')}).`);
            
            return updated;
        } catch (e) {
            console.error('updateRegistroById erro:', e);
            alert(e?.message || 'Falha ao atualizar registro.');
            throw e;
        }
    }

    function getNextStatus(current) {
        const order = ['Pendente', 'Iniciado', '100% Concluído', 'Concluído Parcialmente'];
        const idx = order.findIndex(s => s.toLowerCase() === (current || '').toLowerCase());
        const next = order[(idx + 1) % order.length] || order[0];
        return next;
    }

    async function updateQuantidadeRepassada(id, newValue) {
        const registro = registrosCompletos.find(r => r.id === id);
        if (!registro) return;
        
        const oldValue = registro.quantidadeRepassada;
        if (oldValue === newValue) return;
        
        try {
            // Obter o email do usuário atual
            const currentUser = getCurrentUser();
            const usuarioComercial = currentUser?.email || 'usuariodocemel@gmail.com'; // Valor padrão como no exemplo
            
            const updatedRegistro = { ...registro, quantidadeRepassada: newValue, usuarioComercial: usuarioComercial };
            
            const response = await fetch(`${apiUrl}/registros/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedRegistro)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Falha ao atualizar quantidade: ${response.status} - ${errorText}`);
            }
            
            // Update local data
            const index = registrosCompletos.findIndex(r => r.id === id);
            if (index !== -1) {
                registrosCompletos[index] = updatedRegistro;
            }
            
            // Auto-update status based on quantity
            await autoUpdateStatus(id, newValue, registro.quantidadeSolicitada);
            
            console.log(`Quantidade repassada atualizada para registro ${id}: ${newValue}`);
            
        } catch (error) {
            console.error('Erro ao atualizar quantidade:', error);
            // Revert input value on error
            const input = document.querySelector(`.qtd-repassada-input[data-id="${id}"]`);
            if (input) input.value = oldValue ?? '';
            alert(`Erro ao atualizar quantidade: ${error.message}`);
        }
    }
    
    async function autoUpdateStatus(id, quantidadeRepassada, quantidadeSolicitada) {
        if (!quantidadeSolicitada || quantidadeSolicitada <= 0) return;
        
        let newStatus;
        if (!quantidadeRepassada || quantidadeRepassada <= 0) {
            newStatus = 'Pendente';
        } else if (quantidadeRepassada >= quantidadeSolicitada) {
            newStatus = '100% Concluído';
        } else {
            newStatus = 'Concluído Parcialmente';
        }
        
        const registro = registrosCompletos.find(r => r.id === id);
        if (!registro || registro.status === newStatus) return;
        
        try {
            const updatedRegistro = { ...registro, status: newStatus };
            
            const response = await fetch(`${apiUrl}/registros/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedRegistro)
            });
            
            if (!response.ok) {
                throw new Error(`Falha ao atualizar status: ${response.status}`);
            }
            
            // Update local data
            const index = registrosCompletos.findIndex(r => r.id === id);
            if (index !== -1) {
                registrosCompletos[index] = updatedRegistro;
            }
            
            // Update UI
            const statusBadge = document.querySelector(`.status-toggle[data-id="${id}"]`);
            if (statusBadge) {
                statusBadge.textContent = newStatus;
                statusBadge.className = statusBadge.className.replace(/status-\w+/g, '');
                const statusClass = (() => {
                    const s = newStatus.toLowerCase();
                    if (s === 'pendente') return 'status-pendente';
                    if (s === 'iniciado') return 'status-iniciado';
                    if (s === '100% concluído') return 'status-completo';
                    if (s === 'concluído parcialmente') return 'status-parcial';
                    return '';
                })();
                statusBadge.classList.add(statusClass);
            }
            
            console.log(`Status auto-atualizado para registro ${id}: ${newStatus}`);
            
        } catch (error) {
            console.error('Erro ao auto-atualizar status:', error);
        }
    }
    
    async function toggleStatus(id) {
        const registro = registrosCompletos.find(r => r.id === id);
        if (!registro) return;
        
        const statusOptions = ['Pendente', 'Iniciado', 'Concluído Parcialmente', '100% Concluído'];
        const currentIndex = statusOptions.indexOf(registro.status);
        const newStatus = statusOptions[(currentIndex + 1) % statusOptions.length];
        
        try {
            const updatedRegistro = { ...registro, status: newStatus };
            
            const response = await fetch(`${apiUrl}/registros/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedRegistro)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Falha ao atualizar status: ${response.status} - ${errorText}`);
            }
            
            // Update local data
            const index = registrosCompletos.findIndex(r => r.id === id);
            if (index !== -1) {
                registrosCompletos[index] = updatedRegistro;
            }
            
            // Update UI
            const statusBadge = document.querySelector(`.status-toggle[data-id="${id}"]`);
            if (statusBadge) {
                statusBadge.textContent = newStatus;
                statusBadge.className = statusBadge.className.replace(/status-\w+/g, '');
                const statusClass = (() => {
                    const s = newStatus.toLowerCase();
                    if (s === 'pendente') return 'status-pendente';
                    if (s === 'iniciado') return 'status-iniciado';
                    if (s === '100% concluído') return 'status-completo';
                    if (s === 'concluído parcialmente') return 'status-parcial';
                    return '';
                })();
                statusBadge.classList.add(statusClass);
            }
            
            console.log(`Status atualizado para registro ${id}: ${newStatus}`);
            
        } catch (error) {
            console.error('Erro ao atualizar status:', error);
            alert(`Erro ao atualizar status: ${error.message}`);
        }
    }

    function openEditModal(registro) {
        const modal = document.getElementById('edit-modal');
        document.getElementById('edit-id').value = registro.id;
        document.getElementById('edit-data-repasse').value = registro.dataRepasse;
        const produtoSelect = document.getElementById('edit-produto');
        produtoSelect.innerHTML = produtosData.map(p => `<option value="${p.Produtos}" ${p.Produtos === registro.produto ? 'selected' : ''}>${p.Produtos}</option>`).join('');
        document.getElementById('edit-motivo').value = registro.motivo;
        document.getElementById('edit-data-recebimento').value = registro.dataRecebimento;
        document.getElementById('edit-vendedor').value = registro.vendedor;
        document.getElementById('edit-quantidade-solicitada').value = registro.quantidadeSolicitada;
        document.getElementById('edit-quantidade-repassada').value = registro.quantidadeRepassada;
        document.getElementById('edit-status-repasse').value = registro.status;
        document.getElementById('edit-observacao').value = registro.observacao;
        modal.style.display = 'block';
    }

    async function handleUpdateRegistro(e) {
        e.preventDefault();
        const id = document.getElementById('edit-id').value;
        const index = registrosCompletos.findIndex(r => r.id === id);
        if (index === -1) return;

        // Obter o email do usuário atual
        const currentUser = getCurrentUser();
        const usuarioComercial = currentUser?.email || 'usuariodocemel@gmail.com'; // Valor padrão como no exemplo

        const updatedRegistro = {
            ...registrosCompletos[index],
            dataRepasse: document.getElementById('edit-data-repasse').value,
            produto: document.getElementById('edit-produto').value,
            motivo: document.getElementById('edit-motivo').value,
            dataRecebimento: document.getElementById('edit-data-recebimento').value,
            vendedor: document.getElementById('edit-vendedor').value,
            quantidadeSolicitada: document.getElementById('edit-quantidade-solicitada').value,
            quantidadeRepassada: document.getElementById('edit-quantidade-repassada').value,
            status: document.getElementById('edit-status-repasse').value,
            observacao: document.getElementById('edit-observacao').value,
            usuarioComercial: usuarioComercial
        };

        console.log('Tentando atualizar registro via modal no backend:', updatedRegistro);

        try {
            const response = await fetch(`${apiUrl}/registros/${id}`, { // Usando PUT para atualizar
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedRegistro)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Falha na requisição PUT (Edição): ${response.status} - ${errorText}`);
                throw new Error(`Falha ao atualizar registro na planilha: ${response.status} - ${errorText}`);
            }
            
            const responseData = await response.json();
            console.log('Resposta do backend (Edição):', responseData);

            registrosCompletos[index] = updatedRegistro;
            adicionarLogHistorico('Edição', `Registro ${id} foi atualizado.`);
            applyResumosFilters();
            updateDashboard(registrosCompletos);
            document.getElementById('edit-modal').style.display = 'none';
            alert('Registro atualizado com sucesso!');

        } catch (error) {
            console.error('Erro ao processar atualização via modal:', error);
            alert(`Erro: ${error.message || 'Ocorreu um erro desconhecido ao atualizar o registro.'}`);
        }
    }

    async function handleDeleteRegistro(id) {
        // TODO: Adicionar chamada de API para deletar no backend
        const registroExcluido = registrosCompletos.find(r => r.id === id);
        registrosCompletos = registrosCompletos.filter(r => r.id !== id);
        adicionarLogHistorico('Exclusão', `Registro ${id} (${registroExcluido?.produto || 'N/A'}) foi excluído.`);
        applyResumosFilters();
        updateDashboard(registrosCompletos);
        alert(`Registro ${id} excluído com sucesso.`);
    }

    function gerarResumoWhatsApp(registro) {
        // Verificar se o registro existe
        if (!registro) {
            alert("Registro não encontrado.");
            return;
        }

        // Emojis para o cabeçalho e rodapé
        const emojis = "🍇🥦🍉🥝🍎🍍🫑🍅🍋🧄🫚🍏";
        
        // Determinar o emoji de status com base no status do registro
        let statusEmoji = "⚫"; // Padrão para Recusado
        if (registro.status === "Pendente") statusEmoji = "🔴";
        else if (registro.status === "Iniciado") statusEmoji = "🔵";
        else if (registro.status === "Concluído Parcialmente") statusEmoji = "🟡";
        else if (registro.status === "100% Concluído") statusEmoji = "🟢";
        
        // Construir o resumo conforme o modelo atualizado
        let resumo = emojis + "\n";
        resumo += "🧾LISTA DE REPASSE🧾\n";
        resumo += "📆" + (registro.dataRepasse || 'N/A') + "📆\n";
        resumo += "*📌*ID: " + (registro.id || 'N/A') + "\n";
        resumo += "👤UsuárioOperações: " + (registro.usuarioOperacoes || 'N/A') + "\n\n";
        
        // Adicionar informações do produto
        resumo += "🍍Produto: " + (registro.produto || 'N/A') + "\n";
        resumo += "🥝Família: " + (registro.familia || 'N/A') + "\n";
        resumo += "🚨Motivo: " + (registro.motivo || 'N/A') + "\n";
        resumo += "🗓️Data de Recebimento: " + (registro.dataRecebimento || 'N/A') + "\n";
        resumo += "⏱️Tempo (dias): " + (registro['tempo(dias)'] || 'N/A') + "\n\n";
        
        // Adicionar observação e detalhes do cliente
        resumo += "📝Observação: " + (registro.observacao || 'N/A') + "\n";
        
        // Adicionar informações detalhadas dos vendedores
        if (registro['vendedor 1']) {
            resumo += "💼Vendedor 1: " + (registro['vendedor 1'] || 'N/A') + " - " + (registro['quantidade 1'] || 'N/A') + "\n";
        }
        if (registro['vendedor 2']) {
            resumo += "💼Vendedor 2: " + (registro['vendedor 2'] || 'N/A') + " - " + (registro['quantidade 2'] || 'N/A') + "\n";
        }
        if (registro['vendedor 3']) {
            resumo += "💼Vendedor 3: " + (registro['vendedor 3'] || 'N/A') + " - " + (registro['quantidade 3'] || 'N/A') + "\n";
        }
        if (registro['vendedor 4']) {
            resumo += "💼Vendedor 4: " + (registro['vendedor 4'] || 'N/A') + " - " + (registro['quantidade 4'] || 'N/A') + "\n";
        }
        if (registro['vendedor 5']) {
            resumo += "💼Vendedor 5: " + (registro['vendedor 5'] || 'N/A') + " - " + (registro['quantidade 5'] || 'N/A') + "\n";
        }
        
        resumo += "🛒Quantidade Solicitada: " + (registro.quantidadeSolicitada || 'N/A') + "\n";
        resumo += "✅Quantidade Repassada: " + (registro.quantidadeRepassada || 'N/A') + "\n";
        resumo += "Status do Repasse: " + statusEmoji + " " + (registro.status || 'N/A') + "\n";
        resumo += "👤UsuárioComercial: " + (registro.usuarioComercial || 'N/A') + "\n";
        resumo += emojis;
        
        try {
            // Usar uma abordagem mais simples para compartilhar via WhatsApp
            // Converter a string para URI Component sem substituir os emojis
            const encodedText = encodeURIComponent(resumo);
            
            // Criar a URL do WhatsApp
            const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
            
            // Usar window.location.href para garantir que o WhatsApp seja aberto diretamente
            window.location.href = whatsappUrl;
        } catch (error) {
            console.error("Erro ao abrir WhatsApp:", error);
            alert("Ocorreu um erro ao tentar abrir o WhatsApp. Por favor, tente novamente.");
        }
    }
    
    function gerarResumoConsolidado(data) {
        // Verificar se há dados para gerar o resumo
        if (!data || data.length === 0) {
            alert("Nenhum registro encontrado para compartilhar.");
            return;
        }
        
        // Emojis para o cabeçalho e rodapé
        const emojis = "🍇🥦🍉🥝🍎🍍🫑🍅🍋🧄🫚🍏";
        
        // Obter a data atual formatada
        const dataAtual = new Date();
        const dataFormatada = `${dataAtual.getDate().toString().padStart(2, '0')}/${(dataAtual.getMonth() + 1).toString().padStart(2, '0')}/${dataAtual.getFullYear()}`;
        
        // Construir o resumo consolidado
        let resumo = emojis + "\n";
        resumo += "🧾RESUMO CONSOLIDADO DE REPASSES🧾\n";
        resumo += "📆Data do Relatório: " + dataFormatada + "📆\n\n";
        
        // Adicionar informações do usuário atual
        const currentUser = getCurrentUser();
        resumo += "👤Gerado por: " + (currentUser?.nome || currentUser?.displayName || currentUser?.email || 'N/A') + "\n\n";
        
        // Calcular totais
        const totalRegistros = data.length;
        const totalQtdSolicitada = data.reduce((acc, r) => acc + (parseFloat(r.quantidadeSolicitada) || 0), 0);
        const totalQtdRepassada = data.reduce((acc, r) => acc + (parseFloat(r.quantidadeRepassada) || 0), 0);
        const percentualConclusao = totalQtdSolicitada > 0 ? (totalQtdRepassada / totalQtdSolicitada) * 100 : 0;
        
        // Adicionar totais gerais
        resumo += "📊 TOTAIS GERAIS 📊\n";
        resumo += "📝Total de Registros: " + totalRegistros + "\n";
        resumo += "🛒Total Qtd. Solicitada: " + totalQtdSolicitada.toFixed(2) + "\n";
        resumo += "✅Total Qtd. Repassada: " + totalQtdRepassada.toFixed(2) + "\n";
        resumo += "📈% do Total Repassado: " + percentualConclusao.toFixed(2) + "%\n\n";
        
        // Calcular volumes por categoria
        const volumePorVendedor = {};
        const repassadoPorVendedor = {};
        const volumePorMotivo = {};
        const repassadoPorMotivo = {};
        const volumePorProduto = {};
        const repassadoPorProduto = {};
        const volumePorFamilia = {};
        const repassadoPorFamilia = {};
        const volumePorData = {};
        const repassadoPorData = {};

        data.forEach(r => {
            const qtdSolicitada = parseFloat(r.quantidadeSolicitada) || 0;
            const qtdRepassada = parseFloat(r.quantidadeRepassada) || 0;
            
            // Calcular volume por vendedor usando os campos de quantidade
            for (let i = 1; i <= 5; i++) {
                const vendedor = r[`vendedor ${i}`];
                const quantidade = parseFloat(r[`quantidade ${i}`]) || 0;
                if (vendedor && quantidade > 0) {
                    volumePorVendedor[vendedor] = (volumePorVendedor[vendedor] || 0) + quantidade;
                    // Assumindo que a quantidade repassada é proporcional à quantidade solicitada
                    if (qtdSolicitada > 0) {
                        const proporcao = qtdRepassada / qtdSolicitada;
                        repassadoPorVendedor[vendedor] = (repassadoPorVendedor[vendedor] || 0) + (quantidade * proporcao);
                    }
                }
            }
            
            // Calcular volumes por motivo
            if (r.motivo) {
                volumePorMotivo[r.motivo] = (volumePorMotivo[r.motivo] || 0) + qtdSolicitada;
                repassadoPorMotivo[r.motivo] = (repassadoPorMotivo[r.motivo] || 0) + qtdRepassada;
            }
            
            // Calcular volumes por produto
            if (r.produto) {
                volumePorProduto[r.produto] = (volumePorProduto[r.produto] || 0) + qtdSolicitada;
                repassadoPorProduto[r.produto] = (repassadoPorProduto[r.produto] || 0) + qtdRepassada;
            }
            
            // Calcular volumes por família
            if (r.familia) {
                volumePorFamilia[r.familia] = (volumePorFamilia[r.familia] || 0) + qtdSolicitada;
                repassadoPorFamilia[r.familia] = (repassadoPorFamilia[r.familia] || 0) + qtdRepassada;
            }
            
            // Calcular volumes por data
            if (r.dataRepasse) {
                volumePorData[r.dataRepasse] = (volumePorData[r.dataRepasse] || 0) + qtdSolicitada;
                repassadoPorData[r.dataRepasse] = (repassadoPorData[r.dataRepasse] || 0) + qtdRepassada;
            }
        });
        
        // Adicionar totais por vendedor
        resumo += "💼 TOTAIS POR VENDEDOR 💼\n";
        Object.keys(volumePorVendedor).sort().forEach(vendedor => {
            const solicitado = volumePorVendedor[vendedor] || 0;
            const repassado = repassadoPorVendedor[vendedor] || 0;
            resumo += `${vendedor}: ${solicitado.toFixed(2)} solicitado / ${repassado.toFixed(2)} repassado\n`;
        });
        resumo += "\n";
        
        // Adicionar totais por motivo
        resumo += "🚨 TOTAIS POR MOTIVO 🚨\n";
        Object.keys(volumePorMotivo).sort().forEach(motivo => {
            const solicitado = volumePorMotivo[motivo] || 0;
            const repassado = repassadoPorMotivo[motivo] || 0;
            resumo += `${motivo}: ${solicitado.toFixed(2)} solicitado / ${repassado.toFixed(2)} repassado\n`;
        });
        resumo += "\n";
        
        // Adicionar totais por produto
        resumo += "🍍 TOTAIS POR PRODUTO 🍍\n";
        Object.keys(volumePorProduto).sort().forEach(produto => {
            const solicitado = volumePorProduto[produto] || 0;
            const repassado = repassadoPorProduto[produto] || 0;
            resumo += `${produto}: ${solicitado.toFixed(2)} solicitado / ${repassado.toFixed(2)} repassado\n`;
        });
        resumo += "\n";
        
        // Adicionar totais por família
        resumo += "🥝 TOTAIS POR FAMÍLIA 🥝\n";
        Object.keys(volumePorFamilia).sort().forEach(familia => {
            const solicitado = volumePorFamilia[familia] || 0;
            const repassado = repassadoPorFamilia[familia] || 0;
            resumo += `${familia}: ${solicitado.toFixed(2)} solicitado / ${repassado.toFixed(2)} repassado\n`;
        });
        resumo += "\n";
        
        // Adicionar totais por data
        resumo += "📆 TOTAIS POR DATA 📆\n";
        Object.keys(volumePorData).sort().forEach(data => {
            const solicitado = volumePorData[data] || 0;
            const repassado = repassadoPorData[data] || 0;
            const dataFormatada = formatISOToPtBR(data);
            resumo += `${dataFormatada}: ${solicitado.toFixed(2)} solicitado / ${repassado.toFixed(2)} repassado\n`;
        });
        resumo += "\n";
        
        // Adicionar rodapé
        resumo += emojis;
        
        try {
            // Converter a string para URI Component sem substituir os emojis
            const encodedText = encodeURIComponent(resumo);
            
            // Criar a URL do WhatsApp
            const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
            
            // Usar window.location.href para garantir que o WhatsApp seja aberto diretamente
            window.location.href = whatsappUrl;
        } catch (error) {
            console.error("Erro ao abrir WhatsApp:", error);
            alert("Ocorreu um erro ao tentar abrir o WhatsApp. Por favor, tente novamente.");
        }
    }

    function updateResumosSummaryCards(data) {
        // Calcular totais para os cards
        let totalSolicitadaPendente = 0;
        let totalRepassadaConcluida = 0;

        data.forEach(registro => {
            const status = (registro.status || '').toLowerCase();
            const qtdSolicitada = parseFloat(registro.quantidadeSolicitada) || 0;
            const qtdRepassada = parseFloat(registro.quantidadeRepassada) || 0;

            // Card 1: Saldo total da "QTD. SOLICITADA" com status "Pendente" + "Iniciado"
            // Também adiciona a diferença entre solicitada e repassada para status "Concluído Parcialmente"
            if (status === 'pendente' || status === 'iniciado') {
                totalSolicitadaPendente += qtdSolicitada;
            } else if (status === 'concluído parcialmente') {
                // Adiciona a diferença entre quantidade solicitada e repassada
                const diferenca = qtdSolicitada - qtdRepassada;
                if (diferenca > 0) {
                    totalSolicitadaPendente += diferenca;
                }
            }

            // Card 2: Saldo total da "QTD. REPASSADA" com status "100% Concluído" + "Concluído Parcialmente"
            if (status === '100% concluído' || status === 'concluído parcialmente') {
                totalRepassadaConcluida += qtdRepassada;
            }
        });

        // Atualizar cards
        const cardSolicitada = document.getElementById('resumos-card-solicitada');
        const cardRepassada = document.getElementById('resumos-card-repassada');

        if (cardSolicitada) {
            cardSolicitada.querySelector('.card-value').textContent = totalSolicitadaPendente.toFixed(2);
        }

        if (cardRepassada) {
            cardRepassada.querySelector('.card-value').textContent = totalRepassadaConcluida.toFixed(2);
        }
    }

    // --- TELA DE DASHBOARD --- 
    function setupDashboardFilters() {
        const searchInput = document.getElementById('dashboard-search');
        const startDateInput = document.getElementById('dashboard-data-inicio');
        const endDateInput = document.getElementById('dashboard-data-fim');
        const produtoSelect = document.getElementById('dashboard-produto');
        const vendedorSelect = document.getElementById('dashboard-vendedor');
        const motivoSelect = document.getElementById('dashboard-motivo');
        const clearButton = document.getElementById('dashboard-limpar-filtros');
        // ESCOPAR botões de período ao Dashboard para evitar conflitos
        const periodButtons = document.querySelectorAll('#dashboard .period-btn');

        const allInputs = [searchInput, startDateInput, endDateInput, produtoSelect, vendedorSelect, motivoSelect];
        allInputs.forEach(input => {
            if(input) input.addEventListener('input', applyDashboardFilters);
        });

        clearButton?.addEventListener('click', () => {
            allInputs.forEach(input => { if(input) input.value = ''; });
            applyDashboardFilters();
        });

        periodButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const btn = e.currentTarget;
                const period = btn.dataset.period;
                
                // Usar getBahiaDateISO para calcular as datas corretamente
                let startDate, endDate;
                if (period === 'yesterday') {
                    startDate = getBahiaDateISO(-1); // ontem
                    endDate = startDate;
                } else if (period === 'today') {
                    startDate = getBahiaDateISO(0); // hoje
                    endDate = startDate;
                } else if (period === 'week') {
                    // Semana = últimos 7 dias (incluindo hoje)
                    startDate = getBahiaDateISO(-6); // 6 dias atrás
                    endDate = getBahiaDateISO(0); // hoje
                } else if (period === 'month') {
                    const today = getBahiaDate();
                    startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
                    endDate = getBahiaDateISO(0);
                }
                
                if (startDateInput && endDateInput) {
                    startDateInput.value = startDate;
                    endDateInput.value = endDate;
                }
                applyDashboardFilters();
            });
        });



        // 1) Data padrão: hoje
        const todayIso = getBahiaTodayISO();
        if (startDateInput && endDateInput) { startDateInput.value = todayIso; endDateInput.value = todayIso; }

        // 2) Reduzir tamanho base das tabelas e permitir zoom
        let dashboardTablesZoom = 0.9; // menor que 1 por padrão
        function applyDashboardTablesZoom() {
            const topTable = document.querySelector('#top-produtos-table');
            const dayTable = document.querySelector('#registros-do-dia-table');
            const size = Math.max(0.6, Math.min(1.6, dashboardTablesZoom));
            [topTable, dayTable].forEach(t => { if (t) t.style.fontSize = `${0.85 * size}em`; });
        }
        applyDashboardTablesZoom();
        document.getElementById('tables-zoom-in')?.addEventListener('click', () => { dashboardTablesZoom += 0.1; applyDashboardTablesZoom(); });
        document.getElementById('tables-zoom-out')?.addEventListener('click', () => { dashboardTablesZoom -= 0.1; applyDashboardTablesZoom(); });
        document.getElementById('tables-zoom-reset')?.addEventListener('click', () => { dashboardTablesZoom = 1; applyDashboardTablesZoom(); });

        // 3) Zoom dos gráficos (escala visual por CSS, não precisa plugin)
        let chartsZoom = 1;
        function applyChartsZoom() {
            const size = Math.max(0.8, Math.min(1.6, chartsZoom));
            document.querySelectorAll('.chart-container, .chart-container-produto').forEach(el => {
                el.style.transform = `scale(${size})`;
                el.style.transformOrigin = '0 0';
            });
        }
        applyChartsZoom();
        document.getElementById('charts-zoom-in')?.addEventListener('click', () => { chartsZoom += 0.1; applyChartsZoom(); });
        document.getElementById('charts-zoom-out')?.addEventListener('click', () => { chartsZoom -= 0.1; applyChartsZoom(); });
        document.getElementById('charts-zoom-reset')?.addEventListener('click', () => { chartsZoom = 1; applyChartsZoom(); });

        // Aplicar filtros de hoje no primeiro load
        applyDashboardFilters();
    }

    function populateDashboardFilters() {
        const produtos = [...new Set(registrosCompletos.map(r => r.produto).filter(Boolean))];
        const vendedores = [...new Set(registrosCompletos.map(r => r.vendedor).filter(Boolean))];
        const motivos = [...new Set(registrosCompletos.map(r => r.motivo).filter(Boolean))];

        const produtoSelect = document.getElementById('dashboard-produto');
        const vendedorSelect = document.getElementById('dashboard-vendedor');
        const motivoSelect = document.getElementById('dashboard-motivo');

        if(produtoSelect) produtoSelect.innerHTML = '<option value="">Todos os Produtos</option>' + produtos.map(p => `<option value="${p}">${p}</option>`).join('');
        if(vendedorSelect) vendedorSelect.innerHTML = '<option value="">Todos os Vendedores</option>' + vendedores.map(v => `<option value="${v}">${v}</option>`).join('');
        if(motivoSelect) motivoSelect.innerHTML = '<option value="">Todos os Motivos</option>' + motivos.map(m => `<option value="${m}">${m}</option>`).join('');
    }

    function applyDashboardFilters() {
        console.log('Aplicando filtros do dashboard');
        const searchTerm = document.getElementById('dashboard-search').value.toLowerCase();
        const startDate = document.getElementById('dashboard-data-inicio').value;
        const endDate = document.getElementById('dashboard-data-fim').value;
        const produto = document.getElementById('dashboard-produto').value;
        const vendedor = document.getElementById('dashboard-vendedor').value;
        const motivo = document.getElementById('dashboard-motivo').value;

        const filteredData = registrosCompletos.filter(r => {
            const searchMatch = !searchTerm || Object.values(r).some(val => String(val).toLowerCase().includes(searchTerm));
            const startDateMatch = !startDate || r.dataRepasse >= startDate;
            const endDateMatch = !endDate || r.dataRepasse <= endDate;
            const produtoMatch = !produto || r.produto === produto;
            const vendedorMatch = !vendedor || r.vendedor === vendedor;
            const motivoMatch = !motivo || r.motivo === motivo;
            return searchMatch && startDateMatch && endDateMatch && produtoMatch && vendedorMatch && motivoMatch;
        });
        
        console.log('Dados filtrados para o dashboard:', filteredData.length);
        updateDashboard(filteredData);
    }

    function updateDashboard(data = registrosCompletos) {
        console.log('Atualizando dashboard com dados:', data.length);
        const dashboardSection = document.getElementById('dashboard');
        if (!dashboardSection || dashboardSection.style.display === 'none') {
            console.log('Dashboard não está visível, pulando atualização');
            return;
        }

        const displayData = data || [];
        console.log('Dados para exibir no dashboard:', displayData.length);

        if (displayData.length === 0) {
            console.log('Nenhum dado para exibir no dashboard');
            document.getElementById('total-qtd-solicitada').textContent = 0;
            document.getElementById('total-registros').textContent = 0;
            document.getElementById('top-produto').textContent = '-';
            document.getElementById('top-vendedor').textContent = '-';
            document.getElementById('top-motivo').textContent = '-';
            
            // Limpar subinfos
            document.getElementById('total-registros-subinfo').textContent = '';
            document.getElementById('total-qtd-solicitada-subinfo').textContent = '';
            document.getElementById('total-qtd-repassada').textContent = '0';
            document.getElementById('total-qtd-repassada-subinfo').textContent = '';
            document.getElementById('taxa-media-conclusao').textContent = '0%';
            document.getElementById('taxa-media-conclusao-subinfo').textContent = '';
            document.getElementById('total-produtos').textContent = '0';
            document.getElementById('top-produto-subinfo').textContent = '';
            
            if(vendedorPieChart) { vendedorPieChart.destroy(); vendedorPieChart = null; }
            if(motivosBarChart) { motivosBarChart.destroy(); motivosBarChart = null; }
            if(produtoBarChart) { produtoBarChart.destroy(); produtoBarChart = null; }
            if(temporalLineChart) { temporalLineChart.destroy(); temporalLineChart = null; }
            const topProdutosTableBody = document.querySelector('#top-produtos-table tbody');
            if(topProdutosTableBody) topProdutosTableBody.innerHTML = '<tr><td colspan="2">Sem dados</td></tr>';
            const registrosDiaTableBody = document.querySelector('#registros-do-dia-table tbody');
            if(registrosDiaTableBody) registrosDiaTableBody.innerHTML = '<tr><td colspan="6">Sem dados</td></tr>';
            return;
        }

        // Calcular totais
        const totalQtdSolicitada = displayData.reduce((acc, r) => acc + (parseFloat(r.quantidadeSolicitada) || 0), 0);
        const totalQtdRepassada = displayData.reduce((acc, r) => acc + (parseFloat(r.quantidadeRepassada) || 0), 0);
        const totalRegistros = displayData.length;
        
        // Calcular taxa média de conclusão
        const totalSolicitadaValida = displayData.filter(r => r.quantidadeSolicitada && parseFloat(r.quantidadeSolicitada) > 0).length;
        let taxaMediaConclusao = 0;
        if (totalSolicitadaValida > 0) {
            const totalConcluido = displayData.filter(r => {
                const solicitada = parseFloat(r.quantidadeSolicitada) || 0;
                const repassada = parseFloat(r.quantidadeRepassada) || 0;
                return solicitada > 0 && repassada >= solicitada;
            }).length;
            taxaMediaConclusao = (totalConcluido / totalSolicitadaValida) * 100;
        }
        
        // Calcular total de produtos diferentes
        const produtosDiferentes = [...new Set(displayData.map(r => r.produto).filter(Boolean))].length;
        
        // Calcular volumes por categoria
        const volumePorVendedor = {};
        const volumePorMotivo = {};
        const volumePorProduto = {};
        const volumePorFamilia = {};
        const volumeTemporal = {};

        displayData.forEach(r => {
            const qtdSolicitada = parseFloat(r.quantidadeSolicitada) || 0;
            const qtdRepassada = parseFloat(r.quantidadeRepassada) || 0;
            
            // Calcular volume por vendedor usando os campos de quantidade
            for (let i = 1; i <= 5; i++) {
                const vendedor = r[`vendedor ${i}`];
                const quantidade = parseFloat(r[`quantidade ${i}`]) || 0;
                if (vendedor && quantidade > 0) {
                    volumePorVendedor[vendedor] = (volumePorVendedor[vendedor] || 0) + quantidade;
                }
            }
            
            if (r.motivo) volumePorMotivo[r.motivo] = (volumePorMotivo[r.motivo] || 0) + qtdSolicitada;
            if (r.produto) volumePorProduto[r.produto] = (volumePorProduto[r.produto] || 0) + qtdSolicitada;
            if (r.familia) volumePorFamilia[r.familia] = (volumePorFamilia[r.familia] || 0) + qtdSolicitada;
            if (r.dataRepasse) {
                const dataRepasse = r.dataRepasse;
                volumeTemporal[dataRepasse] = (volumeTemporal[dataRepasse] || 0) + qtdSolicitada;
            }
        });

        // Encontrar top itens
        const getTopKey = (obj) => Object.keys(obj).length ? Object.keys(obj).reduce((a, b) => obj[a] > obj[b] ? a : b) : '-';
        const topProduto = getTopKey(volumePorProduto);
        const topFamilia = getTopKey(volumePorFamilia);
        const topVendedor = getTopKey(volumePorVendedor);
        const topMotivo = getTopKey(volumePorMotivo);
        
        // Encontrar produto com maior tempo (dias)
        let topProdutoTempo = '-';
        let maiorTempo = 0;
        displayData.forEach(r => {
            const tempo = parseInt(r['tempo(dias)']) || 0;
            if (tempo > maiorTempo) {
                maiorTempo = tempo;
                topProdutoTempo = r.produto || '-';
            }
        });
        
        // Atualizar elementos do dashboard
        document.getElementById('total-registros').textContent = totalRegistros;
        document.getElementById('total-qtd-solicitada').textContent = totalQtdSolicitada.toFixed(2);
        document.getElementById('total-qtd-repassada').textContent = totalQtdRepassada.toFixed(2);
        document.getElementById('taxa-media-conclusao').textContent = taxaMediaConclusao.toFixed(2) + '%';
        document.getElementById('total-produtos').textContent = produtosDiferentes;
        document.getElementById('top-produto').textContent = topProduto;
        document.getElementById('top-familia').textContent = topFamilia;
        document.getElementById('top-produto-tempo').textContent = topProdutoTempo;
        document.getElementById('top-vendedor').textContent = topVendedor;
        document.getElementById('top-motivo').textContent = topMotivo;
        
        // Calcular e exibir percentuais do top produto
        if (topProduto !== '-' && volumePorProduto[topProduto]) {
            const percentualTopProduto = (volumePorProduto[topProduto] / totalQtdSolicitada) * 100;
            document.getElementById('top-produto-subinfo').textContent = `${percentualTopProduto.toFixed(2)}% do total`;
        } else {
            document.getElementById('top-produto-subinfo').textContent = '';
        }
        
        // Calcular e exibir percentuais do top família
        if (topFamilia !== '-' && volumePorFamilia[topFamilia]) {
            const percentualTopFamilia = (volumePorFamilia[topFamilia] / totalQtdSolicitada) * 100;
            document.getElementById('top-familia-subinfo').textContent = `${percentualTopFamilia.toFixed(2)}% do total`;
        } else {
            document.getElementById('top-familia-subinfo').textContent = '';
        }
        
        // Exibir tempo do produto com maior tempo
        if (topProdutoTempo !== '-') {
            document.getElementById('top-produto-tempo-subinfo').textContent = `${maiorTempo} dias`;
        } else {
            document.getElementById('top-produto-tempo-subinfo').textContent = '';
        }
        
        // Calcular informações reais baseadas nos dados filtrados
        // Calcular percentual de conclusão para subinfo
        const percentualConclusao = totalQtdSolicitada > 0 ? (totalQtdRepassada / totalQtdSolicitada) * 100 : 0;
        
        // Calcular percentual de registros concluídos
        const registrosConcluidos = displayData.filter(r => {
            const solicitada = parseFloat(r.quantidadeSolicitada) || 0;
            const repassada = parseFloat(r.quantidadeRepassada) || 0;
            return solicitada > 0 && repassada >= solicitada;
        }).length;
        const percentualRegistrosConcluidos = totalRegistros > 0 ? (registrosConcluidos / totalRegistros) * 100 : 0;
        
        // Atualizar subinfos com informações reais
        document.getElementById('total-registros-subinfo').textContent = `${registrosConcluidos} registros concluídos (${percentualRegistrosConcluidos.toFixed(2)}%)`;
        document.getElementById('total-qtd-solicitada-subinfo').textContent = `Média de ${(totalQtdSolicitada / (totalRegistros || 1)).toFixed(2)} por registro`;
        document.getElementById('total-qtd-repassada-subinfo').textContent = `${percentualConclusao.toFixed(2)}% do volume solicitado`;
        document.getElementById('taxa-media-conclusao-subinfo').textContent = `${registrosConcluidos} de ${totalRegistros} registros`;

        
        // Atualizar gráficos
        vendedorPieChart = renderChart(
          vendedorPieChart,
          'vendedor-pie-chart',
          'pie',
          'Volume por Vendedor',
          Object.keys(volumePorVendedor),
          Object.values(volumePorVendedor),
          { onClick: handleChartClickFactory('vendedor') }
        );
        motivosBarChart = renderChart(
          motivosBarChart,
          'motivos-bar-chart',
          'bar',
          'Volume por Motivo',
          Object.keys(volumePorMotivo),
          Object.values(volumePorMotivo),
          { onClick: handleChartClickFactory('motivo') }
        );
        produtoBarChart = renderChart(
          produtoBarChart,
          'produto-bar-chart',
          'bar',
          'Volume por Família',
          Object.keys(volumePorFamilia),
          Object.values(volumePorFamilia),
          {
            scales: {
              x: {
                ticks: {
                  font: { size: 10 }, // rótulos menores
                  maxRotation: 60,
                  minRotation: 60,
                  autoSkip: true
                }
              }
            },
            onClick: handleChartClickFactory('familia')
          }
        );

        const sortedDates = Object.keys(volumeTemporal).sort((a, b) => new Date(a) - new Date(b));
        const sortedVolumes = sortedDates.map(date => volumeTemporal[date]);
        temporalLineChart = renderChart(
          temporalLineChart,
          'temporal-line-chart',
          'line',
          'Evolução do Volume',
          sortedDates,
          sortedVolumes,
          { onClick: handleChartClickFactory('data') }
        );

        const topProdutosArray = Object.entries(volumePorProduto).sort(([, a], [, b]) => b - a).slice(0, 10);
        const topProdutosTableBody = document.querySelector('#top-produtos-table tbody');
        topProdutosTableBody.innerHTML = '';
        topProdutosArray.forEach(([produto, volume]) => {
            const row = topProdutosTableBody.insertRow();
            row.insertCell().textContent = produto;
            row.insertCell().textContent = volume.toFixed(2);
        });

        const todayBahia = getBahiaTodayISO();
        const registrosDoDia = displayData.filter(r => r.dataRepasse === todayBahia);
        const registrosDiaTableBody = document.querySelector('#registros-do-dia-table tbody');
        registrosDiaTableBody.innerHTML = '';
        registrosDoDia.forEach(r => {
            const row = registrosDiaTableBody.insertRow();
            row.insertCell().textContent = formatISOToPtBR(r.dataRepasse);
            row.insertCell().textContent = r.produto;
            row.insertCell().textContent = r.motivo;
            row.insertCell().textContent = formatISOToPtBR(r.dataRecebimento);
            row.insertCell().textContent = r['tempo(dias)'];
            row.insertCell().textContent = (parseFloat(r.quantidadeSolicitada) || 0).toFixed(2);
            
            // Adicionar colunas de quantidade e vendedor apenas se estiverem preenchidas
            const qtd1Cell = row.insertCell();
            qtd1Cell.textContent = r['quantidade 1'] ? parseFloat(r['quantidade 1']).toFixed(2) : '';
            const vend1Cell = row.insertCell();
            vend1Cell.textContent = r['vendedor 1'] || '';
            
            const qtd2Cell = row.insertCell();
            qtd2Cell.textContent = r['quantidade 2'] ? parseFloat(r['quantidade 2']).toFixed(2) : '';
            const vend2Cell = row.insertCell();
            vend2Cell.textContent = r['vendedor 2'] || '';
            
            const qtd3Cell = row.insertCell();
            qtd3Cell.textContent = r['quantidade 3'] ? parseFloat(r['quantidade 3']).toFixed(2) : '';
            const vend3Cell = row.insertCell();
            vend3Cell.textContent = r['vendedor 3'] || '';
            
            const qtd4Cell = row.insertCell();
            qtd4Cell.textContent = r['quantidade 4'] ? parseFloat(r['quantidade 4']).toFixed(2) : '';
            const vend4Cell = row.insertCell();
            vend4Cell.textContent = r['vendedor 4'] || '';
            
            const qtd5Cell = row.insertCell();
            qtd5Cell.textContent = r['quantidade 5'] ? parseFloat(r['quantidade 5']).toFixed(2) : '';
            const vend5Cell = row.insertCell();
            vend5Cell.textContent = r['vendedor 5'] || '';
            
            row.insertCell().textContent = (parseFloat(r.quantidadeRepassada) || 0).toFixed(2);
        });
    }

    function renderChart(chartInstance, canvasId, type, label, labels, data, customOptions = {}) {
        const ctx = document.getElementById(canvasId)?.getContext('2d');
        if (!ctx) {
            console.error(`Canvas with id ${canvasId} not found.`);
            return null;
        }
        if (chartInstance) chartInstance.destroy();

        const isDarkMode = document.body.classList.contains('dark-mode');
        const textColor = isDarkMode ? '#EAEAEA' : '#333';
        const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

        const defaultOptions = {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'nearest', intersect: true }, // facilita clicar nos pontos/barras
            plugins: {
                datalabels: {
                    color: '#fff',
                    font: { weight: 'bold' },
                    formatter: (value, context) => {
                        if (type === 'pie') {
                            const sum = context.dataset.data.reduce((a, b) => a + b, 0);
                            return sum > 0 ? (value * 100 / sum).toFixed(1) + '%' : '0%';
                        }
                        return value;
                    }
                },
                legend: {
                    position: 'top',
                    labels: { color: textColor }
                }
            },
            scales: (type === 'bar' || type === 'line') ? {
                y: {
                    beginAtZero: true,
                    ticks: { color: textColor },
                    grid: { color: gridColor }
                },
                x: {
                    ticks: { color: textColor },
                    grid: { color: gridColor }
                }
            } : {},
            animation: customOptions.animation,
            onClick: customOptions.onClick // permite clique por gráfico
        };

        // Mesclar opções personalizadas com as padrões
        const mergedOptions = {
            ...defaultOptions,
            scales: {
                ...defaultOptions.scales,
                ...(customOptions.scales || {})
            }
        };

        return new Chart(ctx, {
            type: type,
            data: {
                labels: labels,
                datasets: [{
                    label: label,
                    data: data,
                    backgroundColor: type === 'line' ? 'rgba(76, 175, 80, 0.2)' : [
                        'rgba(27, 94, 32, 0.8)', 'rgba(76, 175, 80, 0.8)', 'rgba(139, 195, 74, 0.8)',
                        'rgba(255, 152, 0, 0.8)', 'rgba(255, 87, 34, 0.8)', 'rgba(121, 85, 72, 0.8)'
                    ],
                    borderColor: type === 'line' ? '#4CAF50' : '#ffffff',
                    borderWidth: type === 'line' ? 2 : 1,
                    fill: type === 'line',
                    tension: type === 'line' ? 0.4 : 0
                }]
            },
            options: mergedOptions
        });
    }

    // --- TELA DE RELATÓRIOS ---
    function setupRelatoriosFilters() {
        const searchInput = document.getElementById('relatorios-search');
        const startDateInput = document.getElementById('relatorios-data-inicio');
        const endDateInput = document.getElementById('relatorios-data-fim');
        const produtoSelect = document.getElementById('relatorios-produto');
        const vendedorSelect = document.getElementById('relatorios-vendedor');
        const motivoSelect = document.getElementById('relatorios-motivo');
        const clearButton = document.getElementById('relatorios-limpar-filtros');
        const periodButtons = document.querySelectorAll('#relatorios .period-btn');

        const allInputs = [searchInput, startDateInput, endDateInput, produtoSelect, vendedorSelect, motivoSelect];
        allInputs.forEach(input => {
            if(input) {
                if (input.tagName === 'INPUT' && input.type === 'text') input.addEventListener('input', applyRelatoriosFilters);
                else input.addEventListener('change', applyRelatoriosFilters);
            }
        });

        if(clearButton) {
            clearButton.addEventListener('click', () => {
                allInputs.forEach(input => { if(input) input.value = ''; });
                applyRelatoriosFilters();
            });
        }

        // Data padrão: hoje
        const todayIso = getBahiaTodayISO();
        if (startDateInput && endDateInput) { startDateInput.value = todayIso; endDateInput.value = todayIso; }

        periodButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const period = btn.dataset.period;
                
                // Usar getBahiaDateISO para calcular as datas corretamente
                let startDate, endDate;
                if (period === 'yesterday') {
                    startDate = getBahiaDateISO(-1); // ontem
                    endDate = startDate;
                } else if (period === 'today') {
                    startDate = getBahiaDateISO(0); // hoje
                    endDate = startDate;
                } else if (period === 'week') {
                    // Semana = últimos 7 dias (incluindo hoje)
                    startDate = getBahiaDateISO(-6); // 6 dias atrás
                    endDate = getBahiaDateISO(0); // hoje
                } else if (period === 'month') {
                    const today = getBahiaDate();
                    startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
                    endDate = getBahiaDateISO(0);
                }
                
                if (startDateInput && endDateInput) {
                    startDateInput.value = startDate;
                    endDateInput.value = endDate;
                }
                applyRelatoriosFilters();
            });
        });

        // Aplicar filtros de hoje no primeiro load
        applyRelatoriosFilters();
    }

    function populateRelatoriosFilters() {
        const produtos = [...new Set(registrosCompletos.map(r => r.produto).filter(Boolean))];
        const vendedores = [...new Set(registrosCompletos.map(r => r.vendedor).filter(Boolean))];
        const motivos = [...new Set(registrosCompletos.map(r => r.motivo).filter(Boolean))];

        const produtoSelect = document.getElementById('relatorios-produto');
        const vendedorSelect = document.getElementById('relatorios-vendedor');
        const motivoSelect = document.getElementById('relatorios-motivo');

        if(produtoSelect) produtoSelect.innerHTML = '<option value="">Todos os Produtos</option>' + produtos.map(p => `<option value="${p}">${p}</option>`).join('');
        if(vendedorSelect) vendedorSelect.innerHTML = '<option value="">Todos os Vendedores</option>' + vendedores.map(v => `<option value="${v}">${v}</option>`).join('');
        if(motivoSelect) motivoSelect.innerHTML = '<option value="">Todos os Motivos</option>' + motivos.map(m => `<option value="${m}">${m}</option>`).join('');
    }

    function applyRelatoriosFilters() {
        const searchTerm = (document.getElementById('relatorios-search')?.value || '').toLowerCase();
        const startDate = document.getElementById('relatorios-data-inicio')?.value || '';
        const endDate = document.getElementById('relatorios-data-fim')?.value || '';
        const produto = document.getElementById('relatorios-produto')?.value || '';
        const vendedor = document.getElementById('relatorios-vendedor')?.value || '';
        const motivo = document.getElementById('relatorios-motivo')?.value || '';

        relatoriosFilteredData = registrosCompletos.filter(r => {
            const searchMatch = !searchTerm || Object.values(r).some(val => String(val).toLowerCase().includes(searchTerm));
            const startDateMatch = !startDate || r.dataRepasse >= startDate;
            const endDateMatch = !endDate || r.dataRepasse <= endDate;
            const produtoMatch = !produto || r.produto === produto;
            const vendedorMatch = !vendedor || r.vendedor === vendedor;
            const motivoMatch = !motivo || r.motivo === motivo;
            return searchMatch && startDateMatch && endDateMatch && produtoMatch && vendedorMatch && motivoMatch;
        });
        
        const outputDiv = document.getElementById('relatorio-output');
        if(outputDiv) outputDiv.innerHTML = `<p>${relatoriosFilteredData.length} registros serão incluídos no relatório.</p>`;
    }

    async function gerarRelatorioHtml() {
        if (relatoriosFilteredData.length === 0) {
            alert("Nenhum dado (com base nos filtros selecionados) para gerar relatório.");
            return;
        }

        const data = relatoriosFilteredData;
        const reportWindow = window.open('', '_blank');
        reportWindow.document.write('<html><head><title>Gerando Relatório...</title></head><body><p>Por favor, aguarde...</p></body></html>');

        // Calcular totais para os cards
        const totalQtdSolicitada = data.reduce((acc, r) => acc + (parseFloat(r.quantidadeSolicitada) || 0), 0);
        const totalQtdRepassada = data.reduce((acc, r) => acc + (parseFloat(r.quantidadeRepassada) || 0), 0);
        const totalRegistros = data.length;
        
        // Calcular taxa média de conclusão
        const totalSolicitadaValida = data.filter(r => r.quantidadeSolicitada && parseFloat(r.quantidadeSolicitada) > 0).length;
        let taxaMediaConclusao = 0;
        if (totalSolicitadaValida > 0) {
            const totalConcluido = data.filter(r => {
                const solicitada = parseFloat(r.quantidadeSolicitada) || 0;
                const repassada = parseFloat(r.quantidadeRepassada) || 0;
                return solicitada > 0 && repassada >= solicitada;
            }).length;
            taxaMediaConclusao = (totalConcluido / totalSolicitadaValida) * 100;
        }
        
        // Calcular percentual do total repassado em relação ao volume solicitado
        const percentualConclusao = totalQtdSolicitada > 0 ? (totalQtdRepassada / totalQtdSolicitada) * 100 : 0;
        
        // Calcular total de produtos diferentes
        const produtosDiferentes = [...new Set(data.map(r => r.produto).filter(Boolean))].length;

        const volumePorVendedor = {};
        const volumePorMotivo = {};
        const volumePorProduto = {};
        const volumePorFamilia = {};
        const volumeTemporal = {};
        const repassadoPorVendedor = {};
        const repassadoPorMotivo = {};
        const repassadoPorProduto = {};
        const repassadoPorFamilia = {};
        
        data.forEach(r => {
            const qtdSolicitada = parseFloat(r.quantidadeSolicitada || 0);
            const qtdRepassada = parseFloat(r.quantidadeRepassada || 0);
            
            // Calcular volume por vendedor usando os campos de quantidade
            for (let i = 1; i <= 5; i++) {
                const vendedor = r[`vendedor ${i}`];
                const quantidade = parseFloat(r[`quantidade ${i}`]) || 0;
                if (vendedor && quantidade > 0) {
                    volumePorVendedor[vendedor] = (volumePorVendedor[vendedor] || 0) + quantidade;
                    // Calcular repassado proporcionalmente para cada vendedor
                    if (qtdSolicitada > 0) {
                        const proporcao = quantidade / qtdSolicitada;
                        const repassadoProporcional = qtdRepassada * proporcao;
                        repassadoPorVendedor[vendedor] = (repassadoPorVendedor[vendedor] || 0) + repassadoProporcional;
                    }
                }
            }
            if (r.motivo) {
                volumePorMotivo[r.motivo] = (volumePorMotivo[r.motivo] || 0) + qtdSolicitada;
                repassadoPorMotivo[r.motivo] = (repassadoPorMotivo[r.motivo] || 0) + qtdRepassada;
            }
            if (r.produto) {
                volumePorProduto[r.produto] = (volumePorProduto[r.produto] || 0) + qtdSolicitada;
                repassadoPorProduto[r.produto] = (repassadoPorProduto[r.produto] || 0) + qtdRepassada;
            }
            if (r.familia) {
                volumePorFamilia[r.familia] = (volumePorFamilia[r.familia] || 0) + qtdSolicitada;
                repassadoPorFamilia[r.familia] = (repassadoPorFamilia[r.familia] || 0) + qtdRepassada;
            }
            if (r.dataRepasse) {
                const dataRepasse = r.dataRepasse;
                volumeTemporal[dataRepasse] = (volumeTemporal[dataRepasse] || 0) + qtdSolicitada;
                
                // Adicionar dados para tabela de total por data
                if (!volumeTemporal[dataRepasse + '_repassado']) {
                    volumeTemporal[dataRepasse + '_repassado'] = 0;
                }
                volumeTemporal[dataRepasse + '_repassado'] += qtdRepassada;
            }
        });

        const tempContainer = document.createElement('div');
        tempContainer.style.cssText = 'position: absolute; left: -9999px; width: 800px; height: 500px; display: block; visibility: hidden;';
        document.body.appendChild(tempContainer);
        console.log('Container temporário criado para gráficos do relatório');

        // Filtrar apenas as chaves que são datas (sem o sufixo _repassado)
        const datasTemporais = Object.keys(volumeTemporal)
            .filter(key => !key.includes('_repassado'))
            .sort((a, b) => new Date(a) - new Date(b));
            
        // Garantir que temos dados válidos para os gráficos
        const garantirDadosValidos = (dados) => {
            if (!dados || Object.keys(dados).length === 0) {
                return { 'Sem dados': 1 };
            }
            return dados;
        };
        
        const volumePorVendedorValido = garantirDadosValidos(volumePorVendedor);
        const volumePorMotivoValido = garantirDadosValidos(volumePorMotivo);
        const volumePorFamiliaValido = garantirDadosValidos(volumePorFamilia);
        
        // Garantir que temos dados temporais válidos
        let datasTemporaisValidas = datasTemporais;
        let dadosTemporaisValidos = datasTemporais.map(date => volumeTemporal[date]);
        
        if (datasTemporaisValidas.length === 0) {
            datasTemporaisValidas = ['Sem dados'];
            dadosTemporaisValidos = [0];
        }
        
        // Verificar e logar os dados para diagnóstico
        console.log('Dados para gráficos:', {
            vendedor: { labels: Object.keys(volumePorVendedorValido), data: Object.values(volumePorVendedorValido) },
            motivos: { labels: Object.keys(volumePorMotivoValido), data: Object.values(volumePorMotivoValido) },
            familia: { labels: Object.keys(volumePorFamiliaValido), data: Object.values(volumePorFamiliaValido) },
            temporal: { labels: datasTemporaisValidas, data: dadosTemporaisValidos }
        });
        
        const chartConfigs = [
            { name: 'vendedor', type: 'pie', label: 'Volume por Vendedor', labels: Object.keys(volumePorVendedorValido), data: Object.values(volumePorVendedorValido) },
            { name: 'motivos', type: 'bar', label: 'Volume por Motivo', labels: Object.keys(volumePorMotivoValido), data: Object.values(volumePorMotivoValido) },
            { name: 'familia', type: 'bar', label: 'Volume por Família', labels: Object.keys(volumePorFamiliaValido), data: Object.values(volumePorFamiliaValido) },
            { name: 'temporal', type: 'line', label: 'Evolução do Volume', labels: datasTemporaisValidas, data: dadosTemporaisValidos }
        ];

        // Configurações específicas para o PDF com cores mais fortes
        const pdfChartOptions = {
            animation: false,
            plugins: {
                legend: {
                    labels: { color: '#000000', font: { weight: 'bold', size: 12 } }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: '#000000', font: { weight: 'bold' } },
                    grid: { color: 'rgba(0, 0, 0, 0.2)' }
                },
                x: {
                    ticks: { color: '#000000', font: { weight: 'bold' } },
                    grid: { color: 'rgba(0, 0, 0, 0.2)' }
                }
            }
        };

        // Cores mais fortes para os gráficos no PDF
        const pdfColors = {
            backgroundColor: [
                'rgba(27, 94, 32, 0.9)', 'rgba(56, 142, 60, 0.9)', 'rgba(76, 175, 80, 0.9)',
                'rgba(139, 195, 74, 0.9)', 'rgba(205, 220, 57, 0.9)', 'rgba(255, 235, 59, 0.9)',
                'rgba(255, 193, 7, 0.9)', 'rgba(255, 152, 0, 0.9)', 'rgba(255, 87, 34, 0.9)',
                'rgba(121, 85, 72, 0.9)', 'rgba(33, 150, 243, 0.9)', 'rgba(156, 39, 176, 0.9)'
            ],
            borderColor: '#000000',
            lineColor: 'rgba(27, 94, 32, 1)'
        };

        const chartImages = {};
        
        // Verificar se temos dados para todos os gráficos
        console.log('Dados para gráficos do relatório:');
        console.log('Volume por Vendedor:', Object.keys(volumePorVendedor).length, 'itens');
        console.log('Volume por Motivo:', Object.keys(volumePorMotivo).length, 'itens');
        console.log('Volume por Família:', Object.keys(volumePorFamilia).length, 'itens');
        console.log('Evolução Temporal:', datasTemporais.length, 'itens');
        
        for (const config of chartConfigs) {
            const canvas = document.createElement('canvas');
            canvas.id = `temp-${config.name}`;
            canvas.width = 600;
            canvas.height = 400;
            canvas.style.width = '600px';
            canvas.style.height = '400px';
            tempContainer.appendChild(canvas);
            console.log(`Canvas criado para ${config.name}: ${canvas.id}`);
            
            // Configurar opções específicas para cada tipo de gráfico
            const chartOptions = { ...pdfChartOptions };
            const chartColors = { ...pdfColors };
            
            // Configurações específicas para cada tipo de gráfico
            if (config.type === 'line') {
                chartOptions.backgroundColor = 'rgba(27, 94, 32, 0.4)';
                chartOptions.borderColor = chartColors.lineColor;
                chartOptions.borderWidth = 3;
            } else if (config.type === 'pie') {
                // Configurações específicas para gráficos de pizza
                chartOptions.plugins = {
                    ...chartOptions.plugins,
                    datalabels: {
                        color: '#FFFFFF',
                        font: { weight: 'bold', size: 16 },
                        formatter: (value, context) => {
                            const sum = context.dataset.data.reduce((a, b) => a + b, 0);
                            return sum > 0 ? (value * 100 / sum).toFixed(1) + '%' : '0%';
                        }
                    }
                };
            }
            
            try {
                // Verificar se temos dados válidos para este gráfico
                if (!config.labels || !config.data || config.labels.length === 0 || config.data.length === 0) {
                    console.error(`Dados inválidos para o gráfico ${config.name}. Labels: ${config.labels?.length}, Data: ${config.data?.length}`);
                    continue;
                }
                
                const chartInstance = renderChartForPDF(null, canvas.id, config.type, config.label, config.labels, config.data, chartOptions, chartColors);
                if (chartInstance) {
                    // Aumentar significativamente o tempo de espera para garantir que o gráfico seja renderizado
                    console.log(`Aguardando renderização do gráfico ${config.name}...`);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    console.log(`Tempo de espera concluído para o gráfico ${config.name}`);
                    
                    try {
                        console.log(`Tentando obter imagem para o gráfico ${config.name}...`);
                        const imageData = chartInstance.toBase64Image();
                        console.log(`Tamanho dos dados da imagem ${config.name}: ${imageData ? imageData.length : 0} caracteres`);
                        
                        if (imageData && imageData.length > 0) {
                            chartImages[config.name] = imageData;
                            console.log(`Gráfico ${config.name} gerado com sucesso: ${imageData.substring(0, 50)}...`);
                        } else {
                            console.error(`Imagem vazia para o gráfico ${config.name}`);
                        }
                    } catch (error) {
                        console.error(`Erro ao gerar imagem para o gráfico ${config.name}:`, error);
                    } finally {
                        chartInstance.destroy();
                    }
                } else {
                    console.error(`Falha ao renderizar o gráfico ${config.name}`);
                }
            } catch (error) {
                console.error(`Erro ao processar o gráfico ${config.name}:`, error);
            }
            tempContainer.removeChild(canvas);
        }
        document.body.removeChild(tempContainer);
        
        // Função específica para renderizar gráficos para PDF com cores mais fortes
        function renderChartForPDF(chartInstance, canvasId, type, label, labels, data, customOptions = {}, chartColors) {
            const canvas = document.getElementById(canvasId);
            if (!canvas) {
                console.error(`Canvas with id ${canvasId} not found.`);
                return null;
            }
            
            // Definir dimensões explícitas para o canvas
            canvas.width = 600;
            canvas.height = 400;
            canvas.style.width = '600px';
            canvas.style.height = '400px';
            
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                console.error(`Não foi possível obter o contexto 2d para o canvas ${canvasId}`);
                return null;
            }
            
            if (chartInstance) chartInstance.destroy();
            
            console.log(`Renderizando gráfico ${type} para ${label} com ${data.length} pontos de dados`);
            console.log(`Dados do gráfico ${label}:`, { labels, data });
            
            // Garantir que temos dados válidos
            if (!labels || !data || labels.length === 0 || data.length === 0) {
                console.error(`Dados inválidos para o gráfico ${label}`);
                return null;
            }
            
            // Configurações específicas para gráficos de pizza
            let chartConfig = {
                type: type,
                data: {
                    labels: labels,
                    datasets: [{
                        label: label,
                        data: data,
                        backgroundColor: type === 'line' ? 'rgba(27, 94, 32, 0.4)' : chartColors.backgroundColor,
                        borderColor: type === 'line' ? chartColors.lineColor : chartColors.borderColor,
                        borderWidth: type === 'line' ? 3 : 1,
                        fill: type === 'line',
                        tension: type === 'line' ? 0.4 : 0
                    }]
                },
                options: {
                    ...pdfChartOptions,
                    ...customOptions,
                    responsive: false,  // Importante para garantir que o tamanho seja respeitado
                    maintainAspectRatio: false,
                    plugins: {
                        ...pdfChartOptions.plugins,
                        datalabels: {
                            color: '#FFFFFF',
                            font: { weight: 'bold', size: 16 },
                            formatter: (value, context) => {
                                if (type === 'pie') {
                                    const sum = context.dataset.data.reduce((a, b) => a + b, 0);
                                    return sum > 0 ? (value * 100 / sum).toFixed(1) + '%' : '0%';
                                }
                                return value;
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const label = context.label || '';
                                    const value = context.raw || 0;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                                    return `${label}: ${value} (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            };
            
            return new Chart(ctx, chartConfig);
        }

        const createTable = (title, tableData, repassadoData) => {
            // Adicionar emoticons específicos para cada tipo de tabela
            let emoji = '📊';
            if (title.includes('Vendedor')) emoji = '👨‍💼';
            if (title.includes('Motivo')) emoji = '🔍';
            if (title.includes('Família')) emoji = '🌱';
            if (title.includes('Produto')) emoji = '🍇';
            if (title.includes('Data')) emoji = '📅';
            
            let table = `<h3>${emoji} ${title}</h3><table><thead><tr><th>📝 Item</th><th>🎯 Total Solicitado</th><th>✅ Total Repassado</th><th>📈 Taxa de Conclusão</th></tr></thead><tbody>`;
            for (const [key, value] of Object.entries(tableData)) {
                const repassado = repassadoData[key] || 0;
                const taxaConclusao = value > 0 ? (repassado / value) * 100 : 0;
                table += `<tr><td>${key}</td><td>${value.toFixed(2)}</td><td>${repassado.toFixed(2)}</td><td>${taxaConclusao.toFixed(2)}%</td></tr>`;
            }
            table += '</tbody></table>';
            return table;
        };

        // Preparar dados para tabela de total por data
        const volumePorData = {};
        const repassadoPorData = {};
        
        // Extrair datas únicas e organizar dados para a tabela de total por data
        const datasUnicas = Object.keys(volumeTemporal)
            .filter(key => !key.includes('_repassado'))
            .sort((a, b) => new Date(a) - new Date(b));
            
        datasUnicas.forEach(data => {
            volumePorData[data] = volumeTemporal[data] || 0;
            repassadoPorData[data] = volumeTemporal[data + '_repassado'] || 0;
        });
        
        // Verificar se as imagens dos gráficos foram geradas
        console.log('Status das imagens dos gráficos:');
        console.log('Imagem do gráfico de vendedor:', chartImages.vendedor ? 'Gerada' : 'Não gerada');
        console.log('Imagem do gráfico de motivos:', chartImages.motivos ? 'Gerada' : 'Não gerada');
        console.log('Imagem do gráfico de família:', chartImages.familia ? 'Gerada' : 'Não gerada');
        console.log('Imagem do gráfico temporal:', chartImages.temporal ? 'Gerada' : 'Não gerada');
        
        const reportHtml = `
            <html>
                <head>
                    <title>Relatório de Repasses</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 0; background-color: #fff; color: #000; -webkit-print-color-adjust: exact !important; color-adjust: exact !important; }
                        .report-container { max-width: 1000px; margin: auto; padding: 20px; border: 3px solid #1B5E20; border-radius: 15px; box-shadow: 0 5px 15px rgba(0,0,0,0.1); }
                        h1, h2, h3 { color: #1B5E20; text-align: center; margin-bottom: 15px; }
                        h1 { font-size: 22pt; }
                        h2 { font-size: 18pt; margin-top: 40px; padding-bottom: 10px; border-bottom: 2px solid #1B5E20; }
                        h2::before, h2::after { content: '♻️'; margin: 0 10px; }
                        h3 { font-size: 14pt; margin-top: 30px; }
                        h3::before { content: '📊'; margin-right: 8px; }
                        table { border-collapse: collapse; width: 100%; margin: 20px auto 40px; page-break-inside: avoid; border: 2px solid #1B5E20; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
                        th, td { border: 1px solid #ccc; padding: 10px; font-size: 10pt; }
                        th { background-color: #E8F5E9 !important; font-weight: bold; border-bottom: 2px solid #1B5E20; }
                        .charts-container { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px auto; }
                        .chart { border: 2px solid #1B5E20; border-radius: 10px; padding: 10px; box-sizing: border-box; page-break-inside: avoid; transform: scale(0.8); transform-origin: top center; box-shadow: 0 3px 10px rgba(0,0,0,0.1); }
                        .chart h3 { font-size: 12pt; margin: 5px 0; }
                        .chart h3::before { content: '📈'; margin-right: 5px; }
                        .chart img { max-width: 100%; height: auto; border-radius: 5px; }
                        .print-button { display: block; width: 200px; margin: 20px auto; padding: 12px 20px; background-color: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer; text-align: center; font-size: 12pt; box-shadow: 0 3px 5px rgba(0,0,0,0.2); transition: all 0.3s ease; }
                        .print-button:hover { background-color: #388E3C; transform: translateY(-2px); box-shadow: 0 5px 8px rgba(0,0,0,0.2); }
                        .print-button::before { content: '🖨️'; margin-right: 8px; }
                        .summary-cards { display: grid; grid-template-columns: repeat(5, 1fr); gap: 15px; margin: 20px 0; }
                        .card { background-color: #E8F5E9; border-radius: 10px; padding: 15px; text-align: center; box-shadow: 0 4px 8px rgba(0,0,0,0.15); border: 1px solid #1B5E20; transition: transform 0.3s ease; }
                        .card:hover { transform: translateY(-3px); box-shadow: 0 6px 12px rgba(0,0,0,0.2); }
                        .card h4 { margin: 0 0 8px 0; color: #1B5E20; font-size: 11pt; }
                        .card p { margin: 0; font-size: 16pt; font-weight: bold; color: #1B5E20; }
                        .report-header { text-align: center; margin-bottom: 20px; padding: 15px; border-bottom: 2px solid #1B5E20; }
                        .report-logo { max-width: 200px; height: auto; margin: 0 auto 15px; display: block; }
                        @media print { 
                            .print-button { display: none; } 
                            .report-container { padding: 0; max-width: 100%; border: none; box-shadow: none; } 
                            .page-break { page-break-before: always; } 
                            .no-break { page-break-inside: avoid; } 
                        }
                    </style>
                </head>
                <body>
                    <div class="report-container">
                        <button class="print-button" onclick="window.print()">Imprimir ou Salvar como PDF</button>
                        
                        <!-- PRIMEIRA PÁGINA: Logo, cabeçalho, cards e gráficos -->
                        <div class="no-break">
                            <div class="report-header">
                                <img src="logogrupodocemel.png" alt="Grupo DoceMel" class="report-logo">
                                <h1>Relatório de Repasses - GDM</h1>
                                <p>Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
                            </div>
                            
                            <!-- Cards com estatísticas -->
                            <div class="summary-cards">
                                <div class="card">
                                    <h4>🎯 Total Qtd. Solicitada</h4>
                                    <p>${totalQtdSolicitada.toFixed(2)}</p>
                                </div>
                                <div class="card">
                                    <h4>✅ Total Qtd. Repassada</h4>
                                    <p>${totalQtdRepassada.toFixed(2)}</p>
                                </div>
                                <div class="card">
                                    <h4>📈 % do Total Repassado</h4>
                                    <p>${percentualConclusao.toFixed(2)}%</p>
                                </div>
                                <div class="card">
                                    <h4>🛒 Total de Produtos</h4>
                                    <p>${produtosDiferentes}</p>
                                </div>
                                <div class="card">
                                    <h4>📝 Total Registros</h4>
                                    <p>${totalRegistros}</p>
                                </div>
                            </div>
                            
                            <!-- Gráficos logo após os cards -->
                            <div class="charts-container">
                                <div class="chart"><h3>Volume por Vendedor</h3>${chartImages.vendedor ? `<img src="${chartImages.vendedor}" alt="Gráfico de Volume por Vendedor">` : '<p style="color:red;">Gráfico não disponível</p>'}</div>
                                <div class="chart"><h3>Volume por Motivo</h3>${chartImages.motivos ? `<img src="${chartImages.motivos}" alt="Gráfico de Volume por Motivo">` : '<p style="color:red;">Gráfico não disponível</p>'}</div>
                                <div class="chart"><h3>Volume por Família</h3>${chartImages.familia ? `<img src="${chartImages.familia}" alt="Gráfico de Volume por Família">` : '<p style="color:red;">Gráfico não disponível</p>'}</div>
                                <div class="chart"><h3>Evolução do Volume</h3>${chartImages.temporal ? `<img src="${chartImages.temporal}" alt="Gráfico de Evolução do Volume">` : '<p style="color:red;">Gráfico não disponível</p>'}</div>
                            </div>
                        </div>
                        
                        <!-- Tabelas Consolidadas em Sequência -->
                        <div class="no-break">
                            <h2>Totais Consolidados</h2>
                            ${createTable('Total por Vendedor', volumePorVendedor, repassadoPorVendedor)}
                            <hr style="border: 2px dashed #1B5E20; margin: 30px 0;">
                            ${createTable('Total por Motivo', volumePorMotivo, repassadoPorMotivo)}
                            <hr style="border: 2px dashed #1B5E20; margin: 30px 0;">
                            ${createTable('Total por Família', volumePorFamilia, repassadoPorFamilia)}
                            <hr style="border: 2px dashed #1B5E20; margin: 30px 0;">
                            ${createTable('Total por Produto', volumePorProduto, repassadoPorProduto)}
                            <hr style="border: 2px dashed #1B5E20; margin: 30px 0;">
                            ${createTable('Total por Data', volumePorData, repassadoPorData)}
                        </div>
                    </div>
                </body>
            </html>
        `;
        
        reportWindow.document.open();
        reportWindow.document.write(reportHtml);
        reportWindow.document.close();
    }

    function gerarRelatorioCsv() {
        if (relatoriosFilteredData.length === 0) {
            alert("Nenhum dado para exportar.");
            return;
        }
        let csvContent = "data:text/csv;charset=utf-8,";
        const headers = Object.keys(relatoriosFilteredData[0]);
        csvContent += headers.join(";") + "\r\n";
        relatoriosFilteredData.forEach(row => {
            const values = headers.map(header => {
                const value = row[header];
                return (typeof value === 'string' && (value.includes(';') || value.includes('\n'))) ? `"${value.replace(/"/g, '""')}"` : value;
            });
            csvContent += values.join(";") + "\r\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "relatorio_repasse.csv");
        document.body.appendChild(link); 
        link.click();
        document.body.removeChild(link);
    }

    // --- TELA DE HISTÓRICO ---
    function adicionarLogHistorico(acao, detalhes) {
        const current = getCurrentUser();
        const log = { 
            data: new Date().toLocaleString('pt-BR', { timeZone: 'America/Bahia' }), 
            usuario: current?.email || 'usuário.desconhecido@example.com', 
            acao, 
            detalhes 
        };
        
        // Adicionar ao histórico local
        historicoDeEdicoes.unshift(log);
        
        // Manter apenas registros dentro do período de retenção
        historicoDeEdicoes = historicoDeEdicoes.filter(log => isWithinRetentionPeriod(log.data));
        
        // Salvar localmente
        saveHistoricoToStorage();
        
        // Salvar no Supabase (não-bloqueante)
        saveHistoricoToSupabase(acao, detalhes);
        
        // Atualizar tela
        exibirHistorico();
    }

    async function exibirHistorico() {
        const historicoPage = document.getElementById('historico');
        if (!historicoPage) return;

        // Verificar se a página já está sendo carregada
        const infoSpan = document.querySelector('.historico-info');
        if (infoSpan && infoSpan.textContent === 'Carregando histórico...') {
            console.log('Histórico já está sendo carregado, aguardando...');
            return; // Evita carregar novamente se já estiver em andamento
        }
        
        // Se não tiver a lista de histórico, a inicialização será feita pelo loadDynamicContent
        if (!document.getElementById('historico-lista')) return;
        
        const historicoLista = document.getElementById('historico-lista');
        if (!historicoLista) return;

        historicoLista.innerHTML = '';
        if (historicoDeEdicoes.length === 0) {
            historicoLista.innerHTML = '<p>Nenhum registro de edição encontrado.</p>';
        } else {
            historicoDeEdicoes.forEach(log => {
                const logDiv = document.createElement('div');
                logDiv.className = 'log-item';
                // Verificar se a data é uma string ISO ou um objeto Date
                let dataFormatada;
                if (typeof log.data === 'string') {
                    try {
                        dataFormatada = new Date(log.data).toLocaleString('pt-BR', { timeZone: 'America/Bahia' });
                    } catch (e) {
                        dataFormatada = log.data; // Manter o formato original se falhar
                    }
                } else {
                    dataFormatada = log.data;
                }
                
                logDiv.innerHTML = `
                    <p><strong>Data:</strong> ${dataFormatada} | <strong>Usuário:</strong> ${log.usuario} | <strong>Ação:</strong> ${log.acao}</p>
                    <p><strong>Detalhes:</strong> ${log.detalhes}</p>
                    <hr>
                `;
                historicoLista.appendChild(logDiv);
            });
        }
    }

    async function carregarHistoricoCompleto() {
        const historicoLista = document.getElementById('historico-lista');
        const infoSpan = document.querySelector('.historico-info');
        
        if (!historicoLista) return;
        
        try {
            historicoLista.innerHTML = '<p>Carregando histórico completo...</p>';
            if (infoSpan) infoSpan.textContent = 'Carregando histórico do Supabase...';
            
            // Verificar se o usuário está logado
            const currentUser = getCurrentUser();
            if (!currentUser || !currentUser.email) {
                throw new Error('Usuário não está logado');
            }
            
            const response = await apiFetch('/api/historico?limit=500');
            if (!response.ok) {
                throw new Error(`Erro ao carregar histórico: ${response.statusText || 'Erro desconhecido'}`);
            }
            
            const historicoCompleto = await response.json();
            console.log('Histórico carregado do Supabase:', historicoCompleto);
            
            // Processar os dados do Supabase para o formato esperado
            const historicoProcessado = historicoCompleto.map(item => {
                // Verificar se o item tem created_at (formato Supabase) ou data (formato local)
                let dataFormatada;
                if (item.created_at) {
                    try {
                        dataFormatada = new Date(item.created_at).toLocaleString('pt-BR', { timeZone: 'America/Bahia' });
                    } catch (e) {
                        console.error('Erro ao formatar data:', e, item.created_at);
                        dataFormatada = 'Data inválida';
                    }
                } else if (item.data) {
                    dataFormatada = item.data;
                } else {
                    dataFormatada = 'Data não disponível';
                }
                
                return {
                    data: dataFormatada,
                    usuario: item.email || item.usuario || 'Desconhecido',
                    acao: item.acao || 'Ação não especificada',
                    detalhes: item.detalhes || 'Sem detalhes'
                };
            });
            
            // Ordenar por data (mais recente primeiro)
            historicoProcessado.sort((a, b) => {
                try {
                    // Tentar converter as datas formatadas de volta para objetos Date
                    const partsA = a.data.split(' ');
                    const partsB = b.data.split(' ');
                    
                    if (partsA.length < 2 || partsB.length < 2) return 0;
                    
                    const dateA = partsA[0].split('/').reverse().join('-');
                    const dateB = partsB[0].split('/').reverse().join('-');
                    
                    const timeA = partsA[1];
                    const timeB = partsB[1];
                    
                    const dataA = new Date(`${dateA}T${timeA}`);
                    const dataB = new Date(`${dateB}T${timeB}`);
                    
                    return dataB - dataA; // Ordem decrescente (mais recente primeiro)
                } catch (e) {
                    console.error('Erro ao ordenar datas:', e);
                    return 0;
                }
            });
            
            // Atualizar o histórico local com os dados processados
            historicoDeEdicoes = historicoProcessado;
            
            // Salvar no localStorage para acesso offline
            saveHistoricoToStorage();
            
            if (infoSpan) {
                infoSpan.textContent = `Histórico carregado com sucesso (${historicoProcessado.length} registros)`;
            }
            
            // Exibir o histórico
            exibirHistorico();
        } catch (error) {
            console.error('Erro ao carregar histórico completo:', error);
            historicoLista.innerHTML = '<p>Erro ao carregar histórico completo. Verifique sua conexão.</p>';
            
            // Voltar para histórico local
            if (infoSpan) {
                infoSpan.textContent = `Erro: ${error.message} - Exibindo histórico local`;
            }
            
            // Carregar histórico do localStorage
            loadHistoricoFromStorage();
            
            setTimeout(() => {
                // Exibir histórico local
                exibirHistorico();
            }, 1000);
        }
    }

    // --- Funções Auxiliares ---
    function calcularTempo() {
        const dataRecebimentoInput = document.getElementById('data-recebimento');
        const tempoInput = document.getElementById('tempo');
        const dr = dataRepasseInput.value;
        const drec = dataRecebimentoInput.value;
        if (!dr || !drec) { tempoInput.value = ''; return; }
        const utcR = utcFromISODate(dr);
        const utcRec = utcFromISODate(drec);
        if (utcRec > utcR) {
            alert("A data de recebimento não pode ser posterior à data de repasse.");
            dataRecebimentoInput.value = ''; tempoInput.value = ''; return;
        }
        tempoInput.value = Math.ceil((utcR - utcRec) / (1000*60*60*24));
    }

    // Motivos (completo, baseado no promptAPPrepasse.txt)
    const MOTIVOS = [
      'Baixa Qualidade','Baixo Peso','Cicatrizes e/ou Manchas','Colar Data De Embalagem',
      'Colar Etiqueta e/ou Cinta','Danos','Danos Graves','Danos Leves','Desidratação',
      'Direcionado','Evoluindo','Maturacao','Morfo','Podridao','Podridao E Morfo',
      'Produto Velho','Tempo De Estoque','Outro (digitar)'
    ];

    function populateMotivoOptions() {
      const motivoSelect = document.getElementById('motivo');
      const editMotivoSelect = document.getElementById('edit-motivo');
      const optionsHtml = MOTIVOS.map(m => `<option value="${m}">${m}</option>`).join('');
      if (motivoSelect) motivoSelect.innerHTML = optionsHtml;
      if (editMotivoSelect) editMotivoSelect.innerHTML = optionsHtml;
    }

    function handleOutroMotivo(selectEl) {
      if (!selectEl) return;
      if (selectEl.value === 'Outro (digitar)') {
        const custom = window.prompt('Digite o motivo:');
        if (custom && custom.trim()) {
          const val = custom.trim();
          let opt = Array.from(selectEl.options).find(o => o.value === val);
          if (!opt) {
            opt = document.createElement('option');
            opt.value = val;
            opt.textContent = val;
            selectEl.appendChild(opt);
          }
          selectEl.value = val;
        } else {
          selectEl.value = '';
        }
      }
    }

    // Cross-filter no Dashboard a partir dos gráficos
    function setDashboardFilter(dim, label) {
      const prodSel = document.getElementById('dashboard-produto');
      const vendSel = document.getElementById('dashboard-vendedor');
      const motSel = document.getElementById('dashboard-motivo');
      const start = document.getElementById('dashboard-data-inicio');
      const end = document.getElementById('dashboard-data-fim');

      if (dim === 'produto' && prodSel) prodSel.value = (prodSel.value === label ? '' : label);
      if (dim === 'vendedor' && vendSel) vendSel.value = (vendSel.value === label ? '' : label);
      if (dim === 'motivo' && motSel) motSel.value = (motSel.value === label ? '' : label);
      if (dim === 'data' && start && end) {
        if (start.value === label && end.value === label) { start.value = ''; end.value = ''; }
        else { start.value = label; end.value = label; }
      }
      applyDashboardFilters();
    }

    function handleChartClickFactory(dim) {
      return (evt, elements, chart) => {
        try {
          const el = elements?.[0];
          if (!el) return;
          const idx = el.index;
          const lbl = chart?.data?.labels?.[idx];
          if (!lbl) return;
          setDashboardFilter(dim, lbl);
        } catch (e) { console.error('Chart click handler error', e); }
      };
    }

    function applyRoleAccess() {
      const current = getCurrentUser();
      const role = (current?.tipo || '').toLowerCase();

      // nav helpers
      const hideNav = (hash, hidden) => {
        const a = document.querySelector(`nav a[href="${hash}"]`);
        if (a && a.parentElement) a.parentElement.style.display = hidden ? 'none' : '';
      };
      const hidePage = (id, hidden) => {
        const el = document.getElementById(id);
        if (el) el.style.display = hidden ? 'none' : '';
      };

      // perfil (somente admin)
      const navPerfil = document.getElementById('nav-perfil');
      if (navPerfil) navPerfil.style.display = (role === 'administrador') ? '' : 'none';

      // por padrão, mostra tudo; esconde conforme regra
      const restrict = {
        operacao:    { hide: [], pages: [] },
        comercial:   { hide: ['#registros'],   pages: ['registros'] },
        gerencia:    { hide: ['#registros','#historico'], pages: ['registros','historico'] },
        administrador: { hide: [], pages: [] }
      }[role] || { hide: [], pages: [] };

      restrict.hide.forEach(h => hideNav(h, true));
      restrict.pages.forEach(p => hidePage(p, true));
      
      // Reaplicar filtros e renderizar tabelas para garantir que as restrições sejam aplicadas
      if (document.getElementById('resumos') && document.getElementById('resumos').style.display !== 'none') {
        applyResumosFilters();
      }
    }

    async function apiFetch(path, init = {}) {
      const current = getCurrentUser();
      const headers = Object.assign({}, init.headers || {}, {
        'Content-Type': 'application/json',
        'x-user-email': current?.email || ''
      });
      
      // Determinar a URL base da API com base no ambiente
      const isProduction = window.location.hostname !== 'localhost';
      let baseUrl;
      
      if (isProduction) {
        // Em produção, use a URL relativa sem especificar a porta
        baseUrl = '';
      } else {
        // Em desenvolvimento local, use a porta específica
        const serverPort = window.location.port || '3000';
        const serverHost = window.location.hostname || 'localhost';
        const serverProtocol = window.location.protocol || 'http:';
        baseUrl = `${serverProtocol}//${serverHost}:${serverPort}`;
      }
      
      return fetch(`${baseUrl}${path}`, { ...init, headers });
    }

    // --- INICIAR APLICAÇÃO ---
    initialize();
    applyRoleAccess();

    // PERFIL (somente admin; a navegação mostra/oculta via applyRoleAccess)
    const perfilForm = document.getElementById('perfil-create-form');
    perfilForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const usuario = document.getElementById('perfil-nome')?.value?.trim();
      const email = document.getElementById('perfil-email')?.value?.trim();
      const senha = document.getElementById('perfil-senha')?.value;
      if (!usuario || !email || !senha) return alert('Preencha nome, email e senha.');
      try {
        const resp = await apiFetch('/api/users', { method: 'POST', body: JSON.stringify({ usuario, email, senha }) });
        if (!resp.ok) {
          const err = await resp.json().catch(()=> ({}));
          throw new Error(err.error || 'Falha ao criar usuário');
        }
        alert('Usuário criado como Operação.');
        perfilForm.reset();
        await carregarUsuariosPerfil();
      } catch (err) {
        alert(err.message || 'Erro ao criar usuário.');
      }
    });

    async function carregarUsuariosPerfil() {
      const tbody = document.getElementById('perfil-tabela-usuarios');
      if (!tbody) return;
      tbody.innerHTML = '<tr><td colspan="6">Carregando...</td></tr>';
      try {
        const resp = await apiFetch('/api/users');
        if (!resp.ok) throw new Error('Erro ao carregar usuários');
        const users = await resp.json();
        const options = ['administrador','operacao','comercial','gerencia'];
        tbody.innerHTML = '';
        users.forEach(u => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>${u.id}</td>
            <td><input type="text" class="pf-usuario" value="${u.usuario || ''}" data-id="${u.id}"></td>
            <td><input type="email" class="pf-email" value="${u.email || ''}" data-id="${u.id}"></td>
            <td>
              <select data-id="${u.id}" class="pf-tipo">
                ${options.map(t => `<option value="${t}" ${String(u.tipo||'').toLowerCase()===t?'selected':''}>${t}</option>`).join('')}
              </select>
            </td>
            <td>${u.created_at ? new Date(u.created_at).toLocaleString('pt-BR') : ''}</td>
            <td>
              <input type="password" class="pf-newpass" placeholder="Nova senha" data-id="${u.id}" style="margin-bottom: 5px;">
              <br>
              <button class="pf-save" data-id="${u.id}">Salvar</button>
              <button class="pf-del" data-id="${u.id}">Excluir</button>
            </td>
          `;
          tbody.appendChild(tr);
        });

        // Salvar alterações (usuario, email, tipo, nova senha se informada)
        tbody.querySelectorAll('.pf-save').forEach(btn => {
          btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-id');
            const usuario = tbody.querySelector(`.pf-usuario[data-id="${id}"]`)?.value?.trim();
            const email = tbody.querySelector(`.pf-email[data-id="${id}"]`)?.value?.trim();
            const tipo = tbody.querySelector(`.pf-tipo[data-id="${id}"]`)?.value;
            const senha = tbody.querySelector(`.pf-newpass[data-id="${id}"]`)?.value;
            const body = {};
            if (usuario) body.usuario = usuario;
            if (email) body.email = email;
            if (tipo) body.tipo = tipo;
            if (senha) body.senha = senha;

            try {
              const resp = await apiFetch(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(body) });
              if (!resp.ok) {
                const err = await resp.json().catch(()=> ({}));
                throw new Error(err.error || 'Falha ao salvar');
              }
              alert('Alterações salvas.');
              await carregarUsuariosPerfil();
            } catch (err) {
              alert(err.message || 'Erro ao salvar.');
            }
          });
        });

        // Excluir
        tbody.querySelectorAll('.pf-del').forEach(btn => {
          btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-id');
            if (!confirm('Confirma excluir este usuário?')) return;
            try {
              const resp = await apiFetch(`/api/users/${id}`, { method: 'DELETE' });
              if (!resp.ok) {
                const err = await resp.json().catch(()=> ({}));
                throw new Error(err.error || 'Falha ao excluir');
              }
              await carregarUsuariosPerfil();
            } catch (err) {
              alert(err.message || 'Erro ao excluir.');
            }
          });
        });

      } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6">${err.message || 'Erro'}</td></tr>`;
      }
    }

    // Carrega usuários ao entrar na tela Perfil
    document.querySelector('a[href="#perfil"]')?.addEventListener('click', () => {
      const current = getCurrentUser();
      if ((current?.tipo || '').toLowerCase() === 'administrador') {
        carregarUsuariosPerfil();
      }
    });

    // Se já estiver em #perfil ao carregar (e for admin), carrega a lista
    (() => {
      const current = getCurrentUser();
      if (window.location.hash === '#perfil' && (current?.tipo || '').toLowerCase() === 'administrador') {
        carregarUsuariosPerfil();
      }
    })();

    // E, opcionalmente, quando trocar o hash:
    window.addEventListener('hashchange', () => {
      const current = getCurrentUser();
      if (window.location.hash === '#perfil' && (current?.tipo || '').toLowerCase() === 'administrador') {
        carregarUsuariosPerfil();
      }
    });

    const BAHIA_TZ = 'America/Bahia';
    function getBahiaTodayISO() {
      const fmt = new Intl.DateTimeFormat('sv-SE', { timeZone: BAHIA_TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
      return fmt.format(new Date()); // YYYY-MM-DD
    }
    
    // Função auxiliar para obter data da Bahia com offset de dias
    function getBahiaDateISO(dayOffset = 0) {
        const today = getBahiaDate();
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + dayOffset);
        return formatDateToISO(targetDate);
    }
    
    // Função auxiliar para obter objeto Date na timezone da Bahia
    function getBahiaDate() {
        const now = new Date();
        const bahiaTime = new Date(now.toLocaleString("en-US", {timeZone: BAHIA_TZ}));
        return bahiaTime;
    }
    
    // Função auxiliar para formatar Date para ISO (YYYY-MM-DD)
    function formatDateToISO(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    function formatISOToPtBR(iso) { if (!iso) return ''; const [y,m,d]=iso.split('-'); return `${d}/${m}/${y}`; }
    function utcFromISODate(iso) { const [y,m,d] = iso.split('-').map(Number); return Date.UTC(y, m-1, d); }

    setupEventListeners();
    populateMotivoOptions();

    // Event listeners para o modal de quantidade
    document.getElementById('quantidade-valor')?.addEventListener('input', (e) => {
        const valor = parseFloat(e.target.value);
        const confirmacao = document.getElementById('quantidade-confirmacao');
        
        if (valor > 0) {
            confirmacao.style.display = 'block';
        } else {
            confirmacao.style.display = 'none';
            document.getElementById('quantidade-detalhes').style.display = 'none';
        }
    });

    document.getElementById('confirmar-quantidade')?.addEventListener('click', () => {
        document.getElementById('quantidade-confirmacao').style.display = 'none';
        document.getElementById('quantidade-detalhes').style.display = 'block';
        
        // Set status padrão como Pendente
        document.getElementById('quantidade-status').value = 'Pendente';
    });

    document.getElementById('quantidade-form')?.addEventListener('submit', handleQuantidadeSubmit);

    function openQuantidadeModal(registro) {
        const modal = document.getElementById('quantidade-modal');
        const form = document.getElementById('quantidade-form');
        const confirmacao = document.getElementById('quantidade-confirmacao');
        const detalhes = document.getElementById('quantidade-detalhes');
        
        // Reset form
        form.reset();
        confirmacao.style.display = 'none';
        detalhes.style.display = 'block'; // Mostrar os detalhes para exibir o vendedor e status
        
        // Set registro ID
        document.getElementById('quantidade-registro-id').value = registro.id;
        
        // Populate vendedor select
        populateQuantidadeVendedores();
        
        // Mostrar informações sobre os campos já preenchidos
        const isDarkMode = document.body.classList.contains('dark-mode');
        const bgColor = isDarkMode ? '#2c3e50' : '#f8f9fa';
        const textColor = isDarkMode ? '#ffffff' : '#000000';
        let infoHtml = `<div style="margin-bottom: 15px; padding: 10px; background-color: ${bgColor}; border-radius: 5px; color: ${textColor};">`;
        infoHtml += `<h4 style="margin-top: 0; color: ${textColor};">Campos já preenchidos:</h4>`;
        
        const camposPreenchidos = [];
        if (registro['quantidade 1'] && registro['vendedor 1']) {
            camposPreenchidos.push(`Quantidade 1: ${registro['quantidade 1']} - Vendedor 1: ${registro['vendedor 1']}`);
        }
        if (registro['quantidade 2'] && registro['vendedor 2']) {
            camposPreenchidos.push(`Quantidade 2: ${registro['quantidade 2']} - Vendedor 2: ${registro['vendedor 2']}`);
        }
        if (registro['quantidade 3'] && registro['vendedor 3']) {
            camposPreenchidos.push(`Quantidade 3: ${registro['quantidade 3']} - Vendedor 3: ${registro['vendedor 3']}`);
        }
        if (registro['quantidade 4'] && registro['vendedor 4']) {
            camposPreenchidos.push(`Quantidade 4: ${registro['quantidade 4']} - Vendedor 4: ${registro['vendedor 4']}`);
        }
        if (registro['quantidade 5'] && registro['vendedor 5']) {
            camposPreenchidos.push(`Quantidade 5: ${registro['quantidade 5']} - Vendedor 5: ${registro['vendedor 5']}`);
        }
        
        if (camposPreenchidos.length > 0) {
            infoHtml += `<ul style="margin: 0; padding-left: 20px; color: ${textColor};">`;            
            camposPreenchidos.forEach(campo => {
                infoHtml += `<li>${campo}</li>`;
            });
            infoHtml += '</ul>';
        } else {
            infoHtml += `<p style="color: ${textColor};">Nenhum campo preenchido ainda.</p>`;
        }
        
        // Indicar qual será o próximo campo a ser preenchido
        let proximoCampo = '';
        if (!registro['quantidade 1']) {
            proximoCampo = 'Quantidade 1 e Vendedor 1';
        } else if (!registro['quantidade 2']) {
            proximoCampo = 'Quantidade 2 e Vendedor 2';
        } else if (!registro['quantidade 3']) {
            proximoCampo = 'Quantidade 3 e Vendedor 3';
        } else if (!registro['quantidade 4']) {
            proximoCampo = 'Quantidade 4 e Vendedor 4';
        } else if (!registro['quantidade 5']) {
            proximoCampo = 'Quantidade 5 e Vendedor 5';
        } else {
            proximoCampo = 'Todos os campos já estão preenchidos';
        }
        
        infoHtml += `<p style="color: ${textColor};"><strong>Próximo campo a ser preenchido:</strong> ${proximoCampo}</p>`;
        infoHtml += `<p style="color: ${textColor};"><strong>Nota:</strong> Você pode selecionar um vendedor já registrado para adicionar mais quantidade ao mesmo.</p>`;
        infoHtml += '</div>';
        
        // Inserir as informações antes do formulário
        const formContainer = form.parentNode;
        const infoDiv = document.createElement('div');
        infoDiv.id = 'quantidade-info';
        infoDiv.innerHTML = infoHtml;
        
        // Remover div de informações anterior se existir
        const oldInfoDiv = document.getElementById('quantidade-info');
        if (oldInfoDiv) {
            formContainer.removeChild(oldInfoDiv);
        }
        
        // Inserir a nova div de informações antes do formulário
        formContainer.insertBefore(infoDiv, form);
        
        // Show modal
        modal.style.display = 'block';
    }

    function populateQuantidadeVendedores() {
        const vendedorSelect = document.getElementById('quantidade-vendedor');
        
        // Lista fixa de vendedores conforme solicitado
        const vendedoresFixos = ['Vinicius', 'Ricardo', 'Antonio', 'Nixon', 'Outro'];
        
        // Adicionar também vendedores existentes nos registros
        const vendedoresRegistros = [...new Set(registrosCompletos.map(r => r.vendedor).filter(Boolean))];
        
        // Combinar as duas listas e remover duplicatas
        const todosVendedores = [...new Set([...vendedoresFixos, ...vendedoresRegistros])];
        
        // Preencher o select
        vendedorSelect.innerHTML = '<option value="">Selecione um vendedor</option>' + 
            todosVendedores.map(v => `<option value="${v}">${v}</option>`).join('');
            
        console.log('Vendedores carregados:', todosVendedores);
        
        // Forçar a exibição do select de vendedores
        document.getElementById('quantidade-detalhes').style.display = 'block';
    }

    async function handleQuantidadeSubmit(e) {
        e.preventDefault();
        
        const registroId = document.getElementById('quantidade-registro-id').value;
        const quantidade = parseFloat(document.getElementById('quantidade-valor').value);
        const vendedor = document.getElementById('quantidade-vendedor').value;
        const status = document.getElementById('quantidade-status').value;
        
        if (!registroId || !quantidade || !vendedor || !status) {
            alert('Todos os campos são obrigatórios.');
            return;
        }
        
        try {
            // Buscar registro atual
            const registro = registrosCompletos.find(r => r.id === registroId);
            if (!registro) {
                alert('Registro não encontrado.');
                return;
            }
            
            const updateData = {};
            
            // Verificar se o vendedor já existe em algum dos campos
            let vendedorExistente = false;
            let campoVendedor = '';
            
            for (let i = 1; i <= 5; i++) {
                if (registro[`vendedor ${i}`] === vendedor) {
                    vendedorExistente = true;
                    campoVendedor = `quantidade ${i}`;
                    // Adicionar à quantidade existente
                    const quantidadeExistente = parseFloat(registro[`quantidade ${i}`]) || 0;
                    updateData[`quantidade ${i}`] = quantidadeExistente + quantidade;
                    break;
                }
            }
            
            // Se o vendedor não existe, adicionar em um novo campo disponível
            if (!vendedorExistente) {
                // Verificar e preencher os campos de quantidade e vendedor sequencialmente
                if (!registro['quantidade 1']) {
                    updateData['quantidade 1'] = quantidade;
                    updateData['vendedor 1'] = vendedor;
                } else if (!registro['quantidade 2']) {
                    updateData['quantidade 2'] = quantidade;
                    updateData['vendedor 2'] = vendedor;
                } else if (!registro['quantidade 3']) {
                    updateData['quantidade 3'] = quantidade;
                    updateData['vendedor 3'] = vendedor;
                } else if (!registro['quantidade 4']) {
                    updateData['quantidade 4'] = quantidade;
                    updateData['vendedor 4'] = vendedor;
                } else if (!registro['quantidade 5']) {
                    updateData['quantidade 5'] = quantidade;
                    updateData['vendedor 5'] = vendedor;
                } else {
                    alert('Todos os 5 campos de quantidade já estão preenchidos e este vendedor não está registrado. Não é possível adicionar um novo vendedor.');
                    return;
                }
            }
            
            // Calcular a soma de todas as quantidades para atualizar quantidadeSolicitada
            // Obter valores existentes
            const qtd1 = parseFloat(registro['quantidade 1']) || 0;
            const qtd2 = parseFloat(registro['quantidade 2']) || 0;
            const qtd3 = parseFloat(registro['quantidade 3']) || 0;
            const qtd4 = parseFloat(registro['quantidade 4']) || 0;
            const qtd5 = parseFloat(registro['quantidade 5']) || 0;
            
            // Calcular a nova quantidade total
            let novaQuantidadeSolicitada = 0;
            
            // Se estamos atualizando um campo existente, precisamos calcular corretamente
            if (vendedorExistente) {
                // Adicionar todos os valores, substituindo o campo atualizado pelo novo valor
                if (campoVendedor !== 'quantidade 1') novaQuantidadeSolicitada += qtd1;
                if (campoVendedor !== 'quantidade 2') novaQuantidadeSolicitada += qtd2;
                if (campoVendedor !== 'quantidade 3') novaQuantidadeSolicitada += qtd3;
                if (campoVendedor !== 'quantidade 4') novaQuantidadeSolicitada += qtd4;
                if (campoVendedor !== 'quantidade 5') novaQuantidadeSolicitada += qtd5;
                
                // Adicionar o valor atualizado
                novaQuantidadeSolicitada += updateData[campoVendedor];
            } else {
                // Adicionar os valores existentes que não serão alterados
                if (!updateData['quantidade 1']) novaQuantidadeSolicitada += qtd1;
                if (!updateData['quantidade 2']) novaQuantidadeSolicitada += qtd2;
                if (!updateData['quantidade 3']) novaQuantidadeSolicitada += qtd3;
                if (!updateData['quantidade 4']) novaQuantidadeSolicitada += qtd4;
                if (!updateData['quantidade 5']) novaQuantidadeSolicitada += qtd5;
                
                // Adicionar o novo valor
                novaQuantidadeSolicitada += quantidade;
            }
            
            // Adicionar quantidadeSolicitada ao updateData
            updateData.quantidadeSolicitada = novaQuantidadeSolicitada;
            
            // Obter o email do usuário atual
            const currentUser = getCurrentUser();
            const usuarioComercial = currentUser?.email || 'usuariodocemel@gmail.com'; // Valor padrão como no exemplo
            
            // Adicionar status e usuarioComercial ao updateData
            updateData.status = status;
            updateData.usuarioComercial = usuarioComercial;
            
            console.log('Atualizando registro via modal quantidade:', updateData);
            
            // Atualizar no backend
            await updateRegistroById(registroId, updateData);
            
            // Fechar modal
            document.getElementById('quantidade-modal').style.display = 'none';
            
            // Refresh table
            applyResumosFilters();
            updateDashboard(registrosCompletos);
            
            const mensagem = vendedorExistente ? 
                `Quantidade adicionada com sucesso para o vendedor ${vendedor}! A quantidade foi atualizada.` : 
                'Quantidade adicionada com sucesso!';
            
            alert(mensagem);
            
        } catch (error) {
            console.error('Erro ao salvar quantidade:', error);
            alert(`Erro ao salvar quantidade: ${error.message}`);
        }
    }

    // Função para obter registros do dia anterior
    function getRegistrosOntem() {
        // Usar a função getBahiaDateISO para obter a data de ontem no fuso horário da Bahia
        const dataOntem = getBahiaDateISO(-1);
        
        return registrosCompletos.filter(registro => 
            registro.dataRepasse === dataOntem
        );
    }

    // Função para abrir o modal de repetir registros
    function abrirModalRepetirRegistros() {
        const modal = document.getElementById('repetir-registros-modal');
        const listaRegistros = document.getElementById('registros-anteriores-lista');
        
        // Obter registros do dia anterior
        const registrosOntem = getRegistrosOntem();
        
        if (registrosOntem.length === 0) {
            listaRegistros.innerHTML = '<p>Nenhum registro encontrado para o dia anterior.</p>';
        } else {
            // Criar lista de registros com checkboxes
            let html = '<div class="registros-anteriores-lista">';
            registrosOntem.forEach(registro => {
                html += `
                    <div class="registro-item">
                        <input type="checkbox" id="registro-${registro.id}" data-id="${registro.id}" class="registro-checkbox">
                        <label for="registro-${registro.id}">
                            <strong>${registro.produto}</strong> - 
                            Família: ${registro.familia || 'N/A'} - 
                            Motivo: ${registro.motivo || 'N/A'}
                        </label>
                    </div>
                `;
            });
            html += '</div>';
            listaRegistros.innerHTML = html;
        }
        
        // Mostrar modal
        modal.style.display = 'block';
    }

    // Função para repetir registros selecionados
    async function repetirRegistrosSelecionados() {
        const checkboxes = document.querySelectorAll('.registro-checkbox:checked');
        
        if (checkboxes.length === 0) {
            alert('Nenhum registro selecionado.');
            return;
        }
        
        try {
            const registrosParaRepetir = [];
            
            // Coletar registros selecionados
            checkboxes.forEach(checkbox => {
                const id = checkbox.dataset.id;
                const registro = registrosCompletos.find(r => r.id === id);
                if (registro) {
                    registrosParaRepetir.push(registro);
                }
            });
            
            // Obter informações do usuário atual
            const currentUser = getCurrentUser();
            const usuarioOperacoes = currentUser?.email || 'usuariodocemel@gmail.com';
            
            // Data atual para os novos registros
            const hoje = getBahiaTodayISO();
            
            // Processar cada registro
            for (const registro of registrosParaRepetir) {
                // Criar novo ID
                const nextId = (parseInt(localStorage.getItem('lastId') || 0)) + 1;
                const novoId = `S-REP.${String(nextId).padStart(7, '0')}`;
                
                // Calcular novo tempo (adicionar 1 dia)
                const tempoAtual = parseInt(registro['tempo(dias)']) || 0;
                const novoTempo = tempoAtual + 1;
                
                // Criar novo registro
                const novoRegistro = {
                    id: novoId,
                    dataRepasse: hoje,
                    usuarioOperacoes: usuarioOperacoes,
                    produto: registro.produto,
                    familia: registro.familia,
                    motivo: registro.motivo,
                    dataRecebimento: registro.dataRecebimento,
                    'tempo(dias)': novoTempo,
                    observacao: registro.observacao,
                    quantidadeSolicitada: null,
                    quantidadeRepassada: null,
                    vendedor: null,
                    status: 'Pendente'
                };
                
                // Adicionar ao backend
                const response = await fetch(`${apiUrl}/registros`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(novoRegistro)
                });
                
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Falha ao salvar registro na planilha: ${response.status} - ${errorText}`);
                }
                
                const responseData = await response.json();
                console.log('Registro repetido com sucesso:', responseData);
                
                // Atualizar último ID no localStorage
                localStorage.setItem('lastId', parseInt(novoId.split('.')[1]));
            }
            
            // Fechar modal
            document.getElementById('repetir-registros-modal').style.display = 'none';
            
            // Atualizar dados
            const data = await fetchRegistrosCompletos();
            if (data) {
                registrosCompletos = data;
                relatoriosFilteredData = [...registrosCompletos];
            }
            renderResumosTable(registrosCompletos);
            updateDashboard(registrosCompletos);
            
            alert(`${registrosParaRepetir.length} registro(s) repetido(s) com sucesso!`);
            
        } catch (error) {
            console.error('Erro ao repetir registros:', error);
            alert(`Erro ao repetir registros: ${error.message}`);
        }
    }

    // Adicionar event listeners para os botões de repetir registros
    document.getElementById('repetir-registros-btn')?.addEventListener('click', abrirModalRepetirRegistros);
    document.getElementById('confirmar-repetir')?.addEventListener('click', repetirRegistrosSelecionados);
});