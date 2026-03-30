"""
Routes module for Flask application
"""
from .chat_routes import chat_bp
from .stock_routes import stock_bp
from .financial_routes import financial_bp
from .market_routes import market_bp
from .macro_routes import macro_bp

__all__ = ['chat_bp', 'stock_bp', 'financial_bp', 'market_bp', 'macro_bp']