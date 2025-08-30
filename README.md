# investment-calendar
# 投资日历数据采集与变更检测系统

这是一个功能完整的投资日历数据采集和管理系统，用于从多个金融平台收集投资相关事件信息，并对这些事件进行变更检测和管理。

## 系统功能

- **多平台数据采集**：从财联社、韭研公社、同花顺、英为财情、东方财富等平台采集投资事件数据
- **事件变更检测**：自动检测事件变更（新增、更新、取消），生成变更报告
- **数据生命周期管理**：自动归档历史数据，数据轮转，维护活跃数据和历史数据分离
- **网页查询界面**：提供直观的网页界面进行数据查询和展示

## 系统组件

1. **历史数据采集器**：`historical_collector.py` - 一次性运行，采集所有平台的历史数据并归档
2. **日常数据管理器**：`daily_calendar.py` - 每日运行，采集未来数据并检测变更
3. **数据导出工具**：`export_data.py` - 将数据导出为网页可用的格式
4. **网页查询界面**：提供直观的数据查询和展示功能

## 使用方法

### 安装依赖

```bash
pip install -r requirements.txt
```

### 初始化系统

1. 采集历史数据（如果尚未运行过）

```bash
python historical_collector.py
```

2. 首次运行日常采集

```bash
python daily_calendar.py --first-run
```

3. 导出数据供网页使用

```bash
python export_data.py
```

### 日常使用

每日运行以下命令更新数据：

```bash
python daily_calendar.py --daily --export
```

### 命令行选项

- `--first-run`: 首次运行模式
- `--daily`: 日常更新模式
- `--collect`: 只采集数据
- `--detect`: 只检测变更
- `--export`: 导出数据供网页使用
- `--status`: 显示系统状态

## 数据目录结构

```
./data/
  ├── active/
  │   ├── current/  # 当前活跃数据
  │   └── previous/ # 上一次的数据（用于比较）
  └── archived/     # 归档数据
      ├── 2025/
      │   ├── 01月/
      │   └── 02月/
      └── 2026/
          ├── 01月/
          └── 02月/
```

## 网页访问

系统提供网页查询界面，可通过以下方式访问：

1. 本地访问：直接打开 `docs/index.html` 文件
2. GitHub Pages: 访问 https://lijiang-0920.github.io/investment-calendar/
