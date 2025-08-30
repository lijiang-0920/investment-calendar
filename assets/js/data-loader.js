// 数据加载器 - 完整版
class DataLoader {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5分钟缓存
        this.dataIndex = null;
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
            if (cached) {
                return cached.data;
            }
            throw error;
        }
    }

    // 加载数据索引
    async loadDataIndex() {
        if (this.dataIndex) {
            return this.dataIndex;
        }
        
        try {
            this.dataIndex = await this.loadJSON('data/web/data_index.json');
            return this.dataIndex;
        } catch (error) {
            console.error('Failed to load data index:', error);
            return {
                data_sources: { current: {}, historical: {} },
                platforms: ['cls', 'jiuyangongshe', 'tonghuashun', 'investing', 'eastmoney']
            };
        }
    }

    // 加载所有当前数据
    async loadAllCurrentData() {
        const index = await this.loadDataIndex();
        const results = {};
        
        for (const platform of index.platforms) {
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

    // 加载历史数据
    async loadHistoricalData(platform, year, month) {
        try {
            const fileName = `${platform}_history_${year}_${month.toString().padStart(2, '0')}.json`;
            return await this.loadJSON(`data/web/${fileName}`);
        } catch (error) {
            console.error(`Failed to load historical data ${platform} ${year}-${month}:`, error);
            return { events: [], total_events: 0 };
        }
    }

    // 获取可用的历史数据期间
    async getAvailableHistoricalPeriods() {
        const index = await this.loadDataIndex();
        const periods = new Set();
        
        for (const platform in index.data_sources.historical) {
            const platformData = index.data_sources.historical[platform];
            platformData.forEach(item => {
                periods.add(`${item.year}-${item.month.toString().padStart(2, '0')}`);
            });
        }
        
        return Array.from(periods).sort();
    }

    // 加载指定期间的所有平台数据
    async loadPeriodData(year, month) {
        const index = await this.loadDataIndex();
        const results = {};
        
        for (const platform of index.platforms) {
            try {
                const data = await this.loadHistoricalData(platform, year, month);
                results[platform] = data;
            } catch (error) {
                results[platform] = { events: [], total_events: 0 };
            }
        }
        
        return results;
    }

    // 获取所有数据（当前+历史）
    async loadAllData() {
        const [currentData, index] = await Promise.all([
            this.loadAllCurrentData(),
            this.loadDataIndex()
        ]);
        
        const allData = {
            current: currentData,
            historical: {}
        };
        
        // 加载所有历史数据
        for (const platform in index.data_sources.historical) {
            allData.historical[platform] = {};
            const platformPeriods = index.data_sources.historical[platform];
            
            for (const period of platformPeriods) {
                try {
                    const data = await this.loadHistoricalData(platform, period.year, period.month);
                    allData.historical[platform][period.period] = data;
                } catch (error) {
                    console.error(`Failed to load ${platform} ${period.period}:`, error);
                }
            }
        }
        
        return allData;
    }

    // 获取今日事件（当前数据）
    getTodayEvents(currentData) {
        const today = new Date().toISOString().split('T')[0];
        const todayEvents = [];

        for (const [platform, data] of Object.entries(currentData)) {
            if (data.events) {
                const platformTodayEvents = data.events.filter(event => 
                    event.event_date === today
                );
                todayEvents.push(...platformTodayEvents);
            }
        }

        return todayEvents.sort((a, b) => {
            if (a.importance !== b.importance) {
                return (b.importance || 0) - (a.importance || 0);
            }
            return (a.event_time || '00:00:00').localeCompare(b.event_time || '00:00:00');
        });
    }

    // 获取指定日期的事件（支持历史数据）
    async getEventsByDate(date) {
        const targetDate = new Date(date);
        const year = targetDate.getFullYear();
        const month = targetDate.getMonth() + 1;
        const dateStr = date;
        
        // 判断是否为当前数据范围
        const today = new Date();
        const isRecent = targetDate >= new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000); // 最近7天
        
        let events = [];
        
        if (isRecent) {
            // 从当前数据中查找
            const currentData = await this.loadAllCurrentData();
            for (const [platform, data] of Object.entries(currentData)) {
                if (data.events) {
                    const dateEvents = data.events.filter(event => 
                        event.event_date === dateStr
                    );
                    events.push(...dateEvents);
                }
            }
        } else {
            // 从历史数据中查找
            const periodData = await this.loadPeriodData(year, month);
            for (const [platform, data] of Object.entries(periodData)) {
                if (data.events) {
                    const dateEvents = data.events.filter(event => 
                        event.event_date === dateStr
                    );
                    events.push(...dateEvents);
                }
            }
        }
        
        return events.sort((a, b) => {
            if (a.importance !== b.importance) {
                return (b.importance || 0) - (a.importance || 0);
            }
            return (a.event_time || '00:00:00').localeCompare(b.event_time || '00:00:00');
        });
    }

    // 获取日期范围内的事件
    async getEventsByDateRange(startDate, endDate) {
        const events = [];
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        // 按月分组加载数据
        const monthsToLoad = new Set();
        const current = new Date(start);
        
        while (current <= end) {
            const year = current.getFullYear();
            const month = current.getMonth() + 1;
            monthsToLoad.add(`${year}-${month}`);
            current.setMonth(current.getMonth() + 1);
        }
        
        // 加载所有需要的月份数据
        for (const period of monthsToLoad) {
            const [year, month] = period.split('-').map(Number);
            const isRecent = new Date(year, month - 1) >= new Date(new Date().getFullYear(), new Date().getMonth() - 1);
            
            let periodData;
            if (isRecent) {
                periodData = await this.loadAllCurrentData();
            } else {
                periodData = await this.loadPeriodData(year, month);
            }
            
            for (const [platform, data] of Object.entries(periodData)) {
                if (data.events) {
                    const rangeEvents = data.events.filter(event => 
                        event.event_date >= startDate && event.event_date <= endDate
                    );
                    events.push(...rangeEvents);
                }
            }
        }
        
        return events.sort((a, b) => {
            if (a.event_date !== b.event_date) {
                return a.event_date.localeCompare(b.event_date);
            }
            return (a.event_time || '00:00:00').localeCompare(b.event_time || '00:00:00');
        });
    }

    // 搜索事件（包括历史数据）
    async searchEvents(query, includeHistorical = false) {
        if (!query || query.length < 2) {
            return [];
        }

        const searchQuery = query.toLowerCase();
        const results = [];
        
        // 搜索当前数据
        const currentData = await this.loadAllCurrentData();
        for (const [platform, data] of Object.entries(currentData)) {
            if (data.events) {
                const matchedEvents = data.events.filter(event => {
                    return this._eventMatchesQuery(event, searchQuery);
                });
                results.push(...matchedEvents);
            }
        }
        
        // 如果需要搜索历史数据
        if (includeHistorical) {
            const index = await this.loadDataIndex();
            
            for (const platform in index.data_sources.historical) {
                const platformPeriods = index.data_sources.historical[platform];
                
                // 只搜索最近几个月的历史数据，避免加载过多
                const recentPeriods = platformPeriods.slice(-6); // 最近6个月
                
                for (const period of recentPeriods) {
                    try {
                        const data = await this.loadHistoricalData(platform, period.year, period.month);
                        if (data.events) {
                            const matchedEvents = data.events.filter(event => {
                                return this._eventMatchesQuery(event, searchQuery);
                            });
                            results.push(...matchedEvents);
                        }
                    } catch (error) {
                        // 忽略加载错误，继续搜索其他数据
                    }
                }
            }
        }
        
        return results.sort((a, b) => {
            return (b.importance || 0) - (a.importance || 0);
        });
    }

    _eventMatchesQuery(event, searchQuery) {
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
    }

    // 其他辅助方法保持不变
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

    generateStars(importance) {
        if (!importance) importance = 1;
        const fullStars = '★'.repeat(importance);
        const emptyStars = '☆'.repeat(5 - importance);
        return fullStars + emptyStars;
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
}

// 创建全局实例
window.dataLoader = new DataLoader();
