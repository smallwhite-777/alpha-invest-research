# Cloud LLM Client
# Unified interface for multiple LLM providers (DeepSeek, Kimi, Zhipu, SiliconFlow)

import os
import json
import time
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from abc import ABC, abstractmethod
import requests

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from config import LLM_PROVIDERS, DEFAULT_PROVIDER
from utils.time_context import inject_time_context


@dataclass
class LLMResponse:
    """Response from LLM"""
    content: str
    model: str
    provider: str
    usage: Dict[str, int]
    latency_ms: float


class BaseLLMClient(ABC):
    """Base class for LLM clients"""

    @abstractmethod
    def chat(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.7,
        max_tokens: int = 4000
    ) -> LLMResponse:
        """Send chat request to LLM"""
        pass


class DeepSeekClient(BaseLLMClient):
    """DeepSeek API client"""

    def __init__(self, api_key: str, base_url: str = "https://api.deepseek.com/v1"):
        self.api_key = api_key
        self.base_url = base_url
        self.model = "deepseek-chat"

    def chat(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.7,
        max_tokens: int = 4000
    ) -> LLMResponse:
        """Send chat request to DeepSeek"""
        url = f"{self.base_url}/chat/completions"

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        data = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": temperature,
            "max_tokens": max_tokens
        }

        start_time = time.time()
        response = requests.post(url, headers=headers, json=data, timeout=60)
        latency_ms = (time.time() - start_time) * 1000

        if response.status_code != 200:
            raise Exception(f"DeepSeek API error: {response.status_code} - {response.text}")

        result = response.json()

        return LLMResponse(
            content=result["choices"][0]["message"]["content"],
            model=self.model,
            provider="deepseek",
            usage=result.get("usage", {}),
            latency_ms=latency_ms
        )


class SiliconFlowClient(BaseLLMClient):
    """SiliconFlow API client"""

    def __init__(self, api_key: str, base_url: str = "https://api.siliconflow.cn/v1"):
        self.api_key = api_key
        self.base_url = base_url
        self.model = "deepseek-ai/DeepSeek-V3"

    def chat(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.7,
        max_tokens: int = 4000
    ) -> LLMResponse:
        """Send chat request to SiliconFlow"""
        url = f"{self.base_url}/chat/completions"

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        data = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": temperature,
            "max_tokens": max_tokens
        }

        start_time = time.time()
        response = requests.post(url, headers=headers, json=data, timeout=60)
        latency_ms = (time.time() - start_time) * 1000

        if response.status_code != 200:
            raise Exception(f"SiliconFlow API error: {response.status_code} - {response.text}")

        result = response.json()

        return LLMResponse(
            content=result["choices"][0]["message"]["content"],
            model=self.model,
            provider="siliconflow",
            usage=result.get("usage", {}),
            latency_ms=latency_ms
        )


class KimiClient(BaseLLMClient):
    """Kimi (Moonshot) API client"""

    def __init__(self, api_key: str, base_url: str = "https://api.moonshot.cn/v1"):
        self.api_key = api_key
        self.base_url = base_url
        self.model = "moonshot-v1-8k"

    def chat(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.7,
        max_tokens: int = 4000
    ) -> LLMResponse:
        """Send chat request to Kimi"""
        url = f"{self.base_url}/chat/completions"

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        data = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": temperature,
            "max_tokens": max_tokens
        }

        start_time = time.time()
        response = requests.post(url, headers=headers, json=data, timeout=60)
        latency_ms = (time.time() - start_time) * 1000

        if response.status_code != 200:
            raise Exception(f"Kimi API error: {response.status_code} - {response.text}")

        result = response.json()

        return LLMResponse(
            content=result["choices"][0]["message"]["content"],
            model=self.model,
            provider="kimi",
            usage=result.get("usage", {}),
            latency_ms=latency_ms
        )


class ZhipuClient(BaseLLMClient):
    """Zhipu (ChatGLM) API client"""

    def __init__(self, api_key: str, base_url: str = "https://open.bigmodel.cn/api/paas/v4"):
        self.api_key = api_key
        self.base_url = base_url
        self.model = "glm-4"

    def chat(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.7,
        max_tokens: int = 4000
    ) -> LLMResponse:
        """Send chat request to Zhipu"""
        url = f"{self.base_url}/chat/completions"

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        data = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": temperature,
            "max_tokens": max_tokens
        }

        start_time = time.time()
        response = requests.post(url, headers=headers, json=data, timeout=60)
        latency_ms = (time.time() - start_time) * 1000

        if response.status_code != 200:
            raise Exception(f"Zhipu API error: {response.status_code} - {response.text}")

        result = response.json()

        return LLMResponse(
            content=result["choices"][0]["message"]["content"],
            model=self.model,
            provider="zhipu",
            usage=result.get("usage", {}),
            latency_ms=latency_ms
        )


class MiniMaxClient(BaseLLMClient):
    """MiniMax API client - OpenAI compatible with web search support"""

    def __init__(self, api_key: str, base_url: str = "https://api.minimaxi.com/v1", model: str = "MiniMax-M2.7"):
        self.api_key = api_key
        self.base_url = base_url
        self.model = model  # Supports: MiniMax-M2.7, MiniMax-M2.7-highspeed, MiniMax-M2.5, etc.

    def chat(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.7,
        max_tokens: int = 4000,
        enable_web_search: bool = True
    ) -> LLMResponse:
        """Send chat request to MiniMax (OpenAI compatible) with optional web search"""
        url = f"{self.base_url}/chat/completions"

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        # MiniMax temperature range is (0.0, 1.0], recommended 1.0
        temp = min(max(temperature, 0.1), 1.0)

        data = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": temp,
            "max_tokens": max_tokens
        }

        # Enable web search for real-time information
        if enable_web_search:
            data["plugins"] = [
                {
                    "name": "web_search",
                    "max_results": 5
                }
            ]

        start_time = time.time()
        response = requests.post(url, headers=headers, json=data, timeout=120)
        latency_ms = (time.time() - start_time) * 1000

        if response.status_code != 200:
            raise Exception(f"MiniMax API error: {response.status_code} - {response.text}")

        result = response.json()

        # Extract content
        content = result["choices"][0]["message"]["content"]

        # Check if web search was used and include sources
        web_search_info = ""
        if "choices" in result and len(result["choices"]) > 0:
            message = result["choices"][0].get("message", {})
            if "plugin_info" in message:
                plugin_info = message["plugin_info"]
                if "web_search" in plugin_info:
                    web_search_info = "\n\n---\n**联网搜索补充信息已整合**"

        return LLMResponse(
            content=content + web_search_info if web_search_info else content,
            model=self.model,
            provider="minimax",
            usage=result.get("usage", {}),
            latency_ms=latency_ms
        )


class MockLLMClient(BaseLLMClient):
    """Mock LLM client for demo mode when no API key is configured"""

    def __init__(self):
        self.model = "mock-model"
        self.provider = "mock"

    def chat(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.7,
        max_tokens: int = 4000,
        enable_web_search: bool = True
    ) -> LLMResponse:
        """Return a mock response for demo purposes"""
        # Extract keywords from user prompt to make response relevant
        user_query = user_prompt.lower()

        mock_response = """## 分析结果

> **注意**: 当前为演示模式（未配置 LLM API Key），配置后将提供深度分析。

### 系统提示

您的问题已被接收，但由于系统未配置 AI API Key，目前无法提供智能分析。

### 如何配置

请在 `.env.local` 文件中配置以下任一 API Key：

1. **DeepSeek** (推荐)
   - 申请地址: https://platform.deepseek.com
   - 配置: `DEEPSEEK_API_KEY=your_key`

2. **MiniMax**
   - 申请地址: https://api.minimaxi.com
   - 配置: `MINIMAX_API_KEY=your_key`

3. **SiliconFlow**
   - 申请地址: https://siliconflow.cn
   - 配置: `SILICONFLOW_API_KEY=your_key`

### 知识库数据

系统已加载本地知识库数据，配置 API Key 后将能够：
- 智能分析投研问题
- 调用实时市场数据
- 生成深度研究报告

请配置 API Key 后重试。
"""

        return LLMResponse(
            content=mock_response,
            model=self.model,
            provider=self.provider,
            usage={"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
            latency_ms=100.0
        )


class LLMClient:
    """
    Unified LLM client - Simplified to MiniMax models with DeepSeek fallback
    """

    def __init__(self, provider: Optional[str] = None):
        """
        Initialize LLM client

        Args:
            provider: Provider name ("minimax", "minimax_highspeed", "deepseek")
                      If None, uses DEFAULT_PROVIDER from config
        """
        self.provider = provider or DEFAULT_PROVIDER
        self._client = self._create_client()

    def _create_client(self) -> BaseLLMClient:
        """Create appropriate client based on provider"""
        config = LLM_PROVIDERS.get(self.provider)

        if not config:
            # Unknown provider, use mock client
            print(f"[LLMClient] Warning: Unknown provider '{self.provider}', using mock client")
            return MockLLMClient()

        api_key = config.get("api_key")
        if not api_key:
            # No API key configured, use mock client for demo mode
            print(f"[LLMClient] Warning: API key not set for provider '{self.provider}', using mock client (demo mode)")
            return MockLLMClient()

        base_url = config.get("base_url", "")
        model = config.get("model", "")

        # All providers use MiniMax client (OpenAI compatible)
        if "minimax" in self.provider:
            return MiniMaxClient(api_key, base_url, model)
        elif self.provider == "deepseek":
            return DeepSeekClient(api_key, base_url)
        else:
            # Default to MiniMax
            return MiniMaxClient(api_key, base_url, model)

    def chat(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.7,
        max_tokens: int = 4000,
        enable_web_search: bool = True,
        inject_time: bool = True
    ) -> LLMResponse:
        """
        Send chat request

        Args:
            system_prompt: System prompt
            user_prompt: User prompt
            temperature: Sampling temperature
            max_tokens: Maximum tokens in response
            enable_web_search: Enable web search for real-time info (MiniMax only)
            inject_time: Whether to inject time context into system prompt (default: True)

        Returns:
            LLMResponse object
        """
        # 自动注入时间上下文，解决LLM知识截止问题
        if inject_time:
            system_prompt = inject_time_context(system_prompt)

        if hasattr(self._client, 'chat'):
            # Check if client supports web_search parameter
            import inspect
            sig = inspect.signature(self._client.chat)
            if 'enable_web_search' in sig.parameters:
                return self._client.chat(
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    enable_web_search=enable_web_search
                )
            else:
                return self._client.chat(
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                    temperature=temperature,
                    max_tokens=max_tokens
                )
        raise NotImplementedError("Client does not support chat method")

    def chat_with_retry(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.7,
        max_tokens: int = 4000,
        max_retries: int = 3,
        retry_delay: float = 1.0,
        enable_web_search: bool = True,
        inject_time: bool = True
    ) -> LLMResponse:
        """
        Send chat request with retry logic and exponential backoff

        Args:
            system_prompt: System prompt
            user_prompt: User prompt
            temperature: Sampling temperature
            max_tokens: Maximum tokens in response
            max_retries: Maximum number of retries
            retry_delay: Base delay between retries in seconds
            enable_web_search: Enable web search for real-time info (MiniMax only)
            inject_time: Whether to inject time context into system prompt (default: True)

        Returns:
            LLMResponse object
        """
        last_error = None

        for attempt in range(max_retries):
            try:
                return self.chat(
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    enable_web_search=enable_web_search,
                    inject_time=inject_time
                )
            except Exception as e:
                last_error = e
                error_str = str(e).lower()

                # Determine wait time based on error type
                if "rate limit" in error_str or "429" in error_str:
                    # Rate limit - exponential backoff
                    wait = retry_delay * (2 ** attempt) * 10  # 10s, 20s, 40s
                elif "500" in error_str or "502" in error_str or "503" in error_str:
                    # Server error - shorter wait
                    wait = retry_delay * (2 ** attempt) * 5  # 5s, 10s, 20s
                elif "timeout" in error_str:
                    # Timeout - fixed wait
                    wait = 5
                else:
                    # Other errors - standard exponential backoff
                    wait = retry_delay * (2 ** attempt)

                if attempt < max_retries - 1:
                    import time
                    time.sleep(wait)

        raise Exception(f"Failed after {max_retries} retries: {last_error}")

    def switch_provider(self, provider: str):
        """Switch to a different provider"""
        self.provider = provider
        self._client = self._create_client()

    @staticmethod
    def list_providers() -> List[str]:
        """List available providers"""
        return list(LLM_PROVIDERS.keys())