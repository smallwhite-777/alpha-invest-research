"""
Flask Main Application (Modular Version)
Multi-Agent Investment Research QA System

This is a refactored version of app.py using Blueprints for better organization.
Routes are split into:
- chat_bp: Query, health, providers
- stock_bp: Price, search, valuation, peers
- financial_bp: Radar, dupont, dcf, growth, risk, pe-band
- market_bp: News, sectors, macro, cache

Usage:
    python app_v2.py

Or import and run:
    from app_v2 import app
    app.run()
"""

from flask import Flask
from flask_cors import CORS
import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

# Import configuration
from config import FLASK_CONFIG, INDEX_ENABLED

# Import routes
from routes import chat_bp, stock_bp, financial_bp, market_bp, macro_bp

# Initialize knowledge base index on startup
if INDEX_ENABLED:
    try:
        from knowledge_base.index_manager import initialize_index
        if initialize_index():
            print("[Index] Knowledge base index loaded successfully")
        else:
            print("[Index] Warning: Failed to load index, will build on first use")
    except Exception as e:
        print(f"[Index] Warning: Index initialization failed: {e}")

# Initialize task scheduler
SCHEDULER_ENABLED = os.environ.get('SCHEDULER_ENABLED', 'true').lower() == 'true'
if SCHEDULER_ENABLED:
    try:
        from scheduler import start_scheduler
        if start_scheduler():
            print("[Scheduler] Task scheduler started successfully")
        else:
            print("[Scheduler] Warning: Task scheduler not started")
    except Exception as e:
        print(f"[Scheduler] Warning: Scheduler initialization failed: {e}")

# Create Flask app
app = Flask(__name__)
CORS(app)

# Register blueprints
app.register_blueprint(chat_bp)
app.register_blueprint(stock_bp)
app.register_blueprint(financial_bp)
app.register_blueprint(market_bp)
app.register_blueprint(macro_bp)

print("[App] All routes registered successfully")
print("[App] Available endpoints:")
for rule in app.url_map.iter_rules():
    print(f"  {rule.methods} {rule.rule}")


if __name__ == '__main__':
    app.run(
        host=FLASK_CONFIG.get('host', '0.0.0.0'),
        port=FLASK_CONFIG.get('port', 5001),
        debug=FLASK_CONFIG.get('debug', True)
    )