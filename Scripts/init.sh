#!/bin/bash

#################################################
#####              Functions            #########
#################################################

menu() {
  echo "1) IT Domain (ICERT)"
  echo "2) IoT Domain (ALIAS)"
  echo "3) Domain (CARM)"
  echo "4) Full Platform"
  echo "5) Exit"
  echo
  read -p "Enter the number of your choice (1-4): " option
}

confirmation() {
  read -n 1 -p "Are you sure you want to proceed? (y/n): " confirm
  echo
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

#################################################
#####                Main               #########
#################################################

echo -e "\nWelcome to the step-by-step Resilmesh deployment guide. Select an option based on the deployment you want and your environment:\n"

while true; do
  menu

  case $option in
    1)
      echo "You have selected: IT Domain"
      if confirmation; then
        echo "Proceeding with IT Domain deployment..."
        ./IT_Domain.sh
        break
      else
        echo "Operation cancelled. Returning to menu."
        sleep 2
      fi
      ;;
    2)
      echo "You have selected: IoT Domain"
      if confirmation; then
        echo "Proceeding with IoT Domain deployment..."
        ./IoT_Domain.sh
        break
      else
        echo "Operation cancelled. Returning to menu."
        sleep 2
      fi
      ;;
    3)
      echo "You have selected: Domain"
      if confirmation; then
        echo "Proceeding with Domain deployment..."
        ./Domain.sh
        break
      else
        echo "Operation cancelled. Returning to menu."
        sleep 2
      fi
      ;;
    4)
      echo "You have selected: Full Platform"
      if confirmation; then
        echo "Proceeding with Full Platform deployment..."
        ./script_pending.sh
        break
      else
        echo "Operation cancelled. Returning to menu."
        sleep 2
      fi
      ;;
    5)
      echo "You have selected: Exit"
      if confirmation; then
        echo "Exiting..."
        exit 0
      else
        echo "Operation cancelled. Returning to menu."
        sleep 2
      fi
      ;;
    *)
      echo "❌ Invalid option. Please, try again with a number between 1 to 5."
      sleep 2
      ;;
  esac

done