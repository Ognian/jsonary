#!/bin/bash
supervisor -e 'js|json|css' --watch .,../jsonary,../plugins,../renderers,../node-package --ignore public/bundle.js,public/bundle.css,../node-package/core,../node-package/super-bundle site.js