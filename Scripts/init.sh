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
  read -p "Enter the number of your choice (1-5): " option
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
#####      Remove before deployment     #########
#################################################

echo -e "Removing any previous Docker containers, images, networks, volumes, and configuration files...\n"
sudo ./remove_all.sh

#################################################
#####                Proxy              #########
#################################################

## Are you behind a proxy? Complete the following information
DOCKER_BASE_PATH=".."
DOCKER_ORIGINAL_FILE="$DOCKER_BASE_PATH/.env.sample"
DOCKER_COPY_FILE="$DOCKER_BASE_PATH/.env"


read -p "Are you behind a proxy? (y/n): " answer

if [[ "$answer" == "y" || "$answer" == "Y" ]]; then
    echo "\nYou said that you have a proxy, let's configure it."
    # If the answer is yes, ask for the proxy configuration
    read -p "Enter your http configuration (Example --> http_proxy=http://<USER>:<PASSWORD>@<PROXY_IP>:<PROXY_PORT>):\n " line1
    read -p "Enter your https configuration (Example --> https_proxy=http://<USER>:<PASSWORD>@<PROXY_IP>:<PROXY_PORT>):\n " line2

    # Add the lines at the end of the .env file
    echo "$line1" >> "$DOCKER_COPY_FILE"
    echo "$line2" >> "$DOCKER_COPY_FILE"

    echo -e "\nYour proxy configuration has been saved in /Docker-Compose/.env\n"
else
    echo -e "\nYou said that you don't have a proxy.\n"
fi

#################################################
#####                Main               #########
#################################################

echo -e "\nWelcome to the step-by-step Resilmesh deployment guide. Select an option based on the deployment you want and your environment:"

while true; do
  menu

  case $option in
    1)
      echo -e "\n\nProceeding with IT Domain deployment..."
      ./IT_Domain.sh
      break
      ;;
    2)
      echo -e "\n\nProceeding with IoT Domain deployment..."
      ./IoT_Domain.sh
      break
      ;;
    3)
      echo -e "\n\nProceeding with Domain deployment..."
      ./Domain.sh
      break
      ;;
    4)
      echo -e "\n\nProceeding with Full Platform deployment..."
      ./Full_Platform.sh
      break
      ;;
    5)
      echo -e "\n\nExiting..."
      exit 0
      ;;
    *)
      echo -e "\n❌ Invalid option. Please, try again with a number between 1 to 5."
      ;;
  esac

done