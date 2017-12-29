
# Cities Lost

This is a software platform for documenting places rapidly being
destroyed in U.S. cities due to gentrification: small businesses,
vital community centers, affordable housing, historic and local
landmarks, etc. It aims to help illustrate the high social and
cultural costs of deepening inequality, and also to remember and
commemorate what we've lost.

This is currently "alpha" software; be ready to get your hands dirty
when using this. Stay tuned for more updates and info.

## Features

* A Wikipedia-like site (running the same
  [MediaWiki](http://mediawiki.org) software) that allows open editing
  of information.
* Machine-readable semantic data / open data
* An interactive map application drawing from the MediaWiki data

## Components

* MediaWiki
* An interactive map application that pulls data from the MediaWiki API.

## Installation

This repo contains the code to build the docker image for the
platform. To build it, run:

```
docker build -t citieslost:latest .
```

## Running and Customizing the Platform

See the [seattlelost](https://github.com/codeforkjeff/seattlelost)
repo for an example of how to run and customize the citieslost
platform for your own city.

## Notes

This mainly installs system packages, mediawiki extensions, and copies
scripts into the image.

The image entrypoint is `/opt/citieslost/scripts/bootstrap.sh` which
initializes the database, tweaks config files, and seeds "base" data
needed for the wiki to work. This script, in turns, calls a
city-specific `bootstrap.sh` script that should be mounted into the
running container, for doing additional customization.

Seeding happens each time you start the container, so it will
overwrite any of your changes to the "core" platform wiki pages. So if
you change any of the pages in the `pages/` directory, make sure to put
your version in your city-specific project's `city_specific/pages`
directory.

## TODO

Ordered from highest to lowest priority:

- add captcha and/or social media login
- file uploads: https://www.mediawiki.org/wiki/Manual:Configuring_file_uploads
- interactive map: search form: year slider: "Show places that existed in: 2008"
- add responsive styling for mediawiki

## Credits

This project was inspired by [Ghosts of Seattle Past](http://www.seattleghosts.com/).

## License

This code is distributed under a GNU General Public License. See the file COPYING for details.
