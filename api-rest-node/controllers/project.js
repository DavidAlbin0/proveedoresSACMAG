'use strict'
var bcrypt = require('bcrypt-nodejs');
var nodemailer = require('nodemailer');

var Archives = require('../models/archives');
var Vendors = require('../models/vendors');
var Users = require('../models/user');
var jwt = require('../services/jwt');
var fs = require('fs').promises;
var fsa = require('fs');
var archiver = require('archiver');
var moment = require('moment');
var path = require('path');
const { update } = require('../models/archives');
/* const { getMaxListeners } = require('process');
const { arch } = require('os');
const vendors = require('../models/vendors');
const { createHash } = require('crypto'); */
var controller = {
    //método para loguear usuario
    login: function(req, res) {
        var params = req.body;
        var login = new Users();
        var supterLogin = req.params.supter;
        login.usuario = params.usuario;
        login.password = params.password;
        Users.findOne({ usuario: login.usuario.toLowerCase(), borrado: false, supter: supterLogin }, (err, user) => {
            if (err) return res.status(500).send({ message: "Error en la petición" });
            if (user) {
                bcrypt.compare(login.password, user.password, (err, check) => {
                    if (check) {
                        if (params.gettoken) {
                            //generar y devolver el token
                            return res.status(200).send({
                                token: jwt.createToken(user)
                            })
                        } else {
                            //devolver datos del usuario
                            user.password = undefined;
                            return res.status(200).send({ user });
                        }
                    } else {
                        return res.status(404).send({ message: 'El usuario no se ha podido identificar' });
                    }
                })
            } else {
                return res.status(404).send({ message: "¡El usuario no se ha podido identificar!" });
            }
        })
    },
    //Obtener datos del Usuario
    getUSer: function(req, res) {
        var user = new Users();
        var projectId = req.params.id;
        if (projectId == null) return res.status(404).send({ message: 'El usuario no existe' })
        Users.findById(projectId, (err, user) => {
            if (err) return res.status(500).send({ message: 'Error al buscar el usuario' });
            if (!user) return res.status(404).send({ message: 'El usuario no existe' });
            user.password = undefined;
            return res.status(200).send({
                user
            })
        });
    },
    //guardar usuarios para login
    saveUsersLogin: async function(req, res) {
        var login = new Users();
        var params = req.body;
        var correoP = 'irving.davila@grupo-sacmag.com.mx';
        var pass = "";
        var respuesta = "";
        var rol_usuario = req.user.rol;
        if (rol_usuario == "administrador") {
            if (params.usuario && params.correo && params.rol && params.nombre && params.apellidoM && params.apellidoP && params.rfc && params.empresa) {
                try {
                    var userFind;
                    if (params.empresa.toLowerCase().trim() == 'supter' || params.empresa.toLowerCase().trim() == 'todassupter') {
                        userFind = await Users.find({
                            $and: [
                                { $or: [{ usuario: params.usuario.toLowerCase() }, { rfc: params.rfc.toLowerCase() }] },
                                { $or: [{ empresa: 'supter' }, { empresa: 'todassupter' }] }
                            ]
                        }).exec();
                    } else {
                        userFind = await Users.find({
                            $and: [
                                { $or: [{ usuario: params.usuario.toLowerCase() }, { rfc: params.rfc.toLowerCase() }] },
                                { $and: [{ empresa: { $ne: 'supter' } }, { empresa: { $ne: 'todassupter' } }] }
                            ]
                        }).exec();
                    }
                    if (userFind != "") {
                        return res.status(500).send({ message: 'Ya existe el usuario' });
                    } else {
                        if (params.rol.trim().toLowerCase() == 'administrador') {
                            pass = params.password.trim();
                        } else {
                            pass = "";
                            var characters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
                            for (var i = 0; i < 8; i++) {
                                pass += characters.charAt(Math.floor(Math.random() * characters.length));
                            }
                        }
                        const hashedPassword = await new Promise((resolve, reject) => {
                            bcrypt.hash(pass, null, null, function(err, hash) {
                                if (err) reject(err)
                                resolve(hash)
                            });
                        })
                        login.usuario = params.usuario.toLowerCase().trim();
                        login.password = hashedPassword;
                        login.correo = params.correo.toLowerCase().trim();
                        login.rol = params.rol.toLowerCase().trim();
                        login.nombre = params.nombre.toLowerCase().trim();
                        login.apellidoP = params.apellidoP.toLowerCase().trim();
                        login.apellidoM = params.apellidoM.toLowerCase().trim();
                        login.rfc = params.rfc.toLowerCase().trim();
                        login.empresa = params.empresa.toLowerCase().trim();
                        if (params.empresa.toLowerCase().trim() == 'supter' || params.empresa.toLowerCase().trim() == 'todassupter') login.supter = true
                        else login.supter = false

                        login.borrado = false;
                        var saveInformation = await login.save();
                        saveInformation.password = undefined;
                        var contentHtml = `
                            <img src="cid:unique@kreata.ee">
                            <h1>Proveedores Sacmag De México, S.A. De C.V.</h1>
                            <h4>Datos del Usuario Para Entrar Al Sistema</h4>
                            <a href="https://proveedores-grupo-sacmag.com.mx/" target="_blank" >Click aquí para entrar al Sitio Web</a>
                            <ul>
        
                                <li>Usuario: ${params.usuario.toLowerCase().trim()}</li>
                                <li>Contraseña ${pass}</li>
                                <br>
                                <br>
                                <p>No responder correo<p>
                            </ul>
                            `;
                        let transporter = nodemailer.createTransport({
                            host: "smtp.gmail.com",
                            port: 465,
                            secure: true, // true for 465, false for other ports
                            auth: {
                                user: 'sacmag.proveedores@gmail.com', // generated ethereal user
                                pass: 'anadydjnomozipia', // generated ethereal password
                            },
                        });
                        // send mail with defined transport object
                        let info = await transporter.sendMail({
                            from: '"Proveedores Sacmag " <sacmag.proveedores@gmail.com>', // sender address
                            to: `${correoP} , ${params.correo.toLowerCase().trim()}`, // list of receivers
                            subject: "Accesos para entrar a la plataforma de Proveedores", // Subject line
                            html: contentHtml, // html body
                            attachments: [{
                                filename: 'image.png',
                                path: __dirname + '/logo.png',
                                cid: 'unique@kreata.ee' //same cid value as in the html img src
                            }]
                        });
                        console.log("Mensaje enviado", info.envelope);
                        return res.status(200).send({
                            user: saveInformation
                        });

                    }
                } catch (error) {
                    console.log("Ocurrió un error");
                    return res.status(500).send({ message: 'Ocurrió un error ' + error });
                }
            } else {
                return res.status(500).send({ message: 'Completa los campos faltantes del formulario' });
            }
        } else {
            return res.status(500).send({ message: 'No cuentas con los permisos suficientes' });
        }
    },
    //guardar los archivos del proveedor
    saveArchives: async function(req, res) {
        var archive = new Archives();
        var userFind = new Users();
        var rfc = req.params.rfc;
        var supter = req.params.supter;
        var rol_usuario = req.user.rol;


        var correoUsuarioAlta;
        if (rol_usuario != "usuarioLec") {
            try {
                if (req.files) {
                    const vendorFind = await Vendors.findOne({ rfc: rfc.toLowerCase().trim(), supter: supter });
                    console.log(vendorFind.empresa[0]);
                    const getEmails = await Users.find({ empresa: vendorFind.empresa[0], rol: 'usuario' }, { correo: 1, _id: 0 });
                    const findArchives = await Archives.findOne({ rfc: rfc.toLowerCase().trim(), supter: supter });


                    let fecha;
                    if (findArchives) {
                        fecha = vendorFind.fechaActualizacionArchivos;
                        fecha = moment(fecha);
                        const updateVendorDate = await Vendors.updateOne({ rfc: rfc.toLowerCase().trim(), supter: supter }, { fechaArchivos: fecha, fechaActualizacionArchivos: fecha.add(1, 'y') });
                    } else {
                        fecha = vendorFind.fechaArchivos;
                        fecha = moment(fecha);
                    }

                    var filePath1 = req.files.archivo1.path;
                    var filePath2 = req.files.archivo2.path;
                    var filePath3 = req.files.archivo3.path;
                    var filePath4 = req.files.archivo4.path;
                    if (req.files.archivo5) {
                        var filePath5 = req.files.archivo5.path;
                    } else {
                        var filePath5 = '';
                    }
                    var filePath6 = req.files.archivo6.path;
                    var filePath7 = req.files.archivo7.path;
                    var filePath8 = req.files.archivo8.path;
                    var filePath9 = req.files.archivo9.path;
                    var filePath10 = req.files.archivo10.path;
                    var filePath11 = req.files.archivo11.path;
                    var filePath12 = req.files.archivo12.path;
                    var filePath13 = req.files.archivo13.path;
                    var filePath14 = req.files.archivo14.path;
                    var filePath15 = req.files.archivo15.path;
                    /* var fileSplit1 = filePath1.split('\\'); Windows*/
                    /** ('/') linux*/

                    var fileSplit1 = filePath1.split('\\');
                    var fileSplit2 = filePath2.split('\\');
                    var fileSplit3 = filePath3.split('\\');
                    var fileSplit4 = filePath4.split('\\');
                    if (req.files.archivo5) {
                        var fileSplit5 = filePath5.split('\\');
                    }
                    var fileSplit6 = filePath6.split('\\');
                    var fileSplit7 = filePath7.split('\\');
                    var fileSplit8 = filePath8.split('\\');
                    var fileSplit9 = filePath9.split('\\');
                    var fileSplit10 = filePath10.split('\\');
                    var fileSplit11 = filePath11.split('\\');
                    var fileSplit12 = filePath12.split('\\');
                    var fileSplit13 = filePath13.split('\\');
                    var fileSplit14 = filePath14.split('\\');
                    var fileSplit15 = filePath15.split('\\');

                    var extSplit1 = fileSplit1[1].split('\.');
                    var extSplit2 = fileSplit2[1].split('\.');
                    var extSplit3 = fileSplit3[1].split('\.');
                    var extSplit4 = fileSplit4[1].split('\.');
                    if (req.files.archivo5) {
                        var extSplit5 = fileSplit5[1].split('\.');
                    }
                    var extSplit6 = fileSplit6[1].split('\.');
                    var extSplit7 = fileSplit7[1].split('\.');
                    var extSplit8 = fileSplit8[1].split('\.');
                    var extSplit9 = fileSplit9[1].split('\.');
                    var extSplit10 = fileSplit10[1].split('\.');
                    var extSplit11 = fileSplit11[1].split('\.');
                    var extSplit12 = fileSplit12[1].split('\.');
                    var extSplit13 = fileSplit13[1].split('\.');
                    var extSplit14 = fileSplit14[1].split('\.');
                    var extSplit15 = fileSplit15[1].split('\.');

                    var fileExt1 = extSplit1[1];
                    var fileExt2 = extSplit2[1];
                    var fileExt3 = extSplit3[1];
                    var fileExt4 = extSplit4[1];
                    if (req.files.archivo5) {
                        var fileExt5 = extSplit5[1];
                    }
                    var fileExt6 = extSplit6[1];
                    var fileExt7 = extSplit7[1];
                    var fileExt8 = extSplit8[1];
                    var fileExt9 = extSplit9[1];
                    var fileExt10 = extSplit10[1];
                    var fileExt11 = extSplit11[1];
                    var fileExt12 = extSplit12[1];
                    var fileExt13 = extSplit13[1];
                    var fileExt14 = extSplit14[1];
                    var fileExt15 = extSplit15[1];
                    if ((fileExt1.toLowerCase().trim() == 'pdf' && req.files.archivo1.size < 2000000) && (fileExt2.toLowerCase().trim() == 'pdf' && req.files.archivo2.size < 2000000) && (fileExt3.toLowerCase().trim() == 'pdf' && req.files.archivo3.size < 2000000) && (fileExt4.toLowerCase().trim() == 'pdf' && req.files.archivo4.size < 2000000) &&
                        (fileExt6.toLowerCase().trim() == 'pdf' && req.files.archivo6.size < 2000000) && (fileExt7.toLowerCase().trim() == 'pdf' && req.files.archivo7.size < 2000000) && (fileExt8.toLowerCase().trim() == 'pdf' && req.files.archivo8.size < 2000000) &&
                        (fileExt9.toLowerCase().trim() == 'pdf' && req.files.archivo9.size < 2000000) && (fileExt10.toLowerCase().trim() == 'pdf' && req.files.archivo10.size < 2000000) && (fileExt11.toLowerCase().trim() == 'pdf' && req.files.archivo11.size < 2000000) && (fileExt12.toLowerCase().trim() == 'pdf' && req.files.archivo12.size < 2000000) &&
                        (fileExt13.toLowerCase().trim() == 'pdf' && req.files.archivo13.size < 2000000) && (fileExt14.toLowerCase().trim() == 'pdf' && req.files.archivo14.size < 2000000) && (fileExt15.toLowerCase().trim() == 'pdf' && req.files.archivo15.size < 2000000)) {

                        var fileName1 = "1-FormatoRequisitado" + "-" + rfc + "-" + moment().format('LL') + ".pdf";
                        var fileName2 = "2-ConstanciaSitFiscal" + "-" + rfc + "-" + moment().format('LL') + ".pdf";
                        var fileName3 = "3-AltaIMSSPatronal" + "-" + rfc + "-" + moment().format('LL') + ".pdf";
                        var fileName4 = "4-IneRepresentante" + "-" + rfc + "-" + moment().format('LL') + ".pdf";
                        if (req.files.archivo5) {
                            var fileName5 = "5-ActaConstitutiva" + "-" + rfc + "-" + moment().format('LL') + ".pdf"
                        }
                        var fileName6 = "6-ComprobanteDomicilio" + "-" + rfc + "-" + moment().format('LL') + ".pdf";
                        var fileName7 = "7-EstadodeCuentaClabe" + "-" + rfc + "-" + moment().format('LL') + ".pdf"
                        var fileName8 = "8-OpiniondeCumpSat" + "-" + rfc + "-" + moment().format('LL') + ".pdf"
                        var fileName9 = "9-OpiniondeCumpIMSS" + "-" + rfc + "-" + moment().format('LL') + ".pdf"
                        var fileName10 = "10-OpiniondeCumpINFONAVIT" + "-" + rfc + "-" + moment().format('LL') + ".pdf"
                        var fileName11 = "11-CurriculumEmpresa" + "-" + rfc + "-" + moment().format('LL') + ".pdf"
                        var fileName12 = "12-RegistroPresServicio" + "-" + rfc + "-" + moment().format('LL') + ".pdf"
                        var fileName13 = "13-CalibracionEquipos" + "-" + rfc + "-" + moment().format('LL') + ".pdf"
                        var fileName14 = "14-CodigoEtica" + "-" + rfc + "-" + moment().format('LL') + ".pdf"
                        var fileName15 = "15-UltimaDecAnual" + "-" + rfc + "-" + moment().format('LL') + ".pdf"

                        fsa.renameSync("./uploads/" + fileSplit1[1], "./uploads/" + fileName1);
                        fsa.renameSync("./uploads/" + fileSplit2[1], "./uploads/" + fileName2);
                        fsa.renameSync("./uploads/" + fileSplit3[1], "./uploads/" + fileName3);
                        fsa.renameSync("./uploads/" + fileSplit4[1], "./uploads/" + fileName4);
                        if (req.files.archivo5) {
                            fsa.renameSync("./uploads/" + fileSplit5[1], "./uploads/" + fileName5);
                        }
                        fsa.renameSync("./uploads/" + fileSplit6[1], "./uploads/" + fileName6);
                        fsa.renameSync("./uploads/" + fileSplit7[1], "./uploads/" + fileName7);
                        fsa.renameSync("./uploads/" + fileSplit8[1], "./uploads/" + fileName8);
                        fsa.renameSync("./uploads/" + fileSplit9[1], "./uploads/" + fileName9);
                        fsa.renameSync("./uploads/" + fileSplit10[1], "./uploads/" + fileName10);
                        fsa.renameSync("./uploads/" + fileSplit11[1], "./uploads/" + fileName11);
                        fsa.renameSync("./uploads/" + fileSplit12[1], "./uploads/" + fileName12);
                        fsa.renameSync("./uploads/" + fileSplit13[1], "./uploads/" + fileName13);
                        fsa.renameSync("./uploads/" + fileSplit14[1], "./uploads/" + fileName14);
                        fsa.renameSync("./uploads/" + fileSplit15[1], "./uploads/" + fileName15);
                        archive.rfc = rfc.toLowerCase().trim();
                        archive.archivo1 = fileName1;
                        archive.archivo2 = fileName2;
                        archive.archivo3 = fileName3;
                        archive.archivo4 = fileName4;
                        if (req.files.archivo5) {
                            archive.archivo5 = fileName5;
                        }
                        archive.archivo6 = fileName6;
                        archive.archivo7 = fileName7;
                        archive.archivo8 = fileName8;
                        archive.archivo9 = fileName9;
                        archive.archivo10 = fileName10;
                        archive.archivo11 = fileName11;
                        archive.archivo12 = fileName12;
                        archive.archivo13 = fileName13;
                        archive.archivo14 = fileName14;
                        archive.archivo15 = fileName15;
                        archive.validar = false;
                        archive.borrado = false;
                        archive.supter = supter;
                        archive.year = fecha;
                        const archives = await archive.save();
                        var contentHtml = `
                            <img src="cid:unique@kreata.ee">
                            <h1>Proveedores Sacmag De México, S.A. De C.V.</h1>
                            <a href="https://proveedores-grupo-sacmag.com.mx/" target="_blank" >Click aquí para entrar al Sitio Web</a>
                            <br>
                            <br>
                            <h4>Los archivos del Proveedor: ${vendorFind.razonSocial.toUpperCase()} con Rfc: ${vendorFind.rfc.toUpperCase()} fueron enviados correctamente y están listos para su aprobación</h4>
                            <br>
                            <br>
                            <p>Correo enviado automáticamente, no responder correo<p>`;
                        let transporter = nodemailer.createTransport({
                            host: "smtp.gmail.com",
                            port: 465,
                            secure: true, // true for 465, false for other ports
                            auth: {
                                user: 'sacmag.proveedores@gmail.com', // generated ethereal user
                                pass: 'anadydjnomozipia', // generated ethereal password
                            },
                        });
                        // send mail with defined transport object
                        let info = await transporter.sendMail({
                            from: '"Proveedores Sacmag " <sacmag.proveedores@gmail.com>', // sender address
                            to: `${getEmails}`, // list of receivers
                            subject: `Aprobación de archivos del Proveedor ${vendorFind.razonSocial.toUpperCase()}`, // Subject line
                            html: contentHtml, // html body
                            attachments: [{
                                filename: 'image.png',
                                path: __dirname + '/logo.png',
                                cid: 'unique@kreata.ee' //same cid value as in the html img src
                            }]
                        });
                        console.log("Mensaje enviado", info.envelope);
                        return res.status(200).send({ archives: archives })
                    } else {
                        var files = [];
                        if (filePath5 == '') {
                            files = [
                                filePath1,
                                filePath2,
                                filePath3,
                                filePath4,
                                filePath6,
                                filePath7,
                                filePath8,
                                filePath9,
                                filePath10,
                                filePath11,
                                filePath12,
                                filePath13,
                                filePath14,
                                filePath15
                            ]
                        } else {
                            files = [
                                filePath1,
                                filePath2,
                                filePath3,
                                filePath4,
                                filePath5,
                                filePath6,
                                filePath7,
                                filePath8,
                                filePath9,
                                filePath10,
                                filePath11,
                                filePath12,
                                filePath13,
                                filePath14,
                                filePath15
                            ]
                        }
                        Promise.all(files.map(file => fs.unlink(file)))
                            .then(() => {

                                return res.status(500).send({ message: 'Archivos borrados debido a que no son pdf o exceden el tamaño máximo por archivo de 2MB' });
                            }).catch(err => {
                                console.error('Algo malo pasó removiendo los archivos', err);
                            })
                    }
                }
            } catch (error) {
                return res.status(500).send({ message: "Ocurrió un error " + error });
            }
        } else {
            return res.status(500).send({ message: "No tienes permisos " });
        }

    },
    //Actualizar archivos
    /* updateArchives: function(req, res) {
        var archives = new Archives();
        var projectId = req.params.id;

        var filePath1 = req.files.archivo1.path;
        var filePath2 = req.files.archivo2.path;
        var fileSplit1 = filePath1.split('\\');
        var fileSplit2 = filePath2.split('\\');
        var fileName1 = fileSplit1[1];
        var fileName2 = fileSplit2[1];



        Archives.findByIdAndUpdate(projectId, { "archivo1": fileName1, "archivo2": fileName2 }, { new: true }, (err, projectUpdated) => {
            if (err) return res.status(500).send({ message: 'Error al actualizar el proyecto' });
            if (!projectUpdated) return res.status(404).send({ message: 'No existe el proyecto' });
            return res.status(200).send({ archives: projectUpdated })
        })

    }, */

    //obtener path de cada archivo
    getArchive: function(req, res) {
        var file = req.params.file;
        var path_file = './uploads/' + file;
        console.log(path_file);

        fsa.exists(path_file, (exists) => {
            if (exists) {
                //console.log(path.join(__dirname, '../uploads/' + file));
                //console.log(path.resolve(path_file)) 
                return res.sendFile(path.resolve(path_file));
            } else {
                res.status(500).send({
                    message: 'No existe la información'
                });
            }

        })
    },
    getAllArchives: async function(req, res) {

        var rol_usuario = req.user.rol;
        if (rol_usuario) {
            try {
                var projectrfc = req.params.rfc;
                let supter = req.params.supter;


                const findArchives = await Archives.find({ rfc: projectrfc.toLowerCase().trim(), supter: supter });
                /*return res.status(200).send({ findArchives });*/

                var output = fsa.createWriteStream('./uploads/' + projectrfc.toUpperCase().trim() + supter.toString() + '.zip');
                var archive = archiver('zip');
                archive.pipe(output);

                for (let i = 0; i < findArchives.length; i++) {
                    archive.append(fsa.createReadStream('./uploads/' + findArchives[i].archivo1), { name: findArchives[i].archivo1 });
                    archive.append(fsa.createReadStream('./uploads/' + findArchives[i].archivo2), { name: findArchives[i].archivo2 });
                    archive.append(fsa.createReadStream('./uploads/' + findArchives[i].archivo3), { name: findArchives[i].archivo3 });
                    archive.append(fsa.createReadStream('./uploads/' + findArchives[i].archivo4), { name: findArchives[i].archivo4 });
                    if (findArchives.archivo5) archive.append(fsa.createReadStream('./uploads/' + findArchives[i].archivo5), { name: findArchives[i].archivo5 });
                    archive.append(fsa.createReadStream('./uploads/' + findArchives[i].archivo6), { name: findArchives[i].archivo6 });
                    archive.append(fsa.createReadStream('./uploads/' + findArchives[i].archivo7), { name: findArchives[i].archivo7 });
                    archive.append(fsa.createReadStream('./uploads/' + findArchives[i].archivo8), { name: findArchives[i].archivo8 });
                    archive.append(fsa.createReadStream('./uploads/' + findArchives[i].archivo9), { name: findArchives[i].archivo9 });
                    archive.append(fsa.createReadStream('./uploads/' + findArchives[i].archivo10), { name: findArchives[i].archivo10 });
                    archive.append(fsa.createReadStream('./uploads/' + findArchives[i].archivo11), { name: findArchives[i].archivo11 });
                    archive.append(fsa.createReadStream('./uploads/' + findArchives[i].archivo12), { name: findArchives[i].archivo12 });
                    archive.append(fsa.createReadStream('./uploads/' + findArchives[i].archivo13), { name: findArchives[i].archivo13 });
                    archive.append(fsa.createReadStream('./uploads/' + findArchives[i].archivo14), { name: findArchives[i].archivo14 });
                    archive.append(fsa.createReadStream('./uploads/' + findArchives[i].archivo15), { name: findArchives[i].archivo15 });
                }
                archive.finalize();
                return res.status(200).send({ findArchives });



            } catch (error) {
                return res.status(500).send({ message: 'Ocurrió un error: ' + error });
            }
        }

    },
    //Obtener archivos de cada proveedor
    getArchivesRfc: async function(req, res) {

        var rol_usuario = req.user.rol;
        const Vendor = new Vendors();
        var projectrfc = req.params.rfc;
        var supter = req.params.supter;
        let curDate = moment();
        let getArchives;
        try {

            const getVendor = await Vendors.findOne({ rfc: projectrfc.toLowerCase().trim(), supter: supter });
            let updateArchives = getVendor.fechaActualizacionArchivos;
            updateArchives = moment(updateArchives);

            let diff = updateArchives.diff(curDate, "days");
            if (diff <= 0) return res.status(200).send({ getArchives: null })
            else {

                getArchives = await Archives.findOne({ rfc: projectrfc.toLowerCase().trim(), supter: supter, year: getVendor.fechaArchivos });
                console.log(getArchives);


                return res.status(200).send({ getArchives })
            }
        } catch (err) {
            return res.status(500).send({ message: 'Ocurrió un error: ' + err });
        }

    },
    refuseArchives: async function(req, res) {

        var projectRfc = req.params.rfc;
        var mensaje = req.params.mensaje.toLowerCase().trim();
        var rol_usuario = req.user.rol;
        if (rol_usuario == "administrador" || rol_usuario == "usuario") {
            try {
                const vendorSearch = await Vendors.findOne({ rfc: projectRfc.toLowerCase().trim() }).exec();
                const userAlta = await Users.findOne({ usuario: vendorSearch.userAlta.toLowerCase().trim() }).exec();

                const archivesRemoved = await Archives.remove({ rfc: projectRfc.toLowerCase().trim() });
                const vendorUpdate = await Vendors.updateOne({ rfc: projectRfc.toLowerCase() }, { verificado: false });
                var contentHtml = `
                <img src="cid:unique@kreata.ee">
                <h1>Proveedores Sacmag De México, S.A. De C.V.</h1>
                <a href="https://proveedores-grupo-sacmag.com.mx/" target="_blank" >Click aquí para entrar al Sitio Web</a>
                <br>
                <br>
                <h4>Rechazo de archivos</h4>

                <br>
                <br>
                <p>Buen día, debido a: ${mensaje} fueron rechazados los archivos subidos al sistema, deberás subir correctamente
                 la documentación para la validación. Si tienes dudas comunícate directamente con el encargado de proyecto</p>

                <p>Correo enviado automáticamente, no responder correo<p>
                `;
                let transporter = nodemailer.createTransport({
                    host: "smtp.gmail.com",
                    port: 465,
                    secure: true, // true for 465, false for other ports
                    auth: {
                        user: 'sacmag.proveedores@gmail.com', // generated ethereal user
                        pass: 'anadydjnomozipia', // generated ethereal password
                    },
                });
                // send mail with defined transport object
                let info = await transporter.sendMail({
                    from: '"Proveedores Sacmag " <sacmag.proveedores@gmail.com>', // sender address
                    to: `${vendorSearch.correo} , ${userAlta.correo}`, // list of receivers
                    subject: `Archivos Rechazados ${vendorSearch.razonSocial.toUpperCase()}`, // Subject line
                    html: contentHtml, // html body
                    attachments: [{
                        filename: 'image.png',
                        path: __dirname + '/logo.png',
                        cid: 'unique@kreata.ee' //same cid value as in the html img src
                    }]
                });
                console.log("Mensaje enviado", info.envelope);
                return res.status(200).send({ archives: archivesRemoved });




            } catch (error) {
                res.status(500).send({ message: 'Ocurrió un error: ' + error });
            }
        } else {
            res.status(500).send({ message: 'No tienes permisos suficientes' });
        }


    },
    getVendors: async function(req, res) {
        var rol_usuario = req.user.rol;
        var empresa = req.params.empresa.toLowerCase().trim();
        let AllVendors;
        if (rol_usuario != "proveedor") {
            try {
                if (empresa == 'todassupter' || empresa == 'supter') AllVendors = await Vendors.find({ valido: { $ne: 'no valido' }, supter: true }).sort({ razonSocial: 1 }).exec();
                else if (empresa == 'todassacmag') AllVendors = await Vendors.find({ valido: { $ne: 'no valido' }, supter: false }).sort({ razonSocial: 1 }).exec();
                else AllVendors = await Vendors.find({ valido: { $ne: 'no valido' }, empresa: { $all: [empresa.toLowerCase().trim()] } }).sort({ razonSocial: 1 }).exec();
                console.log(AllVendors);
                if (AllVendors == "" || !AllVendors) {
                    return res.status(500).send({ message: 'No hay proveedores para mostrar' });
                } else {
                    return res.status(200).send({ AllVendors });
                }
            } catch (err) {
                return res.status(500).send({ message: 'Ocurrió un error: ' + err });
            }


        }


        /* if (empresa == "todas") {
            Vendors.find({ valido: { $ne: 'no valido' } }).sort({ razonSocial: 1 }).exec((err, vendors) => {
                if (err) return res.status(500).send({ message: 'Error al devolver los datos' });
                if (!vendors || vendors == "") return res.status(404).send({ message: 'No hay Proveedores que mostrar' });
                return res.status(200).send({ vendors });
            })

        } else {
            Vendors.find({ empresa: { $all: [empresa.toLowerCase().trim()] }, valido: { $ne: 'no valido' } }).sort({ razonSocial: 1 }).exec((err, vendors) => {
                if (err) return res.status(500).send({ message: 'Error al devolver los datos' });
                if (!vendors || vendors == "") return res.status(404).send({ message: 'No hay Proveedores que mostrar' });
                return res.status(200).send({ vendors });
            })

        } */



    },
    getVendor: function(req, res) {
        var vendorId = req.params.id;
        var rol_usuario = req.user.rol;

        if (vendorId == null) return res.status(404).send({ message: 'Error al buscar proveedor' });
        Vendors.findById(vendorId, (err, vendor) => {
            if (err) return res.status(500).send({ message: 'El proveedor no existe' });
            if (!vendor) return res.status(404).send({ message: 'El proveedor no existe' });
            return res.status(200).send({ vendor });

        })


    },
    getVendorRfc: function(req, res) {
        var vendorrfc = req.params.rfc.toLowerCase().trim();
        console.log(vendorrfc);
        var rol_usuario = req.user.rol;
        if (vendorrfc == null) return res.status(404).send({ message: 'Error al buscar proveedor' });
        Vendors.findOne({ rfc: vendorrfc.toLowerCase().trim() }, (err, vendor) => {
            if (err) return res.status(500).send({ message: 'El proveedor no existe' });
            if (!vendor) return res.status(404).send({ message: 'El proveedor no existe' });
            return res.status(200).send({ vendor });

        })
    },
    saveVendor: async function(req, res) {
        var params = req.body;
        var correoP = 'irving.davila@grupo-sacmag.com.mx';
        let resProv;
        if (params.rfc && params.razonSocial && params.tipoProveedor && params.regimenFiscal && params.nombreContacto && params.correo && params.empresa && params.telefono) {
            try {
                const getEmails = await Users.find({ empresa: params.empresa, rol: 'usuario' }, { correo: 1, _id: 0 });

                if (params.empresa.toLowerCase().trim() == 'supter') {
                    resProv = await Vendors.find({ rfc: params.rfc.toLowerCase().trim(), supter: true, $or: [{ valido: 'valido' }, { valido: '' }] }).exec();
                } else {
                    resProv = await Vendors.find({ rfc: params.rfc.toLowerCase().trim(), supter: false, $or: [{ valido: 'valido' }, { valido: '' }] }).exec();
                }
                if (resProv == "") {

                    var vendor = new Vendors();
                    vendor.rfc = params.rfc.toLowerCase().trim();
                    if (params.registroPatronal != null) {
                        if (params.registroPatronal.trim() != '') vendor.registroPatronal = params.registroPatronal.toLowerCase().trim();
                    } else {
                        vendor.registroPatronal = '';
                    }
                    vendor.razonSocial = params.razonSocial.toLowerCase().trim();
                    vendor.tipoProveedor = params.tipoProveedor.toLowerCase().trim();
                    vendor.regimenFiscal = params.regimenFiscal.toLowerCase().trim();
                    vendor.nombreContacto = params.nombreContacto.toLowerCase().trim();
                    vendor.correo = params.correo.toLowerCase().trim();
                    vendor.telefono = params.telefono;
                    if (params.empresa.toLowerCase().trim() != 'supter') vendor.empresa = params.empresa.toLowerCase().trim();

                    if (params.empresa.toLowerCase().trim() == 'supter') {
                        vendor.supter = true;
                    } else {
                        vendor.supter = false;
                    }
                    if (params.observaciones) {
                        if (params.observaciones.trim() != '') vendor.observaciones = params.observaciones.toLowerCase().trim();
                    } else {
                        vendor.observaciones = '';
                    }
                    vendor.borrado = false;
                    vendor.verificado = false;
                    vendor.valido = '';
                    vendor.fechaAlta = moment();
                    vendor.fechaArchivos = moment();
                    vendor.fechaActualizacionArchivos = moment().add(1, 'y');
                    const vendorInformation = await vendor.save();

                    var contentHtml = `
                        <img src="cid:unique@kreata.ee">
                        <h1>Proveedores Sacmag De México, S.A. De C.V.</h1>
                        <h2>Nuevo registro de proveedor</h2>
                        <h4>El proveedor ${vendorInformation.razonSocial.toUpperCase()} con rfc: ${vendorInformation.rfc.toUpperCase()}  se dió de alta en el sistema</h4>
                        <a href="https://proveedores-grupo-sacmag.com.mx/" target="_blank" >Para revisar información, clic aquí</a>
                        <br><br><br><br><br><br>
                        
                        <p>Correo enviado automáticamente, no responder correo<p>
                            `;
                    let transporter = nodemailer.createTransport({
                        host: "smtp.gmail.com",
                        port: 465,
                        secure: true, // true for 465, false for other ports
                        auth: {
                            user: 'sacmag.proveedores@gmail.com', // generated ethereal user
                            pass: 'anadydjnomozipia', // generated ethereal password
                        },
                    });
                    // send mail with defined transport object
                    let info = await transporter.sendMail({
                        from: '"Proveedores Sacmag " <sacmag.proveedores@gmail.com>', // sender address
                        to: `${getEmails}`, // list of receivers
                        //to: `${correoP} , ${update.correo} , ${emailUser}`
                        subject: "Accesos para entrar a la plataforma de Proveedores", // Subject line
                        html: contentHtml, // html body
                        attachments: [{
                            filename: 'image.png',
                            path: __dirname + '/logo.png',
                            cid: 'unique@kreata.ee' //same cid value as in the html img src
                        }]
                    });
                    console.log("Mensaje enviado", info.envelope);


                    return res.status(200).send({
                        vendorInformation,
                        message: 'Los datos fueron enviados correctamente, pronto recibirás un email con la información detallada'
                    })
                } else {
                    let resProv;
                    if (params.empresa.toLowerCase().trim() == 'supter') return res.status(500).send({ message: 'El proveedor ya fue registrado anteriormente, espera respuesta' })
                    resProv = await Vendors.updateOne({ rfc: params.rfc.toLowerCase().trim(), supter: false }, { $addToSet: { empresa: params.empresa } }).exec();
                    return res.status(200).send({
                        resProv,
                        message: 'Ya cuentas con credenciales de acceso, revisa tu correo electrónico. Sino tienes las credenciales de acceso espera algunos días para recibir la información'
                    });

                }
            } catch (error) {
                console.log("Ocurrió un error al registrar Proveedor " + error);
                return res.status(500).send({ message: 'Ocurrió unerror al registrar la información' + error })

            }
        } else {
            return res.status(500).send({ message: 'Completa los campos faltantes' });
        }


    },
    updateVendors: async function(req, res) {

        var projectId = req.params.id;
        var send = req.params.send;
        var update = req.body;
        var rol_usuario = req.user.rol;
        var emailUser = req.user.correo;
        var correoP = "irving.davila@grupo-sacmag.com.mx";
        if (rol_usuario == "administrador" || rol_usuario == "usuario") {
            if (update.rfc && update.correo && update.registroPatronal && update.razonSocial && update.tipoProveedor && update.regimenFiscal && update.nombreContacto && update.telefono) {
                update.rfc = update.rfc.toLowerCase().trim();
                update.correo = update.correo.toLowerCase().trim();
                update.registroPatronal = update.registroPatronal.toLowerCase().trim();
                update.razonSocial = update.razonSocial.toLowerCase().trim();
                update.tipoProveedor = update.tipoProveedor.toLowerCase().trim();
                update.regimenFiscal = update.regimenFiscal.toLowerCase().trim();
                update.nombreContacto = update.nombreContacto.toLowerCase().trim();
                if (update.observaciones) {
                    update.observaciones = update.observaciones.toLowerCase().trim();
                }
                try {

                    const projectUpdated = await Vendors.findByIdAndUpdate(projectId, update, { new: true });
                    const userUpdated = await Users.updateOne({ rfc: update.rfc }, { $set: { razonSocial: update.razonSocial, correo: update.correo } });
                    if (Boolean(send) == true) {
                        var pass = "";
                        var characters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
                        for (var i = 0; i < 8; i++) {
                            pass += characters.charAt(Math.floor(Math.random() * characters.length));
                        }
                        const hashedPassword = await new Promise((resolve, reject) => {
                            bcrypt.hash(pass, null, null, function(err, hash) {
                                if (err) reject(err)
                                resolve(hash)
                            });
                        })
                        const UpdateUserVendor = await Users.updateOne({ rfc: update.rfc }, { $set: { password: hashedPassword } });
                        var contentHtml = `
                        <img src="cid:unique@kreata.ee">
                        <h1>Proveedores Sacmag De México, S.A. De C.V.</h1>
                        <h4>Datos del Usuario Para Entrar Al Sistema</h4>
                        <a href="https://proveedores-grupo-sacmag.com.mx/" target="_blank" >Click aquí para entrar al Sitio Web</a>
                
                        <ul>

                            <li><b>Usuario: ${update.rfc}</b></li>
                            <li><b>Contraseña ${pass}</b></li>
                        </ul>
                        <br>
                        <br>
                        <h4>Archivos a enviar</h4>
                        <ol>
                        <li>Formato requisitado para alta del proveedor</li>
                        <li>Constancia de situación fiscal SAT</li>
                        <li>Alta imss registro patronal</li>
                        <li>Ine representante legal</li>
                        <li>Acta constitutiva y modificaciones(sólo aplica para persona moral) y poder del representante legal</li>
                        <li>Comprobante de domicilio del domicilio fiscal vigente</li>
                        <li>Estado de cuenta con cuenta clabe, sólo caratula</li>
                        <li>Opinión de cumplimiento de 32D SAT</li>
                        <li>Opinión de cumplimiento de 32D IMSS</li>
                        <li>Opinión de cumplimiento de 32D INFONAVIT</li>
                        <li>Curriculum de la empresa o persona fisica y/o cédula de las personas que realizarán el proyecto</li>
                        <li>Registro de prestadoras de servicios especializados u obras especializadas (REPSE)</li>
                        <li>Especificaciones de calibración de equipos y certificaciones en caso de contar con equipo</li>
                        <li>Código de ética firmado por representante legal</li>
                        <li>Última declaración anual y estados financieros del año(cualquiera de los últimos 3 meses)</li>
                        </ol>
                    
                        <h4>Notas</h4>
                        <ol>
                        <li>Todos los campos son requeridos</li>
                        <li>Sólo puedes subir archivos pdf y con un peso máximo de 2 MB por archivo</li>
                        <li>En caso de que algún archivo no aplique, subir un archivo PDF con nombre "No aplica" vacío</li>
                        </ol>
                    
                        <br><br><br><br><br><br>
                        <p>Recuerda subir todos tus archivos al sistema para validarte como proveedor autorizado</p>
                        <p>Correo enviado automáticamente, no responder correo<p>
                            `;

                        let transporter = nodemailer.createTransport({
                            host: "smtp.gmail.com",
                            port: 465,
                            secure: true, // true for 465, false for other ports
                            auth: {
                                user: 'sacmag.proveedores@gmail.com', // generated ethereal user
                                pass: 'anadydjnomozipia', // generated ethereal password
                            },
                        });
                        // send mail with defined transport object
                        let info = await transporter.sendMail({
                            from: '"Proveedores Sacmag " <sacmag.proveedores@gmail.com>', // sender address
                            to: `${correoP} , ${update.correo} , ${emailUser}`, // list of receivers
                            subject: "Accesos para entrar a la plataforma de Proveedores", // Subject line
                            html: contentHtml, // html body
                            attachments: [{
                                filename: 'image.png',
                                path: __dirname + '/logo.png',
                                cid: 'unique@kreata.ee' //same cid value as in the html img src
                            }]
                        });
                        console.log("Mensaje enviado", info.envelope);

                    }


                    return res.status(200).send({ project: projectUpdated });



                } catch (error) {
                    res.status(500).send({ message: 'Ocurrió un error: ' + error });
                }

            } else {
                res.status(500).send({ message: 'Llena los campos requeridos' });
            }
        } else {
            res.status(500).send({ message: 'No tienes permisos suficientes' });
        }



    },

    validateVendor: async function(req, res) {
        var projectRfc = req.params.rfc;
        var supter = req.params.supter;
        /* var rol_usuario = req.user.rol;
        if (rol_usuario == "administrador" || rol_usuario == "usuario") { */
        try {
            const updateArchives = await Archives.updateOne({ rfc: projectRfc.toLowerCase().trim(), supter: supter }, { validar: true });
            const updateVendor = await Vendors.updateOne({ rfc: projectRfc.toLowerCase().trim(), supter: supter }, { verificado: true });
            return res.status(200).send({ archives: updateArchives });
        } catch (err) {
            return res.status(500).send({ message: 'Ocurrió un error: ' + err });
        }




        /* Archives.updateOne({ rfc: projectRfc.toLowerCase().trim() }, { validar: true }, (err, archivesUpdate) => {
                if (err) return res.status(500).send({ message: 'No se han podido borrar los archivos' });
                if (!archivesUpdate) return res.status(404).send({ message: 'Error al borrar los archivos' });
                if (archivesUpdate) {
                    Vendors.updateOne({ rfc: projectRfc.toLowerCase() }, { verificado: true }, (err, vendorUpdate) => {
                        if (err) return res.status(500).send({ message: 'Error al actualizar el proveedor' });
                        if (!vendorUpdate) return res.status(404).send({ message: 'Error al actualizar el proveedor' });

                        return res.status(200).send({

                            archives: archivesUpdate


                        })
                    })

                }
            })
            /* } else {
                res.status(500).send({ message: 'No tienes permisos suficientes' });
            } */



    },
    changePassword: async function(req, res) {
        var newPass = req.params.newPass;
        var params = req.body;

        if (params.rfc && params.correo && newPass) {
            try {
                params.rfc = params.rfc.trim().toLowerCase();
                params.correo = params.correo.trim().toLowerCase();
                if (params.password) params.password = params.password.trim();
                newPass = newPass.trim();
                const userFound = await Users.findOne({ rfc: params.rfc, correo: params.correo });

                if (userFound == null) {
                    return res.status(500).send({ message: 'Ocurrió un error: La información proporcionada es incorrecta' });
                }
                if (params.password) {
                    const passwordCompare = await new Promise((resolve, reject) => {
                        bcrypt.compare(params.password, userFound.password, function(err, check) {
                            if (err) reject(err)
                            resolve(check)
                        });
                    })
                    if (passwordCompare) {
                        const hashedPassword = await new Promise((resolve, reject) => {
                            bcrypt.hash(newPass, null, null, function(err, hash) {
                                if (err) reject(err)
                                resolve(hash)
                            });
                        })
                        const userUpdated = await Users.updateOne({ rfc: params.rfc }, { $set: { password: hashedPassword } });
                        return res.status(200).send({ userUpdated });
                    } else {
                        return res.status(500).send({ message: 'Ocurrió un error: La información no coincide' });
                    }
                } else {
                    const hashedPassword = await new Promise((resolve, reject) => {
                        bcrypt.hash(newPass, null, null, function(err, hash) {
                            if (err) reject(err)
                            resolve(hash)
                        });
                    })
                    const userUpdated = await Users.updateOne({ rfc: params.rfc }, { $set: { password: hashedPassword } });
                    return res.status(200).send({ userUpdated });
                }

            } catch (error) {
                return res.status(500).send({ message: 'Ocurrió un error: ' + error });
            }
        } else {
            return res.status(500).send({ message: 'Llena los campos requeridos' });
        }




    },
    forgotPass: async function(req, res) {
        var usuario = req.params.usuario;
        try {
            const userFound = await Users.findOne({ usuario: usuario.trim().toLowerCase() });
            if (userFound == null) return res.status(500).send({ message: 'Ocurrió un error: La información proporcionada es incorrecta' });
            userFound.password = undefined;
            var correo = userFound.correo;
            //<a href="https://proveedores-grupo-sacmag.com.mx/api/" target="_blank" >Click aquí para recuperar contraseña</a>
            var contentHtml = `
                <img src="cid:unique@kreata.ee">
                <h1>Proveedores Sacmag De México, S.A. De C.V.</h1>
                <a href="https://proveedores-grupo-sacmag.com.mx/recuperar-info/${userFound.rfc.toUpperCase()}/${userFound.correo.toUpperCase()}" target="_blank" >Click aquí para recuperar contraseña</a>
                <br>
                <br>
                <p>Correo enviado automáticamente, no responder correo<p>
                `;

            let transporter = nodemailer.createTransport({
                host: "smtp.gmail.com",
                port: 465,
                secure: true, // true for 465, false for other ports
                auth: {
                    user: 'sacmag.proveedores@gmail.com', // generated ethereal user
                    pass: 'anadydjnomozipia', // generated ethereal password
                },
            });
            // send mail with defined transport object
            let info = await transporter.sendMail({
                from: '"Proveedores Sacmag " <sacmag.proveedores@gmail.com>', // sender address
                to: `${userFound.correo}`, // list of receivers
                subject: "Cambio de contraseña", // Subject line
                html: contentHtml, // html body
                attachments: [{
                    filename: 'image.png',
                    path: __dirname + '/logo.png',
                    cid: 'unique@kreata.ee' //same cid value as in the html img src
                }]
            });
            console.log("Mensaje enviado", info.envelope);


            return res.status(200).send({ correo });
        } catch (error) {
            return res.status(500).send({ message: 'Ocurrió un error: ' + error });
        }
    },
    validateVendorInfo: async function(req, res) {

        const UserLogin = new Users();
        var params = req.body;
        var correoP = 'irving.davila@grupo-sacmag.com.mx';
        var emailUser = req.user.correo;
        var pass = "";
        try {
            var Validate;
            if (params.supter) Validate = await Vendors.updateOne({ rfc: params.rfc.toLowerCase().trim(), supter: true }, { valido: 'valido' }, { new: true }).exec();
            else Validate = await Vendors.updateOne({ rfc: params.rfc.toLowerCase().trim(), supter: false }, { valido: 'valido' }, { new: true }).exec();
            if (Validate) {
                var characters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
                for (var i = 0; i < 8; i++) {
                    pass += characters.charAt(Math.floor(Math.random() * characters.length));
                }
                const hashedPassword = await new Promise((resolve, reject) => {
                    bcrypt.hash(pass, null, null, function(err, hash) {
                        if (err) reject(err)
                        resolve(hash)
                    });
                })

                UserLogin.usuario = params.rfc.toLowerCase().trim();
                UserLogin.password = hashedPassword;
                UserLogin.correo = params.correo.toLowerCase().trim();
                UserLogin.rol = 'proveedor';
                UserLogin.nombre = params.razonSocial.toLowerCase().trim();
                UserLogin.apellidoP = '';
                UserLogin.apellidoM = '';
                UserLogin.rfc = params.rfc.toLowerCase().trim();
                UserLogin.validaAlta = req.user.usuario.trim().toLowerCase();
                UserLogin.supter = params.supter;
                UserLogin.borrado = false;
                const SaveInformation = await UserLogin.save();
                SaveInformation.password = undefined;
                var contentHtml = `
                    <img src="cid:unique@kreata.ee">
                    <h1>Proveedores Sacmag De México, S.A. De C.V.</h1>
                    <h4>Datos del Usuario Para Entrar Al Sistema</h4>
                    <a href="https://proveedores-grupo-sacmag.com.mx/" target="_blank" >Click aquí para entrar al Sitio Web</a>
                    <ul>
                        <li><b>Usuario: ${params.rfc.toLowerCase().trim()}</b></li>
                        <li><b>Contraseña ${pass}</b></li>
                    </ul>
                    <br>
                    <br>
                    <h4>Archivos a enviar</h4>
                    <ol>
                        <li>Formato requisitado para alta del proveedor</li>
                        <li>Constancia de situación fiscal SAT</li>
                        <li>Alta imss registro patronal</li>
                        <li>Ine representante legal</li>
                        <li>Acta constitutiva y modificaciones(sólo aplica para persona moral) y poder del representante legal</li>
                        <li>Comprobante de domicilio del domicilio fiscal vigente</li>
                        <li>Estado de cuenta con cuenta clabe, sólo caratula</li>
                        <li>Opinión de cumplimiento de 32D SAT</li>
                        <li>Opinión de cumplimiento de 32D IMSS</li>
                        <li>Opinión de cumplimiento de 32D INFONAVIT</li>
                        <li>Curriculum de la empresa o persona fisica y/o cédula de las personas que realizarán el proyecto</li>
                        <li>Registro de prestadoras de servicios especializados u obras especializadas (REPSE)</li>
                        <li>Especificaciones de calibración de equipos y certificaciones en caso de contar con equipo</li>
                        <li>Código de ética firmado por representante legal</li>
                        <li>Última declaración anual y estados financieros del año(cualquiera de los últimos 3 meses)</li>
                    </ol>
                    <h4>Notas</h4>
                    <ol>
                        <li>Todos los campos son requeridos</li>
                        <li>Sólo puedes subir archivos pdf y con un peso máximo de 2 MB por archivo</li>
                        <li>En caso de que algún archivo no aplique, subir un archivo PDF con nombre "No aplica" vacío</li>
                    </ol>
                    <br><br><br><br><br><br>
                    <p>Recuerda subir todos tus archivos al sistema para validarte como proveedor autorizado</p>
                    <p>Correo enviado automáticamente, no responder correo</p>
                    `;
                let transporter = await nodemailer.createTransport({
                    host: "smtp.gmail.com",
                    port: 465,
                    secure: true, // true for 465, false for other ports
                    auth: {
                        user: 'sacmag.proveedores@gmail.com', // generated ethereal user
                        pass: 'anadydjnomozipia', // generated ethereal password
                    },
                });
                let info = await transporter.sendMail({
                    from: '"Proveedores Sacmag " <sacmag.proveedores@gmail.com>', // sender address
                    to: `${correoP} , ${params.correo.toLowerCase().trim()} , ${emailUser}`, // list of receivers
                    subject: "Accesos para entrar a la plataforma de Proveedores", // Subject line
                    html: contentHtml, // html body
                    attachments: [{
                        filename: 'image.png',
                        path: __dirname + '/logo.png',
                        cid: 'unique@kreata.ee' //same cid value as in the html img src
                    }]
                });
                console.log("Mensaje enviado", info.envelope);



                return res.status(200).send({
                    Validate,
                    message: `Proveedor  ${params.razonSocial.toUpperCase().trim()} validado correctamente. Correo enviado a ${params.correo.trim().toLowerCase()}`,
                    SaveInformation
                });
            }


        } catch (err) {
            return res.status(500).send({ message: 'Ocurrió un error al actualizar el proveedor' + err });
        }

    },
    deleteVendorinfo: async function(req, res) {
        var projectRfc = req.params.rfc.toLowerCase().trim();

    },
    uploadArchive: async function(req, res) {
        let archivesId = req.params.id;
        let nameArchive = req.params.nameArchive;
        let filePath = req.files.archive.path;
        let rfc = req.params.rfc;
        let rol_usuario = req.user.rol;
        try {
            /*Cambiar para linux */
            let fileSplit = filePath.split('\\');
            let fileName = fileSplit[1];
            let extSplit = fileName.split('\.');
            let fileExt = extSplit[1];

            if (fileExt.toLowerCase() == 'pdf') {
                let updateArchive;
                let validate;
                let validateVendor;
                switch (nameArchive) {
                    case 'archivo1':
                        fsa.renameSync("./uploads/" + fileSplit[1], `./uploads/1-FormatoRequisitado-${rfc.toUpperCase()  + moment().format('LL')}.pdf`);
                        updateArchive = await Archives.findByIdAndUpdate(archivesId, { archivo1: `1-FormatoRequisitado-${rfc.toUpperCase()  + moment().format('LL')}.pdf` }, { new: true });

                        break;
                    case 'archivo2':
                        fsa.renameSync("./uploads/" + fileSplit[1], `./uploads/2-ConstanciaSitFiscal-${rfc.toUpperCase()  + moment().format('LL')}.pdf`);
                        updateArchive = await Archives.findByIdAndUpdate(archivesId, { archivo2: `2-ConstanciaSitFiscal-${rfc.toUpperCase()  + moment().format('LL')}.pdf` }, { new: true });
                        break;
                    case 'archivo3':
                        fsa.renameSync("./uploads/" + fileSplit[1], `./uploads/3-AltaIMSSPatronal-${rfc.toUpperCase()  + moment().format('LL')}.pdf`);
                        updateArchive = await Archives.findByIdAndUpdate(archivesId, { archivo3: `3-AltaIMSSPatronal-${rfc.toUpperCase()  + moment().format('LL')}.pdf` }, { new: true });
                        break;
                    case 'archivo4':
                        fsa.renameSync("./uploads/" + fileSplit[1], `./uploads/4-IneRepresentante-${rfc.toUpperCase()  + moment().format('LL')}.pdf`);
                        updateArchive = await Archives.findByIdAndUpdate(archivesId, { archivo4: `4-IneRepresentante-${rfc.toUpperCase()  + moment().format('LL')}.pdf` }, { new: true });
                        break;
                    case 'archivo5':
                        fsa.renameSync("./uploads/" + fileSplit[1], `./uploads/5-ActaConstitutiva-${rfc.toUpperCase()  + moment().format('LL')}.pdf`);
                        updateArchive = await Archives.findByIdAndUpdate(archivesId, { archivo5: `5-ActaConstitutiva-${rfc.toUpperCase()  + moment().format('LL')}.pdf` }, { new: true });
                        break;
                    case 'archivo6':
                        fsa.renameSync("./uploads/" + fileSplit[1], `./uploads/6-ComprobanteDomicilio-${rfc.toUpperCase()  + moment().format('LL')}.pdf`);
                        updateArchive = await Archives.findByIdAndUpdate(archivesId, { archivo6: `6-ComprobanteDomicilio-${rfc.toUpperCase()  + moment().format('LL')}.pdf` }, { new: true });
                        break;
                    case 'archivo7':
                        fsa.renameSync("./uploads/" + fileSplit[1], `./uploads/7-EstadodeCuentaClabe-${rfc.toUpperCase()  + moment().format('LL')}.pdf`);
                        updateArchive = await Archives.findByIdAndUpdate(archivesId, { archivo7: `7-EstadodeCuentaClabe-${rfc.toUpperCase()  + moment().format('LL')}.pdf` }, { new: true });
                        break;
                    case 'archivo8':
                        fsa.renameSync("./uploads/" + fileSplit[1], `./uploads/8-OpiniondeCumpSat-${rfc.toUpperCase()  + moment().format('LL')}.pdf`);
                        updateArchive = await Archives.findByIdAndUpdate(archivesId, { archivo8: `8-OpiniondeCumpSat-${rfc.toUpperCase()  + moment().format('LL')}.pdf` }, { new: true });
                        break;
                    case 'archivo9':
                        fsa.renameSync("./uploads/" + fileSplit[1], `./uploads/9-OpiniondeCumpIMSS-${rfc.toUpperCase()  + moment().format('LL')}.pdf`);
                        updateArchive = await Archives.findByIdAndUpdate(archivesId, { archivo9: `9-OpiniondeCumpIMSS-${rfc.toUpperCase()  + moment().format('LL')}.pdf` }, { new: true });
                        break;
                    case 'archivo10':
                        fsa.renameSync("./uploads/" + fileSplit[1], `./uploads/10-OpiniondeCumpINFONAVIT-${rfc.toUpperCase()  + moment().format('LL')}.pdf`);
                        updateArchive = await Archives.findByIdAndUpdate(archivesId, { archivo10: `10-OpiniondeCumpINFONAVIT-${rfc.toUpperCase()  + moment().format('LL')}.pdf` }, { new: true });
                        break;
                    case 'archivo11':
                        fsa.renameSync("./uploads/" + fileSplit[1], `./uploads/11-CurriculumEmpresa-${rfc.toUpperCase()  + moment().format('LL')}.pdf`);
                        updateArchive = await Archives.findByIdAndUpdate(archivesId, { archivo11: `11-CurriculumEmpresa-${rfc.toUpperCase()  + moment().format('LL')}.pdf` }, { new: true });
                        break;
                    case 'archivo12':
                        fsa.renameSync("./uploads/" + fileSplit[1], `./uploads/12-RegistroPresServicio-${rfc.toUpperCase()  + moment().format('LL')}.pdf`);
                        updateArchive = await Archives.findByIdAndUpdate(archivesId, { archivo12: `12-RegistroPresServicio-${rfc.toUpperCase()  + moment().format('LL')}.pdf` }, { new: true });
                        break;
                    case 'archivo13':
                        fsa.renameSync("./uploads/" + fileSplit[1], `./uploads/13-CalibracionEquipos-${rfc.toUpperCase()  + moment().format('LL')}.pdf`);
                        updateArchive = await Archives.findByIdAndUpdate(archivesId, { archivo13: `13-CalibracionEquipos-${rfc.toUpperCase()  + moment().format('LL')}.pdf` }, { new: true });
                        break;
                    case 'archivo14':
                        fsa.renameSync("./uploads/" + fileSplit[1], `./uploads/14-CodigoEtica-${rfc.toUpperCase()  + moment().format('LL')}.pdf`);
                        updateArchive = await Archives.findByIdAndUpdate(archivesId, { archivo14: `14-CodigoEtica-${rfc.toUpperCase()  + moment().format('LL')}.pdf` }, { new: true });
                        break;
                    case 'archivo15':
                        fsa.renameSync("./uploads/" + fileSplit[1], `./uploads/15-UltimaDecAnual-${rfc.toUpperCase()  + moment().format('LL')}.pdf`);
                        updateArchive = await Archives.findByIdAndUpdate(archivesId, { archivo15: `15-UltimaDecAnual-${rfc.toUpperCase()  + moment().format('LL')}.pdf` }, { new: true });
                        break;
                }
                if (rol_usuario == 'proveedor') {
                    validate = await Archives.findByIdAndUpdate(archivesId, { validar: false }, { new: true });

                }

                return res.status(200).send({ updateArchive });
            }
        } catch (err) {
            return res.status(500).send({ message: 'Ocurrió un error: ' + err });
        }

    }


}

module.exports = controller;