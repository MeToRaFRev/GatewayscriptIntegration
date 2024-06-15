if (!session.parameters.certificate) { console.error('No "certificate" parameter was defined. Please add it and set a valid value of an existing Crypto Certificate object.'); return; }
if (!session.parameters.encAlg) session.parameters.encAlg = 'A128CBC-HS256'; // JWE Encryption Algorithm. Supported algorithms are: A128CBC-HS256, A192CBC-HS384, A256CBC-HS512, A128GCM, A192GCM & A256GCM.
if (!session.parameters.keyMgmtAlg) session.parameters.keyMgmtAlg = 'RSA1_5'; // JWE Key Management Algorithm. Supported algorithms are: RSA1_5, RSA-OAEP & RSA-OAEP-256.
if (!session.parameters.outputFormat) session.parameters.outputFormat = 'compact'; // Supported algorithms are: compact, json & json_flat.
if (!session.parameters.fields) session.parameters.fields = ''; // Comma separated values of the field-names you want to encrypt.

var jose = require('jose');
session.input.readAsJSON(async function(error, json) {
	if (error) {
		session.output.write('Error reading payload as JSON: ' + error);
	} else {
		if (session.parameters.fields == '') session.output.write(await encryptData(JSON.stringify(json))); 
		else {
			var fields2encrypt = session.parameters.fields.split(',');
			for (var i = 0; i < fields2encrypt.length; ++i) {
				var field = fields2encrypt[i];
				var tmpJSON = json;
				while (field.includes('\\')) {
					var nestedField = field.split('\\');
					if (tmpJSON.hasOwnProperty(nestedField[0])) {
						tmpJSON = tmpJSON[nestedField[0]];
						field = field.substring(nestedField[0].length + 1);
					}
				}
				if (tmpJSON.hasOwnProperty(field)) tmpJSON[field] = await encryptData(JSON.stringify(tmpJSON[field]));
			}
			session.output.write(json);
		}
	}
});

var encryptData = async function(data2encrypt) {
    return new Promise(function (resolve, reject) {
		var jweHdr = jose.createJWEHeader(session.parameters.encAlg);
		if (session.parameters.outputFormat != 'compact') jweHdr.addRecipient(session.parameters.certificate, session.parameters.keyMgmtAlg, {'kid': session.parameters.certificate});
		else {
			jweHdr.setProtected('alg', session.parameters.keyMgmtAlg);
			jweHdr.setKey(session.parameters.certificate);
		}
		jose.createJWEEncrypter(jweHdr).update(data2encrypt).encrypt(session.parameters.outputFormat, function(error, encrypted) {
			if (error) { throw new Error(error); }
			else resolve(encrypted);
		});
    });
}