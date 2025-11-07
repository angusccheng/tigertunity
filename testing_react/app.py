from flask import Flask, jsonify, send_from_directory
import random

app = Flask(__name__)

# Serve the index.html file from /static
@app.route('/')
def serve_index():
    return send_from_directory('public', 'index.html')

# AJAX route: return a random message
@app.route('/message')
def get_message():
    messages = [
        "Hello from the Flask server!",
        "AJAX makes web apps smooth 😎",
        "Flask + JS = dynamic magic ✨",
        "No page reload needed 🚀"
    ]
    return jsonify({"message": random.choice(messages)})

if __name__ == '__main__':
    app.run(debug=True)
