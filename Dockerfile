
FROM mediawiki:1.29.2

RUN mv /var/www/html /var/www/html_old && mkdir /var/www/html && mv /var/www/html_old /var/www/html/w
WORKDIR /var/www/html/w

RUN apt update && apt install -y zip unzip vim

RUN curl https://getcomposer.org/composer.phar -o /usr/local/bin/composer
RUN chmod a+x /usr/local/bin/composer

# these are now installed by composer
#ADD Scribunto-REL1_29-f1a4d6c.tar.gz /var/www/html/w/extensions
#ADD Semantic_MediaWiki_2.5.4_and_dependencies.tgz /var/www/html/w/extensions

ADD composer.local.json /var/www/html/w

RUN composer update

ADD extensions/Capiunto-REL1_29-26a104e.tar.gz /var/www/html/w/extensions
ADD extensions/intersection-REL1_29-3316660.tar.gz /var/www/html/w/extensions
ADD extensions/LinkTarget-REL1_29-2ee2b42.tar.gz /var/www/html/w/extensions
ADD extensions/News-REL1_29-4c4d51a.tar.gz /var/www/html/w/extensions

COPY citieslost_extensions.php /var/www/html/w
COPY citieslost_settings.php /var/www/html/w
COPY citieslost_city_specific.php /var/www/html/w

COPY htaccess /var/www/html/.htaccess

RUN mkdir -p /opt/citieslost/city_specific
RUN mkdir -p /opt/citieslost/scripts
RUN mkdir -p /opt/citieslost/pages

COPY city_specific /opt/citieslost/city_specific
COPY scripts /opt/citieslost/scripts
COPY pages /opt/citieslost/pages

RUN mkdir /var/www/html/map
COPY map /var/www/html/map

ENTRYPOINT ["/opt/citieslost/scripts/bootstrap.sh"]
