#!/bin/bash

echo "Welcome to the step-by-step Resilmesh deployment guide. Select an option based on the deployment you want and your environment:"
echo "1) IT Domain (ICERT)"
echo "2) IoT Domain (ALIAS)"
echo "3) Domain (CARM)"
echo "4) Full Platform"
echo

read -p "Enter the number of your choice(1-4): " option

case $option in
  1)
    echo "You have selected: IT Domain"
    bash IT_Domain.sh
    ;;
  2)
    echo "You have selected: IoT Domain"
    bash IoT_Domain.sh
    ;;
  3)
    echo "You have selected: Domain"
    bash Domain.sh
    ;;
  4)
    echo "You have selected: Full Platform"
    bash script_pending.sh
    ;;
  *)
    echo "❌ Invalid option. Please, try again with a number between 1 to 4."
    exit 1
    ;;
esac
