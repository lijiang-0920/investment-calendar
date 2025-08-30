// 数据加载器
class DataLoader {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5分钟缓存
    }

    async loadJSON(url) {
        const cacheKey = url;
        const cached = this.cache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            
            this.cache.set(cacheKey, {
                data: data,
                timestamp: Date.now()
            });
            
            return data;
        } catch (error) {
            console.error('Failed to load data:', error);
            // 如果有缓存数据，返回缓存数据
            if (cached) {
                return cached.data;
            }
            throw error;
        }
    }

    async loadAllPlatformData() {
        const platforms = ['cls', 'jiuyangongshe', 'tonghuashun', 'investing', 'eastmoney'];
        const results = {};
        
        for (const platform of platforms) {
            try {
                const data = await this.loadJSON(`data/web/${platform}.json`);
                results[platform] = data;
            } catch (error) {
                console.error(`Failed to load ${platform} data:`, error);
                results[platform] = { events: [], total_events: 0 };
            }
        }
        
        return results;
    }

    async loadMetadata() {
        try {
            return await this.loadJSON('data/web/metadata.json');
        } catch (error) {
            console.error('Failed to load metadata:', error);
            return {
                last_updated: new Date().toISOString(),
                total_events: 0,
                platforms: {}
            };
        }
    }

    async loadChangeReport() {
        try {
            const today = new Date().toISOString().split('T')[0];
            return await this.loadJSON(`data/web/change_report_${today}.json`);
        } catch (error) {
            console.error('Failed to load change report:', error);
            return {
                summary: {
                    total_new: 0,
                    total_updated: 0,
                    total_cancelled: 0
                }
            };
        }
    }

    // 格式化日期时间
    formatDateTime(dateTimeStr) {
        if (!dateTimeStr) return '';
        
        try {
            const date = new Date(dateTimeStr);
            return date.toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return dateTimeStr;
        }
    }

    // 格式化日期
    formatDate(dateStr) {
        if (!dateStr) return '';
        
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
        } catch (error) {
            return dateStr;
        }
    }

    // 获取平台显示名称
    getPlatformDisplayName(platform) {
        const names = {
            'cls': '财联社',
            'jiuyangongshe': '韭研公社',
            'tonghuashun': '同花顺',
            'investing': '英为财情',
            'eastmoney': '东方财富'
        };
        return names[platform] || platform;
    }

    // 生成重要性星级
    generateStars(importance) {
        if (!importance) importance = 1;
        const fullStars = '★'.repeat(importance);
        const emptyStars = '☆'.repeat(5 - importance);
        return fullStars + emptyStars;
    }

    // 过滤今日事件
    getTodayEvents(allData) {
        const today = new Date().toISOString().split('T')[0];
        const todayEvents = [];

        for (const [platform, data] of Object.entries(allData)) {
            if (data.events) {
                const platformTodayEvents = data.events.filter(event => 
                    event.event_date === today
                );
                todayEvents.push(...platformTodayEvents);
            }
        }

        return todayEvents.sort((a, b) => {
            // 按重要性降序，然后按时间升序
            if (a.importance !== b.importance) {
                return (b.importance || 0) - (a.importance || 0);
            }
            return (a.event_time || '00:00:00').localeCompare(b.event_time || '00:00:00');
        });
    }

    // 获取新增事件
    getNewEvents(allData) {
        const newEvents = [];

        for (const [platform, data] of Object.entries(allData)) {
            if (data.events) {
                const platformNewEvents = data.events.filter(event => 
                    event.is_new === true
                );
                newEvents.push(...platformNewEvents);
            }
        }

        return newEvents.sort((a, b) => {
            return new Date(b.discovery_date || 0) - new Date(a.discovery_date || 0);
        });
    }

    // 获取重要事件
    getImportantEvents(allData, minImportance = 4) {
        const importantEvents = [];

        for (const [platform, data] of Object.entries(allData)) {
            if (data.events) {
                const platformImportantEvents = data.events.filter(event => 
                    (event.importance || 0) >= minImportance
                );
                importantEvents.push(...platformImportantEvents);
            }
        }

        return importantEvents.sort((a, b) => {
            return (b.importance || 0) - (a.importance || 0);
        });
    }

    // 获取所有类别
    getAllCategories(allData) {
        const categories = new Set();

        for (const [platform, data] of Object.entries(allData)) {
            if (data.events) {
                data.events.forEach(event => {
                    if (event.category) {
                        categories.add(event.category);
                    }
                });
            }
        }

        return Array.from(categories).sort();
    }

    // 按日期分组事件 (继续)
    groupEventsByDate(events) {
        const grouped = {};

        events.forEach(event => {
            const date = event.event_date;
            if (!grouped[date]) {
                grouped[date] = [];
            }
            grouped[date].push(event);
        });

        // 按日期排序
        Object.keys(grouped).forEach(date => {
            grouped[date].sort((a, b) => {
                return (a.event_time || '00:00:00').localeCompare(b.event_time || '00:00:00');
            });
        });

        return grouped;
    }

    // 获取日期范围内的事件
    getEventsInDateRange(allData, startDate, endDate) {
        const events = [];

        for (const [platform, data] of Object.entries(allData)) {
            if (data.events) {
                const rangeEvents = data.events.filter(event => 
                    event.event_date >= startDate && event.event_date <= endDate
                );
                events.push(...rangeEvents);
            }
        }

        return events.sort((a, b) => {
            if (a.event_date !== b.event_date) {
                return a.event_date.localeCompare(b.event_date);
            }
            return (a.event_time || '00:00:00').localeCompare(b.event_time || '00:00:00');
        });
    }

    // 搜索事件
    searchEvents(allData, query) {
        if (!query || query.length < 2) {
            return [];
        }

        const searchQuery = query.toLowerCase();
        const results = [];

        for (const [platform, data] of Object.entries(allData)) {
            if (data.events) {
                const matchedEvents = data.events.filter(event => {
                    return (
                        event.title?.toLowerCase().includes(searchQuery) ||
                        event.content?.toLowerCase().includes(searchQuery) ||
                        event.category?.toLowerCase().includes(searchQuery) ||
                        event.country?.toLowerCase().includes(searchQuery) ||
                        (event.stocks && event.stocks.some(stock => 
                            stock.toLowerCase().includes(searchQuery)
                        )) ||
                        (event.themes && event.themes.some(theme => 
                            theme.toLowerCase().includes(searchQuery)
                        ))
                    );
                });
                results.push(...matchedEvents);
            }
        }

        return results.sort((a, b) => {
            return (b.importance || 0) - (a.importance || 0);
        });
    }
}

// 创建全局实例
window.dataLoader = new DataLoader();
