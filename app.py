from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
from datetime import datetime
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

app = Flask(__name__)
CORS(app)

DB_NAME = 'pg_leads.db'
ADMIN_PASSWORD = 'admin@123'  # You can change this anytime

# --- Owner Notification Setup ---
ENABLE_EMAIL = False  # Switch to True when you want live Gmail alerts
SENDER_EMAIL = "amritpratyush84@gmail.com"
SENDER_APP_PASSWORD = "your_16_digit_gmail_app_password"  # Replace with Google App Password
OWNER_RECEIVER_EMAIL = "amritpratyush84@gmail.com"

def send_email_alert(name, phone, room_type, visit_date):
    if not ENABLE_EMAIL:
        return
    try:
        msg = MIMEMultipart()
        msg['From'] = SENDER_EMAIL
        msg['To'] = OWNER_RECEIVER_EMAIL
        msg['Subject'] = f"🔔 New PG Visit Request: {name} ({room_type})"

        body = f"""
        Hello Amrit,

        A new visit request has been submitted on UrbanNest Living:

        • Visitor Name: {name}
        • Contact Phone: {phone}
        • Room Preference: {room_type}
        • Preferred Date: {visit_date}

        Regards,
        UrbanNest Lead System
        """
        msg.attach(MIMEText(body, 'plain'))

        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(SENDER_EMAIL, SENDER_APP_PASSWORD)
        server.send_message(msg)
        server.quit()
        print("📧 [EMAIL SENT]: Notification sent to amritpratyush84@gmail.com")
    except Exception as e:
        print(f"⚠️ [EMAIL ERROR]: {e}")

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

@app.route('/api/inquire', methods=['POST'])
def add_inquiry():
    data = request.get_json()
    name = data.get('name')
    phone = data.get('phone')
    room_type = data.get('roomType')
    visit_date = data.get('date')
    created_at = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    cursor.execute(
        'INSERT INTO inquiries (name, phone, room_type, visit_date, created_at) VALUES (?, ?, ?, ?, ?)',
        (name, phone, room_type, visit_date, created_at)
    )
    conn.commit()
    conn.close()

    print(f"\n🔔 [NEW LEAD RECEIVED]: {name} | Phone: {phone} | Room: {room_type} | Date: {visit_date}\n")
    send_email_alert(name, phone, room_type, visit_date)

    return jsonify({"status": "success", "message": "Inquiry saved"}), 201

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

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=True)