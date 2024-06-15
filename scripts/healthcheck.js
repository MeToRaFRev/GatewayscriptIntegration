const sm = require('service-metadata')
sm.setVar('var://service/mpgw/skip-backside', true)
return session.output.write({status:'ok'})