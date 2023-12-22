'use strict'
var mongoose = require('mongoose');
var app = require('./app');
var port = 3800;

mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost:27017/proveedores', { useFindAndModify: false })
    .then(() => {
        console.log("Conexión a la base de datos establecida con éxito...");
        //Creación del servidor

        app.listen(port, () => {
            console.log("Servidor corriendo correctamente en la url: localhost:3800");
        })

    })
    .catch(err => console.log(err));