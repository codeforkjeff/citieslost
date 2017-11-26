#!/bin/sh
#
# entrypoint for docker container

echo "Running bootstrap.sh"

if [ ! -f "/var/www/html/w/LocalSettings.php" ]
then

    echo "Waiting for database to come up..."
    sleep 10

    echo "Running mediawiki install.php"
    
    php /var/www/html/w/maintenance/install.php \
        --dbserver database \
        --dbname $MYSQL_DATABASE \
        --dbuser $MYSQL_USER \
        --dbpass $MYSQL_PASSWORD \
        --pass $CL_ADMIN_PASSWORD \
        --scriptpath "/w" \
        CitiesLost $CL_ADMIN_USERNAME

    echo "Tweaking LocalSettings.php"
    
    echo "include 'citieslost_extensions.php';\n" >> /var/www/html/w/LocalSettings.php
    echo "include 'citieslost_settings.php';\n" >> /var/www/html/w/LocalSettings.php
    echo "include 'citieslost_city_specific.php';\n" >> /var/www/html/w/LocalSettings.php

    # update.php needs to run to initialize semantic extension
    echo "Running update.php"
    php /var/www/html/w/maintenance/update.php
    
fi

echo "Seeding pages"
# overlay with city specific pages; this prevents unnecessary edit history
mkdir /tmp/all_pages
cp /opt/citieslost/pages/* /tmp/all_pages
if [ -d "/opt/citieslost/city_specific/pages" ]; then
    cp /opt/citieslost/city_specific/pages/* /tmp/all_pages
fi
cd /opt/citieslost/scripts
./create_pages.sh /tmp/all_pages
rm -rf /tmp/all_pages

echo "Seeding image uploads"
# overlay with city specific images; this prevents unnecessary edit history
mkdir /tmp/all_images
cp /opt/citieslost/images/* /tmp/all_images
if [ -d "/opt/citieslost/city_specific/images" ]; then
    cp /opt/citieslost/city_specific/images/* /tmp/all_images
fi
cd /opt/citieslost/scripts
php /var/www/html/w/maintenance/importImages.php /tmp/all_images
rm -rf /tmp/all_images

# always run city-specific bootstrap.sh; it's responsible for being idempotent
echo "Running city-specific bootstrap.sh"
cd /opt/citieslost/city_specific
./bootstrap.sh

echo "Running runJobs.php"
php /var/www/html/w/maintenance/runJobs.php

echo "Starting Apache/PHP"
# this doesn't work, I don't know why
# exec /usr/local/bin/docker-php-entrypoint
exec apache2-foreground
