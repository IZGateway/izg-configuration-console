#!/bin/bash
cd /app

mkdir ./logs

if [[ $ELASTIC_API_KEY ]]
then
    filebeat -e &
    echo Started Filebeat
else
    echo Filebeat logging not enabled
fi

./replace-variable.sh && 
npm start