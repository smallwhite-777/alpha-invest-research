"""
Chat and Query Routes
Handles AI queries, workflow execution, and knowledge base search
"""

from flask import Blueprint, request, jsonify, render_template_string
from datetime import datetime
import os

from config import LLM_PROVIDERS
from workflow.engine import create_engine

chat_bp = Blueprint('chat', __name__)

# HTML template for testing
HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>投研问答系统</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f5f5f5; padding: 20px; }
        .container { max-width: 1000px; margin: 0 auto; }
        h1 { color: #333; margin-bottom: 20px; }
        .chat-container { background: white; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); padding: 20px; }
        .messages { height: 500px; overflow-y: auto; border: 1px solid #eee; border-radius: 5px; padding: 15px; margin-bottom: 15px; }
        .message { margin-bottom: 15px; padding: 10px; border-radius: 5px; }
        .user-message { background: #e3f2fd; text-align: right; }
        .assistant-message { background: #f5f5f5; }
        .progress { font-size: 12px; color: #666; margin: 10px 0; }
        .input-area { display: flex; gap: 10px; }
        textarea { flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 5px; resize: none; height: 60px; }
        button { padding: 10px 20px; background: #1976d2; color: white; border: none; border-radius: 5px; cursor: pointer; }
        button:hover { background: #1565c0; }
        button:disabled { background: #ccc; cursor: not-allowed; }
        .sources { margin-top: 10px; font-size: 12px; color: #666; }
        .provider-select { margin-bottom: 10px; }
        .provider-select select { padding: 5px; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>投研问答系统</h1>
        <div class="chat-container">
            <div class="provider-select">
                <label>LLM Provider: </label>
                <select id="provider">
                    <option value="minimax">MiniMax</option>
                    <option value="deepseek">DeepSeek</option>
                </select>
            </div>
            <div class="messages" id="messages"></div>
            <div class="input-area">
                <textarea id="input" placeholder="输入问题..."></textarea>
                <button id="send" onclick="sendQuery()">发送</button>
            </div>
        </div>
    </div>
    <script>
        let messages = [];
        async function sendQuery() {
            const input = document.getElementById('input');
            const query = input.value.trim();
            if (!query) return;

            const provider = document.getElementById('provider').value;
            messages.push({ role: 'user', content: query });
            updateMessages();
            input.value = '';

            document.getElementById('send').disabled = true;
            try {
                const response = await fetch('/api/query', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query, provider })
                });
                const data = await response.json();
                messages.push({ role: 'assistant', content: data.result?.content || data.error });
            } catch (e) {
                messages.push({ role: 'assistant', content: 'Error: ' + e.message });
            }
            updateMessages();
            document.getElementById('send').disabled = false;
        }
        function updateMessages() {
            const container = document.getElementById('messages');
            container.innerHTML = messages.map(m =>
                `<div class="message ${m.role}-message">${m.content}</div>`
            ).join('');
            container.scrollTop = container.scrollHeight;
        }
    </script>
</body>
</html>
"""


def format_workflow_result(result):
    """Format workflow result for API response"""
    from workflow.engine import WorkflowStatus

    if result.status == WorkflowStatus.COMPLETED:
        # Access final_result attribute (FormattedResult)
        final = result.final_result
        content = final.content if final else ""
        sources = final.sources if final else []
        metadata = final.metadata if final else {}

        return {
            "status": "completed",
            "result": {
                "content": content,
                "sources": sources,
                "metadata": metadata
            },
            "steps": [
                {"name": step.name, "status": step.status, "duration_ms": step.duration_ms}
                for step in result.steps
            ],
            "total_duration_ms": result.total_duration_ms
        }
    else:
        return {
            "status": "failed",
            "error": result.error or "Unknown error",
            "steps": [
                {"name": step.name, "status": step.status, "error": step.error}
                for step in result.steps
            ]
        }


@chat_bp.route('/')
def index():
    """Serve the main page"""
    return render_template_string(HTML_TEMPLATE)


@chat_bp.route('/api/query', methods=['POST'])
def handle_query():
    """
    Handle user query

    Request body:
        {
            "query": "user question",
            "provider": "deepseek" (optional)
        }
    """
    # Explicit encoding handling for Chinese characters
    try:
        # Force UTF-8 decoding
        data = request.get_json(force=True, silent=False)
    except Exception as e:
        # Fallback: manually decode the request body
        try:
            raw_data = request.data.decode('utf-8')
            import json
            data = json.loads(raw_data)
        except Exception as decode_error:
            return jsonify({
                "status": "failed",
                "error": f"JSON decode error: {str(decode_error)}"
            }), 400

    if not data or 'query' not in data:
        return jsonify({
            "status": "failed",
            "error": "Missing 'query' field"
        }), 400

    query = data['query']
    provider = data.get('provider')

    # Create workflow engine
    engine = create_engine(
        llm_provider=provider,
        on_progress=lambda step, status: print(f"[{step}] {status}")
    )

    # Run workflow
    result = engine.run(query)

    return jsonify(format_workflow_result(result))


@chat_bp.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "providers": list(LLM_PROVIDERS.keys())
    })


@chat_bp.route('/api/providers', methods=['GET'])
def list_providers():
    """List available LLM providers"""
    providers = []
    for name, config in LLM_PROVIDERS.items():
        providers.append({
            "name": name,
            "model": config.get("model", ""),
            "configured": bool(config.get("api_key"))
        })

    return jsonify({
        "providers": providers,
        "default": os.getenv("LLM_PROVIDER", "minimax")
    })


@chat_bp.route('/api/companies', methods=['GET'])
def list_companies():
    """List all companies in the knowledge base"""
    from knowledge_base.searcher import KnowledgeBaseSearcher
    from config import RESEARCH_REPORTS_DIR, NEWS_DIR

    searcher = KnowledgeBaseSearcher(RESEARCH_REPORTS_DIR, NEWS_DIR)
    companies = searcher.get_company_list()

    return jsonify({
        "total": len(companies),
        "companies": [
            {"name": name, "stock_code": code}
            for name, code in list(companies.items())[:100]
        ]
    })