# Workflow Engine - Optimized version
# Orchestrates multi-agent execution flow with proper parameter passing

import time
import logging
from typing import Dict, List, Any, Optional, Callable
from dataclasses import dataclass, field
from enum import Enum
import threading

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from agents.intent_agent import IntentAgent, IntentResult
from agents.search_agent import SearchAgent
from agents.prompt_agent import PromptAgent, PromptPair
from agents.result_agent import ResultAgent, FormattedResult
from agents.agent0_decomposer import IntentDecompositionAgent
from agents.parallel_scheduler import ParallelScheduler, PipelineResult
from agents.agent_final import AgentFinal, FinalReport
from agents.time_scheduler import TimeSchedulerAgent, create_time_aware_context
from agents.time_types import TimeContext
from agents.time_service import time_service
from llm.client import LLMClient, LLMResponse
from assistant.types import QueryContext
from assistant.evidence_broker import EvidenceBroker, infer_skill_from_intent
from assistant.prompt_builder import AssistantPromptBuilder
from assistant.formatter import AssistantFormatter
from assistant.validator import AssistantValidator
from config import (
    RESEARCH_REPORTS_DIR, NEWS_DIR, FINANCIAL_REPORTS_DIR, DAILY_QUOTE_DIR,
    MAX_CANDIDATE_FILES, MAX_READ_CHARS, SEARCH_TIMEOUT, MAX_RETURN_SNIPPETS
)

logger = logging.getLogger(__name__)


class WorkflowStatus(Enum):
    """Status of workflow execution"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class WorkflowStep:
    """Represents a single step in the workflow"""
    name: str
    status: str = "pending"
    start_time: Optional[float] = None
    end_time: Optional[float] = None
    result: Any = None
    error: Optional[str] = None

    @property
    def duration_ms(self) -> Optional[float]:
        if self.start_time and self.end_time:
            return (self.end_time - self.start_time) * 1000
        return None


@dataclass
class WorkflowResult:
    """Final result from workflow execution"""
    status: WorkflowStatus
    steps: List[WorkflowStep]
    final_result: Optional[FormattedResult] = None
    total_duration_ms: float = 0
    error: Optional[str] = None


class WorkflowEngine:
    """
    Engine for orchestrating multi-agent workflow

    Execution flow:
    1. Intent Recognition -> Identify user intent and extract entities
    2. Local Search -> Search knowledge base (two-phase, limited)
    3. Prompt Building -> Construct prompts with context
    4. LLM Inference -> Call cloud LLM for response
    5. Result Formatting -> Format and structure the output
    """

    def __init__(
        self,
        llm_provider: Optional[str] = None,
        on_progress: Optional[Callable[[str, str], None]] = None,
        max_results: int = MAX_RETURN_SNIPPETS
    ):
        """
        Initialize workflow engine with configurable limits

        Args:
            llm_provider: LLM provider to use
            on_progress: Callback for progress updates
            max_results: Max search results to return
        """
        # Initialize time scheduler agent (first layer)
        self.time_scheduler = TimeSchedulerAgent()

        # Initialize agents
        self.intent_agent = IntentAgent()

        # SearchAgent with all directories - uses new PreciseSearcher
        self.search_agent = SearchAgent(
            research_reports_dir=RESEARCH_REPORTS_DIR,
            news_dir=NEWS_DIR,
            financial_reports_dir=FINANCIAL_REPORTS_DIR,
            daily_quote_dir=DAILY_QUOTE_DIR,
            max_results=max_results
        )

        self.prompt_agent = PromptAgent()
        self.result_agent = ResultAgent()
        self.assistant_broker = EvidenceBroker(self.search_agent)
        self.assistant_prompt_builder = AssistantPromptBuilder()
        self.assistant_formatter = AssistantFormatter()
        self.assistant_validator = AssistantValidator()

        # Initialize LLM client
        self.llm_client = LLMClient(provider=llm_provider)

        # Progress callback
        self.on_progress = on_progress

        # State
        self.current_steps: List[WorkflowStep] = []
        self.current_time_context: Optional[TimeContext] = None

        logger.info(f"WorkflowEngine initialized with max_results={max_results}")

    def run(self, user_query: str) -> WorkflowResult:
        """
        Execute the full workflow

        Args:
            user_query: User's question

        Returns:
            WorkflowResult with final output
        """
        start_time = time.time()
        self.current_steps = []

        logger.info(f"Starting workflow for query: {user_query[:50]}...")

        try:
            # Step 0: Time Scheduling (First Layer - Time Context Injection)
            time_ctx = self._run_step(
                "time_scheduling",
                lambda: self.time_scheduler.parse_time_intent(user_query)
            )
            self.current_time_context = time_ctx

            # Initialize global time service
            time_service.initialize(time_ctx)

            logger.info(f"Time context: target_years={time_ctx.target_years}, "
                       f"primary_year={time_ctx.get_primary_year()}")

            # Step 1: Intent Recognition
            intent_result = self._run_step(
                "intent_recognition",
                lambda: self.intent_agent.recognize(user_query)
            )

            # Step 2: Local Search
            search_result = self._run_step(
                "local_search",
                lambda: self.search_agent.search(intent_result)
            )

            # Step 3: Prompt Building with metrics context
            # Include metrics in context if available
            enhanced_context = search_result.get("context", "")
            metrics = search_result.get("metrics", [])

            if metrics:
                metrics_context = "\n\n## 自动提取的关键财务指标\n"
                for m in metrics:
                    metrics_context += f"- **{m.name}**: {m.value}{m.unit} ({m.year}年)\n"
                enhanced_context = metrics_context + "\n" + enhanced_context

            prompt_pair = self._run_step(
                "prompt_building",
                lambda: self.prompt_agent.build_prompts(
                    intent_result,
                    enhanced_context,
                    user_query
                )
            )

            # Step 4: LLM Inference with web search support (disabled to prioritize local knowledge)
            llm_response = self._run_step(
                "llm_inference",
                lambda: self.llm_client.chat_with_retry(
                    system_prompt=prompt_pair.system_prompt,
                    user_prompt=prompt_pair.user_prompt,
                    max_retries=2,
                    enable_web_search=False  # Disable web search to use local knowledge first
                )
            )

            # Step 5: Result Formatting
            formatted_result = self._run_step(
                "result_formatting",
                lambda: self.result_agent.format_result(
                    llm_response.content,
                    search_result["sources"],
                    intent_result.intent
                )
            )

            # Build final result
            total_duration = (time.time() - start_time) * 1000

            logger.info(f"Workflow completed successfully in {total_duration:.0f}ms")

            return WorkflowResult(
                status=WorkflowStatus.COMPLETED,
                steps=self.current_steps,
                final_result=formatted_result,
                total_duration_ms=total_duration
            )

        except Exception as e:
            total_duration = (time.time() - start_time) * 1000
            logger.error(f"Workflow failed: {e}")

            return WorkflowResult(
                status=WorkflowStatus.FAILED,
                steps=self.current_steps,
                total_duration_ms=total_duration,
                error=str(e)
            )

    def run_async(
        self,
        user_query: str,
        callback: Callable[[WorkflowResult], None]
    ):
        """Run workflow asynchronously"""
        def _run():
            result = self.run(user_query)
            callback(result)

        thread = threading.Thread(target=_run)
        thread.start()

    def run_assistant(self, query_context: Dict[str, Any]) -> Dict[str, Any]:
        """Run the first-phase assistant orchestration flow."""
        start_time = time.time()
        self.current_steps = []

        try:
            query = QueryContext(
                question=query_context.get("question", ""),
                page_type=query_context.get("page_type"),
                entity_type=query_context.get("entity_type"),
                stock_code=query_context.get("stock_code"),
                company_name=query_context.get("company_name"),
                indicator_codes=query_context.get("indicator_codes", []) or [],
                compare_targets=query_context.get("compare_targets", []) or [],
                time_range=query_context.get("time_range"),
                context_summary=query_context.get("context_summary"),
                recent_messages=query_context.get("recent_messages", []) or [],
                requested_skill=query_context.get("requested_skill"),
            )

            time_ctx = self._run_step(
                "time_scheduling",
                lambda: self.time_scheduler.parse_time_intent(query.question)
            )
            self.current_time_context = time_ctx
            time_service.initialize(time_ctx)

            intent_result = self._run_step(
                "intent_recognition",
                lambda: self.intent_agent.recognize(query.question)
            )

            skill_id = self._run_step(
                "skill_selection",
                lambda: infer_skill_from_intent(intent_result, query)
            )

            evidence_bundle = self._run_step(
                "evidence_collection",
                lambda: self.assistant_broker.collect(query, intent_result, skill_id)
            )

            system_prompt, user_prompt = self._run_step(
                "prompt_building",
                lambda: self.assistant_prompt_builder.build(query, evidence_bundle)
            )

            llm_response = self._run_step(
                "llm_inference",
                lambda: self.llm_client.chat_with_retry(
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                    max_retries=2,
                    enable_web_search=False
                )
            )

            assistant_result = self._run_step(
                "result_formatting",
                lambda: self.assistant_formatter.format(llm_response.content, skill_id, evidence_bundle)
            )

            warnings = self._run_step(
                "validation",
                lambda: self.assistant_validator.validate(assistant_result)
            )
            assistant_result.warnings = warnings

            formatted_result = self.assistant_formatter.to_formatted_result(assistant_result)
            total_duration = (time.time() - start_time) * 1000

            return {
                "status": "completed",
                "result": {
                    "content": formatted_result.content,
                    "sources": formatted_result.sources,
                    "metadata": formatted_result.metadata,
                    "skill": skill_id,
                    "warnings": warnings,
                    "evidence_summary": assistant_result.metadata.get("evidence_summary", {}),
                },
                "steps": [
                    {
                        "name": step.name,
                        "status": step.status,
                        "duration_ms": step.duration_ms
                    }
                    for step in self.current_steps
                ],
                "total_duration_ms": total_duration,
            }
        except Exception as e:
            total_duration = (time.time() - start_time) * 1000
            logger.error(f"Assistant workflow failed: {e}")
            return {
                "status": "failed",
                "error": str(e),
                "steps": [
                    {
                        "name": step.name,
                        "status": step.status,
                        "duration_ms": step.duration_ms,
                        "error": step.error
                    }
                    for step in self.current_steps
                ],
                "total_duration_ms": total_duration,
            }

    def _run_step(
        self,
        step_name: str,
        action: Callable[[], Any]
    ) -> Any:
        """Run a single workflow step with logging"""
        step = WorkflowStep(name=step_name)
        self.current_steps.append(step)

        step.status = "running"
        step.start_time = time.time()
        self._notify_progress(step_name, "running")
        logger.info(f"Step {step_name} started")

        try:
            result = action()
            step.result = result
            step.status = "completed"
            step.end_time = time.time()
            self._notify_progress(step_name, "completed")
            logger.info(f"Step {step_name} completed in {step.duration_ms:.0f}ms")

            return result

        except Exception as e:
            step.status = "failed"
            step.error = str(e)
            step.end_time = time.time()
            self._notify_progress(step_name, f"failed: {str(e)}")
            logger.error(f"Step {step_name} failed: {e}")
            raise

    def _notify_progress(self, step_name: str, status: str):
        if self.on_progress:
            self.on_progress(step_name, status)

    def run_pipeline(self, user_query: str) -> Dict[str, Any]:
        """
        Execute the multi-agent pipeline for structured analysis.

        This uses the new agent architecture:
        1. Time Scheduler: Parse time intent and inject context
        2. Agent 0: Intent decomposition
        3. Parallel Scheduler: Execute sub-tasks concurrently
        4. Agent Final: Review and integration

        Args:
            user_query: User's question

        Returns:
            Dict with structured analysis results
        """
        start_time = time.time()
        self.current_steps = []

        logger.info(f"Starting multi-agent pipeline for: {user_query[:50]}...")

        try:
            # Step 0: Time Scheduling (First Layer)
            time_ctx = self._run_step(
                "time_scheduling",
                lambda: self.time_scheduler.parse_time_intent(user_query)
            )
            self.current_time_context = time_ctx

            # Initialize global time service for other agents
            time_service.initialize(time_ctx)

            logger.info(f"Time context: target_years={time_ctx.target_years}, "
                       f"primary_year={time_ctx.get_primary_year()}")

            # Step 1: Agent 0 - Intent Decomposition with time context
            decomposer = IntentDecompositionAgent()
            decomposition = self._run_step(
                "intent_decomposition",
                lambda: decomposer.decompose(user_query)
            )

            # Inject time context into decomposition
            if hasattr(decomposition, 'time_range'):
                # Update time_range from parsed time context
                decomposition.time_range = time_ctx.target_years

            # Step 2: Parallel Scheduler - Execute sub-tasks
            scheduler = ParallelScheduler(max_workers=4)
            pipeline_result = self._run_step(
                "parallel_execution",
                lambda: scheduler.execute_pipeline(decomposition)
            )

            # Step 3: Agent Final - Review and Integration
            agent_final = AgentFinal()
            final_report = self._run_step(
                "final_integration",
                lambda: agent_final.integrate(pipeline_result, decomposition)
            )

            # Build result
            total_duration = (time.time() - start_time) * 1000

            logger.info(f"Pipeline completed successfully in {total_duration:.0f}ms")

            return {
                "status": "completed",
                "query": user_query,
                "entity": final_report.entity,
                "stock_code": final_report.stock_code,
                "intent": final_report.intent,
                "time_range": final_report.time_range,
                "formatted_report": final_report.formatted_report,
                "financial_summary": final_report.financial_summary,
                "profitability_analysis": final_report.profitability_analysis,
                "year_over_year_comparison": final_report.year_over_year_comparison,
                "source_files": final_report.source_files,
                "confidence": final_report.overall_confidence,
                "data_quality": final_report.data_quality_score,
                "steps": [
                    {
                        "name": step.name,
                        "status": step.status,
                        "duration_ms": step.duration_ms
                    }
                    for step in self.current_steps
                ],
                "total_duration_ms": total_duration
            }

        except Exception as e:
            total_duration = (time.time() - start_time) * 1000
            logger.error(f"Pipeline failed: {e}")

            return {
                "status": "failed",
                "query": user_query,
                "error": str(e),
                "steps": [
                    {
                        "name": step.name,
                        "status": step.status,
                        "duration_ms": step.duration_ms,
                        "error": step.error
                    }
                    for step in self.current_steps
                ],
                "total_duration_ms": total_duration
            }

    def get_workflow_status(self) -> Dict[str, Any]:
        """Get current workflow status"""
        return {
            "steps": [
                {
                    "name": step.name,
                    "status": step.status,
                    "duration_ms": step.duration_ms
                }
                for step in self.current_steps
            ]
        }


def create_engine(
    llm_provider: Optional[str] = None,
    on_progress: Optional[Callable[[str, str], None]] = None,
    **kwargs
) -> WorkflowEngine:
    """Factory function to create a workflow engine"""
    return WorkflowEngine(
        llm_provider=llm_provider,
        on_progress=on_progress,
        **kwargs
    )
