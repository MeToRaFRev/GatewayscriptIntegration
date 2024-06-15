const urlopen = require('urlopen')
const util = require('util')
const sm = require('service-metadata')

const readXML = util.promisify((response, callback) => response.readAsXML(callback))
const readJSON = util.promisify((response, callback) => response.readAsJSON(callback))
const readBuffer = util.promisify((response, callback) => response.readAsBuffer(callback))
const normalized = (data) => {
    switch (typeof data) {
        case 'string':
            return data.toLowerCase()
        case 'object':
            if (data instanceof Buffer) {
                return data.toString().toLowerCase()
            }
            if (data instanceof Date) {
                return data.toString().toLowerCase()
            }
            if (data instanceof Array) {
                return data.map((item) => normalized(item))
            }
            if (data instanceof Object) {
                const normalizedData = {}
                Object.keys(data).forEach((key) => {
                    normalizedData[key.toLowerCase()] = normalized(data[key])
                })
                return normalizedData
            }
            return data
        default:
            return data
        }
}

const request = async ({ method, target, data, timeout = 60, parameters, headers: extraHeaders = {}, followRedirect = true, certificate = 'MyIP', proxy = false }) => {
    if (parameters) {
        const queryString = Object.entries(parameters).filter(([key, value]) => value !== undefined).map(([key, value]) => `${key}=${typeof value === 'object' ? JSON.stringify(value) : value}`).join('&')
        if (queryString) {
            target += `${target.includes('?') ? '&' : '?'}${queryString}`
        }
    }
    const agent = new urlopen.HttpUserAgent({ followRedirect })
    const headers = { 'content-type': 'application/json', ...Object.keys(extraHeaders).reduce((headers, h) => extraHeaders[h] ? { ...headers, [h]: extraHeaders[h] } : headers, {}) }
    const requestData = {
        method,
        target,
        data,
        timeout,
        headers,
        sslClientProfile: 'GWSDebugger',
        agent
    }

    const response = await util.promisify(urlopen.open)(requestData)

    response.request = requestData

    try {
        if (['application/json', 'application/json; charset=UTF-8'].includes(response.headers['content-type']) || response.headers['content-type'] === 'application/x-www-form-urlencoded') {
            response.body = await util.promisify((response, callback) => response.readAsJSON(callback))(response)
        }

        if (response.headers['content-type'] === 'text/xml') {
            response.body = converter.toJSON('badgerfish', XML.parse(XML.stringify(await util.promisify((response, callback) => response.readAsXML(callback))(response))))
        }

        if (response.statusCode >= 400) {
            throw new Error(`Request ${method} to ${target} failed with status code ${response.statusCode}. request: ${JSON.stringify(requestData)}.`)
        }
    } catch (error) {
        if (!proxy) {
            throw error
        }
        else {
            console.alert(error)
        }
    }
    return response
}

module.exports = {
    request,
    readXML,
    readJSON,
    readBuffer,
    normalized
}