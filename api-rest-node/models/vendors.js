'use strict'
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var VendorSchema = Schema({
        rfc: String,
        registroPatronal: String,
        razonSocial: String,
        tipoProveedor: String,
        regimenFiscal: String,
        nombreContacto: String,
        correo: String,
        telefono: Number,
        observaciones: String,
        borrado: Boolean,
        empresa: [String],
        valido: String,
        verificado: Boolean,
        fechaAlta: Date,
        fechaArchivos: Date,
        fechaActualizacionArchivos: Date,
        supter: Boolean
    })
    //Pasa el nombre a minuscula y lo pluraliza
module.exports = mongoose.model('Vendor', VendorSchema);