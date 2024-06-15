if (!session.parameters.key) { console.error('No "key" parameter was defined. Please add it and set a valid value of an existing Crypto Key object.'); return; }
if (!session.parameters.encAlg) session.parameters.encAlg = 'A128CBC-HS256'; // JWE Encryption Algorithm. Supported algorithms are: A128CBC-HS256, A192CBC-HS384, A256CBC-HS512, A128GCM, A192GCM & A256GCM.
if (!session.parameters.keyMgmtAlg) session.parameters.keyMgmtAlg = 'RSA1_5'; // JWE Key Management Algorithm. Supported algorithms are: RSA1_5, RSA-OAEP & RSA-OAEP-256.
if (!session.parameters.outputFormat) session.parameters.outputFormat = 'compact'; // Supported algorithms are: compact, json & json_flat.
if (!session.parameters.fields) session.parameters.fields = ''; // Comma separated values of the field-names you want to encrypt.

var jose = require('jose');
session.input.readAsBuffer(async function(error, buffer) {
	if (error) {
		session.output.write('Error reading payload as buffer: ' + error);
	} else {
		if (session.parameters.fields == '') session.output.write(JSON.parse(await decryptData(buffer)));
		else {
			var json = JSON.parse(buffer);
			var fields2decrypt = session.parameters.fields.split(',');
			for (var i = 0; i < fields2decrypt.length; ++i) {
				var field = fields2decrypt[i];
				var tmpJSON = json;
				while (field.includes('\\')) {
					var nestedField = field.split('\\');
					if (tmpJSON.hasOwnProperty(nestedField[0])) {
						tmpJSON = tmpJSON[nestedField[0]];
						field = field.substring(nestedField[0].length + 1);
					}
				}
				if (tmpJSON.hasOwnProperty(field)) tmpJSON[field] = JSON.parse(await decryptData(tmpJSON[field]));
			}
			session.output.write(json);
		}
	}
});

var decryptData = async function(data2decrypt) {
    return new Promise(function (resolve, reject) {
		var jweObj = jose.parse(data2decrypt);
		if (session.parameters.outputFormat != 'compact') {
			var recipients = jweObj.getRecipients();
			for (var i = 0; i < recipients.length; i++) if (recipients[i].get("alg") === session.parameters.keyMgmtAlg) recipients[i].setKey(session.parameters.key);
		}
		else jweObj.setKey(session.parameters.key);
		jose.createJWEDecrypter(jweObj).decrypt(function(error, decrypted) {
			if (error) { throw new Error(error); }
			else resolve(decrypted.toString());
		});
    });
}