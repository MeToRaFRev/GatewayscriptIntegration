const urlopen = require('urlopen')
const util = require('util')
const sm = require('service-metadata')
sm.setVar('var://service/mpgw/skip-backside', true)

const main = async ()=>{
    const rawBody = session.input
    const body = await util.promisify((rawBody, callback) => rawBody.readAsBuffer(callback))(rawBody)
    const requestData = {method:'POST',target:'https://api.myip.com',data:body}
    const rawResponse = await util.promisify(urlopen.open)(requestData)
    const response = await util.promisify((rawResponse,callback)=>rawResponse.readAsBuffer(callback))(rawResponse)
    return session.output.write(response)
}
main().catch((err)=>{console.error(err)})