const express = require('express');
const router = express.Router();
const moment = require("moment");
const path = require("path");
const fs = require("fs");

const authMiddleware = require('./../auth/auth_middleware.js');
const getPointsMiddleware = require('./points_middleware.js');

const multiParser = require("../common/multiParser").middlewareMulter;
const viewPath = path.join(__dirname,"/view");
const dbPool = require("./../common/db.js").pool;
const DAOUsers = require("./dao.js");
let daoU = new DAOUsers.ProfileDAO(dbPool);

const validation = require("./validation.js");
const validateModify = validation.validateProfile;
const validateGallery = validation.validateGallery;


router.get("/modify",authMiddleware, getPointsMiddleware , (request, response, next) => {

    daoU.getUserDetails(request.session.currentUser, (err, result) => {

        if(err) {
            next(err);
        }
        else
        {
            let user = {
                email: result[0].email,
                pass: result[0].pass,
                name: result[0].name,
                gender: result[0].gender,
                dob: moment(result[0].dob).format('YYYY-MM-DD'),
                image: result[0].image
            };

            response.render(path.join(viewPath,"modify_profile"), user);

        }
    });
});


router.post("/modify",authMiddleware, getPointsMiddleware, multiParser.single("image"), validateModify,(request, response, next) => {


    daoU.checkEmail(request.body.email, (err, exists) => {

        if(err)
            next(err);
        else if(exists && exists !== request.session.currentUser)
        {
            response.setAlert({type: "error", alertList: [{msg:"Email ya existe"}]});
            response.redirect("modify");
        }
        else
        {
            let user = {
                email: request.body.email,
                pass: request.body.password,
                name: request.body.name,
                gender: request.body.gender,
                dob: request.body.dob ? request.body.dob : null,
                image: request.file ? request.file.filename : request.body.currentImage
            };


            if(request.file && request.body.currentImage !== "")
            {
                fs.unlink(path.join(__dirname, "../uploads", request.body.currentImage),err => {

                    if(err)
                        next(err);

                });
            }

            daoU.updateUserDetails(request.session.currentUser, user, err => {

                if (err) {
                    next(err);
                }
                else {
                    response.setAlert({type:"success",alertList:[{msg:"Perfil actualizado"}]});
                    response.redirect("/profile");
                }

            });
        }

    });

});


router.get("/:userId/image", authMiddleware,getPointsMiddleware,(request, response, next) => {

    daoU.getProfileImage(request.params.userId, (err, userImage) => {

        if(err) {
            next(err);
        }
        else if(userImage)
        {
            response.sendFile(path.join(__dirname, "../uploads", userImage));
        }
        else
            response.sendFile(path.join(__dirname, "../public", "img", "NoProfile.png"));

    });


});

router.get("/", authMiddleware, getPointsMiddleware ,(request, response, next) => {
    daoU.getUserProfile(request.session.currentUser, (err, result) => {

        if(err) {
            next(err);
        }
        else {

            let gender;

            switch(result.gender){

                case 'male':
                    gender = "Hombre";
                    break;
                case 'female':
                    gender = "Mujer";
                    break;
                default:
                    gender = "Otro";

            }


            let userDetails = {
                id: result.id,
                name: result.name,
                age: result.dob ? moment().diff(result.dob, 'years') + " años" : "Edad desconocida",
                gender: gender,
                gallery: result.gallery
            };


            response.status(200);
            response.render(path.join(viewPath,"profile"), userDetails);

        }

    });


});


router.get("/:userId", authMiddleware, getPointsMiddleware ,(request, response, next) => {
    daoU.getUserProfile(request.params.userId, (err, result) => {

        if(err) {
            next(err);
        }
        else if(!result)
        {
            next();
        }
        else {

            let gender;

            switch(result.gender){

                case 'male':
                    gender = "Hombre";
                    break;
                case 'female':
                    gender = "Mujer";
                    break;
                default:
                    gender = "Otro";

            }


            let userDetails = {
                id: result.id,
                name: result.name,
                age: result.dob ? moment().diff(result.dob, 'years') + " años": "Edad desconocida",
                gender: gender,
                gallery: result.gallery
            };


            response.status(200);
            response.render(path.join(viewPath,"profile"), userDetails);

        }
    });
});



router.get("/:imageName/gallery", authMiddleware, (request, response, next) => {

    let imageName = request.params.imageName;

    response.sendFile(path.join(__dirname, "../uploads", imageName));

});


router.post("/gallery", authMiddleware, getPointsMiddleware, multiParser.single("image"), validateGallery,
                                                                                        (request, response, next) => {

    userId = request.session.currentUser;

    daoU.saveGalleryImage(userId, request.file.filename, request.body.description, 100, err => {

        if(err)
            next(err);
        else{
            response.setAlert({type:"success",alertList:[{msg:"La imagen añadida con éxito"}]});
            response.redirect("/profile/");
        }

    });

});



module.exports = {
    router: router,
    viewPath: __dirname + viewPath
};
