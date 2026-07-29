"""Kent server wrapper with CORS support for browser-based testing."""
from flask_cors import CORS
from kent.app import create_app

app = create_app()
CORS(app)  # Enable CORS for all origins

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)
