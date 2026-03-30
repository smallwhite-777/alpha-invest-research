# Result Formatting Agent
# Formats LLM output into structured, readable responses

import re
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from enum import Enum

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from agents.intent_agent import IntentType


class OutputFormat(Enum):
    """Output format types"""
    MARKDOWN = "markdown"
    HTML = "html"
    JSON = "json"


@dataclass
class FormattedResult:
    """Formatted result from the agent"""
    content: str                    # Main content
    sources: List[Dict[str, str]]   # Source citations
    format: OutputFormat            # Output format
    metadata: Dict[str, Any]        # Additional metadata
    sections: Optional[List[Dict]] = None  # Structured sections


class ResultAgent:
    """
    Agent for formatting LLM outputs
    Adds citations, structures content, and formats for display
    """

    def __init__(self, default_format: OutputFormat = OutputFormat.MARKDOWN):
        self.default_format = default_format

    def format_result(
        self,
        llm_response: str,
        sources: List[Dict[str, str]],
        intent_type: IntentType,
        output_format: Optional[OutputFormat] = None
    ) -> FormattedResult:
        """
        Format LLM response into structured output

        Args:
            llm_response: Raw response from LLM
            sources: List of sources from SearchAgent
            intent_type: Intent type from IntentAgent
            output_format: Desired output format

        Returns:
            FormattedResult with formatted content
        """
        if output_format is None:
            output_format = self.default_format

        # Clean up the response
        cleaned_response = self._clean_response(llm_response)

        # Extract sections if possible
        sections = self._extract_sections(cleaned_response)

        # Add source citations
        cited_response = self._add_citations(cleaned_response, sources)

        # Format based on output type
        if output_format == OutputFormat.HTML:
            formatted_content = self._to_html(cited_response)
        elif output_format == OutputFormat.JSON:
            formatted_content = self._to_json(cited_response, sections)
        else:
            formatted_content = cited_response

        return FormattedResult(
            content=formatted_content,
            sources=self._format_sources(sources),
            format=output_format,
            metadata={
                "intent_type": intent_type.value,
                "source_count": len(sources),
                "section_count": len(sections) if sections else 0
            },
            sections=sections
        )

    def _clean_response(self, response: str) -> str:
        """Clean up LLM response"""
        # Remove excessive newlines
        cleaned = re.sub(r"\n{3,}", "\n\n", response)

        # Remove any system-level instructions that might have leaked
        cleaned = re.sub(r"^(SYSTEM|USER|ASSISTANT):.*$", "", cleaned, flags=re.MULTILINE)

        # Trim whitespace
        cleaned = cleaned.strip()

        return cleaned

    def _extract_sections(self, response: str) -> List[Dict[str, str]]:
        """Extract sections from markdown-formatted response"""
        sections = []

        # Match markdown headings
        pattern = r"^(#{1,3})\s+(.+)$"
        lines = response.split("\n")

        current_section = None
        current_content = []

        for line in lines:
            match = re.match(pattern, line)
            if match:
                # Save previous section
                if current_section:
                    current_section["content"] = "\n".join(current_content).strip()
                    sections.append(current_section)

                # Start new section
                level = len(match.group(1))
                title = match.group(2)
                current_section = {
                    "level": level,
                    "title": title,
                    "content": ""
                }
                current_content = []
            else:
                if current_section:
                    current_content.append(line)

        # Save last section
        if current_section:
            current_section["content"] = "\n".join(current_content).strip()
            sections.append(current_section)

        return sections

    def _add_citations(
        self,
        response: str,
        sources: List[Dict[str, str]]
    ) -> str:
        """Add source citations to response with enhanced formatting"""
        if not sources:
            return response + "\n\n---\n*注：本地知识库中未找到相关参考资料，当前回答基于公开知识整理*"

        # Build citation list with enhanced formatting
        citation_lines = ["\n\n---\n**信息来源：**\n"]

        for i, source in enumerate(sources, 1):
            parts = []

            if source.get("company_name"):
                parts.append(source["company_name"])
            if source.get("stock_code"):
                parts.append(f"({source['stock_code']})")
            if source.get("broker"):
                parts.append(f"- {source['broker']}")
            if source.get("date"):
                parts.append(f"({source['date']})")

            source_type = source.get("source_type", "")
            type_label = {
                "deep_research": "深度研报",
                "history": "历史研报",
                "news": "新闻资讯",
                "financial_report": "财务报告"
            }.get(source_type, "")

            if type_label:
                parts.append(f"[{type_label}]")

            citation_lines.append(f"{i}. {' '.join(parts)}")

        # Add data quality note
        citation_lines.append("\n*注：以上信息来自本地知识库，建议结合最新市场数据进行投资决策*")

        return response + "\n".join(citation_lines)

    def _format_sources(self, sources: List[Dict[str, str]]) -> List[Dict[str, str]]:
        """Format sources for display"""
        formatted = []

        for source in sources:
            formatted.append({
                "display": self._format_single_source(source),
                "company_name": source.get("company_name", ""),
                "stock_code": source.get("stock_code", ""),
                "broker": source.get("broker", ""),
                "date": source.get("date", ""),
                "type": source.get("source_type", "")
            })

        return formatted

    def _format_single_source(self, source: Dict[str, str]) -> str:
        """Format a single source for display"""
        parts = []

        if source.get("company_name"):
            parts.append(source["company_name"])
        if source.get("stock_code"):
            parts.append(f"({source['stock_code']})")
        if source.get("broker"):
            parts.append(f" - {source['broker']}")
        if source.get("date"):
            parts.append(f", {source['date']}")

        return "".join(parts)

    def _to_html(self, markdown_content: str) -> str:
        """Convert markdown to HTML with comprehensive formatting"""
        html = markdown_content

        # Escape HTML special characters first
        html = html.replace('&', '&amp;')
        html = html.replace('<', '&lt;')
        html = html.replace('>', '&gt;')

        # Convert headers (must be at line start)
        html = re.sub(r'^#### (.+)$', r'<h4>\1</h4>', html, flags=re.MULTILINE)
        html = re.sub(r'^### (.+)$', r'<h3>\1</h3>', html, flags=re.MULTILINE)
        html = re.sub(r'^## (.+)$', r'<h2>\1</h2>', html, flags=re.MULTILINE)
        html = re.sub(r'^# (.+)$', r'<h1>\1</h1>', html, flags=re.MULTILINE)

        # Convert bold (**text**)
        html = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', html)

        # Convert italic (*text*)
        html = re.sub(r'\*(.+?)\*', r'<em>\1</em>', html)

        # Convert inline code (`code`)
        html = re.sub(r'`(.+?)`', r'<code class="bg-gray-100 px-1 rounded">\1</code>', html)

        # Convert links [text](url)
        html = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'<a href="\2" class="text-blue-600 hover:underline">\1</a>', html)

        # Convert unordered lists (- item or * item)
        def convert_ul(match):
            items = match.group(0)
            items = re.sub(r'^[-*] (.+)$', r'<li>\1</li>', items, flags=re.MULTILINE)
            return f'<ul class="list-disc pl-6 my-2">{items}</ul>'
        html = re.sub(r'(?:^[-*] .+\n?)+', convert_ul, html, flags=re.MULTILINE)

        # Convert ordered lists (1. item)
        def convert_ol(match):
            items = match.group(0)
            items = re.sub(r'^\d+\. (.+)$', r'<li>\1</li>', items, flags=re.MULTILINE)
            return f'<ol class="list-decimal pl-6 my-2">{items}</ol>'
        html = re.sub(r'(?:^\d+\. .+\n?)+', convert_ol, html, flags=re.MULTILINE)

        # Convert blockquotes (> text)
        def convert_blockquote(match):
            lines = match.group(0)
            lines = re.sub(r'^> ?(.*)$', r'\1<br>', lines, flags=re.MULTILINE)
            lines = lines.rstrip('<br>')
            return f'<blockquote class="border-l-4 border-gray-300 pl-4 italic text-gray-600 my-4">{lines}</blockquote>'
        html = re.sub(r'(?:^> .+\n?)+', convert_blockquote, html, flags=re.MULTILINE)

        # Convert tables
        def convert_table(match):
            table_text = match.group(0)
            lines = table_text.strip().split('\n')
            html_table = '<table class="min-w-full border-collapse border border-gray-300 my-4">'
            for i, line in enumerate(lines):
                if '---' in line:
                    continue
                cells = [c.strip() for c in line.split('|') if c.strip()]
                if i == 0:
                    html_table += '<thead><tr>'
                    for cell in cells:
                        html_table += f'<th class="border border-gray-300 px-4 py-2 bg-gray-100 font-semibold">{cell}</th>'
                    html_table += '</tr></thead><tbody>'
                else:
                    html_table += '<tr>'
                    for cell in cells:
                        html_table += f'<td class="border border-gray-300 px-4 py-2">{cell}</td>'
                    html_table += '</tr>'
            html_table += '</tbody></table>'
            return html_table
        html = re.sub(r'(?:^\|.+\|\n?)+', convert_table, html, flags=re.MULTILINE)

        # Convert horizontal rules (--- or ***)
        html = re.sub(r'^---+$', r'<hr class="my-6 border-gray-300">', html, flags=re.MULTILINE)
        html = re.sub(r'^\*\*\*+$', r'<hr class="my-6 border-gray-300">', html, flags=re.MULTILINE)

        # Convert paragraphs (double newlines)
        paragraphs = html.split('\n\n')
        formatted_paragraphs = []
        for p in paragraphs:
            p = p.strip()
            if not p:
                continue
            # Skip if already wrapped in block element
            if re.match(r'^<(h[1-6]|ul|ol|table|blockquote|hr|div)', p):
                formatted_paragraphs.append(p)
            else:
                # Convert single newlines to <br>
                p = p.replace('\n', '<br>')
                formatted_paragraphs.append(f'<p class="my-3 leading-relaxed">{p}</p>')

        html = '\n'.join(formatted_paragraphs)

        # Wrap in container
        return f'<div class="markdown-content prose prose-sm max-w-none">{html}</div>'

    def _to_json(self, content: str, sections: List[Dict]) -> str:
        """Convert to JSON structure"""
        import json

        result = {
            "content": content,
            "sections": sections
        }

        return json.dumps(result, ensure_ascii=False, indent=2)

    def format_for_display(
        self,
        result: FormattedResult,
        include_metadata: bool = False
    ) -> str:
        """
        Format result for final display

        Args:
            result: FormattedResult object
            include_metadata: Whether to include metadata

        Returns:
            Formatted string for display
        """
        output = result.content

        if include_metadata:
            output += f"\n\n---\n"
            output += f"*意图类型: {result.metadata.get('intent_type', 'unknown')}*  \n"
            output += f"*参考资料: {result.metadata.get('source_count', 0)} 篇*"

        return output

    def create_summary(self, result: FormattedResult, max_length: int = 200) -> str:
        """Create a brief summary of the result"""
        if result.sections:
            # Find first substantial section
            for section in result.sections:
                if section.get("content"):
                    content = section["content"]
                    if len(content) > max_length:
                        return content[:max_length] + "..."
                    return content

        # Fallback to first part of content
        content = result.content
        if len(content) > max_length:
            return content[:max_length] + "..."
        return content