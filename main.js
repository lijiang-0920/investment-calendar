// 主脚本文件
document.addEventListener('DOMContentLoaded', function() {
    // 导航切换
    const navLinks = document.querySelectorAll('nav a');
    const sections = document.querySelectorAll('main section');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // 移除所有活动类
            navLinks.forEach(l => l.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));
            
            // 添加活动类到当前项
            this.classList.add('active');
            const targetSection = this.getAttribute('data-section');
            document.getElementById(targetSection).classList.add('active');
        });
    });
    
    // 加载数据摘要
    loadSummaryData();
    
    // 加载最新事件
    loadLatestEvents();
    
    // 加载日历数据
    initCalendar();
    
    // 加载平台统计
    loadPlatformStats();
});

// 加载数据摘要
function loadSummaryData() {
    fetch('data/summary.json')
        .then(response => response.json())
        .then(data => {
            // 更新最后更新时间
            const updateTime = new Date(data.collection_time);
            document.getElementById('lastUpdate').textContent = `数据更新时间: ${updateTime.toLocaleString()}`;
            
            // 更新统计数字
            document.getElementById('totalEvents').textContent = data.total_events.toLocaleString();
            document.getElementById('newEvents').textContent = data.new_events?.total || 0;
            document.getElementById('platformCount').textContent = Object.keys(data.platforms).length;
            
            // 更新日期范围
            const dateRangeElement = document.getElementById('dateRange');
            dateRangeElement.innerHTML = `
                <div class="date-range-item">
                    <span class="date-range-label">开始日期:</span>
                    <span class="date-range-value">${data.date_range.start || '未知'}</span>
                </div>
                <div class="date-range-item">
                    <span class="date-range-label">结束日期:</span>
                    <span class="date-range-value">${data.date_range.end || '未知'}</span>
                </div>
            `;
            
            // 更新平台统计
            const platformStatsElement = document.getElementById('platformStats');
            let platformHtml = '';
            
            // 计算最大事件数，用于进度条
            const maxEvents = Math.max(...Object.values(data.platforms).map(p => p.event_count));
            
            for (const [platform, info] of Object.entries(data.platforms)) {
                const percentage = (info.event_count / maxEvents) * 100;
                platformHtml += `
                    <div class="platform-item">
                        <span class="platform-name">${info.name || platform}</span>
                        <div class="platform-bar-container">
                            <div class="platform-bar" style="width: ${percentage}%"></div>
                        </div>
                        <span class="platform-count">${info.event_count}</span>
                    </div>
                `;
            }
            
            platformStatsElement.innerHTML = platformHtml;
        })
        .catch(error => {
            console.error('加载数据摘要失败:', error);
            document.getElementById('lastUpdate').textContent = '数据加载失败';
        });
    
    // 加载变更报告
    fetch('data/change_report.json')
        .then(response => response.json())
        .then(data => {
            const changeReportElement = document.getElementById('changeReport');
            const summary = data.summary;
            
            let reportHtml = `
                <div class="change-item new">
                    <div class="change-count">新增事件: ${summary.total_new}</div>
                    <div class="change-examples">
                        ${data.top_new_events.slice(0, 3).map(e => `${e.title.substring(0, 30)}...`).join('<br>')}
                    </div>
                </div>
                <div class="change-item updated">
                    <div class="change-count">更新事件: ${summary.total_updated}</div>
                </div>
                <div class="change-item cancelled">
                    <div class="change-count">取消事件: ${summary.total_cancelled}</div>
                </div>
            `;
            
            changeReportElement.innerHTML = reportHtml;
        })
        .catch(error => {
            console.error('加载变更报告失败:', error);
            document.getElementById('changeReport').innerHTML = '<div class="error">加载变更报告失败</div>';
        });
}

// 加载平台统计
function loadPlatformStats() {
    fetch('data/platform_stats.json')
        .then(response => response.json())
        .then(data => {
            // 更新重要性分布
            const importanceStatsElement = document.getElementById('importanceStats');
            let importanceHtml = '';
            
            // 合并所有平台的重要性数据
            const importanceCounts = {};
            for (const platform of Object.values(data)) {
                for (const [importance, count] of Object.entries(platform.importance)) {
                    if (!importanceCounts[importance]) {
                        importanceCounts[importance] = 0;
                    }
                    importanceCounts[importance] += count;
                }
            }
            
            // 计算最大值用于进度条
            const maxImportance = Math.max(...Object.values(importanceCounts));
            
            // 按重要性从高到低排序
            const sortedImportance = Object.entries(importanceCounts)
                .filter(([imp, _]) => imp > 0) // 过滤掉0和undefined
                .sort((a, b) => b[0] - a[0]);
            
            for (const [importance, count] of sortedImportance) {
                const percentage = (count / maxImportance) * 100;
                const stars = '★'.repeat(importance);
                
                importanceHtml += `
                    <div class="importance-item">
                        <span class="importance-stars">${stars}</span>
                        <div class="importance-bar-container">
                            <div class="importance-bar" style="width: ${percentage}%"></div>
                        </div>
                        <span class="importance-count">${count}</span>
                    </div>
                `;
            }
            
            importanceStatsElement.innerHTML = importanceHtml;
            
            // 更新今日事件计数
            fetch('data/latest_events.json')
                .then(response => response.json())
                .then(eventData => {
                    document.getElementById('todayEvents').textContent = eventData.today_events.length;
                })
                .catch(error => {
                    console.error('加载今日事件数据失败:', error);
                });
        })
        .catch(error => {
            console.error('加载平台统计失败:', error);
            document.getElementById('importanceStats').innerHTML = '<div class="error">加载统计数据失败</div>';
        });
}

// 加载最新事件
function loadLatestEvents() {
    fetch('data/latest_events.json')
        .then(response => response.json())
        .then(data => {
            // 填充新增事件列表
            renderEventsList(data.new_events, 'newEventsList');
            
            // 填充今日事件列表
            renderEventsList(data.today_events, 'todayEventsList');
            
            // 填充类别过滤器选项
            const categories = new Set();
            [...data.new_events, ...data.today_events].forEach(event => {
                if (event.category) {
                    categories.add(event.category);
                }
            });
            
            const categoryFilter = document.getElementById('categoryFilter');
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                categoryFilter.appendChild(option);
            });
            
            // 设置过滤器事件监听
            setupFilters();
        })
        .catch(error => {
            console.error('加载最新事件失败:', error);
            document.getElementById('newEventsList').innerHTML = '<div class="error">加载新增事件失败</div>';
            document.getElementById('todayEventsList').innerHTML = '<div class="error">加载今日事件失败</div>';
        });
}

// 渲染事件列表
function renderEventsList(events, containerId) {
    const container = document.getElementById(containerId);
    
    if (!events || events.length === 0) {
        container.innerHTML = '<div class="no-data">暂无数据</div>';
        return;
    }
    
    let html = '';
    
    events.forEach(event => {
        const platformName = getPlatformName(event.platform);
        const importanceStars = '★'.repeat(event.importance || 0);
        
        html += `
            <div class="event-card ${event.is_new ? 'new' : ''}" data-platform="${event.platform}" data-importance="${event.importance || 0}" data-category="${event.category || ''}">
                <div class="event-header">
                    <span class="event-platform">${platformName}</span>
                    <span class="event-date">${event.event_date} ${event.event_time || ''}</span>
                </div>
                <div class="event-title">${event.title}</div>
                ${event.content ? `<div class="event-content">${event.content}</div>` : ''}
                <div class="event-footer">
                    <span class="event-importance">${importanceStars}</span>
                    ${event.category ? `<span class="event-category">${event.category}</span>` : ''}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// 设置过滤器
function setupFilters() {
    // 新增事件过滤器
    const platformFilter = document.getElementById('platformFilter');
    const importanceFilter = document.getElementById('importanceFilter');
    const categoryFilter = document.getElementById('categoryFilter');
    
    const filterEvents = () => {
        const platform = platformFilter.value;
        const importance = importanceFilter.value;
        const category = categoryFilter.value;
        
        const eventCards = document.querySelectorAll('#newEventsList .event-card');
        
        eventCards.forEach(card => {
            let show = true;
            
            if (platform !== 'all' && card.getAttribute('data-platform') !== platform) {
                show = false;
            }
            
            if (importance !== 'all' && parseInt(card.getAttribute('data-importance')) !== parseInt(importance)) {
                show = false;
            }
            
            if (category !== 'all' && card.getAttribute('data-category') !== category) {
                show = false;
            }
            
            card.style.display = show ? 'block' : 'none';
        });
    };
    
    platformFilter.addEventListener('change', filterEvents);
    importanceFilter.addEventListener('change', filterEvents);
    categoryFilter.addEventListener('change', filterEvents);
    
    // 今日事件过滤器
    const todayPlatformFilter = document.getElementById('todayPlatformFilter');
    const todayImportanceFilter = document.getElementById('todayImportanceFilter');
    
    const filterTodayEvents = () => {
        const platform = todayPlatformFilter.value;
        const importance = todayImportanceFilter.value;
        
        const eventCards = document.querySelectorAll('#todayEventsList .event-card');
        
        eventCards.forEach(card => {
            let show = true;
            
            if (platform !== 'all' && card.getAttribute('data-platform') !== platform) {
                show = false;
            }
            
            if (importance !== 'all' && parseInt(card.getAttribute('data-importance')) !== parseInt(importance)) {
                show = false;
            }
            
            card.style.display = show ? 'block' : 'none';
        });
    };
    
    todayPlatformFilter.addEventListener('change', filterTodayEvents);
    todayImportanceFilter.addEventListener('change', filterTodayEvents);
}

// 获取平台中文名称
function getPlatformName(platform) {
    const platformNames = {
        'cls': '财联社',
        'jiuyangongshe': '韭研公社',
        'tonghuashun': '同花顺',
        'investing': '英为财情',
        'eastmoney': '东方财富'
    };
    
    return platformNames[platform] || platform;
}

            
