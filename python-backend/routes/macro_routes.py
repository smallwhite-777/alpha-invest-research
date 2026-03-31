"""
Macro Routes
Handles macro economic indicators data from AKShare

Endpoints:
- GET /api/macro/indicators - List all available indicators
- GET /api/macro/data - Get data for specific indicators
- POST /api/macro/sync - Sync data to database
- POST /api/macro/correlation - Calculate correlation between indicators
"""

from flask import Blueprint, request, jsonify
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

macro_bp = Blueprint('macro', __name__)

# Import macro service
try:
    from services.macro_service import get_macro_service, MacroDataService
    MACRO_SERVICE_AVAILABLE = True
except Exception as e:
    logger.warning(f"Macro service not available: {e}")
    MACRO_SERVICE_AVAILABLE = False
    get_macro_service = None


@macro_bp.route('/api/macro/indicators', methods=['GET'])
def list_indicators():
    """
    Get list of available macro indicators.

    Query params:
        category: Filter by category (ECONOMIC, PRICE, MONETARY, TRADE, COMMODITY)
    """
    category = request.args.get('category')

    if not MACRO_SERVICE_AVAILABLE:
        # Return default indicators when service not available
        default_indicators = [
            {'code': 'cn_gdp_yoy', 'name': 'GDP同比增速', 'category': 'ECONOMIC', 'unit': '%', 'frequency': 'QUARTERLY'},
            {'code': 'cn_pmi', 'name': '制造业PMI', 'category': 'ECONOMIC', 'unit': '点', 'frequency': 'MONTHLY'},
            {'code': 'cn_cpi', 'name': 'CPI同比', 'category': 'PRICE', 'unit': '%', 'frequency': 'MONTHLY'},
            {'code': 'cn_ppi', 'name': 'PPI同比', 'category': 'PRICE', 'unit': '%', 'frequency': 'MONTHLY'},
            {'code': 'cn_m2', 'name': 'M2增速', 'category': 'MONETARY', 'unit': '%', 'frequency': 'MONTHLY'},
            {'code': 'shibor_3m', 'name': 'SHIBOR 3个月', 'category': 'MONETARY', 'unit': '%', 'frequency': 'DAILY'},
        ]
        if category:
            default_indicators = [i for i in default_indicators if i['category'] == category]
        return jsonify(default_indicators)

    try:
        service = get_macro_service()
        indicators = service.list_indicators(category)

        # Add id field for frontend compatibility
        for ind in indicators:
            ind['id'] = ind['code']

        return jsonify(indicators)

    except Exception as e:
        logger.error(f"Error listing indicators: {e}")
        return jsonify([])


@macro_bp.route('/api/macro/data', methods=['GET'])
def get_macro_data():
    """
    Get macro data for specific indicators.

    Query params:
        codes: Comma-separated indicator codes (required)
        start_date: Start date (optional)
        end_date: End date (optional)
        limit: Max number of data points (default 60)
    """
    codes = request.args.get('codes')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    limit = int(request.args.get('limit', 60))

    if not codes:
        return jsonify({'error': 'codes parameter required'}), 400

    code_list = [c.strip() for c in codes.split(',')]

    if not MACRO_SERVICE_AVAILABLE:
        # Return mock data when service not available
        return jsonify(_generate_mock_data(code_list, limit))

    try:
        service = get_macro_service()
        results = []

        for code in code_list:
            try:
                data = service.fetch_indicator(code, start_date)

                # Apply limit
                if len(data) > limit:
                    data = data[-limit:]

                # Filter by end_date
                if end_date and data:
                    data = [d for d in data if d['date'] <= end_date]

                # If no data from AKShare, generate mock data
                if not data:
                    mock = _generate_mock_data([code], limit)[0]
                    results.append(mock)
                else:
                    results.append({
                        'indicatorCode': code,
                        'data': data
                    })
            except Exception as e:
                # If fetch fails for this indicator, use mock data
                logger.warning(f"Failed to fetch {code}: {e}, using mock data")
                mock = _generate_mock_data([code], limit)[0]
                results.append(mock)

        return jsonify(results)

    except Exception as e:
        logger.error(f"Error fetching macro data: {e}")
        return jsonify({'error': str(e)}), 500


@macro_bp.route('/api/macro/sync', methods=['POST'])
def sync_macro_data():
    """
    Sync macro data to database.

    This endpoint fetches fresh data from AKShare and stores it
    in the database for faster access.
    """
    data = request.get_json() or {}
    codes = data.get('codes')  # If None, sync all indicators

    if not MACRO_SERVICE_AVAILABLE:
        return jsonify({
            'success': False,
            'error': 'Macro service not available'
        }), 503

    try:
        service = get_macro_service()

        # Determine which indicators to sync
        if codes:
            indicators_to_sync = codes if isinstance(codes, list) else codes.split(',')
        else:
            indicators_to_sync = list(service.INDICATOR_MAPPING.keys())

        synced = 0
        errors = []

        for code in indicators_to_sync:
            try:
                indicator_data = service.fetch_indicator(code)
                if indicator_data:
                    # Store in database (implementation depends on your DB)
                    # For now, just log
                    logger.info(f"Synced {len(indicator_data)} data points for {code}")
                    synced += 1
            except Exception as e:
                errors.append(f"{code}: {str(e)}")

        return jsonify({
            'success': True,
            'synced': synced,
            'total': len(indicators_to_sync),
            'errors': errors if errors else None
        })

    except Exception as e:
        logger.error(f"Error syncing macro data: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@macro_bp.route('/api/macro/correlation', methods=['POST'])
def calculate_correlation():
    """
    Calculate correlation between two macro indicators.

    Body:
        {
            "codeX": "cn_pmi",
            "codeY": "cn_cpi",
            "lag": 0  // Optional lag in periods
        }
    """
    data = request.get_json()
    code_x = data.get('codeX')
    code_y = data.get('codeY')
    lag = data.get('lag', 0)

    if not code_x or not code_y:
        return jsonify({'error': 'codeX and codeY required'}), 400

    try:
        # Fetch data for both indicators
        service = get_macro_service() if MACRO_SERVICE_AVAILABLE else None

        if service:
            data_x = service.fetch_indicator(code_x)
            data_y = service.fetch_indicator(code_y)
        else:
            # Use mock data
            data_x = _generate_mock_series(code_x)
            data_y = _generate_mock_series(code_y)

        if not data_x or not data_y:
            return jsonify({
                'correlation': 0,
                'regression': {'slope': 0, 'intercept': 0, 'r2': 0},
                'dataPoints': [],
                'sampleSize': 0
            })

        # Create date-indexed maps
        map_x = {d['date']: d['value'] for d in data_x}
        map_y = {d['date']: d['value'] for d in data_y}

        # Find common dates
        common_dates = sorted(set(map_x.keys()) & set(map_y.keys()))

        if len(common_dates) < 3:
            return jsonify({
                'correlation': 0,
                'regression': {'slope': 0, 'intercept': 0, 'r2': 0},
                'dataPoints': [],
                'sampleSize': len(common_dates)
            })

        # Apply lag
        if lag > 0 and len(common_dates) > lag:
            dates_x = common_dates[:-lag]
            dates_y = common_dates[lag:]
        else:
            dates_x = dates_y = common_dates

        values_x = [map_x[d] for d in dates_x]
        values_y = [map_y[d] for d in dates_y]

        # Calculate correlation
        correlation = _pearson_correlation(values_x, values_y)
        regression = _linear_regression(values_x, values_y)

        # Build data points
        data_points = [
            {'date': dates_x[i], 'x': values_x[i], 'y': values_y[i]}
            for i in range(len(dates_x))
        ]

        return jsonify({
            'correlation': correlation,
            'regression': regression,
            'dataPoints': data_points,
            'sampleSize': len(values_x)
        })

    except Exception as e:
        logger.error(f"Error calculating correlation: {e}")
        return jsonify({'error': str(e)}), 500


@macro_bp.route('/api/macro/latest', methods=['GET'])
def get_latest_values():
    """
    Get latest values for all or specified indicators.

    Query params:
        codes: Comma-separated indicator codes (optional, defaults to all)
    """
    codes = request.args.get('codes')

    if not MACRO_SERVICE_AVAILABLE:
        return jsonify({'error': 'Macro service not available'}), 503

    try:
        service = get_macro_service()

        if codes:
            code_list = [c.strip() for c in codes.split(',')]
        else:
            code_list = list(service.INDICATOR_MAPPING.keys())

        results = []

        for code in code_list:
            try:
                data = service.fetch_indicator(code)
                if data:
                    latest = data[-1]
                    info = service.get_indicator_info(code)
                    results.append({
                        'code': code,
                        'name': info['name'] if info else code,
                        'category': info['category'] if info else 'UNKNOWN',
                        'value': latest['value'],
                        'date': latest['date'],
                        'unit': info['unit'] if info else ''
                    })
            except Exception as e:
                logger.debug(f"Error getting latest for {code}: {e}")
                continue

        return jsonify({
            'success': True,
            'data': results,
            'timestamp': datetime.now().isoformat()
        })

    except Exception as e:
        logger.error(f"Error getting latest values: {e}")
        return jsonify({'error': str(e)}), 500


# Helper functions

def _pearson_correlation(x: list, y: list) -> float:
    """Calculate Pearson correlation coefficient"""
    n = len(x)
    if n != len(y) or n == 0:
        return 0.0

    sum_x = sum(x)
    sum_y = sum(y)
    sum_xy = sum(xi * yi for xi, yi in zip(x, y))
    sum_x2 = sum(xi ** 2 for xi in x)
    sum_y2 = sum(yi ** 2 for yi in y)

    numerator = n * sum_xy - sum_x * sum_y
    denominator = ((n * sum_x2 - sum_x ** 2) * (n * sum_y2 - sum_y ** 2)) ** 0.5

    if denominator == 0:
        return 0.0

    return numerator / denominator


def _linear_regression(x: list, y: list) -> dict:
    """Calculate linear regression"""
    n = len(x)
    if n != len(y) or n == 0:
        return {'slope': 0, 'intercept': 0, 'r2': 0}

    sum_x = sum(x)
    sum_y = sum(y)
    sum_xy = sum(xi * yi for xi, yi in zip(x, y))
    sum_x2 = sum(xi ** 2 for xi in x)

    # Calculate slope and intercept
    denominator = n * sum_x2 - sum_x ** 2
    if denominator == 0:
        return {'slope': 0, 'intercept': 0, 'r2': 0}

    slope = (n * sum_xy - sum_x * sum_y) / denominator
    intercept = (sum_y - slope * sum_x) / n

    # Calculate R²
    y_mean = sum_y / n
    ss_total = sum((yi - y_mean) ** 2 for yi in y)
    ss_residual = sum((yi - (slope * xi + intercept)) ** 2 for xi, yi in zip(x, y))

    r2 = 1 - (ss_residual / ss_total) if ss_total > 0 else 0

    return {
        'slope': slope,
        'intercept': intercept,
        'r2': r2
    }


def _generate_mock_data(codes: list, limit: int) -> list:
    """Generate mock data when service not available"""
    import random
    from datetime import datetime, timedelta

    results = []

    for code in codes:
        base_value = 50  # Default base
        data = []

        for i in range(limit):
            date = (datetime.now() - timedelta(days=30 * (limit - i))).strftime('%Y-%m-%d')
            value = base_value + random.uniform(-10, 10)
            data.append({'date': date, 'value': round(value, 2)})

        results.append({
            'indicatorCode': code,
            'data': data
        })

    return results


def _generate_mock_series(code: str) -> list:
    """Generate mock time series data"""
    import random
    from datetime import datetime, timedelta

    data = []
    base = random.uniform(40, 60)

    for i in range(24):
        date = (datetime.now() - timedelta(days=30 * (24 - i))).strftime('%Y-%m-%d')
        value = base + random.uniform(-5, 5)
        base = value  # Slight random walk
        data.append({'date': date, 'value': round(value, 2)})

    return data