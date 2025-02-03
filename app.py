from flask import Flask, render_template, jsonify, request
import sqlite3
from flask import send_from_directory

app = Flask(__name__)

def get_db_connection():
    conn = sqlite3.connect('apple_tv.db')
    conn.row_factory = sqlite3.Row
    return conn

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/content')
def get_content():
    # Get year range from query parameters
    min_year = request.args.get('minYear', 2000, type=int)
    max_year = request.args.get('maxYear', 2024, type=int)
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Modified query with year range filter
    cursor.execute('''
        SELECT * FROM data 
        WHERE releaseYear IS NOT NULL 
        AND releaseYear != '' 
        AND imdbAverageRating IS NOT NULL 
        AND imdbAverageRating != '' 
        AND genres IS NOT NULL 
        AND genres != ''
        AND CAST(releaseYear AS INTEGER) >= ?
        AND CAST(releaseYear AS INTEGER) <= ?
    ''', (min_year, max_year))
    
    data = cursor.fetchall()
    conn.close()
    
    # Additional validation in Python
    valid_data = []
    for row in data:
        row_dict = dict(row)
        try:
            # Convert releaseYear to integer
            year = int(row_dict['releaseYear'])
            # Only include if within range
            if min_year <= year <= max_year:
                row_dict['releaseYear'] = year
                # Convert rating to float
                row_dict['imdbAverageRating'] = float(row_dict['imdbAverageRating'])
                # Convert votes to integer
                if row_dict['imdbNumVotes']:
                    row_dict['imdbNumVotes'] = int(row_dict['imdbNumVotes'])
                valid_data.append(row_dict)
        except (ValueError, TypeError):
            continue
            
    return jsonify(valid_data)

@app.errorhandler(404)
def page_not_found(e):
    return render_template('404.html'), 404

@app.route('/api/years')
def get_year_range():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT 
            MIN(CAST(releaseYear AS INTEGER)) as minYear,
            MAX(CAST(releaseYear AS INTEGER)) as maxYear
        FROM data 
        WHERE releaseYear IS NOT NULL 
        AND releaseYear != ''
    ''')
    result = cursor.fetchone()
    conn.close()
    return jsonify({
        'minYear': result['minYear'],
        'maxYear': result['maxYear']
    })
@app.route('/countries.html')
def countries():
    return render_template('countries.html')
@app.route('/static/data/country_name.csv')
def serve_csv():
    try:
        return send_from_directory('static/data', 'country_name.csv')
    except Exception as e:
        app.logger.error(f"Error serving CSV: {str(e)}")
        return "Error loading CSV file", 500

@app.route('/api/countries')
def get_countries():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get all movies with their countries and count
    cursor.execute('''
        SELECT availableCountries, COUNT(*) as count 
        FROM data 
        WHERE availableCountries IS NOT NULL 
        AND availableCountries != ''
        GROUP BY availableCountries
    ''')
    
    data = cursor.fetchall()
    conn.close()
    
    # Process the country data with counts
    country_data = {}
    for row in data:
        if row['availableCountries']:
            countries = row['availableCountries'].split(', ')
            for country in countries:
                country = country.strip()
                if country in country_data:
                    country_data[country] += row['count']
                else:
                    country_data[country] = row['count']
    
    # Convert to list of dictionaries for the visualization
    formatted_data = [
        {
            "code": country,
            "count": count
        }
        for country, count in country_data.items()
    ]
    
    return jsonify(formatted_data)


if __name__ == '__main__':
    print("Starting Flask app...")
    app.run(debug=True, host='0.0.0.0', port=5000)
    print("Flask app started")
