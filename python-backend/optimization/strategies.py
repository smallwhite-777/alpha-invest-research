"""
Optimization Strategies
Defines strategies for improving workflow output quality
"""

import json
import re
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Callable
from enum import Enum
from pathlib import Path
import copy


class OptimizationStrategy(Enum):
    """Available optimization strategies"""
    PROMPT_REFINEMENT = "prompt_refinement"           # Optimize system/user prompts
    SEARCH_EXPANSION = "search_expansion"             # Expand search scope
    EXTRACTION_ENHANCEMENT = "extraction_enhancement" # Improve data extraction
    STRUCTURE_TEMPLATE = "structure_template"         # Add output structure template
    CROSS_VALIDATION = "cross_validation"             # Enhance cross-validation
    CONTEXT_ENRICHMENT = "context_enrichment"         # Enrich context with more data
    YEAR_COMPARISON = "year_comparison"               # Add year-over-year comparison
    TABLE_FORMATTING = "table_formatting"             # Improve table formatting


@dataclass
class OptimizationResult:
    """Result of applying an optimization"""
    strategy: OptimizationStrategy
    success: bool
    changes_made: List[str]
    config_changes: Dict[str, Any] = field(default_factory=dict)
    error: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            'strategy': self.strategy.value,
            'success': self.success,
            'changes_made': self.changes_made,
            'config_changes': self.config_changes,
            'error': self.error,
        }


class BaseOptimizer:
    """Base class for optimizers"""

    def __init__(self, config_path: Optional[str] = None):
        self.config_path = config_path
        self.config = self._load_config() if config_path else {}

    def _load_config(self) -> Dict[str, Any]:
        """Load configuration from file"""
        if self.config_path and Path(self.config_path).exists():
            with open(self.config_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {}

    def _save_config(self) -> bool:
        """Save configuration to file"""
        if not self.config_path:
            return False
        try:
            with open(self.config_path, 'w', encoding='utf-8') as f:
                json.dump(self.config, f, ensure_ascii=False, indent=2)
            return True
        except Exception as e:
            print(f"Failed to save config: {e}")
            return False

    def apply(self, analysis: Dict[str, Any]) -> OptimizationResult:
        """Apply optimization - to be implemented by subclasses"""
        raise NotImplementedError


class PromptOptimizer(BaseOptimizer):
    """
    Optimizes prompts used in the workflow

    Strategies:
    - Add specific instructions for financial data extraction
    - Add structure templates to prompts
    - Add examples for better output formatting
    """

    # Default prompt improvements
    PROMPT_IMPROVEMENTS = {
        'financial_analysis': {
            'additions': [
                "请按以下结构输出分析报告：",
                "1. 核心财务数据对比（表格形式，包含同比变化）",
                "2. 关键发现（逐条列出）",
                "3. 业务结构分析",
                "4. 一句话总结",
                "",
                "注意事项：",
                "- 所有关键财务指标必须包含具体数值",
                "- 年度对比数据必须完整",
                "- 变化幅度需标注百分比",
            ],
        },
        'data_extraction': {
            'additions': [
                "数据提取要求：",
                "- 营业收入、净利润、毛利率等核心指标必须精确到小数点后两位",
                "- 同比变化必须计算并标注",
                "- 多年数据需以表格形式呈现",
            ],
        },
    }

    def apply(self, analysis: Dict[str, Any]) -> OptimizationResult:
        """
        Apply prompt optimization

        Args:
            analysis: Analysis of test failure containing suggestions

        Returns:
            OptimizationResult
        """
        changes = []
        config_changes = {}

        # Check what needs improvement
        missing_data = analysis.get('missing_data_points', [])
        inaccurate_data = analysis.get('inaccurate_data', [])
        structure_diff = analysis.get('structure_diff', {})

        # Determine which prompt improvements to apply
        improvements_to_apply = []

        if missing_data or inaccurate_data:
            improvements_to_apply.extend(self.PROMPT_IMPROVEMENTS['data_extraction']['additions'])
            changes.append("Added data extraction instructions to prompt")

        if structure_diff.get('missing_sections'):
            improvements_to_apply.extend(self.PROMPT_IMPROVEMENTS['financial_analysis']['additions'])
            changes.append("Added structure template to prompt")

        if improvements_to_apply:
            config_changes['prompt_additions'] = improvements_to_apply

            # Update config
            if 'prompts' not in self.config:
                self.config['prompts'] = {}

            self.config['prompts']['additional_instructions'] = improvements_to_apply
            self._save_config()

        return OptimizationResult(
            strategy=OptimizationStrategy.PROMPT_REFINEMENT,
            success=len(changes) > 0,
            changes_made=changes,
            config_changes=config_changes,
        )


class SearchOptimizer(BaseOptimizer):
    """
    Optimizes search and data retrieval

    Strategies:
    - Expand search keywords
    - Add more data sources
    - Improve year filtering
    """

    # Additional keywords for common metrics
    # Generic keyword expansions - applicable to ALL companies/industries
    # These are domain-agnostic patterns, not company-specific
    KEYWORD_EXPANSIONS = {
        # Financial metrics (universal across all companies)
        '营业收入': ['营收', '总收入', '营业总收入', '收入', '主营收入'],
        '净利润': ['归母净利润', '净利', '利润', '归母净利', '净利润'],
        '毛利润': ['毛利', '毛利润'],
        '毛利率': ['综合毛利率', '毛利', '销售毛利率'],
        '净利率': ['销售净利率', '净利润率'],
        'ROE': ['净资产收益率', '回报率', '股东回报率'],
        'ROA': ['总资产收益率', '资产回报率'],
        '现金流': ['经营性现金流', '经营现金流', '现金流量', '经营活动现金流'],
        '总资产': ['资产总计', '资产总额'],
        '净资产': ['股东权益', '所有者权益', '归母净资产'],
        '资产负债率': ['负债率', '资产负债比率'],
        '每股收益': ['EPS', '基本每股收益'],

        # Generic production/output keywords (industry-agnostic)
        '产量': ['生产量', '产出', '产量数据', '产能'],
        '销量': ['销售量', '出货量'],
        '产能': ['生产能力', '产能利用率'],

        # Generic company identifiers
        '公司': ['股份', '集团', '有限'],
    }

    # Industry-specific keyword patterns (loaded dynamically, not hardcoded)
    INDUSTRY_PATTERNS = {
        'mining': {
            'keywords': ['矿产', '矿山', '采矿', '选矿'],
            'products': ['铜', '金', '银', '锌', '铅', '铁', '铝', '锂', '镍'],
            'units': ['万吨', '吨', '千克'],
        },
        'technology': {
            'keywords': ['软件', '硬件', '平台', '服务'],
            'products': ['产品', '解决方案', '服务'],
            'units': ['套', '件', '次'],
        },
        'manufacturing': {
            'keywords': ['制造', '生产', '加工'],
            'products': ['产品', '零件', '组件'],
            'units': ['万件', '件', '吨'],
        },
    }

    def _detect_industry(self, missing_data: List[str]) -> Optional[str]:
        """Detect industry from missing data patterns"""
        missing_str = ' '.join(str(m) for m in missing_data)

        for industry, patterns in self.INDUSTRY_PATTERNS.items():
            for keyword in patterns['keywords']:
                if keyword in missing_str:
                    return industry

        return None

    def _generate_industry_keywords(self, industry: str, missing_data: List[str]) -> Dict[str, List[str]]:
        """Generate industry-specific keywords based on context"""
        if industry not in self.INDUSTRY_PATTERNS:
            return {}

        patterns = self.INDUSTRY_PATTERNS[industry]
        expanded = {}

        # Find product names in missing data
        missing_str = ' '.join(str(m) for m in missing_data)
        for product in patterns['products']:
            if product in missing_str:
                # Generate product-specific keywords
                key = f'矿产{product}' if industry == 'mining' else f'{product}产量'
                expanded[key] = [
                    f'{product}产量',
                    f'{product}生产',
                    f'{product}产量数据',
                ]

        return expanded

    def apply(self, analysis: Dict[str, Any]) -> OptimizationResult:
        """
        Apply search optimization - generates keywords dynamically based on context

        Args:
            analysis: Analysis of test failure

        Returns:
            OptimizationResult
        """
        changes = []
        config_changes = {}

        missing_data = analysis.get('missing_data_points', [])

        # Expand keywords for missing data using generic patterns
        expanded_keywords = {}
        for missing in missing_data:
            # Extract metric name from string like "营业收入: 2934亿元"
            metric_match = re.match(r'([^:]+)', str(missing))
            if metric_match:
                metric = metric_match.group(1).strip()
                # Check if metric matches any known generic pattern
                for key, expansions in self.KEYWORD_EXPANSIONS.items():
                    if key in metric or metric in key:
                        expanded_keywords[key] = expansions
                        changes.append(f"Expanded keywords for '{key}'")

        # Detect industry and generate industry-specific keywords dynamically
        industry = self._detect_industry(missing_data)
        if industry:
            industry_keywords = self._generate_industry_keywords(industry, missing_data)
            if industry_keywords:
                expanded_keywords.update(industry_keywords)
                changes.append(f"Generated {industry} industry keywords dynamically")

        if expanded_keywords:
            config_changes['keyword_expansions'] = expanded_keywords

            # Update config
            if 'search' not in self.config:
                self.config['search'] = {}

            if 'keyword_expansions' not in self.config['search']:
                self.config['search']['keyword_expansions'] = {}

            self.config['search']['keyword_expansions'].update(expanded_keywords)

            try:
                self._save_config()
            except Exception as e:
                # Ignore save errors, still return success
                pass

        # Return success if we made any changes
        return OptimizationResult(
            strategy=OptimizationStrategy.SEARCH_EXPANSION,
            success=len(changes) > 0,
            changes_made=changes,
            config_changes=config_changes,
        )


class ExtractionOptimizer(BaseOptimizer):
    """
    Optimizes data extraction patterns

    Strategies:
    - Add new extraction patterns
    - Improve data validation
    - Add fallback extraction methods
    """

    # Additional extraction patterns
    EXTRACTION_PATTERNS = {
        'year_over_year': [
            r'(\d{4})年\s*([^:：]+)[：:]\s*([\d,\.]+)\s*(亿元|万元|%)',
            r'(\d{4})\s*([^\d]+)\s*([\d,\.]+)\s*(亿元|万元|%)',
        ],
        'comparison': [
            r'([\d,\.]+)\s*(亿元|万元|%)?\s*[→→]\s*([\d,\.]+)\s*(亿元|万元|%)?',
            r'([\d,\.]+)\s*(亿元|万元|%)?\s*→\s*([\d,\.]+)\s*(亿元|万元|%)?',
        ],
        'change_rate': [
            r'([+-]?\s*[\d,\.]+)\s*%',  # +3.49% or -5.2%
            r'[↑↓]\s*([\d,\.]+)\s*(pct|百分点)?',  # ↑4.46pct
        ],
    }

    def apply(self, analysis: Dict[str, Any]) -> OptimizationResult:
        """
        Apply extraction optimization

        Args:
            analysis: Analysis of test failure

        Returns:
            OptimizationResult
        """
        changes = []
        config_changes = {}

        missing_data = analysis.get('missing_data_points', [])
        inaccurate_data = analysis.get('inaccurate_data', [])

        patterns_to_add = {}

        # Check for year-over-year data needs
        if any('同比' in str(m) or '变化' in str(m) for m in missing_data):
            patterns_to_add['year_over_year'] = self.EXTRACTION_PATTERNS['year_over_year']
            changes.append("Added year-over-year extraction patterns")

        # Check for comparison data needs
        if any('→' in str(m) or '对比' in str(m) for m in missing_data):
            patterns_to_add['comparison'] = self.EXTRACTION_PATTERNS['comparison']
            changes.append("Added comparison extraction patterns")

        if patterns_to_add:
            config_changes['extraction_patterns'] = patterns_to_add

            # Update config
            if 'extraction' not in self.config:
                self.config['extraction'] = {}

            if 'patterns' not in self.config['extraction']:
                self.config['extraction']['patterns'] = {}

            self.config['extraction']['patterns'].update(patterns_to_add)
            self._save_config()

        return OptimizationResult(
            strategy=OptimizationStrategy.EXTRACTION_ENHANCEMENT,
            success=len(changes) > 0,
            changes_made=changes,
            config_changes=config_changes,
        )


class StructureOptimizer(BaseOptimizer):
    """
    Optimizes output structure

    Strategies:
    - Add output templates
    - Enforce section structure
    - Add table formatting requirements
    """

    # Output templates
    OUTPUT_TEMPLATES = {
        'financial_analysis': """
## 核心财务数据对比

| 指标 | 2023年 | 2024年 | 同比变化 |
|------|--------|--------|----------|
| 营业收入 | ... | ... | ...% |
| 净利润 | ... | ... | ...% |
| 毛利率 | ... | ... | ...pct |

## 关键发现

1. ...
2. ...
3. ...

## 业务结构

- 业务A: 占比 XX%
- 业务B: 占比 XX%

## 一句话总结

...
""",
        'year_comparison': """
## 年度对比分析

### {year1}年
- 营业收入: ...亿元
- 净利润: ...亿元

### {year2}年
- 营业收入: ...亿元
- 净利润: ...亿元

### 同比变化
- 收入增长: ...%
- 利润增长: ...%
""",
    }

    def apply(self, analysis: Dict[str, Any]) -> OptimizationResult:
        """
        Apply structure optimization

        Args:
            analysis: Analysis of test failure

        Returns:
            OptimizationResult
        """
        changes = []
        config_changes = {}

        structure_diff = analysis.get('structure_diff', {})
        missing_sections = structure_diff.get('missing_sections', [])

        templates_to_add = {}

        # Add templates for missing sections
        if any(s in ['核心财务数据', '财务数据', '关键指标'] for s in missing_sections):
            templates_to_add['financial_analysis'] = self.OUTPUT_TEMPLATES['financial_analysis']
            changes.append("Added financial analysis output template")

        if any('同比' in str(s) or '对比' in str(s) for s in missing_sections):
            templates_to_add['year_comparison'] = self.OUTPUT_TEMPLATES['year_comparison']
            changes.append("Added year comparison output template")

        # Check for table needs
        if structure_diff.get('expected_tables', 0) > structure_diff.get('actual_tables', 0):
            changes.append("Added table formatting requirements to template")

        if templates_to_add:
            config_changes['output_templates'] = templates_to_add

            # Update config
            if 'output' not in self.config:
                self.config['output'] = {}

            if 'templates' not in self.config['output']:
                self.config['output']['templates'] = {}

            self.config['output']['templates'].update(templates_to_add)
            self._save_config()

        return OptimizationResult(
            strategy=OptimizationStrategy.STRUCTURE_TEMPLATE,
            success=len(changes) > 0,
            changes_made=changes,
            config_changes=config_changes,
        )


class OptimizationStrategySelector:
    """
    Selects appropriate optimization strategies based on test results
    """

    def __init__(self, config_path: Optional[str] = None):
        self.prompt_optimizer = PromptOptimizer(config_path)
        self.search_optimizer = SearchOptimizer(config_path)
        self.extraction_optimizer = ExtractionOptimizer(config_path)
        self.structure_optimizer = StructureOptimizer(config_path)

    def analyze_failure(self, test_result: Any) -> Dict[str, Any]:
        """
        Analyze test failure and extract relevant information

        Args:
            test_result: TestResult object from TesterAgent

        Returns:
            Analysis dict with missing data, inaccurate data, structure issues
        """
        evaluation = test_result.evaluation

        return {
            'score': evaluation.overall_score,
            'dimension_scores': evaluation.dimension_scores,
            'missing_data_points': evaluation.missing_data_points,
            'inaccurate_data': evaluation.inaccurate_data,
            'structure_diff': evaluation.structure_diff,
            'suggestions': evaluation.suggestions,
        }

    def select_strategies(self, analysis: Dict[str, Any]) -> List[OptimizationStrategy]:
        """
        Select appropriate strategies based on analysis

        Args:
            analysis: Analysis from analyze_failure

        Returns:
            List of strategies to apply (in order of priority)
        """
        strategies = []

        dimension_scores = analysis.get('dimension_scores', {})

        # Low data coverage -> search and extraction improvements
        data_coverage = dimension_scores.get('data_coverage', 1.0)
        if data_coverage < 0.7:
            strategies.append(OptimizationStrategy.SEARCH_EXPANSION)
            strategies.append(OptimizationStrategy.EXTRACTION_ENHANCEMENT)

        # Low structure score -> structure template
        structure_score = dimension_scores.get('structure', 1.0)
        if structure_score < 0.7:
            strategies.append(OptimizationStrategy.STRUCTURE_TEMPLATE)

        # Low accuracy -> extraction improvements
        accuracy_score = dimension_scores.get('accuracy', 1.0)
        if accuracy_score < 0.8:
            strategies.append(OptimizationStrategy.EXTRACTION_ENHANCEMENT)

        # General prompt improvements if score is low
        if analysis.get('score', 1.0) < 0.8:
            strategies.append(OptimizationStrategy.PROMPT_REFINEMENT)

        # Remove duplicates while preserving order
        seen = set()
        unique_strategies = []
        for s in strategies:
            if s not in seen:
                seen.add(s)
                unique_strategies.append(s)

        return unique_strategies

    def apply_strategy(
        self,
        strategy: OptimizationStrategy,
        analysis: Dict[str, Any]
    ) -> OptimizationResult:
        """
        Apply a specific strategy

        Args:
            strategy: Strategy to apply
            analysis: Analysis of test failure

        Returns:
            OptimizationResult
        """
        optimizers = {
            OptimizationStrategy.PROMPT_REFINEMENT: self.prompt_optimizer,
            OptimizationStrategy.SEARCH_EXPANSION: self.search_optimizer,
            OptimizationStrategy.EXTRACTION_ENHANCEMENT: self.extraction_optimizer,
            OptimizationStrategy.STRUCTURE_TEMPLATE: self.structure_optimizer,
        }

        optimizer = optimizers.get(strategy)
        if optimizer:
            return optimizer.apply(analysis)

        return OptimizationResult(
            strategy=strategy,
            success=False,
            changes_made=[],
            error=f"Unknown strategy: {strategy}",
        )