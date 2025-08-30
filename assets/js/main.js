// 主应用程序
class InvestmentCalendarApp {
    constructor() {
        this.allData = {};
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
            // 显示加载状态
            this.showLoading();
            
            // 加载数据
            await this.loadData();
            
            // 初始化组件
            this.initComponents();
            
            // 绑定事件
            this.bindEvents();
            
            // 初始渲染
            this.render();
            
            console.log('应用初始化完成');
        } catch (error) {
            console.error('应用初始化失败:', error);
            this.showError('数据加载失败，请稍后重试');
        }
    }

    async loadData() {
        try {
            // 并行加载数据
            const [allData, metadata, changeReport] = await Promise.all([
                window.dataLoader.loadAllPlatformData(),
                window.dataLoader.loadMetadata(),
                window.dataLoader.loadChangeReport()
            ]);

            this.allData = allData;
            this.metadata = metadata;
            this.changeReport = changeReport;

            console.log('数据加载完成:', {
                platforms: Object.keys(allData).length,
                totalEvents: Object.values(allData).reduce((sum, data) => sum + (data.total_events || 0), 0)
            });

        } catch (error) {
            console.error('数据加载失败:', error);
            throw error;
        }
    }

    initComponents() {
        // 初始化日历
        this.calendar = new Calendar('calendar-grid');
        this.calendar.setEvents(this.allData);
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

        // 筛选器
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
        }
    }

    render() {
        this.updateOverviewCards();
        this.updateLastUpdateTime();
        this.populateFilters();
        this.renderTodayEvents();
    }

    updateOverviewCards() {
        // 今日事件数量
        const todayEvents = window.dataLoader.getTodayEvents(this.allData);
        document.getElementById('today-events-count').textContent = todayEvents.length;

        // 新增事件数量
        const newEvents = window.dataLoader.getNewEvents(this.allData);
        document.getElementById('new-events-count').textContent = newEvents.length;

        // 重要事件数量
        const importantEvents = window.dataLoader.getImportantEvents(this.allData, 4);
        document.getElementById('important-events-count').textContent = importantEvents.length;

        // 活跃平台数量
        const activePlatforms = Object.keys(this.allData).filter(platform => 
            this.allData[platform].events && this.allData[platform].events.length > 0
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
        // 填充类别筛选器
        const categoryFilter = document.getElementById('category-filter');
        if (categoryFilter) {
            const categories = window.dataLoader.getAllCategories(this.allData);
            
            // 清空现有选项（保留"全部类别"）
            while (categoryFilter.children.length > 1) {
                categoryFilter.removeChild(categoryFilter.lastChild);
            }
            
            // 添加类别选项
            categories.forEach(category => {
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

        const todayEvents = window.dataLoader.getTodayEvents(this.allData);
        this.filteredEvents = todayEvents;
        
        this.applyFilters();
    }

    applyFilters() {
        let events = [...this.filteredEvents];

        // 应用平台筛选
        if (this.filters.platform) {
            events = events.filter(event => event.platform === this.filters.platform);
        }

        // 应用重要性筛选
        if (this.filters.importance) {
            const minImportance = parseInt(this.filters.importance);
            events = events.filter(event => (event.importance || 0) >= minImportance);
        }

        // 应用类别筛选
        if (this.filters.category) {
            events = events.filter(event => event.category === this.filters.category);
        }

        // 应用搜索筛选
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

    renderEventsList(events, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (events.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-times"></i>
                    <h3>暂无事件</h3>
                    <p>当前筛选条件下没有找到事件</p>
                </div>
            `;
            return;
        }

        container.innerHTML = events.map(event => this.createEventCard(event)).join('');

        // 绑定事件卡片点击事件
        container.querySelectorAll('.event-card').forEach((card, index) => {
            card.addEventListener('click', () => {
                this.eventModal.show(events[index]);
            });
        });
    }

    createEventCard(event) {
        const platformName = window.dataLoader.getPlatformDisplayName(event.platform);
        const stars = window.dataLoader.generateStars(event.importance);
        const newBadge = event.is_new ? 'new' : '';
        const importantBadge = (event.importance || 0) >= 4 ? 'important' : '';
        
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
        
        if (tags.length > 0) {
            tagsHtml = `
                <div class="event-tags">
                    ${tags.map(tag => `<span class="tag">${this.escapeHtml(tag)}</span>`).join('')}
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
            <div class="event-card ${newBadge} ${importantBadge}">
                <div class="event-header">
                    <div class="event-meta">
                        ${event.is_new ? '<span class="new-badge">🆕</span>' : ''}
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

    showDateEvents(date, events) {
        // 可以在这里实现日期选择后的事件展示
        console.log(`选择日期: ${date}, 事件数量: ${events.length}`);
        
        // 如果需要，可以切换到今日事件页面并显示该日期的事件
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
                container.innerHTML = `
                    <div class="loading">
                        <i class="fas fa-spinner fa-spin"></i>
                        <span>加载中...</span>
                    </div>
                `;
            }
        });
    }

    showError(message) {
        const containers = ['today-events'];
        containers.forEach(containerId => {
            const container = document.getElementById(containerId);
            if (container) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h3>加载失败</h3>
                        <p>${this.escapeHtml(message)}</p>
                        <button class="btn btn-primary" onclick="location.reload()">重新加载</button>
                    </div>
                `;
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

// 事件详情模态框
class EventModal {
    constructor() {
        this.modal = document.getElementById('event-modal');
        this.modalTitle = document.getElementById('modal-title');
        this.modalBody = document.getElementById('modal-body');
        
        this.bindEvents();
    }

    bindEvents() {
        // 关闭按钮
        this.modal?.querySelector('.close')?.addEventListener('click', () => {
            this.hide();
        });

        // 点击背景关闭
        this.modal?.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hide();
            }
        });

        // ESC键关闭
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
        
        let detailsHtml = `
            <div class="modal-event-header">
                <div class="modal-event-meta">
                    <span class="platform-badge ${event.platform}">${platformName}</span>
                    <span class="event-date">${event.event_date}</span>
                    ${event.event_time ? `<span class="event-time">${event.event_time}</span>` : ''}
                    ${event.is_new ? '<span class="new-badge">🆕 新增</span>' : ''}
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

        // 原始数据（调试用）
        if (event.raw_data && Object.keys(event.raw_data).length > 0) {
            detailsHtml += `
                <div class="modal-section">
                    <details>
                        <summary>原始数据</summary>
                        <pre class="raw-data">${JSON.stringify(event.raw_data, null, 2)}</pre>
                    </details>
                </div>
            `;
        }

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
