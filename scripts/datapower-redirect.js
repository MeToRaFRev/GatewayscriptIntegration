var sm = require('service-metadata');
var hm = require('header-metadata');
sm.setVar('var://service/mpgw/skip-backside', true);

if (!session.parameters.URL) session.reject({'override': true}, 'Invalid URL');

hm.response.statusCode = '302 Moved Temporarily';
hm.response.set('Location', session.parameters.URL);