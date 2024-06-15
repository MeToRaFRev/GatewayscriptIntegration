session.input.readAsBuffer (function (error, buffer) {
    if (error) console.error('error: ' + error.errorMessage);
    else {
        console.error('payload: ' + buffer.toString('utf8'));
        session.output.write(buffer.toString('utf8'));
    }
});