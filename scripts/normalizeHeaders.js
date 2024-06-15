const hm = require('header-metadata')
const normalizeHeaders = (headers) => {
    const normalizedHeaders = {}

    Object.keys(headers).forEach((key) => {
        if (key.toLowerCase() !== 'accept-encoding') {
            normalizedHeaders[key.toLowerCase()] = headers[key]
        }
    })

    return normalizedHeaders
}
const headers = hm.current.headers
const normalizedHeaders = normalizeHeaders(headers)
hm.current.headers = normalizedHeaders