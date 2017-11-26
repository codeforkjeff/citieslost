(function( $ ) {

    var map;
    var options;

    function urlParam(name) {
        var results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(window.location.href);
        if (results==null){
            return null;
        }
        else{
            return decodeURIComponent(results[1].replace(/\+/g, " ")) || 0;
        }
    }

    function askUrl(offset) {
        if(!offset) {
            offset = 0;
        }
        return "/w/api.php?action=ask&query=[[Category:Place]]|%3FAddress|%3FCoordinates|%3FDate_closed|offset=" + offset + "&format=json";
    }

    function getScreenWidth() {
        var w = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
        return w;
    }

    // TODO: ugh, figure out a better way
    var titlesToMarkers = {};

    // warning: this works to generate a usable URL but "page"
    // shouldn't be used for uniquely identifying wiki pages, because
    // of slight url encoding differences in diff contexts
    function titleToPage(title) {
        // preserve slashes by splitting on them and then re-joining
        return title.split(/\//).map(function(piece) {
            return encodeURIComponent(piece.replace(/ /g, "_")).replace(/'/, "%27");
        }).join("/");
    }

    function createContentForMarkerPopup(title, url, dateObj) {
        var link = document.createElement("a");
        link.setAttribute("class", "show-place-detail-link");
        link.setAttribute("data-wiki-title", title);
        link.setAttribute("href", url);
        link.appendChild(document.createTextNode(title));

        var content = document.createElement("div");
        content.appendChild(link);

        if(dateObj) {
            var closed = document.createElement("span");
            closed.appendChild(document.createTextNode("Closed " + dateObj));
            content.appendChild(document.createElement("br"));
            content.appendChild(closed);
        }
        return content;
    }

    function createMarker(map, lat, lng, title, url, dateClosed) {
        var marker = L.marker([lat, lng], { title: title })
                .addTo(map);

        // if you resize to a tiny screen to test in a browser, you
        // need to reload or this won't work.
        if(getScreenWidth() < 768) {
            marker.bindPopup(createContentForMarkerPopup(title, url, dateClosed));
        } else {
            var tooltipText = title;
            if(dateClosed) {
                tooltipText += "<br/>Closed " + dateClosed;
            }
            marker.bindTooltip(tooltipText);

            marker.on("click", function (map, title) {
                return function(event) {
                    loadPlaceDetail(map, title);
                };
            }(map, title));
        }

        titlesToMarkers[title] = marker;
    };

    // map = leafletjs map object
    function loadFromWiki(map, offset) {
        $.ajax({
            url: askUrl(offset),
            dataType: "jsonp",
            success: function(data, textStatus, jqXHR) {
                var results = data.query.results;
                for(var title in results) {
                    var struct = results[title];
                    var address = struct["printouts"]["Address"][0];
                    var coord = struct["printouts"]["Coordinates"][0];
                    var dateClosed = struct["printouts"]["Date closed"][0];
                    var dateClosedText = null;

                    if(dateClosed) {
                        // TODO: semantic plugin gives us a
                        // 'timestamp' field here but it's weird, so
                        // use 'raw' for now
                        dateClosedText = dateClosed["raw"];
                    }

                    if(coord) {
                        createMarker(map, coord.lat, coord.lon, title, struct["fullurl"], dateClosedText);
                    }
                }
                if(data["query-continue-offset"]) {
                    loadFromWiki(map, data["query-continue-offset"]);
                } else {
                    var title = urlParam("goto");
                    if(title && title.length > 0) {
                        choosePlace(title);
                    }
                }
            }
        });
    }

    function moveMapToPlace(map, title) {
        if(placeExists(title)) {
            var marker = titlesToMarkers[title];
            map.setView(marker.getLatLng(), 16);
            setTimeout(function() {
                if(getScreenWidth() < 768) {
                    marker.openPopup();
                } else {
                    marker.openTooltip();
                }
            }, 400);
        } else {
            console.log("ERROR: this should never happen: couldn't find map marker for " + title);
        }
    };

    function placeExists(title) {
        if(titlesToMarkers[title]) {
            return true;
        }
        return false;
    }

    function loadPlaceDetail(map, title) {
        var page = titleToPage(title);
        $.ajax({
            //url: "/w/api.php?action=parse&format=json&page=" + title,
            url: "/w/index.php/" + page + "?action=render",
            //             dataType: "jsonp",
            success: function(data, textStatus, jqXHR) {
                var wikiLink = "/w/index.php/" + page;

                var selector = $("#place-detail .place-content");
                selector.empty();
                selector.append("<h1>" + title + "</h1>");
                selector.append(data);

                $("#place-detail .wiki-link").attr("href", wikiLink);

                showPlaceDetail();
            }
        });
    }

    function showPlaceDetail() {
        if($("#place-detail").hasClass("hide")) {
            $("#map").removeClass("col-md-12").addClass("col-md-8");
            $("#place-detail").removeClass("hide");
            map.invalidateSize();
        }
    }

    function hidePlaceDetail() {
        $("#map").removeClass("col-md-8").addClass("col-md-12");
        $("#place-detail").addClass("hide");
        map.invalidateSize();
    }

    // TODO: needs to be revised to work with new UI
    function searchUsingOpensearch(searchTerm) {
        $.ajax({
            url: "/w/api.php?action=opensearch&format=json&formatversion=2&namespace=0&limit=10&suggest=true&profile=fuzzy-subphrases&search=" + searchTerm,
            success: function(data, textStatus, jqXHR) {
                var names = data[1] || [];
                var links = data[3] || [];
                for(var i = 0; i < names.length; i++) {
                    var name = names[i];
                    var link = links[i];
                    var page = link.split(/index.php\//)[1];
                $("#search-results").append("<a class='show-on-map-link' data-wiki-page=\"" + page + "\" href='#TODO'>" + name + "</a><br/>");
                }
                $("#search-terms").data("lastSearch", searchTerm);
            }
        });
    }

    function searchUsingApi(searchTerm, process) {
        $.ajax({
            url: "/w/api.php?action=query&format=json&list=search&srwhat=title&srsearch=" + encodeURIComponent(searchTerm),
            success: function(data, textStatus, jqXHR) {
                var results = [];
                for(var i = 0; i < data.query.search.length; i++) {
                    var entry = data.query.search[i];
                    results.push(entry.title);
                }
                process(results);
            }
        });
    }

    function choosePlace(title) {
        if(placeExists(title)) {
            if(getScreenWidth() < 768) {
                map.invalidateSize();
                hidePlaceDetail();
            }
            moveMapToPlace(map, title);
            if(getScreenWidth() >= 768) {
                loadPlaceDetail(map, title);
            }
        } else {
            console.log("Place doesn't exist: " + title);
        }
    }

    function load(selector) {
        $(".site-name").html(options.siteName);
        $("title").html(options.siteName + " - Map");

        selector.each(function(idx, element) {
            map = L.map(element, {
                zoomControl: false,
                maxBounds: [[48, -123.5], [47, -121.5]]
            }).setView([47.6205, -122.3493], 13);

            var zoomControl = L.control.zoom({ position: "topright" });
            map.addControl(zoomControl);

	        L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
		        maxZoom: 18,
                minZoom: 11,
		        attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
			        '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
			        'Imagery © <a href="http://mapbox.com">Mapbox</a>',
		        id: 'mapbox.streets',
                accessToken: options.mapBoxToken
	        }).addTo(map);

            loadFromWiki(map);

            $(window).resize(function() {
                map.invalidateSize();
            });

            $("body").on("click", ".show-place-detail-link", function(event) {
                var title = $(event.target).data('wikiTitle');
                loadPlaceDetail(map, title);
                event.preventDefault();
            });

            $("body").on("click", "#place-detail .close", function(event) {
                hidePlaceDetail();
                event.preventDefault();
            });

	        var addPlacePopup = L.popup();
	        map.on('click', function onMapClick(e) {
                var html = "<div style='margin-bottom: 0.5em'>Add a new place at this location</div>"
                         + "<form action='/w/index.php' method='get'>"
                         + "Name: <input name='title' type='text'>"
                         + "<input type='hidden' name='action' value='edit'/>"
                         + "<input type='hidden' name='preload' value='Template:Place_Preload'/>"
                         + "<input type='hidden' name='editintro' value='CitiesLost:NewPlaceInstructions'/>"
                         + "<input type='hidden' name='create' value='Create page'/>"
                         + "<input type='hidden' name='preloadparams[]' value='" + e.latlng.lat + "," + e.latlng.lng + "'/>"
                         + "</form>";
                addPlacePopup.setLatLng(e.latlng)
			                 .setContent(html)
			                 .openOn(map);
	        });

            $("#search").typeahead({
                source: function(searchValue, process) {
                    searchUsingApi(searchValue, process);
                },
                matcher: function(value) {
                    return true;
                },
                afterSelect: function(item) {
                    var title = $("#search").val();
                    choosePlace(title);
                }
            });

            $("#search-form").submit(function(event) {
                choosePlace($("#search").val());
                event.preventDefault();
            });

        });
        return this;
    };

    $.fn.citiesLostMap = function() {
        var selector = this;
        $.ajax({
            url: "/map/config.json",
            success: function(data, textStatus, jqXHR) {
                options = data;
                load(selector);
            },
            error: function(jqXHR, textStatus, errorThrown) {
                console.log("Could not load config.json file");
                console.log(textStatus);
                console.log(errorThrown);
            }
        });
    };
}( jQuery ));
