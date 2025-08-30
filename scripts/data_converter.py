#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
数据转换器 - 将Python数据转换为Web前端可用的JSON格式
"""

import json
import os
from datetime import datetime
from typing import Dict, List, Any

class DataConverter:
    """数据转换器"""
    
    def __init__(self):
        self.data_path = "./data"
        self.current_path = os.path.join(self.data_path, "active", "current")
        self.web_path = os.path.join(self.data_path, "web")
        self._ensure_directories()
    
    def _ensure_directories(self):
        """确保目录存在"""
        os.makedirs(self.web_path, exist_ok=True)
    
    def convert_all_data(self):
        """转换所有数据为Web格式"""
        print("🔄 开始转换数据为Web格式...")
        
        platforms = ['cls', 'jiuyangongshe', 'tonghuashun', 'investing', 'eastmoney']
        converted_count = 0
        
        for platform in platforms:
            try:
                success = self._convert_platform_data(platform)
                if success:
                    converted_count += 1
                    print(f"✅ {platform} 数据转换完成")
                else:
                    print(f"⚠️ {platform} 数据转换跳过（无数据）")
            except Exception as e:
                print(f"❌ {platform} 数据转换失败: {e}")
        
        # 转换元数据
        self._convert_metadata()
        
        # 转换变更报告
        self._convert_change_reports()
        
        print(f"📊 数据转换完成，共处理 {converted_count} 个平台")
    
    def _convert_platform_data(self, platform: str) -> bool:
        """转换单个平台数据"""
        source_file = os.path.join(self.current_path, f"{platform}.txt")
        target_file = os.path.join(self.web_path, f"{platform}.json")
        
        if not os.path.exists(source_file):
            return False
        
        try:
            # 读取源数据
            with open(source_file, 'r', encoding='utf-8') as f:
                data = json.loads(f.read())
            
            # 转换为Web格式
            web_data = {
                "platform": platform,
                "platform_name": self._get_platform_display_name(platform),
                "total_events": data.get("total_events", 0),
                "last_updated": data.get("last_updated", datetime.now().isoformat()),
                "events": []
            }
            
            # 处理事件数据
            for event_data in data.get("events", []):
                web_event = self._convert_event_to_web_format(event_data)
                web_data["events"].append(web_event)
            
            # 保存Web格式数据
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
            "stocks": event_data.get("stocks", []),
            "themes": event_data.get("themes", []),
            "concepts": event_data.get("concepts", [])
        }
        
        # 清理空值
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
                "collection_type": metadata.get("collection_type", "ACTIVE")
            }
            
            # 转换平台信息
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
            # 查找变更报告文件
            change_files = [f for f in os.listdir(self.current_path) 
                          if f.startswith("change_report_") and f.endswith(".txt")]
            
            for change_file in change_files:
                source_file = os.path.join(self.current_path, change_file)
                target_file = os.path.join(self.web_path, change_file.replace(".txt", ".json"))
                
                with open(source_file, 'r', encoding='utf-8') as f:
                    change_data = json.loads(f.read())
                
                # 转换为Web格式
                web_change_data = {
                    "detection_time": change_data.get("detection_time"),
                    "summary": change_data.get("summary", {}),
                    "platforms": {},
                    "top_new_events": []
                }
                
                # 转换平台变更信息
                for platform, changes in change_data.get("platforms", {}).items():
                    web_change_data["platforms"][platform] = {
                        "name": self._get_platform_display_name(platform),
                        "new_events": changes.get("new_events", 0),
                        "updated_events": changes.get("updated_events", 0),
                        "cancelled_events": changes.get("cancelled_events", 0),
                        "sample_new_titles": changes.get("sample_new_titles", [])
                    }
                
                # 转换重要新增事件
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
    print("🎉 数据转换完成！")
