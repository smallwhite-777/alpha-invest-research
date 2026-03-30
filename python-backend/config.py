# Configuration for Multi-Agent Investment Research System

import os
import logging
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env.local in parent directory
env_path = Path(__file__).parent.parent / '.env.local'
load_dotenv(env_path)

# Base paths
BASE_DIR = Path(__file__).parent.parent

# ============== KNOWLEDGE BASE DIRECTORIES ==============
# All directories are in the unified Knowledgebase folder
KNOWLEDGE_BASE_DIR = Path(r"D:\投研web 3\投研网站 3\Knowledgebase")
RESEARCH_REPORTS_DIR = KNOWLEDGE_BASE_DIR / "Reserach Reports"
NEWS_DIR = KNOWLEDGE_BASE_DIR / "News"
FINANCIAL_REPORTS_DIR = KNOWLEDGE_BASE_DIR / "Financial Reports"
DAILY_QUOTE_DIR = KNOWLEDGE_BASE_DIR / "daily_quote_by_code_csv"

# ============== INDEX CONFIGURATION ==============
# Knowledge base index for fast searching
INDEX_DIR = BASE_DIR / "python-backend" / "data"
INDEX_PATH = INDEX_DIR / "knowledge_index.json"
INDEX_AUTO_UPDATE = True          # Auto-check for changes
INDEX_UPDATE_INTERVAL = 600       # Check every 10 minutes (seconds)
INDEX_ENABLED = True              # Enable/disable index usage

# ============== SAFE DEFAULTS FOR SEARCH ==============
# These prevent the system from hanging on large knowledge bases
MAX_CANDIDATE_FILES = 15        # Max files to consider in Phase 1
MAX_READ_CHARS = 8000           # Max chars per file
MAX_CONTENT_LENGTH = 40000      # Max total context length
SEARCH_TIMEOUT = 30             # Timeout for search (seconds)
MAX_RETURN_SNIPPETS = 5         # Max results to return
FILE_READ_TIMEOUT = 5           # Timeout per file read

# ============== LLM PROVIDERS ==============
# Simplified to MiniMax models only with fallback options
LLM_PROVIDERS = {
    "minimax": {
        "api_key": os.getenv("MINIMAX_API_KEY", ""),
        "base_url": "https://api.minimaxi.com/v1",
        "model": "MiniMax-M2.7",
        "supports_web_search": True  # MiniMax supports web search
    },
    "minimax_highspeed": {
        "api_key": os.getenv("MINIMAX_API_KEY", ""),
        "base_url": "https://api.minimaxi.com/v1",
        "model": "MiniMax-M2.7-highspeed",
        "supports_web_search": True
    },
    "deepseek": {
        "api_key": os.getenv("DEEPSEEK_API_KEY", ""),
        "base_url": "https://api.deepseek.com/v1",
        "model": "deepseek-chat",
        "supports_web_search": False
    },
}

# Default to MiniMax, fallback to DeepSeek if not configured
DEFAULT_PROVIDER = os.getenv("LLM_PROVIDER", os.getenv("DEFAULT_AI_PROVIDER", "minimax"))

# ============== INDUSTRY-SPECIFIC METRICS ==============
# Comprehensive metrics library for different industries
INDUSTRY_METRICS = {
    # 白酒行业
    "白酒": {
        "key_metrics": ["高端酒占比", "基酒储量", "批条率", "动销率", "库存周期", "预收款"],
        "leading_indicators": ["批条价", "终端动销", "渠道库存", "茅台批价"],
        "risk_factors": ["需求放缓", "库存积压", "价格倒挂", "政策限制", "消费降级"],
        "valuation_method": ["PE历史分位", "PEG", "股息率"],
    },

    # 银行
    "银行": {
        "key_metrics": ["净息差(NIM)", "不良率", "拨备覆盖率", "资本充足率", "净利差", "ROE"],
        "leading_indicators": ["社融数据", "贷款需求", "存款利率", "LPR变化"],
        "risk_factors": ["资产质量恶化", "息差收窄", "资本补充压力", "地产风险暴露"],
        "valuation_method": ["PB", "股息率", "PE"],
    },

    # 半导体
    "半导体": {
        "key_metrics": ["产能利用率", "订单可见度", "封装良率", "国产化率", "研发投入占比"],
        "leading_indicators": ["设备订单(BOOKINGS)", "产能释放节奏", "下游需求", "库存周转天数"],
        "risk_factors": ["技术封锁", "竞争加剧", "周期下行", "资本开支过大"],
        "valuation_method": ["PS", "PEG", "EV/EBITDA"],
    },

    # 光伏
    "光伏": {
        "key_metrics": ["组件价格", "招标量", "装机量", "出口数据", "产能利用率", "单瓦盈利"],
        "leading_indicators": ["硅料价格", "组件成本", "政策力度", "装机预期"],
        "risk_factors": ["产能过剩", "价格战", "贸易摩擦", "技术迭代"],
        "valuation_method": ["PE", "PEG", "PB"],
    },

    # 新能源车
    "新能源车": {
        "key_metrics": ["渗透率", "单车盈利", "市占率", "出口量", "交付量", "产能利用率"],
        "leading_indicators": ["上险数据", "订单量", "电池成本", "政策补贴"],
        "risk_factors": ["价格战", "增速放缓", "原材料波动", "产能过剩"],
        "valuation_method": ["PS", "PEG", "EV/Sales"],
    },

    # 医药
    "医药": {
        "key_metrics": ["研发投入占比", "管线进度", "准入情况", "医保谈判", "毛利率"],
        "leading_indicators": ["临床数据", "审批进展", "销售表现", "集采结果"],
        "risk_factors": ["集采降价", "研发失败", "竞争恶化", "合规风险"],
        "valuation_method": ["PE", "rNPV", "PS(研发阶段)"],
    },

    # 锂电/电池
    "锂电": {
        "key_metrics": ["出货量", "产能利用率", "单Wh盈利", "市占率", "技术路线"],
        "leading_indicators": ["排产数据", "锂价", "下游需求", "库存水平"],
        "risk_factors": ["产能过剩", "价格战", "技术路线变化", "原材料波动"],
        "valuation_method": ["PE", "PEG", "PB"],
    },

    # 煤炭
    "煤炭": {
        "key_metrics": ["吨煤成本", "吨煤售价", "产销率", "长协比例", "分红率"],
        "leading_indicators": ["港口煤价", "电厂日耗", "库存天数", "安监力度"],
        "risk_factors": ["价格下跌", "需求萎缩", "政策限制", "安全事故"],
        "valuation_method": ["PB", "股息率", "EV/EBITDA"],
    },

    # 黄金/有色金属
    "黄金": {
        "key_metrics": ["吨矿成本", "储量", "产量", "品位", "毛利率"],
        "leading_indicators": ["金价", "美元指数", "实际利率", "避险情绪"],
        "risk_factors": ["价格波动", "产量不及预期", "成本上升", "资源枯竭"],
        "valuation_method": ["PB", "EV/资源储量", "PE"],
    },

    "有色金属": {
        "key_metrics": ["吨加工费", "产能利用率", "库存水平", "毛利率"],
        "leading_indicators": ["LME价格", "TC/RC", "下游需求", "库存变化"],
        "risk_factors": ["价格波动", "需求萎缩", "环保限产", "成本上升"],
        "valuation_method": ["PB", "PE", "EV/EBITDA"],
    },

    # 地产
    "地产": {
        "key_metrics": ["销售额", "拿地金额", "土储建面", "净负债率", "现金短债比"],
        "leading_indicators": ["销售回款", "拿地节奏", "政策变化", "按揭利率"],
        "risk_factors": ["销售下滑", "资金链断裂", "交付风险", "政策收紧"],
        "valuation_method": ["PB", "RNAV", "股息率"],
    },

    # 军工
    "军工": {
        "key_metrics": ["订单金额", "产能利用率", "良品率", "研发投入", "毛利率"],
        "leading_indicators": ["军费预算", "型号定型", "订单释放", "产能扩张"],
        "risk_factors": ["订单波动", "型号停产", "价格调整", "保密合规"],
        "valuation_method": ["PE", "PEG", "PS"],
    },

    # AI/算力
    "AI算力": {
        "key_metrics": ["算力规模", "利用率", "单卡收入", "客户结构", "毛利率"],
        "leading_indicators": ["GPU需求", "大模型训练需求", "云计算需求", "资本开支"],
        "risk_factors": ["技术迭代", "竞争加剧", "下游需求波动", "供应链风险"],
        "valuation_method": ["PS", "EV/Revenue", "PEG"],
    },

    # 消费
    "消费": {
        "key_metrics": ["同店增长", "客单价", "门店数", "复购率", "毛利率"],
        "leading_indicators": ["社零数据", "消费信心指数", "渠道库存", "促销力度"],
        "risk_factors": ["消费降级", "竞争加剧", "渠道变革", "品牌老化"],
        "valuation_method": ["PE", "PEG", "DCF"],
    },

    # 互联网
    "互联网": {
        "key_metrics": ["DAU/MAU", "ARPU", "GMV", "变现率", "毛利率"],
        "leading_indicators": ["用户增长", "时长占比", "广告预算", "电商渗透"],
        "risk_factors": ["监管风险", "竞争加剧", "用户增长见顶", "变现压力"],
        "valuation_method": ["PE", "PS", "PEG"],
    },
}

# ============== FLASK SETTINGS ==============
FLASK_CONFIG = {
    "host": "0.0.0.0",
    "port": 5003,  # Changed from 5002 due to port conflict
    "debug": True
}

# ============== LOGGING ==============
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Log configuration on startup
logger = logging.getLogger(__name__)
logger.info(f"Configuration loaded:")
logger.info(f"  KNOWLEDGE_BASE_DIR: {KNOWLEDGE_BASE_DIR}")
logger.info(f"  MAX_CANDIDATE_FILES: {MAX_CANDIDATE_FILES}")
logger.info(f"  MAX_READ_CHARS: {MAX_READ_CHARS}")
logger.info(f"  SEARCH_TIMEOUT: {SEARCH_TIMEOUT}")