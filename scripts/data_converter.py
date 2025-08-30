#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
数据转换器 - 将Python数据转换为Web前端可用的JSON格式（包含历史数据）
"""

import json
import os
from datetime import datetime
from typing import Dict, List, Any

class DataConverter:
    """数据转换器 - 完整版"""
    
    def __init__(self):
        self.data_path = "../data"
        self.current_path = os.path.join(self.data_path, "active", "current")
        self.archived_path = os.path.join(self.data_path, "archived")
        self.web_path = os.path.join(self.data_path, "web")
        self._ensure_directories()
    
    def _ensure_directories(self):
        """确保目录存在"""
        os.makedirs(self.web_path, exist_ok=True)
    
    def convert_all_data(self):
        """转换所有数据为Web格式"""
        print("🔄 开始转换所有数据为Web格式...")
        
        # 1. 转换当前活跃数据
        self._convert_current_data()
        
        # 2. 转换历史数据
        self._convert_historical_data()
        
        # 3. 生成完整数据索引
        self._generate_complete_index()
        
        # 4. 转换元数据
        self._convert_metadata()
        
        # 5. 转换变更报告
        self._convert_change_reports()
        
        print("✅ 所有数据转换完成")
    
    def _convert_current_data(self):
        """转换当前数据"""
        print("📊 转换当前数据...")
        platforms = ['cls', 'jiuyangongshe', 'tonghuashun', 'investing', 'eastmoney']
        
        for platform in platforms:
            try:
                success = self._convert_platform_data(platform)
                if success:
                    print(f"✅ {platform} 当前数据转换完成")
                else:
                    print(f"⚠️ {platform} 当前数据转换跳过（无数据）")
            except Exception as e:
                print(f"❌ {platform} 当前数据转换失败: {e}")
    
    def _convert_historical_data(self):
        """转换历史数据"""
        print("📚 转换历史数据...")
        
        if not os.path.exists(self.archived_path):
            print("⚠️ 未发现历史数据目录")
            return
        
        platforms = ['cls', 'jiuyangongshe', 'tonghuashun', 'investing', 'eastmoney']
        converted_files = 0
        
        # 遍历年份目录
        for year_dir in os.listdir(self.archived_path):
            if not year_dir.isdigit():
                continue
                
            year_path = os.path.join(self.archived_path, year_dir)
            if not os.path.isdir(year_path):
                continue
            
            # 遍历月份目录
            for month_dir in os.listdir(year_path):
                if not month_dir.endswith('月'):
                    continue
                    
                month_path = os.path.join(year_path, month_dir)
                if not os.path.isdir(month_path):
                    continue
                
                month_num = month_dir.replace('月', '').zfill(2)
                
                # 转换每个平台的历史数据
                for platform in platforms:
                    source_file = os.path.join(month_path, f"{platform}.txt")
                    if os.path.exists(source_file):
                        target_file = os.path.join(self.web_path, f"{platform}_history_{year_dir}_{month_num}.json")
                        
                        try:
                            success = self._convert_historical_file(source_file, target_file, platform, year_dir, month_num)
                            if success:
                                converted_files += 1
                        except Exception as e:
                            print(f"❌ 转换失败 {platform} {year_dir}-{month_num}: {e}")
        
        print(f"📚 历史数据转换完成，共 {converted_files} 个文件")
    
    def _convert_historical_file(self, source_file: str, target_file: str, platform: str, year: str, month: str) -> bool:
        """转换单个历史数据文件"""
        try:
            with open(source_file, 'r', encoding='utf-8') as f:
                data = json.loads(f.read())
            
            web_data = {
                "platform": platform,
                "platform_name": self._get_platform_display_name(platform),
                "year": int(year),
                "month": int(month),
                "data_type": "HISTORICAL",
                "total_events": data.get("total_events", 0),
                "last_updated": data.get("last_update", datetime.now().isoformat()),
                "events": []
            }
            
            # 转换事件数据
            for event_data in data.get("events", []):
                web_event = self._convert_event_to_web_format(event_data)
                web_data["events"].append(web_event)
            
            # 保存Web格式数据
            with open(target_file, 'w', encoding='utf-8') as f:
                json.dump(web_data, f, ensure_ascii=False, indent=2)
            
            return True
            
        except Exception as e:
            print(f"转换历史文件失败 {source_file}: {e}")
            return False
    
    def _generate_complete_index(self):
        """生成完整数据索引"""
        print("📋 生成完整数据索引...")
        
        index = {
            "generated_at": datetime.now().isoformat(),
            "data_sources": {
                "current": {},
                "historical": {}
            },
            "platforms": ['cls', 'jiuyangongshe', 'tonghuashun', 'investing', 'eastmoney'],
            "total_files": 0,
            "date_range": {
                "start": None,
                "end": None
            }
        }
        
        # 扫描web目录中的所有JSON文件
        web_files = [f for f in os.listdir(self.web_path) if f.endswith('.json')]
        
        for file_name in web_files:
            if file_name.startswith('change_report_') or file_name == 'metadata.json' or file_name == 'data_index.json':
                continue
            
            if '_history_' in file_name:
                # 历史数据文件：platform_history_year_month.json
                parts = file_name.replace('.json', '').split('_')
                if len(parts) >= 4:
                    platform = parts[0]
                    year = parts[2]
                    month = parts[3]
                    
                    if platform not in index["data_sources"]["historical"]:
                        index["data_sources"]["historical"][platform] = []
                    
                    index["data_sources"]["historical"][platform].append({
                        "file": file_name,
                        "year": int(year),
                        "month": int(month),
                        "period": f"{year}-{month}"
                    })
            else:
                # 当前数据文件：platform.json
                platform = file_name.replace('.json', '')
                if platform in index["platforms"]:
                    index["data_sources"]["current"][platform] = {
                        "file": file_name,
                        "type": "ACTIVE"
                    }
        
        # 排序历史数据
        for platform in index["data_sources"]["historical"]:
            index["data_sources"]["historical"][platform].sort(
                key=lambda x: (x["year"], x["month"])
            )
        
        index["total_files"] = len(web_files)
        
        # 保存索引文件
        index_file = os.path.join(self.web_path, "data_index.json")
        with open(index_file, 'w', encoding='utf-8') as f:
            json.dump(index, f, ensure_ascii=False, indent=2)
        
        print(f"📋 数据索引生成完成，包含 {index['total_files']} 个数据文件")
    
    def _convert_platform_data(self, platform: str) -> bool:
        """转换单个平台数据"""
        source_file = os.path.join(self.current_path, f"{platform}.txt")
        target_file = os.path.join(self.web_path, f"{platform}.json")
        
        if not os.path.exists(source_file):
            return False
        
        try:
            with open(source_file, 'r', encoding='utf-8') as f:
                data = json.loads(f.read())
            
            web_data = {
                "platform": platform,
                "platform_name": self._get_platform_display_name(platform),
                "data_type": "ACTIVE",
                "total_events": data.get("total_events", 0),
                "last_updated": data.get("last_updated", datetime.now().isoformat()),
                "events": []
            }
            
            for event_data in data.get("events", []):
                web_event = self._convert_event_to_web_format(event_data)
                web_data["events"].append(web_event)
            
            with open(target_file, 'w', encoding='utf-8') as f:
                json.dump(web_data, f, ensure_ascii=False, indent=2)
            
            return True
            
        except Exception as e:
            print(f"转换 {platform} 数据时出错: {e}")
            return False
    
    def _convert_event_to_web_format(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """转换事件数据为Web格式"""
        web_event = {
            "id": event_data.get("event_id", ""),
            "platform": event_data.get("platform", ""),
            "title": event_data.get("title", ""),
            "event_date": event_data.get("event_date", ""),
            "event_time": event_data.get("event_time"),
            "event_datetime": event_data.get("event_datetime"),
            "content": event_data.get("content"),
            "category": event_data.get("category"),
            "importance": event_data.get("importance", 1),
            "country": event_data.get("country"),
            "city": event_data.get("city"),
            "is_new": event_data.get("is_new", False),
            "discovery_date": event_data.get("discovery_date"),
            "data_status": event_data.get("data_status", "ACTIVE"),
            "stocks": event_data.get("stocks", []),
            "themes": event_data.get("themes", []),
            "concepts": event_data.get("concepts", [])
        }
        
        return {k: v for k, v in web_event.items() if v is not None}
    
    def _convert_metadata(self):
        """转换元数据"""
        metadata_file = os.path.join(self.current_path, "metadata.txt")
        web_metadata_file = os.path.join(self.web_path, "metadata.json")
        
        try:
            if os.path.exists(metadata_file):
                with open(metadata_file, 'r', encoding='utf-8') as f:
                    metadata = json.loads(f.read())
            else:
                metadata = {}
            
            web_metadata = {
                "last_updated": metadata.get("collection_time", datetime.now().isoformat()),
                "total_events": metadata.get("total_events", 0),
                "platforms": {},
                "date_range": metadata.get("date_range", {}),
                "collection_type": metadata.get("collection_type", "ACTIVE"),
                "has_historical_data": os.path.exists(self.archived_path)
            }
            
            for platform, info in metadata.get("platforms", {}).items():
                web_metadata["platforms"][platform] = {
                    "name": self._get_platform_display_name(platform),
                    "event_count": info.get("event_count", 0),
                    "date_range": info.get("date_range", {})
                }
            
            with open(web_metadata_file, 'w', encoding='utf-8') as f:
                json.dump(web_metadata, f, ensure_ascii=False, indent=2)
                
            print("✅ 元数据转换完成")
            
        except Exception as e:
            print(f"❌ 元数据转换失败: {e}")
    
    def _convert_change_reports(self):
        """转换变更报告"""
        try:
            change_files = [f for f in os.listdir(self.current_path) 
                          if f.startswith("change_report_") and f.endswith(".txt")]
            
            for change_file in change_files:
                source_file = os.path.join(self.current_path, change_file)
                target_file = os.path.join(self.web_path, change_file.replace(".txt", ".json"))
                
                with open(source_file, 'r', encoding='utf-8') as f:
                    change_data = json.loads(f.read())
                
                web_change_data = {
                    "detection_time": change_data.get("detection_time"),
                    "summary": change_data.get("summary", {}),
                    "platforms": {},
                    "top_new_events": []
                }
                
                for platform, changes in change_data.get("platforms", {}).items():
                    web_change_data["platforms"][platform] = {
                        "name": self._get_platform_display_name(platform),
                        "new_events": changes.get("new_events", 0),
                        "updated_events": changes.get("updated_events", 0),
                        "cancelled_events": changes.get("cancelled_events", 0),
                        "sample_new_titles": changes.get("sample_new_titles", [])
                    }
                
                for event in change_data.get("top_new_events", []):
                    web_event = {
                        "platform": event.get("platform"),
                        "platform_name": self._get_platform_display_name(event.get("platform", "")),
                        "date": event.get("date"),
                        "title": event.get("title"),
                        "importance": event.get("importance"),
                        "country": event.get("country")
                    }
                    web_change_data["top_new_events"].append(web_event)
                
                with open(target_file, 'w', encoding='utf-8') as f:
                    json.dump(web_change_data, f, ensure_ascii=False, indent=2)
            
            if change_files:
                print(f"✅ 变更报告转换完成，共 {len(change_files)} 个文件")
            
        except Exception as e:
            print(f"❌ 变更报告转换失败: {e}")
    
    def _get_platform_display_name(self, platform: str) -> str:
        """获取平台显示名称"""
        names = {
            'cls': '财联社',
            'jiuyangongshe': '韭研公社',
            'tonghuashun': '同花顺',
            'investing': '英为财情',
            'eastmoney': '东方财富'
        }
        return names.get(platform, platform)

if __name__ == "__main__":
    converter = DataConverter()
    converter.convert_all_data()
    print("🎉 完整数据转换完成！")
