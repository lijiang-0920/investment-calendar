// 查询功能脚本
// 存储全局数据
let globalEventData = {
    newEvents: [],
    todayEvents: []
};

// 加载事件详情
function loadEventDetails(eventId) {
    // 查找事件
    const event = [...globalEventData.newEvents, ...globalEventData.todayEvents].find(e => e.event_id === eventId);
    
    if (!event) {
        console.error('找不到事件:', eventId);
        return;
    }
    
    // 创建模态框
    const modal = document.createElement('div');
    modal.className = 'event-modal';
    
    const platformName = getPlatformName(event.platform);
    const importanceStars = '★'.repeat(event.importance || 0);
    
    // 构建股票和概念信息
    let stocksHtml = '';
    if (event.stocks && event.stocks.length > 0) {
        stocksHtml = `
            <div class="event-detail-item">
                <span class="event-detail-label">相关股票:</span>
                <span class="event-detail-value">${event.stocks.join(', ')}</span>
            </div>
        `;
    }
    
    let conceptsHtml = '';
    if (event.concepts && event.concepts.length > 0) {
        const conceptNames = event.concepts.map(c => c.name).join(', ');
        conceptsHtml = `
            <div class="event-detail-item">
                <span class="event-detail-label">相关概念:</span>
                <span class="event-detail-value">${conceptNames}</span>
            </div>
        `;
    }
    
    let themesHtml = '';
    if (event.themes && event.themes.length > 0) {
        themesHtml = `
            <div class="event-detail-item">
                <span class="event-detail-label">相关主题:</span>
                <span class="event-detail-value">${event.themes.join(', ')}</span>
            </div>
        `;
    }
    
    modal.innerHTML = `
        <div class="event-modal-content">
            <span class="event-modal-close">&times;</span>
            <h3 class="event-modal-title">${event.title}</h3>
            
            <div class="event-modal-info">
                <div class="event-detail-item">
                    <span class="event-detail-label">平台:</span>
                    <span class="event-detail-value">${platformName}</span>
                </div>
                <div class="event-detail-item">
                    <span class="event-detail-label">日期:</span>
                    <span class="event-detail-value">${event.event_date} ${event.event_time || ''}</span>
                </div>
                <div class="event-detail-item">
                    <span class="event-detail-label">重要性:</span>
                    <span class="event-detail-value">${importanceStars}</span>
                </div>
                ${event.category ? `
                <div class="event-detail-item">
                    <span class="event-detail-label">类别:</span>
                    <span class="event-detail-value">${event.category}</span>
                </div>
                ` : ''}
                ${event.country ? `
                <div class="event-detail-item">
                    <span class="event-detail-label">国家:</span>
                    <span class="event-detail-value">${event.country}</span>
                </div>
                ` : ''}
                ${event.city ? `
                <div class="event-detail-item">
                    <span class="event-detail-label">城市:</span>
                    <span class="event-detail-value">${event.city}</span>
                </div>
                ` : ''}
                ${stocksHtml}
                ${conceptsHtml}
                ${themesHtml}
            </div>
            
            ${event.content ? `
            <div class="event-modal-content-text">
                <h4>事件内容</h4>
                <p>${event.content}</p>
            </div>
            ` : ''}
            
            ${event.is_new ? `
            <div class="event-modal-discovery">
                <span class="new-badge">新增</span>
                <span>发现日期: ${event.discovery_date || '未知'}</span>
            </div>
            ` : ''}
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 关闭模态框
    const closeBtn = modal.querySelector('.event-modal-close');
    closeBtn.onclick = function() {
        document.body.removeChild(modal);
    };
    
    // 点击模态框外部关闭
    window.onclick = function(event) {
        if (event.target === modal) {
            document.body.removeChild(modal);
        }
    };
}

// 添加事件点击监听
document.addEventListener('click', function(e) {
    const eventCard = e.target.closest('.event-card');
    if (eventCard) {
        const eventId = eventCard.getAttribute('data-event-id');
        if (eventId) {
            loadEventDetails(eventId);
        }
    }
    
    const calendarEvent = e.target.closest('.calendar-event');
    if (calendarEvent) {
        const eventId = calendarEvent.getAttribute('data-event-id');
        if (eventId) {
            loadEventDetails(eventId);
        }
    }
});
