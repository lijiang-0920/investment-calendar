#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
投资日历数据导出工具
将数据导出为网页可用的格式
"""

import json
import os
import sys
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from typing import List, Dict, Any

# 导入标准化事件模型
@dataclass
class StandardizedEvent:
    """标准化事件模型"""
    platform: str
    event_id: str
    original_id: str
    event_date: str
    event_time: str = None
    event_datetime: str = None
    title: str = ""
    content: str = None
    category: str = None
    importance: int = None
    country: str = None
    city: str = None
    stocks: List[str] = None
    concepts: List[Dict[str, Any]] = None
    themes: List[str] = None
    data_status: str = "ACTIVE"
    is_new: bool = False
    discovery_date: str = ""
    raw_data: Dict[str, Any] = None
    created_at: str = ""
    
    def __post_init__(self):
        if self.stocks is None:
            self.stocks = []
        if self.concepts is None:
            self.concepts = []
        if self.themes is None:
            self.themes = []
        if self.raw_data is None:
            self.raw_data = {}
        if not self.created_at:
            self.created_at = datetime.now().isoformat()
        if not self.discovery_date:
            self.discovery_date = datetime.now().strftime('%Y-%m-%d')
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

def load_platform_data(platform: str, data_path: str) -> List[StandardizedEvent]:
    """从txt文件加载平台数据"""
    file_path = os.path.join(data_path, f"{platform}.txt")
    
    if not os.path.exists(file_path):
        return []
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            json_content = f.read()
            data = json.loads(json_content)
        
        events = []
        for event_data in data.get('events', []):
            event = StandardizedEvent(**event_data)
            events.append(event)
        
        return events
    except Exception as e:
        print(f"加载 {platform} 数据失败: {e}")
        return []

def export_data_for_web():
    """导出数据供网页使用"""
    print("📤 导出数据供网页使用...")
    
    # 创建导出目录
    export_dir = "./docs/data"
    os.makedirs(export_dir, exist_ok=True)
    
    # 获取当前日期
    today = datetime.now().strftime('%Y-%m-%d')
    
    # 1. 导出数据摘要
    export_summary(export_dir)
    
    # 2. 导出最新事件
    export_latest_events(export_dir, today)
    
    # 3. 导出日历数据
    export_calendar_data(export_dir, today)
    
    # 4. 导出变更报告
    export_change_report(export_dir)
    
    # 5. 导出平台数据统计
    export_platform_stats(export_dir)
    
    print("✅ 数据导出完成")

def export_summary(export_dir):
    """导出数据摘要"""
    current_path = "./data/active/current"
    summary_path = os.path.join(current_path, "metadata.txt")
    
    if os.path.exists(summary_path):
        with open(summary_path, 'r', encoding='utf-8') as f:
            summary_data = json.loads(f.read())
        
        # 添加更多统计信息
        platforms = ['cls', 'jiuyangongshe', 'tonghuashun', 'investing', 'eastmoney']
        platform_names = {
            'cls': '财联社',
            'jiuyangongshe': '韭研公社',
            'tonghuashun': '同花顺',
            'investing': '英为财情',
            'eastmoney': '东方财富'
        }
        
        # 统计新增事件
        total_new = 0
        platform_new = {}
        
        for platform in platforms:
            events = load_platform_data(platform, current_path)
            new_events = [e for e in events if e.is_new]
            total_new += len(new_events)
            platform_new[platform] = len(new_events)
        
        summary_data['new_events'] = {
            'total': total_new,
            'platforms': platform_new
        }
        
        # 添加平台中文名称
        for platform in platforms:
            if platform in summary_data['platforms']:
                summary_data['platforms'][platform]['name'] = platform_names.get(platform, platform)
        
        # 保存到导出目录
        with open(os.path.join(export_dir, "summary.json"), 'w', encoding='utf-8') as f:
            f.write(json.dumps(summary_data, ensure_ascii=False, indent=2))
        
        print(f"   📊 数据摘要已导出")

def export_latest_events(export_dir, today):
    """导出最新事件"""
    current_path = "./data/active/current"
    platforms = ['cls', 'jiuyangongshe', 'tonghuashun', 'investing', 'eastmoney']
    
    # 收集所有新增事件
    all_new_events = []
    for platform in platforms:
        events = load_platform_data(platform, current_path)
        new_events = [e.to_dict() for e in events if e.is_new]
        all_new_events.extend(new_events)
    
    # 收集今日事件
    today_events = []
    for platform in platforms:
        events = load_platform_data(platform, current_path)
        platform_today_events = [e.to_dict() for e in events if e.event_date == today]
        today_events.extend(platform_today_events)
    
    # 按重要性排序
    all_new_events.sort(key=lambda x: x.get('importance', 0) or 0, reverse=True)
    today_events.sort(key=lambda x: x.get('importance', 0) or 0, reverse=True)
    
    # 构建导出数据
    export_data = {
        'new_events': all_new_events[:100],  # 最多导出100个新增事件
        'today_events': today_events,
        'export_time': datetime.now().isoformat(),
        'today': today
    }
    
    # 保存到导出目录
    with open(os.path.join(export_dir, "latest_events.json"), 'w', encoding='utf-8') as f:
        f.write(json.dumps(export_data, ensure_ascii=False, indent=2))
    
    print(f"   📅 最新事件已导出 (新增: {len(all_new_events)}, 今日: {len(today_events)})")

def export_calendar_data(export_dir, today):
    """导出日历数据"""
    current_path = "./data/active/current"
    platforms = ['cls', 'jiuyangongshe', 'tonghuashun', 'investing', 'eastmoney']
    
    # 计算导出范围：今天开始的30天
    start_date = today
    end_date = (datetime.strptime(today, '%Y-%m-%d') + timedelta(days=30)).strftime('%Y-%m-%d')
    
    # 按日期组织事件
    calendar_data = {}
    
    for platform in platforms:
        events = load_platform_data(platform, current_path)
        
        for event in events:
            if start_date <= event.event_date <= end_date:
                if event.event_date not in calendar_data:
                    calendar_data[event.event_date] = []
                
                # 简化事件数据，减小文件大小
                simplified_event = {
                    'event_id': event.event_id,
                    'platform': event.platform,
                    'title': event.title,
                    'event_time': event.event_time,
                    'importance': event.importance,
                    'category': event.category,
                    'country': event.country,
                    'is_new': event.is_new
                }
                
                calendar_data[event.event_date].append(simplified_event)
    
    # 对每天的事件按重要性排序
    for date, events in calendar_data.items():
        events.sort(key=lambda x: x.get('importance', 0) or 0, reverse=True)
    
    # 构建导出数据
    export_data = {
        'start_date': start_date,
        'end_date': end_date,
        'days': calendar_data,
        'export_time': datetime.now().isoformat()
    }
    
    # 保存到导出目录
    with open(os.path.join(export_dir, "calendar_data.json"), 'w', encoding='utf-8') as f:
        f.write(json.dumps(export_data, ensure_ascii=False, indent=2))
    
    # 统计总事件数
    total_events = sum(len(events) for events in calendar_data.values())
    print(f"   🗓️ 日历数据已导出 ({len(calendar_data)} 天, {total_events} 个事件)")

def export_change_report(export_dir):
    """导出最新变更报告"""
    current_path = "./data/active/current"
    today = datetime.now().strftime('%Y-%m-%d')
    report_path = os.path.join(current_path, f"change_report_{today}.txt")
    
    if os.path.exists(report_path):
        with open(report_path, 'r', encoding='utf-8') as f:
            report_data = json.loads(f.read())
        
        # 保存到导出目录
        with open(os.path.join(export_dir, "change_report.json"), 'w', encoding='utf-8') as f:
            f.write(json.dumps(report_data, ensure_ascii=False, indent=2))
        
        print(f"   📝 变更报告已导出")
    else:
        print(f"   ⚠️ 未找到今日变更报告")

def export_platform_stats(export_dir):
    """导出平台数据统计"""
    current_path = "./data/active/current"
    platforms = ['cls', 'jiuyangongshe', 'tonghuashun', 'investing', 'eastmoney']
    platform_names = {
        'cls': '财联社',
        'jiuyangongshe': '韭研公社',
        'tonghuashun': '同花顺',
        'investing': '英为财情',
        'eastmoney': '东方财富'
    }
    
    # 统计各平台的类别分布
    platform_stats = {}
    
    for platform in platforms:
        events = load_platform_data(platform, current_path)
        
        # 按类别统计
        category_stats = {}
        for event in events:
            if event.category:
                category_stats[event.category] = category_stats.get(event.category, 0) + 1
        
        # 按重要性统计
        importance_stats = {}
        for event in events:
            imp = event.importance or 0
            importance_stats[imp] = importance_stats.get(imp, 0) + 1
        
        # 按国家统计
        country_stats = {}
        for event in events:
            if event.country:
                country_stats[event.country] = country_stats.get(event.country, 0) + 1
        
        platform_stats[platform] = {
            'name': platform_names.get(platform, platform),
            'total_events': len(events),
            'new_events': len([e for e in events if e.is_new]),
            'categories': category_stats,
            'importance': importance_stats,
            'countries': country_stats
        }
    
    # 保存到导出目录
    with open(os.path.join(export_dir, "platform_stats.json"), 'w', encoding='utf-8') as f:
        f.write(json.dumps(platform_stats, ensure_ascii=False, indent=2))
    
    print(f"   📊 平台统计数据已导出")

if __name__ == "__main__":
    print("📤 投资日历数据导出工具")
    print("=" * 50)
    
    export_data_for_web()
