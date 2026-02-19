export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y docker.io curl git
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
# Install pnpm
corepack enable
npm install -g pnpm
