#Create a test instance of the database and run in docker for local development and demonstrations
FROM mysql:5.7.15

ENV MYSQL_DATABASE=phiz
ENV MYSQL_ROOT_PASSWORD=admin

ADD schema.sql /docker-entrypoint-initdb.d

EXPOSE 3306