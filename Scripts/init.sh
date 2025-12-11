#!/bin/bash

#################################################
#####              Functions            #########
#################################################

menu() {
  echo
  echo "1) IT Domain (ICERT)"
  echo "2) IoT Domain (ALIAS)"
  echo "3) Domain (CARM)"
  echo "4) Full Platform"
  echo "5) Exit"
  echo
  read -p "Enter the number of your choice (1-4): " option
}

confirmation() {
  echo
  read -n 1 -p "Are you sure you want to proceed? (y/n): " confirm
  if [[ "$confirm" == "y" || "$confirm" == "Y" ]]; then
    return 0  # User confirmed
  else
    return 1  # User did not confirm
  fi
}

#################################################
#####                Header             #########
#################################################

echo -e "\n\n\n"
cat <<'EOF'
 /$$$$$$$                      /$$ /$$ /$$      /$$                     /$$
| $$__  $$                    |__/| $$| $$$    /$$$                    | $$
| $$  \ $$  /$$$$$$   /$$$$$$$ /$$| $$| $$$$  /$$$$  /$$$$$$   /$$$$$$$| $$$$$$$
| $$$$$$$/ /$$__  $$ /$$_____/| $$| $$| $$ $$/$$ $$ /$$__  $$ /$$_____/| $$__  $$
| $$__  $$| $$$$$$$$|  $$$$$$ | $$| $$| $$  $$$| $$| $$$$$$$$|  $$$$$$ | $$  \ $$
| $$  \ $$| $$_____/ \____  $$| $$| $$| $$\  $ | $$| $$_____/ \____  $$| $$  | $$
| $$  | $$|  $$$$$$$ /$$$$$$$/| $$| $$| $$ \/  | $$|  $$$$$$$ /$$$$$$$/| $$  | $$
|__/  |__/ \_______/|_______/ |__/|__/|__/     |__/ \_______/|_______/ |__/  |__/
EOF
echo -e "\n\n\n"

#################################################
#####                Proxy              #########
#################################################

## Are you behind a proxy? Complete the following information
DOCKER_BASE_PATH=".."
DOCKER_ORIGINAL_FILE="$DOCKER_BASE_PATH/.env.sample"
DOCKER_COPY_FILE="$DOCKER_BASE_PATH/.env"


read -n 1 -p "Are you behind a proxy? (y/n): " answer

if [[ "$answer" == "y" || "$answer" == "Y" ]]; then
    echo "You said that you have a proxy, let's configure it."
    # If the answer is yes, ask for the proxy configuration
    read -p "Enter your http configuration (Example --> http_proxy=http://<USER>:<PASSWORD>@<PROXY_IP>:<PROXY_PORT>):\n " line1
    read -p "Enter your https configuration (Example --> https_proxy=http://<USER>:<PASSWORD>@<PROXY_IP>:<PROXY_PORT>):\n " line2

    # Add the lines at the end of the .env file
    echo "$line1" >> "$DOCKER_COPY_FILE"
    echo "$line2" >> "$DOCKER_COPY_FILE"

    echo "Your proxy configuration has been saved in /Docker-Compose/.env"
else
    echo -e "\nYou said that you don't have a proxy.\n\n"
fi

###############################################
# Install Docker + Docker Compose v2
###############################################
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo $UBUNTU_CODENAME) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

sudo systemctl enable --now docker
sudo usermod -aG docker ubuntu

#################################################
#####                Main               #########
#################################################

echo -e "\nWelcome to the step-by-step Resilmesh deployment guide. Select an option based on the deployment you want and your environment:"

while true; do
  menu

  case $option in
    1)
      echo -e "\nYou have selected: IT Domain"
      if confirmation; then
        echo -e "\nProceeding with IT Domain deployment..."
        ./IT_Domain.sh
        break
      else
        echo -e "\nOperation cancelled. Returning to menu..."
        sleep 2
      fi
      ;;
    2)
      echo -e "\nYou have selected: IoT Domain"
      if confirmation; then
        echo -e "\nProceeding with IoT Domain deployment..."
        ./IoT_Domain.sh
        break
      else
        echo -e "\nOperation cancelled. Returning to menu..."
        sleep 2
      fi
      ;;
    3)
      echo -e "\nYou have selected: Domain"
      if confirmation; then
        echo -e "\nProceeding with Domain deployment..."
        ./Domain.sh
        break
      else
        echo -e "\nOperation cancelled. Returning to menu..."
        sleep 2
      fi
      ;;
    4)
      echo -e "\nYou have selected: Full Platform"
      if confirmation; then
        echo -e "\nProceeding with Full Platform deployment..."
        ./Full_Platform.sh
        break
      else
        echo -e "\nOperation cancelled. Returning to menu..."
        sleep 2
      fi
      ;;
    5)
      echo -e "\nYou have selected: Exit"
      if confirmation; then
        echo -e "\nExiting..."
        exit 0
      else
        echo -e "\nOperation cancelled. Returning to menu..."
        sleep 2
      fi
      ;;
    *)
      echo -e "\n❌ Invalid option. Please, try again with a number between 1 to 5."
      sleep 2
      ;;
  esac

done