/* eslint-disable no-undef */
if (!session.parameters.BaseURL) session.parameters.BaseURL = 'http://localhost'; 			// default base-url (if wasn't configured).
if (!session.parameters.Timeout) session.parameters.Timeout = 30; 					// default timeout (in seconds).
var sm = require('service-metadata');
var hm = require('header-metadata');
var urlopen = require('urlopen');

sm.setVar('var://service/mpgw/skip-backside', true);

session.input.readAsBuffer(function (error, buffer){
	if (error) {
		hm.response.statusCode = '500 Internal Server Error';
		session.output.write({'status': 'error', 'message': hm.response.reasonPhrase});
		throw error;
	} else {
		var uri = sm.getVar('var://service/URI');
		var method = sm.getVar('var://service/protocol-method');
		var callDetails = {
			target: session.parameters.BaseURL + uri,
			method: method,
			headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }, // default Accept & Content-Type headers values (if wasn't arrived with the request).
			timeout: session.parameters.Timeout
		};
		if (method.toLowerCase() != 'get' && method.toLowerCase() != 'delete') callDetails['data'] = buffer.toString();
		for (var header in hm.current.get()) if (header.toLowerCase() != 'host') callDetails.headers[header] = hm.current.get(header);
		
		var ctx = session.name('invoker') || session.createContext('invoker');
		urlopen.open(callDetails, function(error, response) {
			if (error) {
				if (response != null && response.hasOwnProperty('statusCode')) hm.response.statusCode = response.statusCode + ' ' + response.reasonPhrase;
				else hm.response.statusCode = '500 Internal Server Error';
				ctx.write(XML.parse('<status><statusCode>500</statusCode></status>'));
				session.output.write({'status': 'error', 'message': hm.response.reasonPhrase});
			}
			else {
				for (var header in response.headers) if (header.toLowerCase() != 'content-length') hm.response.set(header,response.headers[header]);
				response.readAsBuffer(function(error, responseData){
					if (error){
						ctx.write(XML.parse('<status><statusCode>500</statusCode></status>')); 							// for enabling conditional handling at the rest of the pipeline.
						hm.response.statusCode = '500 Internal Server Error';
						session.output.write({'status': 'error', 'message': hm.response.reasonPhrase});
						throw error;
					} else {
						ctx.write(XML.parse('<status><statusCode>' + response.statusCode + '</statusCode></status>')); 	// for enabling conditional handling at the rest of the pipeline.
						hm.response.statusCode = response.statusCode;
						session.output.write(responseData);
					}
				});
			}
		});
	}
});