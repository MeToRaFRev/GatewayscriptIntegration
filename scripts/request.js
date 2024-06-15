const urlopen = require('urlopen')
const util = require('util')
const sm = require('service-metadata')
sm.setVar('var://service/mpgw/skip-backside', true)
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
        if (['application/json', 'application/json; charset=UTF-8'].includes(headers['content-type']) || headers['content-type'] === 'application/x-www-form-urlencoded') {
            response.body = await util.promisify((response, callback) => response.readAsJSON(callback))(response)
        }

        if (headers['content-type'] === 'text/xml') {
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
const main = async () => {
    const response = await request({ method: 'GET', target: 'https://api.myip.com'})
    console.error(response.body)
    return session.output.write(response.body)
}
main()