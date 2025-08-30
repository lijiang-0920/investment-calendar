// 日历组件
class Calendar {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.currentDate = new Date();
        this.selectedDate = null;
        this.events = {};
        this.onDateSelect = null;
        
        this.monthNames = [
            '1月', '2月', '3月', '4月', '5月', '6月',
            '7月', '8月', '9月', '10月', '11月', '12月'
        ];
        
        this.dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        
        this.init();
    }

    init() {
        this.render();
        this.bindEvents();
    }

    bindEvents() {
        document.getElementById('prev-month')?.addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() - 1);
            this.render();
        });

        document.getElementById('next-month')?.addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() + 1);
            this.render();
        });

        document.getElementById('today-btn')?.addEventListener('click', () => {
            this.currentDate = new Date();
            this.selectedDate = new Date();
            this.render();
            if (this.onDateSelect) {
                this.onDateSelect(this.formatDate(this.selectedDate));
            }
        });
    }

    render() {
        this.updateMonthYear();
        this.renderCalendarGrid();
    }

    updateMonthYear() {
        const monthYearElement = document.getElementById('current-month-year');
        if (monthYearElement) {
            monthYearElement.textContent = 
                `${this.currentDate.getFullYear()}年${this.monthNames[this.currentDate.getMonth()]}`;
        }
    }

    renderCalendarGrid() {
        if (!this.container) return;

        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        // 获取月份第一天和最后一天
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        
        // 获取第一周的开始日期（周日开始）
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());
        
        // 清空容器
        this.container.innerHTML = '';
        
        // 添加星期标题
        this.dayNames.forEach(dayName => {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'calendar-day-header';
            dayHeader.textContent = dayName;
            this.container.appendChild(dayHeader);
        });

        // 生成42天（6周）
        const currentDate = new Date(startDate);
        const today = new Date();
        
        for (let i = 0; i < 42; i++) {
            const dayElement = this.createDayElement(currentDate, month, today);
            this.container.appendChild(dayElement);
            currentDate.setDate(currentDate.getDate() + 1);
        }
    }

    createDayElement(date, currentMonth, today) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        
        const isCurrentMonth = date.getMonth() === currentMonth;
        const isToday = this.isSameDate(date, today);
        const isSelected = this.selectedDate && this.isSameDate(date, this.selectedDate);
        
        if (!isCurrentMonth) {
            dayElement.classList.add('other-month');
        }
        
        if (isToday) {
            dayElement.classList.add('today');
        }
        
        if (isSelected) {
            dayElement.classList.add('selected');
        }

        // 日期数字
        const dayNumber = document.createElement('div');
        dayNumber.className = 'day-number';
        dayNumber.textContent = date.getDate();
        dayElement.appendChild(dayNumber);

        // 事件列表
        const eventsContainer = document.createElement('div');
        eventsContainer.className = 'day-events';
        
        const dateStr = this.formatDate(date);
        const dayEvents = this.events[dateStr] || [];
        
        // 显示最多3个事件
        const maxEvents = 3;
        dayEvents.slice(0, maxEvents).forEach(event => {
            const eventElement = this.createEventElement(event);
            eventsContainer.appendChild(eventElement);
        });
        
        // 如果有更多事件，显示"更多"
        if (dayEvents.length > maxEvents) {
            const moreElement = document.createElement('div');
            moreElement.className = 'events-overflow';
            moreElement.textContent = `+${dayEvents.length - maxEvents}更多`;
            eventsContainer.appendChild(moreElement);
        }
        
        dayElement.appendChild(eventsContainer);

        // 点击事件
        dayElement.addEventListener('click', () => {
            if (this.selectedDate) {
                const prevSelected = this.container.querySelector('.calendar-day.selected');
                if (prevSelected) {
                    prevSelected.classList.remove('selected');
                }
            }
            
            this.selectedDate = new Date(date);
            dayElement.classList.add('selected');
            
            if (this.onDateSelect) {
                this.onDateSelect(dateStr, dayEvents);
            }
        });

        return dayElement;
    }

    createEventElement(event) {
        const eventElement = document.createElement('div');
        eventElement.className = 'calendar-event';
        
        // 根据事件类型添加样式
        if (event.is_new) {
            eventElement.classList.add('new');
        } else if ((event.importance || 0) >= 4) {
            eventElement.classList.add('important');
        } else {
            eventElement.classList.add('normal');
        }
        
        eventElement.textContent = event.title || '未知事件';
        eventElement.title = `${event.title}\n${event.platform ? window.dataLoader.getPlatformDisplayName(event.platform) : ''}\n${event.event_time || ''}`;
        
        // 点击事件详情
        eventElement.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.eventModal) {
                window.eventModal.show(event);
            }
        });

        return eventElement;
    }

    setEvents(eventsData) {
        this.events = {};
        
        // 按日期分组事件
        for (const [platform, data] of Object.entries(eventsData)) {
            if (data.events) {
                data.events.forEach(event => {
                    const date = event.event_date;
                    if (!this.events[date]) {
                        this.events[date] = [];
                    }
                    this.events[date].push(event);
                });
            }
        }
        
        // 排序每天的事件
        Object.keys(this.events).forEach(date => {
            this.events[date].sort((a, b) => {
                if (a.importance !== b.importance) {
                    return (b.importance || 0) - (a.importance || 0);
                }
                return (a.event_time || '00:00:00').localeCompare(b.event_time || '00:00:00');
            });
        });
        
        this.render();
    }

    isSameDate(date1, date2) {
        return date1.getFullYear() === date2.getFullYear() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getDate() === date2.getDate();
    }

    formatDate(date) {
        return date.toISOString().split('T')[0];
    }

    goToDate(dateStr) {
        const date = new Date(dateStr);
        this.currentDate = new Date(date.getFullYear(), date.getMonth(), 1);
        this.selectedDate = date;
        this.render();
    }

    getSelectedDate() {
        return this.selectedDate ? this.formatDate(this.selectedDate) : null;
    }
}
