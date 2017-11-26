<?php

wfLoadExtension( 'InputBox' );

require_once "$IP/extensions/Scribunto/Scribunto.php";
$wgScribuntoDefaultEngine = 'luastandalone';

# don't need this when installed using composer
#require_once "$IP/extensions/SemanticMediaWiki/SemanticMediaWiki.php";

enableSemantics( 'example.org' );

require_once "$IP/extensions/Capiunto/Capiunto.php";

wfLoadExtension( 'intersection' );

require_once "$IP/extensions/LinkTarget/LinkTarget.php";
$wgLinkTargetParentClasses = 'open-link-in-new-window';

require_once "$IP/extensions/News/News.php";
