// 数据加载器 - 清理版
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
            if (cached) {
                return cached.data;
            }
            throw error;
        }
    }

    // 直接加载所有平台数据
    async loadAllCurrentData() {
        const platforms = ['cls', 'jiuyangongshe', 'tonghuashun', 'investing', 'eastmoney'];
        const results = {};
        
        console.log('开始加载平台数据...');
        
        for (const platform of platforms) {
            try {
                const data = await this.loadJSON(`data/web/${platform}.json`);
                results[platform] = data;
                console.log(`✅ ${platform}: ${data.total_events || 0} 个事件`);
            } catch (error) {
                console.error(`❌ 加载 ${platform} 失败:`, error);
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

    // 获取今日事件
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

    // 获取新增事件 - 增强调试版
    getNewEvents(currentData) {
        console.log('🔍 开始查找新增事件...');
        const newEvents = [];

        for (const [platform, data] of Object.entries(currentData)) {
            if (data.events) {
                console.log(`检查 ${platform}:`, data.events.length, '个事件');
                
                const platformNewEvents = data.events.filter(event => {
                    const isNew = event.is_new === true || event.is_new === "true" || event.is_new === 1;
                    if (isNew) {
                        console.log(`  🆕 发现新增事件: ${event.title} (is_new: ${event.is_new}, 类型: ${typeof event.is_new})`);
                    }
                    return isNew;
                });
                
                newEvents.push(...platformNewEvents);
                console.log(`${platform} 新增事件: ${platformNewEvents.length} 个`);
            }
        }

        console.log(`🆕 总新增事件: ${newEvents.length} 个`);
        return newEvents.sort((a, b) => {
            return new Date(b.discovery_date || 0) - new Date(a.discovery_date || 0);
        });
    }

    // 获取重要事件
    getImportantEvents(currentData, minImportance = 4) {
        const importantEvents = [];

        for (const [platform, data] of Object.entries(currentData)) {
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
    getAllCategories(currentData) {
        const categories = new Set();

        for (const [platform, data] of Object.entries(currentData)) {
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

    // 格式化方法
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
}

// 创建全局实例
window.dataLoader = new DataLoader();
