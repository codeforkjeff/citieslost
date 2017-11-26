#!/bin/bash
# Create pages for all the files found in a directory. arg is a dir without trailing slash

cd $1
find * -type f -exec basename {} \; | xargs -I {} sh -c 'echo "{}"; cat "{}" | php /var/www/html/w/maintenance/edit.php -u $CL_ADMIN_USERNAME "{}"'
