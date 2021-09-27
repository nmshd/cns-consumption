export CONNECTION_STRING="mongodb://localhost:27025/?readPreference=primary&appname=ConsumptionLib&ssl=false"

docker-compose -f test/docker-compose.yml up -d
