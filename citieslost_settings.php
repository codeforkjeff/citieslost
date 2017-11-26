<?php

$wgAllowImageTag = true;

$wgEnableUploads = true;

$clGeocodeFunction = 'cl_geocode';

function cl_array_search_func(array $arr, $func, $first = true) {
    $i = false;
    foreach ($arr as $key => $v)
        if ($func($v)) {
            $i = $key;
            if($first) {
                break;
            }
        }
    reset($arr);
    return $i;
};

function cl_geocode($address) {
    $url = "https://maps.googleapis.com/maps/api/geocode/json?address=" . urlencode($address) . "&key=" . getenv('GOOGLE_MAPS_API_KEY');
    //error_log($url);
    $json = file_get_contents($url);
    $data = json_decode($json);

    if(property_exists($data, "results")) {
        $result = $data->{"results"}[0];
        if(property_exists($result, "geometry")) {
            return $result->{"geometry"}->{"location"}->{"lat"} //
            . "," . $result->{"geometry"}->{"location"}->{"lng"};
        }
    }
    return null;
}

class CLPage {
    private $lines;
    private $i, $j;

    public function __construct($pageStr) {
        $this->pageStr = $pageStr;
        $this->lines = preg_split('/\n/', $pageStr);
        
        $this->i = cl_array_search_func($this->lines, function($item) {
            return preg_match('/{{infobox.+?place/i', $item);
        });
        $this->j = cl_array_search_func($this->lines, function($item) {
            return preg_match('/}}/', $item);
        });
    }

    public function getInfoboxArgsAsArray() {
        $retArgs = [];
        if($this->i !== false && $this->i >= 0 && $this->j !== false && $this->j >= 1) {
            $args = array_slice($this->lines, $this->i + 1, $this->j - $this->i - 1);
            $pairs = preg_split('/\|/', implode($args));
            $pairs = array_filter($pairs, function($item) { return strlen(trim($item)) > 0; });
            foreach($pairs as $pair) {
                $pair_a = preg_split('/=/', $pair);
                $retArgs[trim($pair_a[0])] = trim($pair_a[1]);
            }
        }
        return $retArgs;
    }

    # replace pairs in infobox
    public function replaceInfoboxArgs($args) {
        $replace = [];
        foreach($args as $k => $v) {
            $replace[] = "|$k = $v";
        }
        array_splice($this->lines, $this->i + 1, $this->j - $this->i - 1, $replace);
    }

    public function replaceSemanticProperties($args) {
        $a = cl_array_search_func($this->lines, function($item) {
            return preg_match('/<!--SEMANTIC_PROPERTIES_BEGIN-->/', $item);
        });
        $b = cl_array_search_func($this->lines, function($item) {
            return preg_match('/<!--SEMANTIC_PROPERTIES_END-->/', $item);
        }, false);

        $replace = [];
        $replace[] = "<!--SEMANTIC_PROPERTIES_BEGIN-->";
        $replace[] = "<!-- This is auto-generated, do not edit -->";
        $replace[] = "{{#set:";
        $needs_pipe = false;
        foreach($args as $k => $v) {
            if($v != "?") {
                $pipe = $needs_pipe ? "|" : "";
                $replace[] = "$pipe$k = $v";
                $needs_pipe = true;
            }
        }
        $replace[] = "}}";
        $replace[] = "<!--SEMANTIC_PROPERTIES_END-->";

        if($a !== false && $a >= 0 && $b !== false && $b >= 1) {
            array_splice($this->lines, $a, $b, $replace);
        } else {
            $this->lines = array_merge($this->lines, $replace);
        }
    }

    function getString() {
        return implode("\n", $this->lines);
    }
}

// TODO: should be moved into an extension
$wgHooks['PageContentSave'][] = function($wikiPage, $user, &$content, $summary, $isMinor, $isWatch, $section, $flags, $status){
    global $clGeocodeFunction;
    if ( $content->getModel() === CONTENT_MODEL_WIKITEXT ) {
        $data = $content->getNativeData();

        if (!preg_match('/^Template:/', $wikiPage->getTitle()) && preg_match ('/Infobox.+place/im', $data)) {
            $clpage = new CLPage($data);
            
            $args = $clpage->getInfoboxArgsAsArray();
            if(!array_key_exists('coordinates', $args) && array_key_exists('address', $args) && $args['address'] != '?') {
                $args['coordinates'] = $clGeocodeFunction($args['address']);
            }
            $clpage->replaceInfoboxArgs($args);
            $clpage->replaceSemanticProperties($args);

            $content = new WikitextContent( $clpage->getString() );
        }
    } 
    return true;
};
