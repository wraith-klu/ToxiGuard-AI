#!/usr/bin/env bash
# ==============================================================================
# ToxiGuard AI — Automated Oracle Cloud Free Tier Deployment Script
# Target OS: Ubuntu 20.04 / 22.04 / 24.04 LTS (ARM64 or x86_64)
# ==============================================================================

set -e

echo "🚀 Starting ToxiGuard AI Backend Deployment on Oracle Cloud..."

# 1. Update System Packages
echo "📦 Updating system packages..."
sudo apt-get update -y
sudo apt-get install -y git curl python3 python3-pip python3-venv iptables-persistent

# 2. Configure Firewall (Oracle Ubuntu iptables default rule bypass)
echo "🛡️ Opening ports 8000, 80, 443 in local firewall..."
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 8000 -j ACCEPT || true
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT || true
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT || true
sudo netfilter-persistent save || true

# 3. Setup Python Virtual Environment
echo "🐍 Setting up Python virtual environment..."
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

source venv/bin/activate

# 4. Install Dependencies
echo "📥 Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# 5. Create .env file if not present
if [ ! -f ".env" ]; then
    echo "⚙️ Creating default .env file..."
    cat <<EOT > .env
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_MODEL=google/gemma-4-31b-it:free
OPENROUTER_FALLBACK_MODEL=qwen/qwen3-next-80b-a3b-instruct:free
DATABASE_URL=sqlite:///./toxiguard.db
JWT_SECRET=$(python3 -c "import secrets; print(secrets.token_hex(32))")
ALLOWED_ORIGINS=*
EOT
    echo "⚠️ Please edit backend/.env to set your actual OPENROUTER_API_KEY!"
fi

# 6. Train initial ML Model weights
echo "🤖 Training initial ML classifier weights..."
python train_model.py || true

# 7. Create Systemd Service for Auto-Restart
echo "⚙️ Registering Systemd background service (toxiguard)..."
SERVICE_FILE="/etc/systemd/system/toxiguard.service"
USER_NAME=$(whoami)

sudo bash -c "cat <<EOT > $SERVICE_FILE
[Unit]
Description=ToxiGuard AI FastAPI Backend Engine
After=network.target

[Service]
User=$USER_NAME
WorkingDirectory=$SCRIPT_DIR
ExecStart=$SCRIPT_DIR/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2
Restart=always
RestartSec=5
Environment=PATH=$SCRIPT_DIR/venv/bin:\$PATH

[Install]
WantedBy=multi-user.target
EOT"

# 8. Start Service
echo "🔄 Reloading systemd daemon and starting ToxiGuard service..."
sudo systemctl daemon-reload
sudo systemctl enable toxiguard
sudo systemctl restart toxiguard

echo "=============================================================================="
echo "✅ ToxiGuard AI Backend is successfully deployed and running!"
echo "🌐 Test URL: http://$(curl -s ifconfig.me):8000/docs"
echo "📊 Check service status: sudo systemctl status toxiguard"
echo "📜 View live logs: sudo journalctl -u toxiguard -f"
echo "=============================================================================="
