// 主应用程序 - 完整版
class InvestmentCalendarApp {
    constructor() {
        this.allData = {};
        this.currentData = {};
        this.filteredEvents = [];
        this.currentSection = 'today';
        this.filters = {
            platform: '',
            importance: '',
            category: '',
            search: ''
        };
        
        this.init();
    }

    async init() {
        try {
            this.showLoading();
            
            // 加载当前数据
            await this.loadCurrentData();
            
            this.initComponents();
            this.bindEvents();
            this.render();
            
            console.log('应用初始化完成');
        } catch (error) {
            console.error('应用初始化失败:', error);
            this.showError('数据加载失败，请稍后重试');
        }
    }

    async loadCurrentData() {
        try {
            const [currentData, metadata, changeReport] = await Promise.all([
                window.dataLoader.loadAllCurrentData(),
                window.dataLoader.loadMetadata(),
                window.dataLoader.loadChangeReport()
            ]);

            this.currentData = currentData;
            this.metadata = metadata;
            this.changeReport = changeReport;

            console.log('当前数据加载完成:', {
                platforms: Object.keys(currentData).length,
                totalEvents: Object.values(currentData).reduce((sum, data) => sum + (data.total_events || 0), 0)
            });

        } catch (error) {
            console.error('当前数据加载失败:', error);
            throw error;
        }
    }

    initComponents() {
        // 初始化日历
        this.calendar = new Calendar('calendar-grid');
        this.calendar.setEvents(this.currentData);
        this.calendar.onDateSelect = (date, events) => {
            this.showDateEvents(date, events);
        };

        // 初始化模态框
        this.eventModal = new EventModal();
        window.eventModal = this.eventModal;

        // 初始化主题切换
        this.initTheme();
    }

    bindEvents() {
        // 导航切换
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.dataset.section;
                this.switchSection(section);
            });
        });

        // 今日事件筛选器
        document.getElementById('platform-filter')?.addEventListener('change', (e) => {
            this.filters.platform = e.target.value;
            this.applyFilters();
        });

        document.getElementById('importance-filter')?.addEventListener('change', (e) => {
            this.filters.importance = e.target.value;
            this.applyFilters();
        });

        document.getElementById('category-filter')?.addEventListener('change', (e) => {
            this.filters.category = e.target.value;
            this.applyFilters();
        });

        document.getElementById('search-input')?.addEventListener('input', (e) => {
            this.filters.search = e.target.value;
            this.debounce(() => this.applyFilters(), 300)();
        });

        // 历史数据功能
        document.getElementById('load-history-btn')?.addEventListener('click', () => {
            this.loadHistoryData();
        });

        // 全局搜索功能
        document.getElementById('global-search-btn')?.addEventListener('click', () => {
            this.performGlobalSearch();
        });

        document.getElementById('global-search-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.performGlobalSearch();
            }
        });

        // 主题切换
        document.getElementById('theme-toggle')?.addEventListener('click', () => {
            this.toggleTheme();
        });
    }

    switchSection(sectionName) {
        // 更新导航
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-section="${sectionName}"]`)?.classList.add('active');

        // 切换内容
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(sectionName)?.classList.add('active');

        this.currentSection = sectionName;

        // 渲染对应内容
        if (sectionName === 'today') {
            this.renderTodayEvents();
        } else if (sectionName === 'calendar') {
            this.calendar.render();
        } else if (sectionName === 'history') {
            this.initHistoryPage();
        } else if (sectionName === 'search') {
            this.initSearchPage();
        }
    }

    // 历史数据功能
    async initHistoryPage() {
        const historyStatsEl = document.getElementById('history-stats');
        if (historyStatsEl) {
            historyStatsEl.style.display = 'none';
        }
        
        // 设置默认日期为昨天
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const historyDateInput = document.getElementById('history-date');
        if (historyDateInput) {
            historyDateInput.value = yesterday.toISOString().split('T')[0];
        }
    }

    async loadHistoryData() {
        const historyDate = document.getElementById('history-date')?.value;
        const historyMonth = document.getElementById('history-month')?.value;
        const platform = document.getElementById('history-platform-filter')?.value;
        
        const container = document.getElementById('history-events');
        const statsContainer = document.getElementById('history-stats');
        
        if (!historyDate && !historyMonth) {
            this.showMessage(container, '请选择查询日期或月份', 'warning');
            return;
        }

        try {
            this.showLoadingSpinner(container);
            
            let events = [];
            let dateRange = '';
            
            if (historyDate) {
                // 查询指定日期
                events = await window.dataLoader.getEventsByDate(historyDate);
                dateRange = historyDate;
            } else if (historyMonth) {
                // 查询指定月份
                const [year, month] = historyMonth.split('-').map(Number);
                const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
                const endDate = new Date(year, month, 0).toISOString().split('T')[0];
                events = await window.dataLoader.getEventsByDateRange(startDate, endDate);
                dateRange = `${year}年${month}月`;
            }

            // 应用平台筛选
            if (platform) {
                events = events.filter(event => event.platform === platform);
            }

            // 更新统计信息
            this.updateHistoryStats(events, dateRange, statsContainer);
            
            // 显示事件列表
            this.renderEventsList(events, 'history-events', true);
            
            console.log(`历史数据查询完成: ${events.length} 个事件`);
            
        } catch (error) {
            console.error('历史数据加载失败:', error);
            this.showMessage(container, '历史数据加载失败，请稍后重试', 'error');
        }
    }

    updateHistoryStats(events, dateRange, statsContainer) {
        if (!statsContainer) return;
        
        const platforms = new Set(events.map(event => event.platform));
        
        document.getElementById('history-total-events').textContent = events.length;
        document.getElementById('history-date-range').textContent = dateRange;
        document.getElementById('history-platforms-count').textContent = platforms.size;
        
        statsContainer.style.display = 'block';
    }

    // 全局搜索功能
    initSearchPage() {
        const searchInput = document.getElementById('global-search-input');
        if (searchInput) {
            searchInput.focus();
        }
    }

    async performGlobalSearch() {
        const query = document.getElementById('global-search-input')?.value?.trim();
        const includeHistorical = document.getElementById('include-historical')?.checked;
        const platform = document.getElementById('search-platform-filter')?.value;
        const importance = document.getElementById('search-importance-filter')?.value;
        const startDate = document.getElementById('search-start-date')?.value;
        const endDate = document.getElementById('search-end-date')?.value;
        
        const container = document.getElementById('search-results');
        
        if (!query || query.length < 2) {
            this.showMessage(container, '请输入至少2个字符进行搜索', 'warning');
            return;
        }

        try {
            this.showLoadingSpinner(container);
            
            console.log(`开始搜索: "${query}", 包含历史数据: ${includeHistorical}`);
            
            let events = await window.dataLoader.searchEvents(query, includeHistorical);
            
            // 应用额外筛选
            if (platform) {
                events = events.filter(event => event.platform === platform);
            }
            
            if (importance) {
                const minImportance = parseInt(importance);
                events = events.filter(event => (event.importance || 0) >= minImportance);
            }
            
            if (startDate && endDate) {
                events = events.filter(event => 
                    event.event_date >= startDate && event.event_date <= endDate
                );
            } else if (startDate) {
                events = events.filter(event => event.event_date >= startDate);
            } else if (endDate) {
                events = events.filter(event => event.event_date <= endDate);
            }
            
            this.renderEventsList(events, 'search-results', includeHistorical);
            
            console.log(`搜索完成: 找到 ${events.length} 个匹配事件`);
            
        } catch (error) {
            console.error('搜索失败:', error);
            this.showMessage(container, '搜索失败，请稍后重试', 'error');
        }
    }

    // 渲染事件列表 - 支持历史数据标记
    renderEventsList(events, containerId, isHistorical = false) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (events.length === 0) {
            this.showMessage(container, '没有找到匹配的事件', 'empty');
            return;
        }

        container.innerHTML = events.map(event => this.createEventCard(event, isHistorical)).join('');

        // 绑定事件卡片点击事件
        container.querySelectorAll('.event-card').forEach((card, index) => {
            card.addEventListener('click', () => {
                this.eventModal.show(events[index]);
            });
        });
    }

    // 创建事件卡片 - 支持历史数据标记
    createEventCard(event, isHistorical = false) {
        const platformName = window.dataLoader.getPlatformDisplayName(event.platform);
        const stars = window.dataLoader.generateStars(event.importance);
        const newBadge = event.is_new ? 'new' : '';
        const importantBadge = (event.importance || 0) >= 4 ? 'important' : '';
        const historicalBadge = isHistorical ? 'historical' : '';
        
        // 判断是否为历史数据
        const today = new Date().toISOString().split('T')[0];
        const isOldEvent = event.event_date < today;
        
        // 构建内容
        let contentHtml = '';
        if (event.content && event.content.length <= 200) {
            contentHtml = `<div class="event-content">${this.escapeHtml(event.content)}</div>`;
        }

        // 构建标签
        let tagsHtml = '';
        const tags = [];
        if (event.category) tags.push(event.category);
        if (event.country) tags.push(event.country);
        if (event.city) tags.push(event.city);
        if (isOldEvent) tags.push('历史数据');
        
        if (tags.length > 0) {
            tagsHtml = `
                <div class="event-tags">
                    ${tags.map(tag => `<span class="tag ${tag === '历史数据' ? 'historical-tag' : ''}">${this.escapeHtml(tag)}</span>`).join('')}
                </div>
            `;
        }

        // 构建底部信息
        let footerHtml = '';
        const footerItems = [];
        
        if (event.stocks && event.stocks.length > 0) {
            const stocksDisplay = event.stocks.slice(0, 3).join(', ');
            const moreStocks = event.stocks.length > 3 ? ` 等${event.stocks.length}只` : '';
            footerItems.push(`相关股票: ${stocksDisplay}${moreStocks}`);
        }
        
        if (event.themes && event.themes.length > 0) {
            const themesDisplay = event.themes.slice(0, 2).join(', ');
            const moreThemes = event.themes.length > 2 ? ` 等${event.themes.length}个` : '';
            footerItems.push(`相关主题: ${themesDisplay}${moreThemes}`);
        }

        if (footerItems.length > 0) {
            footerHtml = `
                <div class="event-footer">
                    <div class="event-meta-info">
                        ${footerItems.map(item => `<span>${this.escapeHtml(item)}</span>`).join('<br>')}
                    </div>
                </div>
            `;
        }

        return `
            <div class="event-card ${newBadge} ${importantBadge} ${historicalBadge}">
                <div class="event-header">
                    <div class="event-meta">
                        ${event.is_new ? '<span class="new-badge">🆕</span>' : ''}
                        ${isOldEvent ? '<span class="historical-badge">📚</span>' : ''}
                        <span class="platform-badge ${event.platform}">${platformName}</span>
                        <span class="event-date">${event.event_date}</span>
                        ${event.event_time ? `<span class="event-time">${event.event_time}</span>` : ''}
                    </div>
                    <div class="importance-stars">${stars}</div>
                </div>
                <h3 class="event-title">${this.escapeHtml(event.title || '未知事件')}</h3>
                ${contentHtml}
                ${tagsHtml}
                ${footerHtml}
            </div>
        `;
    }

    // 工具方法
    showLoadingSpinner(container) {
        if (!container) return;
        container.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <span>加载中...</span>
            </div>
        `;
    }

    showMessage(container, message, type = 'info') {
        if (!container) return;
        
        const icons = {
            'info': 'fas fa-info-circle',
            'warning': 'fas fa-exclamation-triangle',
            'error': 'fas fa-times-circle',
            'empty': 'fas fa-inbox'
        };
        
        const icon = icons[type] || icons.info;
        
        container.innerHTML = `
            <div class="empty-state ${type}">
                <i class="${icon}"></i>
                <h3>${message}</h3>
            </div>
        `;
    }

    // 其他现有方法保持不变...
    render() {
        this.updateOverviewCards();
        this.updateLastUpdateTime();
        this.populateFilters();
        this.renderTodayEvents();
    }

    updateOverviewCards() {
        const todayEvents = window.dataLoader.getTodayEvents(this.currentData);
        document.getElementById('today-events-count').textContent = todayEvents.length;

        const newEvents = window.dataLoader.getNewEvents ? window.dataLoader.getNewEvents(this.currentData) : [];
        document.getElementById('new-events-count').textContent = newEvents.length;

        const importantEvents = todayEvents.filter(event => (event.importance || 0) >= 4);
        document.getElementById('important-events-count').textContent = importantEvents.length;

        const activePlatforms = Object.keys(this.currentData).filter(platform => 
            this.currentData[platform].events && this.currentData[platform].events.length > 0
        );
        document.getElementById('active-platforms-count').textContent = activePlatforms.length;
    }

    updateLastUpdateTime() {
        const lastUpdateElement = document.getElementById('last-update-time');
        if (lastUpdateElement && this.metadata) {
            const updateTime = new Date(this.metadata.last_updated || Date.now());
            lastUpdateElement.textContent = `更新时间: ${updateTime.toLocaleString('zh-CN')}`;
        }
    }

    populateFilters() {
        const categoryFilter = document.getElementById('category-filter');
        if (categoryFilter && this.currentData) {
            const categories = new Set();
            
            for (const [platform, data] of Object.entries(this.currentData)) {
                if (data.events) {
                    data.events.forEach(event => {
                        if (event.category) {
                            categories.add(event.category);
                        }
                    });
                }
            }
            
            while (categoryFilter.children.length > 1) {
                categoryFilter.removeChild(categoryFilter.lastChild);
            }
            
            Array.from(categories).sort().forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                categoryFilter.appendChild(option);
            });
        }
    }

    renderTodayEvents() {
        const container = document.getElementById('today-events');
        if (!container) return;

        const todayEvents = window.dataLoader.getTodayEvents(this.currentData);
        this.filteredEvents = todayEvents;
        
        this.applyFilters();
    }

    applyFilters() {
        let events = [...this.filteredEvents];

        if (this.filters.platform) {
            events = events.filter(event => event.platform === this.filters.platform);
        }

        if (this.filters.importance) {
            const minImportance = parseInt(this.filters.importance);
            events = events.filter(event => (event.importance || 0) >= minImportance);
        }

        if (this.filters.category) {
            events = events.filter(event => event.category === this.filters.category);
        }

        if (this.filters.search) {
            const searchQuery = this.filters.search.toLowerCase();
            events = events.filter(event => {
                return (
                    event.title?.toLowerCase().includes(searchQuery) ||
                    event.content?.toLowerCase().includes(searchQuery) ||
                    event.category?.toLowerCase().includes(searchQuery) ||
                    event.country?.toLowerCase().includes(searchQuery)
                );
            });
        }

        this.renderEventsList(events, 'today-events');
    }

    showDateEvents(date, events) {
        console.log(`选择日期: ${date}, 事件数量: ${events.length}`);
        
        if (events.length > 0) {
            this.switchSection('today');
            this.filteredEvents = events;
            this.renderEventsList(events, 'today-events');
        }
    }

    showLoading() {
        const containers = ['today-events'];
        containers.forEach(containerId => {
            const container = document.getElementById(containerId);
            if (container) {
                this.showLoadingSpinner(container);
            }
        });
    }

    showError(message) {
        const containers = ['today-events'];
        containers.forEach(containerId => {
            const container = document.getElementById(containerId);
            if (container) {
                this.showMessage(container, message, 'error');
            }
        });
    }

    initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        
        const themeIcon = document.getElementById('theme-toggle');
        if (themeIcon) {
            themeIcon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        
        const themeIcon = document.getElementById('theme-toggle');
        if (themeIcon) {
            themeIcon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, (m) => map[m]);
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// 事件详情模态框 - 增强版
class EventModal {
    constructor() {
        this.modal = document.getElementById('event-modal');
        this.modalTitle = document.getElementById('modal-title');
        this.modalBody = document.getElementById('modal-body');
        
        this.bindEvents();
    }

    bindEvents() {
        this.modal?.querySelector('.close')?.addEventListener('click', () => {
            this.hide();
        });

        this.modal?.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hide();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal?.style.display === 'block') {
                this.hide();
            }
        });
    }

    show(event) {
        if (!this.modal || !event) return;

        this.modalTitle.textContent = event.title || '事件详情';
        this.modalBody.innerHTML = this.createEventDetails(event);
        this.modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    hide() {
        if (!this.modal) return;
        
        this.modal.style.display = 'none';
        document.body.style.overflow = '';
    }

    createEventDetails(event) {
        const platformName = window.dataLoader.getPlatformDisplayName(event.platform);
        const stars = window.dataLoader.generateStars(event.importance);
        
        // 判断是否为历史数据
        const today = new Date().toISOString().split('T')[0];
        const isHistorical = event.event_date < today;
        
        let detailsHtml = `
            <div class="modal-event-header">
                <div class="modal-event-meta">
                    <span class="platform-badge ${event.platform}">${platformName}</span>
                    <span class="event-date">${event.event_date}</span>
                    ${event.event_time ? `<span class="event-time">${event.event_time}</span>` : ''}
                    ${event.is_new ? '<span class="new-badge">🆕 新增</span>' : ''}
                    ${isHistorical ? '<span class="historical-badge">📚 历史数据</span>' : ''}
                </div>
                <div class="importance-stars">${stars}</div>
            </div>
        `;

        if (event.content) {
            detailsHtml += `
                <div class="modal-section">
                    <h4><i class="fas fa-info-circle"></i> 详细信息</h4>
                    <p>${this.escapeHtml(event.content)}</p>
                </div>
            `;
        }

        // 基本信息
        const basicInfo = [];
        if (event.category) basicInfo.push(['类别', event.category]);
        if (event.country) basicInfo.push(['国家', event.country]);
        if (event.city) basicInfo.push(['城市', event.city]);
        if (event.discovery_date && event.is_new) basicInfo.push(['发现日期', event.discovery_date]);
        if (event.data_status) basicInfo.push(['数据状态', event.data_status]);

        if (basicInfo.length > 0) {
            detailsHtml += `
                <div class="modal-section">
                    <h4><i class="fas fa-tags"></i> 基本信息</h4>
                    <div class="info-grid">
                        ${basicInfo.map(([label, value]) => `
                            <div class="info-item">
                                <span class="info-label">${label}:</span>
                                <span class="info-value">${this.escapeHtml(value)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        // 相关股票
        if (event.stocks && event.stocks.length > 0) {
            detailsHtml += `
                <div class="modal-section">
                    <h4><i class="fas fa-chart-line"></i> 相关股票</h4>
                    <div class="stocks-list">
                        ${event.stocks.map(stock => `
                            <span class="stock-code">${this.escapeHtml(stock)}</span>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        // 相关主题
        if (event.themes && event.themes.length > 0) {
            detailsHtml += `
                <div class="modal-section">
                    <h4><i class="fas fa-lightbulb"></i> 相关主题</h4>
                    <div class="themes-list">
                        ${event.themes.map(theme => `
                            <span class="tag">${this.escapeHtml(theme)}</span>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        // 相关概念
        if (event.concepts && event.concepts.length > 0) {
            detailsHtml += `
                <div class="modal-section">
                    <h4><i class="fas fa-project-diagram"></i> 相关概念</h4>
                    <div class="concepts-list">
                        ${event.concepts.map(concept => `
                            <span class="tag">${this.escapeHtml(concept.name || concept)}</span>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        // 数据来源信息
        detailsHtml += `
            <div class="modal-section">
                <h4><i class="fas fa-database"></i> 数据信息</h4>
                <div class="info-grid">
                    <div class="info-item">
                        <span class="info-label">事件ID:</span>
                        <span class="info-value">${this.escapeHtml(event.id || '未知')}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">数据源:</span>
                        <span class="info-value">${platformName}</span>
                    </div>
                    ${isHistorical ? `
                        <div class="info-item">
                            <span class="info-label">数据类型:</span>
                            <span class="info-value">历史数据</span>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        return detailsHtml;
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, (m) => map[m]);
    }
}

// 应用启动
document.addEventListener('DOMContentLoaded', () => {
    window.app = new InvestmentCalendarApp();
});
