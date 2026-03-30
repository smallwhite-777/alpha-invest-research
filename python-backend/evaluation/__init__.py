# Evaluation module for testing-optimization loop
# Provides similarity evaluation and data extraction capabilities

from .similarity_evaluator import SimilarityEvaluator, EvaluationResult
from .data_extractor import FinancialDataExtractor, DataPoint

__all__ = [
    'SimilarityEvaluator',
    'EvaluationResult',
    'FinancialDataExtractor',
    'DataPoint',
]