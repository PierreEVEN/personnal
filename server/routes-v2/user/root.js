/***********************************************************************************************/
/*                                          USER                                               */
/***********************************************************************************************/

const {error_404, get_common_data} = require("../../session_utils");
const {User} = require("../../database/user");
const {Repos} = require("../../database/repos");
const router = require("express").Router();

/********************** [GLOBAL] **********************/
router.use('/', (req, res, next) => {
    if (!req.display_user)
        return error_404(req, res);

    next();
});
/********************** [GLOBAL] **********************/

router.get("/", async (req, res) => {
    res.render('fileshare', {
        title: 'FileShare',
        common: await get_common_data(req)
    });
})

const repos_router = require("express").Router();
repos_router.use('/:repos/', async (req, res, next) => {
    if (!req.display_user)
        return error_404(req, res);
    req.display_repos = await Repos.from_name(req.params['repos'], req.display_user);
    if (!req.display_repos)
        return error_404(req, res);

    next();
});
repos_router.use('/:repos/', require('./repos/root'))

router.use('/', repos_router);

module.exports = router;