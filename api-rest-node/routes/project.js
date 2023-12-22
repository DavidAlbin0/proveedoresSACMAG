'use strict'
var express = require('express');
var ProjectController = require('../controllers/project');
var router = express.Router();
var md_auth = require('../middleware/authenticated');


//middleware
var multipart = require('connect-multiparty');
var multipartMiddleware = multipart({ uploadDir: './uploads' });

router.post('/login/:supter', ProjectController.login);
router.post('/subir-archivos/:rfc/:supter', multipartMiddleware, md_auth.ensureAuth, ProjectController.saveArchives);
/* router.put('/archivos/:id', multipartMiddleware, ProjectController.updateArchives); */
router.get('/archivos/:file', ProjectController.getArchive);
router.get('/obtener-archivos/:rfc/:supter', md_auth.ensureAuth, ProjectController.getArchivesRfc);
router.post('/subir-proveedor', ProjectController.saveVendor);
router.put('/proveedor/:id/:send', md_auth.ensureAuth, ProjectController.updateVendors);
router.post('/registro', md_auth.ensureAuth, ProjectController.saveUsersLogin);
router.get('/usuario/:id', md_auth.ensureAuth, ProjectController.getUSer);
router.put('/archivos/:rfc/:supter', ProjectController.validateVendor); //validar
router.get('/proveedor/:id', md_auth.ensureAuth, ProjectController.getVendor);
router.get('/proveedores/:empresa', md_auth.ensureAuth, ProjectController.getVendors);
router.get('/proveedorauth/:rfc', md_auth.ensureAuth, ProjectController.getVendorRfc);
router.get('/proveedor-archives/:rfc/:supter', md_auth.ensureAuth, ProjectController.getAllArchives);
router.post('/cambiar-info/:newPass', ProjectController.changePassword);
router.post('/forgot-pass/:usuario', ProjectController.forgotPass);
router.delete('/archivos/:rfc/:mensaje', md_auth.ensureAuth, ProjectController.refuseArchives); //validar
router.put('/validar-Proveedor/', md_auth.ensureAuth, ProjectController.validateVendorInfo);
router.post('/upload-archive/:id/:nameArchive/:rfc', multipartMiddleware, md_auth.ensureAuth, ProjectController.uploadArchive);




module.exports = router;