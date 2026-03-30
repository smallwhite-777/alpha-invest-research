# Information structurer for knowledge base content

import re
from typing import Dict, List, Any, Optional
from dataclasses import dataclass


@dataclass
class StructuredInfo:
    """Structured information from a research report"""
    title: str
    summary: str
    key_points: List[str]
    financial_data: Dict[str, Any]
    risks: List[str]
    opportunities: List[str]
    valuation: Optional[str]
    recommendation: Optional[str]
    source: str
    company_name: str
    stock_code: str
    broker: Optional[str] = None
    date: Optional[str] = None


class InfoStructurer:
    """Structure raw content into organized information"""

    def __init__(self):
        # Patterns for extracting different sections
        self.section_patterns = {
            "summary": [
                r"(?:核心观点|投资要点|摘要|Summary)[:\s]*\n(.*?)(?=\n#|\n##|\Z)",
            ],
            "key_points": [
                r"(?:关键点|核心逻辑|主要观点)[:\s]*\n((?:[-•*].+\n?)+)",
            ],
            "risks": [
                r"(?:风险提示|风险因素|风险)[:\s]*\n((?:[-•*].+\n?)+)",
            ],
            "opportunities": [
                r"(?:机遇|机会|增长点)[:\s]*\n((?:[-•*].+\n?)+)",
            ],
            "valuation": [
                r"(?:估值分析|估值)[:\s]*\n(.*?)(?=\n#|\n##|\Z)",
            ],
            "recommendation": [
                r"(?:投资建议|评级|推荐)[:\s]*\n(.*?)(?=\n#|\n##|\Z)",
            ]
        }

    def structure_content(
        self,
        content: str,
        company_name: str = "",
        stock_code: str = "",
        source: str = "",
        broker: Optional[str] = None,
        date: Optional[str] = None
    ) -> StructuredInfo:
        """
        Structure raw content into organized information

        Args:
            content: Raw text content from the report
            company_name: Company name
            stock_code: Stock code
            source: Source file path
            broker: Broker/research firm name
            date: Report date

        Returns:
            StructuredInfo object
        """
        # Extract title
        title = self._extract_title(content)

        # Extract different sections
        summary = self._extract_section(content, "summary")
        key_points = self._extract_list_section(content, "key_points")
        risks = self._extract_list_section(content, "risks")
        opportunities = self._extract_list_section(content, "opportunities")
        valuation = self._extract_section(content, "valuation")
        recommendation = self._extract_section(content, "recommendation")

        # Extract financial data
        financial_data = self._extract_financial_data(content)

        return StructuredInfo(
            title=title,
            summary=summary,
            key_points=key_points,
            financial_data=financial_data,
            risks=risks,
            opportunities=opportunities,
            valuation=valuation,
            recommendation=recommendation,
            source=source,
            company_name=company_name,
            stock_code=stock_code,
            broker=broker,
            date=date
        )

    def _extract_title(self, content: str) -> str:
        """Extract title from content"""
        # Try first heading
        match = re.search(r"^#\s+(.+)$", content, re.MULTILINE)
        if match:
            return match.group(1).strip()

        # Try first line
        first_line = content.split("\n")[0].strip()
        if first_line and len(first_line) < 100:
            return first_line

        return "无标题"

    def _extract_section(self, content: str, section_type: str) -> str:
        """Extract a specific section from content"""
        patterns = self.section_patterns.get(section_type, [])

        for pattern in patterns:
            match = re.search(pattern, content, re.DOTALL | re.IGNORECASE)
            if match:
                text = match.group(1).strip()
                # Clean up
                text = re.sub(r"\n{3,}", "\n\n", text)
                return text

        return ""

    def _extract_list_section(self, content: str, section_type: str) -> List[str]:
        """Extract a list section from content"""
        patterns = self.section_patterns.get(section_type, [])

        for pattern in patterns:
            match = re.search(pattern, content, re.DOTALL | re.IGNORECASE)
            if match:
                text = match.group(1).strip()
                # Extract list items
                items = re.findall(r"[-•*]\s*(.+)", text)
                return [item.strip() for item in items if item.strip()]

        return []

    def _extract_financial_data(self, content: str) -> Dict[str, Any]:
        """Extract financial data mentions from content"""
        data = {}

        # Revenue patterns
        revenue_match = re.search(
            r"(?:营收|收入|营业收入)[：:\s]*([\d.]+)\s*(亿|万)?",
            content
        )
        if revenue_match:
            data["revenue"] = {
                "value": revenue_match.group(1),
                "unit": revenue_match.group(2) or ""
            }

        # Profit patterns
        profit_match = re.search(
            r"(?:净利润|利润)[：:\s]*([\d.]+)\s*(亿|万)?",
            content
        )
        if profit_match:
            data["profit"] = {
                "value": profit_match.group(1),
                "unit": profit_match.group(2) or ""
            }

        # PE ratio
        pe_match = re.search(r"(?:PE|市盈率)[：:\s]*([\d.]+)", content)
        if pe_match:
            data["pe_ratio"] = pe_match.group(1)

        # Growth rate
        growth_match = re.search(
            r"(?:增长率|同比)[：:\s]*(-?[\d.]+)\s*%?",
            content
        )
        if growth_match:
            data["growth_rate"] = growth_match.group(1)

        return data

    def format_for_context(
        self,
        structured_infos: List[StructuredInfo],
        max_length: int = 6000
    ) -> str:
        """
        Format structured information for LLM context

        Args:
            structured_infos: List of StructuredInfo objects
            max_length: Maximum context length

        Returns:
            Formatted context string
        """
        context_parts = []
        current_length = 0

        for info in structured_infos:
            part = self._format_single(info)

            if current_length + len(part) > max_length:
                break

            context_parts.append(part)
            current_length += len(part)

        return "\n\n---\n\n".join(context_parts)

    def _format_single(self, info: StructuredInfo) -> str:
        """Format a single StructuredInfo for context"""
        lines = []

        # Header
        header = f"## {info.title}"
        if info.company_name:
            header += f" - {info.company_name}"
        if info.stock_code:
            header += f" ({info.stock_code})"
        lines.append(header)

        # Source info
        source_info = []
        if info.broker:
            source_info.append(f"来源: {info.broker}")
        if info.date:
            source_info.append(f"日期: {info.date}")
        if source_info:
            lines.append(" | ".join(source_info))

        lines.append("")

        # Summary
        if info.summary:
            lines.append(f"### 核心观点\n{info.summary}\n")

        # Key points
        if info.key_points:
            lines.append("### 关键要点")
            for point in info.key_points[:5]:
                lines.append(f"- {point}")
            lines.append("")

        # Financial data
        if info.financial_data:
            lines.append("### 关键数据")
            for key, value in info.financial_data.items():
                if isinstance(value, dict):
                    lines.append(f"- {key}: {value.get('value', '')} {value.get('unit', '')}")
                else:
                    lines.append(f"- {key}: {value}")
            lines.append("")

        # Risks
        if info.risks:
            lines.append("### 风险提示")
            for risk in info.risks[:3]:
                lines.append(f"- {risk}")
            lines.append("")

        # Recommendation
        if info.recommendation:
            lines.append(f"### 投资建议\n{info.recommendation}\n")

        return "\n".join(lines)