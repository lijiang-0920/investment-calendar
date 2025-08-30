// 日历视图脚本
let calendarData = null;
let currentWeekStart = null;

function initCalendar() {
    fetch('data/calendar_data.json')
        .then(response => response.json())
        .then(data => {
            calendarData = data;
            
            // 设置初始周为今天所在的周
            const today = new Date(data.today);
            currentWeekStart = new Date(today);
            currentWeekStart.setDate(today.getDate() - today.getDay()); // 设置为本周日
            
            // 渲染日历
            renderCalendar();
            
            // 设置导航按钮
            document.getElementById('prevWeek').addEventListener('click', () => {
                currentWeekStart.setDate(currentWeekStart.getDate() - 7);
                renderCalendar();
            });
            
            document.getElementById('nextWeek').addEventListener('click', () => {
                currentWeekStart.setDate(currentWeekStart.getDate() + 7);
                renderCalendar();
            });
        })
        .catch(error => {
            console.error('加载日历数据失败:', error);
            document.getElementById('calendarContainer').innerHTML = '<div class="error">加载日历数据失败</div>';
        });
}

function renderCalendar() {
    if (!calendarData) return;
    
    const container = document.getElementById('calendarContainer');
    const today = calendarData.today || new Date().toISOString().split('T')[0]; // 今天的日期，格式为 YYYY-MM-DD
    
    // 生成周日期范围
    const weekDates = [];
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    
    for (let i = 0; i < 7; i++) {
        const date = new Date(currentWeekStart);
        date.setDate(currentWeekStart.getDate() + i);
        weekDates.push({
            date: date.toISOString().split('T')[0],
            day: weekDays[i],
            formattedDate: `${date.getMonth() + 1}月${date.getDate()}日`
        });
    }
    
    // 更新当前周范围显示
    const startMonth = currentWeekStart.getMonth() + 1;
    const startDay = currentWeekStart.getDate();
    const endDate = new Date(currentWeekStart);
    endDate.setDate(currentWeekStart.getDate() + 6);
    const endMonth = endDate.getMonth() + 1;
    const endDay = endDate.getDate();
    
    document.getElementById('currentWeekRange').textContent = 
        `${currentWeekStart.getFullYear()}年${startMonth}月${startDay}日 - ${endMonth}月${endDay}日`;
    
    // 生成日历表格
    let tableHtml = `
        <table class="calendar-table">
            <thead>
                <tr>
    `;
    
    // 表头
    weekDates.forEach(dateInfo => {
        tableHtml += `<th>${dateInfo.day}<br>${dateInfo.formattedDate}</th>`;
    });
    
    tableHtml += `
                </tr>
            </thead>
            <tbody>
                <tr>
    `;
    
    // 表格内容
    weekDates.forEach(dateInfo => {
        const dateEvents = calendarData.days[dateInfo.date] || [];
        const isToday = dateInfo.date === today;
        const isPast = dateInfo.date < today;
        
        tableHtml += `
            <td class="${isPast ? 'past-date' : ''}">
                <div class="calendar-date ${isToday ? 'today' : ''}">${dateInfo.formattedDate}</div>
                <div class="calendar-events">
        `;
        
        if (dateEvents.length === 0) {
            tableHtml += `<div class="no-events">暂无事件</div>`;
        } else {
            dateEvents.forEach(event => {
                const platformName = getPlatformName(event.platform);
                const importanceStars = '★'.repeat(event.importance || 0);
                
                tableHtml += `
                    <div class="calendar-event ${event.is_new ? 'new' : ''} ${isPast ? 'past-event' : ''}" data-event-id="${event.event_id}">
                        ${event.event_time ? `<div class="calendar-event-time">${event.event_time}</div>` : ''}
                        <div class="calendar-event-title">${event.title}</div>
                        <div class="calendar-event-footer">
                            <span class="calendar-event-platform">${platformName}</span>
                            <span class="calendar-event-importance">${importanceStars}</span>
                        </div>
                    </div>
                `;
            });
        }
        
        tableHtml += `
                </div>
            </td>
        `;
    });
    
    tableHtml += `
                </tr>
            </tbody>
        </table>
    `;
    
    container.innerHTML = tableHtml;
}
