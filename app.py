from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import sqlite3
from datetime import datetime
import os

app = Flask(__name__)
CORS(app)

DB_NAME = 'pg_leads.db'
ADMIN_PASSWORD = 'admin@123'

def init_db():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS inquiries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT NOT NULL,
            room_type TEXT NOT NULL,
            visit_date TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    ''')
    conn.commit()
    conn.close()

init_db()

@app.route('/api/inquire', methods=['POST', 'OPTIONS'])
def add_inquiry():
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    data = request.get_json(force=True, silent=True) or {}
    name = data.get('name', 'Anonymous')
    phone = data.get('phone', 'N/A')
    room_type = data.get('roomType', 'Standard')
    visit_date = data.get('date', 'N/A')
    created_at = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute(
        'INSERT INTO inquiries (name, phone, room_type, visit_date, created_at) VALUES (?, ?, ?, ?, ?)',
        (name, phone, room_type, visit_date, created_at)
    )
    conn.commit()
    conn.close()

    print(f"\n🔔 [NEW INQUIRY]: {name} | {phone} | {room_type} | {visit_date}\n")
    return jsonify({"status": "success", "message": "Inquiry recorded!"}), 201

@app.route('/api/leads', methods=['GET'])
def get_leads():
    auth_header = request.headers.get('Authorization')
    if auth_header != ADMIN_PASSWORD:
        return jsonify({"status": "error", "message": "Unauthorized"}), 401

    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('SELECT id, name, phone, room_type, visit_date, created_at FROM inquiries ORDER BY id DESC')
    rows = cursor.fetchall()
    conn.close()

    leads = [
        {"id": r[0], "name": r[1], "phone": r[2], "roomType": r[3], "date": r[4], "timestamp": r[5]}
        for r in rows
    ]
    return jsonify(leads), 200

@app.route('/api/leads/<int:lead_id>', methods=['DELETE'])
def delete_lead(lead_id):
    auth_header = request.headers.get('Authorization')
    if auth_header != ADMIN_PASSWORD:
        return jsonify({"status": "error", "message": "Unauthorized"}), 401

    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute('DELETE FROM inquiries WHERE id = ?', (lead_id,))
    conn.commit()
    conn.close()
    return jsonify({"status": "success", "message": "Lead deleted"}), 200

@app.route('/')
def serve_index():
    return send_from_directory(os.path.dirname(os.path.abspath(__file__)), 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory(os.path.dirname(os.path.abspath(__file__)), path)

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)