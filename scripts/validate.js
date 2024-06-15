const validate = (data, jsonSchema, { path = ['root'], noErrors = false } = {}) => {
    const errors = []
    if (!path.length) validate.errors = []

    // check allowed types
    const allowedTypes = [].concat(jsonSchema.type).filter(t => t)
    let isTypeValid = true
    if (allowedTypes.length) {
        isTypeValid = allowedTypes.some(allowedType => {
            switch (allowedType) {
                case 'null':
                    return data === null
                case 'array':
                    return Array.isArray(data)
                case 'object':
                    return (typeof data === 'object') && !Array.isArray(data) && (data !== null)
                case 'integer':
                    return (typeof data === 'number') && !!(data % 1)
                default:
                    return (typeof data === allowedType)
            }
        })
    }

    if (!isTypeValid) {
        errors.push(`"${path.join('/')}" is of type: "${typeof data}" instead of: "${allowedTypes.toString()}"`)
    }
    else {
        if ((typeof data === 'object') && !Array.isArray(data) && (data !== null)) {
            if (jsonSchema.required) {
                jsonSchema.required.forEach(requiredKey => {
                    if (data[requiredKey] === undefined) {
                        errors.push(`"${[...path, requiredKey].join('/')}" is required`)
                    }
                })
            }
            if (jsonSchema.properties) {
                for (const key in jsonSchema.properties) {
                    if (data[key] !== undefined && !validate(data[key], jsonSchema.properties[key], { noErrors, path: [path, 'properties', key] })) {
                        errors.push(`"${[path, 'properties', key].join('/')}" is invalid`)
                    }
                }
            }
            if (jsonSchema.additionalProperties === false) {
                const allowedKeys = Object.keys(jsonSchema.properties)
                Object.keys(data).some(key => {
                    if (!allowedKeys.includes(key)) {
                        errors.push(`"${[path, 'properties', key].join('/')}" is not allowed`)
                    }
                })
            }
        }

        if (typeof data === 'string' && jsonSchema.pattern && !new RegExp(jsonSchema.pattern).test(data)) {
            errors.push(`"${path.join('/')}" does not match the specified pattern: "${jsonSchema.pattern}"`)
        }

        if (typeof data === 'string' && jsonSchema.format) {
            const formats = [].concat(jsonSchema.format)
            const isFormatValid = formats.some(format => {
                switch (format) {
                    case 'date':
                        return /^\d{4}-([0]\d|1[0-2])-([0-2]\d|3[01])$/.test(data) && (new Date(data) !== 'Invalid Date')
                    case 'date-time':
                        return /^\d{4}-([0]\d|1[0-2])-([0-2]\d|3[01])T([0-1]\d|2[0-3]):[0-5]\d:[0-5]\d\.\d+Z?$/.test(data) && (new Date(data) !== 'Invalid Date')
                    case 'time':
                        return /^([0-1]\d|2[0-3]):[0-5]\d$/.test(data)
                    case 'PatientID':
                        return /^\w{1,13}$/.test(data)
                    case 'PatientCode':
                        return /^(0|9)$/.test(data)
                    case 'AppointmentID':
                        return /^\d*$/.test(data)
                    case 'ProviderID':
                        return /^\d*$/.test(data)
                    case 'cellphone':
                        return /^05\d{8}$/.test(data)
                    case 'email':
                        return /^[a-z0-9\.\-_]+@([a-z0-9-]+\.)+[a-z0-9\-_]{2,4}$/.test(data) && data.length >= 5 && data.length <= 48
                }
            })
            if (!isFormatValid) {
                errors.push(`"${path.join('/')}" does not match the specified format: "${jsonSchema.format}"`)
            }
        }

        if (typeof data === 'number' && 'minimum' in jsonSchema && jsonSchema.minimum > data) {
            errors.push(`"${path.join('/')}" is lower than the minimum value of: "${jsonSchema.minimum}"`)
        }

        if (typeof data === 'number' && 'maximum' in jsonSchema && jsonSchema.maximum < data) {
            errors.push(`"${path.join('/')}" is higher than the maximum value of: "${jsonSchema.maximum}"`)
        }

        if (jsonSchema.allOf) {
            if (!jsonSchema.allOf.every(js => validate(data, js, { noErrors: true, path: [path, 'allOf'] }))) {
                errors.push(`"${path.join('/')}" No matching "allOf" overload for ${JSON.stringify(data)}`)
            }
        }

        if (jsonSchema.anyOf) {
            if (!jsonSchema.anyOf.some(js => validate(data, js, { noErrors: true, path: [path, 'anyOf'] }))) {
                errors.push(`"${path.join('/')}" No matching "anyOf" overload for ${JSON.stringify(data)}`)
            }
        }

        if (jsonSchema.oneOf) {
            if (!jsonSchema.oneOf.some(js => validate(data, js, { noErrors: true, path: [path, 'oneOf'] }))) {
                errors.push(`"${path.join('/')}" No matching "oneOf" overload for ${JSON.stringify(data)}`)
            }
            else if (jsonSchema.oneOf.findIndex(js => validate(data, js, { noErrors: true, path: [path, 'oneOf'] })) !== jsonSchema.oneOf.length - 1 - jsonSchema.oneOf.reverse().findIndex(js => validate(data, js, { noErrors: true, path: [path, 'oneOf'] }))) {
                errors.push(`"${path.join('/')}" More than 1 matching "oneOf" overload for ${JSON.stringify(data)}`)
            }
        }

        if (Array.isArray(data) && jsonSchema.items && !data.every(item => validate(item, jsonSchema.items, { path: [path, 'items'] }))) {
            errors.push(`"${path.join('/')}" Invalid item/s in ${JSON.stringify(data)}`)
        }
    }

    if (!noErrors) {
        validate.errors.push(...errors)
    }

    return !errors.length
}
validate.errors = []
const schema = {"type":"object","additionalProperties":false,"properties":{"test":{"type":"string"}}}
session.INPUT.readAsJSON((err, data) => {
    if (err) {
        console.error(err)
    }
    else {
        console.error({data})
        validate(data, schema)
        console.error(validate.errors)
    }
})