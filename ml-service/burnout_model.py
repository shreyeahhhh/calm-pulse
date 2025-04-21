from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
from datetime import datetime, timedelta

app = Flask(__name__)

# Enable CORS for all routes and origins
CORS(app, resources={
    r"/*": {
        "origins": "*",
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

@app.route('/', methods=['GET', 'OPTIONS'])
def home():
    if request.method == 'OPTIONS':
        return make_response()

    return jsonify({
        'name': 'Tech Breaks ML Service',
        'status': 'running',
        'time': datetime.now().isoformat(),
        'endpoints': {
            '/': {
                'method': 'GET',
                'description': 'Service information'
            },
            '/predict': {
                'method': 'POST',
                'description': 'Predict burnout risk',
                'example_payload': {
                    'screen_time': 180,  # minutes
                    'breaks': 1,         # number of breaks taken
                    'last_break': 90,    # minutes since last break
                    'mood': 3,           # mood score (1-5)
                    'sleep': 7           # hours of sleep
                }
            }
        }
    })

def calculate_burnout_risk(screen_time_minutes, break_count, last_break_minutes_ago, mood_score, sleep_hours):
    """
    Simple rule-based burnout risk assessment
    Returns risk level: 0 (low), 1 (medium), 2 (high)
    """
    risk_score = 0
    
    # Screen time factor
    if screen_time_minutes > 240:  # 4 hours
        risk_score += 2
    elif screen_time_minutes > 120:  # 2 hours
        risk_score += 1
    
    # Break frequency factor
    if break_count == 0:
        risk_score += 2
    elif break_count < 2:
        risk_score += 1
    
    # Time since last break factor
    if last_break_minutes_ago > 120:  # 2 hours
        risk_score += 2
    elif last_break_minutes_ago > 60:  # 1 hour
        risk_score += 1
    
    # Additional factors: mood and sleep
    # Mood factor (lower mood increases risk)
    if mood_score <= 2:
        risk_score += 2
    elif mood_score <= 3:
        risk_score += 1
    # Sleep factor (less sleep increases risk)
    if sleep_hours < 5:
        risk_score += 2
    elif sleep_hours < 7:
        risk_score += 1
    
    # Normalize score to 0-2 range (revert to //2 for higher sensitivity)
    return min(2, risk_score // 2)

## Reverted to rule-based only, removed model loading

@app.route('/predict', methods=['POST', 'OPTIONS'])
def predict():
    if request.method == 'OPTIONS':
        return make_response()

    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        screen_time = data.get('screen_time', 0)  # minutes
        breaks = data.get('breaks', 0)
        last_break = data.get('last_break', 120)  # minutes ago
        mood = data.get('mood', 3)
        sleep = data.get('sleep', 7)
        
        risk_level = calculate_burnout_risk(screen_time, breaks, last_break, mood, sleep)
        
        return jsonify({
            'burnout_risk': risk_level,
            'risk_level': ['low', 'medium', 'high'][risk_level],
            'recommendations': get_recommendations(risk_level)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 400

def get_recommendations(risk_level):
    recommendations = {
        0: ["You're doing great! Keep up the healthy habits!"],
        1: ["Consider taking a short break",
            "Do some quick stretches",
            "Drink some water"],
        2: ["Take a longer break immediately",
            "Go for a short walk",
            "Do some deep breathing exercises",
            "Consider ending your work session soon"]
    }
    return recommendations[risk_level]

if __name__ == '__main__':
    print("\n" + "="*50)
    print("Starting Tech Breaks ML Service...")
    print("API will be available at: http://localhost:5001")
    print("Try visiting http://localhost:5001 in your browser")
    print("="*50 + "\n")
    # Run on all interfaces (0.0.0.0) to ensure it's accessible
    app.run(host='0.0.0.0', port=5001, debug=True)
