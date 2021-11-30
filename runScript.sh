if [ ! -f .env ]
then
  export $(cat .env | xargs)
fi
/home/ubuntu/.volta/bin/node /home/ubuntu/activate-rewards-script/index.js
